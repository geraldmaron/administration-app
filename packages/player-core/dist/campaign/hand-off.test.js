import { describe, expect, it } from "vitest";
import { addDays, daysBetween, pledgeId, selectPlayerLedger } from "@admin/engine";
import { scenarioCaseId, scenarioUnansweredFlag } from "@admin/content";
import { platformPlanks } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { pendingConversations, scenarioMatterSource } from "../conversation/scripts";
import { deskMatterSource, owedItems } from "../desk/attention";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { handOffPlan, mustComeFromPresident } from "./hand-off";
import { createCampaignStore } from "./store";
function row(overrides) {
    return {
        id: "row",
        source: "agency-request",
        urgency: "soft",
        subject: "row",
        title: "A row",
        reason: "Because.",
        href: "/",
        stance: "caution",
        icon: "decision",
        ...overrides,
    };
}
function pledgeDueIn(campaign, index, days) {
    const plank = platformPlanks[index].id;
    return { id: pledgeId(plank), plank, madeDate: campaign.calendar, dueDate: addDays(campaign.calendar, days), firstHundredDays: true, status: "open" };
}
/** The opening with two promises on the Desk: one at its last call, one a week and a half out. */
function withPromises(lastCallDays) {
    const opening = openingCampaign();
    return { ...opening, pledges: [pledgeDueIn(opening, 0, lastCallDays), pledgeDueIn(opening, 1, 10)] };
}
async function storeOn(campaign) {
    const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()), matterSources: [deskMatterSource, scenarioMatterSource] });
    await store.begin(campaign);
    const ready = () => {
        const state = store.getState();
        if (state.status !== "ready")
            throw new Error("expected a ready campaign");
        return state.campaign;
    };
    return { store, ready };
}
describe("what a chief of staff may not take", () => {
    const today = { year: 2029, month: 3, day: 1 };
    it("keeps the office's own deadlines, a statute's clock and a last call with the President", () => {
        expect(mustComeFromPresident(row({ source: "bill-signature", urgency: "hard" }), today)).toBe(true);
        expect(mustComeFromPresident(row({ source: "constitutional-deadline", urgency: "ambient" }), today)).toBe(true);
        expect(mustComeFromPresident(row({ source: "military-escalation", urgency: "hard", clock: { kind: "statutory", name: "War powers clock", window: 9, consumed: 2, unit: "week", statute: "War Powers Resolution" } }), today)).toBe(true);
        expect(mustComeFromPresident(row({ source: "pledge", dueDate: addDays(today, 2) }), today)).toBe(true);
    });
    it("lets a story, a request and a promise still weeks out be handed off", () => {
        expect(mustComeFromPresident(row({ source: "scandal", urgency: "hard" }), today)).toBe(false);
        expect(mustComeFromPresident(row({ source: "agency-request" }), today)).toBe(false);
        expect(mustComeFromPresident(row({ source: "pledge", dueDate: addDays(today, 10) }), today)).toBe(false);
    });
});
// Promises wait for their last call by default; set to stop on arrival, the one
// a week and a half out is a soft matter on the Desk now, which is the kind a
// chief of staff can take.
const PAUSE_PLEDGES = { pledge: "pause" };
describe("handing the rest to the Chief of Staff", () => {
    it("leaves a hard matter holding the desk, resolves the rest, and does not run the world", async () => {
        const campaign = withPromises(1);
        const plan = handOffPlan(campaign, PAUSE_PLEDGES);
        expect(plan.kept.map((item) => item.source)).toEqual(["pledge"]);
        expect(plan.rows.length).toBeGreaterThan(0);
        expect(plan.decisions.length).toBe(1);
        const { store, ready } = await storeOn(campaign);
        await store.handOffAndContinue(undefined, { basis: ready(), settings: PAUSE_PLEDGES });
        const after = ready();
        expect(after.calendar).toEqual(campaign.calendar);
        const owed = owedItems(after, PAUSE_PLEDGES);
        expect(owed.map((item) => item.id)).toEqual(plan.kept.map((item) => item.id));
        expect(pendingConversations(after)).toEqual([]);
    });
    it("resolves every soft matter, puts each on the Record, and runs the world", async () => {
        const campaign = withPromises(10);
        const plan = handOffPlan(campaign, PAUSE_PLEDGES);
        expect(plan.kept).toEqual([]);
        expect(plan.rows.length).toBeGreaterThan(0);
        const decision = plan.decisions[0];
        const rowTitles = plan.rows.map((item) => item.title);
        const { store, ready } = await storeOn(campaign);
        await store.handOffAndContinue(undefined, { basis: ready(), settings: PAUSE_PLEDGES });
        const after = ready();
        expect(daysBetween(campaign.calendar, after.calendar)).toBeGreaterThan(0);
        const record = selectPlayerLedger(after).map((entry) => entry.description);
        expect(record).toContain(`Handed to the Chief of Staff: ${decision.script.subject}.`);
        for (const title of rowTitles)
            expect(record).toContain(`Put off: ${title}.`);
        expect(after.cases?.[scenarioCaseId(decision.def.id)]?.status).toBe("defaulted");
    });
    it("charges a handed-off decision as the silence it is, once", async () => {
        const campaign = openingCampaign();
        const decision = pendingConversations(campaign)[0];
        const { store, ready } = await storeOn(campaign);
        await store.handOffAndContinue(0, { basis: ready(), settings: PAUSE_PLEDGES });
        const mark = scenarioUnansweredFlag(decision.def.id);
        const charges = ready().ledger.filter((entry) => (entry.causal?.marks ?? []).includes(mark));
        expect(charges).toHaveLength(1);
    });
    it("leaves plain Continue free to run once the hand-off has cleared the desk", async () => {
        const { store, ready } = await storeOn(withPromises(10));
        await store.handOffAndContinue(0, { basis: ready(), settings: PAUSE_PLEDGES });
        const handed = ready();
        expect(pendingConversations(handed)).toEqual([]);
        await store.continueUntilAttention(7, { basis: handed });
        expect(daysBetween(handed.calendar, ready().calendar)).toBeGreaterThan(0);
    });
});
describe("one advance path", () => {
    it("stages the same document on the same day whether the day is spent by Continue or by the clock", async () => {
        const campaign = openingCampaign();
        // Nine office days crosses the first week boundary while this seed's first
        // document (staged on day one, closing on day ten) is still on the docket.
        // A horizon past its close lands in the quiet gap before the next one and
        // would compare two empty dockets.
        const DAYS = 9;
        const byClock = await storeOn(campaign);
        for (let day = 0; day < DAYS; day += 1)
            await byClock.store.stepClockDay({ persist: false });
        // No matter sources on this store's run would stop it; the horizon is the
        // same office days the clock spent one at a time.
        const plain = createCampaignStore({ saves: createSaveStore(createMemoryStorage()) });
        await plain.begin(campaign);
        await plain.continueUntilAttention(DAYS);
        const continued = plain.getState();
        if (continued.status !== "ready")
            throw new Error("expected a ready campaign");
        const clocked = byClock.ready();
        expect(continued.campaign.calendar).toEqual(clocked.calendar);
        expect(clocked.docket?.length ?? 0).toBeGreaterThan(0);
        expect(continued.campaign.docket).toEqual(clocked.docket);
    });
});
