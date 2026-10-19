import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`founding retains identity with redacted portraits · ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/founding");
    await page.getByRole("button", { name: "Choose Short setup", exact: true }).click();
    await page.getByLabel("Name on the oath").fill("Morgan Vale");
    await page.getByLabel("Heritage", { exact: true }).selectOption("east-asia");
    const age = page.getByRole("slider", { name: /^Age:/ });
    await age.focus();
    await age.press("Home");
    await age.press("ArrowRight");
    const chosenAge = await age.inputValue();
    await expect(page.getByRole("region", { name: "Presidential profile" }).locator('[data-treatment="redacted"]')).toBeVisible();
    await expect(page.locator('.stage-grid img[src^="data:image/svg+xml"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New face", exact: true })).toHaveCount(0);
    await expect(page.getByRole("tablist", { name: "Parts of the face" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "redacted founding identity");
    await page.screenshot({ path: info.outputPath(`identity-${theme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Skip to the oath", exact: true }).click();
    await expect(page.locator('.oath-profile [data-treatment="redacted"]')).toBeVisible();
    await expect(page.locator(".oath-profile")).toContainText(`sworn in at ${chosenAge}`);
    await expect(page.locator('.oath-profile img[src^="data:image/svg+xml"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Take the oath", exact: true })).toBeEnabled({ timeout: 60_000 });
    await expectNoHorizontalOverflow(page, "redacted oath review");
    await page.screenshot({ path: info.outputPath(`oath-${theme}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
