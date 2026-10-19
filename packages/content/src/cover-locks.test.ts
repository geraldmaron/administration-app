import { existsSync, statSync } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_COVER_LOCK_ROOT, loadCoverLocks } from "./cover-locks.js";
import { HOUSE_LOCK_CITE } from "./cover-package.js";

function houseScanOnDisk(): boolean {
  const scanPath = path.join(DEFAULT_COVER_LOCK_ROOT, "v1", "scan.jpg");
  try {
    return existsSync(scanPath) && statSync(scanPath).isFile() && statSync(scanPath).size > 0;
  } catch {
    return false;
  }
}

describe("cover lock slots", () => {
  it("lists a versioned lock and reports when the scan is still missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cover-locks-"));
    const slot = path.join(root, "v1");
    await mkdir(slot);
    await writeFile(
      path.join(slot, "lock.json"),
      JSON.stringify({ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg" }),
    );
    const catalog = await loadCoverLocks(root);
    expect(catalog.locks).toEqual([
      { id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: false },
    ]);
  });

  it("registers the v1 house lock at content/cover-locks/v1/scan.jpg", async () => {
    const catalog = await loadCoverLocks();
    const lock = catalog.locks.find((entry) => entry.id === HOUSE_LOCK_CITE);
    expect(lock).toEqual({
      id: HOUSE_LOCK_CITE,
      version: 1,
      scanFile: "scan.jpg",
      scanPresent: houseScanOnDisk(),
    });
  });

  it("marks a lock scanned only when the cited file exists and has bytes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cover-locks-"));
    const slot = path.join(root, "v1");
    await mkdir(slot);
    await writeFile(
      path.join(slot, "lock.json"),
      JSON.stringify({ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg" }),
    );
    await writeFile(path.join(slot, "scan.jpg"), Buffer.from([0xff, 0xd8, 0xff]));
    const catalog = await loadCoverLocks(root);
    expect(catalog.locks[0]?.scanPresent).toBe(true);
  });
});
