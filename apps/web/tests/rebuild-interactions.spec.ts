import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture, openFromNav, selectChoice } from "./helpers";

/** Keep real IndexedDB work pending for bounded busy/restore surface observations. */
function installBusyHold({ holdReads = false }: { readonly holdReads?: boolean } = {}) {
  const state = { writes: false, reads: holdReads, held: 0 };
  Object.assign(window, { busyMotionProof: state });
  const originalGet = IDBObjectStore.prototype.get;
  // Keep the real transaction pending with read requests; nothing is simulated
  // or stored under the probe key, and releasing the flag lets it commit.
  const hold = (request: IDBRequest, kind: "writes" | "reads") => {
    request.addEventListener("success", () => {
      if (!state[kind] || !request.transaction) return;
      state.held += 1;
      const store = request.transaction.objectStore("kv");
      const tick = () => {
        if (!state[kind]) return;
        originalGet.call(store, "__busy_motion_probe__").addEventListener("success", tick);
      };
      tick();
    });
  };
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
    const request = originalPut.call(this, value, key);
    if (state.writes) hold(request, "writes");
    return request;
  };
  IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
    const request = originalGet.call(this, key);
    if (state.reads && key === "administration.campaignLibrary.v1") hold(request, "reads");
    return request;
  };
}

