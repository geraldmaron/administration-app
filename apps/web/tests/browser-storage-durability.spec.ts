import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

type ProofWindow = Window & { proofAbort?: boolean; proofReadFail?: boolean; proofOpenFail?: boolean };

/** Hash actual committed campaign records without copying the multi-megabyte save into test output. */
async function campaignSnapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("administration.device.v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const values = store.getAll();
      const keys = store.getAllKeys();
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
      return await Promise.all(keys.result.flatMap((key, index) => String(key).startsWith("administration.campaign") ? [{ key: String(key), value: String(values.result[index]) }] : []).map(async ({ key, value }) => ({
        key,
        hash: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      })));
    } finally { db.close(); }
  });
}

const saved = (page: Page) => page.getByRole("button", { name: "Saved. Save again now", exact: true });
const retry = (page: Page) => page.getByRole("button", { name: "Retry save", exact: true });

test("real browser save abort and manifest preflight failure remain retryable without losing the campaign", async ({ page }, info) => {
  // Direct toolbar retry is the desktop workflow already proven in the stream.
  await page.setViewportSize({ width: 1440, height: 900 });
  await importFixture(page, "collection-intelligence");
  await expect(saved(page)).toBeVisible();
  const before = await campaignSnapshot(page);
  expect(before).toHaveLength(2);
  const date = await page.getByRole("link", { name: /^Open calendar:/ }).getAttribute("aria-label");

  await page.evaluate(() => {
    (window as ProofWindow).proofAbort = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      const request = put.call(this, value, key);
      // The real request succeeds first; its real transaction then aborts before commit.
      request.addEventListener("success", () => { if ((window as ProofWindow).proofAbort) request.transaction?.abort(); });
      return request;
    };
  });
  await saved(page).click();
  await expect(retry(page)).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(before);
  await page.screenshot({ path: info.outputPath("save-transaction-aborted.png"), fullPage: false });
  await page.evaluate(() => { (window as ProofWindow).proofAbort = false; });
  await retry(page).click();
  await expect(saved(page)).toBeVisible();
  const afterRetry = await campaignSnapshot(page);
  await page.reload();
  await expect(saved(page)).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(afterRetry);
  await expect(page.getByRole("link", { name: /^Open calendar:/ })).toHaveAttribute("aria-label", date!);

  await page.evaluate(() => {
    (window as ProofWindow).proofReadFail = true;
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      if ((window as ProofWindow).proofReadFail && key === "administration.campaignLibrary.v1") throw new DOMException("Proof manifest unavailable", "UnknownError");
      return get.call(this, key);
    };
  });
  await saved(page).click();
  await expect(retry(page)).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(afterRetry);
  await page.evaluate(() => { (window as ProofWindow).proofReadFail = false; });
  await retry(page).click();
  await expect(saved(page)).toBeVisible();
  await expectNoHorizontalOverflow(page, "real browser save recovery");
});

test("an unavailable real vault gates new administrations and recovers the existing campaign", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importFixture(page, "collection-intelligence");
  await expect(saved(page)).toBeVisible();
  const before = await campaignSnapshot(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("proof-storage-restored") === "true") return;
    (window as ProofWindow).proofOpenFail = true;
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name: string, version?: number) {
      if ((window as ProofWindow).proofOpenFail) throw new DOMException("Proof site storage unavailable", "SecurityError");
      return open.call(this, name, version);
    };
  });
  await page.goto("/administrations");
  await expect(page.getByText("Saved administrations are unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("input[type=file]")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save storage must open before starting an administration", exact: true })).toBeDisabled();
  await expect(page.getByText("No administration is saved on this device", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "unavailable real vault");
  await page.screenshot({ path: info.outputPath("save-vault-unavailable.png"), fullPage: true });

  await page.goto("/founding");
  await expect(page.getByText("Save storage must open first", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Short setup", exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as ProofWindow).proofOpenFail = false; });
  await page.getByRole("button", { name: "Retry reading saves", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose Short setup", exact: true })).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(before);

  await page.evaluate(() => { sessionStorage.setItem("proof-storage-restored", "true"); });
  await page.goto("/administrations");
  await expect(page.getByRole("heading", { name: "Administration in play", exact: true })).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(before);
});

test("missing IndexedDB refuses an empty library and recovers saved records after reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importFixture(page, "collection-intelligence");
  await expect(saved(page)).toBeVisible();
  const before = await campaignSnapshot(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("proof-storage-restored") !== "true") {
      Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
    }
  });
  await page.goto("/administrations");
  await expect(page.getByText("Saved administrations are unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("input[type=file]")).toBeDisabled();
  await expect(page.getByText("No administration is saved on this device", { exact: true })).toHaveCount(0);
  await page.goto("/founding");
  await expect(page.getByText("Save storage must open first", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Short setup", exact: true })).toHaveCount(0);
  await page.evaluate(() => { sessionStorage.setItem("proof-storage-restored", "true"); });
  await page.goto("/administrations");
  await expect(page.getByRole("heading", { name: "Administration in play", exact: true })).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(before);
});

test("a real blocked upgrade refuses access, aborts the late upgrade and retries without losing saves", async ({ page, context }) => {
  await importFixture(page, "collection-intelligence");
  await expect(saved(page)).toBeVisible();
  const before = await campaignSnapshot(page);
  const holder = await context.newPage();
  await holder.goto("/favicon.ico");
  await holder.evaluate(async () => {
    // Keep the existing version open in another document so the browser itself blocks an upgrade.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("administration.device.v1", 1);
      request.onsuccess = () => { request.result.onversionchange = () => {}; resolve(); };
      request.onerror = () => reject(request.error);
    });
  });
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name: string, version?: number) {
      const upgrade = name === "administration.device.v1" && sessionStorage.getItem("proof-storage-restored") !== "true";
      const request = open.call(this, name, upgrade ? 2 : version);
      if (upgrade) {
        request.addEventListener("blocked", () => { sessionStorage.setItem("proof-blocked-upgrade", "true"); });
        request.addEventListener("error", () => { sessionStorage.setItem("proof-late-upgrade", request.error?.name ?? "unknown"); });
      }
      return request;
    };
  });
  await page.goto("/administrations");
  await expect(page.getByText("Saved administrations are unavailable", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("proof-blocked-upgrade"))).toBe("true");
  await expect(page.locator("input[type=file]")).toBeDisabled();
  await expect(page.getByText("No administration is saved on this device", { exact: true })).toHaveCount(0);
  await page.evaluate(() => { sessionStorage.setItem("proof-storage-restored", "true"); });
  await holder.close();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("proof-late-upgrade"))).toBe("AbortError");
  await page.getByRole("button", { name: "Retry reading saves", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Administration in play", exact: true })).toBeVisible();
  expect(await campaignSnapshot(page)).toEqual(before);
  await page.reload();
  expect(await campaignSnapshot(page)).toEqual(before);
});
