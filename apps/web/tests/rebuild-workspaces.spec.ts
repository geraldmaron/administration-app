import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`conflict workspace: paired evidence, geography and decisions in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "war-joined");
    await page.goto(`/world/war/${encodeURIComponent("war:RUS:UKR:9")}`);
    await expect(page.getByRole("heading", { name: "Russia against Ukraine", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("region", { name: "State of the war", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Intensity of the fighting[.:]/ })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`war-overview-${theme}-${info.project.name}.png`) });
    const sides = page.getByRole("region", { name: "The parties", exact: true });
    await sides.scrollIntoViewIfNeeded();
    await expect(sides.getByRole("link", { name: "Ukraine", exact: true })).toBeVisible();
    await expect(sides.getByText(/Support and exhaustion are staff indices/)).toBeVisible();
    await expectNoHorizontalOverflow(page, `war ${theme}`);
    await page.screenshot({ path: info.outputPath(`war-${theme}-${info.project.name}.png`) });
    await page.getByRole("navigation", { name: "Conflict workspace sections" }).getByRole("link", { name: "Presidential decisions" }).click();
    await expect(page.getByRole("heading", { name: "Presidential decisions", exact: true })).toBeInViewport();
    const compare = page.getByRole("region", { name: "Compare entering this war and staying out" });
    await compare.scrollIntoViewIfNeeded();
    const join = compare.getByRole("radio", { name: "Join Ukraine", exact: true });
    const card = compare.locator(".ui-choice__row").filter({ has: page.getByRole("radio", { name: "Join Ukraine", exact: true }) });
    const box = await card.boundingBox();
    if (!box) throw new Error("Join option has no visible bounds");
    await card.click({ position: { x: box.width - 12, y: box.height - 12 } });
    await expect(join).toBeChecked();
    await expect(compare.getByRole("button", { name: "Send forces beside Ukraine", exact: true })).toBeEnabled();
    await expectNoHorizontalOverflow(page, `war decisions ${theme}`);
  });

  test(`foreign action workspace: plan, alternative and return context in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "engagement-week");
    await page.goto("/world/nation/PHL/act?goal=force&option=military-1");
    await expect(page.getByRole("heading", { name: "Act on Philippines", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { name: "Configure the action", exact: true })).toBeVisible();
    const plan = page.locator(".act-plan");
    await expect(plan.getByText("Draft", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, `selected plan ${theme}`);
    await plan.locator(".act-plan__header").scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`action-${theme}-${info.project.name}.png`) });
    const change = page.getByRole("button", { name: "Compare actions", exact: true });
    if ((info.project.use.viewport?.width ?? 0) < 1200) {
      await change.click();
      const sheet = page.getByRole("dialog", { name: "Actions toward Philippines" });
      await expect(sheet).toBeVisible();
      await sheet.getByRole("button", { name: "Return to plan", exact: true }).click();
      await expect(change).toBeFocused();
    } else {
      await expect(page.getByRole("complementary", { name: "Available actions" })).toBeVisible();
    }
    const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
    await compare.scrollIntoViewIfNeeded();
    await expect(compare.getByRole("radio", { name: "Do nothing", exact: true })).toBeAttached();
    await expectNoHorizontalOverflow(page, `action comparison ${theme}`);
  });
}
