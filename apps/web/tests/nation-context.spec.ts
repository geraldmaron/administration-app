import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`state investigation and exact community context survive navigation in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/administrations");
    await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL("./.fixtures/wildfire-colorado.json", import.meta.url)));
    await page.waitForURL("**/brief", { timeout: 60_000 });
    await page.goto("/nation?view=states&group=place&state=CO&query=Colorado&sort=reading&direction=descending&groupSort=rural&groupDirection=ascending");
    const search = page.getByRole("searchbox", { name: "Find a state or governor" });
    const table = page.locator(".states-table");
    await expect(search).toHaveValue("Colorado");
    await expect(table.locator('th[aria-sort="descending"]')).toContainText("Approval");
    await expect(page.getByRole("button", { name: "Clear Colorado from the map" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(search).toHaveValue("Colorado");
    const stateLink = table.getByRole("table").getByRole("link", { name: "Colorado", exact: true });
    await stateLink.click();
    await page.waitForURL("**/nation/state/CO**");
    await page.goBack();
    await expect(search).toHaveValue("Colorado");
    await expect(stateLink).toBeFocused();
    await expect(table.locator('th[aria-sort="descending"]')).toContainText("Approval");
    const cell = page.locator("#state-group-CO-rural");
    const support = (await cell.innerText()).trim();
    await cell.click();
    await expect(page).toHaveURL(/view=people.*cohort=rural/);
    const selected = page.getByRole("region", { name: "Rural in Colorado", exact: true });
    await expect(selected).toBeVisible();
    await expect(selected.locator(".state-people__rating-support .state-people__rating-figure")).toContainText(support);
    await expect(selected).toBeFocused();
    await expectNoHorizontalOverflow(page, "exact state community");
    await page.screenshot({ path: `${info.outputDir}/state-community-${theme}.png`, fullPage: true });
    await page.goBack();
    await expect(cell).toBeFocused();
    await cell.click();
    await expect(selected).toBeVisible();
    await page.reload();
    await expect(selected).toBeVisible();
    await expect(selected).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/group=place/);
    await expect(page).toHaveURL(/groupSort=rural/);
    await expect(search).toHaveValue("Colorado");
    await expectNoHorizontalOverflow(page, "restored state investigation");
  });
}
