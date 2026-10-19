import type { StoragePort } from "@admin/player-core";
import { desktopBridge } from "./desktop-bridge";

const IDB_NAME = "administration.device.v1";
const IDB_STORE = "kv";
const IDB_VERSION = 1;
const OPEN_TIMEOUT_MS = 5_000;

/** A failed vault is unavailable, never an empty or successfully saved one. */
function unavailableStorage(): StoragePort {
  const refuse = async (): Promise<never> => {
    throw new Error("This browser cannot access local save storage. Existing administrations have not been read. Enable site storage, then reload and try again.");
  };
  return { getItem: refuse, setItem: refuse, removeItem: refuse };
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (work: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      work();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("Opening local save storage timed out. Existing administrations have not been read; retry when storage is available."))), OPEN_TIMEOUT_MS);
    let request: IDBOpenDBRequest;
    try { request = factory.open(IDB_NAME, IDB_VERSION); }
    catch (cause) { finish(() => reject(cause)); return; }
    request.onupgradeneeded = () => {
      // An open that already failed must not later create or retain a vault.
      if (settled) { request.transaction?.abort(); return; }
      if (!request.result.objectStoreNames.contains(IDB_STORE)) request.result.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      finish(() => resolve(request.result));
    };
    request.onerror = () => finish(() => reject(request.error ?? new Error("Local save storage could not open. Existing administrations have not been read.")));
    request.onblocked = () => finish(() => reject(new Error("Another tab is blocking local save storage. Close the other tab, then retry. Existing administrations have not been read.")));
  });
}

/** Request success alone is not a commit: quota/I/O failures may still abort. */
function transact<T>(db: IDBDatabase, mode: IDBTransactionMode, through: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let tx: IDBTransaction | undefined;
    let result: T;
    const finish = (work: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      work();
    };
    const refuse = (cause: unknown) => {
      finish(() => reject(cause));
      try { tx?.abort(); } catch { /* An already finished transaction cannot abort again. */ }
    };
    const timer = setTimeout(() => refuse(new Error("The local save transaction timed out. The write was not confirmed; retry the save.")), OPEN_TIMEOUT_MS);
    try {
      tx = db.transaction(IDB_STORE, mode);
      tx.oncomplete = () => finish(() => resolve(result));
      tx.onabort = () => finish(() => reject(tx?.error ?? new Error("The local save transaction was aborted. The write was not confirmed.")));
      tx.onerror = () => refuse(tx?.error ?? new Error("The local save transaction failed."));
      const request = through(tx.objectStore(IDB_STORE));
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => refuse(request.error ?? new Error("The local save request failed."));
    } catch (cause) { refuse(cause); }
  });
}

/** Retries use the real vault again; no error permanently demotes reads to memory. */
export function createBrowserStorage(factory: IDBFactory | undefined = typeof indexedDB === "undefined" ? undefined : indexedDB): StoragePort {
  if (!factory) return unavailableStorage();
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => {
    if (connection) return connection;
    const attempt = openDatabase(factory);
    connection = attempt;
    void attempt.then((db) => {
      const release = () => { if (connection === attempt) connection = undefined; };
      db.onversionchange = () => { db.close(); release(); };
      db.onclose = release;
    }, () => { if (connection === attempt) connection = undefined; });
    return attempt;
  };
  const run = async <T>(mode: IDBTransactionMode, through: (store: IDBObjectStore) => IDBRequest<T>) => {
    const attempt = open();
    const db = await attempt;
    try { return await transact(db, mode, through); }
    catch (cause) {
      // An aborted, closed or failed connection is not reused on Recovery → Retry.
      db.close();
      if (connection === attempt) connection = undefined;
      throw cause;
    }
  };
  return {
    async getItem(key) {
      const value = await run("readonly", (store) => store.get(key));
      return typeof value === "string" ? value : value == null ? null : String(value);
    },
    async setItem(key, value) { await run("readwrite", (store) => store.put(value, key)); },
    async removeItem(key) { await run("readwrite", (store) => store.delete(key)); },
  };
}

/** Browser vault or desktop host files share the existing persistence contract. */
export function createDeviceStorage(): StoragePort {
  const bridge = desktopBridge();
  return bridge ? { getItem: (key) => bridge.getItem(key), setItem: (key, value) => bridge.setItem(key, value), removeItem: (key) => bridge.removeItem(key) } : createBrowserStorage();
}
