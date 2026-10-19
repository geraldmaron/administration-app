import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { expectNoHorizontalOverflow, foundQuickly, waitForStoredPreferences } from "./helpers";

test("Start waits for the save library and capacity before enabling", async ({ page }) => {
  // Hold the real storage response at its boundary, without changing its data.
  await page.addInitScript(() => {
    let holding = true;
    const pending: Array<() => void> = [];
    const controls = window as typeof window & { releaseSaveLibrary: () => void };
    controls.releaseSaveLibrary = () => {
      holding = false;
      for (const finish of pending.splice(0)) finish();
    };
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (this: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
      const request = get.call(this, query);
      if (query === "administration.campaignLibrary.v1") {
        Object.defineProperty(request, "onsuccess", {
          set(handler: IDBRequest["onsuccess"]) {
            if (!handler) return;
            request.addEventListener("success", (event) => {
              const finish = () => handler.call(request, event);
              if (holding) pending.push(finish);
              else finish();
            }, { once: true });
          },
        });
      }
      return request;
    };
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start a new administration", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Start a new administration", exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as typeof window & { releaseSaveLibrary: () => void }).releaseSaveLibrary());
  await expect(page.getByRole("link", { name: "Your administrations (0 of 5)", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Start a new administration", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The transition", exact: true })).toBeVisible();
});

test("a failed screen download offers recovery and reload restores the archive", async ({ page }) => {
  await page.route("**/assets/administrations-*.js", (route) => route.abort("failed"));
  await page.goto("/administrations");
  await expect(page.getByRole("heading", { name: "The screen could not open", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open saved administrations", exact: true })).toHaveAttribute("href", "/administrations");
  await expectNoHorizontalOverflow(page, "screen recovery");
  if (process.env.E2E_SCREENS) await page.screenshot({ path: fileURLToPath(new URL(`../../../docs/audits/2026-10-10-map-first/experience-screens/screen-failure-${page.viewportSize()?.width}.png`, import.meta.url)) });
  await page.unroute("**/assets/administrations-*.js");
  await page.getByRole("button", { name: "Reload this screen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your administrations", exact: true })).toBeVisible();
});

test("display settings persist across a reload and reach the root element", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.getByRole("radio", { name: /^Cut/ }).check();
  await page.getByRole("radio", { name: "Bold" }).check();
  await page.getByRole("switch", { name: "High contrast" }).check();
  await page.getByRole("radio", { name: /^Tritanopia/ }).check();
  await page.getByText("Domestic affairs and public confidence").click();
  await page.getByLabel("Disasters at home").selectOption("wait");
  await expectNoHorizontalOverflow(page, "settings");
  await waitForStoredPreferences(page, '"disaster":"wait"');

  await page.reload();
  await expect(page.getByRole("radio", { name: /^Cut/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Bold" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "High contrast" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Tritanopia/ })).toBeChecked();
  await page.getByText("Domestic affairs and public confidence").click();
  await expect(page.getByLabel("Disasters at home")).toHaveValue("wait");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-camera", "cut");
  await expect(root).toHaveAttribute("data-map-density", "bold");
  await expect(root).toHaveAttribute("data-contrast", "high");
  await expect(root).toHaveAttribute("data-vision", "tritan");
});

test("a shipped build shows no God Mode row without the entitlement", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 2, name: "What pauses time" })).toBeVisible();
  await expect(page.getByTestId("god-mode-row")).toHaveCount(0);
});

test("administrations shows the slot, opens it, and discards it", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await page.goto("/administrations");
  const slots = page.getByRole("region", { name: "Administration in play" });
  await expect(page.getByText("1 of 5 slots are in use.")).toBeVisible();
  await expect(slots.getByText("President Rosa Delgado").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Other saved administrations" }).getByText("No other administration is saved")).toBeVisible();
  await expectNoHorizontalOverflow(page, "administrations");

  await slots.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/brief");
  await page.goto("/administrations");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Discard “President Rosa Delgado”" }).click();
  await expect(page.getByText("0 of 5 slots are in use.")).toBeVisible();
  await page.goto("/brief");
  await page.waitForURL((url) => url.pathname === "/");
});

test("recovery offers the retry for the campaign in play", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await page.goto("/recovery");
  await page.getByRole("button", { name: "Retry the save" }).click();
  await expect(page.getByRole("article", { name: "Saved" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "recovery");
});

test("search finds a place and a glossary term", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  const box = page.getByRole("combobox", { name: "Search places and terms" });
  await box.fill("inspector general");
  await expect(page.getByRole("option", { name: /Inspector general/ }).first()).toBeVisible();
  await expect(page.getByText(/independent auditor/).first()).toBeVisible();
  await box.fill("camera");
  await box.press("Enter");
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});
