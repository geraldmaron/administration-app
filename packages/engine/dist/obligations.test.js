import { describe, expect, it } from "vitest";
import { STATE_IDS } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { advanceTurn } from "./turn-loop.js";
import { grievanceLean } from "./state-geography.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { answerReliefClaims, claimFor, claimWeightFor, claimWindowTurns, obligationPhase, reliefSignature, estimatedPublicLossUSDm, STATEWIDE_PER_CAPITA_INDICATOR, CLAIM_WINDOW_MAX_TURNS, CLAIM_WINDOW_MIN_TURNS, } from "./obligations.js";
import { apply } from "./effects.js";
import { conditionImpactEvent } from "./impact-adapters.js";
import { declareStaffordDisaster } from "./stafford.js";
/** A president of one of the two majors, anchored on their own caucus. */
const standing = (party) => ({
    administrationParty: party,
    caucusAnchor: party,
});
const { campaign: base } = foundedForBalance("obligations");
function withCondition(campaign, over = {}) {
    const condition = {
        id: "condition:flood:USA:1",
        nation: campaign.founding.nation,
        kind: "flood",
        scope: "region",
        severity: 0.6,
        startedTurn: campaign.turn,
        status: "active",
        beats: [],
        state: "MI",
        ...over,
    };
    return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}
