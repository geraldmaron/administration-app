import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../persistence/save-store";
import { createPreferencesStore, DEFAULT_PREFERENCES, effectiveCamera, PREFERENCES_KEY } from "./preferences-store";
const storageHolding = (text) => createMemoryStorage(text === undefined ? {} : { [PREFERENCES_KEY]: text });
describe("the attention and brief preferences", () => {
    it("round-trips a setting per kind of matter and the briefs put away", async () => {
        const store = createPreferencesStore(storageHolding());
        const preferences = { ...DEFAULT_PREFERENCES, attentionByKind: { disaster: "pause", pledge: "log" }, dismissedBriefs: ["economy"] };
        await store.write(preferences);
        expect(await store.read()).toEqual(preferences);
    });
    it("drops a setting it cannot act on, and keeps the rest", async () => {
        const stored = JSON.stringify({ attentionByKind: { disaster: "pause", scenario: "loudly" }, dismissedBriefs: ["economy", 4] });
        const read = await createPreferencesStore(storageHolding(stored)).read();
        expect(read.attentionByKind).toEqual({ disaster: "pause" });
        expect(read.dismissedBriefs).toEqual(["economy"]);
    });
    it("keeps the clock-key switch on the device", async () => {
        const store = createPreferencesStore(storageHolding());
        await store.write({ ...DEFAULT_PREFERENCES, clockShortcuts: false });
        expect(await store.read()).toEqual({ ...DEFAULT_PREFERENCES, clockShortcuts: false });
    });
    it("reads an unreadable field as absent rather than failing the launch", async () => {
        const stored = JSON.stringify({ attentionByKind: "pause everything", dismissedBriefs: { economy: true } });
        const read = await createPreferencesStore(storageHolding(stored)).read();
        expect(read).toEqual(DEFAULT_PREFERENCES);
    });
    it("round-trips the display settings and drops a value this build does not offer", async () => {
        const store = createPreferencesStore(storageHolding());
        const display = { camera: "cut", mapDensity: "bold", highContrast: true, colorVision: "deutan", theme: "dark", ceremony: "reduced" };
        await store.write(display);
        expect(await store.read()).toEqual(display);
        const odd = JSON.stringify({ camera: "teleport", mapDensity: "bold", highContrast: "yes", colorVision: "sepia", theme: "midnight", ceremony: "loud" });
        expect(await createPreferencesStore(storageHolding(odd)).read()).toEqual({ mapDensity: "bold" });
    });
    it("gives the first session a flight, every later one a quick move, and reduced motion a cut", () => {
        expect(effectiveCamera({}, { firstSession: true, reducedMotion: false })).toBe("fly");
        expect(effectiveCamera({}, { firstSession: false, reducedMotion: false })).toBe("quick");
        expect(effectiveCamera({ camera: "fly" }, { firstSession: false, reducedMotion: true })).toBe("cut");
        expect(effectiveCamera({ camera: "cut" }, { firstSession: true, reducedMotion: false })).toBe("cut");
    });
    it("loads preferences an older build stored, keeping only the settings it still reads", async () => {
        const stored = JSON.stringify({ currency: "local", explainLayer: true, haptics: false, alerts: false, hideGuidance: true });
        const read = await createPreferencesStore(storageHolding(stored)).read();
        expect(read).toEqual({ hideGuidance: true });
    });
});
describe("the inbox preferences", () => {
    it("round-trips read inbox items per campaign and the reminder opt-in", async () => {
        const store = createPreferencesStore(storageHolding());
        const preferences = { ...DEFAULT_PREFERENCES, inboxSeen: { "campaign-a": ["desk:1", "news:2"], "campaign-b": [] }, deviceReminders: true };
        await store.write(preferences);
        expect(await store.read()).toEqual(preferences);
    });
    it("keeps only string ids under each campaign and drops a malformed record", async () => {
        const stored = JSON.stringify({ inboxSeen: { "campaign-a": ["desk:1", 7], "campaign-b": "everything" }, deviceReminders: "yes" });
        const read = await createPreferencesStore(storageHolding(stored)).read();
        expect(read.inboxSeen).toEqual({ "campaign-a": ["desk:1"] });
        expect(read.deviceReminders).toBeUndefined();
        const garbage = await createPreferencesStore(storageHolding(JSON.stringify({ inboxSeen: ["desk:1"] }))).read();
        expect(garbage.inboxSeen).toBeUndefined();
    });
});
