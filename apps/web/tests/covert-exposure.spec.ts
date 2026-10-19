import { expect, test } from "@playwright/test";
import { importFixture, selectChoice } from "./helpers";

test("covert action compares mission success with exposure after success", async ({ page }, info) => {
  await importFixture(page, "engagement-week");
  await page.goto("/world/nation/MEX/act");
  await expect(page.getByRole("heading", { level: 1, name: "Act on Mexico" })).toBeVisible();
  await selectChoice(page, "Objective", /^Covert ·/);
  await page.getByRole("group", { name: "Covert action", exact: true })
    .getByRole("radio", { name: /^Surveillance/ }).check();
  const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
  const success = compare.locator(".ui-choice__row", { hasText: "Surveillance" }).locator(".ui-choice__chance");
  await expect(success).toBeVisible();
  await expect(success.locator(".ui-visually-hidden")).toHaveText("Chance it works:");
  await expect(success).toContainText("Likely");
  await expect(compare.getByRole("radio", { name: "Surveillance" })).toBeChecked();
  await expect(compare.getByRole("term").filter({ hasText: "Exposure after success" })).toBeVisible();
  const exposure = compare.getByText(/chance it becomes public even if the mission succeeds/);
  await expect(exposure).toBeVisible();
  await success.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`covert-success-${info.project.name}.png`) });
  await exposure.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`covert-exposure-${info.project.name}.png`) });
});
