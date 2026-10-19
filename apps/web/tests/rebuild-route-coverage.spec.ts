import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

// This is rendered coverage, not visual approval. Subject journeys have separate executor tests.
const WORKSPACES = [
  "/brief", "/brief?view=calendar", "/brief?view=history", "/washington",
  "/washington?view=roster", "/washington?view=delivery", "/washington/congress",
  "/washington/congress?view=members", "/washington/congress?view=bills", "/washington/congress?view=nominations",
  "/washington/courts", "/washington/courts?view=bench", "/washington/courts?view=docket", "/washington/courts?view=nominations",
  "/washington/oversight", "/washington/oversight?view=directives", "/washington/oversight?view=inspectors",
  "/nation", "/nation?view=groups", "/nation?view=states", "/nation/state/OH", "/nation/state/OH?power=1",
  "/nation/policy", "/nation/budget", "/nation/emergency", "/nation/economy", "/nation/economy?view=markets",
  "/world", "/world?reading=trade", "/world/nation/MEX", "/world/nation/MEX/act",
  "/world/security", "/world/security?view=forces", "/world/security?view=intelligence", "/world/security?view=operations",
  "/record", "/washington/office/press", "/settings", "/handbook", "/handbook/terms", "/administrations",
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`integrated workspace coverage · ${theme}`, async ({ page }, info) => {
    test.setTimeout(360_000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "case-families");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const observed: string[] = [];
    for (const route of WORKSPACES) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first(), `${route}: heading; browser errors: ${errors.join("; ")}`).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { name: /Something went wrong/ })).toHaveCount(0);
      await expectNoHorizontalOverflow(page, route);
      expect(errors, `${route}: browser errors`).toEqual([]);
      observed.push(route);
    }
    await info.attach("route-coverage.json", { body: JSON.stringify({ theme, viewport: page.viewportSize(), observed }), contentType: "application/json" });
  });
}
