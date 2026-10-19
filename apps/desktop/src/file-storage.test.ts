import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStorage } from "./file-storage";

const MANIFEST_KEY = "administration.campaignLibrary.v1";
const PAYLOAD_PREFIX = "administration.campaignPayload.v1";

describe("createFileStorage", () => {
  it("keeps campaign files under saves/ and machine keys under settings/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "admin-desktop-saves-"));
    const storage = createFileStorage(root);

    await storage.setItem(MANIFEST_KEY, "{\"campaigns\":[]}");
    await storage.setItem(`${PAYLOAD_PREFIX}:campaign-a`, "{\"id\":\"campaign-a\"}");
    await storage.setItem("theme", "dark");

    expect(await readFile(path.join(root, "saves", "manifest.json"), "utf8")).toBe("{\"campaigns\":[]}");
    expect(await readFile(path.join(root, "saves", "campaigns", "campaign-a.json"), "utf8")).toContain("campaign-a");
    expect(await readFile(path.join(root, "settings", `${encodeURIComponent("theme")}.json`), "utf8")).toBe("dark");
    expect(await storage.getItem("missing")).toBeNull();
  });
});
