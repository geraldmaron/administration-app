import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page } from "@playwright/test";
import { PNG } from "pngjs";

/** Use the visible representation of a shared choice at the current text size. */
export async function selectChoice(page: Page, legend: string | RegExp, option: string | RegExp): Promise<void> {
  const group = page.getByRole("group", { name: legend, exact: true });
  await expect(group).toBeVisible();
  const select = group.getByRole("combobox");
  if (await select.isVisible()) {
    if (typeof option === "string") await select.selectOption({ label: option });
    else {
      const options = await select.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: (node as HTMLOptionElement).value, label: node.textContent ?? "" })));
      const selected = options.find((entry) => option.test(entry.label));
      if (!selected) throw new Error(`No option matches ${option} in ${legend}`);
      await select.selectOption(selected.value);
    }
  } else await group.getByRole("radio", { name: option, exact: true }).check();
}

/**
 * Nothing on the page is wider than the viewport, and nothing inside the work
 * surface is wider than the surface. The frame clips its own overflow, so the
 * document's scroll width alone would miss a stage that runs off the sheet.
 */
export async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.querySelector<HTMLElement>(".ui-surface__body");
    return {
      document: doc.scrollWidth - window.innerWidth,
      surface: body ? body.scrollWidth - body.clientWidth : 0,
    };
  });
  expect(report.document, `${where}: the page is wider than the viewport`).toBeLessThanOrEqual(0);
  expect(report.surface, `${where}: the work surface's content is wider than the surface`).toBeLessThanOrEqual(1);
}

/**
 * On a phone the screen's verb sits in the lowest 112px of the viewport, in the
 * surface's foot rather than over its scrolling body, so it never covers a
 * row: the body ends where the foot begins.
 */
export async function expectInThumbReach(page: Page, verb: Locator, where: string): Promise<void> {
  const size = page.viewportSize();
  if (!size || size.width >= 768) return;
  const box = await verb.boundingBox();
  expect(box, `${where}: the verb is on screen`).not.toBeNull();
  expect(box!.y + box!.height, `${where}: the verb sits in the lowest 112px`).toBeGreaterThanOrEqual(size.height - 112);
  expect(box!.y + box!.height, `${where}: the verb is inside the viewport`).toBeLessThanOrEqual(size.height);
  const body = await page.locator(".ui-surface__body").boundingBox();
  if (body) expect(body.y + body.height, `${where}: the verb covers none of the scrolling body`).toBeLessThanOrEqual(box!.y + 1);
}

/**
 * A comparison never runs sideways at any width: its cards wrap to the next
 * line instead. From `fromWidth` up the player's expanded panel is checked
 * too, since that is where the most cards share a line.
 */
export async function expectComparisonFits(page: Page, compare: Locator, where: string, fromWidth: number): Promise<void> {
  const size = page.viewportSize();
  const expand = page.getByRole("button", { name: "Expand panel", exact: true });
  if (size && size.width >= fromWidth && (await expand.isVisible())) await expand.click();
  const sideways = await compare.evaluate((element) => {
    const edge = element.getBoundingClientRect().right + 1;
    const scroll = element.querySelector(".ui-compare__scroll");
    const spill = [...element.querySelectorAll(".ui-compare__card")].some((card) => card.getBoundingClientRect().right > edge);
    return (scroll ? scroll.scrollWidth - scroll.clientWidth : 0) + (spill ? 1000 : 0);
  });
  expect(sideways, `${where}: the comparison runs sideways`).toBeLessThanOrEqual(1);
}

/** Waits until the device's stored preferences hold `fragment`, so a reload reads what was just set. */
export async function waitForStoredPreferences(page: Page, fragment: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open("administration.device.v1");
            open.onsuccess = () => {
              const get = open.result.transaction("kv").objectStore("kv").get("administration.preferences.v1");
              get.onsuccess = () => resolve(String(get.result ?? ""));
              get.onerror = () => resolve("");
            };
            open.onerror = () => resolve("");
          }),
      ),
    )
    .toContain(fragment);
}

/**
 * The share of the map, as screenshotted, that differs from its top-left
 * corner's color. The GL map's drawing buffer is not readable from the page
 * once composited, so the check reads what a player would see instead. A map
 * that never drew, or drew only the sea, reads zero.
 */