describe("the claim window", () => {
    it("gives a mild emergency more patience than a catastrophe", () => {
        expect(claimWindowTurns(0)).toBe(CLAIM_WINDOW_MAX_TURNS);
        expect(claimWindowTurns(1)).toBe(CLAIM_WINDOW_MIN_TURNS);
        expect(claimWindowTurns(0.3)).toBeGreaterThan(claimWindowTurns(0.9));
    });
});
describe("claim weight", () => {
    it("scales with severity", () => {
        const mild = { ...base.conditions, severity: 0.2 };
        expect(claimWeightFor({ ...mild, severity: 0.9, state: "MI" })).toBeGreaterThan(claimWeightFor({ ...mild, severity: 0.2, state: "MI" }));
    });
    it("charges a nationwide slump far less per state than a local emergency", () => {
        const local = { kind: "flood", severity: 0.6, state: "MI" };
        const national = { kind: "recession", severity: 0.6 };
        expect(claimWeightFor(national)).toBeLessThan(claimWeightFor(local));
        expect(claimWeightFor(national)).toBeGreaterThan(0);
    });
    it("charges every state inside a nationwide hazard's footprint as one living through it", () => {
        const local = { kind: "flood", severity: 0.6, state: "MI" };
        const footprint = { kind: "flood", severity: 0.6 };
        expect(claimWeightFor(footprint)).toBe(claimWeightFor(local));
    });
});
describe("obligationPhase", () => {
    it("opens one claim against the state the emergency names", () => {
        const packets = obligationPhase(withCondition(base));
        expect(packets).toHaveLength(1);
        const effect = packets[0].effects[0];
        expect(effect).toMatchObject({ kind: "state", state: "MI" });
    });
    it("opens claims across a nationwide hazard's footprint, one Census region of eligible states", () => {
        // The broadest emergencies name no single place. Left unclaimed they would
        // be the ones it is safe to ignore; claimed in all fifty-one states they
        // would file a request from Alaska for a Gulf hurricane. One packet for one
        // event, carrying its reach as effects.
        const packets = obligationPhase(withCondition(base, { scope: "nation", state: undefined }));
        expect(packets).toHaveLength(1);
        const states = packets[0].effects.map((effect) => effect.state);
        expect(states.length).toBeGreaterThan(1);
        expect(states.length).toBeLessThan(STATE_IDS.length);
        expect(new Set(states.map((id) => base.states[id].base.region)).size).toBe(1);
        expect(packets[0].narration.summary).toMatch(/states are waiting/);
    });
    it("asks every state about a nationwide recession, and no state about a strike or a detention abroad", () => {
        const recession = obligationPhase(withCondition(base, { kind: "recession", scope: "nation", state: undefined }));
        expect(recession[0].effects).toHaveLength(STATE_IDS.length);
        for (const kind of ["work-stoppage", "wrongful-detention"]) {
            expect(obligationPhase(withCondition(base, { kind, scope: "nation", state: undefined }))).toEqual([]);
        }
    });
    it("opens nothing for a condition that did not start this turn", () => {
        // The trap this guards: re-opening every week would reset the deadline every
        // week, so no claim could ever expire and the neglect could never be charged.
        const older = withCondition({ ...base, turn: base.turn + 4 }, { startedTurn: base.turn });
        expect(obligationPhase(older)).toEqual([]);
    });
    it("opens nothing for a resolved condition", () => {
        expect(obligationPhase(withCondition(base, { status: "resolved" }))).toEqual([]);
    });
});
describe("the whole neglect chain", () => {
    it("turns an ignored emergency into a lasting mark and moves the state against you", () => {
        // The point of the whole slice: before this, PendingClaim had no producer,
        // so this chain — condition, claim, silence, mark, lean — could not run at
        // all. Every link here is existing machinery except the first.
        const { campaign: founded, charter } = foundedForBalance("neglect-chain");
        let campaign = withCondition(founded);
        const phases = campaignTurnPhases(charter);
        const leanBefore = campaign.states["MI"].lean;
        // The week it opens: the ledger puts the claim on the books.
        campaign = advanceTurn(campaign, phases);
        const opened = campaign.states["MI"].claims.filter((c) => c.signature === "relief:flood");
        expect(opened).toHaveLength(1);
        // Nobody answers. Run past the window and the silence is written down.
        for (let week = 0; week < CLAIM_WINDOW_MAX_TURNS + 2; week += 1) {
            campaign = advanceTurn(campaign, phases);
        }
        const state = campaign.states["MI"];
        expect(state.claims.some((c) => c.signature === "relief:flood")).toBe(false);
        const omission = state.marks.find((mark) => mark.signature === "omitted:relief:flood");
        expect(omission).toBeDefined();
        expect(omission.valence).toBe(-1);
        expect(omission.weight).toBeGreaterThan(0);
        expect(state.lean).not.toBe(leanBefore);
    });
});
describe("answering a claim", () => {
    it("removes the claim and leaves the state remembering it was helped", () => {
        const claim = claimFor({ kind: "flood", severity: 0.6, state: "MI" }, "Michigan", 1);
        const campaign = {
            ...base,
            states: {
                ...base.states,
                ["MI"]: { ...base.states["MI"], claims: [claim] },
            },
        };
        const effect = answerReliefClaims(campaign, "MI", "flood");
        expect(effect).toMatchObject({ kind: "state", state: "MI", replaceClaims: [] });
        // The mirror of the omission mark. A state that can remember being
        // abandoned has to be able to remember being helped, or federal attention
        // can only ever fail to be enough.
        expect(effect.addMark).toMatchObject({ signature: "answered:relief:flood", valence: 1 });
    });
    it("answers nothing when the state was never asked", () => {
        expect(answerReliefClaims(base, "MI", "flood")).toBeUndefined();
    });
    it("answers only the kind it was asked about", () => {
        const flood = claimFor({ kind: "flood", severity: 0.5, state: "MI" }, "Michigan", 1);
        const fire = claimFor({ kind: "wildfire", severity: 0.5, state: "MI" }, "Michigan", 1);
        const campaign = {
            ...base,
            states: { ...base.states, ["MI"]: { ...base.states["MI"], claims: [flood, fire] } },
        };
        const effect = answerReliefClaims(campaign, "MI", "flood");
        expect(effect?.replaceClaims).toEqual([fire]);
        expect(reliefSignature("flood")).toBe("relief:flood");
    });
});
describe("neglect is punished under either party", () => {
    // The bug this guards: a mark's valence is administration-relative while
    // `lean` is partisan (Dem ← → Rep), and the conversion between them used to
    // ignore which party held the office. Under the default Democratic
    // administration, abandoning a state drifted it *toward* the president's own
    // party — neglect was rewarded, and relief punished, on every Democratic run.
    const against = [
        { turn: 1, signature: "omitted:relief:flood", weight: 0.5, valence: -1, decayRate: 0.03, reason: "ignored" },
    ];
    const forThem = [
        { turn: 1, signature: "answered:relief:flood", weight: 0.5, valence: 1, decayRate: 0.03, reason: "helped" },
    ];
    it("moves a state away from a Democratic president who ignored it", () => {
        // Away from the Democrats is toward the Republican pole, which is positive.
        expect(grievanceLean(against, standing("democrat"))).toBeGreaterThan(0);
        expect(grievanceLean(forThem, standing("democrat"))).toBeLessThan(0);
    });
    it("moves a state away from a Republican president who ignored it", () => {
        expect(grievanceLean(against, standing("republican"))).toBeLessThan(0);
        expect(grievanceLean(forThem, standing("republican"))).toBeGreaterThan(0);
    });
    it("is symmetric: the same neglect costs each party the same distance", () => {
        expect(Math.abs(grievanceLean(against, standing("democrat")))).toBeCloseTo(Math.abs(grievanceLean(against, standing("republican"))), 10);
    });
});
describe("a governor's Stafford request", () => {
    function opened(over) {
        const campaign = withCondition(base, over);
        const condition = Object.values(campaign.conditions).find((entry) => entry.id === (over.id ?? "condition:flood:USA:1"));
        const impact = conditionImpactEvent(campaign, condition)[0];
        return { ...campaign, impactEvents: { ...campaign.impactEvents, [impact.event.spec.id]: impact.event } };
    }
    const requests = (campaign) => obligationPhase(campaign).flatMap((packet) => packet.effects).flatMap((effect) => (effect.kind === "state" && effect.setStaffordRequest ? [effect] : []));
    it("files no request from a state the hazard did not reach, and none for a heat wave with no public damage behind it", () => {
        const heat = opened({ id: "condition:heat-wave:USA:1", kind: "heat-wave", scope: "nation", state: undefined, severity: 0.9 });
        expect(requests(heat).length).toBeLessThan(STATE_IDS.length);
        expect(requests(heat)).toHaveLength(0);
    });
    it("reads the damage against the state's own population at the per-capita indicator", () => {
        const campaign = opened({ severity: 1, state: "VT" });
        const severe = requests(campaign);
        expect(severe).toHaveLength(1);
        expect(severe[0].setStaffordRequest.beyondStateCapacity).toBe(true);
        const damage = estimatedPublicLossUSDm(campaign, campaign.conditions["condition:flood:USA:1"]);
        expect(damage * 1_000_000).toBeGreaterThanOrEqual(STATEWIDE_PER_CAPITA_INDICATOR * base.states["VT"].population);
    });
    it("finds no capacity shortfall for a mild local flood in a large state", () => {
        const mild = opened({ severity: 0.2, scope: "city", state: "CA" });
        expect(requests(mild).every((effect) => !effect.setStaffordRequest.beyondStateCapacity)).toBe(true);
    });
    it("leaves the legal test to the declaration: a request without the capacity finding cannot be declared", () => {
        const campaign = opened({ severity: 1, state: "VT" });
        const filed = obligationPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
        const request = filed.states["VT"].staffordRequest;
        const refused = { ...filed, states: { ...filed.states, ["VT"]: { ...filed.states["VT"], staffordRequest: { ...request, beyondStateCapacity: false } } } };
        expect(declareStaffordDisaster(refused, "VT").ok).toBe(false);
        expect(declareStaffordDisaster(filed, "VT").ok).toBe(true);
    });
});
