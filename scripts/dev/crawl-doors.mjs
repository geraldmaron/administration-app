#!/usr/bin/env node
// Follows every door a player can press from the hub screens, on fixture saves
// imported into a fresh browser against a running dev server, and prints the
// doors that dead-end: a route the tree does not have, a "No such ..." or
// error screen, a click that goes nowhere, or a Brief matter whose door lands
// on a page that never names the matter.
//
//   node scripts/dev/crawl-doors.mjs [--port 5173] [--fixtures week-30,resignation-offer]
//     [--per-shape 2] [--size 1440x900] [--json <file>]
//   node scripts/dev/crawl-doors.mjs --press [--per-route 30] [--fixtures ...]
//
// Links are followed by in-app navigation (the router's own popstate path, the
// same one a Door's click takes), so the save is not reloaded for each one. The
// Brief's matter doors are clicked for real. Disabled buttons are listed with
// whether the page says why.
//
// --press presses every enabled control on each route the hubs reach instead:
// buttons, role=button, one radio per group, tabs, switches, sliders, selects,
// disclosure summaries. Each fixture is imported into a throwaway browser
// profile, so pressing is safe; after a press that changed the saved campaign,
// the profile's store is put back and the page reloaded, so every press starts
// from the fixture. A press must do something a player can see (or change the
// save) without an error, and a compare-and-authorize it opens is carried
// through to its verb, which must end in a receipt or a stated refusal.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HUBS = [
  "/brief", "/brief/digest", "/washington", "/washington/congress", "/washington/courts", "/washington/oversight", "/washington/office/press",
  "/nation", "/nation/economy", "/nation/budget", "/nation/policy", "/nation/emergency", "/nation/electorate",
  "/world", "/world/security", "/record", "/record/press",
];

// One save per door class that has gone wrong: a Secretary's proposal, a resignation offer, a contested
// nominee, a court challenge, a treaty before the Senate, the removal arc. About ninety seconds each.
const DEFAULT_FIXTURES = ["engagement-week", "resignation-offer", "contested-nominee", "court-challenge", "treaty-pending", "removal-open"];

// One save per kind of week a control can act in: a quiet engagement week, a critical decision,
// a mature term, a disaster at home, a court challenge, a treaty before the Senate, the removal arc.
const PRESS_FIXTURES = ["engagement-week", "decision-critical", "week-30", "domestic-flood", "court-challenge", "treaty-pending", "removal-open"];

const DEAD = /This page doesn't exist|The screen could not open|There is no screen at|\bNo such [a-z]+\b|Case not found|This clock is not running|not one your government seats|answered from its own record|does not open from here/;

const STOP = new Set("about after again against their there these those which while would could should with from into your you have has been will this that what when where whose they them over under more most less than then also only just each every other some such once very the and for are was were not but".split(" "));

function args(argv) {
  const out = { port: "5173", fixtures: "", perShape: 0, perRoute: 30, size: "1440x900", json: "", press: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port") out.port = argv[++i];
    else if (a === "--fixtures") out.fixtures = argv[++i];
    else if (a === "--per-shape") out.perShape = Number(argv[++i]);
    else if (a === "--size") out.size = argv[++i];
    else if (a === "--json") out.json = argv[++i];
    else if (a === "--press") out.press = true;
    else if (a === "--per-route") out.perRoute = Number(argv[++i]);
    else throw new Error(`Unknown argument ${a}`);
  }
  out.fixtures ||= (out.press ? PRESS_FIXTURES : DEFAULT_FIXTURES).join(",");
  out.perShape ||= out.press ? 1 : 2;
  return out;
}

