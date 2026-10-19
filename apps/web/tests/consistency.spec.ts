import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture, selectChoice } from "./helpers";

const SURFACES = [
  ["/nation", "Nation"],
  ["/nation/economy", "Economy"],
  ["/nation/budget", "Budget"],
  ["/nation/policy", "Policy"],
  ["/nation/emergency", "Emergency"],
  ["/washington", "Executive"],
  ["/washington/office/OFF-STATE-SEC", "Department of State"],
  ["/washington/congress", "Congress"],
  ["/washington/courts", "Courts"],
  ["/washington/oversight", "Oversight"],
  ["/world", "World"],
  ["/world/nation/CAN", "Canada"],
  ["/world/security", "Security"],
  ["/record", "Record"],
  ["/brief/digest", "President’s Brief"],
  ["/settings", "Settings"],
] as const;

test("screens retain shared reading and data measures and only expand when asked", async ({ page }) => {
  test.setTimeout(240_000);
  await importFixture(page, "wildfire-colorado");
  const measures = new Map<string, number>();
  for (const [route, title] of SURFACES) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible({ timeout: 60_000 });
    const panel = page.locator(".ui-surface");
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const measure = await panel.getAttribute("data-measure") ?? "standard";
    const standard = measures.get(measure);
    if (standard === undefined) measures.set(measure, box!.width);
    else expect(Math.abs(box!.width - standard), `${route}: ${measure} measure`).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page, route);
    if (page.viewportSize()!.width < 768) await expect(panel).toHaveAttribute("data-detent", "full");
    if (process.env.E2E_SCREENS && [390, 1440].includes(page.viewportSize()!.width)) {
      const name = route.slice(1).replaceAll("/", "-");
      await page.screenshot({ path: fileURLToPath(new URL(`../../../docs/audits/2026-10-10-map-first/experience-screens/consistent-${name}-${page.viewportSize()!.width}.png`, import.meta.url)) });
    }
  }
  if (page.viewportSize()!.width < 768) return;
  // A workspace takes the room it needs and carries no whole-page expand; the
  // docked panel beside the title's map is the screen that still expands.
  await expect(page.getByRole("button", { name: "Expand panel", exact: true })).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Office of the President" })).toBeVisible();
  const panel = page.locator(".ui-surface");
  const docked = (await panel.boundingBox())!.width;
  await page.getByRole("button", { name: "Expand panel", exact: true }).click();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(docked);
  await expectNoHorizontalOverflow(page, "expanded title panel");
  await page.getByRole("button", { name: "Restore standard panel", exact: true }).click();
  await expect.poll(async () => (await panel.boundingBox())!.width).toBe(docked);
});

test("map choices never wrap, retain selection on resize and work with enlarged text", async ({ page }) => {
  await importFixture(page, "wildfire-colorado");
  await page.goto("/nation?view=states");
  const choice = page.getByRole("group", { name: "Color the map by", exact: true });
  await expect(choice).toBeVisible();
  const select = choice.getByRole("combobox");
  if (await select.isVisible()) {
    await expect(select.locator("option")).toHaveText(["Approval", "Electoral call", "Partisan lean", "Population"]);
    await expect(choice.getByRole("radio")).toHaveCount(0);
  } else {
    const ys = await choice.locator(".ui-choice__option").evaluateAll((options) => options.map((option) => option.getBoundingClientRect().y));
    expect(new Set(ys).size).toBe(1);
    await expect(choice.getByRole("radio")).toHaveCount(4);
  }
  await selectChoice(page, "Color the map by", "Population");
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "state-population");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("state-population");
  await expectNoHorizontalOverflow(page, "Nation at 200% text");
  // Native menu keystrokes are OS-owned; exercise them in the headed live
  // review. Here verify its change event and the radio keyboard path below.
  await select.selectOption({ label: "Approval" });
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "approval");
  await page.reload();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "approval");
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(select).toBeVisible();
  await select.selectOption({ label: "Partisan lean" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(choice.getByRole("radio", { name: "Partisan lean", exact: true })).toBeChecked();
  await expect(select).toHaveCount(0);
  await choice.getByRole("radio", { name: "Partisan lean", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "state-population");
  await expectNoHorizontalOverflow(page, "Nation after resizing");
});
