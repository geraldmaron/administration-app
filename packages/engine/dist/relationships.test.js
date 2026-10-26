import { describe, it, expect } from "vitest";
import { buildCampaign, nationA, nationB, relationship } from "./__fixtures__/campaign.js";
import { deedTowardFlag } from "./deeds.js";
import { apply } from "./effects.js";
import { rungDefinition } from "./instruments.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { advanceTurn } from "./turn-loop.js";
import { foundedForBalance } from "./balance-harness.js";
import { TREATY_TERMS } from "./treaties.js";
import { relationshipKey } from "./state.js";
import { FAVOR_HALF_LIFE_DAYS, PRESSURE_BUILD_HALF_LIFE_DAYS, pressDown, pressUp, WAR_GRUDGE_FLOOR, approach, durableShifts, grievanceHalfLifeDays, migrateGrudge, relationshipAnchor, bothDirections, createGrudge, deedPressure, disposition, grudgeDecayPhase, ageGrudge, grudgeDecayRate, grudgeWeight, historyPressure, repeatDrag, } from "./relationships.js";
const phasesWithDecay = { simulate: grudgeDecayPhase, select: () => [] };
describe("relationship directionality", () => {
    it("reads both directions independently, even when only one exists", () => {
        const state = buildCampaign();
        const both = bothDirections(state, relationship.from, relationship.to);
        expect(both.aToB).toEqual(relationship);
        expect(both.bToA).toBeUndefined();
    });
});
describe("grudge decay rate", () => {
    it("decays slower for a more vengeful nation", () => {
        expect(grudgeDecayRate(1)).toBeLessThan(grudgeDecayRate(0.5));
        expect(grudgeDecayRate(0.5)).toBeLessThan(grudgeDecayRate(0));
    });
    it("never goes negative or to zero regardless of vengefulness", () => {
        expect(grudgeDecayRate(1)).toBeGreaterThan(0);
    });
});
describe("grudge decay over the turn loop", () => {
    it("reduces grudge weight each turn and forgets a transient grudge once it has faded", () => {
        // A grievance now halves over years rather than clearing in weeks, so the
        // forgetting is checked on the aging rule directly rather than by running
        // a decade of turns through the loop.
        const withGrudge = apply(buildCampaign(), {
            source: "action",
            actor: "player",
            turn: 1,
            narration: { summary: "A betrayal is remembered" },
            effects: [
                {
                    kind: "relationship",
                    from: relationship.from,
                    to: relationship.to,
                    addGrudge: createGrudge("border incursion", 0.3, 1, 0.5),
                },
            ],
        });
        const weights = [];
        let state = withGrudge;
        for (let i = 0; i < 20; i++) {
            state = advanceTurn(state, phasesWithDecay);
            weights.push(state.relationships[`${relationship.from}:${relationship.to}`].grudges[0]?.weight ?? 0);
        }
        for (let i = 2; i < weights.length; i++)
            expect(weights[i]).toBeLessThan(weights[i - 1]);
        expect(ageGrudge(createGrudge("border incursion", 0.3, 1, 0.5), 365 * 30)).toBeUndefined();
    });
    it("every grudge-decay change is attributable to a packet with narration", () => {
        const withGrudge = apply(buildCampaign(), {
            source: "action",
            actor: "player",
            turn: 1,
            narration: { summary: "A betrayal is remembered" },
            effects: [
                { kind: "relationship", from: relationship.from, to: relationship.to, addGrudge: createGrudge("border incursion", 0.3, 1, 0.5) },
            ],
        });
        // Two weeks, because the first is the week the grievance was planted and
        // decay passes over it — there is nothing to attribute until it ticks.
        const next = advanceTurn(advanceTurn(withGrudge, phasesWithDecay), phasesWithDecay);
        expect(next.ledger.at(-1)?.description).toMatch(/fade with time/);
        // Never by code: the line is the world's bookkeeping, not a named pair.
        expect(next.ledger.at(-1)?.description).not.toContain(relationship.from);
    });
    it("does not age a grievance in the same week it was planted", () => {
        // Decay runs after every phase that plants a grudge, and the runner hands
        // it the state those phases produced. Without the guard the betrayal is
        // already being forgotten in the week it was committed.
        const plant = (state) => [
            {
                source: "simulate",
                actor: "world",
                turn: state.turn,
                narration: { summary: "A betrayal is remembered" },
                effects: [
                    {
                        kind: "relationship",
                        from: relationship.from,
                        to: relationship.to,
                        addGrudge: createGrudge("border incursion", 0.3, state.turn, 0.5),
                    },
                ],
            },
        ];
        const plantThenDecay = { simulate: [plant, grudgeDecayPhase], select: () => [] };
        const weightOf = (state) => state.relationships[`${relationship.from}:${relationship.to}`].grudges.find((g) => g.cause === "border incursion").weight;
        const plantedWeek = advanceTurn(buildCampaign(), plantThenDecay);
        expect(weightOf(plantedWeek)).toBe(0.3);
        // And the clock does start the week after, or the guard is an amnesty.
        expect(weightOf(advanceTurn(plantedWeek, phasesWithDecay))).toBeLessThan(0.3);
    });
    it("a grudge created early measurably shapes disposition many turns later", () => {
        const baseline = buildCampaign();
        const aggrieved = apply(baseline, {
            source: "action",
            actor: "player",
            turn: 1,
            narration: { summary: "A betrayal is remembered" },
            effects: [
                {
                    kind: "relationship",
                    from: relationship.from,
                    to: relationship.to,
                    addGrudge: createGrudge("border incursion", 0.6, 1, 0.9), // high vengefulness -> slow decay
                },
            ],
        });
        let baselineState = baseline;
        let aggrievedState = aggrieved;
        for (let i = 0; i < 15; i++) {
            baselineState = advanceTurn(baselineState, phasesWithDecay);
            aggrievedState = advanceTurn(aggrievedState, phasesWithDecay);
        }
        const baselineRel = baselineState.relationships[`${relationship.from}:${relationship.to}`];
        const aggrievedRel = aggrievedState.relationships[`${relationship.from}:${relationship.to}`];
        expect(grudgeWeight(aggrievedRel)).toBeGreaterThan(0);
        expect(disposition(aggrievedRel)).toBeLessThan(disposition(baselineRel));
    });
});
describe("historyPressure", () => {
    it("is zero for a relationship with no history", () => {
        expect(historyPressure(relationship, 10)).toBe(0);
    });
    it("is zero for history entries no write site's kind ever produces uncoercively or uncooperatively", () => {
        // "demarche" (the softest diplomatic rung), an authored consequence's
        // remembered line, a conversation's recorded position, and an
        // intervention are all logged to history but are deliberately unpriced
        // here — see the why-comment on classifyHistoryEvent in relationships.ts.
        const withUnclassified = {
            ...relationship,
            history: [
                { turn: 1, kind: "demarche", description: "a quiet warning" },
                { turn: 2, kind: "consequence", description: "the affair was noted" },
                { turn: 3, kind: "position", description: "a position was recorded" },
                { turn: 4, kind: "intervention", description: "an intervention occurred" },
            ],
        };
        expect(historyPressure(withUnclassified, 5)).toBe(0);
    });
    it("is negative for a recent severed relationship and positive for a recent guarantee", () => {
        const severed = {
            ...relationship,
            history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
        };
        const guaranteed = {
            ...relationship,
            history: [{ turn: 5, kind: "guarantee", description: "security was guaranteed" }],
        };
        expect(historyPressure(severed, 6)).toBeLessThan(0);
        expect(historyPressure(guaranteed, 6)).toBeGreaterThan(0);
    });
    it("weighs a failed covert operation the same coercive direction as an outright severance", () => {
        const failedOp = {
            ...relationship,
            history: [{ turn: 5, kind: "failed-covert-1", description: "an operation was caught" }],
        };
        expect(historyPressure(failedOp, 6)).toBeLessThan(0);
    });
    it("weighs the most recent classified act more than an older one competing against it", () => {
        // Same two acts, opposite order: whichever is more recent should pull
        // harder, since a nation's read is dominated by what a counterpart has
        // done lately rather than an unweighted tally since founding.
        const recentGuarantee = {
            ...relationship,
            history: [
                { turn: 1, kind: "severance", description: "an old breach" },
                { turn: 10, kind: "guarantee", description: "a fresh guarantee" },
            ],
        };
        const recentSeverance = {
            ...relationship,
            history: [
                { turn: 1, kind: "guarantee", description: "an old guarantee" },
                { turn: 10, kind: "severance", description: "a fresh breach" },
            ],
        };
        expect(historyPressure(recentGuarantee, 11)).toBeGreaterThan(historyPressure(recentSeverance, 11));
    });
    it("stays within a fraction of the trust/tension scale even with a long coercive record", () => {
        const history = Array.from({ length: 20 }, (_, i) => ({
            turn: i,
            kind: "severance",
            description: `breach ${i}`,
        }));
        const longRecord = { ...relationship, history };
        expect(historyPressure(longRecord, 20)).toBeGreaterThan(-0.2);
    });
});
describe("disposition reads relationship.history", () => {
    it("differs measurably between an otherwise-identical relationship with recent coercive history and one without", () => {
        const withoutHistory = relationship;
        const withCoerciveHistory = {
            ...relationship,
            history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
        };
        expect(disposition(withCoerciveHistory)).toBeLessThan(disposition(withoutHistory));
    });
    it("does not double-count a grudge and its history entry when both land on the same relationship", () => {
        // consequences.ts's grudgeEffect and its "remembered" line both write to
        // (target, actor) for the same card; the remembered line is stamped with
        // the generic kind "consequence", which historyPressure does not
        // classify, so only grudgeWeight prices that act.
        const grudgeOnly = {
            ...relationship,
            grudges: [createGrudge("a caught operation", 0.4, 1, 0.5)],
        };
        const grudgeWithRememberedLine = {
            ...grudgeOnly,
            history: [{ turn: 1, kind: "consequence", description: "the affair was noted" }],
        };
        expect(disposition(grudgeWithRememberedLine)).toBe(disposition(grudgeOnly));
    });
});
// The reader is the country the player has been acting on, so the direction
// under test is the counterpart's own view of the administration.
const towardPlayer = { ...relationship, from: nationB.id, to: nationA.id };
function campaignWithFlags(...flags) {
    const base = buildCampaign();
    const raised = Object.fromEntries(flags.map((flag) => [flag, true]));
    return { ...base, player: { ...base.player, flags: { ...base.player.flags, ...raised } } };
}
const pressureOf = (...flags) => deedPressure(campaignWithFlags(...flags).player.flags, towardPlayer, nationA.id);
describe("deedPressure", () => {
    it("builds the flag its writer writes", () => {
        // The one place this module restates another module's string grammar.
        // If the deed flag ever changes shape, this fails rather than the reading
        // silently going quiet.
        const landedMilitary = deedTowardFlag(nationB.id, "military", "high", "landed");
        expect(pressureOf(landedMilitary)).toBeLessThan(0);
    });
    it("is zero when nothing has been done to this nation", () => {
        expect(pressureOf()).toBe(0);
    });
    it("weighs a landed act higher the further up the ladder it sat", () => {
        const low = pressureOf(deedTowardFlag(nationB.id, "military", "low", "landed"));
        const mid = pressureOf(deedTowardFlag(nationB.id, "military", "mid", "landed"));
        const high = pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed"));
        expect(high).toBeLessThan(mid);
        expect(mid).toBeLessThan(low);
        expect(low).toBeLessThan(0);
    });
    it("weighs force over a formal act at the same rung band", () => {
        const demarche = pressureOf(deedTowardFlag(nationB.id, "diplomatic", "high", "landed"));
        const force = pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed"));
        expect(force).toBeLessThan(demarche);
    });
    it("prices nothing for an act that did not land", () => {
        // A visible failure is already carried as a live grudge on this very
        // relationship, and an invisible one is a fact the reader never learned.
        const failures = ["diplomatic", "economic", "covert", "military"].map((family) => deedTowardFlag(nationB.id, family, "high", "failed"));
        expect(pressureOf(...failures)).toBe(0);
    });
    it("prices nothing for aid, which already moves this direction directly", () => {
        expect(pressureOf(deedTowardFlag(nationB.id, "assistance", "high", "landed"))).toBe(0);
    });
    it("does not read covert orders as target knowledge, including legacy flags", () => {
        expect(pressureOf(deedTowardFlag(nationB.id, "covert", "high", "landed"))).toBe(0);
    });
    it("does not charge the administration's own reading of a counterpart with its own acts", () => {
        // `relationship` runs player -> counterpart, and `deed-toward:<X>` is the
        // record of what the player did to X. Reading it on this direction would
        // have a government think worse of a country for what it did to that
        // country itself.
        const ownAct = deedTowardFlag(nationB.id, "military", "high", "landed");
        const playerReadingOfThem = deedPressure(campaignWithFlags(ownAct).player.flags, relationship, nationA.id);
        expect(playerReadingOfThem).toBe(0);
    });
    it("stays within one live grievance's worth however long the record gets", () => {
        const everything = ["diplomatic", "economic", "covert", "military"].flatMap((family) => ["low", "mid", "high"].map((band) => deedTowardFlag(nationB.id, family, band, "landed")));
        const total = pressureOf(...everything);
        expect(total).toBeGreaterThanOrEqual(-0.2);
        expect(total).toBeLessThan(pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed")));
    });
});
describe("disposition reads the deeds done to the reader", () => {
    it("reads a landed coercive act that moves no other term on this relationship", () => {
        // Nothing else on (target -> actor) records a coercive act that worked:
        // the ripple sweep excludes the target by name, only the assistance
        // ladder writes back toward the actor, and the resolver's grudge branch
        // fires on failure. Without this term the reading does not move at all.
        const campaign = campaignWithFlags(deedTowardFlag(nationB.id, "economic", "high", "landed"));
        expect(disposition(towardPlayer, campaign)).toBeLessThan(disposition(towardPlayer));
    });
    it("is unchanged for a caller that has no campaign in hand", () => {
        const campaign = buildCampaign();
        expect(disposition(towardPlayer, campaign)).toBe(disposition(towardPlayer));
    });
    it("does not charge a failed act twice against its own grudge", () => {
        // One caught operation writes a grudge here and a `failed` deed flag in
        // the player's record. Only the grudge may price it.
        const aggrieved = {
            ...towardPlayer,
            grudges: [createGrudge("covert-2", 0.4, 1, 0.5)],
        };
        const campaign = campaignWithFlags(deedTowardFlag(nationB.id, "covert", "high", "failed"));
        expect(disposition(aggrieved, campaign)).toBe(disposition(aggrieved));
    });
    it("charges a landed act and a separate remembered severance once each", () => {
        // A severance the reader itself carried out lands in its own history; a
        // sanction the player landed on it lands in the deed record. Two acts,
        // two terms, and the total is exactly their sum.
        const withOwnSeverance = {
            ...towardPlayer,
            history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
        };
        const flag = deedTowardFlag(nationB.id, "economic", "high", "landed");
        const campaign = campaignWithFlags(flag);
        const deedOnly = disposition(towardPlayer, campaign) - disposition(towardPlayer);
        const historyOnly = disposition(withOwnSeverance) - disposition(towardPlayer);
        expect(disposition(withOwnSeverance, campaign) - disposition(towardPlayer)).toBeCloseTo(deedOnly + historyOnly, 10);
    });
});
describe("repeatDrag", () => {
    function withHistory(turn, history) {
        const base = buildCampaign();
        return {
            ...base,
            turn,
            relationships: {
                ...base.relationships,
                [`${relationship.from}:${relationship.to}`]: { ...relationship, history },
            },
        };
    }
    it("pins 'demarche' to what diplomatic rung 1 actually stamps, so the map cannot drift from its owner", () => {
        // relationships.ts cannot import instruments.ts's value exports (the
        // dependency-direction rule this package's own instruments module warns
        // about at the top of this file), so the kind this module reads for
        // "diplomatic" is checked here against the ladder's real resolve() output
        // instead, the same way deedTowardFlag is pinned against deedPressure below.
        const campaign = buildCampaign();
        const streams = createRngStreams(makeCampaignSeed("pin-test"));
        const effects = rungDefinition("diplomatic", 1).resolve({
            campaign,
            actor: nationA.id,
            target: nationB.id,
            streams,
        });
        const relationshipEffect = effects.find((effect) => effect.kind === "relationship");
        expect(relationshipEffect?.addHistory?.kind).toBe("demarche");
    });
    it("is unaffected by a single, non-repeated act — nothing precedes the first attempt", () => {
        const campaign = withHistory(1, []);
        expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
    });
    it("is zero for a target with no relationship on file", () => {
        const campaign = buildCampaign();
        expect(repeatDrag(campaign, nationB.id, nationA.id, "diplomatic")).toBe(0);
    });
    it("is zero for an instrument the ladder does not yet stamp a repeatable kind for", () => {
        const campaign = withHistory(2, [
            { turn: 1, kind: "demarche", description: "a quiet warning" },
            { turn: 1, kind: "demarche", description: "a second one" },
        ]);
        expect(repeatDrag(campaign, nationA.id, nationB.id, "economic")).toBe(0);
        expect(repeatDrag(campaign, nationA.id, nationB.id, "covert")).toBe(0);
        expect(repeatDrag(campaign, nationA.id, nationB.id, "military")).toBe(0);
    });
    it("raises measurably on the second démarche inside the lookback window", () => {
        const first = withHistory(1, []);
        const second = withHistory(2, [{ turn: 1, kind: "demarche", description: "a quiet warning" }]);
        expect(repeatDrag(first, nationA.id, nationB.id, "diplomatic")).toBe(0);
        expect(repeatDrag(second, nationA.id, nationB.id, "diplomatic")).toBeGreaterThan(0);
    });
    it("grows with each additional repeat, up to its ceiling", () => {
        const history = Array.from({ length: 3 }, (_, i) => ({
            turn: i + 1,
            kind: "demarche",
            description: `warning ${i}`,
        }));
        const campaign = withHistory(5, history);
        const drag = repeatDrag(campaign, nationA.id, nationB.id, "diplomatic");
        expect(drag).toBeGreaterThan(0);
        expect(drag).toBeLessThanOrEqual(0.3);
        const manyHistory = Array.from({ length: 20 }, (_, i) => ({
            turn: i + 1,
            kind: "demarche",
            description: `warning ${i}`,
        }));
        const saturated = withHistory(21, manyHistory);
        expect(repeatDrag(saturated, nationA.id, nationB.id, "diplomatic")).toBe(0.3);
        expect(repeatDrag(saturated, nationA.id, nationB.id, "diplomatic")).toBeGreaterThanOrEqual(drag);
    });
    it("does not count a démarche outside the lookback window", () => {
        const campaign = withHistory(30, [{ turn: 1, kind: "demarche", description: "long ago" }]);
        expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
    });
    it("does not read the mirror direction's history", () => {
        const base = buildCampaign();
        const campaign = {
            ...base,
            turn: 2,
            relationships: {
                ...base.relationships,
                [`${nationB.id}:${nationA.id}`]: {
                    ...relationship,
                    from: nationB.id,
                    to: nationA.id,
                    history: [{ turn: 1, kind: "demarche", description: "a démarche the other way" }],
                },
            },
        };
        expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
    });
    it("does not double-count against historyPressure: 'demarche' is unclassified there", () => {
        const history = [
            { turn: 1, kind: "demarche", description: "a quiet warning" },
            { turn: 2, kind: "demarche", description: "a second one" },
        ];
        expect(historyPressure({ ...relationship, history }, 3)).toBe(0);
        expect(repeatDrag(withHistory(3, history), nationA.id, nationB.id, "diplomatic")).toBeGreaterThan(0);
    });
});
describe("relationship memory ages by the calendar", () => {
    const { campaign: founded } = foundedForBalance("relationship-memory");
    const player = founded.founding.nation;
    const counterpart = Object.values(founded.relationships).find((r) => r.from === player && !r.to.startsWith("U")).to;
    const key = relationshipKey(counterpart, player);
    const edge = founded.relationships[key];
    const npcPair = Object.values(founded.relationships).find((r) => r.from !== player && r.to !== player);
    const weeks = (state, n) => Array.from({ length: n }).reduce((c) => advanceTurn(c, phasesWithDecay), state);
    const withEdge = (patch, base = founded) => ({
        ...base,
        relationships: { ...base.relationships, [key]: { ...base.relationships[key], ...patch } },
    });
    it("uses one approach-to-target form, so pace never changes how much is remembered", () => {
        expect(approach(1, 0, 90, 90)).toBeCloseTo(0.5, 12);
        expect(approach(approach(0.4, 0.1, 7, 273), 0.1, 7, 273)).toBeCloseTo(approach(0.4, 0.1, 14, 273), 12);
        const grudge = createGrudge("slight", 0.3, 1, 0.4);
        const twice = ageGrudge(ageGrudge(grudge, 7), 7);
        expect(twice.weight).toBeCloseTo(ageGrudge(grudge, 14).weight, 12);
    });
    it("holds a grievance two to four favor half-lives, by the aggrieved party's vengefulness", () => {
        expect(grievanceHalfLifeDays(0)).toBe(2 * FAVOR_HALF_LIFE_DAYS);
        expect(grievanceHalfLifeDays(1)).toBe(4 * FAVOR_HALF_LIFE_DAYS);
        expect(grudgeDecayRate(0.9)).toBeLessThan(grudgeDecayRate(0.1));
    });
    it("opens every edge exactly at its standing reading, so the first week moves nothing", () => {
        for (const relationship of Object.values(founded.relationships)) {
            const anchor = relationshipAnchor(founded, relationship);
            expect(anchor.trust).toBe(relationship.trust);
            expect(anchor.tension).toBe(relationship.tension);
            expect(anchor.militaryThreat).toBe(relationship.militaryThreat);
        }
        const after = weeks(founded, 1);
        expect(after.relationships).toEqual(founded.relationships);
    });
    it("fades a favor by its half-life and repairs an equal injury more slowly", () => {
        const favored = weeks(withEdge({ trust: edge.trust + 0.1 }), 39);
        const injured = weeks(withEdge({ trust: edge.trust - 0.1 }), 39);
        const favorLeft = favored.relationships[key].trust - edge.trust;
        const injuryLeft = edge.trust - injured.relationships[key].trust;
        expect(favorLeft).toBeCloseTo(0.05, 2);
        expect(injuryLeft).toBeGreaterThan(favorLeft);
        // An unaffected pair is the control: nothing moved it, so nothing does.
        expect(favored.relationships[relationshipKey(npcPair.from, npcPair.to)]).toEqual(npcPair);
    });
    it("bounds what steady routine contact can bank instead of adding it up forever", () => {
        // A call's +0.02 every four weeks for four years: the old graph kept every
        // one; now each fades, so the gain settles near 0.02 / (1 - 2^(-28/273)).
        const ceiling = 0.02 / (1 - Math.pow(2, -28 / FAVOR_HALF_LIFE_DAYS));
        let state = founded;
        for (let week = 0; week < 208; week++) {
            if (week % 4 === 0)
                state = withEdge({ trust: Math.min(1, state.relationships[key].trust + 0.02) }, state);
            state = advanceTurn(state, phasesWithDecay);
        }
        const banked = state.relationships[key].trust - edge.trust;
        expect(banked).toBeGreaterThan(0.1);
        expect(banked).toBeLessThanOrEqual(ceiling + 1e-9);
    });
    it("keeps repeated injuries cumulative while each is still remembered", () => {
        const once = withEdge({ grudges: [createGrudge("slight", 0.1, 1, 0.5)] });
        const often = withEdge({ grudges: Array.from({ length: 4 }, (_, i) => createGrudge(`slight ${i}`, 0.1, 1, 0.5)) });
        const [a, b] = [weeks(once, 26), weeks(often, 26)];
        expect(grudgeWeight(b.relationships[key])).toBeGreaterThan(3 * grudgeWeight(a.relationships[key]));
    });
    it("leaves a war's grudge at its floor and lets an ordinary one go", () => {
        const war = ageGrudge(createGrudge("war:war:A:B:3", 0.6, 1, 0.5), 365 * 20);
        expect(war.weight).toBeGreaterThanOrEqual(WAR_GRUDGE_FLOOR);
        expect(war.weight).toBeCloseTo(WAR_GRUDGE_FLOOR, 2);
        expect(ageGrudge(createGrudge("a clash on the border", 0.6, 1, 0.5), 365 * 20)).toBeUndefined();
    });
    it("restates an older save's weekly step as the daily rate it stood for", () => {
        const legacy = { cause: "slight", weight: 0.2, createdTurn: 3, decayRate: 0.06 };
        expect(migrateGrudge(legacy)).toEqual({ ...legacy, decayRate: grudgeDecayRate(0.5) });
        // The old step bottomed out at 0.02 for every vengefulness from 5/6 up, so
        // that rate maps to the least vengeful temper that could have produced it.
        const floored = { ...legacy, decayRate: 0.02 };
        expect(migrateGrudge(floored).decayRate).toBe(grudgeDecayRate(1 - 0.02 / 0.12));
        expect(migrateGrudge(floored).decayRate).toBeGreaterThan(grudgeDecayRate(1));
        const current = createGrudge("slight", 0.2, 3, 0.5);
        expect(migrateGrudge(current)).toBe(current);
    });
    it("holds a treaty in force at its own terms, both ways, and drops it once withdrawn", () => {
        const kinds = Object.keys(TREATY_TERMS);
        for (const kind of kinds) {
            const record = { id: `treaty:${kind}:${counterpart}:2`, treaty: `${kind}:${player}:${counterpart}`, title: kind, kind, counterpart, signedTurn: 2, status: "ratified" };
            const signed = { ...founded, treaties: { [record.id]: record } };
            for (const [from, to] of [[player, counterpart], [counterpart, player]]) {
                const [shift] = durableShifts(signed, from, to);
                expect(shift).toEqual({ cause: `treaty:${record.id}`, trust: TREATY_TERMS[kind].effect.trust, tension: TREATY_TERMS[kind].effect.tension, militaryThreat: 0 });
            }
            const withdrawn = { ...founded, treaties: { [record.id]: { ...record, status: "withdrawn" } } };
            expect(durableShifts(withdrawn, player, counterpart)).toEqual([]);
        }
    });
    it("settles to the same bytes whatever order the records were written in", () => {
        const records = ["alliance", "trade", "arms-control", "executive-agreement"].map((kind, i) => ({
            id: `treaty:${kind}:${counterpart}:${i + 2}`, treaty: `${kind}:${player}:${counterpart}`, title: kind, kind, counterpart, signedTurn: i + 2, status: "ratified",
        }));
        const build = (ordered) => ({
            ...withEdge({ trust: edge.trust + 0.3001, history: [{ turn: 1, kind: "severance", description: "a" }, { turn: 1, kind: "relief", description: "b" }] }),
            treaties: Object.fromEntries(ordered.map((r) => [r.id, r])),
        });
        const forward = build(records);
        const backward = build([...records].reverse());
        const reversedHistory = { ...backward, relationships: { ...backward.relationships, [key]: { ...backward.relationships[key], history: [...backward.relationships[key].history].reverse() } } };
        expect(relationshipAnchor(backward, backward.relationships[key])).toEqual(relationshipAnchor(forward, forward.relationships[key]));
        expect(disposition(reversedHistory.relationships[key], reversedHistory)).toBe(disposition(forward.relationships[key], forward));
        expect(grudgeDecayPhase(backward)).toEqual(grudgeDecayPhase(forward));
        expect(weeks(backward, 60).relationships[key]).toEqual(weeks(forward, 60).relationships[key]);
    });
    it("presses a reading toward a level at the build half-life and never back past it", () => {
        expect(pressDown(0.4, 0.2)).toBeCloseTo(0.2 + 0.2 * Math.pow(2, -7 / PRESSURE_BUILD_HALF_LIFE_DAYS), 12);
        expect(pressDown(0.1, 0.2)).toBe(0.1);
        expect(pressUp(0.1, 0.3)).toBeGreaterThan(0.1);
        expect(pressUp(0.5, 0.3)).toBe(0.5);
        const settled = Array.from({ length: 104 }).reduce((t) => pressDown(t, -0.1), 0.3);
        expect(settled).toBeGreaterThanOrEqual(-0.1);
        expect(settled).toBeCloseTo(-0.1, 6);
    });
    it("lets the fear a war raised fade once the war is over, but holds it while it is fought", () => {
        const raised = withEdge({ militaryThreat: Math.min(1, edge.militaryThreat + 0.3) });
        const conflict = { id: `war:${counterpart}:${player}:2`, aggressor: counterpart, defender: player, joined: { aggressor: [], defender: [] }, status: "active" };
        const fighting = { ...raised, conflicts: { [conflict.id]: conflict } };
        const over = { ...raised, conflicts: { [conflict.id]: { ...conflict, status: "settled" } } };
        const quiet = weeks(raised, 104).relationships[key].militaryThreat;
        const ended = weeks(over, 104).relationships[key].militaryThreat;
        const held = weeks(fighting, 104).relationships[key].militaryThreat;
        expect(quiet).toBeLessThan(edge.militaryThreat + 0.3);
        expect(quiet).toBeGreaterThan(edge.militaryThreat);
        expect(ended).toBeGreaterThan(quiet);
        expect(held).toBeGreaterThan(ended);
    });
    it("keeps a severance and a war below the founding reading after five years", () => {
        const severed = { ...withEdge({ trust: edge.trust - 0.3 }), player: { ...founded.player, flags: { ...founded.player.flags, [`severed-relations:${counterpart}:${player}`]: true } } };
        const conflict = { id: `war:${counterpart}:${player}:2`, aggressor: counterpart, defender: player, joined: { aggressor: [], defender: [] }, status: "defender-victory" };
        const fought = { ...withEdge({ trust: edge.trust - 0.3 }), conflicts: { [conflict.id]: conflict } };
        for (const state of [severed, fought]) {
            const later = weeks(state, 260).relationships[key];
            expect(edge.trust - later.trust).toBeGreaterThan(0.05);
        }
        const active = { ...conflict, status: "active" };
        expect(durableShifts({ ...founded, conflicts: { [conflict.id]: active } }, player, counterpart)[0].trust).toBeLessThan(durableShifts(fought, player, counterpart)[0].trust);
        const carried = { ...active, inherited: { asOf: founded.calendar, source: "probe" } };
        expect(durableShifts({ ...founded, conflicts: { [conflict.id]: carried } }, player, counterpart)).toEqual([]);
        // A government that enters the carried war later makes a new enemy of each
        // principal on the other side, and that pairing is not in the founding data.
        const joiner = Object.keys(founded.nations).sort().find((id) => id !== player && id !== counterpart);
        const entered = { ...carried, joined: { aggressor: [joiner], defender: [] } };
        const withEntrant = { ...founded, conflicts: { [conflict.id]: entered } };
        expect(durableShifts(withEntrant, joiner, player).map((s) => s.cause)).toEqual([`war:${conflict.id}`]);
        expect(durableShifts(withEntrant, player, joiner)[0].trust).toBeLessThan(0);
        expect(durableShifts(withEntrant, player, counterpart)).toEqual([]);
    });
});
