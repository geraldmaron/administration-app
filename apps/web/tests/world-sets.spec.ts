import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

// The screens of a set: a body's members set apart, a war entered and ended, an
// instrument sent to the Senate or taken back. Every size in the config runs
// it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w7-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };
const ALLIES = ["GBR", "CAN", "AUS", "JPN", "KOR", "FRA", "DEU", "NLD", "POL", "ISR"];

async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${size}.png`, SCREENS)) });
}

function fixturePath(name: string): string {
  return fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url));
}

/** The id of the first thing in a fixture save that matches, read off the save the way the app will read it. */
function idIn(fixture: string, pattern: RegExp): string {
  const found = pattern.exec(readFileSync(fixturePath(fixture), "utf8"));
  if (!found) throw new Error(`${fixture} holds nothing matching ${pattern}`);
  return found[0];
}

async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fixturePath(name));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
}

async function open(page: Page, path: string, title: string | RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible({ timeout: 60_000 });
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

/** Picks a column of a comparison and presses its verb; the receipt follows. */
async function authorize(page: Page, compare: Locator, column: string, verb: string): Promise<void> {
  await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await compare.getByRole("radio", { name: column, exact: true }).check();
  const press = compare.getByRole("button", { name: verb });
  await expect(press).toBeEnabled();
  await press.click();
  await confirmReview(page);
  await settled(page);
}

test("An organization: its members set apart on the map, how the coalition stands, and the seat the United States holds", async ({ page }, info) => {
  await importFixture(page, "opening");
  await open(page, "/world/org/ORG-NATO", /NATO|North Atlantic/);
  const map = page.locator(".map-layer");
  await expect(map).toHaveAttribute("data-lens", "body:ORG-NATO");
  for (const name of ["Where the coalition stands", "Membership, by how members stand toward you", "Commitments", "Act toward a member"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("img", { name: /^Members by how they stand/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Membership, by how members stand toward you" }).getByRole("listitem").first()).toContainText("You");
  await expectNoHorizontalOverflow(page, "org");
  await capture(page, info, "org");

  await page.getByRole("heading", { level: 2, name: "Membership, by how members stand toward you" }).evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "org-members");
});

test("A war: both sides in their colors, then the United States enters it, files the report Congress is owed and leaves", async ({ page }, info) => {
  await importFixture(page, "war-joined");
  const id = idIn("war-joined", /war:RUS:UKR:\d+/);
  await open(page, `/world/war/${encodeURIComponent(id)}`, "Russia against Ukraine");
  const map = page.locator(".map-layer");
  await expect(map).toHaveAttribute("data-lens", `sides:${id}`);
  for (const name of ["The parties", "State of the war", "Enter the war", "Congress and the authority to fight"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("img", { name: /^Intensity of the fighting:/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "war");
  await capture(page, info, "war");

  const join = page.getByRole("region", { name: "Compare entering this war and staying out" });
  await join.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(join.getByRole("radio", { name: "Do nothing" })).toBeChecked();
  await join.getByRole("radio", { name: "Join Ukraine", exact: true }).check();
  await expect(join.getByRole("button", { name: "Send forces beside Ukraine" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "join compare");
  await capture(page, info, "war-join");
  await authorize(page, join, "Join Ukraine", "Send forces beside Ukraine");
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: "Join Ukraine: forces committed" })).toBeVisible({ timeout: 30_000 });
  await expect(map).toHaveAttribute("data-lens", "delta");
  await expectNoHorizontalOverflow(page, "join receipt");
  await capture(page, info, "war-join-receipt");
  await receipt.getByRole("button", { name: "Back to the war" }).click();

  await expect(page.getByRole("heading", { level: 2, name: /Authority: War Powers$/ })).toBeVisible();
  await expect(page.getByText("Report to Congress:").first()).toContainText("Owed");
  const report = page.getByRole("region", { name: "Compare filing the War Powers report and leaving it unfiled" });
  await report.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "war-powers");
  await authorize(page, report, "File the report", "File the report with Congress");
  await expect(page.getByRole("article", { name: "War Powers report filed" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Back to the war" }).click();

  const end = page.getByRole("region", { name: "Compare leaving this war and staying in" });
  await end.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "war-leave");
  await authorize(page, end, "Leave the war", "Take the United States out");
  await expect(page.getByRole("article", { name: "Leave the war" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Back to the war" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Enter the war", exact: true })).toBeVisible();
});

test("The President's own war: cool the front, put terms to the other side, and read the settlement that follows", async ({ page }, info) => {
  await importFixture(page, "war-own");
  const id = idIn("war-own", /war:IRN:[A-Z]{3}:\d+/);
  await open(page, `/world/war/${encodeURIComponent(id)}`, /^Iran against /);
  await expect(page.getByRole("heading", { level: 2, name: "Ending it", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "own war");
  await capture(page, info, "war-own");

  const end = page.getByRole("region", { name: "Compare ways to end this war and letting it run" });
  await end.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(end.getByRole("radio", { name: "Settle at a table" })).toBeAttached();
  await expect(end.getByText("Terms come before a signature").first()).toBeVisible();
  await capture(page, info, "war-end");
  await authorize(page, end, "Cool the front", "Pull back for the week");
  await expect(page.getByRole("article", { name: "Cool the front" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Back to the war" }).click();

  const again = page.getByRole("region", { name: "Compare ways to end this war and letting it run" });
  await authorize(page, again, "Put terms to them", "Put terms to the other side");
  await expect(page.getByRole("article", { name: "Put terms to them" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Back to the war" }).click();
  await expect(page.getByText(/^Terms are on the table with /).first()).toBeVisible();
});

test("A treaty before the Senate: its parties set apart, the Senate's projection, and sending it up", async ({ page }, info) => {
  await importFixture(page, "treaty-pending");
  const id = idIn("treaty-pending", /treaty:trade:[A-Z]{3}:\d+/);
  await open(page, `/world/treaty/${encodeURIComponent(id)}`, /Agreement on Trade and Investment/);
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", `parties:${id}`);
  await expect(page.getByRole("meter", { name: /two thirds of the Senate consenting/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Parties to the instrument" }).getByRole("listitem")).toHaveCount(2);
  await expectNoHorizontalOverflow(page, "treaty");
  await capture(page, info, "treaty");

  const ratify = page.getByRole("region", { name: "Compare sending it to the Senate and leaving it on the table" });
  await ratify.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "treaty-ratify");
  await authorize(page, ratify, "Send it to the Senate", "Send it to the Senate");
  await expect(page.getByRole("article", { name: /^Sent to the Senate: / })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "treaty-receipt");
  await page.getByRole("button", { name: "Back to the instrument" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: /^Senate consent\s*, where it stands now/ })).toBeVisible();
});

test("A signed treaty withdrawn before the Senate votes", async ({ page }) => {
  await importFixture(page, "treaty-pending");
  const id = idIn("treaty-pending", /treaty:trade:[A-Z]{3}:\d+/);
  await open(page, `/world/treaty/${encodeURIComponent(id)}`, /Agreement on Trade and Investment/);
  const withdraw = page.getByRole("region", { name: "Compare withdrawing it and leaving it as it stands" });
  await authorize(page, withdraw, "Withdraw it", "Withdraw it from the Senate");
  await expect(page.getByRole("article", { name: /^Withdrawn: / })).toBeVisible({ timeout: 30_000 });
});

test("A treaty not yet signed: the draft is read, compared against leaving it, and signed", async ({ page }, info) => {
  await importFixture(page, "opening");
  let signed = false;
  for (const ally of ALLIES) {
    await open(page, `/world/treaty/${encodeURIComponent(`draft:trade:${ally}`)}`, /Agreement on Trade and Investment/);
    const compare = page.getByRole("region", { name: /^Compare signing the .* and leaving it unsigned$/ });
    await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
    if ((await compare.locator(".ui-compare__locked").count()) > 0) continue;
    await capture(page, info, "treaty-draft");
    await authorize(page, compare, "Sign the treaty", "Sign the treaty");
    await expect(page.getByRole("article", { name: /^Signed: / })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Back to the instrument" }).click();
    await expect(page.getByText("Signed, awaiting the Senate").first()).toBeVisible();
    signed = true;
    break;
  }
  expect(signed, "some ally trusts the new administration enough to sign a trade instrument").toBe(true);
});
