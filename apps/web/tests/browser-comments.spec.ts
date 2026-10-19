import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`compact budget, organized offices and an honest empty court in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "opening-d");
    await page.goto("/nation/budget");
    await page.locator(".alloc__range").first().focus();
    await page.locator(".alloc__range").first().press("End");
    const chambers = page.locator(".budget-vote__chamber");
    await expect(chambers).toHaveCount(2);
    await expect(chambers.nth(0)).toContainText(/House.*218.*votes to pass/);
    await expect(chambers.nth(1)).toContainText(/Senate.*51.*votes to pass.*60 to end debate/);
    for (const chamber of await chambers.all()) {
      const box = await chamber.boundingBox();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeLessThan(110);
    }
    await expectNoHorizontalOverflow(page, "compact budget thresholds");

    await page.goto("/washington");
    const search = page.getByRole("searchbox", { name: "Find an office or person" });
    await search.fill("Federal ");
    await expect(search).toHaveValue("Federal ");
    await search.pressSequentially("Reserve");
    await expect(page.locator(".office-row")).toHaveCount(1);
    await page.getByLabel("Group offices by", { exact: true }).selectOption("staffing");
    await page.getByLabel("Order offices by", { exact: true }).selectOption("delivery");
    await page.reload();
    await expect(search).toHaveValue("Federal Reserve");
    await expect(page.getByLabel("Group offices by", { exact: true })).toHaveValue("staffing");
    await expect(page.getByLabel("Order offices by", { exact: true })).toHaveValue("delivery");
    await expect(page.locator(".office-inspector:visible .ui-steps")).toHaveCount(4);
    const office = page.locator(".office-inspector:visible footer a").first();
    await office.click();
    await page.waitForURL("**/washington/office/**");
    await page.goBack();
    await expect(office).toBeFocused();
    await expect(search).toHaveValue("Federal Reserve");
    await page.getByLabel("Staffing", { exact: true }).selectOption("vacant");
    await expect(page.locator(".office-row")).toHaveCount(0);
    await expect(page.getByText("No offices match these controls.", { exact: false })).toBeVisible();
    await expectNoHorizontalOverflow(page, "office controls");

    await page.goto("/washington/courts");
    await expect(page.locator(".court-flow__empty")).toContainText("The docket is clear");
    await expect(page.locator(".court-flow__lane")).toHaveCount(0);
    await expect(page.locator(".court-bench__member")).toHaveCount(9);
    const justice = page.locator(".court-bench__member a").first();
    await justice.focus();
    await expect(page.locator(".court-bench__member[data-active]")).toHaveCount(1);
    await expect(page.locator(".court-bench__seat[data-active]")).toHaveCount(1);
    await justice.click();
    await page.waitForURL("**/washington/person/**");
    await page.goBack();
    await expect(justice).toBeFocused();
    await expectNoHorizontalOverflow(page, "justice identity and empty docket");
  });
}
