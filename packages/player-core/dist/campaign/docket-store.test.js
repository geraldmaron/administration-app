import { describe, expect, it } from "vitest";
import { addDays, createSave, CURRENT_SCHEMA_VERSION, dayOfWeekInOffice, isDeferred, loadSave, makeCampaignSeed, sealFounding, } from "@admin/engine";
import { scenarioUnansweredFlag } from "@admin/content";
import { worldDataset } from "@admin/world";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { deskMatterSource } from "../desk/attention";
import { chargedThisWeek } from "../conversation/lapse-source";
import { pendingConversations, scenarioMatterId, scenarioMatterSource } from "../conversation/scripts";
import { deferMatterPacket } from "./stop-brief";
import { foundingOptions, openingChoices } from "./founding-options";
import { openingCampaign } from "../__fixtures__/opening";
import { createCampaignStore } from "./store";
function foundedCampaign() {
    const seed = makeCampaignSeed("surface-audit-a");
    const choices = openingChoices(foundingOptions(seed));
    return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
}
function unansweredCharges(store, scenarioId) {
    const state = store.getState();
    if (state.status !== "ready")
        throw new Error("expected a ready campaign");
    const mark = scenarioUnansweredFlag(scenarioId);
    return state.campaign.ledger.filter((entry) => (entry.causal?.marks ?? []).includes(mark)).length;
}
describe("held documents in the player store", () => {
    const campaign = openingCampaign();
    function note(summary, effects) {
        return {
            source: "conversation",
            actor: "player",
            turn: campaign.turn,
            narration: { summary },
            effects,
        };
    }
    it("drops a held document in the same commit that answers it", async () => {
        const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()) });
        await store.begin(campaign);
        const entry = {
            id: "scenario:border",
            ref: { scenario: "border" },
            arrives: campaign.calendar,
            closes: addDays(campaign.calendar, 10),
        };
        await store.commit(note("A document is held.", [{ kind: "docket", admit: [entry] }]));
        await store.commit(note("The president answers.", [{ kind: "flag", set: [entry.id] }]));
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.docket).toEqual([]);
        expect(state.campaign.player.flags[scenarioUnansweredFlag("border")]).not.toBe(true);
    });
    it("keeps a held document on the docket when its matter is put off (Desk put-off through commit)", async () => {
        const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()) });
        await store.begin(campaign);
        const entry = {
            id: "scenario:border",
            ref: { scenario: "border" },
            arrives: campaign.calendar,
            closes: addDays(campaign.calendar, 10),
        };
        await store.commit(note("A document is held.", [{ kind: "docket", admit: [entry] }]));
        const held = store.getState();
        if (held.status !== "ready")
            throw new Error("expected a ready campaign");
        const matter = {
            id: entry.id,
            source: "scenario",
            urgency: "hard",
            title: "The border question waits.",
            reason: "It waits on your answer.",
            subject: "scenario:migration",
            date: held.campaign.calendar,
        };
        // The Desk's put-off commits exactly this packet. It writes an attention
        // deferral, not a docket removal, so the entry must stand.
        await store.commit(deferMatterPacket(held.campaign, matter));
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        expect(state.campaign.docket?.map((e) => e.id)).toEqual([entry.id]);
        expect(isDeferred(state.campaign.deferrals, entry.id, state.campaign.calendar)).toBe(true);
    });
    it("charges a held document's silence once when its window closes, and not again on the next clock day (Desk clock step)", async () => {
        const store = createCampaignStore({
            saves: createSaveStore(createMemoryStorage()),
            matterSources: [deskMatterSource, scenarioMatterSource],
        });
        await store.begin(foundedCampaign());
        // A real pending cast the docket can hold, reached on a day whose next step
        // stays inside the same office week, and not yet charged this week.
        let target;
        for (let press = 0; press < 20 && !target; press += 1) {
            const state = store.getState();
            if (state.status !== "ready")
                throw new Error("expected a ready campaign");
            const cast = pendingConversations(state.campaign).find((c) => !chargedThisWeek(state.campaign, c.def.id));
            if (cast && dayOfWeekInOffice(state.campaign) <= 6) {
                target = { campaign: state.campaign, scenarioId: cast.def.id };
                break;
            }
            await store.continueUntilAttention(1, { basis: state.campaign });
        }
        if (!target)
            throw new Error("no pending, un-charged document reached the desk to hold");
        const entry = {
            id: scenarioMatterId(target.scenarioId),
            ref: { scenario: target.scenarioId },
            arrives: target.campaign.calendar,
            closes: addDays(target.campaign.calendar, 1),
        };
        await store.commit(note("Hold a document whose window closes tomorrow.", [{ kind: "docket", admit: [entry] }]));
        const before = unansweredCharges(store, target.scenarioId);
        await store.stepClockDay(); // steps onto the close: the lapse charges once
        const afterClose = unansweredCharges(store, target.scenarioId);
        expect(afterClose - before).toBe(1);
        await store.stepClockDay(); // the entry is gone; a second step must not re-charge it
        expect(unansweredCharges(store, target.scenarioId) - afterClose).toBe(0);
    }, 30_000);
    it("loads a save that has no docket without writing one", async () => {
        const file = createSave(campaign);
        const loaded = loadSave(JSON.parse(JSON.stringify(file)));
        expect(file.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(loaded.docket).toBeUndefined();
        expect(loaded).toEqual(file.campaign);
    });
});
