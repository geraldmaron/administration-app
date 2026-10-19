import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Versioned house-lock slots. Each directory under content/cover-locks/ is a
// lock version. Design drops the felt-tip scan named in lock.json; the lock
// is that scan, not a prompt.
//
// Node-only. Do not re-export from index.ts — the player imports @admin/content
// and Metro cannot resolve node:fs.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const DEFAULT_COVER_LOCK_ROOT = path.join(REPO_ROOT, "content", "cover-locks");
function isManifest(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const record = value;
    return (typeof record.id === "string" &&
        typeof record.version === "number" &&
        typeof record.scanFile === "string" &&
        record.scanFile.length > 0);
}
async function fileExists(filePath) {
    try {
        const info = await stat(filePath);
        return info.isFile() && info.size > 0;
    }
    catch {
        return false;
    }
}
async function readLockDir(dir) {
    const raw = await readFile(path.join(dir, "lock.json"), "utf8").catch(() => undefined);
    if (!raw)
        return undefined;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return undefined;
    }
    if (!isManifest(parsed))
        return undefined;
    return {
        id: parsed.id,
        version: parsed.version,
        scanFile: parsed.scanFile,
        scanPresent: await fileExists(path.join(dir, parsed.scanFile)),
    };
}
/** Every lock.json under the root, newest version last. Missing scans stay listed so the gate can fail closed. */
export async function loadCoverLocks(root = DEFAULT_COVER_LOCK_ROOT) {
    let names = [];
    try {
        names = await readdir(root);
    }
    catch {
        return { locks: [] };
    }
    const locks = [];
    for (const name of names.sort()) {
        const lock = await readLockDir(path.join(root, name));
        if (lock)
            locks.push(lock);
    }
    return { locks };
}
