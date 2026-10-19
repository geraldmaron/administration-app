import { expect, test, type Page } from "@playwright/test";
import { expectMapDrawn, expectNoHorizontalOverflow, foundQuickly, importFixture, openFromNav, selectChoice } from "./helpers";

// The map is drawn behind the title before any campaign exists, and inside
// the pages whose question is geographic; it is recolored by the palette
// setting.

test("the title screen sits on a drawn world", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Office of the President" })).toBeVisible();
  await expectMapDrawn(page, "title");
  await expect(page.locator(".map-layer")).toHaveAttribute("data-camera", "world");
});

test("the Brief draws no background map; geography is drawn where it answers the question", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveCount(0);
  await openFromNav(page, "/nation");
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "approval");
  await expectMapDrawn(page, "nation");
});

test("a color-vision palette chosen in settings reaches the map", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await openFromNav(page, "/nation");
  const layer = page.locator(".map-layer");
  const republican = () => layer.evaluate((element) => getComputedStyle(element).getPropertyValue("--map-lens-republican").trim());
  const before = await republican();

  await openFromNav(page, "/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.getByRole("radio", { name: /^Protanopia/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-vision", "protan");
  await openFromNav(page, "/nation");
  await expectMapDrawn(page, "nation, color-vision palette");
  await expect.poll(republican).not.toBe(before);
});

test("a lens swap repaints the map with the lens it names, and the map still shows land", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await page.goto("/nation");
  await expectMapDrawn(page, "nation");
  const surface = page.locator(".map-layer__canvas");
  await selectChoice(page, "Color the map by", "Electoral call");
  await expect(surface).toHaveAttribute("data-painted-lens", "call");
  await selectChoice(page, "Color the map by", "Approval");
  // The GL map recolors by feature state in one frame, so there is no crossfade to leave behind; what is checked is that the map, not just the directive, holds the new lens.
  await expect(surface).toHaveAttribute("data-painted-lens", "approval");
  await expectMapDrawn(page, "nation, after the swap");
});

