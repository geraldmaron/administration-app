#!/usr/bin/env node
// Measures the map spike's frame times on the /dev/map harness: flights
// between camera targets and idle pans, on a desktop profile and on a phone
// profile with Chrome's CPU throttled 4× through the DevTools protocol.
//
// It reads the renderer's own frame log (rAF-to-rAF interval and main-thread
// work inside the map's frame callback), tagged by phase, so the numbers are
// the map's and not the harness's React readout.
//
// Run against a production build:
//   VITE_MAP_HARNESS=1 pnpm --filter @admin/web run build   (the harness is dropped from a plain production build)
//   pnpm --filter @admin/web exec vite preview --host 127.0.0.1 --port 4791 --strictPort
//   MAP_URL=http://127.0.0.1:4791 node scripts/measure-map-spike.mjs [--json out.json]
//
// --first-paint measures the shipped title screen instead, so it needs no
// harness: cold loads of `/` on both profiles, reading the browser's first
// contentful paint and the renderer's `map:first-paint` mark (MAP_SAMPLES
// loads per profile, 5 by default).

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.MAP_URL ?? "http://127.0.0.1:4791";
const ROUNDS = Number(process.env.MAP_ROUNDS ?? 2);

// MAP_PHONE_THROTTLE runs the phone profile harder than the 4× budget profile, as a sensitivity check.
const PHONE_THROTTLE = Number(process.env.MAP_PHONE_THROTTLE ?? 4);

const PROFILES = [
  { name: "desktop 1440×900 @2x", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, hasTouch: false, throttle: 1 },
  { name: `phone 390×844 @3x, CPU ${PHONE_THROTTLE}×`, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, throttle: PHONE_THROTTLE },
];

const FLIGHTS = [
  ["us"],
  ["state", "PA"],
  ["district", "NY-12"],
  ["world"],
  ["state", "CA"],
  ["us"],
  ["district", "TX-07"],
  ["world"],
];

function percentile(values, p) {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

function summarize(frames) {
  const interval = frames.map((f) => f.interval);
  const work = frames.map((f) => f.work);
  return {
    frames: frames.length,
    intervalP50: percentile(interval, 50),
    intervalP95: percentile(interval, 95),
    intervalMax: interval.length ? Math.max(...interval) : NaN,
    workP50: percentile(work, 50),
    workP95: percentile(work, 95),
    workMax: work.length ? Math.max(...work) : NaN,
    over22: interval.filter((v) => v > 22.2).length,
  };
}

async function framesSince(page, mark) {
  return page.evaluate((from) => window.__mapHarness.renderer.log.all().slice(from), mark);
}

async function logLength(page) {
  return page.evaluate(() => window.__mapHarness.renderer.log.all().length);
}

async function fly(page, kind, id) {
  await page.evaluate(([k, i]) => window.__mapHarness.fly(k, i), [kind, id]);
  await page.waitForTimeout(2600);
}

async function pan(page, viewport, dx, dy, steps) {
  const x = viewport.width * 0.5;
  const y = viewport.height * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(x + dx * Math.sin(t * Math.PI * 2), y + dy * Math.sin(t * Math.PI));
    await page.waitForTimeout(8);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function measureProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, hasTouch: profile.hasTouch });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__longTasks.push(Math.round(entry.duration));
    }).observe({ type: "longtask", buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.throttle });
  const navigationStart = Date.now();
  await page.goto(`${BASE}/dev/map`);
  await page.waitForFunction(() => window.__mapHarness?.renderer.firstPaintMs != null, null, { timeout: 60000 });
  const firstPaint = await page.evaluate(() => window.__mapHarness.renderer.firstPaintMs);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => (window.__longTasks = []));
  const all = { flight: [], settle: [], pan: [] };
  for (let round = 0; round < ROUNDS; round++) {
    for (const [kind, id] of FLIGHTS) {
      const mark = await logLength(page);
      await fly(page, kind, id);
      const frames = await framesSince(page, mark);
      all.flight.push(...frames.filter((f) => f.phase === "flight"));
      all.settle.push(...frames.filter((f) => f.phase === "settle"));
      if (kind === "us" || kind === "world" || kind === "state") {
        const panMark = await logLength(page);
        await pan(page, profile.viewport, profile.viewport.width * 0.3, profile.viewport.height * 0.15, 60);
        all.pan.push(...(await framesSince(page, panMark)).filter((f) => f.phase === "pan"));
      }
    }
  }
  const longTasks = await page.evaluate(() => window.__longTasks);
  await context.close();
  return { profile: profile.name, longTasks, firstPaint, wallLoad: Date.now() - navigationStart, gpu, flight: summarize(all.flight), settle: summarize(all.settle), pan: summarize(all.pan) };
}

