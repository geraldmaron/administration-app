import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

const BILL = "The Housing Supply Partnership Act";

async function openFixtureBill(page: Page, fixture: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL(`./.fixtures/${fixture}.json`, import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await page.goto("/washington/congress/bill/bill%3Aact-housing-supply%3Afixture");
  await expect(page.getByRole("heading", { level: 1, name: BILL })).toBeVisible({ timeout: 60_000 });
}

test("housing conference shows the two passed texts, records a recommendation, and reloads it", async ({ page }) => {
  await openFixtureBill(page, "housing-conference");
  const text = page.getByRole("region", { name: "Bill provisions", exact: true });
  await expect(text).toContainText("House: Original grants. Senate: Targeted grants.");
  await expect(text).toContainText("Different texts passed; no bill can reach the President until both chambers pass the same text.");
  await expect(text).toContainText("House:");
  await expect(text).toContainText("Senate:");
  const compare = page.getByRole("region", { name: "Recommend a common text" });
  await compare.getByRole("radio", { name: "Targeted grants" }).check();
  await expect(compare).toContainText("Annual funding");
  await expect(compare).toContainText("smaller grants for approved affordable housing projects");
  await expect(compare).toContainText("Congress must approve the text");
  await expectNoHorizontalOverflow(page, "housing conference");
  await page.screenshot({ path: `tests/.results/housing-conference-${page.viewportSize()!.width}.png`, animations: "disabled" });
  await compare.getByRole("button", { name: "Recommend targeted grants" }).click();
  await confirmReview(page);
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
  await expect(text).toContainText("Recommended: Targeted grants.");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: BILL })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bill provisions", exact: true })).toContainText("Recommended: Targeted grants.");
});

test("both chambers' final targeted text stays enrolled on the President's desk", async ({ page }) => {
  await openFixtureBill(page, "housing-enrolled");
  const text = page.getByRole("region", { name: "Bill provisions", exact: true });
  await expect(text).toContainText("Enrolled: Targeted grants.");
  await expect(page.getByText("Offers four years of smaller grants for approved affordable housing projects", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Presidential decision" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "enrolled housing bill");
  await page.screenshot({ path: `tests/.results/housing-enrolled-${page.viewportSize()!.width}.png`, animations: "disabled" });
  await page.reload();
  await expect(page.getByRole("region", { name: "Bill provisions", exact: true })).toContainText("Enrolled: Targeted grants.");
});