/** A link's route shape: ids collapsed, so a list of two hundred countries is sampled rather than walked. */
function shapeOf(href) {
  const [path, query = ""] = href.split("?");
  const segments = path.split("/").map((s) => (/[A-Z0-9%]|:/.test(s) || s.length > 24 ? "$" : s));
  return `${segments.join("/")}${query ? `?${query.split("=")[0]}=` : ""}`.replace(/#.*/, "");
}

/** The words that say what a matter is about: its title, and the reason's proper nouns and long words. */
function subjectWords(text) {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9' -]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)))];
}

async function importFixture(page, base, name) {
  const file = fileURLToPath(new URL(`../../apps/web/tests/.fixtures/${name}.json`, import.meta.url));
  await page.goto(`${base}/administrations`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Import a save exported from this game").setInputFiles(file);
  await page.waitForURL("**/brief", { timeout: 60_000 });
}

/** The masthead and side navigation render late on the map routes; wait for them, then for the screen's heading. */
async function settle(page) {
  await page.waitForSelector("nav", { timeout: 15_000 }).catch(() => undefined);
  await page.waitForSelector("h1", { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function navigateInApp(page, href) {
  const before = await page.evaluate(() => document.querySelector("h1")?.textContent ?? "");
  await page.evaluate((target) => {
    window.history.pushState(window.history.state, "", target);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  }, href);
  await page.waitForFunction((target) => `${location.pathname}${location.search}` === target.split("#")[0], href, { timeout: 5_000 }).catch(() => undefined);
  // The old screen's heading stays up until the new one renders; wait for it to change, unless both are the same screen.
  await page.waitForFunction((old) => (document.querySelector("h1")?.textContent ?? "") !== old, before, { timeout: 3_000 }).catch(() => undefined);
  await settle(page);
}

async function landing(page) {
  return page.evaluate((dead) => {
    const text = document.body.innerText;
    const match = text.match(new RegExp(dead));
    return { url: `${location.pathname}${location.search}${location.hash}`, h1: document.querySelector("h1")?.textContent?.trim() ?? "", dead: match ? match[0] : "", text: text.toLowerCase() };
  }, DEAD.source);
}

async function collectLinks(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .filter((a) => a.getAttribute("href").startsWith("/") && a.getClientRects().length > 0)
      .map((a) => ({ href: a.getAttribute("href"), text: (a.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60) })),
  );
}

async function collectDisabled(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("button:disabled, [aria-disabled='true']")]
      .filter((b) => b.getClientRects().length > 0)
      .map((b) => {
        const described = b.getAttribute("aria-describedby");
        const reason = (described && document.getElementById(described)?.textContent?.trim()) || b.getAttribute("title") || "";
        return { text: (b.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50), reason: reason.slice(0, 80) };
      }),
  );
}

/** The Brief's matters: the leading alert and every queued row with a door, read with their titles and reasons. */
async function collectMatters(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".alert, li.queue__row")];
    return cards.flatMap((card, index) => {
      const door = card.querySelector("a[href]");
      const title = (card.querySelector(".alert__title, .queue__title")?.textContent ?? card.textContent ?? "").trim().replace(/\s+/g, " ");
      const reason = (card.querySelector(".alert__reason, .queue__reason")?.textContent ?? "").trim().replace(/\s+/g, " ");
      const dead = /answered from its own record|does not open from here/.test(card.textContent ?? "");
      return door || dead ? [{ index, selector: card.className, title: title.slice(0, 100), reason: reason.slice(0, 200), href: door?.getAttribute("href") ?? "", dead }] : [];
    });
  });
}

async function clickMatter(page, matter) {
  await navigateInApp(page, "/brief");
  const card = page.locator(".alert, li.queue__row").nth(matter.index);
  const before = page.url();
  await card.locator("a[href]").last().click({ timeout: 5_000 });
  await page.waitForURL((url) => url.toString() !== before, { timeout: 5_000 }).catch(() => undefined);
  await settle(page);
  const land = await landing(page);
  return { ...land, moved: page.url() !== before };
}

function subjectFound(matter, text) {
  const words = subjectWords(`${matter.title} ${matter.reason}`);
  const hits = words.filter((w) => text.includes(w));
  return { ok: words.length === 0 || hits.length / words.length >= 0.5, score: `${hits.length}/${words.length}`, missing: words.filter((w) => !text.includes(w)).slice(0, 6) };
}