function median(values) {
  return percentile(values, 50);
}

async function firstPaintOnce(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, hasTouch: profile.hasTouch });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.throttle });
  await page.goto(`${BASE}/`);
  await page.waitForFunction(() => performance.getEntriesByName("map:first-paint").length > 0, null, { timeout: 60000 });
  const sample = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? NaN;
    const map = performance.getEntriesByName("map:first-paint")[0].startTime;
    const scripts = performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"));
    const scriptBytes = scripts.filter((r) => r.startTime <= map).reduce((sum, r) => sum + (r.encodedBodySize || 0), 0);
    return { fcp, map, scriptBytes };
  });
  await context.close();
  return sample;
}

async function measureFirstPaint(browser, profile) {
  const samples = [];
  for (let i = 0; i < Number(process.env.MAP_SAMPLES ?? 5); i++) samples.push(await firstPaintOnce(browser, profile));
  return { profile: profile.name, fcp: median(samples.map((s) => s.fcp)), map: median(samples.map((s) => s.map)), mapMax: Math.max(...samples.map((s) => s.map)), scriptBytes: median(samples.map((s) => s.scriptBytes)), samples };
}

const browser = await chromium.launch({ channel: "chromium" });

if (process.argv.includes("--first-paint")) {
  const runs = [];
  for (const profile of PROFILES) runs.push(await measureFirstPaint(browser, profile));
  await browser.close();
  const fmt = (v) => (Number.isFinite(v) ? v.toFixed(0) : "–");
  console.log("| Profile | First contentful paint p50 | Map first paint p50 | Map first paint max | Script bytes before the map paints (encoded) |");
  console.log("|---|---|---|---|---|");
  for (const r of runs) console.log(`| ${r.profile} | ${fmt(r.fcp)} | ${fmt(r.map)} | ${fmt(r.mapMax)} | ${(r.scriptBytes / 1024).toFixed(0)}KB |`);
  const at = process.argv.indexOf("--json");
  if (at > 0 && process.argv[at + 1]) writeFileSync(process.argv[at + 1], JSON.stringify(runs, null, 2));
  process.exit(0);
}

const results = [];
for (const profile of PROFILES) results.push(await measureProfile(browser, profile));
await browser.close();

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(1) : "–");
console.log("| Profile | Phase | Frames | Interval p50 | Interval p95 | Interval max | Work p50 | Work p95 | Work max | Frames > 22.2ms |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const r of results) {
  for (const phase of ["flight", "pan", "settle"]) {
    const s = r[phase];
    console.log(`| ${r.profile} | ${phase} | ${s.frames} | ${fmt(s.intervalP50)} | ${fmt(s.intervalP95)} | ${fmt(s.intervalMax)} | ${fmt(s.workP50)} | ${fmt(s.workP95)} | ${fmt(s.workMax)} | ${s.over22} |`);
  }
}
for (const r of results) {
  console.log(`${r.profile}: first paint ${fmt(r.firstPaint)}ms after navigation start; long tasks after load ${JSON.stringify(r.longTasks)}; GPU ${r.gpu}`);
}
const jsonAt = process.argv.indexOf("--json");
if (jsonAt > 0 && process.argv[jsonAt + 1]) writeFileSync(process.argv[jsonAt + 1], JSON.stringify(results, null, 2));
