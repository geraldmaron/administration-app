import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

test("diplomacy explains betrayal and repair through keyboard-accessible help", async ({ page }, info) => {
  await importFixture(page, "collection-intelligence");
  await page.goto("/world/nation/CAN?view=diplomacy");
  const trigger = page.getByRole("button", { name: "What moves a country's trust in you", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "After striking a trusted partner", exact: true })).toBeVisible();
  await expect(page.getByText("An accepted diplomatic visit can begin repairing the relationship.", { exact: false })).toBeVisible();
  await page.getByRole("heading", { name: "After striking a trusted partner", exact: true }).scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page, "diplomacy trust explanation");
  await page.screenshot({ path: info.outputPath(`trust-help-${info.project.name}.png`), fullPage: true });
  const help = page.getByRole("dialog", { name: "What moves a country's trust in you", exact: true });
  await expect(help).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();
  await expect(trigger).toBeFocused();
});
