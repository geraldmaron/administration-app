import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture, selectChoice } from "./helpers";

test("a live staff forecast explains its range and keeps today's judgments separate", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await importFixture(page, "engagement-week");
  await page.goto("/world/nation/MEX/act");
  await selectChoice(page, "Objective", /^Covert ·/);
  await page.getByRole("group", { name: "Covert action", exact: true })
    .getByRole("radio", { name: /^Surveillance/ }).check();
  const control = page.getByRole("group", { name: "Project forward", exact: true });
  await expect(control).toContainText("Staff confidence reflects the adviser and available information. It does not assign odds to the shaded range.");
  const horizon = control.getByRole("button", { name: "4 weeks", exact: true });
  await horizon.focus();
  await page.keyboard.press("Enter");
  await expect(horizon).toHaveAttribute("aria-pressed", "true");
  await expect(control).toContainText(/5 runs ·/, { timeout: 120_000 });
  const explanation = page.getByText(/A staff forecast, not a promise\./);
  await expect(explanation).toContainText("The line is the median, the band is the range across runs,");
  await expect(explanation).toContainText("Outcomes can fall outside this range.");
  await explanation.scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page, "completed staff forecast");
  await page.screenshot({ path: info.outputPath(`forecast-range-${info.project.name}.png`) });
  const today = page.getByRole("button", { name: "What shapes public opinion today", exact: true });
  await today.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("These are current judgments and their recorded drivers.", { exact: false })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "What shapes public opinion today", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "current opinion causes");
  await page.screenshot({ path: info.outputPath(`forecast-current-${info.project.name}.png`) });
  await page.keyboard.press("Escape");
  await expect(today).toBeFocused();
  await horizon.click();
  await expect(horizon).toHaveAttribute("aria-pressed", "false");
  await expect(explanation).toHaveCount(0);
  expect(errors).toEqual([]);
});