async function mapInk(page: Page): Promise<number> {
  const png = PNG.sync.read(await page.locator(".map-layer__canvas").screenshot({ animations: "allow" }));
  const { data } = png;
  const [r, g, b] = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  let inked = 0;
  let sampled = 0;
  for (let i = 0; i < data.length; i += 4 * 31) {
    sampled++;
    if (Math.abs((data[i] ?? 0) - r) + Math.abs((data[i + 1] ?? 0) - g) + Math.abs((data[i + 2] ?? 0) - b) > 40) inked++;
  }
  return inked / sampled;
}

/** The map is drawn behind the screen: its first frame is marked and it shows land, not only sea. */
export async function expectMapDrawn(page: Page, where: string): Promise<void> {
  await expect(page.locator(".map-layer__canvas .maplibregl-canvas"), `${where}: the map canvas`).toBeAttached();
  await page.waitForFunction(() => performance.getEntriesByName("map:first-paint").length > 0, null, { timeout: 30_000 });
  await expect.poll(() => mapInk(page), { message: `${where}: the map canvas is blank` }).toBeGreaterThan(0.002);
}

/** The title screen's door to a new administration. */
export async function openFounding(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("link", { name: /Start a new administration/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The transition" })).toBeVisible();
  await page.getByRole("button", { name: "Choose Short setup", exact: true }).click();
  await page.getByRole("button", { name: "Customize every stage", exact: true }).click();
}

/** Names the President, skips to the oath on the defaults, and takes it. Lands on the Brief. */
export async function foundQuickly(page: Page, name: string): Promise<void> {
  await openFounding(page);
  await page.getByLabel("Name on the oath").fill(name);
  await page.getByRole("button", { name: "Skip to the oath" }).click();
  const oath = page.getByRole("button", { name: "Take the oath" });
  await expect(oath).toBeEnabled({ timeout: 60_000 });
  await oath.click();
  await confirmReview(page);
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: /^(President’s )?Brief$/ })).toBeVisible();
}

/** Imports a fixture save built by the global setup, the way a player imports an exported save. Lands on the Brief. */
export async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  const path = fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url));
  await page.getByLabel("Import a save exported from this game").setInputFiles(path);
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: /^(President’s )?Brief$/ })).toBeVisible();
}

/** Waits for every press in flight to settle, which is when its act has been saved. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

/**
 * Deals with whatever still holds the week, the way a player would: a row that
 * can be put off is put off, and anything else is opened and answered on its
 * own screen (a decision left unanswered, a clock case's first answer, an
 * office request granted), until Continue is free.
 */
export async function clearToContinue(page: Page): Promise<void> {
  await openFromNav(page, "/brief");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await expect(page.getByRole("heading", { level: 1, name: /^(President’s )?Brief$/, exact: true })).toBeVisible();
    if (await page.getByRole("button", { name: "Continue", exact: true }).isEnabled()) return;
    // Held work is either the Brief's priority alert or a row in its queue.
    const held = page.locator("section.alert, .queue__row").filter({ hasText: "Holds time" });
    const putOff = held.getByRole("button", { name: "Put off" });
    if ((await putOff.count()) > 0) {
      await putOff.first().click();
      await confirmReview(page);
      await settled(page);
      continue;
    }
    await held.locator("a.ui-card-door__link, a.ui-row-link").first().click();
    await page.waitForURL((url) => url.pathname !== "/brief");
    await answerHold(page, new URL(page.url()).pathname);
    await confirmReview(page);
    await settled(page);
    await openFromNav(page, "/brief");
  }
  throw new Error("The week stayed held after twenty rounds of putting things off.");
}