async function crawlFixture(browser, base, name, opts) {
  const [width, height] = opts.size.split("x").map(Number);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const failures = [];
  const disabled = [];
  let followed = 0;
  try {
    await importFixture(page, base, name);
    const links = new Map();
    await settle(page);
    // Proof the in-app navigation renders routes at all: a path nobody built must land on the not-found screen.
    await navigateInApp(page, "/crawl-probe-no-such-screen");
    if (!(await landing(page)).dead) throw new Error("In-app navigation did not render the not-found screen; the crawl would read stale pages");
    for (const hub of HUBS) {
      await navigateInApp(page, hub);
      const hubLand = await landing(page);
      if (hubLand.dead) failures.push({ fixture: name, from: hub, door: "(hub)", href: hub, why: hubLand.dead });
      for (const link of await collectLinks(page)) if (!links.has(link.href)) links.set(link.href, { ...link, from: hub });
      for (const button of await collectDisabled(page)) disabled.push({ fixture: name, from: hub, ...button });
    }
    const perShape = new Map();
    for (const link of links.values()) {
      const shape = shapeOf(link.href);
      const seen = perShape.get(shape) ?? 0;
      if (seen >= opts.perShape) continue;
      perShape.set(shape, seen + 1);
      await navigateInApp(page, link.href);
      const land = await landing(page);
      followed++;
      if (land.dead) failures.push({ fixture: name, from: link.from, door: link.text, href: link.href, why: land.dead });
      else if (!land.h1) failures.push({ fixture: name, from: link.from, door: link.text, href: link.href, why: "no screen heading" });
    }
    await navigateInApp(page, "/brief");
    for (const matter of await collectMatters(page)) {
      if (matter.dead) {
        failures.push({ fixture: name, from: "/brief matter", door: matter.title, href: "(none)", why: "no door: answered from its own record" });
        continue;
      }
      const land = await clickMatter(page, matter);
      followed++;
      const subject = subjectFound(matter, land.text);
      if (land.dead) failures.push({ fixture: name, from: "/brief matter", door: matter.title, href: matter.href, why: land.dead });
      else if (!land.moved) failures.push({ fixture: name, from: "/brief matter", door: matter.title, href: matter.href, why: "click did not navigate" });
      else if (!subject.ok) failures.push({ fixture: name, from: "/brief matter", door: matter.title, href: land.url, why: `subject not on landing (${subject.score}; missing ${subject.missing.join(", ")})` });
    }
  } finally {
    await context.close();
  }
  return { failures, disabled, followed };
}

