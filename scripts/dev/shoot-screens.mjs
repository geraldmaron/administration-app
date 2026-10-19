#!/usr/bin/env node
// Screenshots player routes from a running dev server with a fixture save
// imported, for visual review during design work. Each run uses a fresh
// browser profile, so it never touches anyone's saves.
//
//   node scripts/dev/shoot-screens.mjs --out <dir> [--app web|player] [--port 5173] [--fixture week-30]
//     [--sizes 1440x900,390x844] [--themes light,dark] <route> [<route> ...]
//
// --app player drives the universal player's web dev server (port 8081 unless
// --port says otherwise). It has no .ui-surface__body, so the work surface is
// the tallest scrolling element on the page.
//
// Each theme is the device's color scheme, so the game's default System theme
// resolves to it. For every route, size and theme it writes
// <dir>/<slug>-<w>x<h>[-<theme>].png (no suffix when only light is shot) (the inner work
// surface scrolled through and captured in parts when it is taller than the
// viewport) and prints a line per page: horizontal overflow of the document and
// of the work surface, elements wider than the surface, and console errors.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

function args(argv) {
  const out = { app: "web", port: "", fixture: "week-30", sizes: "1440x900,390x844", themes: "light", dir: "", routes: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.dir = argv[++i];
    else if (a === "--app") out.app = argv[++i];
    else if (a === "--port") out.port = argv[++i];
    else if (a === "--fixture") out.fixture = argv[++i];
    else if (a === "--sizes") out.sizes = argv[++i];
    else if (a === "--themes") out.themes = argv[++i];
    else out.routes.push(a);
  }
  if (!out.dir || out.routes.length === 0) throw new Error("Usage: shoot-screens.mjs --out <dir> [--port] [--fixture] [--sizes] [--themes] <route>...");
  if (out.app !== "web" && out.app !== "player") throw new Error(`--app takes web or player, not "${out.app}".`);
  out.port ||= out.app === "player" ? "8081" : "5173";
  if (out.themes.split(",").some((theme) => theme !== "light" && theme !== "dark")) throw new Error(`--themes takes light and dark, not "${out.themes}".`);
  return out;
}

const slug = (route) => route.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "") || "title";

async function importFixture(page, base, name, app) {
  const file = fileURLToPath(new URL(`../../apps/web/tests/.fixtures/${name}.json`, import.meta.url));
  await page.goto(`${base}/administrations`, { waitUntil: "domcontentloaded" });
  if (app === "player") {
    // The player opens a transient file input on press rather than keeping one in the page.
    const button = page.getByRole("button", { name: "Import a save file" });
    await button.waitFor({ timeout: 60_000 });
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), button.click()]);
    await chooser.setFiles(file);
  } else {
    await page.getByLabel("Import a save exported from this game").setInputFiles(file);
  }
  await page.waitForURL("**/brief", { timeout: 60_000 });
}

// Marks the player's work surface so report() and shoot() can find it by the legacy selector.
async function markSurface(page) {
  await page.evaluate(() => {
    document.querySelectorAll(".ui-surface__body").forEach((e) => e.classList.remove("ui-surface__body"));
    const scrollers = [...document.querySelectorAll("div")].filter((e) => {
      const style = getComputedStyle(e);
      return /(auto|scroll)/.test(style.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientWidth > window.innerWidth / 2;
    });
    scrollers.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
    scrollers[0]?.classList.add("ui-surface__body");
  });
}

async function report(page) {
  return page.evaluate(() => {
    const body = document.querySelector(".ui-surface__body");
    const limit = body ? body.getBoundingClientRect().right + 1 : window.innerWidth + 1;
    const wide = body
      ? [...body.querySelectorAll("*")]
          .filter((e) => e.getBoundingClientRect().right > limit && e.getBoundingClientRect().width > 0)
          .slice(0, 5)
          .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`)
      : [];
    // A row wider than the section that holds it reads as broken even when the page itself fits.
    const spills = [...document.querySelectorAll(".ui-surface__body section")]
      .flatMap((section) => {
        const edge = section.getBoundingClientRect().right + 1;
        return [...section.children].filter((child) => getComputedStyle(child).position !== "absolute" && child.getBoundingClientRect().right > edge);
      })
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`);
    return {
      spills,
      document: document.documentElement.scrollWidth - window.innerWidth,
      surface: body ? body.scrollWidth - body.clientWidth : 0,
      wide,
      height: body ? body.scrollHeight : document.documentElement.scrollHeight,
      view: body ? body.clientHeight : window.innerHeight,
    };
  });
}

async function shoot(page, file, facts, app) {
  const parts = Math.min(6, Math.max(1, Math.ceil(facts.height / Math.max(1, facts.view))));
  // The player resets a programmatic scrollTo on its work surface, so it is scrolled the way a person does, by the wheel.
  const box = app === "player" ? await page.locator(".ui-surface__body").first().boundingBox().catch(() => null) : null;
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < parts; i++) {
    if (box) {
      if (i > 0) await page.mouse.wheel(0, facts.view * 0.92);
    } else {
      await page.evaluate((top) => document.querySelector(".ui-surface__body")?.scrollTo(0, top), i * facts.view * 0.92);
    }
    await page.waitForTimeout(box ? 400 : 150);
    await page.screenshot({ path: parts === 1 ? `${file}.png` : `${file}-part${i + 1}.png` });
  }
}

const opts = args(process.argv.slice(2));
mkdirSync(opts.dir, { recursive: true });
const base = `http://localhost:${opts.port}`;
const browser = await chromium.launch();
try {
  const themes = opts.themes.split(",");
  for (const [size, theme] of opts.sizes.split(",").flatMap((size) => themes.map((theme) => [size, theme]))) {
    const [width, height] = size.split("x").map(Number);
    const suffix = themes.length === 1 && theme === "light" ? "" : `-${theme}`;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 768, colorScheme: theme });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
    await importFixture(page, base, opts.fixture, opts.app);
    for (const route of opts.routes) {
      errors.length = 0;
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      // The term chrome sits behind Suspense and can land seconds after a cold
      // dev-server load; a capture taken before it shows an empty nav rail.
      await page.waitForFunction(() => document.querySelectorAll("nav a, [role=link]").length > 10, null, { timeout: 10_000 }).catch(() => console.log(`${size}${suffix} ${route}  nav did not render within 10s`));
      if (opts.app === "player") await markSurface(page);
      const facts = await report(page);
      await shoot(page, `${opts.dir}/${slug(route)}-${width}x${height}${suffix}`, facts, opts.app);
      const flags = [facts.document > 0 ? `document +${facts.document}px` : "", facts.surface > 1 ? `surface +${facts.surface}px` : "", facts.wide.length ? `wide: ${facts.wide.join(", ")}` : "", facts.spills.length ? `spills: ${facts.spills.join(", ")}` : ""].filter(Boolean);
      console.log(`${size}${suffix} ${route}  ${flags.join("  ") || "fits"}${errors.length ? `  errors: ${errors.join(" | ")}` : ""}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
