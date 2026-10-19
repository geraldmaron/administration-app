import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { INSTRUMENT_COERCION } from "./instruments.js";
import { INSTRUMENT_IDS } from "./instrument-ids.js";
import { outletActReading, presidentialActs, recentActPull } from "./press-beliefs.js";
import { PRESS_OUTLETS } from "./press-outlets.js";
import { selectOutlets } from "./press.js";
// The desks read the record. These hold that the record they read is the one
// the presidency actually leaves behind, rather than the seven-entry order
// catalogue it used to be.
const decided = (turn, description, extra = {}) => ({
    turn,
    actor: "player",
    description,
    causal: {
        origin: "decision",
        eventId: `ev-${turn}-${description.length}`,
        createdDate: { year: 2029, month: 1, day: 1 },
    },
    ...extra,
});
const committed = (instrument, rung) => ({
    commitment: { instrument, rung, target: "ALP" },
});
const withLedger = (entries, turn = 20) => ({
    ...buildCampaign(),
    turn,
    orders: [],
    judiciary: { cases: [] },
    ledger: [...entries],
});
const signed = (order, turn) => ({
    id: `${order}:${turn}`,
    order,
    turn,
    contested: false,
    challengeChance: 0.1,
});
describe("the press reading of an instrument", () => {
    // INSTRUMENT_STANCE is not exported and must not be imported from
    // instruments.ts at runtime — see the module comment on why. This is the
    // gate that keeps the two statements of one fact from drifting: the press's
    // reading of each instrument is exactly the ladder's own coercion figure,
    // centered on the middle of its scale.
    it("is the ladder's own coercion ordering, centered", () => {
        for (const instrument of INSTRUMENT_IDS) {
            const campaign = withLedger([decided(20, "an order given", committed(instrument, 5))]);
            const { pull } = recentActPull(campaign);
            expect(pull.nationalistGlobalist ?? 0).toBeCloseTo((INSTRUMENT_COERCION[instrument] - 0.5) * 2 * 0.08, 6);
        }
    });
    it("scales with the rung, because a demarche is not a blockade", () => {
        const light = withLedger([decided(20, "a note delivered", committed("military", 1))]);
        const heavy = withLedger([decided(20, "the fleet sails", committed("military", 5))]);
        expect(recentActPull(heavy).pull.nationalistGlobalist).toBeGreaterThan(recentActPull(light).pull.nationalistGlobalist);
    });
    it("says nothing about what a government believes at home", () => {
        const campaign = withLedger([decided(20, "sanctions imposed", committed("economic", 5))]);
        expect(recentActPull(campaign).pull.economicLeftRight).toBeUndefined();
    });
});
describe("what the corps can read off a term of decisions", () => {
    // The finding this closes: a president answers the week for four years and
    // the mastheads' reading of them stays at exactly zero unless they happen to
    // sign one of seven executive orders.
    const answered = Array.from({ length: 10 }, (_, index) => decided(11 + index, `The President answers week ${11 + index}`, {
        ...committed("military", 4),
        institutional: ["emergency-powers-invoked", "forces-committed"],
    }));
    it("reads a non-zero act term with no order signed at all", () => {
        const campaign = withLedger(answered);
        expect(campaign.orders).toHaveLength(0);
        const reads = selectOutlets(campaign).map((entry) => entry.read.reading);
        expect(reads.some((reading) => reading !== 0)).toBe(true);
    });
    it("moves two desks in opposite directions over the same record", () => {
        const campaign = withLedger(answered);
        const reads = selectOutlets(campaign).map((entry) => entry.read.reading);
        expect(reads.some((reading) => reading > 0)).toBe(true);
        expect(reads.some((reading) => reading < 0)).toBe(true);
    });
    it("names the most recent act that said something", () => {
        const campaign = withLedger(answered);
        expect(recentActPull(campaign).act?.name).toBe("The President answers week 20");
        expect(recentActPull(campaign).act?.turn).toBe(20);
    });
    it("still reads an administration that has done nothing as silent", () => {
        const campaign = withLedger([]);
        expect(recentActPull(campaign).act).toBeUndefined();
        for (const outlet of PRESS_OUTLETS) {
            expect(outletActReading(outlet.beliefs, recentActPull(campaign).pull)).toBe(0);
        }
    });
});
describe("what the ledger half deliberately does not read", () => {
    it("ignores what the administration did not choose", () => {
        // The player half of the ledger also carries what an agency executed and
        // what the calendar reached. A masthead argues with a government about
        // what the government chose.
        const executed = {
            turn: 20,
            actor: "player",
            description: "The department issues the rule",
            ...committed("military", 5),
            causal: {
                origin: "institution",
                eventId: "ev-20-1",
                createdDate: { year: 2029, month: 1, day: 1 },
            },
        };
        expect(recentActPull(withLedger([executed])).act).toBeUndefined();
    });
    it("forgets an act older than the corps's memory", () => {
        const stale = withLedger([decided(1, "a first-week order", committed("military", 5))], 40);
        expect(recentActPull(stale).act).toBeUndefined();
    });
    it("scores a price as a price rather than as a position", () => {
        // A strained civil service and a spent legislative majority are what an act
        // cost, not what it argued for.
        const priced = withLedger([
            decided(20, "the agencies absorb it", { institutional: ["civil-service-strained", "legislative-capital-spent"] }),
        ]);
        expect(recentActPull(priced).act).toBeUndefined();
    });
});
describe("the whole record, for a surface that has to name it", () => {
    it("carries orders and decisions together, oldest first", () => {
        const campaign = {
            ...withLedger([decided(19, "the President commits forces", committed("military", 4))]),
            orders: [signed("order-price-controls", 18)],
        };
        const acts = presidentialActs(campaign);
        expect(acts.map((act) => act.kind)).toEqual(["order", "decision"]);
        expect(acts.map((act) => act.turn)).toEqual([18, 19]);
        expect(acts[0].name).toBe("Freeze prices and wages");
    });
    it("keeps an act that said nothing, because it is still an act they took", () => {
        const campaign = withLedger([decided(20, "The President says no")]);
        expect(presidentialActs(campaign)).toHaveLength(1);
        expect(recentActPull(campaign).act).toBeUndefined();
    });
});
