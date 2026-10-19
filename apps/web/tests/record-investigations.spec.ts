import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`Record investigates real subjects and preserves signed legacy rates · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "record-investigations");
    await page.goto("/record?view=arcs");
    const arc = page.locator(".rec-investigate").first();
    await arc.click();
    let inspector = page.getByRole("dialog");
    await expect(inspector.getByRole("heading", { name: "Recorded chapters" })).toBeVisible();
    await expect(inspector.locator('a[href^="/brief/decision/"]')).toHaveCount(1);
    await expect(inspector.locator('a[href^="/world/nation/"]')).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`arc-${theme}.png`), fullPage: true, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(arc).toBeFocused();
    await page.goto("/record?view=assessments");
    const report = page.getByRole("button", { name: "Reported industrial fire", exact: true });
    await report.click();
    inspector = page.getByRole("dialog");
    await expect(inspector.getByRole("heading", { name: "Filed report history" })).toBeVisible();
    await expect(inspector.getByRole("heading", { name: "Evidence basis" })).toBeVisible();
    await expect(inspector.locator('a[href^="/record/event/"]')).toHaveCount(1);
    await expectNoHorizontalOverflow(page, "agency assessment inspector");
    await page.screenshot({ path: info.outputPath(`assessment-${theme}.png`), fullPage: true, animations: "disabled" });
    await inspector.getByRole("link", { name: /^Originating act:/ }).click();
    const entry = page.locator(".rec-detail");
    await expect(entry).toBeVisible();
    await expect(entry.getByLabel("Recorded causal connections")).toBeVisible();
    await entry.getByLabel("Recorded causal connections").screenshot({ path: info.outputPath(`record-connections-${theme}.png`), animations: "disabled" });
    const filedAssessment = entry.getByRole("button", { name: "Reported industrial fire", exact: true });
    await filedAssessment.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Filed report history" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(filedAssessment).toBeFocused();
    await importFixture(page, "legacy-negative-rates");
    await page.goto("/legacy");
    const inflation = page.locator(".shift__row").filter({ has: page.getByText("Inflation", { exact: true }) });
    await expect(inflation).toContainText("-3%");
    await expect(inflation.locator(".ui-bar")).toHaveAttribute("data-tone", "neutral");
    await expect(inflation.locator(".ui-bar")).toHaveAttribute("aria-label", /-4% to 3% scale/);
    const series = page.locator(".ui-series").filter({ has: page.getByText("Inflation, week by week", { exact: true }) });
    await expect(series).toContainText("negative inflation represents falling prices");
    await expect(series).toContainText("-4%");
    await expectNoHorizontalOverflow(page, "signed legacy history");
    await page.screenshot({ path: info.outputPath(`legacy-negative-${theme}.png`), fullPage: true, animations: "disabled" });
  });
}
