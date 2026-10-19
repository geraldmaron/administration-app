import { expect, test } from "@playwright/test";
import { importFixture, expectNoHorizontalOverflow } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`single Brief, calendar, retained history and Congress spectrum · ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "case-families");
    await page.goto("/brief?view=calendar");
    await expect(page.getByRole("group", { name: "Calendar dates" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const today = page.locator('.brief-calendar [aria-current="date"]');
    await today.click();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(today).toHaveAttribute("aria-pressed", "true");
    await expectNoHorizontalOverflow(page, "calendar");
    await page.screenshot({ path: info.outputPath(`calendar-${theme}.png`), fullPage: true });
    await page.goto("/brief/digest?week=1");
    await expect(page).toHaveURL(/\/brief\?view=history&week=1$/);
    await expect(page.getByRole("region", { name: "Briefing history" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "briefing history");
    await page.screenshot({ path: info.outputPath(`history-${theme}.png`), fullPage: true });
    await page.goto("/washington/congress");
    const workload = page.getByRole("navigation", { name: "Congressional workload" });
    await expect(workload.getByRole("link")).toHaveCount(3);
    await workload.getByRole("link", { name: /Nominees in review/i }).click();
    await expect(page).toHaveURL(/view=nominations/);
    await page.goBack();
    const range = page.getByRole("slider", { name: "Position in the House" });
    await range.focus();
    await range.press("Home");
    await expect(range).toHaveValue("-1");
    await range.press("End");
    await expect(range).toHaveValue("1");
    await page.getByRole("button", { name: "Farthest from you", exact: true }).first().click();
    await expect(page.getByText("Farthest from your position", { exact: true }).first()).toBeVisible();
    await expect(page.locator(".hill-depth__grid").first().locator("tbody tr").first()).toBeVisible();
    await expectNoHorizontalOverflow(page, "congress full spectrum");
    await page.screenshot({ path: info.outputPath(`congress-spectrum-${theme}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("Congress source context survives dossiers, Back and reload", async ({ page }) => {
  await importFixture(page, "case-families");
  await page.goto("/washington/congress?view=overview&state=OH&map=delegation-warmth&houseLens=slice&houseAt=-1&senateLens=opponents");
  const range = page.getByRole("slider", { name: "Position in the House" });
  await expect(range).toHaveValue("-1");
  await expect(page.getByLabel("Show a state's members")).toHaveValue("OH");
  const seat = page.locator(".hill-ring a[data-member-seat]").first();
  const seatID = (await seat.getAttribute("data-member-seat"))!;
  const href = (await seat.getAttribute("href"))!;
  await seat.locator("circle").click({ force: true });
  await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`seat=${encodeURIComponent(seatID)}`));
  await expect(page.locator(`.hill-ring a[data-member-seat="${seatID}"]`)).toBeFocused();
  await expect(range).toHaveValue("-1");
  await expect(page.getByRole("button", { name: "Farthest from you", exact: true }).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`.hill-ring__seat[data-seat="${seatID}"]`)).toHaveAttribute("data-selected", "true");
  await page.reload();
  await expect(range).toHaveValue("-1");
  await expect(page.locator(`.hill-ring__seat[data-seat="${seatID}"]`)).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(/map=delegation-warmth/);
  await page.getByRole("tab", { name: /^Members/ }).click();
  await page.getByLabel("Chamber", { exact: true }).selectOption("senate");
  await page.getByLabel("Find a member", { exact: true }).fill("Wyoming");
  await expect(page.getByText("2 matching seats", { exact: true })).toBeVisible();
  const roster = page.locator('[aria-labelledby="congress-members"]');
  const sorter = roster.locator(".ui-sort-picker select");
  if (await sorter.isVisible()) await sorter.selectOption("state:descending");
  else {
    await roster.getByRole("button", { name: /^State/ }).click();
    await roster.getByRole("button", { name: /^State/ }).click();
  }
  const row = roster.locator("tbody tr").first();
  await row.getByRole("link").click();
  await page.goBack();
  await expect(page.getByLabel("Chamber", { exact: true })).toHaveValue("senate");
  await expect(page.getByLabel("Find a member", { exact: true })).toHaveValue("Wyoming");
  await expect(page.getByText("2 matching seats", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Find a member", { exact: true })).toHaveValue("Wyoming");
  await expect(page.getByText("2 matching seats", { exact: true })).toBeVisible();
  await expect(roster.locator('th[aria-sort="descending"]')).toContainText("State");
  await expectNoHorizontalOverflow(page, "retained Congress context");
});
