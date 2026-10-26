import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
import { relationshipKey } from "./state.js";
import { decideNpcAction, explainNpcDecision, npcActStamp, presidencyExposure, scoreOf } from "./npc-agent.js";
import { foundedForBalance } from "./balance-harness.js";
import { foreignLeaderFor, leaderRapportBetween } from "./foreign-leader.js";
import { withoutLeaderPersonality } from "./leader-index.js";
import { QUESTION_TERMS } from "./willingness.js";
import { appetite, liveTemperament } from "./temperament.js";
import { initiativeRate } from "./npc-turn.js";
import { createGrudge } from "./relationships.js";
import { deedTowardFlag } from "./deeds.js";
import { resolveAction } from "./resolution.js";
import { apply } from "./effects.js";
import { ENGAGEMENT_KINDS, engagementHistoryKind } from "./engagement.js";
const seed = makeCampaignSeed("npc-agent-seed");
const streams = () => createRngStreams(seed);
// A small standing grievance on each side, so either government has the cause
// coercion needs without moving the readings the assertions below were
// written against. The agent reads the cause off the actor's own edge.
const OLD_QUARREL = createGrudge("an old trade quarrel", 0.05, 0, 0.3);
// The fixture ships one relationship (USA -> ALP); the agent needs the reverse
// direction to let ALP act, plus the third-party read the resolver looks for.
function withMutualRelations(campaign) {
    const forwardKey = relationshipKey(nationA.id, nationB.id);
    const forward = { ...campaign.relationships[forwardKey], grudges: [OLD_QUARREL] };
    const back = {
        from: nationB.id,
        to: nationA.id,
        trust: 0.2,
        alignment: 0.1,
        tension: 0.1,
        tradeDependence: 0.3,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [OLD_QUARREL],
        history: [],
    };
    return {
        ...campaign,
        relationships: { ...campaign.relationships, [forwardKey]: forward, [relationshipKey(nationB.id, nationA.id)]: back },
    };
}
/** Every meeting with the neighbor made this week, so each is on its cooldown. */
function justMet(campaign) {
    const key = relationshipKey(nationA.id, nationB.id);
    const edge = campaign.relationships[key];
    const met = ENGAGEMENT_KINDS.map((kind) => ({ turn: campaign.turn, kind: engagementHistoryKind(kind), description: "met" }));
    return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...edge, history: [...edge.history, ...met] } } };
}
function withTraits(campaign, id, traits) {
    const runtime = campaign.nations[id];
    return {
        ...campaign,
        nations: { ...campaign.nations, [id]: { ...runtime, traits: { ...runtime.traits, ...traits } } },
    };
}
function withAgenda(campaign, id, agendaId) {
    return withTraits(campaign, id, {
        agendas: [{ id: agendaId, description: `pursuing ${agendaId}`, weight: 0.8 }],
    });
}
describe("the NPC utility agent", () => {
    it("chooses a move that is explainable from its own candidate list", () => {
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationA.id, streams());
        expect(decision.ranked.length).toBeGreaterThan(0);
        for (const candidate of decision.ranked) {
            expect(scoreOf(candidate.terms)).toBe(candidate.score);
        }
        // The chosen move is the top of the ranking, not a separate decision.
        if (decision.chosen)
            expect(decision.chosen).toBe(decision.ranked[0]);
        expect(explainNpcDecision(decision)).toContain(nationA.id);
    });
    it("ranks every candidate it kept and records why it dropped the rest", () => {
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationA.id, streams());
        // Five instruments x five rungs x one reachable target, partitioned with
        // nothing lost: an NPC's option set is fully accounted for.
        expect(decision.ranked.length + decision.rejected.length).toBe(25);
        for (const rejection of decision.rejected) {
            expect(rejection.reason.length).toBeGreaterThan(0);
            expect(rejection.missingCapability.length).toBeGreaterThan(0);
        }
        const scores = decision.ranked.map((c) => c.score);
        expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    });
    it("never chooses a move the actor's stats cannot support", () => {
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationA.id, streams());
        const reserves = campaign.nations[nationA.id].stats.economy.reserves;
        for (const candidate of decision.ranked) {
            // Every kept candidate passed the instrument gate — it resolves rather
            // than bouncing — and is inside what the reserves can carry.
            const result = resolveAction(campaign, candidate.request, streams());
            expect(result.ok, `${candidate.rungName} should be reachable`).toBe(true);
            expect(Math.abs(candidate.projection.cost.treasury ?? 0)).toBeLessThanOrEqual(reserves * 0.25);
        }
    });
    it("rules out moves it cannot fund, however much it wants them", () => {
        const base = withMutualRelations(buildCampaign());
        const runtime = base.nations[nationA.id];
        const broke = {
            ...base,
            nations: {
                ...base.nations,
                [nationA.id]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, reserves: 0 } } },
            },
        };
        const decision = decideNpcAction(broke, nationA.id, streams());
        expect(decision.chosen).toBeUndefined();
        expect(decision.rejected.some((r) => r.reason.includes("cannot fund"))).toBe(true);
        // A meeting costs nothing, so a broke government may still pay a visit.
        expect(decision.holdReason !== undefined || decision.engaged !== undefined).toBe(true);
    });
    it("holds when nothing on the board is worth the cost", () => {
        // An inward-facing, unaggressive, deeply legalistic nation with a friendly
        // neighbor has no move worth making. It met that neighbor this week, so no
        // meeting is on the table either and the instrument ranking alone decides.
        const campaign = withTraits(justMet(withMutualRelations(buildCampaign())), nationA.id, {
            aggression: 0,
            isolationism: 1,
            legalism: 1,
            riskTolerance: 0,
            vengefulness: 0,
        });
        const decision = decideNpcAction(campaign, nationA.id, streams());
        expect(decision.chosen).toBeUndefined();
        expect(decision.holdReason).toContain("worth the cost");
        expect(explainNpcDecision(decision)).toBe(decision.holdReason);
    });
    it("is deterministic under replay", () => {
        const campaign = withMutualRelations(buildCampaign());
        const [first, second] = replay(seed, (s) => decideNpcAction(campaign, nationA.id, s));
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
    it("reaches for the instrument its rolled agendas are about", () => {
        const base = withMutualRelations(buildCampaign());
        const trader = decideNpcAction(withAgenda(base, nationA.id, "export-led-growth"), nationA.id, streams());
        const hawk = decideNpcAction(withAgenda(base, nationA.id, "deterrence-through-arsenal"), nationA.id, streams());
        const fitFor = (decision, instrument) => decision.ranked.find((c) => c.request.instrument === instrument).terms.agendaFit;
        expect(fitFor(trader, "economic")).toBeGreaterThan(fitFor(hawk, "economic"));
        expect(fitFor(hawk, "military")).toBeGreaterThan(fitFor(trader, "military"));
    });
    it("behaves measurably differently between two trait rolls of the same nation", () => {
        const base = withMutualRelations(buildCampaign());
        const cautious = decideNpcAction(withTraits(base, nationA.id, { aggression: 0.05, riskTolerance: 0.1, legalism: 0.9, isolationism: 0.6 }), nationA.id, streams());
        const belligerent = decideNpcAction(withTraits(base, nationA.id, { aggression: 0.95, riskTolerance: 0.9, legalism: 0.1, isolationism: 0.05 }), nationA.id, streams());
        const top = (d) => (d.chosen ? `${d.chosen.request.instrument}-${d.chosen.request.rung}` : "hold");
        expect(top(cautious)).not.toBe(top(belligerent));
        if (belligerent.chosen && cautious.chosen) {
            expect(belligerent.chosen.request.rung).toBeGreaterThan(cautious.chosen.request.rung);
        }
    });
    it("reads a grudge as a reason to press harder", () => {
        const base = withTraits(withMutualRelations(buildCampaign()), nationA.id, { vengefulness: 0.9, aggression: 0.5 });
        const key = relationshipKey(nationA.id, nationB.id);
        const aggrieved = {
            ...base,
            relationships: {
                ...base.relationships,
                [key]: {
                    ...base.relationships[key],
                    grudges: [createGrudge("betrayal", 0.9, 0, 0.9)],
                },
            },
        };
        const calm = decideNpcAction(base, nationA.id, streams());
        const angry = decideNpcAction(aggrieved, nationA.id, streams());
        const coerciveIntent = (d) => d.ranked.find((c) => c.request.instrument === "military" && c.request.rung === 3).terms.intentMatch;
        expect(coerciveIntent(angry)).toBeGreaterThan(coerciveIntent(calm));
    });
    it("confines itself to the targets it was given", () => {
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationA.id, streams(), { targets: [] });
        expect(decision.ranked).toEqual([]);
        expect(decision.holdReason).toContain("no move");
    });
    it("feeds a chosen move straight back into the shared resolver", () => {
        const campaign = withTraits(withMutualRelations(buildCampaign()), nationA.id, {
            aggression: 0.8,
            riskTolerance: 0.8,
            isolationism: 0,
        });
        const decision = decideNpcAction(campaign, nationA.id, streams());
        expect(decision.chosen).toBeDefined();
        const result = resolveAction(campaign, decision.chosen.request, streams(), "simulate");
        expect(result.ok).toBe(true);
        if (result.ok) {
            // The agent scored the same projection the resolver commits against —
            // there is no second estimator behind the NPC's decision.
            expect(result.projection.successChance).toBe(decision.chosen.projection.successChance);
            expect(result.packet.source).toBe("simulate");
        }
    });
});
// `NationTraits.transparency` was authored per nation, rolled per campaign, and
// read by nothing. A state that cannot keep a secret should not reach for
// covert work in the first place — that is what the number means.
describe("transparency brakes covert work", () => {
    function withTransparency(campaign, nation, transparency) {
        const runtime = campaign.nations[nation];
        return {
            ...campaign,
            nations: { ...campaign.nations, [nation]: { ...runtime, traits: { ...runtime.traits, transparency } } },
        };
    }
    function covertScore(transparency) {
        const campaign = withTransparency(withMutualRelations(buildCampaign()), "USA", transparency);
        const decision = decideNpcAction(campaign, "USA", createRngStreams(campaign.seed));
        const covert = decision.ranked.filter((c) => c.request.instrument === "covert");
        expect(covert.length).toBeGreaterThan(0);
        return Math.max(...covert.map((c) => c.score));
    }
    it("makes an open state rank covert options below what a closed one would", () => {
        expect(covertScore(0.9)).toBeLessThan(covertScore(0.1));
    });
    it("leaves the non-covert ladder alone — it is a scruple about secrecy, not about acting", () => {
        const scoreOfDiplomatic = (transparency) => {
            const campaign = withTransparency(withMutualRelations(buildCampaign()), "USA", transparency);
            const decision = decideNpcAction(campaign, "USA", createRngStreams(campaign.seed));
            return decision.ranked.find((c) => c.request.instrument === "diplomatic" && c.request.rung === 1).score;
        };
        expect(scoreOfDiplomatic(0.9)).toBe(scoreOfDiplomatic(0.1));
    });
});
describe("the deeds this government has landed reach the agent's own scoring", () => {
    // The reading under test runs ALP -> USA: a counterpart scoring moves
    // against the administration that has been acting on it.
    function coercedCampaign(...flags) {
        const base = withMutualRelations(buildCampaign());
        const raised = Object.fromEntries(flags.map((flag) => [flag, true]));
        return { ...base, player: { ...base.player, flags: { ...base.player.flags, ...raised } } };
    }
    const termsFor = (campaign, instrument, rung) => decideNpcAction(campaign, nationB.id, streams()).ranked.find((c) => c.request.instrument === instrument && c.request.rung === rung)?.terms;
    it("scores a coercive move against the player higher once the player has landed one on it", () => {
        const quiet = termsFor(coercedCampaign(), "military", 4);
        const coerced = termsFor(coercedCampaign(deedTowardFlag(nationB.id, "military", "high", "landed")), "military", 4);
        // Nothing but the deed record differs between the two campaigns, and the
        // only term that reads it is the one that reads the relationship.
        expect(coerced.intentMatch).toBeGreaterThan(quiet.intentMatch);
        expect(scoreOf(coerced)).toBeGreaterThan(scoreOf(quiet));
    });
    // A development grant: relief is offered only where there is a need to answer, and none is set here.
    it("leaves the conciliatory end of the ladder worse off by the same reading", () => {
        const quiet = termsFor(coercedCampaign(), "assistance", 2);
        const coerced = termsFor(coercedCampaign(deedTowardFlag(nationB.id, "military", "high", "landed")), "assistance", 2);
        expect(coerced.intentMatch).toBeLessThan(quiet.intentMatch);
    });
    it("moves nothing for an act that did not land", () => {
        const failed = termsFor(coercedCampaign(deedTowardFlag(nationB.id, "military", "high", "failed")), "military", 4);
        expect(failed.intentMatch).toBe(termsFor(coercedCampaign(), "military", 4).intentMatch);
    });
    it("does not read the record backwards onto the government that wrote it", () => {
        // `deed-toward:USA` cannot be written by the resolver at all, because a
        // bound flag always names the counterparty. Were it read here anyway, the
        // administration's own scoring of ALP would move; it must not.
        const asPlayer = (campaign) => decideNpcAction(campaign, nationA.id, streams()).ranked.find((c) => c.request.instrument === "military" && c.request.rung === 4).terms.intentMatch;
        expect(asPlayer(coercedCampaign(deedTowardFlag(nationB.id, "military", "high", "landed")))).toBe(asPlayer(coercedCampaign()));
    });
});
describe("the whole ladder reprices against a government that has coerced", () => {
    function coercedCampaign(...flags) {
        const base = withMutualRelations(buildCampaign());
        const raised = Object.fromEntries(flags.map((flag) => [flag, true]));
        return { ...base, player: { ...base.player, flags: { ...base.player.flags, ...raised } } };
    }
    it("raises every use of force and lowers every offer of aid across the agent's ranking", () => {
        // The record is not one act but a term of them: the four coercive
        // instruments, each landed at the top of the ladder. What the agent does
        // with it is shift what it wants — force moves toward the reading and aid
        // moves away from it, for every rung of each at once.
        const record = ["diplomatic", "economic", "covert", "military"].map((family) => deedTowardFlag(nationB.id, family, "high", "landed"));
        const quiet = decideNpcAction(coercedCampaign(), nationB.id, streams()).ranked;
        const coerced = decideNpcAction(coercedCampaign(...record), nationB.id, streams()).ranked;
        expect(coerced.length).toBe(quiet.length);
        const scoreOfRequest = (ranked, instrument, rung) => ranked.find((c) => c.request.instrument === instrument && c.request.rung === rung).score;
        const force = quiet.filter((c) => c.request.instrument === "military");
        const aid = quiet.filter((c) => c.request.instrument === "assistance");
        expect(force.length).toBeGreaterThan(0);
        expect(aid.length).toBeGreaterThan(0);
        for (const candidate of force) {
            const { instrument, rung } = candidate.request;
            expect(scoreOfRequest(coerced, instrument, rung)).toBeGreaterThan(candidate.score);
        }
        for (const candidate of aid) {
            const { instrument, rung } = candidate.request;
            expect(scoreOfRequest(coerced, instrument, rung)).toBeLessThan(candidate.score);
        }
    });
});
// --- What kind of government it is, and what it said it would answer ---
function withBase(campaign, id, patch) {
    const runtime = campaign.nations[id];
    return {
        ...campaign,
        nations: { ...campaign.nations, [id]: { ...runtime, base: { ...runtime.base, ...patch } } },
    };
}
function withStats(campaign, id, patch) {
    const runtime = campaign.nations[id];
    return {
        ...campaign,
        nations: { ...campaign.nations, [id]: { ...runtime, stats: { ...runtime.stats, ...patch } } },
    };
}
const scoreFor = (ranked, instrument, rung) => ranked.find((c) => c.request.instrument === instrument && c.request.rung === rung).score;
describe("how much of a government's foreign policy is about this country", () => {
    it("prefers the country its own doctrine names", () => {
        const base = withMutualRelations(buildCampaign());
        const named = withBase(base, nationB.id, {
            doctrine: { posture: "balanced", redLines: [], alignmentPull: [nationA.id] },
        });
        const ignored = decideNpcAction(base, nationB.id, streams()).ranked;
        const attentive = decideNpcAction(named, nationB.id, streams()).ranked;
        expect(scoreFor(attentive, "diplomatic", 2)).toBeGreaterThan(scoreFor(ignored, "diplomatic", 2));
    });
    it("prefers the country that carries weight in the world", () => {
        const base = withMutualRelations(buildCampaign());
        const runtime = base.nations[nationA.id];
        const small = {
            ...base,
            nations: {
                ...base.nations,
                [nationA.id]: { ...runtime, base: { ...runtime.base, bands: { ...runtime.base.bands, powerTier: 1 } } },
            },
        };
        const great = {
            ...base,
            nations: {
                ...base.nations,
                [nationA.id]: { ...runtime, base: { ...runtime.base, bands: { ...runtime.base.bands, powerTier: 5 } } },
            },
        };
        expect(scoreFor(decideNpcAction(great, nationB.id, streams()).ranked, "diplomatic", 2)).toBeGreaterThan(scoreFor(decideNpcAction(small, nationB.id, streams()).ranked, "diplomatic", 2));
    });
    it("is not the same fact as the odds", () => {
        // The point of the term: the hardest target on the board used to be the
        // least interesting one, because difficulty was the only axis that
        // separated one country from another.
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationB.id, streams());
        for (const candidate of decision.ranked) {
            expect(candidate.terms.salience).toBeGreaterThanOrEqual(0);
            expect(candidate.terms.salience).toBeLessThanOrEqual(1);
        }
    });
});
describe("a line this government drew", () => {
    const crossed = () => {
        const base = withMutualRelations(buildCampaign());
        const declared = withBase(base, nationB.id, {
            doctrine: {
                posture: "balanced",
                redLines: [{ id: "homeland-defense", description: "No foreign force operates on its soil, ever." }],
                alignmentPull: [],
            },
        });
        return {
            ...declared,
            turn: 4,
            ledger: [
                {
                    turn: 3,
                    actor: "player",
                    description: "United States uses Forward Deploy against Alpland.",
                    commitment: { instrument: "military", rung: 3, target: nationB.id, landed: true },
                },
            ],
        };
    };
    it("raises the answer it promised and nothing below it", () => {
        const quiet = decideNpcAction(withMutualRelations({ ...buildCampaign(), turn: 4 }), nationB.id, streams()).ranked;
        const answering = decideNpcAction(crossed(), nationB.id, streams()).ranked;
        // The line names a rung-3 answer, so rung 3 is lifted and rung 1 is not.
        expect(scoreFor(answering, "diplomatic", 3) - scoreFor(quiet, "diplomatic", 3)).toBeGreaterThan(0.5);
        expect(scoreFor(answering, "diplomatic", 1)).toBeCloseTo(scoreFor(quiet, "diplomatic", 1), 3);
    });
    it("names the line on the move that answers it", () => {
        const decision = decideNpcAction(crossed(), nationB.id, streams());
        expect(decision.chosen?.request.target).toBe(nationA.id);
        expect(decision.chosen?.request.rung).toBeGreaterThanOrEqual(3);
        expect(decision.chosen?.answering?.redLine.description).toBe("No foreign force operates on its soil, ever.");
    });
    it("says nothing where nobody crossed anything", () => {
        const decision = decideNpcAction(withMutualRelations(buildCampaign()), nationB.id, streams());
        for (const candidate of decision.ranked)
            expect(candidate.terms.redLine).toBe(0);
    });
});
describe("what kind of state is deciding", () => {
    it("makes a government that has to be ratified slower to the top of the ladder", () => {
        const base = withMutualRelations(buildCampaign());
        const junta = withBase(base, nationB.id, { identity: { ...nationB.identity, government: "charter-military-junta" } });
        const cabinet = withBase(base, nationB.id, {
            identity: { ...nationB.identity, government: "charter-parliamentary-republic" },
        });
        const juntaRanked = decideNpcAction(junta, nationB.id, streams()).ranked;
        const cabinetRanked = decideNpcAction(cabinet, nationB.id, streams()).ranked;
        // The drag bites only where ratification is the question.
        expect(scoreFor(juntaRanked, "military", 4)).toBeGreaterThan(scoreFor(cabinetRanked, "military", 4));
        expect(scoreFor(juntaRanked, "assistance", 4)).toBeGreaterThan(scoreFor(cabinetRanked, "assistance", 4));
        expect(scoreFor(juntaRanked, "diplomatic", 2)).toBeCloseTo(scoreFor(cabinetRanked, "diplomatic", 2), 5);
    });
    it("sends a shaky government whose elite is united outward, and a split one nowhere", () => {
        const base = withMutualRelations(buildCampaign());
        const politics = base.nations[nationB.id].stats.politics;
        const united = withStats(base, nationB.id, {
            politics: { ...politics, regimeStability: 0.1, factionalism: 0.05 },
        });
        const split = withStats(base, nationB.id, {
            politics: { ...politics, regimeStability: 0.1, factionalism: 0.95 },
        });
        expect(scoreFor(decideNpcAction(united, nationB.id, streams()).ranked, "diplomatic", 3)).toBeGreaterThan(scoreFor(decideNpcAction(split, nationB.id, streams()).ranked, "diplomatic", 3));
    });
    it("leaves a secure government deciding on everything else", () => {
        const base = withMutualRelations(buildCampaign());
        const politics = base.nations[nationB.id].stats.politics;
        const secure = withStats(base, nationB.id, { politics: { ...politics, regimeStability: 1 } });
        for (const candidate of decideNpcAction(secure, nationB.id, streams()).ranked) {
            expect(candidate.terms.survival).toBe(0);
        }
    });
});
describe("the agent's temperament", () => {
    function seated(campaign, offset) {
        return {
            ...campaign,
            foreignPolitics: { seats: { [nationB.id]: { since: campaign.calendar, offset, provenance: "played" } }, recent: [] },
        };
    }
    it("reads escalation fit off the live temperament, which with no seat is the traits themselves", () => {
        const campaign = withMutualRelations(buildCampaign());
        const decision = decideNpcAction(campaign, nationB.id, streams());
        const temper = liveTemperament(campaign, nationB.id);
        expect(temper).toBe(campaign.nations[nationB.id].traits);
        for (const candidate of decision.ranked) {
            expect(candidate.terms.escalationFit).toBeCloseTo(1 - Math.abs(candidate.request.rung / 5 - appetite(temper)), 10);
        }
    });
    it("brakes harder under a seated leader who keeps to the country's own business", () => {
        const campaign = withMutualRelations(buildCampaign());
        const before = decideNpcAction(campaign, nationB.id, streams()).ranked;
        const after = decideNpcAction(seated(campaign, { isolationism: 0.3 }), nationB.id, streams()).ranked;
        const key = (c) => `${c.request.instrument}:${c.request.rung}`;
        const moved = new Map(after.map((c) => [key(c), c.terms.restraint]));
        for (const candidate of before) {
            const restraint = moved.get(key(candidate));
            if (restraint !== undefined)
                expect(restraint).toBeCloseTo(candidate.terms.restraint - 0.27, 10);
        }
    });
    // A blockade opens a war the first time it lands, so the agent weighs it as
    // it weighs a strike: the same legal scruple and the same chamber in front of it.
    it("restrains a blockade as it restrains a strike, and more than a deployment", () => {
        const { campaign } = foundedForBalance("npc-restraint", "democrat", {}, { carriedWorld: false });
        const actor = "ISR";
        const military = new Map(decideNpcAction(campaign, actor, streams(), { targets: ["LBN"] }).ranked
            .filter((candidate) => candidate.request.instrument === "military")
            .map((candidate) => [candidate.request.rung, candidate.terms.restraint]));
        expect(military.get(3)).toBeCloseTo(military.get(4), 10);
        expect(military.get(2) - military.get(3)).toBeGreaterThanOrEqual(liveTemperament(campaign, actor).legalism * 0.25 - 1e-9);
    });
    it("takes the initiative less often under a leader who keeps to the country's own business", () => {
        const campaign = withMutualRelations(buildCampaign());
        expect(initiativeRate(seated(campaign, { isolationism: 0.5 }), nationB.id)).toBeLessThan(initiativeRate(campaign, nationB.id));
    });
});
describe("the agent's cause to coerce", () => {
    it("draws no coercion against a government the record gives it no quarrel with", () => {
        const campaign = withMutualRelations(buildCampaign());
        const key = relationshipKey(nationB.id, nationA.id);
        const cleared = { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], grudges: [] } } };
        const decision = decideNpcAction(cleared, nationB.id, streams());
        expect(decision.ranked.every((candidate) => candidate.request.instrument === "assistance")).toBe(true);
        expect(decision.chosen?.request.instrument ?? "assistance").toBe("assistance");
    });
});
describe("the presidency as a target", () => {
    it("reads a presidency on the brink as cheaper to press, and one in high standing as dearer", () => {
        const campaign = buildCampaign();
        const neutral = presidencyExposure(campaign);
        const brink = presidencyExposure({ ...campaign, removal: { ...campaign.removal, pressure: 1 } });
        const standing = presidencyExposure({ ...campaign, player: { ...campaign.player, metrics: { ...campaign.player.metrics, standing: 1 } } });
        expect(neutral).toBeCloseTo(1, 10);
        expect(brink).toBeGreaterThan(neutral);
        expect(standing).toBeLessThan(neutral);
    });
});
describe("two leaders' rapport in how one government reads the other", () => {
    const { campaign: founded } = foundedForBalance("npc-agent-rapport");
    const actors = Object.keys(founded.nations).filter((id) => id !== founded.founding.nation);
    /** The first pair the founded board gives a military move between, so intent reads off the hostility straight. */
    function militaryPair() {
        for (const actor of actors) {
            const decision = decideNpcAction(founded, actor, createRngStreams(founded.seed));
            const military = decision.ranked.find((candidate) => candidate.request.instrument === "military" && candidate.request.target !== founded.founding.nation);
            if (military)
                return { actor, target: military.request.target };
        }
        throw new Error("no government on the founded board has a military move against another");
    }
    const { actor, target } = militaryPair();
    function actorLeaderAs(changes) {
        const id = foreignLeaderFor(founded, actor).person;
        const runtime = founded.people[id];
        return { ...founded, people: { ...founded.people, [id]: { ...runtime, base: { ...runtime.base, ...changes } } } };
    }
    const other = founded.people[foreignLeaderFor(founded, target).person].base;
    const alike = actorLeaderAs({ ideology: other.ideology, traits: other.traits });
    const opposed = actorLeaderAs({
        ideology: {
            economicLeftRight: -other.ideology.economicLeftRight,
            authLibertarian: -other.ideology.authLibertarian,
            nationalistGlobalist: -other.ideology.nationalistGlobalist,
        },
        traits: other.traits.includes("hawkish") ? ["dovish"] : ["hawkish"],
    });
    function intentOf(state, counted) {
        const base = createRngStreams(state.seed);
        const streams = counted ? { stream: (...key) => ((counted.calls += 1), base.stream(...key)) } : base;
        const decision = decideNpcAction(state, actor, streams, { targets: [target] });
        return decision.ranked.find((candidate) => candidate.request.instrument === "military").terms.intentMatch;
    }
    it("reads the other side more kindly when the leaders get on, and worse when they cannot stand each other", () => {
        expect(leaderRapportBetween(alike, actor, target)).toBeGreaterThan(leaderRapportBetween(opposed, actor, target));
        expect(intentOf(alike)).toBeLessThan(intentOf(opposed));
    });
    it("moves nothing with the character off", () => {
        withoutLeaderPersonality(() => expect(intentOf(alike)).toBe(intentOf(opposed)));
    });
    it("draws nothing for it: the decision takes the same streams with the rapport read as without", () => {
        const on = { calls: 0 };
        const off = { calls: 0 };
        intentOf(alike, on);
        withoutLeaderPersonality(() => intentOf(alike, off));
        expect(on.calls).toBe(off.calls);
    });
    it("records it inside intent-match on the stamp, a key the act's question allows", () => {
        const decision = decideNpcAction(opposed, actor, createRngStreams(opposed.seed), { targets: [target] });
        const chosen = decision.ranked.find((candidate) => candidate.request.instrument === "military");
        const stamp = npcActStamp(opposed, { ...decision, chosen });
        const intent = stamp.terms.find((term) => term.key === "intent-match");
        expect(intent.value).toBeCloseTo(chosen.terms.intentMatch * 0.9, 4);
        for (const term of stamp.terms)
            expect(QUESTION_TERMS["npc-act"]).toContain(term.key);
    });
    it("decides the same twice and on a copy of the campaign", () => {
        expect(intentOf(opposed)).toBe(intentOf(opposed));
        expect(intentOf(structuredClone(opposed))).toBe(intentOf(opposed));
    });
});
describe("an act this government has yet to answer", () => {
    // The player sanctions ALP through the shared resolver, the path every
    // coercive act takes, so the ledger entry the agent reads is the real one.
    function sanctioned(base) {
        const sanction = resolveAction(base, { actor: nationA.id, target: nationB.id, instrument: "economic", rung: 3 }, streams(), "action");
        if (!sanction.ok)
            throw new Error(`sanction refused: ${sanction.reason}`);
        return { ...apply(base, sanction.packet), turn: base.turn + 1 };
    }
    const quarrelless = (campaign) => {
        const key = relationshipKey(nationB.id, nationA.id);
        return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], grudges: [] } } };
    };
    const at = (campaign, instrument, rung) => decideNpcAction(campaign, nationB.id, streams()).ranked.find((c) => c.request.target === nationA.id && c.request.instrument === instrument && c.request.rung === rung);
    // The fixture's ALP has no trade channel for the upper economic rungs, so
    // the in-kind answer it can give is the first one.
    it("raises the answer to the government that coerced it, in kind before anything higher", () => {
        const campaign = withMutualRelations(buildCampaign());
        const after = sanctioned(campaign);
        const inKind = at(after, "economic", 1);
        expect(at(campaign, "economic", 1).terms.response).toBe(0);
        expect(inKind.terms.response).toBeGreaterThan(0);
        expect(inKind.terms.response).toBeGreaterThan(at(after, "military", 4).terms.response);
        expect(inKind.score).toBeGreaterThan(at(campaign, "economic", 1).score);
    });
    it("gives a government with no other quarrel a cause to answer", () => {
        const after = sanctioned(quarrelless(withMutualRelations(buildCampaign())));
        expect(decideNpcAction(after, nationB.id, streams()).ranked.some((c) => c.request.instrument === "economic")).toBe(true);
    });
    it("offers only answers where the act to answer is the only cause", () => {
        // A sanction's own blowback leaves a grudge, which is a quarrel of its own;
        // the act is written straight onto the record here so it is the only cause.
        const base = quarrelless(withMutualRelations(buildCampaign()));
        const entry = {
            turn: base.turn,
            actor: "player",
            description: "Targeted sanctions",
            commitment: { instrument: "economic", rung: 3, target: nationB.id, landed: true },
            causal: { origin: "decision", eventId: "ev-test", createdDate: base.calendar, visibility: "public", entities: [nationA.id, nationB.id] },
        };
        const after = { ...base, turn: base.turn + 1, ledger: [...base.ledger, entry] };
        const ranked = decideNpcAction(after, nationB.id, streams()).ranked.filter((c) => c.request.target === nationA.id);
        expect(ranked.some((c) => c.request.instrument === "economic")).toBe(true);
        // An escalation the act does not call for is not on the list.
        expect(ranked.every((c) => c.request.instrument === "assistance" || c.terms.response > 0)).toBe(true);
    });
    it("stamps the answer under a key the act's question allows", () => {
        expect(QUESTION_TERMS["npc-act"]).toContain("response");
    });
});
describe("alignment brakes pressure on a partner", () => {
    const aligned = (campaign, alignment) => {
        const key = relationshipKey(nationB.id, nationA.id);
        return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], alignment } } };
    };
    const restraintAt = (campaign, instrument, rung) => decideNpcAction(campaign, nationB.id, streams()).ranked.find((c) => c.request.instrument === instrument && c.request.rung === rung).terms.restraint;
    it("restrains military pressure on an aligned partner more than on a neutral one", () => {
        const base = withMutualRelations(buildCampaign());
        expect(restraintAt(aligned(base, 0.7), "military", 1)).toBeLessThan(restraintAt(aligned(base, 0), "military", 1));
    });
    it("brakes force on a partner far harder than a protest, and leaves an adversary unbraked", () => {
        const base = withMutualRelations(buildCampaign());
        const brake = (instrument) => restraintAt(aligned(base, 0), instrument, 1) - restraintAt(aligned(base, 0.7), instrument, 1);
        expect(brake("military")).toBeGreaterThan(brake("diplomatic") * 3);
        expect(restraintAt(aligned(base, -0.7), "military", 1)).toBe(restraintAt(aligned(base, 0), "military", 1));
    });
});
