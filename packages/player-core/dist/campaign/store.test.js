import { describe, it, expect } from "vitest";
import { daysBetween, isDeferred, isOpenCase, makeCampaignSeed, sealFounding } from "@admin/engine";
import { scenarioUnansweredFlag } from "@admin/content";
import { worldDataset } from "@admin/world";
import { CAMPAIGN_LIBRARY_MANIFEST_KEY, createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { chargedThisWeek, docketSilenceFlag } from "../conversation/lapse-source";
import { pendingConversations, scenarioMatterId, scenarioMatterSource } from "../conversation/scripts";
import { deskMatterSource, matterFor, presentedItems } from "../desk/attention";
import { familyRowIds } from "../desk/family-cases";
import { foundingOptions, openingChoices } from "./founding-options";
import { STALE_ACT_MESSAGE, createCampaignStore, isStaleAct } from "./store";
import { briefIsWorthReading, deferMatterPacket } from "./stop-brief";
import { openingCampaign } from "../__fixtures__/opening";
/**
 * Clears the Desk's presented rows the way a player does.
 *
 * Continue does not put a Desk matter off for the President, so a test that means
 * to spend a week has to dispose what is waiting first — and a matter that arrives
 * while the world is running is deferred by nothing, so this runs before every
 * press, not once.
 */
async function disposePresented(store) {
    const ready = () => {
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        return state.campaign;
    };
    // The stop presents at most three; putting those off brings what was queued
    // behind them forward, so the desk is read again until nothing is presented,
    // as a player sees it re-rank after each answer.
    for (let pass = 0; pass < 20; pass += 1) {
        const presented = presentedItems(ready(), {});
        if (presented.length === 0)
            return;
        for (const item of presented) {
            const basis = ready();
            await store.commit(deferMatterPacket(basis, matterFor(item, basis.calendar)), { basis });
        }
    }
    throw new Error("the desk kept presenting matters after twenty passes of putting them off");
}
function storeWith(initial) {
    const storage = createMemoryStorage(initial);
    return { storage, store: createCampaignStore({ saves: createSaveStore(storage) }) };
}
describe("campaign store", () => {
    const campaign = openingCampaign();
    it("starts empty when the device holds no save", async () => {
        const { store } = storeWith();
        expect(store.getState().status).toBe("loading");
        expect((await store.restore()).status).toBe("empty");
    });
    it("restores a campaign the device already holds", async () => {
        const { storage, store } = storeWith();
        await createSaveStore(storage).write(campaign);
        const restored = await store.restore();
        expect(restored).toEqual({ status: "ready", campaign });
    });
    it("steps a day while a matter is already on the desk", async () => {
        const stuck = (_state, date) => [
            {
                id: "already-here",
                source: "bill-signature",
                urgency: "hard",
                title: "A bill is on the desk",
                reason: "It needs a signature.",
                subject: "bill",
                date,
            },
        ];
        const clock = createCampaignStore({ saves: createSaveStore(createMemoryStorage()), matterSources: [stuck] });
        await clock.begin(campaign);
        const held = clock.getState();
        if (held.status !== "ready")
            throw new Error("expected a ready campaign");
        await clock.continueUntilAttention(1);
        const stopped = clock.getState();
        if (stopped.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(stopped.campaign.calendar).toEqual(held.campaign.calendar);
        await clock.stepClockDay();
        const stepped = clock.getState();
        if (stepped.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(stepped.campaign.calendar).not.toEqual(campaign.calendar);
    });
    it("does not encode a running clock tick, but does save a paused single step (Desk clock)", async () => {
        const { storage, store } = storeWith();
        await store.begin(campaign);
        const saved = createSaveStore(storage);
        const initial = await saved.read();
        expect(initial?.calendar).toEqual(campaign.calendar);
        // A running tick advances the campaign in memory and writes nothing.
        await store.stepClockDay({ persist: false });
        expect(await saved.read()).toEqual(initial);
        const inMemory = store.getState();
        if (inMemory.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(inMemory.campaign.calendar).not.toEqual(campaign.calendar);
        // A paused single step (persist defaults true) writes the advanced campaign.
        await store.stepClockDay();
        const final = store.getState();
        if (final.status !== "ready")
            throw new Error("expected a ready campaign");
        const persisted = await saved.read();
        expect(persisted).toEqual(final.campaign);
        expect(persisted).not.toEqual(initial);
    });
    it("does not run the world forward when the player comes back after a while", async () => {
        // The contract this replaces was the sharpest defect on the branch: restore
        // read the wall clock, turned elapsed hours into drift steps and ran them,
        // which advanced `campaign.calendar`. Four days away spent fifty-six days
        // of a fixed four-year term — while running three of the thirty-one phases.
        // A presidency could be run out by closing a laptop.
        const storage = createMemoryStorage();
        const departed = 1_000_000_000_000;
        await createSaveStore(storage, { now: () => departed }).write(campaign);
        const store = createCampaignStore({
            saves: createSaveStore(storage, { now: () => departed + 48 * 3_600_000 }),
        });
        const state = await store.restore();
        expect(state.status).toBe("ready");
        if (state.status !== "ready")
            return;
        expect(state.campaign.turn).toBe(campaign.turn);
        expect(state.campaign.calendar).toEqual(campaign.calendar);
        expect(state.brief).toBeUndefined();
    });
    it("spends no constitutional time however long the absence was", async () => {
        for (const hours of [1, 48, 24 * 30, 24 * 365, 24 * 365 * 10]) {
            const storage = createMemoryStorage();
            const departed = 1_000_000_000_000;
            await createSaveStore(storage, { now: () => departed }).write(campaign);
            const store = createCampaignStore({
                saves: createSaveStore(storage, { now: () => departed + hours * 3_600_000 }),
            });
            const state = await store.restore();
            if (state.status !== "ready")
                throw new Error("expected a ready campaign");
            expect(state.campaign.calendar).toEqual(campaign.calendar);
        }
    });
    it("runs the world forward only when the player asks it to", async () => {
        const { storage, store } = storeWith();
        await createSaveStore(storage).write(campaign);
        await store.restore();
        await store.continueUntilAttention(14);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.turn).toBeGreaterThan(campaign.turn);
        expect(state.stopReason).toBe("horizon");
        expect(state.brief?.turnsRun).toBe(2);
        expect(state.brief?.elapsedDays).toBe(14);
        // The advanced world is what the device now holds.
        expect((await createSaveStore(storage).read())?.turn).toBe(state.campaign.turn);
    });
    it("keeps the return brief across a restore, already read", async () => {
        const { storage, store } = storeWith();
        await createSaveStore(storage).write(campaign);
        await store.restore();
        await store.continueUntilAttention(14);
        const ran = store.getState();
        if (ran.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(ran.brief).toBeDefined();
        expect(ran.briefAcknowledged).toBeUndefined();
        const reopened = createCampaignStore({ saves: createSaveStore(storage) });
        const restored = await reopened.restore();
        if (restored.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(restored.brief).toEqual(ran.brief);
        expect(restored.briefAcknowledged).toBe(true);
        expect(restored.campaign.turn).toBe(ran.campaign.turn);
    });
    it("stops the moment a source says the President is needed, spending nothing", async () => {
        const storage = createMemoryStorage();
        await createSaveStore(storage).write(campaign);
        const store = createCampaignStore({
            saves: createSaveStore(storage),
            matterSources: [
                () => [
                    {
                        id: "bill",
                        source: "bill-signature",
                        urgency: "hard",
                        title: "A bill is on the desk",
                        reason: "It becomes law with your signature, or goes back with your objection.",
                        subject: "bill",
                        date: campaign.calendar,
                    },
                ],
            ],
        });
        await store.restore();
        await store.continueUntilAttention(90);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.stopReason).toBe("attention");
        expect(state.campaign.turn).toBe(campaign.turn);
        expect(state.stop?.presented.map((m) => m.id)).toEqual(["bill"]);
    });
    it("never presents more than three matters at one stop", async () => {
        const storage = createMemoryStorage();
        await createSaveStore(storage).write(campaign);
        const store = createCampaignStore({
            saves: createSaveStore(storage),
            matterSources: [
                () => Array.from({ length: 9 }, (_, i) => ({
                    id: `m${i}`,
                    source: "agency-request",
                    urgency: "soft",
                    title: `Matter ${i}`,
                    reason: "The agency is asking.",
                    subject: `m${i}`,
                    date: campaign.calendar,
                })),
            ],
        });
        await store.restore();
        await store.continueUntilAttention(30);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.stop?.presented.length).toBe(3);
        expect(state.stop?.deferred.length).toBe(6);
    });
    it("acknowledges a brief without clearing it, so /digest stays revisitable", async () => {
        const storage = createMemoryStorage();
        const departed = 1_000_000_000_000;
        await createSaveStore(storage, { now: () => departed }).write(campaign);
        const store = createCampaignStore({ saves: createSaveStore(storage) });
        await store.restore();
        await store.continueUntilAttention(14);
        const before = store.getState();
        if (before.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(before.brief).toBeDefined();
        expect(before.briefAcknowledged).toBeUndefined();
        store.acknowledgeBrief();
        const after = store.getState();
        if (after.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(after.briefAcknowledged).toBe(true);
        // Acknowledging is not consuming: the brief itself is untouched, so a
        // direct visit to /digest still has something real to render.
        expect(after.brief).toEqual(before.brief);
    });
    it("is a no-op to acknowledge with no brief pending", async () => {
        const { store } = storeWith();
        await store.begin(campaign);
        let notifications = 0;
        store.subscribe(() => {
            notifications += 1;
        });
        store.acknowledgeBrief();
        expect(notifications).toBe(0);
    });
    it("carries the brief and its acknowledgment across a commit — answering a document is not turning the week", async () => {
        const storage = createMemoryStorage();
        const departed = 1_000_000_000_000;
        await createSaveStore(storage, { now: () => departed }).write(campaign);
        const store = createCampaignStore({ saves: createSaveStore(storage) });
        await store.restore();
        await store.continueUntilAttention(14);
        store.acknowledgeBrief();
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        await store.commit({
            source: "action",
            actor: "player",
            turn: state.campaign.turn,
            narration: { summary: "A minimal packet, testing that a commit carries the brief forward." },
            effects: [],
        });
        const afterCommit = store.getState();
        if (afterCommit.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(afterCommit.brief).toEqual(state.brief);
        expect(afterCommit.briefAcknowledged).toBe(true);
    });
    it("hands back a brief with something in it, which is what makes the stop brief reachable", async () => {
        // The Desk opens /digest on `briefIsWorthReading(state.brief)`. That guard
        // sat over a field nothing wrote for as long as the attention loop had no
        // production caller, and the reachability gate certified the route anyway
        // because the string literal was present in a push. This asserts the
        // property the literal stands in for: run the world and the brief comes
        // back able to satisfy its own gate.
        const { store } = storeWith();
        await store.begin(campaign);
        await store.continueUntilAttention(28);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.brief).toBeDefined();
        expect(state.brief.toTurn).toBeGreaterThan(state.brief.fromTurn);
        expect(state.brief.ambient.length).toBeGreaterThan(0);
        expect(briefIsWorthReading(state.brief)).toBe(true);
    });
    it("replaces the brief on the next run — it stays revisitable only until the world runs again", async () => {
        const storage = createMemoryStorage();
        const departed = 1_000_000_000_000;
        await createSaveStore(storage, { now: () => departed }).write(campaign);
        const store = createCampaignStore({ saves: createSaveStore(storage) });
        await store.restore();
        await store.continueUntilAttention(14);
        store.acknowledgeBrief();
        const first = store.getState();
        if (first.status !== "ready")
            throw new Error("expected a ready campaign");
        await store.continueUntilAttention(14);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        // The second run publishes its own brief and carries nothing of the first:
        // a stop is revisitable until the world runs again, and the acknowledgment
        // belonged to the stop the player actually read.
        expect(state.brief?.fromTurn).toBe(first.campaign.turn);
        expect(state.brief).not.toEqual(first.brief);
        expect(state.briefAcknowledged).toBeUndefined();
        // Two full runs of the world: about a second each alone, past the default
        // budget when the whole workspace runs its suites at once.
    }, 30_000);
    it("treats a save with no timestamp as no absence at all", async () => {
        const { storage, store } = storeWith();
        await createSaveStore(storage).write(campaign);
        await storage.removeItem("administration.savedAt.v1:administration.campaign.v1");
        const state = await store.restore();
        expect(state).toEqual({ status: "ready", campaign });
    });
    it("surfaces an unreadable save instead of throwing at the screen", async () => {
        const { store } = storeWith({ [CAMPAIGN_LIBRARY_MANIFEST_KEY]: "{not json" });
        const state = await store.restore();
        expect(state.status).toBe("failed");
    });
    it("prints a player-facing restore failure, never a Storage.setItem quota stack", async () => {
        const manifest = JSON.stringify({
            schemaVersion: 1,
            activeCampaignId: "c1",
            campaigns: [
                {
                    id: "c1",
                    name: "Test",
                    createdAt: 1,
                    updatedAt: 1,
                    savedAt: 1,
                    turn: 1,
                    date: "2025-01-01",
                    leader: "Test",
                    nation: "US",
                    payloadKey: "administration.campaignPayload.v1:c1",
                },
            ],
        });
        const broken = {
            async getItem(key) {
                if (key === "administration.campaignLibrary.v1")
                    return manifest;
                if (key.startsWith("administration.campaignPayload")) {
                    throw new Error("Failed to execute 'setItem' on 'Storage': Setting the value of 'administration.campaignPayload.v1:c#5' exceeded the quota.");
                }
                return null;
            },
            async setItem() {
                throw new Error("QuotaExceededError");
            },
            async removeItem() { },
        };
        const store = createCampaignStore({ saves: createSaveStore(broken) });
        const state = await store.restore();
        expect(state.status).toBe("failed");
        if (state.status !== "failed")
            return;
        expect(state.message).toBe("This device is out of storage space, so your game wasn't saved. Free up some space and try again.");
        expect(state.message).not.toMatch(/setItem|QuotaExceeded/i);
    });
    it("advances the turn through the engine and persists the result", async () => {
        const { storage, store } = storeWith();
        await store.begin(campaign);
        // One turn's worth of horizon: the store spends days, and the engine
        // decides how many ticks that is.
        await store.continueUntilAttention(7);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error(`expected a campaign in play, got ${state.status}`);
        expect(state.campaign.turn).toBe(campaign.turn + 1);
        expect(state.campaign.calendar).not.toEqual(campaign.calendar);
        expect(await createSaveStore(storage).read()).toEqual(state.campaign);
    });
    it("notifies subscribers on every published transition", async () => {
        const { store } = storeWith();
        let notifications = 0;
        const unsubscribe = store.subscribe(() => {
            notifications += 1;
        });
        await store.begin(campaign);
        await store.continueUntilAttention(7);
        unsubscribe();
        await store.abandon();
        expect(notifications).toBe(2);
    });
    it("refuses to run the world with nothing in play", async () => {
        const { store } = storeWith();
        await store.restore();
        await expect(store.continueUntilAttention()).rejects.toThrow(/No campaign is in play/);
    });
    // The defect these two cover: removalPhase was exported, tested and bundled,
    // and the store's own phase list did not include it, so pressure was shown
    // on the situation room and never advanced by play.
    it("advances the removal arc when the world runs", async () => {
        const { store } = storeWith();
        await store.begin(campaign);
        await store.continueUntilAttention(7);
        const state = store.getState();
        expect(state.status).toBe("ready");
        if (state.status !== "ready")
            return;
        // Pressure is recomputed against the turn's live state rather than left at
        // whatever founding stamped, which only happens if the phase actually ran.
        expect(state.campaign.removal.pressure).not.toBe(campaign.removal.pressure);
    });
    it("refuses to run the world once the administration has been removed", async () => {
        const { store } = storeWith();
        await store.begin({ ...campaign, removal: { ...campaign.removal, resolved: true } });
        await expect(store.continueUntilAttention()).rejects.toThrow(/removed from office/);
    });
    // The same defect one door along: the guard read the removal arc and nothing
    // else, so a president the country had voted out went on ending weeks. Both
    // endings now come from `selectEnding`, which is the engine's single answer.
    it("refuses to run the world once the administration has been defeated", async () => {
        const { store } = storeWith();
        await store.begin({ ...campaign, termClock: { ...campaign.termClock, outcome: "defeated" } });
        await expect(store.continueUntilAttention()).rejects.toThrow(/You lost the election/);
    });
    it("refuses to run the world once both terms have been served", async () => {
        const { store } = storeWith();
        await store.begin({ ...campaign, termClock: { ...campaign.termClock, outcome: "term-limited" } });
        await expect(store.continueUntilAttention()).rejects.toThrow(/served both of your terms/);
    });
    // Founding beside a save this build cannot read must not be how that save is
    // destroyed. `begin` went through `saves.write`, which writes the *active*
    // slot when the manifest names one — so taking office after a failed restore
    // overwrote the very campaign the player had not decided what to do with.
    it("opens a new slot rather than writing over the campaign already marked active", async () => {
        const { storage, store } = storeWith();
        const saves = createSaveStore(storage);
        const first = await saves.create(campaign, { name: "First term" });
        const second = { ...campaign, turn: campaign.turn + 12 };
        await store.begin(second);
        const library = await saves.list();
        expect(library.campaigns).toHaveLength(2);
        expect(library.activeCampaignId).not.toBe(first.id);
        // The earlier campaign is still on the device, byte for byte.
        expect(await saves.load(first.id)).toEqual(campaign);
        expect(store.getState()).toEqual({ status: "ready", campaign: second });
    });
    it("publishes nothing when the device refuses the founding write", async () => {
        const store = createCampaignStore({
            saves: createSaveStore({
                async getItem() {
                    return null;
                },
                async setItem() {
                    throw new Error("QuotaExceededError");
                },
                async removeItem() { },
            }),
        });
        await expect(store.begin(campaign)).rejects.toThrow(/Quota/i);
        // The oath prints a failure and re-arms; a campaign nothing stored is not
        // in play, and publishing first left every other screen inside a term the
        // device had already refused.
        expect(store.getState().status).toBe("loading");
    });
    it("clears the device slot when a campaign is abandoned", async () => {
        const { storage, store } = storeWith();
        await store.begin(campaign);
        await store.abandon();
        expect(store.getState().status).toBe("empty");
        expect(await createSaveStore(storage).read()).toBeNull();
    });
    // The developer console's "return to setup" / "re-seed" pair, played through
    // the store's own public surface: nothing new on `CampaignStore` was needed,
    it("opens Desk with an in-memory seed when the vault rejects the write for quota", async () => {
        const storage = {
            getItem: async () => null,
            setItem: async () => {
                throw new Error("QuotaExceededError");
            },
            removeItem: async () => undefined,
        };
        const store = createCampaignStore({
            saves: createSaveStore(storage),
            seedWhenEmpty: () => campaign,
        });
        const state = await store.restore();
        expect(state).toEqual({ status: "ready", campaign });
    });
    // because `seedWhenEmpty` already runs on every `restore()` after an empty
    // vault, and `abandon()` already clears the vault and calls `restore()`.
    it("reaches the empty threshold on abandon while a seed is suspended, and re-seeds once resumed", async () => {
        const { store } = storeWith();
        let suspended = false;
        const seeded = { ...campaign, turn: campaign.turn + 5 };
        const storeWithSeed = createCampaignStore({
            saves: store.saves,
            seedWhenEmpty: () => (suspended ? null : seeded),
        });
        await storeWithSeed.begin(campaign);
        suspended = true;
        await storeWithSeed.abandon();
        expect(storeWithSeed.getState().status).toBe("empty");
        suspended = false;
        const restored = await storeWithSeed.restore();
        expect(restored).toEqual({ status: "ready", campaign: seeded });
    });
    // Deleting the active slot promotes another stored campaign, so abandoning
    // one of several must leave the player in the promoted one rather than in a
    // published "empty" the vault disagrees with.
    it("lands in the next stored campaign when the abandoned one was not the only one", async () => {
        const { storage, store } = storeWith();
        const saves = createSaveStore(storage);
        await saves.create(campaign, { name: "The first" });
        await saves.create(campaign, { name: "The second" });
        await store.restore();
        await store.abandon();
        expect(store.getState().status).toBe("ready");
        expect(await saves.read()).not.toBeNull();
    });
    it("empties the shell when the discarded slot is the one in play", async () => {
        const { storage, store } = storeWith();
        await store.begin(campaign);
        const { activeCampaignId } = await createSaveStore(storage).list();
        await store.discard(activeCampaignId);
        expect(store.getState().status).toBe("empty");
        expect(await createSaveStore(storage).read()).toBeNull();
    });
    it("leaves the campaign in play alone when some other slot is discarded", async () => {
        const { storage, store } = storeWith();
        const saves = createSaveStore(storage);
        const other = await saves.create(campaign, { name: "Someone else's" });
        await saves.create(campaign, { name: "The one in play" });
        await store.restore();
        const { activeCampaignId } = await saves.list();
        expect(other.id).not.toBe(activeCampaignId);
        await store.discard(other.id);
        expect(store.getState()).toEqual({ status: "ready", campaign });
        expect((await saves.list()).activeCampaignId).toBe(activeCampaignId);
    });
});
describe("committing a run of packets as one act", () => {
    const campaign = openingCampaign();
    /** A packet that is valid, cheap, and distinguishable on the ledger. */
    function note(index) {
        return {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: `Name ${index} goes to the Senate.` },
            effects: [],
        };
    }
    it("writes the save once, not once per packet", async () => {
        // The defect this exists to stop: staffing the government sent forty-four
        // nominations through `commit`, and `commit` writes the whole campaign
        // after every packet — forty-three multi-megabyte writes to record one
        // decision, which on a phone is the difference between an action and a
        // freeze.
        const storage = createMemoryStorage();
        let writes = 0;
        const saves = createSaveStore(storage);
        const counted = { ...saves, write: async (next) => {
                writes += 1;
                return saves.write(next);
            } };
        const store = createCampaignStore({ saves: counted });
        await store.begin(campaign);
        const before = writes;
        await store.commitAll([note(1), note(2), note(3), note(4)]);
        expect(writes - before).toBe(1);
    });
    it("applies every packet, in the order it was given", async () => {
        const { store } = storeWith();
        await store.begin(campaign);
        await store.commitAll([note(1), note(2), note(3)]);
        const state = store.getState();
        expect(state.status).toBe("ready");
        if (state.status !== "ready")
            return;
        const added = state.campaign.ledger.slice(campaign.ledger.length).map((entry) => entry.description);
        expect(added).toEqual([
            "Name 1 goes to the Senate.",
            "Name 2 goes to the Senate.",
            "Name 3 goes to the Senate.",
        ]);
    });
    it("reports real sequence position while it works", async () => {
        const { store } = storeWith();
        await store.begin(campaign);
        const seen = [];
        await store.commitAll([note(1), note(2), note(3)], (applied) => seen.push(applied));
        // Position, not a percentage of something invented — the same rule the
        // launch sequence sets for itself.
        expect(seen).toEqual([1, 2, 3]);
    });
    it("does nothing, and does not write, for an empty run", async () => {
        const storage = createMemoryStorage();
        let writes = 0;
        const saves = createSaveStore(storage);
        const counted = { ...saves, write: async (next) => {
                writes += 1;
                return saves.write(next);
            } };
        const store = createCampaignStore({ saves: counted });
        await store.begin(campaign);
        const before = writes;
        await store.commitAll([]);
        expect(writes - before).toBe(0);
    });
});
describe("the act/save transaction", () => {
    const campaign = openingCampaign();
    function note(summary) {
        return {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary },
            effects: [],
        };
    }
    /** A save store whose writes can be made to fail on demand, like a full disk. */
    function flakyStore() {
        const storage = createMemoryStorage();
        const saves = createSaveStore(storage);
        let refuse = false;
        let writes = 0;
        const flaky = {
            ...saves,
            write: async (next) => {
                writes += 1;
                if (refuse)
                    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
                return saves.write(next);
            },
        };
        const store = createCampaignStore({ saves: flaky });
        return {
            store,
            storage,
            refuse: (value) => {
                refuse = value;
            },
            writes: () => writes,
        };
    }
    it("hands back the ledger events an act wrote, so the Record can open on them", async () => {
        const { store } = flakyStore();
        await store.begin(campaign);
        const receipt = await store.commit(note("A decision."));
        expect(receipt.persisted).toBe(true);
        expect(receipt.eventIds).toHaveLength(1);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.ledger.at(-1)?.causal?.eventId).toBe(receipt.eventIds[0]);
    });
    it("keeps an accepted act and reports the refused save instead of rejecting", async () => {
        const { store, refuse } = flakyStore();
        await store.begin(campaign);
        refuse(true);
        const receipt = await store.commit(note("Signed while the disk was full."));
        expect(receipt.persisted).toBe(false);
        expect(receipt.saveError).toBe("This device is out of storage space, so your game wasn't saved. Free up some space and try again.");
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.ledger.at(-1)?.description).toBe("Signed while the disk was full.");
    });
    it("retries the save without applying the act a second time", async () => {
        const { store, refuse, storage } = flakyStore();
        await store.begin(campaign);
        refuse(true);
        await store.commit(note("Only once."));
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        const ledgerLength = state.campaign.ledger.length;
        refuse(false);
        const retried = await store.retrySave();
        expect(retried.persisted).toBe(true);
        const after = store.getState();
        if (after.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(after.campaign.ledger.length).toBe(ledgerLength);
        const stored = await createSaveStore(storage).read();
        expect(stored?.ledger.filter((entry) => entry.description === "Only once.")).toHaveLength(1);
    });
    it("refuses a packet priced against a campaign that is no longer in play", async () => {
        const { store } = flakyStore();
        await store.begin(campaign);
        const basis = store.getState().campaign;
        await store.commit(note("First press."), { basis });
        await expect(store.commit(note("First press."), { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.ledger.filter((entry) => entry.description === "First press.")).toHaveLength(1);
    });
    it("recognizes the stale refusal by its own sentence", () => {
        expect(isStaleAct(new Error(STALE_ACT_MESSAGE))).toBe(true);
        expect(isStaleAct(new Error("No campaign is in play"))).toBe(false);
    });
    it("will not run the world twice off one stale press of Continue", async () => {
        const { store } = flakyStore();
        await store.begin(campaign);
        const basis = store.getState().campaign;
        await store.continueUntilAttention(7, { basis });
        const once = store.getState();
        if (once.status !== "ready")
            throw new Error("expected a ready campaign");
        await expect(store.continueUntilAttention(7, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        const twice = store.getState();
        if (twice.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(twice.campaign.turn).toBe(once.campaign.turn);
    });
});
describe("continuing past a waiting decision", () => {
    it("moves the week on every press, and charges each walked-past decision once", async () => {
        // A critical decision left on the desk used to stop the world at day zero
        // on every press: the store priced the silence, the advance's pre-tick look
        // found the same staged document still waiting, and the week never moved
        // while the same unanswered charge landed again and again.
        const seed = makeCampaignSeed("surface-audit-a");
        const options = foundingOptions(seed);
        const choices = openingChoices(options);
        const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
        const store = createCampaignStore({
            saves: createSaveStore(createMemoryStorage()),
            matterSources: [deskMatterSource, scenarioMatterSource],
        });
        await store.begin(campaign);
        let walkedPastHard = false;
        for (let press = 0; press < 12; press += 1) {
            await disposePresented(store);
            const before = store.getState();
            if (before.status !== "ready")
                throw new Error("expected a ready campaign");
            const staged = scenarioMatterSource(before.campaign, before.campaign.calendar);
            walkedPastHard ||= staged.some((matter) => matter.urgency === "hard");
            const ledgerBefore = before.campaign.ledger.length;
            await store.continueUntilAttention(undefined, { basis: before.campaign });
            const after = store.getState();
            if (after.status !== "ready")
                throw new Error("expected a ready campaign");
            // A press spends time; it does not always cross a week boundary. Since the
            // week was cut into seven office days, a run that stops on a matter which
            // arrived on day four has done its job with the turn unchanged — and the
            // stall this test exists to catch shows up as a press that spends nothing
            // at all, which is what is asserted.
            expect(daysBetween(before.campaign.calendar, after.campaign.calendar) +
                (after.campaign.ledger.length - ledgerBefore)).toBeGreaterThan(0);
        }
        // The seed stages a critical decision by its ninth week, once the frozen
        // decisions before it have lapsed; without one the loop above would not be
        // testing the stall at all.
        expect(walkedPastHard).toBe(true);
        // Twelve real advances, each running the full weekly phase list, run
        // noticeably slower than vitest's default budget under a loaded machine.
    }, 60_000);
});
describe("a put-off market case whose trigger recurs the same day", () => {
    // The market writes its readings through the same `markets` effect the
    // commodity phase emits; forcing one here is how a test makes the reading
    // cross its line, fall back and cross again inside one day.
    function soybeansAt(campaign, index) {
        const markets = campaign.markets;
        if (!markets)
            throw new Error("expected the markets to have been read");
        const soybeans = { ...markets.commodities.soybeans, index };
        return {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            background: true,
            narration: { summary: `Soybeans read ${index}.` },
            effects: [{ kind: "markets", set: { ...markets, commodities: { ...markets.commodities, soybeans } } }],
        };
    }
    function storeAfterAWeek() {
        const seed = makeCampaignSeed("surface-audit-a");
        const choices = openingChoices(foundingOptions(seed));
        const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
        const store = createCampaignStore({
            saves: createSaveStore(createMemoryStorage()),
            matterSources: [deskMatterSource, scenarioMatterSource],
        });
        const ready = () => {
            const state = store.getState();
            if (state.status !== "ready")
                throw new Error("expected a ready campaign");
            return state.campaign;
        };
        return { store, ready, campaign };
    }
    const soybeanCases = (campaign) => Object.values(campaign.cases ?? {}).filter((item) => item.subject.kind === "commodity" && item.subject.id === "soybeans");
    it("holds the put-off when the reading eases and spikes again that day, and Continue spends time", async () => {
        const { store, ready, campaign } = storeAfterAWeek();
        await store.begin(campaign);
        // One week run first, so the market has a stored reading to move.
        await disposePresented(store);
        await store.continueUntilAttention(7, { basis: ready() });
        await store.commit(soybeansAt(ready(), 1.6), { basis: ready() });
        await disposePresented(store);
        const putOff = soybeanCases(ready()).find((item) => item.status === "deferred");
        expect(putOff).toBeDefined();
        await store.commit(soybeansAt(ready(), 1), { basis: ready() });
        expect(ready().cases?.[putOff.id]?.status).toBe("defaulted");
        await store.commit(soybeansAt(ready(), 1.6), { basis: ready() });
        const before = ready();
        expect(presentedItems(before, {}).map((item) => item.id)).not.toContain(putOff.id);
        await store.continueUntilAttention(undefined, { basis: before });
        expect(daysBetween(before.calendar, ready().calendar)).toBeGreaterThan(0);
    }, 60_000);
    it("raises no row on a case already settled this week, so nothing stops Continue that the tray cannot put off", async () => {
        const { store, ready, campaign } = storeAfterAWeek();
        await store.begin(campaign);
        await disposePresented(store);
        await store.continueUntilAttention(7, { basis: ready() });
        // Raised and settled inside one week, never put off: the episode's id is
        // spent, and the reading crossing again before the week turns must not
        // present a hard row whose case is already closed.
        await store.commit(soybeansAt(ready(), 1.6), { basis: ready() });
        const settled = soybeanCases(ready()).find((item) => isOpenCase(item.status));
        expect(settled).toBeDefined();
        await store.commit(soybeansAt(ready(), 1), { basis: ready() });
        await store.commit(soybeansAt(ready(), 1.6), { basis: ready() });
        expect(ready().cases?.[settled.id]?.status).toBe("defaulted");
        expect(familyRowIds(ready()).has(settled.id)).toBe(false);
        expect(presentedItems(ready(), {}).map((item) => item.id)).not.toContain(settled.id);
        await disposePresented(store);
        const before = ready();
        await store.continueUntilAttention(undefined, { basis: before });
        expect(daysBetween(before.calendar, ready().calendar)).toBeGreaterThan(0);
    }, 60_000);
});
describe("silence, priced at most once a week", () => {
    it("never bills the same document's inaction twice inside the turn it was priced in", async () => {
        // Before this, silence was priced per press with no cap: an ambient
        // (board-did-not-warrant-it) document is never deferred, so seven one-day
        // presses inside the same quiet week charged it seven times. This does not
        // force an ambient pick specifically — it proves the general invariant the
        // fix actually provides: `inactionPacket`'s own provenance mark, keyed by
        // scenario id and read back off the ledger, never appears twice for the
        // same turn, for any document, staged critical or otherwise.
        const seed = makeCampaignSeed("surface-audit-a");
        const options = foundingOptions(seed);
        const choices = openingChoices(options);
        const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
        const store = createCampaignStore({
            saves: createSaveStore(createMemoryStorage()),
            matterSources: [deskMatterSource, scenarioMatterSource],
        });
        await store.begin(campaign);
        // The seed's critical decision does not appear until its second week; run
        // enough one-day steps to reach and then sit inside a week that has one.
        for (let press = 0; press < 21; press += 1) {
            const before = store.getState();
            if (before.status !== "ready")
                throw new Error("expected a ready campaign");
            await store.continueUntilAttention(1, { basis: before.campaign });
        }
        const after = store.getState();
        if (after.status !== "ready")
            throw new Error("expected a ready campaign");
        const chargesByTurnAndScenario = new Map();
        for (const entry of after.campaign.ledger) {
            for (const mark of entry.causal?.marks ?? []) {
                if (!mark.startsWith("scenario-unanswered:"))
                    continue;
                const key = `${entry.turn}:${mark}`;
                chargesByTurnAndScenario.set(key, (chargesByTurnAndScenario.get(key) ?? 0) + 1);
            }
        }
        // The scan itself has to have found at least one inaction charge, or the
        // assertion below would pass vacuously.
        expect(chargesByTurnAndScenario.size).toBeGreaterThan(0);
        for (const count of chargesByTurnAndScenario.values()) {
            expect(count).toBeLessThanOrEqual(1);
        }
    }, 30_000);
    it("gives two preference sets byte-identical campaigns under one-day steps", async () => {
        // The policy only decides which candidates compete for a stop; it never
        // writes a field the simulation reads. Two runs of the same seed under
        // opposite settings for the same kind have to end on the same bytes, even
        // though what stopped each run along the way differed.
        const seed = makeCampaignSeed("surface-audit-a");
        const options = foundingOptions(seed);
        const choices = openingChoices(options);
        const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
        const waitSource = (state, date) => deskMatterSource(state, date, { "agency-request": "wait" });
        const logSource = (state, date) => deskMatterSource(state, date, { "agency-request": "log" });
        async function runUnderSettings(source) {
            const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()), matterSources: [source, scenarioMatterSource] });
            await store.begin(campaign);
            for (let press = 0; press < 5; press += 1) {
                const before = store.getState();
                if (before.status !== "ready")
                    throw new Error("expected a ready campaign");
                await store.continueUntilAttention(1, { basis: before.campaign });
            }
            const after = store.getState();
            if (after.status !== "ready")
                throw new Error("expected a ready campaign");
            return after.campaign;
        }
        const waited = await runUnderSettings(waitSource);
        const logged = await runUnderSettings(logSource);
        // The notice ledger records what stopped each run, which is exactly what
        // the settings change; it takes no number from the causal sequence, so
        // everything else is identical to the byte.
        const { noticed: _logged, ...loggedWorld } = logged;
        const { noticed: _waited, ...waitedWorld } = waited;
        expect(JSON.stringify(loggedWorld)).toBe(JSON.stringify(waitedWorld));
    }, 30_000);
});
describe("silence the held docket already charged", () => {
    const seed = makeCampaignSeed("surface-audit-a");
    const options = foundingOptions(seed);
    const choices = openingChoices(options);
    const founded = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
    function freshStore() {
        return createCampaignStore({
            saves: createSaveStore(createMemoryStorage()),
            matterSources: [deskMatterSource, scenarioMatterSource],
        });
    }
    function chargesFor(campaign, scenarioId) {
        const mark = scenarioUnansweredFlag(scenarioId);
        return campaign.ledger.filter((entry) => (entry.causal?.marks ?? []).includes(mark)).length;
    }
    it("does not let Continue bill a document the docket already priced, and still advances the week (Continue)", async () => {
        // Reach a state that has a pending document Continue would charge: not
        // deferred, not already charged this week.
        const scout = freshStore();
        await scout.begin(founded);
        let base;
        let scenarioId;
        for (let press = 0; press < 20 && !base; press += 1) {
            const state = scout.getState();
            if (state.status !== "ready")
                throw new Error("expected a ready campaign");
            const cast = pendingConversations(state.campaign).find((c) => !isDeferred(state.campaign.deferrals, scenarioMatterId(c.def.id), state.campaign.calendar) &&
                !chargedThisWeek(state.campaign, c.def.id));
            if (cast) {
                base = state.campaign;
                scenarioId = cast.def.id;
                break;
            }
            await scout.continueUntilAttention(1, { basis: state.campaign });
        }
        if (!base || !scenarioId)
            throw new Error("no chargeable pending document reached the desk");
        // Baseline: with no docket-silence flag, Continue charges the walked-past
        // document — so the assertion below is not vacuous.
        const bare = freshStore();
        await bare.begin(base);
        const bareBefore = chargesFor(base, scenarioId);
        await bare.continueUntilAttention(undefined, { basis: base });
        const bareState = bare.getState();
        if (bareState.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(chargesFor(bareState.campaign, scenarioId) - bareBefore).toBeGreaterThan(0);
        // With the docket's mark set, Continue skips the charge for that scenario…
        const silenced = freshStore();
        await silenced.begin(base);
        await silenced.commit({
            source: "simulate",
            actor: "world",
            turn: base.turn,
            narration: { summary: "The held docket already priced this silence." },
            effects: [{ kind: "flag", set: [docketSilenceFlag(scenarioId)] }],
        });
        const primed = silenced.getState();
        if (primed.status !== "ready")
            throw new Error("expected a ready campaign");
        const silencedBefore = chargesFor(primed.campaign, scenarioId);
        await silenced.continueUntilAttention(undefined, { basis: primed.campaign });
        const silencedState = silenced.getState();
        if (silencedState.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(chargesFor(silencedState.campaign, scenarioId) - silencedBefore).toBe(0);
        // …and the run still spends time, because the deferral is still applied. Not
        // a turn boundary: the run legitimately stops inside the week on a matter
        // that arrived while it was running.
        expect(daysBetween(base.calendar, silencedState.campaign.calendar)).toBeGreaterThan(0);
    }, 30_000);
});
