import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoragePort } from "@admin/player-core";

// Must stay identical to packages/player-core/src/persistence/save-store.ts.
// Duplicated so Electron Forge does not walk the engine/world graph into the asar.
const CAMPAIGN_LIBRARY_MANIFEST_KEY = "administration.campaignLibrary.v1";
const CAMPAIGN_PAYLOAD_KEY_PREFIX = "administration.campaignPayload.v1";

function fileFor(root: string, key: string): string {
  if (key === CAMPAIGN_LIBRARY_MANIFEST_KEY) return path.join(root, "saves", "manifest.json");
  if (key.startsWith(CAMPAIGN_PAYLOAD_KEY_PREFIX)) {
    const id = key.slice(CAMPAIGN_PAYLOAD_KEY_PREFIX.length).replace(/^:/, "").replace(/[^A-Za-z0-9._-]/g, "_");
    return path.join(root, "saves", "campaigns", `${id}.json`);
  }
  return path.join(root, "settings", `${encodeURIComponent(key)}.json`);
}

async function atomicWrite(target: string, value: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, value, "utf8");
  await rename(temp, target);
}

export function createFileStorage(root: string): StoragePort {
  return {
    async getItem(key) {
      try {
        return await readFile(fileFor(root, key), "utf8");
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw cause;
      }
    },
    async setItem(key, value) {
      await atomicWrite(fileFor(root, key), value);
    },
    async removeItem(key) {
      try {
        await unlink(fileFor(root, key));
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
      }
    },
  };
}
