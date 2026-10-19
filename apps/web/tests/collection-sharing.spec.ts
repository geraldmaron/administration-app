import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

test("an issued report discloses one finding, then another after reload", async ({ page }, info) => {
  await importFixture(page, "collection-intelligence");
  const open = async () => {
    await page.goto("/world/security");
    await page.getByRole("tab", { name: /Intelligence/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Intelligence reports" })).toBeVisible();
    await page.locator("li.sec-report", { has: page.getByRole("heading", { name: /Russia\s*: Findings obtained/ }) })
      .getByRole("button", { name: "Review sharing" }).click();
    await expect(page.getByRole("heading", { name: "Share an intelligence report" })).toBeVisible();
    await page.getByLabel("Recipient government").selectOption({ label: "Germany" });
  };
  const compare = () => page.getByRole("region", { name: "Compare against doing nothing" });
  await open();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await compare().getByRole("radio", { name: "Share this report" }).check();
  await expect(page.getByRole("button", { name: "Send this report" })).toBeDisabled();
  await page.getByRole("checkbox").nth(0).check();
  await expect(page.getByRole("button", { name: "Send this report" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "partial report sharing");
  await page.screenshot({ path: info.outputPath(`share-first-${info.project.name}.png`), fullPage: true });
  await page.getByRole("button", { name: "Send this report" }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" })).toContainText("Intelligence shared with Germany");
  await page.reload();
  await open();
  await compare().getByRole("radio", { name: "Share this report" }).check();
  await page.getByRole("checkbox").nth(0).check();
  await expect(page.getByRole("button", { name: "Send this report" })).toBeDisabled();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(1).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Send this report" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "incremental report sharing");
  await page.screenshot({ path: info.outputPath(`share-more-${info.project.name}.png`), fullPage: true });
  await page.getByRole("button", { name: "Send this report" }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" })).toContainText("Intelligence shared with Germany");
  await page.reload();
  await page.goto("/world/security");
  await page.getByRole("tab", { name: /Intelligence/ }).click();
  const report = page.locator("li.sec-report", { has: page.getByRole("heading", { name: /Russia\s*: Findings obtained/ }) });
  await report.getByRole("button", { name: "Sources, gaps and sharing", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Russia: report limitations and sharing", exact: true });
  const receipts = inspector.locator("ul.ledger__plain > li").filter({ hasText: /Shared 1 finding with Germany on .+\./ });
  await expect(receipts).toHaveCount(2);
  const disclosedFindings = receipts.locator("ul > li");
  await expect(disclosedFindings).toHaveCount(2);
  expect(new Set(await disclosedFindings.allTextContents()).size).toBe(2);
  await receipts.nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`share-receipts-${info.project.name}.png`), fullPage: true });

  // The same issued report can be disclosed separately to another ally. Its
  // receipts remain recipient-specific after a second saved-game reload.
  await page.keyboard.press("Escape");
  await expect(inspector).toBeHidden();
  await expect(report.getByRole("button", { name: "Sources, gaps and sharing", exact: true })).toBeFocused();
  await report.getByRole("button", { name: "Review sharing" }).click();
  await page.getByLabel("Recipient government").selectOption({ label: "Canada" });
  await compare().getByRole("radio", { name: "Share this report" }).check();
  await page.getByRole("checkbox").nth(0).check();
  await expect(page.getByRole("button", { name: "Send this report" })).toBeEnabled();
  await page.getByRole("button", { name: "Send this report" }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" })).toContainText("Intelligence shared with Canada");
  await page.reload();
  await page.goto("/world/security?view=intelligence");
  const retained = page.locator("li.sec-report", { has: page.getByRole("heading", { name: /Russia\s*: Findings obtained/ }) });
  await retained.getByRole("button", { name: "Sources, gaps and sharing", exact: true }).click();
  await expect(inspector.locator("ul.ledger__plain > li").filter({ hasText: /Shared 1 finding with Germany on .+\./ })).toHaveCount(2);
  await expect(inspector.locator("ul.ledger__plain > li").filter({ hasText: /Shared 1 finding with Canada on .+\./ })).toHaveCount(1);
});