test("an office screen survives a full phone sheet becoming a desktop panel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await importFixture(page, "washington-chairs");
  await page.goto("/washington/office/OFF-STATE-SEC");
  await expect(page.getByRole("heading", { name: "Department of State", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "office, phone");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("heading", { name: "Department of State", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "office, desktop");
  expect(errors).toEqual([]);
});


const EMERGENCY_MAP = "Where conditions are running";

/** Observe the actual page map, not the requested camera key or a first-paint mark from another surface. */
async function settledEmergencyCamera(page: Page, state?: string) {
  const read = () => page.evaluate(async ({ title, selectedState }) => {
    const runtime = window.__glRuntime;
    if (!runtime) return null;
    const { map } = runtime.world;
    const container = map.getContainer();
    if (!container.isConnected || container.closest(".map-view")?.getAttribute("aria-label") !== title) return null;
    const ready = () => {
      if (!map.loaded() || map.isMoving() || runtime.view.moving || map.getProjection()?.type !== "mercator") return false;
      if (container.dataset["paintedLens"] !== "conditions" || runtime.view.target?.label !== "United States") return false;
      const canvas = map.getCanvas();
      if (canvas.clientWidth !== container.clientWidth || canvas.clientHeight !== container.clientHeight) return false;
      if (selectedState) {
        const region = runtime.table.byKey.get(`states:${selectedState}`);
        if (!region || runtime.view.selection.size !== 1 || !runtime.view.selection.has(region.index)) return false;
        if (map.getFeatureState({ source: "states", id: region.index })["selected"] !== true) return false;
      }
      const target = runtime.view.target;
      if (!target) return false;
      const [west, south, east, north] = target.bounds;
      const center = map.getCenter();
      if (center.lng < west || center.lng > east || center.lat < south || center.lat > north) return false;
      // A state-only zoom or a stale-sized map cannot stand in for the national context.
      return [[west, north], [east, south]].every(([lng, lat]) => {
        const point = map.project([lng!, lat!]);
        return point.x >= -1 && point.x <= container.clientWidth + 1 && point.y >= -1 && point.y <= container.clientHeight + 1;
      });
    };
    const reading = () => ({ center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), width: container.clientWidth, height: container.clientHeight });
    if (!ready()) return null;
    const before = reading();
    // Let queued React/map work run; require two rendered frames with the same settled transform, never a fixed sleep.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return ready() && JSON.stringify(before) === JSON.stringify(reading()) ? before : null;
  }, { title: EMERGENCY_MAP, selectedState: state });
  const sample: { reading: Awaited<ReturnType<typeof read>> } = { reading: null };
  // waitForFunction tests the Promise itself as truthy; poll awaited frame readings instead.
  await expect.poll(async () => {
    sample.reading = await read();
    return sample.reading;
  }, { timeout: 30_000 }).not.toBeNull();
  return sample.reading!;
}

for (const theme of ["light", "dark"] as const) {
  test(`Emergency camera holds national context across evidence, action and return in ${theme}`, async ({ page }, info) => {
    test.skip(process.env["E2E_DEV_RUNTIME"] !== "1", "This bounded camera proof requires E2E_DEV_RUNTIME=1 and an attached Vite dev server; the production preview has no runtime observer.");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
    await importFixture(page, "wildfire-colorado");
    await page.goto("/nation/emergency");
    const map = page.getByRole("region", { name: EMERGENCY_MAP, exact: true });
    await expect(map).toBeVisible();
    await expectMapDrawn(page, "Emergency, initial national context");
    const initial = await settledEmergencyCamera(page);
    const fire = page.locator(".incident__button").filter({ hasText: "Wildfire" }).filter({ hasText: "Colorado" });
    if (await fire.count() === 0) await page.getByRole("button", { name: /^Show all.*incidents/ }).click();
    await expect(fire).toHaveCount(1);
    await fire.click();
    await expect(fire).toHaveAttribute("aria-pressed", "true");
    const incident = new URL(page.url()).searchParams.get("incident");
    expect(incident).toMatch(/^condition:wildfire:USA:\d+:CO$/);
    const selected = await settledEmergencyCamera(page, "CO");
    expect(selected).toEqual(initial);
    await map.locator(".map-layer").scrollIntoViewIfNeeded();
    await map.locator(".map-layer").screenshot({ path: info.outputPath(`emergency-settled-selected-${theme}.png`) });
    await map.getByRole("button", { name: "Show the map data as a list", exact: true }).click();
    await expect(map.getByRole("table")).toContainText("Colorado");
    const listed = await settledEmergencyCamera(page, "CO");
    expect(listed).toEqual(selected);
    await map.getByRole("button", { name: "Colorado", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Colorado", exact: true })).toBeVisible();
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get("incident")).toBe(incident);
    const returned = await settledEmergencyCamera(page, "CO");
    expect(returned).toEqual(selected);
    const declare = page.getByRole("button", { name: "Declare an emergency", exact: true });
    await declare.click();
    const action = page.getByRole("dialog", { name: "Presidential emergency action", exact: true });
    await expect(action).toBeVisible();
    const duringAction = await settledEmergencyCamera(page, "CO");
    expect(duringAction).toEqual(selected);
    await action.getByRole("button", { name: "Close", exact: true }).click();
    await expect(declare).toBeFocused();
    const closed = await settledEmergencyCamera(page, "CO");
    expect(closed).toEqual(selected);
    await page.reload();
    await expect.poll(() => new URL(page.url()).searchParams.get("incident")).toBe(incident);
    const reloaded = await settledEmergencyCamera(page, "CO");
    expect(reloaded).toEqual(selected);
    await expectMapDrawn(page, "Emergency, restored national context");
    await expectNoHorizontalOverflow(page, "settled Emergency context");
    await map.locator(".map-layer").scrollIntoViewIfNeeded();
    await map.locator(".map-layer").screenshot({ path: info.outputPath(`emergency-settled-reloaded-${theme}.png`) });
    await info.attach("settled-emergency-camera.json", { body: JSON.stringify({ initial, selected, listed, returned, duringAction, closed, reloaded }, null, 2), contentType: "application/json" });
    expect(errors).toEqual([]);
  });
}
