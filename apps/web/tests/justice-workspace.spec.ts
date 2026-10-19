import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

async function capturePanel(page: Page, info: TestInfo, name: string, selector: string) {
  const viewport = page.viewportSize();
  if (viewport) await page.setViewportSize({ width: viewport.width, height: 1600 });
  const panel = page.locator(selector).first();
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: info.outputPath(name), animations: "disabled" });
  if (viewport) await page.setViewportSize(viewport);
}

for (const theme of ["light", "dark"] as const) {
  test(`judicial workspace links whole subjects, preserves view and exposes contextual jurisdiction · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "court-overview-recorded");
    await page.goto("/washington/courts?view=docket");
    await expect(page.getByRole("heading", { name: "Cases before the courts" })).toBeVisible();
    const card = page.locator(".judicial-ledger__case").first();
    await expect(card).toHaveAttribute("href", /^\/washington\/courts\/case\//);
    const title = await card.locator("strong").first().textContent();
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: title?.trim() ?? "" })).toBeVisible();
    await expect(page.locator(".case-workspace")).toBeVisible();
    await expectNoHorizontalOverflow(page, "court case");
    await page.goBack();
    await expect(page).toHaveURL(/view=docket/);
    const circuits = page.getByRole("button", { name: "Explore circuits" });
    await circuits.click();
    const dialog = page.getByRole("dialog", { name: "Federal courts · jurisdiction" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("list", { name: "Circuits", exact: true }).getByRole("button")).toHaveCount(13);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(circuits).toBeFocused();
    await expectNoHorizontalOverflow(page, "court docket");
    await page.screenshot({ path: info.outputPath(`judicial-${theme}.png`), fullPage: true });
  });

  test(`oversight uses record-backed subjects and full-card inquiry evidence · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "courts-and-oversight");
    await page.goto("/washington/oversight?view=inquiries");
    const card = page.locator(".inquiry-card").first();
    await expect(card).toBeVisible();
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Latest recorded evidence" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toBeFocused();
    await page.goto("/washington/oversight?view=directives");
    await expect(page.getByRole("combobox", { name: "Directive subject", exact: true })).toBeAttached();
    await expect(page.locator(".oversight input[type=text], .oversight textarea")).toHaveCount(0);
    await expect(page.locator(".oversight details")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "oversight directive");
    await page.screenshot({ path: info.outputPath(`oversight-${theme}.png`), fullPage: true });
    await page.goto("/washington/oversight?view=inspectors");
    await expect(page.getByRole("combobox", { name: "Stated reason", exact: true })).toBeAttached();
    await expect(page.locator(".oversight details")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "inspectors");
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`court and oversight view coverage · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "courts-and-oversight");
    for (const [area, views] of [["courts", ["bench", "docket", "nominations"]], ["oversight", ["inquiries", "directives", "inspectors", "appointments"]]] as const) {
      for (const view of views) {
        await page.goto(`/washington/${area}?view=${view}`);
        await expect(page.getByRole("heading", { level: 1, name: area === "courts" ? "Courts" : "Oversight", exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page, `${area} ${view}`);
        await page.screenshot({ path: info.outputPath(`${area}-${view}-${theme}.png`), fullPage: true });
        const panel = area === "courts" ? view === "bench" ? ".court-bench" : view === "docket" ? ".judicial-ledger" : ".appt-seat" : view === "inquiries" ? ".inquiry-workspace" : view === "directives" ? ".composer" : view === "inspectors" ? ".inspectors-board" : ".appt-seat";
        if (await page.locator(panel).count()) await capturePanel(page, info, `${area}-${view}-panel-${theme}.png`, panel);
        if (area === "oversight" && view === "inquiries") await capturePanel(page, info, `oversight-command-${theme}.png`, ".oversight-command");
      }
    }
  });
}