async function crawlAll(browser, base, opts) {
  const all = { failures: [], disabled: [], followed: 0 };
  for (const name of opts.fixtures.split(",")) {
    const started = Date.now();
    const result = await crawlFixture(browser, base, name, opts);
    all.failures.push(...result.failures);
    all.disabled.push(...result.disabled);
    all.followed += result.followed;
    console.error(`${name}: ${result.followed} doors, ${result.failures.length} failing, ${Math.round((Date.now() - started) / 1000)}s`);
  }
  console.log(`\n${all.followed} doors followed, ${all.failures.length} failing\n`);
  console.log("| fixture | from | door | href | why |\n|---|---|---|---|---|");
  for (const f of all.failures) console.log(`| ${f.fixture} | ${f.from} | ${f.door} | ${f.href} | ${f.why} |`);
  const unexplained = all.disabled.filter((d) => !d.reason);
  console.log(`\n${all.disabled.length} disabled controls, ${unexplained.length} with no stated reason`);
  for (const d of unexplained) console.log(`- ${d.fixture} ${d.from}: "${d.text}"`);
  if (opts.json) writeFileSync(opts.json, JSON.stringify(all, null, 2));
  process.exitCode = all.failures.length > 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Press mode

/** Every route the hubs reach: the hubs, then one link of each route shape. */
async function reachableRoutes(page, opts) {
  const routes = [...HUBS];
  const perShape = new Map();
  for (const hub of HUBS) {
    await navigateInApp(page, hub);
    for (const link of await collectLinks(page)) {
      const href = link.href.split("#")[0];
      const shape = shapeOf(href);
      if (routes.includes(href) || (perShape.get(shape) ?? 0) >= opts.perShape) continue;
      perShape.set(shape, (perShape.get(shape) ?? 0) + 1);
      routes.push(href);
    }
  }
  return routes;
}

const DB = { name: "administration.device.v1", store: "kv" };

/** The profile's saved state: every key in the device store, read whole so it can be put back. */
async function readStore(page) {
  return page.evaluate(
    ({ name, store }) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(store, "readonly");
          const keys = tx.objectStore(store).getAllKeys();
          const values = tx.objectStore(store).getAll();
          tx.oncomplete = () => {
            open.result.close();
            resolve(keys.result.map((key, i) => [key, values.result[i]]));
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    DB,
  );
}

async function writeStore(page, entries) {
  await page.evaluate(
    ({ name, store, entries: rows }) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(store, "readwrite");
          const kv = tx.objectStore(store);
          kv.clear();
          for (const [key, value] of rows) kv.put(value, key);
          tx.oncomplete = () => {
            open.result.close();
            resolve(undefined);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { ...DB, entries },
  );
}

/** A digest of the saved state, taken in the page so a large save never crosses the wire per press. */
async function storeDigest(page) {
  return page.evaluate(
    ({ name, store }) =>
      new Promise((resolve) => {
        const open = indexedDB.open(name);
        open.onerror = () => resolve("unreadable");
        open.onsuccess = () => {
          const tx = open.result.transaction(store, "readonly");
          const all = tx.objectStore(store).getAll();
          tx.oncomplete = async () => {
            open.result.close();
            const text = all.result.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join("\u0000");
            const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
            resolve([...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join(""));
          };
        };
      }),
    DB,
  );
}

const PRESSABLE = [
  "button",
  "[role=button]",
  "[role=tab]",
  "[role=switch]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=slider]",
  "[role=menuitem]",
  "input[type=radio]",
  "input[type=checkbox]",
  "input[type=range]",
  "select",
  "summary",
].join(", ");

/**
 * Tags every visible control on the page with its position, and describes each:
 * what kind it is, its accessible name, whether it is chrome shared by every
 * screen, the family it belongs to, and, for a disabled one, the reason the page gives.
 * Radios are reduced to the first unchecked one in each group: pressing one is the act.
 */
async function tagControls(page, selector) {
  return page.evaluate((sel) => {
    const visible = (el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const nameOf = (el) => {
      const labeled = el.getAttribute("aria-labelledby");
      const byId = labeled ? labeled.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : "";
      const label = el.labels?.[0]?.textContent ?? "";
      return (el.getAttribute("aria-label") || byId || label || el.textContent || el.getAttribute("title") || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 70);
    };
    const kindOf = (el) => {
      const role = el.getAttribute("role");
      if (el.tagName === "INPUT") return el.type;
      if (el.tagName === "SELECT") return "select";
      if (el.tagName === "SUMMARY") return "summary";
      return role === "button" || !role ? "button" : role;
    };
    const disabledOf = (el) => el.disabled === true || el.getAttribute("aria-disabled") === "true";
    const reasonOf = (el) => {
      const described = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join(" ");
      if (described) return described;
      if (el.getAttribute("title")) return el.getAttribute("title");
      // Adjacent text: what the control's own container says beside it.
      const around = el.parentElement?.textContent?.replace(el.textContent ?? "", "").trim() ?? "";
      return around.length >= 12 ? `(adjacent) ${around.slice(0, 80)}` : "";
    };
    document.querySelectorAll("[data-crawl]").forEach((el) => el.removeAttribute("data-crawl"));
    const groups = new Set();
    const out = [];
    let n = 0;
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest("[data-crawl-skip]") || !visible(el) && !(el.tagName === "INPUT" && visible(el.closest("label") ?? el))) continue;
      if (el.tagName === "A" && el.getAttribute("role") !== "button") continue;
      const kind = kindOf(el);
      if (kind === "file") continue;
      // The tab already showing is not a press anyone makes.
      if (kind === "tab" && el.getAttribute("aria-selected") === "true") continue;
      if (kind === "radio") {
        const group = el.getAttribute("name") || el.closest("[role=radiogroup]")?.id || el.closest("[role=radiogroup], fieldset")?.className || "radios";
        const checked = el.checked === true || el.getAttribute("aria-checked") === "true";
        if (checked || disabledOf(el) || groups.has(group)) {
          if (disabledOf(el) && !groups.has(group)) out.push({ id: -1, kind, name: nameOf(el), chrome: false, family: "radio", disabled: true, reason: reasonOf(el) });
          continue;
        }
        groups.add(group);
      }
      const id = n++;
      el.setAttribute("data-crawl", String(id));
      const map = Boolean(el.closest(".map-layer"));
      const chrome = !map && Boolean(el.closest("header, nav, [role=banner], [role=navigation], .masthead, .time-controls"));
      const family = `${kind}.${(el.getAttribute("class") ?? "").split(/\s+/).filter((c) => !/--|^is-/.test(c)).sort().join(".")}`;
      out.push({ id, kind, name: nameOf(el), chrome, map, family, disabled: disabledOf(el), reason: disabledOf(el) ? reasonOf(el) : "" });
    }
    return out;
  }, selector);
}

/** Everything a press could visibly change, read as strings so before and after compare directly. */
async function observe(page) {
  return page.evaluate(() => {
    const shown = (el) => el.getClientRects().length > 0;
    const pick = (sel, read) => [...document.querySelectorAll(sel)].filter(shown).map(read).join("|");
    return {
      url: `${location.pathname}${location.search}${location.hash}`,
      dialogs: pick("dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true]", (el) => el.textContent?.slice(0, 40) ?? ""),
      states: pick("[aria-expanded], [aria-pressed], [aria-checked], [aria-selected], [aria-current], [data-selected], details", (el) =>
        ["aria-expanded", "aria-pressed", "aria-checked", "aria-selected", "aria-current", "data-selected"].map((a) => el.getAttribute(a) ?? "").join(",") + (el.tagName === "DETAILS" ? String(el.open) : ""),
      ),
      values: pick("input, select, textarea", (el) => `${el.value}:${el.checked}`),
      live: pick("[aria-live], [role=status], [role=alert], .ui-receipt", (el) => el.textContent ?? ""),
      text: document.body.innerText.length + ":" + document.body.innerText.slice(0, 4000),
      scroll: String(Math.round(window.scrollY / 50)),
    };
  });
}

function changed(before, after) {
  return Object.keys(before).filter((key) => before[key] !== after[key]);
}

async function waitForChange(page, before, ms) {
  const deadline = Date.now() + ms;
  for (;;) {
    const after = await observe(page).catch(() => before);
    const keys = changed(before, after);
    if (keys.length > 0 || Date.now() > deadline) return { after, keys };
    await page.waitForTimeout(120);
  }
}

/** The line of a Playwright failure that says why: covered by another element, off screen, never stable. */
function whyBlocked(error) {
  const lines = String(error?.message ?? error).split("\n").map((line) => line.trim());
  const cause = [...lines].reverse().find((line) => /intercepts pointer events|not visible|outside of the viewport|not stable|not enabled|detached/.test(line));
  return (cause ?? lines[0] ?? "").replace(/^-\s*/, "").slice(0, 140);
}

/**
 * Presses a control by pointer, and where the pointer cannot reach it (a skip-style toggle kept off
 * screen until focused, a map mark under the surface) by keyboard, the way a keyboard player would.
 * Returns how it was pressed, or throws with why neither reached it.
 */
async function press(page, control) {
  try {
    await pointerPress(page, control);
    return "pointer";
  } catch (error) {
    const pointer = whyBlocked(error);
    const target = page.locator(`[data-crawl="${control.id}"]`);
    if (control.kind === "select" || control.kind === "range" || control.kind === "slider") throw new Error(pointer);
    const focused = await target
      .evaluate((el) => {
        el.focus();
        return document.activeElement === el;
      })
      .catch(() => false);
    if (!focused) throw new Error(`pointer: ${pointer}; keyboard: cannot take focus`);
    await page.keyboard.press(control.kind === "radio" || control.kind === "checkbox" || control.kind === "switch" ? "Space" : "Enter");
    return `keyboard (pointer: ${pointer})`;
  }
}

/** Presses one tagged control the way a player would: a click, a pick, or an arrow key on a slider. */
async function pointerPress(page, control) {
  const target = page.locator(`[data-crawl="${control.id}"]`);
  if (control.kind === "range" || control.kind === "slider") {
    await target.focus({ timeout: 1_500 });
    await page.keyboard.press("ArrowRight");
    return;
  }
  if (control.kind === "select") {
    const options = await target.evaluate((el) => [...el.options].filter((o) => !o.disabled && !o.selected).map((o) => o.value));
    if (options.length > 0) await target.selectOption(options[0], { timeout: 1_500 });
    return;
  }
  if (control.kind === "radio" || control.kind === "checkbox") {
    const visible = await target.isVisible();
    if (visible) await target.click({ timeout: 1_500 });
    else await target.check({ force: true, timeout: 1_500 });
    return;
  }
  await target.click({ timeout: 1_500 });
}

/**
 * Carries an open compare-and-authorize to its end: pick the first option that is not doing nothing,
 * press the verb, and require a receipt or a stated refusal.
 */
async function authorizeThrough(page, compareIndex) {
  const compare = page.locator(".ui-compare").nth(compareIndex);
  const radios = compare.locator("input[type=radio]");
  const count = await radios.count();
  let picked = false;
  for (let i = 1; i < count && !picked; i++) {
    const radio = radios.nth(i);
    if ((await radio.isDisabled()) || (await radio.getAttribute("aria-describedby"))) continue;
    await radio.check({ force: true, timeout: 2_000 }).catch(() => undefined);
    picked = await radio.isChecked();
  }
  // The verb docks in the surface's foot, outside the compare, wherever a surface carries one.
  const own = compare.locator(".ui-compare__act button");
  const act = (await own.count()) > 0 ? compare.locator(".ui-compare__act") : page.locator(".ui-compare__act").first();
  const verb = act.locator("button").first();
  if (!picked) return { outcome: "every option locked", ok: true };
  if (await verb.isDisabled()) {
    const why = await act.locator(".ui-compare__review").textContent();
    return { outcome: `verb stays off after a pick: ${why?.trim().slice(0, 80) ?? ""}`, ok: Boolean(why?.trim()) };
  }
  const label = (await verb.textContent())?.trim() ?? "";
  await verb.click({ timeout: 3_000 });
  const ended = await page
    .waitForFunction(() => document.querySelector(".ui-receipt, .act-problem, [role=alert]:not(:empty)"), undefined, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!ended) return { outcome: `"${label}" ended in silence`, ok: false };
  const said = await page.evaluate(() => (document.querySelector(".ui-receipt, .act-problem, [role=alert]:not(:empty)")?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80));
  return { outcome: `"${label}": ${said}`, ok: true };
}

/** The store's digest once it stops moving: the app writes a committed act a beat after the screen shows it. */
async function settledDigest(page) {
  let last = await storeDigest(page);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(250);
    const next = await storeDigest(page);
    if (next === last && i >= 1) return next;
    last = next;
  }
  return last;
}

function seenMapCount(seen, family) {
  const sampled = [...seen].filter((key) => key.startsWith(`map|${family}|`)).length;
  return sampled >= 2 ? "full" : String(sampled);
}

async function canvasShot(page) {
  const canvas = page.locator(".map-layer canvas").first();
  return (await canvas.count()) > 0 ? canvas.screenshot({ timeout: 3_000, animations: "disabled" }).catch(() => undefined) : undefined;
}

/** Puts the fixture back where a press changed the save, and reopens the route fresh either way. */
async function reset(page, base, route, snapshot, digest) {
  if ((await storeDigest(page)) !== digest) {
    await writeStore(page, snapshot);
    await page.goto(`${base}${route}`, { waitUntil: "commit", timeout: 20_000 });
    await settle(page);
    return;
  }
  // Through a screen that is not this one, so the route remounts and drops what the last press opened.
  await page.evaluate(() => {
    window.history.pushState(window.history.state, "", "/crawl-probe-no-such-screen");
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  });
  await page.waitForFunction(() => /no screen|doesn't exist/i.test(document.body.innerText), undefined, { timeout: 3_000 }).catch(() => undefined);
  await navigateInApp(page, route);
}

async function pressRoute(page, base, route, ctx) {
  const { name, opts, seen, failures, disabled, errors, snapshot, digest } = ctx;
  await reset(page, base, route, snapshot, digest);
  const controls = await tagControls(page, PRESSABLE);
  const perFamily = new Map();
  let pressed = 0;
  for (const control of controls) {
    if (control.disabled) {
      const key = `disabled|${shapeOf(route)}|${control.name.replace(/\d+/g, "#")}`;
      if (!seen.has(key)) disabled.push({ fixture: name, route, ...control });
      seen.add(key);
      continue;
    }
    // Map marks and map controls are the same parts on every screen: a couple of each family is the sample.
    const key = control.map ? `map|${control.family}|${seenMapCount(seen, control.family)}` : `${control.chrome ? "*" : shapeOf(route)}|${control.kind}|${control.name.replace(/\d+/g, "#")}`;
    const family = (perFamily.get(control.family) ?? 0) + 1;
    perFamily.set(control.family, family);
    if (seen.has(key) || family > 3 || pressed >= opts.perRoute) continue;
    seen.add(key);
    pressed++;
    await reset(page, base, route, snapshot, digest);
    const fresh = (await tagControls(page, PRESSABLE)).find((c) => c.kind === control.kind && c.name === control.name && !c.disabled);
    const where = { fixture: name, route, control: `${control.kind} "${control.name}"` };
    if (!fresh) {
      failures.push({ ...where, kind: "unstable", why: "control not found again on a fresh load" });
      continue;
    }
    const compares = await page.locator(".ui-compare").count();
    const before = await observe(page);
    const storeBefore = await storeDigest(page);
    const canvasBefore = control.map ? await canvasShot(page) : undefined;
    errors.length = 0;
    ctx.event = "";
    let via;
    try {
      via = await press(page, fresh);
    } catch (error) {
      failures.push({ ...where, kind: "blocked", why: String(error.message ?? error).slice(0, 160) });
      continue;
    }
    if (via !== "pointer") where.control += ` [${via.slice(0, 80)}]`;
    let { after, keys } = await waitForChange(page, before, 2_500);
    // The map draws on a canvas: a control that only moves the camera is seen in its pixels.
    if (keys.length === 0 && canvasBefore) {
      await page.waitForTimeout(600);
      if (Buffer.compare(canvasBefore, (await canvasShot(page)) ?? canvasBefore) !== 0) keys = ["canvas"];
    }
    const saved = (await settledDigest(page)) !== storeBefore;
    const dead = after.text.match(DEAD);
    if (errors.length > 0 || dead) {
      failures.push({ ...where, kind: "error", why: (dead?.[0] ?? errors[0]).slice(0, 160) });
      continue;
    }
    if (keys.length === 0 && !saved && !ctx.event) {
      failures.push({ ...where, kind: "no-effect", why: "nothing observable changed within 2.5s" });
      continue;
    }
    const opened = (await page.locator(".ui-compare").count()) > compares;
    if (opened || (fresh.kind === "radio" && (await page.locator(`[data-crawl="${fresh.id}"]`).evaluate((el) => Boolean(el.closest(".ui-compare"))).catch(() => false)))) {
      const flowKey = `flow|${shapeOf(route)}|${control.name.replace(/\d+/g, "#")}`;
      if (seen.has(flowKey)) continue;
      seen.add(flowKey);
      const index = opened ? compares : await page.locator(".ui-compare").evaluateAll((all, id) => all.findIndex((c) => c.querySelector(`[data-crawl="${id}"]`)), fresh.id);
      const flow = await authorizeThrough(page, Math.max(0, index)).catch((error) => ({ outcome: String(error.message ?? error).split("\n")[0], ok: false }));
      if (errors.length > 0) failures.push({ ...where, kind: "error", why: `while authorizing: ${errors[0].slice(0, 140)}` });
      else if (!flow.ok) failures.push({ ...where, kind: "silent-authorize", why: flow.outcome });
      else ctx.flows.push({ ...where, outcome: flow.outcome });
    }
  }
  return pressed;
}

async function pressFixture(browser, base, name, opts, seen) {
  const [width, height] = opts.size.split("x").map(Number);
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const ctx = { name, opts, seen, failures: [], disabled: [], errors: [], flows: [], event: "" };
  page.on("pageerror", (error) => ctx.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => message.type() === "error" && ctx.errors.push(`console: ${message.text()}`));
  page.on("download", () => (ctx.event = "download"));
  page.on("popup", () => (ctx.event = "popup"));
  page.on("dialog", async (dialog) => {
    ctx.event = `native ${dialog.type()}`;
    await dialog.accept();
  });
  let pressed = 0;
  try {
    await importFixture(page, base, name);
    await settle(page);
    ctx.snapshot = await readStore(page);
    ctx.digest = await storeDigest(page);
    const routes = await reachableRoutes(page, opts);
    for (const route of routes) {
      ctx.errors.length = 0;
      const before = ctx.failures.length;
      const started = Date.now();
      pressed += await pressRoute(page, base, route, ctx).catch((error) => {
        ctx.failures.push({ fixture: name, route, control: "(route)", kind: "crawler", why: String(error.message ?? error).split("\n")[0].slice(0, 160) });
        return 0;
      });
      console.error(`  ${route}: ${ctx.failures.length - before} failing, ${Math.round((Date.now() - started) / 1000)}s`);
      // Each failure as it is found, so a stopped run still leaves its findings.
      for (const f of ctx.failures.slice(before)) console.error(`    ${f.kind}: ${f.control}: ${f.why}`);
    }
    return { ...ctx, pressed, routes: routes.length };
  } finally {
    await context.close();
  }
}

async function pressAll(browser, base, opts) {
  const seen = new Set();
  const all = { failures: [], disabled: [], flows: [], pressed: 0 };
  for (const name of opts.fixtures.split(",")) {
    const started = Date.now();
    const result = await pressFixture(browser, base, name, opts, seen);
    all.failures.push(...result.failures);
    all.disabled.push(...result.disabled);
    all.flows.push(...result.flows);
    all.pressed += result.pressed;
    console.error(`${name}: ${result.routes} routes, ${result.pressed} presses, ${result.failures.length} failing, ${Math.round((Date.now() - started) / 1000)}s`);
  }
  const unexplained = all.disabled.filter((d) => !d.reason);
  const kinds = new Map();
  for (const f of all.failures) kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
  console.log(`\n${all.pressed} presses, ${all.flows.length} authorizations carried through, ${all.failures.length} failing (${[...kinds].map(([k, n]) => `${k} ${n}`).join(", ") || "none"})\n`);
  console.log("| fixture | route | control | kind | why |\n|---|---|---|---|---|");
  for (const f of all.failures) console.log(`| ${f.fixture} | ${f.route} | ${f.control} | ${f.kind} | ${f.why.replace(/\|/g, "/")} |`);
  console.log(`\n${all.disabled.length} disabled controls, ${unexplained.length} with no stated reason`);
  for (const d of unexplained) console.log(`- ${d.fixture} ${d.route}: ${d.kind} "${d.name}"`);
  if (opts.json) writeFileSync(opts.json, JSON.stringify(all, null, 2));
  process.exitCode = all.failures.length + unexplained.length > 0 ? 1 : 0;
}

const opts = args(process.argv.slice(2));
const base = `http://localhost:${opts.port}`;
const browser = await chromium.launch();
try {
  if (opts.press) await pressAll(browser, base, opts);
  else await crawlAll(browser, base, opts);
} finally {
  await browser.close();
}
