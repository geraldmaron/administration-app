import { describe, expect, it, vi } from "vitest";
import { createBrowserStorage } from "./device-storage";

type EventHook = ((event?: Event) => void) | null;
function vault() {
  const request = { result: "existing campaign", error: null, onsuccess: null as EventHook, onerror: null as EventHook };
  const tx = { error: null as Error | null, oncomplete: null as EventHook, onabort: null as EventHook, onerror: null as EventHook, abort: vi.fn(), objectStore: vi.fn(() => ({ get: () => request, put: () => request, delete: () => request })) };
  const db = { close: vi.fn(), onversionchange: null as EventHook, onclose: null as EventHook, objectStoreNames: { contains: () => true }, transaction: vi.fn(() => tx) };
  const opening = { result: db, error: null as Error | null, onsuccess: null as EventHook, onerror: null as EventHook, onblocked: null as EventHook, onupgradeneeded: null as EventHook };
  const factory = { open: vi.fn(() => opening) };
  return { storage: createBrowserStorage(factory as unknown as IDBFactory), factory, opening, db, tx, request };
}

async function opened(test: ReturnType<typeof vault>) {
  test.opening.onsuccess?.();
  await Promise.resolve();
  await Promise.resolve();
}

describe("browser vault durability", () => {
  it("does not report a successful request as a committed save", async () => {
    const test = vault();
    const saved = vi.fn();
    const pending = test.storage.setItem("campaign", "new data").then(saved);
    await opened(test);
    test.request.onsuccess?.();
    await Promise.resolve();
    expect(saved).not.toHaveBeenCalled();
    test.tx.oncomplete?.();
    await pending;
    expect(saved).toHaveBeenCalledOnce();
  });

  it("rejects an abort after request success, then retries the real vault", async () => {
    const test = vault();
    const pending = test.storage.setItem("campaign", "new data");
    const rejected = expect(pending).rejects.toThrow("aborted");
    await opened(test);
    test.request.onsuccess?.();
    test.tx.onabort?.();
    await rejected;
    expect(test.db.close).toHaveBeenCalledOnce();
    const recovered = test.storage.getItem("campaign");
    await opened(test);
    test.request.onsuccess?.();
    test.tx.oncomplete?.();
    await expect(recovered).resolves.toBe("existing campaign");
    expect(test.factory.open).toHaveBeenCalledTimes(2);
  });

  it("surfaces genuine read failures rather than an empty library", async () => {
    const test = vault();
    const pending = test.storage.getItem("library");
    const rejected = expect(pending).rejects.toThrow("vault refused");
    test.opening.error = new Error("vault refused");
    test.opening.onerror?.();
    await rejected;
    const retry = test.storage.getItem("library");
    await opened(test);
    test.request.onsuccess?.();
    test.tx.oncomplete?.();
    await expect(retry).resolves.toBe("existing campaign");
  });

  it("closes a late connection after a blocked open and permits another attempt", async () => {
    const test = vault();
    const pending = test.storage.getItem("library");
    const rejected = expect(pending).rejects.toThrow("blocking");
    test.opening.onblocked?.();
    await rejected;
    test.opening.onsuccess?.();
    expect(test.db.close).toHaveBeenCalledOnce();
    const retry = test.storage.getItem("library");
    await opened(test);
    test.request.onsuccess?.();
    test.tx.oncomplete?.();
    await expect(retry).resolves.toBe("existing campaign");
  });

  it("refuses all operations when IndexedDB is unavailable", async () => {
    const storage = createBrowserStorage(undefined);
    await expect(storage.getItem("library")).rejects.toThrow("Existing administrations have not been read");
    await expect(storage.setItem("campaign", "data")).rejects.toThrow("cannot access local save storage");
    await expect(storage.removeItem("campaign")).rejects.toThrow("cannot access local save storage");
  });
});
