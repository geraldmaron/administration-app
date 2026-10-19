import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

// Congress with a bill on the desk (the case-families fixture): read the week,
// the chambers seat by seat, the map and the people; select a state and see it
// lit; open the bill from the desk and sign it against leaving it and against a
// veto; then work a leader against leaving them be. Every size in the config
// runs it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w6-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };
const BILL = "Tax Relief and Growth Act";

async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${size}.png`, SCREENS)) });
}

async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: /^(President’s )?Brief$/ })).toBeVisible();
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

async function openCongress(page: Page): Promise<void> {
  await page.goto("/washington/congress");
  await expect(page.getByRole("heading", { level: 1, name: "Congress" })).toBeVisible({ timeout: 60_000 });
}

test("Congress: the week, the chambers seat by seat, a state lit across the page, and the desk's override line", async ({ page }, info) => {
  await importFixture(page, "case-families");
  await openCongress(page);
  for (const name of ["The chambers", "Where you stand with them", "Bills in Congress", "The term's record", "The people who run it"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("list", { name: "Congressional disposition toward the administration" })).toBeVisible();
  const workload = page.getByRole("navigation", { name: "Congressional workload" });
  await workload.getByRole("link", { name: /Nominees in review/i }).click();
  await expect(page).toHaveURL(/view=nominations/);
  await page.goBack();
  await expect(workload).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /^The House \d+–\d+$/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /^The Senate \d+–\d+$/ })).toBeAttached();
  await expect(page.locator(".hill-ring__seat[data-seat]")).toHaveCount(535);
  await expectNoHorizontalOverflow(page, "congress");
  await capture(page, info, "congress");

  await page.getByLabel("Show a state's members").selectOption({ label: "Ohio" });
  await expect(page.getByRole("heading", { level: 3, name: "Ohio" })).toBeVisible();
  const lit = await page.locator(".hill-ring__seat[data-seat]:not([data-dimmed])").count();
  expect(lit).toBeGreaterThan(2);
  expect(lit).toBeLessThan(40);
  const members = page.getByRole("region", { name: "Where the members come from" });
  await expect(members).toBeVisible();
  await expect(members.getByRole("list", { name: "House seats: key" })).toBeVisible();
  await capture(page, info, "congress-state");

  const ridges = page.locator(".hill-aisle__ridges").first();
  await ridges.scrollIntoViewIfNeeded();
  const frame = (await ridges.boundingBox())!;
  const median = (await page.locator('.hill-aisle__median[data-party="republican"]').first().boundingBox())!;
  await ridges.click({ position: { x: median.x + median.width / 2 - frame.x, y: frame.height - 6 } });
  await expect(page.getByText("Members at this position").first()).toBeVisible();
  const depth = page.locator(".hill-depth__grid").first();
  await expect(depth.locator("tbody tr").first()).toBeVisible();
  await expect(depth.getByRole("link").first()).toHaveAttribute("href", /^\/washington\/person\//);
  await capture(page, info, "congress-ridge-slice");

  const seat = page.locator(".hill-ring a[href^='/washington/person/']").first();
  const href = await seat.getAttribute("href");
  await seat.locator("circle").click({ force: true });
  await page.waitForURL(`**${href}`);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Congress" })).toBeVisible();

  await page.getByRole("tab", { name: /^Bills and agenda/ }).click();
  const desk = page.getByRole("list", { name: "On your desk", exact: true });
  await desk.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(desk.getByRole("img", { name: /, to override: / })).toHaveCount(2);
  await capture(page, info, "congress-desk");
  await desk.getByRole("link", { name: BILL }).click();
  await page.waitForURL("**/washington/congress/bill/**");
  await expect(page.getByRole("heading", { level: 1, name: BILL })).toBeVisible();
  await expect(page.getByRole("list", { name: /^Stage: On your desk$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "bill");
  await capture(page, info, "congress-bill");

  const compare = page.getByRole("region", { name: "Compare signing and vetoing" });
  await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(compare.getByRole("radio", { name: "Leave it on the desk" })).toBeChecked();
  await compare.getByRole("radio", { name: "Veto it" }).check();
  await expect(compare.getByText("Choose a veto objection above before you return it.").first()).toBeVisible();
  await expect(compare.getByRole("button", { name: "Veto and return it" })).toBeDisabled();
  await compare.getByRole("radio", { name: "Sign the bill" }).check();
  const sign = compare.getByRole("button", { name: "Sign the bill into law" });
  await expect(sign).toBeEnabled();
  await expectNoHorizontalOverflow(page, "bill desk");
  await capture(page, info, "congress-bill-sign");

  await sign.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: `Signed into law: ${BILL}` })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("list", { name: /^Stage: Law$/ })).toBeVisible();
  await receipt.getByRole("article").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expectNoHorizontalOverflow(page, "bill receipt");
  await capture(page, info, "congress-bill-receipt");
  await receipt.getByRole("link", { name: "View record" }).click();
  await page.waitForURL("**/record/event/**");
  await expect(page.getByText(BILL).first()).toBeAttached();
});

test("Congress: a leader's post, worked with a private call against leaving them be", async ({ page }, info) => {
  await importFixture(page, "case-families");
  await openCongress(page);
  const leaders = page.getByRole("heading", { level: 2, name: "The people who run it" });
  await leaders.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.locator(".hill-leader__outreach").first().click();
  await page.waitForURL("**/washington/congress/post/**");
  await expect(page.getByRole("heading", { level: 1, name: "Speaker of the House" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Toward you" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "post");
  await capture(page, info, "congress-post");

  const compare = page.getByRole("region", { name: "Compare the approaches" });
  await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(compare.getByRole("radio", { name: "Leave them be" })).toBeChecked();
  await compare.getByRole("radio", { name: "Private call" }).check();
  const verb = compare.getByRole("button", { name: "Make the call" });
  await expect(verb).toBeEnabled();
  await capture(page, info, "congress-post-lobby");
  await verb.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: "Private call" })).toBeVisible({ timeout: 30_000 });
  await receipt.getByRole("button", { name: "Compare the approaches again" }).click();
  await expect(page.getByText(/^Private call under way\. The answer is due /).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "post after the call");
});