for (const theme of ["light", "dark"] as const) {
  test(`shared calendar, legal context and save dialogs · ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "case-families");
    await page.getByRole("link", { name: /^Open calendar:/ }).click();
    await expect(page).toHaveURL(/view=calendar/);
    await expect(page.getByRole("group", { name: "Calendar dates" })).toBeVisible();
    await page.goto("/nation/state/OH?power=1");
    const help = page.getByRole("button", { name: /^Authority: Domestic military/ });
    await help.click();
    await page.getByRole("button", { name: "More context", exact: true }).click();
    const law = page.getByRole("dialog", { name: "Domestic military use is exceptional", exact: true });
    await expect(law).toContainText("Generic agent surges");
    await expect(law.getByRole("link", { name: "Posse Comitatus restriction" })).toHaveAttribute("href", /govinfo.gov/);
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    await page.goto("/administrations");
    const card = page.locator(".save-card").first();
    const rename = card.getByRole("button", { name: "Rename", exact: true });
    await rename.click();
    const edit = page.getByRole("dialog", { name: /^Rename / });
    await expect(edit.getByRole("textbox", { name: "Name of this administration" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(rename).toBeFocused();
    await card.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.getByRole("dialog", { name: /^Discard / })).toBeVisible();
    await page.getByRole("button", { name: "Keep it", exact: true }).click();
    await expect(card.getByRole("button", { name: "Discard", exact: true })).toBeFocused();
    await expectNoHorizontalOverflow(page, "save library");
    await card.click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveURL(/\/brief$/);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`header controls and failed-save recovery remain reachable · ${theme}`, async ({ page }, info) => {
    const viewport = page.viewportSize()!;
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    // Inject only the external desktop storage port; receipts, campaign and recovery are real.
    await page.addInitScript(() => {
      const rows = new Map<string, string>();
      Object.defineProperty(window, "saveFailureProof", { value: { fail: false } });
      Object.defineProperty(window, "administrationDesktop", { value: {
        getItem: async (key: string) => rows.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          if ((window as unknown as { saveFailureProof: { fail: boolean } }).saveFailureProof.fail) throw new Error("The device refused this write.");
          rows.set(key, value);
        },
        removeItem: async (key: string) => { rows.delete(key); },
      } });
    });
    await importFixture(page, "collection-intelligence");
    const checkHeader = async () => {
      const controls = await page.locator(".ui-top-bar a, .ui-top-bar button").evaluateAll((nodes) => nodes.map((node) => ({ name: node.getAttribute("aria-label") ?? node.textContent, rect: node.getBoundingClientRect().toJSON() })).filter(({ rect }) => rect.width > 0));
      for (const control of controls) {
        expect(control.rect.left, `${control.name}: left edge`).toBeGreaterThanOrEqual(0);
        expect(control.rect.right, `${control.name}: right edge`).toBeLessThanOrEqual(viewport.width + 1);
      }
    };
    await checkHeader();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { (window as unknown as { saveFailureProof: { fail: boolean } }).saveFailureProof.fail = true; });
    await page.getByRole("button", { name: "Saved. Save again now", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry save", exact: true })).toBeVisible();
    await page.setViewportSize(viewport);
    await checkHeader();
    await page.screenshot({ path: info.outputPath(`header-failed-${theme}.png`), animations: "disabled" });
    await page.evaluate(() => { (window as unknown as { saveFailureProof: { fail: boolean } }).saveFailureProof.fail = false; });
    const recovery = viewport.width < 480 ? page.getByRole("link", { name: "Save failed: open recovery", exact: true }) : page.getByRole("link", { name: "Why?", exact: true });
    await recovery.click();
    await expect(page).toHaveURL(/\/recovery$/);
    await page.getByRole("button", { name: "Retry the save", exact: true }).click();
    await expect(page.getByRole("article", { name: "Saved", exact: true })).toBeVisible();
  });
}


for (const theme of ["light", "dark"] as const) {
  test(`shared accessibility: keyboard, enlarged text and inspector focus · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "case-families");
    await page.goto("/nation?view=states");
    const choice = page.getByRole("group", { name: "Color the map by", exact: true });
    await selectChoice(page, "Color the map by", "Population");
    const select = choice.getByRole("combobox");
    const population = choice.getByRole("radio", { name: "Population", exact: true });
    await (await select.isVisible() ? select : population).focus();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "state-population");
    // Enlarged labels overflow this comparison width before ResizeObserver
    // replaces radios. Wait for the native presentation without refocusing it.
    await expect(select).toBeVisible();
    await expect(select).toBeFocused();
    await expect(select).toHaveValue("state-population");
    // Native menu key handling is OS-owned; exercise actual option selection.
    await select.selectOption({ label: "Approval" });
    await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "approval");
    await expectNoHorizontalOverflow(page, "Nation choice at 200% text");

    await page.goto("/nation/state/OH?power=1");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const help = page.getByRole("button", { name: /^Authority: Domestic military/ });
    const more = page.getByRole("button", { name: "More context", exact: true });
    const law = page.getByRole("dialog", { name: "Domestic military use is exceptional", exact: true });
    // Exercise the default pointer path before setting focus explicitly anywhere.
    await help.click();
    await more.click();
    await expect(law).toBeVisible();
    expect(await law.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(law).toBeHidden();
    await expect(help).toBeFocused();
    // The same inspector must open with the keyboard and own initial focus.
    await page.keyboard.press("Enter");
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(law).toBeVisible();
    expect(await law.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(await law.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    const close = law.getByRole("button", { name: "Close", exact: true });
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    expect(await law.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    expect(await law.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await expectNoHorizontalOverflow(page, "authority inspector at 200% text");
    expect(await law.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`keyboard-textscale-${theme}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(law).toBeHidden();
    await expect(help).toBeFocused();
  });

  test(`shared accessibility: real save and library busy indicators respect reduced motion · ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "collection-intelligence");
    await page.evaluate(installBusyHold);
    const saved = page.getByRole("button", { name: "Saved. Save again now", exact: true });
    await expect(saved).toBeVisible();
    await page.evaluate(() => { (window as unknown as { busyMotionProof: { writes: boolean } }).busyMotionProof.writes = true; });
    try {
      await saved.click();
      const busy = page.locator('.save-status button[aria-busy="true"]');
      await expect(busy).toBeVisible();
      expect(await busy.locator(".ui-button__spinner").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      expect(await busy.locator(".ui-button__spinner").evaluate((element) => getComputedStyle(element).animationName)).toBe("ui-spin");
    } finally {
      await page.evaluate(() => { (window as unknown as { busyMotionProof: { writes: boolean } }).busyMotionProof.writes = false; });
    }
    await expect(saved).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => { (window as unknown as { busyMotionProof: { reads: boolean } }).busyMotionProof.reads = true; });
    try {
      await openFromNav(page, "/administrations");
      const loading = page.getByRole("status").filter({ hasText: "Reading what this device holds" });
      await expect(loading).toBeVisible();
      await expect(loading).toHaveAttribute("aria-busy", "true");
      expect(await loading.locator(".ui-empty__icon").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      expect(await loading.locator(".ui-empty__icon").evaluate((element) => getComputedStyle(element).animationName)).toBe("ui-spin");
    } finally {
      await page.evaluate(() => { (window as unknown as { busyMotionProof: { reads: boolean } }).busyMotionProof.reads = false; });
    }
    await expect(page.getByRole("heading", { name: "Administration in play", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "library after actual read completion");
  });
}


for (const theme of ["light", "dark"] as const) {
  test(`shared restore readiness keeps Settings at its settled measure · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "collection-intelligence");
    await expect(page.getByRole("button", { name: "Saved. Save again now", exact: true })).toBeVisible();
    await page.addInitScript(installBusyHold, { holdReads: true });
    await page.goto("/settings");
    await page.waitForFunction(() => (window as unknown as { busyMotionProof?: { held: number } }).busyMotionProof?.held);
    try {
      // Observe while the actual manifest transaction is still pending, before
      // navigation can arrive and shrink a prematurely rendered Settings panel.
      const duringRestore = {
        settingsHeadings: await page.getByRole("heading", { name: "Settings", exact: true }).count(),
        openingStatus: await page.getByRole("status").filter({ hasText: "Opening this administration…" }).count(),
        nav: await page.locator(".ui-frame").getAttribute("data-nav"),
      };
      await info.attach("held-settings-restore", { body: JSON.stringify(duringRestore), contentType: "application/json" });
      expect(duringRestore.settingsHeadings).toBe(0);
      expect(duringRestore.openingStatus).toBe(1);
    } finally {
      await page.evaluate(() => { (window as unknown as { busyMotionProof: { reads: boolean } }).busyMotionProof.reads = false; });
    }
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.locator(".ui-frame")).toHaveAttribute("data-nav", "true");
    await expect(page.getByRole("link", { name: /^Open calendar:/ })).toBeVisible();
    const initial = (await page.locator(".ui-surface").boundingBox())!.width;
    await expectNoHorizontalOverflow(page, "Settings after actual manifest restore");
    await openFromNav(page, "/administrations");
    await expect(page.getByRole("heading", { name: "Your administrations", exact: true })).toBeVisible();
    await openFromNav(page, "/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    expect(Math.abs((await page.locator(".ui-surface").boundingBox())!.width - initial)).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page, "Settings returning with restored navigation");
  });
}
