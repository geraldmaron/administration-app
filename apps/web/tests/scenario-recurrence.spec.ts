import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test("a repeated authored decision opens its own frozen case after import and reload", async ({ page }) => {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL("./.fixtures/scenario-recurrence.json", import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  const href = "/brief/decision/the-morning-the-country-stopped%409";
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1, name: "The morning the country stopped" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("This decision is not waiting")).toHaveCount(0);
  await page.screenshot({ path: `tests/.results/scenario-recurrence-${page.viewportSize()!.width}.png`, animations: "disabled" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "The morning the country stopped" })).toBeVisible();
});
