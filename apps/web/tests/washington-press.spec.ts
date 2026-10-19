import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, selectChoice } from "./helpers";

// The press office on the first morning with two orders signed: read the
// podium, the desks and the coverage, compare the plays against saying
// nothing, authorize a press conference and read its receipt; then frame one
// of the morning's orders against letting it speak for itself. Every size in
// the config runs it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w6-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };

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
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

async function openPressOffice(page: Page): Promise<void> {
  await page.goto("/washington/office/press");
  await expect(page.getByRole("heading", { level: 1, name: "Press" })).toBeVisible({ timeout: 60_000 });
}

test("the press office: the podium and the desks, and a press conference compared against saying nothing, authorized and received", async ({ page }, info) => {
  await importFixture(page, "day-one-orders");
  await openPressOffice(page);
  for (const name of ["The desks covering you", "Coverage by week", "Every story filed", "Respond to the press", "Running stories", "The press abroad"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("img", { name: /^The corps toward you is/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "The press at a glance" }).or(page.getByLabel("The press at a glance")).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "press office");
  await capture(page, info, "press");

  await selectChoice(page, "What is the response about?", "Take a bad answer");
  const hit = page.getByRole("region", { name: "Compare sending the press secretary" });
  await hit.locator(".ui-compare__pick input").nth(1).check();
  await expect(hit.getByText(/^Not available: /).first()).toBeVisible();
  await expect(hit.getByRole("button", { name: "Send the press secretary out" })).toBeDisabled();

  await selectChoice(page, "What is the response about?", "Go in front of the press");
  const plays = page.getByRole("region", { name: "Compare the plays" });
  await plays.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(plays.getByRole("radio", { name: "Say nothing this week" })).toBeChecked();
  await plays.getByRole("radio", { name: "Hold a press conference" }).check();
  const verb = plays.getByRole("button", { name: "Call the press conference" });
  await expect(verb).toBeEnabled();
  await expect(plays.getByText(/You'll find out how it went tomorrow\./).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "press plays");
  await capture(page, info, "press-plays");

  await verb.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: "Hold a press conference" })).toBeVisible({ timeout: 30_000 });
  await receipt.getByRole("article").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expectNoHorizontalOverflow(page, "press receipt");
  await capture(page, info, "press-receipt");
  await receipt.getByRole("link", { name: "View record" }).click();
  await page.waitForURL("**/record/event/**");
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
});

test("the press office: a morning order framed against letting it speak for itself", async ({ page }, info) => {
  await importFixture(page, "day-one-orders");
  await openPressOffice(page);
  await selectChoice(page, "What is the response about?", "Explain a recent order");
  await expect(page.locator(".pr-list").getByRole("listitem")).toHaveCount(2);
  const framing = page.getByRole("region", { name: /^Compare how to explain / });
  await framing.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(framing.getByRole("radio", { name: "Let it speak for itself" })).toBeChecked();
  await framing.getByRole("radio", { name: "Necessity" }).check();
  const verb = framing.getByRole("button", { name: "Frame it as necessity" });
  await expect(verb).toBeEnabled();
  await expectNoHorizontalOverflow(page, "press framing");
  await capture(page, info, "press-framing");

  await verb.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: /^Framed as necessity: / })).toBeVisible({ timeout: 30_000 });
  await receipt.getByRole("button", { name: "Back to the framing offers" }).click();
  await expect(page.locator(".pr-list").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("The podium has already explained one act this week.").first()).toBeVisible();
});
