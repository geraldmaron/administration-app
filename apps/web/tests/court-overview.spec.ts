import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

async function captureDetail(page: Page, info: TestInfo, name: string, detail: Locator) {
  const viewport = page.viewportSize();
  if (viewport) await page.setViewportSize({ width: viewport.width, height: 1400 });
  await detail.scrollIntoViewIfNeeded();
  await detail.screenshot({ path: info.outputPath(`${name}-${info.project.name}.png`), animations: "disabled" });
  if (viewport) await page.setViewportSize(viewport);
}

test("Courts draws the system: the circuit map, a live filing on its path, dated, and agreement from a decided case", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "court-overview-recorded");
  await page.goto("/washington/courts?view=docket");
  await expect(page.locator(".court-stages strong")).toHaveCount(6);
  const counts = await page.locator(".court-stages strong").allTextContents();
  expect(counts.map(Number).reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(2);
  expect(Number(counts[5])).toBeGreaterThanOrEqual(1);
  const liveLink = page.locator(".judicial-ledger__case").first();
  await expect(liveLink).toHaveAttribute("href", /^\/washington\/courts\/case\//);
  const caseTitle = await liveLink.locator("strong").first().textContent();
  await page.getByRole("button", { name: "Explore circuits" }).click();
  const dialog = page.getByRole("dialog", { name: "Federal courts · jurisdiction" });
  await expect(dialog.getByRole("region", { name: "Where cases are filed" })).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Circuits", exact: true }).getByRole("button")).toHaveCount(13);
  const path = dialog.getByRole("list", { name: "Case path", exact: true });
  await expect(path.locator("[data-empty]")).toHaveCount(0);
  await path.getByRole("button", { name: /Show case 1 on the calendar/ }).click();
  const lifted = dialog.getByRole("list", { name: "Circuits", exact: true }).getByRole("button", { pressed: true });
  await expect(lifted).toHaveCount(1);
  await captureDetail(page, info, "court-path", path);
  await lifted.click();
  await expect(lifted).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Explore circuits" })).toBeFocused();
  await expectNoHorizontalOverflow(page, "court system");
  await liveLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/washington\/courts\/case\//);
  await expect(page.getByRole("heading", { level: 1, name: caseTitle?.trim() ?? "" })).toBeVisible();
  await page.goBack();
  await page.getByRole("tab", { name: /Bench/ }).click();
  await expect(page.locator(".court-bench__seat")).toHaveCount(9);
  await expect(page.getByRole("list", { name: "Justices, left to right" })).toContainText(/Age \d+ · \d+ years on Court/);
  await expect(page.locator(".court-matrix td").filter({ hasText: /^\d+\/\d+$/ }).first()).toBeVisible();
  await captureDetail(page, info, "court-bench", page.locator(".court-bench"));
  await page.screenshot({ path: info.outputPath(`court-system-${info.project.name}.png`), fullPage: true, animations: "disabled" });
  expect(errors).toEqual([]);
});

test("a court record with no shared votes says agreement is not yet recorded", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "circuit-vacancy");
  await page.goto("/washington/courts");
  const agreement = page.getByRole("region", { name: "How the justices vote together" });
  await expect(agreement).toContainText("No two sitting justices have voted in the same recorded case yet");
  await expect(agreement.locator(".court-matrix")).toHaveCount(0);
  await expect(agreement).not.toContainText("0% agreement");
});

test("a case without a recorded filing forum stays linked on its path", async ({ page }) => {
  await importFixture(page, "courts-and-oversight");
  await page.goto("/washington/courts?view=docket");
  const liveLink = page.locator(".judicial-ledger__case").first();
  await expect(liveLink).toBeVisible();
  await expect(liveLink).toHaveAttribute("href", /^\/washington\/courts\/case\//);
  await liveLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/washington\/courts\/case\//);
  await expect(page.getByRole("heading", { level: 2, name: "The case" })).toBeVisible();
});

test("case links remain usable when circuit geography cannot load", async ({ page }) => {
  await page.route(/\/states-lo-[^/]+\.json/, (route) => route.abort());
  await importFixture(page, "court-overview-recorded");
  await page.goto("/washington/courts?view=docket");
  const liveLink = page.locator(".judicial-ledger__case").first();
  await expect(liveLink).toBeVisible();
  await liveLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/washington\/courts\/case\//);
  await expect(page.getByRole("heading", { level: 2, name: "The case", exact: true })).toBeVisible();
});
