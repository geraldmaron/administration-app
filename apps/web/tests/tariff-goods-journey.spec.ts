import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`tariff goods remain selected from legacy link through receipt in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/administrations");
    await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL("./.fixtures/engagement-week.json", import.meta.url)));
    await page.waitForURL("**/brief", { timeout: 60_000 });
    await page.goto("/world/nation/CHN/act?goal=trade&option=economic-2");
    const goods = page.getByRole("combobox", { name: "Traded category" });
    await expect(goods).toBeVisible({ timeout: 60_000 });
    const options = goods.locator("option");
    expect(await options.count()).toBeGreaterThan(1);
    const selected = await options.last().evaluate((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent! }));
    await goods.selectOption(selected.value);
    await page.getByLabel(/^Additional rate:/).fill("12");
    await expect(page).toHaveURL(new RegExp(`sector=${encodeURIComponent(selected.value)}`));
    await page.reload();
    await expect(goods).toHaveValue(selected.value);
    await expect(page.getByLabel(/^Additional rate:/)).toHaveValue("12");
    await expect(page.getByText("US imports / year", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Compare all \d+ categories$/ }).click();
    const comparison = page.getByRole("dialog", { name: "Compare traded categories" });
    await expect(comparison.getByRole("radio", { name: selected.label, exact: true })).toBeChecked();
    await comparison.getByRole("button", { name: "Return to tariff" }).click();
    await expect(page.getByRole("button", { name: /^Compare all \d+ categories$/ })).toBeFocused();
    await expectNoHorizontalOverflow(page, "selected tariff category");
    await page.screenshot({ path: info.outputPath(`tariff-goods-${theme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Impose the tariff", exact: true }).click();
    await confirmReview(page);
    const receipt = page.getByRole("article");
    await expect(receipt.getByRole("heading", { name: /imposed$/ })).toBeVisible({ timeout: 30_000 });
    await expect(receipt.getByText(selected.label, { exact: true })).toBeVisible();
    await expect(receipt.getByText("12%", { exact: true }).first()).toBeVisible();
  });
}
