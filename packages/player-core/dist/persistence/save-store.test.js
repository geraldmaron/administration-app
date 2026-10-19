import { describe, it, expect } from "vitest";
import { CURRENT_SCHEMA_VERSION, MIN_READABLE_SCHEMA_VERSION, createSave, } from "@admin/engine";
import { CAMPAIGN_LIBRARY_MANIFEST_KEY, MAX_ACTIVE_CAMPAIGNS, RETIRED_CALENDAR_REASON, campaignPayloadKey, createMemoryStorage, createSaveStore, readImportedSave, vaultCapacity, } from "./save-store";
import { openingCampaign } from "../__fixtures__/opening";
import { decodePayload } from "./payload-codec";
function storeWith({ initial, ids = ["campaign-a", "campaign-b", "campaign-c"], now = 1_000, } = {}) {
    const storage = createMemoryStorage(initial);
    let index = 0;
    const store = createSaveStore(storage, {
        now: () => now,
        idFactory: () => ids[index++] ?? `campaign-${index}`,
    });
    return { storage, store };
}
function payload(campaign = openingCampaign()) {
    return JSON.stringify(createSave(campaign));
}
function manifest(entries, activeCampaignId = null) {
    return JSON.stringify({ schemaVersion: 1, activeCampaignId, campaigns: entries });
}
function entry(id, campaign = openingCampaign()) {
    return {
        id,
        name: `Campaign ${id}`,
        createdAt: 1,
        updatedAt: 1,
        savedAt: 1,
        turn: campaign.turn,
        date: "2027-01-01",
        leader: `${campaign.founding.title} ${campaign.founding.name}`,
        nation: campaign.founding.nation,
        payloadKey: campaignPayloadKey(id),
    };
}
describe("local save store", () => {
    const campaign = openingCampaign();
    const laterCampaign = { ...campaign, turn: campaign.turn + 4 };
    it("starts with an empty campaign library", async () => {
        const { store } = storeWith();
        await expect(store.list()).resolves.toEqual({ activeCampaignId: null, campaigns: [] });
        await expect(store.read()).resolves.toBeNull();
    });
    it("creates a named campaign and reads it back through the active-campaign API", async () => {
        const { store } = storeWith();
        const summary = await store.create(campaign, { name: "The Dawn Desk" });
        expect(summary).toMatchObject({ id: "campaign-a", name: "The Dawn Desk", status: "healthy" });
        await expect(store.read()).resolves.toEqual(campaign);
    });
    it("reports manifest preflight failure without losing the prior timestamp or campaign", async () => {
        const campaign = openingCampaign();
        const storage = createMemoryStorage();
        let failing = false;
        const saves = createSaveStore({ ...storage, getItem: async (key) => {
                if (failing && key === CAMPAIGN_LIBRARY_MANIFEST_KEY)
                    throw new Error("Manifest temporarily unreadable");
                return storage.getItem(key);
            } }, { now: () => 123, idFactory: () => "preflight" });
        await saves.create(campaign);
        const original = await storage.getItem(campaignPayloadKey("preflight"));
        failing = true;
        await expect(saves.autosaveActive({ ...campaign, turn: campaign.turn + 1 })).rejects.toThrow("Manifest temporarily unreadable");
        expect(saves.getSaveState()).toEqual({ status: "failed", activeCampaignId: "preflight", savedAt: 123, error: "Manifest temporarily unreadable" });
        expect(await storage.getItem(campaignPayloadKey("preflight"))).toBe(original);
        failing = false;
        await expect(saves.read()).resolves.toEqual(campaign);
        await saves.autosaveActive(campaign);
        expect(saves.getSaveState()).toMatchObject({ status: "saved", activeCampaignId: "preflight", savedAt: 123 });
    });
    it("autosaves timestamps only after payload persistence succeeds", async () => {
        const { store } = storeWith();
        await store.create(campaign);
        await store.autosaveActive(laterCampaign);
        expect(store.getSaveState()).toEqual({ status: "saved", activeCampaignId: "campaign-a", savedAt: 1_000 });
        await expect(store.read()).resolves.toEqual(laterCampaign);
    });
    it("supports explicit save, load, rename, duplicate, and exact delete", async () => {
        const { store } = storeWith();
        await store.create(campaign, { name: "Original" });
        await store.create(laterCampaign, { name: "Second" });
        await expect(store.load("campaign-a")).resolves.toEqual(campaign);
        await store.saveActive(laterCampaign);
        const renamed = await store.rename("campaign-a", "Renamed");
        expect(renamed.name).toBe("Renamed");
        const duplicate = await store.duplicate("campaign-a");
        expect(duplicate).toMatchObject({ id: "campaign-c", name: "Renamed Copy", status: "healthy" });
        await store.delete("campaign-b");
        const library = await store.list();
        expect(library.campaigns.map((item) => item.id)).toEqual(["campaign-a", "campaign-c"]);
        await expect(store.load("campaign-c")).resolves.toEqual(laterCampaign);
    });
    it("deleting the active campaign selects the next exact remaining campaign", async () => {
        const { store } = storeWith();
        await store.create(campaign, { name: "First" });
        await store.create(laterCampaign, { name: "Second" });
        await store.delete("campaign-b");
        expect((await store.list()).activeCampaignId).toBe("campaign-a");
        await store.delete("campaign-a");
        expect(await store.list()).toEqual({ activeCampaignId: null, campaigns: [] });
    });
    it("stores a written campaign compressed and opens it again", async () => {
        const { storage, store } = storeWith();
        const summary = await store.create(openingCampaign(), { name: "Compressed" });
        const stored = await storage.getItem(summary.payloadKey);
        expect(stored?.startsWith("gz1:")).toBe(true);
        expect(stored.length * 4).toBeLessThan(payload().length);
        const reopened = await store.load(summary.id);
        expect(JSON.stringify(createSave(reopened))).toBe(payload());
    });
    it("marks one corrupt campaign without blocking the rest of the library", async () => {
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a"), entry("campaign-b")], "campaign-b"),
                [campaignPayloadKey("campaign-a")]: payload(campaign),
                [campaignPayloadKey("campaign-b")]: "{not json",
            },
        });
        const library = await store.list();
        expect(library.campaigns.map((item) => item.status)).toEqual(["healthy", "payload-corrupt"]);
        await expect(store.load("campaign-a")).resolves.toEqual(campaign);
        await expect(store.load("campaign-b")).rejects.toThrow(/not valid JSON/);
    });
    it("skips the full reclassification of a row whose stamped bytes have not moved, but still catches one that has", async () => {
        const { storage, store } = storeWith();
        const summary = await store.create(openingCampaign(), { name: "Stamped" });
        // Unchanged since the write that stamped it: `list()` trusts the cached
        // status rather than paying for decode, parse and schema validation again.
        const first = await store.list();
        expect(first.campaigns[0]).toMatchObject({ id: summary.id, status: "healthy" });
        // Bytes moved outside the stamp that vouched for them — an external
        // tamper or a write this store did not make. The cached "healthy" status
        // must not survive a byte change it never saw: `list()` still has to
        // notice, or a corrupt device would show a clean vault.
        await storage.setItem(summary.payloadKey, "{not json");
        const rechecked = await store.list();
        expect(rechecked.campaigns[0]).toMatchObject({ id: summary.id, status: "payload-corrupt" });
    });
    it("retires a save from before the current calendar instead of calling it damaged", async () => {
        // Save-shaped, current library, below the readable window: a presidency
        // sworn in on the calendar this build no longer keeps.
        const earlier = JSON.stringify({ schemaVersion: MIN_READABLE_SCHEMA_VERSION - 1, campaign: openingCampaign() });
        const { store, storage } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a")], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: earlier,
            },
        });
        const listed = (await store.list()).campaigns[0];
        expect(listed.status).toBe("retired-calendar");
        expect(listed.error).toBe("Started under an older calendar, so it can't be continued");
        expect(listed.error).toBe(RETIRED_CALENDAR_REASON);
        await expect(store.load("campaign-a")).rejects.toThrow(/older calendar/);
        // Still the player's record: it leaves the device intact, and it can be retired.
        expect(JSON.parse(await store.exportSave("campaign-a"))).toEqual(JSON.parse(earlier));
        await store.delete("campaign-a");
        expect((await store.list()).campaigns).toEqual([]);
        expect(await storage.getItem(campaignPayloadKey("campaign-a"))).toBeNull();
    });
    it("refuses to import a save from before the current calendar in the vault's own words", () => {
        const campaign = openingCampaign();
        expect(() => readImportedSave({ schemaVersion: MIN_READABLE_SCHEMA_VERSION - 1, campaign })).toThrow(`${RETIRED_CALENDAR_REASON}.`);
        expect(readImportedSave(JSON.parse(JSON.stringify(createSave(campaign))))).toEqual(campaign);
    });
    it("still calls a save from a newer build unreadable, because that is not a retired calendar", async () => {
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a")], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, campaign: openingCampaign() }),
            },
        });
        expect((await store.list()).campaigns[0]?.status).toBe("payload-corrupt");
        await expect(store.load("campaign-a")).rejects.toThrow(/no migration path/);
    });
    it("exports a healthy save without making it the one in play", async () => {
        const campaign = openingCampaign();
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a"), entry("campaign-b")], "campaign-b"),
                [campaignPayloadKey("campaign-a")]: payload(campaign),
                [campaignPayloadKey("campaign-b")]: payload(campaign),
            },
        });
        const exported = JSON.parse(await store.exportSave("campaign-a"));
        expect(exported).toEqual(createSave(campaign));
        expect((await store.list()).activeCampaignId).toBe("campaign-b");
    });
    it("opens a save at the oldest schema this build says it can read", async () => {
        const campaign = openingCampaign();
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a")], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: JSON.stringify({
                    schemaVersion: MIN_READABLE_SCHEMA_VERSION,
                    campaign,
                }),
            },
        });
        expect((await store.list()).campaigns[0]?.status).toBe("healthy");
        await expect(store.load("campaign-a")).resolves.toMatchObject({
            foundingDate: expect.anything(),
            issuedActs: expect.anything(),
        });
    });
    it("marks a missing payload in a partial manifest without pointing a write at it", async () => {
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a"), entry("campaign-b")], "campaign-b"),
                [campaignPayloadKey("campaign-a")]: payload(campaign),
            },
        });
        const library = await store.list();
        expect(library.campaigns.map((item) => item.status)).toEqual(["healthy", "payload-missing"]);
        await expect(store.load("campaign-a")).resolves.toEqual(campaign);
        await expect(store.load("campaign-b")).rejects.toThrow(/payload is missing/);
    });
    it("refuses a duplicate id after bounded retries", async () => {
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a")], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: payload(campaign),
            },
            ids: Array.from({ length: 25 }, () => "campaign-a"),
        });
        await expect(store.create(campaign)).rejects.toThrow(/unique campaign id/);
    });
    it("allows duplicate display names because ids, not names, are keys", async () => {
        const { store } = storeWith();
        await store.create(campaign, { name: "Same Name" });
        await store.create(laterCampaign, { name: "Same Name" });
        expect((await store.list()).campaigns.map((item) => item.name)).toEqual(["Same Name", "Same Name"]);
    });
    it("keeps the manifest from pointing to a missing payload when payload write fails", async () => {
        const storage = failingStorage(createMemoryStorage(), { set: campaignPayloadKey("campaign-a") });
        const store = createSaveStore(storage, { idFactory: () => "campaign-a" });
        await expect(store.create(campaign)).rejects.toThrow(/set failed/);
        // An untouched vault holds no manifest at all — nothing writes one until a
        // campaign is really in it — and a vault that has one names no campaign
        // whose payload never landed. Both are the same invariant: the manifest
        // never points at bytes that are not there.
        const raw = await storage.getItem(CAMPAIGN_LIBRARY_MANIFEST_KEY);
        if (raw !== null)
            expect(JSON.parse(raw)).toMatchObject({ campaigns: [] });
        await expect(store.list()).resolves.toEqual({ activeCampaignId: null, campaigns: [] });
    });
    it("keeps saved state at the prior timestamp when write verification fails", async () => {
        const storage = createMemoryStorage();
        const store = createSaveStore(storage, { idFactory: () => "campaign-a", now: () => 100 });
        await store.create(campaign);
        const broken = corruptingReadbackStorage(storage, campaignPayloadKey("campaign-a"));
        const sameLibrary = createSaveStore(broken, { now: () => 200 });
        // Read, not just list: a write belongs to the campaign this store actually
        // opened, and a later session opens one before it saves it. Listing the
        // vault is not holding a campaign, and a store that wrote on the strength
        // of a listing is the store that could write one administration's bytes
        // onto another's key.
        await sameLibrary.read();
        await expect(sameLibrary.autosaveActive(laterCampaign)).rejects.toThrow(/could not be verified/);
        expect(sameLibrary.getSaveState()).toMatchObject({ status: "failed", savedAt: 100 });
    });
    it("surfaces manifest read, manifest write, and remove failures", async () => {
        const unreadable = failingStorage(createMemoryStorage({ [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([]) }), {
            get: CAMPAIGN_LIBRARY_MANIFEST_KEY,
        });
        await expect(createSaveStore(unreadable).list()).rejects.toThrow(/get failed/);
        const unwritable = failingStorage(createMemoryStorage(), { set: CAMPAIGN_LIBRARY_MANIFEST_KEY });
        await expect(createSaveStore(unwritable, { idFactory: () => "campaign-a" }).create(campaign)).rejects.toThrow(/set failed/);
        const { storage } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a")], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: payload(campaign),
            },
        });
        const unremovable = failingStorage(storage, { remove: campaignPayloadKey("campaign-a") });
        await expect(createSaveStore(unremovable).delete("campaign-a")).rejects.toThrow(/remove failed/);
    });
    it("refuses a campaign founded in a world the dataset has retired, rather than crashing a screen", async () => {
        // A real save off a real device: intact bytes, current format, and a
        // charter the pivot deleted. It used to list as healthy and take the whole
        // app down with an unhandled throw the first time any screen asked for the
        // constitution.
        const retired = {
            ...campaign,
            founding: { ...campaign.founding, charter: "charter-maron-presidential" },
        };
        const { store } = storeWith({
            initial: {
                [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest([entry("campaign-a", retired)], "campaign-a"),
                [campaignPayloadKey("campaign-a")]: payload(retired),
            },
        });
        const library = await store.list();
        const listed = library.campaigns.find((entry) => entry.id === "campaign-a");
        expect(listed.status).toBe("retired-world");
        expect(listed.error).toMatch(/charter-maron-presidential/);
        await expect(store.load("campaign-a")).rejects.toThrow(/cannot be continued/);
    });
});
function failingStorage(storage, fail) {
    return {
        async getItem(key) {
            if (key === fail.get)
                throw new Error(`get failed for ${key}`);
            return storage.getItem(key);
        },
        async setItem(key, value) {
            if (key === fail.set)
                throw new Error(`set failed for ${key}`);
            return storage.setItem(key, value);
        },
        async removeItem(key) {
            if (key === fail.remove)
                throw new Error(`remove failed for ${key}`);
            return storage.removeItem(key);
        },
    };
}
describe("the five-administration limit", () => {
    function fullVault() {
        const ids = Array.from({ length: MAX_ACTIVE_CAMPAIGNS }, (_, index) => `campaign-${index}`);
        const initial = {
            [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest(ids.map((id) => entry(id)), ids[0]),
        };
        for (const id of ids)
            initial[campaignPayloadKey(id)] = payload();
        return storeWith({ initial, ids: ["campaign-new"] });
    }
    it("refuses to found a sixth administration", async () => {
        const { store } = fullVault();
        await expect(store.create(openingCampaign())).rejects.toThrow(/5 is the limit/);
        const library = await store.list();
        expect(library.campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS);
    });
    // The manage tray's Duplicate is a second append with its own manifest write
    // and never calls create, so a limit written into create alone leaves it as
    // the way to campaign six.
    it("refuses a duplicate as firmly as a founding", async () => {
        const { store } = fullVault();
        await expect(store.duplicate("campaign-0")).rejects.toThrow(/5 is the limit/);
        expect((await store.list()).campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS);
    });
    it("still lists, opens and deletes a vault that is already over the limit", async () => {
        const ids = Array.from({ length: MAX_ACTIVE_CAMPAIGNS + 2 }, (_, index) => `over-${index}`);
        const initial = {
            [CAMPAIGN_LIBRARY_MANIFEST_KEY]: manifest(ids.map((id) => entry(id)), ids[0]),
        };
        for (const id of ids)
            initial[campaignPayloadKey(id)] = payload();
        const { store } = storeWith({ initial });
        // A limit that deleted saved work to satisfy its own number would be the
        // worse bug: the cap gates founding, never reading.
        expect((await store.list()).campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS + 2);
        await expect(store.load("over-6")).resolves.toBeTruthy();
        await store.delete("over-6");
        expect((await store.list()).campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS + 1);
    });
    it("frees a slot when one is retired", async () => {
        const { store } = fullVault();
        await store.delete("campaign-4");
        await expect(store.create(openingCampaign())).resolves.toMatchObject({ id: "campaign-new" });
        expect((await store.list()).campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS);
    });
    it("reads capacity the same way the vault screen does", () => {
        expect(vaultCapacity(3)).toEqual({ limit: 5, used: 3, free: 2, full: false });
        expect(vaultCapacity(5)).toEqual({ limit: 5, used: 5, free: 0, full: true });
        // Never negative: a vault already over the limit has no room, not room owed.
        expect(vaultCapacity(7)).toEqual({ limit: 5, used: 7, free: 0, full: true });
    });
});
describe("a write belongs to the campaign it came from", () => {
    it("does not follow a switch onto another administration's payload", async () => {
        const first = openingCampaign();
        const { storage, store } = storeWith({ ids: ["campaign-a", "campaign-b"] });
        await store.create(first, { name: "First" });
        await store.create({ ...first, turn: first.turn + 9 }, { name: "Second" });
        // Back into the first, then a save of the campaign the player is now in.
        await store.load("campaign-a");
        await store.saveActive({ ...first, turn: first.turn + 1 });
        // The second administration is untouched: its payload still holds its own
        // turn, and its manifest row still reports it. Before writes were bound to
        // the campaign in play, a save resolved its target from whatever the
        // manifest called active, so one administration's bytes could land on
        // another's key and report success.
        const secondPayload = await storage.getItem(campaignPayloadKey("campaign-b"));
        expect(JSON.parse(await decodePayload(secondPayload)).campaign.turn).toBe(first.turn + 9);
        const library = await store.list();
        expect(library.campaigns.find((entry) => entry.id === "campaign-b")?.turn).toBe(first.turn + 9);
        expect(library.campaigns.find((entry) => entry.id === "campaign-a")?.turn).toBe(first.turn + 1);
    });
    it("refuses a write once the campaign it belongs to has been retired", async () => {
        const first = openingCampaign();
        const { store } = storeWith({ ids: ["campaign-a", "campaign-b"] });
        await store.create(first, { name: "First" });
        await store.create(first, { name: "Second" });
        await store.load("campaign-a");
        await store.delete("campaign-a");
        // Refused rather than falling back to the survivor the manifest promoted:
        // the only thing worse than losing a write is landing it on somebody
        // else's administration.
        await expect(store.saveActive(first)).rejects.toThrow(/nothing to save|no longer in the vault/);
    });
    it("serializes concurrent foundings so the limit cannot be raced", async () => {
        const ids = Array.from({ length: MAX_ACTIVE_CAMPAIGNS + 3 }, (_, index) => `race-${index}`);
        const { store } = storeWith({ ids });
        const campaign = openingCampaign();
        const attempts = await Promise.allSettled(Array.from({ length: MAX_ACTIVE_CAMPAIGNS + 3 }, () => store.create(campaign)));
        // Every mutation reads the manifest, awaits, and writes it back, and the
        // storage port has no compare-and-swap: unserialized, all eight would read
        // the same manifest and the last write would erase the other seven.
        expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(MAX_ACTIVE_CAMPAIGNS);
        expect((await store.list()).campaigns).toHaveLength(MAX_ACTIVE_CAMPAIGNS);
    });
});
function corruptingReadbackStorage(storage, keyToCorrupt) {
    let corruptNextReadback = false;
    return {
        async getItem(key) {
            if (key === keyToCorrupt && corruptNextReadback) {
                corruptNextReadback = false;
                return "{changed";
            }
            return storage.getItem(key);
        },
        async setItem(key, value) {
            await storage.setItem(key, value);
            if (key === keyToCorrupt)
                corruptNextReadback = true;
        },
        async removeItem(key) {
            return storage.removeItem(key);
        },
    };
}