async function answerHold(page: Page, path: string): Promise<void> {
  if (path.startsWith("/brief/decision/")) {
    await page.getByRole("region", { name: "Without answering" }).getByRole("button", { name: /^(Put it off|Leave it unanswered)$/ }).first().click();
  } else if (path.startsWith("/brief/scandal/")) {
    // Silence is preselected but needs no signature, so it never clears the hold; give the first spoken answer.
    await page.getByRole("radiogroup", { name: "Compare the answers" }).getByRole("radio").nth(1).check();
    await page.getByRole("group", { name: "Compare the answers" }).getByRole("button", { name: "Give this answer" }).click();
  } else if (path.startsWith("/world/war/")) {
    // A war the President took the country into holds time on its War Powers clock: file the
    // report Congress is owed, or, once it is filed, bring the force out.
    // A war the country joined beside someone else is answered by leaving it.
    const report = page.getByRole("region", { name: "Compare filing the War Powers report and leaving it unfiled" });
    const recall = page.getByRole("radiogroup", { name: "Compare bringing the force out and leaving it committed" });
    const leave = page.getByRole("radiogroup", { name: "Compare leaving this war and staying in" });
    await expect(report.or(recall).or(leave).first()).toBeAttached();
    if (!(await report.count()) && !(await recall.count())) {
      await leave.evaluate((element) => element.scrollIntoView({ block: "start" }));
      await leave.getByRole("radio", { name: "Leave the war", exact: true }).check();
      await page.getByRole("button", { name: "Take the United States out" }).click();
    } else if (await report.count()) {
      await report.evaluate((element) => element.scrollIntoView({ block: "start" }));
      await report.getByRole("radio", { name: "File the report", exact: true }).check();
      await report.getByRole("button", { name: "File the report with Congress" }).click();
    } else {
      await recall.evaluate((element) => element.scrollIntoView({ block: "start" }));
      await recall.getByRole("radio", { name: "Bring the force out", exact: true }).check();
      await page.getByRole("button", { name: "Terminate the use of force" }).click();
    }
  } else if (path.startsWith("/brief/clock/")) {
    await page.getByRole("region", { name: "Your answer" }).getByRole("button").first().click();
  } else if (path.startsWith("/washington/office/")) {
    const request = page.locator("article.exec-agenda", { has: page.getByRole("radio", { name: "Grant the request" }) }).first();
    await request.getByRole("radio", { name: "Grant the request" }).check();
    await request.getByRole("button", { name: "Grant the request" }).click();
  } else {
    throw new Error(`Nothing on ${path} can clear the hold.`);
  }
}

/**
 * Answers the presidential review an authorize press opens: skips the
 * simulated check when it runs, presses the final confirmation, and closes the
 * result layer if one stays open. Returns the result's lead ("It is done.",
 * "It was not done.") or "closed" when a routine act closed on its own.
 */
export async function confirmReview(page: Page): Promise<string> {
  const review = page.locator('[role="dialog"].review[data-state="open"]');
  await review.waitFor();
  const skip = review.getByRole("button", { name: "Skip the check" });
  if (await skip.isVisible()) await skip.click();
  await review.locator(".ui-sheet__foot button").last().click();
  const settled = review.locator(".ui-sheet__foot").getByRole("button", { name: "Close", exact: true });
  const outcome = await Promise.race([settled.waitFor().then(() => "result" as const), review.waitFor({ state: "detached" }).then(() => "closed" as const)]);
  if (outcome === "closed") return "closed";
  const lead = (await review.locator(".ui-sheet__lead").textContent()) ?? "";
  await settled.click();
  return lead;
}

/**
 * Opens a destination from the main navigation by its address. A link's name
 * carries its waiting counts and the labels follow the navigation's wording, so
 * the address is the stable handle. Where the destination is behind the drawer
 * (a tablet's Menu, a phone's More), the drawer is opened first.
 */
export async function openFromNav(page: Page, path: string): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Main" });
  const target = `a[href="${path}"], a[href^="${path}#"]`;
  const direct = nav.locator(target).filter({ visible: true });
  const drawer = nav.locator('button[aria-haspopup="dialog"]').filter({ visible: true });
  // Utilities such as Settings sit in the top bar rather than the nav at some widths.
  const elsewhere = page.locator(target).filter({ visible: true });
  // The nav renders a beat after the screen's heading; wait until some door to
  // the destination is on screen before deciding which to press.
  await expect(direct.or(drawer).or(elsewhere).first()).toBeVisible();
  if (await direct.count()) await direct.first().click();
  else if (await elsewhere.count()) await elsewhere.first().click();
  else {
    await drawer.last().click();
    await page.getByRole("dialog", { name: "All destinations" }).locator(target).first().click();
  }
  await page.waitForURL((url) => url.pathname === path || url.pathname === `${path}/`);
}
