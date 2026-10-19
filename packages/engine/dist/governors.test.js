// Governor seating at founding and drift toward the delegation.
import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, CRADLE_POTOMAC, STATE_IDS, US_ID, defaultFlagDesign, worldDataset, } from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { DELEGATION_DRIFT } from "./delegations.js";
import { GOVERNOR_CONSENT_THRESHOLD, driftGovernorStanding, governorAnswer, governorConsentTerms, governorIsTermLimited, governorWillingness, projectGovernorWillingness, selectGovernor, } from "./governors.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { QUESTION_TERMS } from "./willingness.js";
const SEED = makeCampaignSeed("governor-standing-seed");
function baseChoices(over = {}) {
    const pool = generateFoundingPool(SEED, worldDataset);
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
    const cabinet = Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0].id]));
    return {
        nationId: US_ID,
        nationName: "United States",
        name: "Test Leader",
        title: "President",
        charterId: CHARTER_USA_CONSTITUTION.id,
        cradleId: CRADLE_POTOMAC,
        compactIds: [],
        cabinet,
        flag: defaultFlagDesign,
        leader: { ...defaultLeaderDraft(), name: "Test Leader" },
        ...over,
    };
}
describe("governor standing", () => {
    it("selectGovernor returns a governor for every state at founding", () => {
        const campaign = sealFounding(SEED, worldDataset, baseChoices());
        for (const id of STATE_IDS) {
            if (id === "DC") {
                expect(selectGovernor(campaign, id)).toBeUndefined();
                expect(campaign.states.DC.governor).toBeUndefined();
                continue;
            }
            const standing = selectGovernor(campaign, id);
            expect(standing, id).toBeDefined();
            expect(standing.person).toBeTruthy();
            expect(["democrat", "republican", "independent"]).toContain(standing.party);
            expect(standing.disposition).toBe(campaign.states[id].delegation.disposition);
            const person = campaign.people[standing.person];
            expect(person?.currentRole).toBe("role-governor");
            expect(person?.state).toBe(id);
        }
    });
    it("drifts toward the delegation disposition on DELEGATION_DRIFT terms", () => {
        const standing = { person: "PER-gov", party: "democrat", disposition: 0.4 };
        // Far from target: one step of DELEGATION_DRIFT.
        const stepped = driftGovernorStanding(standing, 0.7);
        expect(stepped.disposition).toBeCloseTo(0.4 + DELEGATION_DRIFT, 5);
        // Within one step: snap exactly onto the target (term boundary).
        const snapped = driftGovernorStanding({ ...standing, disposition: 0.69 }, 0.7);
        expect(snapped.disposition).toBe(0.7);
        // Already there: unchanged.
        expect(driftGovernorStanding(snapped, 0.7)).toEqual(snapped);
    });
});
// --- What a governor says when Washington asks ------------------------------
describe("a governor's answer", () => {
    const streams = createRngStreams(makeCampaignSeed("governor-consent"));
    const FOUNDED = foundedForBalance("governor-consent").campaign;
    it("weighs the six terms the question declares and nothing else", () => {
        const terms = governorConsentTerms(FOUNDED, "OH", { severity: 0.4, of: "guard" });
        expect(terms.map((term) => term.key)).toEqual(QUESTION_TERMS["governor-consent"]);
    });
    it("answers exactly where the old midpoint gate answered when nothing else is in play", () => {
        // The state-lean term opens at the statehouse's own disposition and the
        // threshold is the midpoint, so a request with no disaster behind it, from a
        // President of no party, to a governor of none, lands on the old gate.
        const quiet = { severity: 0, of: "consent" };
        for (const state of ["OH", "CA", "TX"]) {
            const projection = projectGovernorWillingness(FOUNDED, state, quiet);
            const disposition = FOUNDED.states[state].governor.disposition;
            expect(Math.sign(projection.margin) || 0, state).toBe(Math.sign(projection.score - GOVERNOR_CONSENT_THRESHOLD) || 0);
            expect(projection.threshold).toBe(GOVERNOR_CONSENT_THRESHOLD);
            expect(projection.score, state).toBeGreaterThan(disposition - 0.4);
        }
    });
    it("carries a disaster toward yes and never past its own bound", () => {
        const calm = projectGovernorWillingness(FOUNDED, "OH", { severity: 0, of: "guard" });
        const crisis = projectGovernorWillingness(FOUNDED, "OH", { severity: 1, of: "guard" });
        expect(crisis.score - calm.score).toBeCloseTo(0.2, 6);
    });
    it("gives two same-party governors with the same delegation different answers on lean and on timing", () => {
        // Same party, same delegation disposition, different politics at home and a
        // different distance from their own voters: the answer has to move, or the
        // model is reading a party label and calling it a position.
        const pair = ["AL", "VT"];
        const aligned = pair.map((state) => ({
            ...FOUNDED.states[state],
            governor: { ...FOUNDED.states[state].governor, party: "democrat", disposition: 0.5 },
            delegation: { ...FOUNDED.states[state].delegation, disposition: 0.5 },
        }));
        const campaign = {
            ...FOUNDED,
            calendar: { year: 2030, month: 9, day: 1 },
            states: { ...FOUNDED.states, AL: aligned[0], VT: aligned[1] },
        };
        const ask = { severity: 0.3, of: "guard" };
        const first = projectGovernorWillingness(campaign, "AL", ask);
        const second = projectGovernorWillingness(campaign, "VT", ask);
        expect(first.score).not.toBe(second.score);
        expect(first.leading.length).toBeGreaterThan(0);
    });
    it("stamps the answer onto the packet's provenance, refusal or not", () => {
        const answer = governorAnswer(FOUNDED, "WY", { severity: 0, of: "guard" }, streams);
        const applied = apply(FOUNDED, answer.packet);
        const causal = applied.ledger.at(-1).causal;
        expect(causal.origin).toBe("decision");
        const stamp = causal.decision;
        expect(stamp.question).toBe("governor-consent");
        expect(stamp.actor).toBe("WY");
        expect(stamp.acts).toBe(answer.consents);
        expect(stamp.terms.map((term) => term.key)).toEqual(QUESTION_TERMS["governor-consent"]);
        expect(stamp.visibility).toBe("public");
    });
    it("projects without a draw and decides with exactly one", () => {
        let drawn = 0;
        const counted = {
            stream: (...parts) => {
                drawn += 1;
                return streams.stream(...parts);
            },
        };
        projectGovernorWillingness(FOUNDED, "OH", { severity: 0.2, of: "guard" });
        expect(drawn).toBe(0);
        governorWillingness(FOUNDED, "OH", { severity: 0.2, of: "guard" }, counted);
        expect(drawn).toBe(1);
    });
    it("reads a term limit off the state's own rule and off terms actually won in game", () => {
        // Nobody is term-limited at founding: how long a seated governor had already
        // served is not a fact the dataset carries.
        expect(governorIsTermLimited(FOUNDED, "OH")).toBe(false);
        const twice = (state) => ({
            ...FOUNDED,
            states: {
                ...FOUNDED.states,
                [state]: { ...FOUNDED.states[state], governor: { ...FOUNDED.states[state].governor, termsWon: 2 } },
            },
        });
        // Ohio caps consecutive terms at two; Texas does not cap them at all.
        expect(governorIsTermLimited(twice("OH"), "OH")).toBe(true);
        expect(governorIsTermLimited(twice("TX"), "TX")).toBe(false);
    });
});
