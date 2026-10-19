import { describe, expect, it } from "vitest";
import { Nation, Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB, relationship } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { npcActionPhase, runNpcTurn } from "./npc-turn.js";
import { advancePursuit, focusFor, leadingAim, openPursuit, opensPursuit, pursuitPhase, wantedRung, } from "./pursuits.js";
import { selectActivePursuits, selectPursuitAgainst } from "./state.js";
const USA = nationA.id;
const ALP = nationB.id;
const COD = "COD";
const nationC = Nation.parse({ ...nationA, id: COD, identity: { ...nationA.identity, name: "Codria" } });
/**
 * Two NPCs and a player. The pair that matters here is ALP → COD: the whole
 * point of a pursuit is a campaign the player is not party to, and a two-nation
 * fixture cannot express one.
 */
function threeNations() {
    const base = buildCampaign();
    const link = (from, to, over = {}) => Relationship.parse({ ...relationship, from, to, ...over });
    return {
        ...base,
        nations: { ...base.nations, [COD]: { base: nationC, stats: nationC.stats, traits: nationC.traits } },
        relationships: {
            "USA:ALP": link(USA, ALP),
            "ALP:USA": link(ALP, USA),
            "ALP:COD": link(ALP, COD, { trust: -0.4, tension: 0.5 }),
            "COD:ALP": link(COD, ALP, { trust: -0.4, tension: 0.5 }),
            "USA:COD": link(USA, COD),
            "COD:USA": link(COD, USA),
        },
    };
}
function pursuit(over = {}) {
    return { ...openPursuit(ALP, COD, "economic", 4, "economic", 2, "Tariffs imposed."), ...over };
}
describe("what a pursuit is made of", () => {
    it("takes its aim from the heaviest agenda the nation actually holds", () => {
        const campaign = threeNations();
        expect(leadingAim(campaign.nations[ALP])).toBe("economic");
    });
    it("has no aim to pursue when nothing the nation wants can be classified", () => {
        const campaign = threeNations();
        const runtime = campaign.nations[ALP];
        const traits = { ...runtime.traits, agendas: [{ id: "??", description: "unclassifiable", weight: 1 }] };
        expect(leadingAim({ ...runtime, traits })).toBeUndefined();
    });
    it("counts coercion, not contact, as the start of a campaign", () => {
        // A démarche is how states talk to each other. Treating it as the opening
        // of a campaign would make every nation permanently be running one against
        // everyone it has an embassy in.
        expect(opensPursuit("diplomatic")).toBe(false);
        expect(opensPursuit("economic")).toBe(true);
        expect(opensPursuit("covert")).toBe(true);
        expect(opensPursuit("military")).toBe(true);
    });
});
describe("a campaign across turns", () => {
    it("holds its rung while it is gaining", () => {
        const gaining = pursuit({ progress: 0.5, commitment: 0.8, rungReached: 2 });
        expect(wantedRung(gaining)).toBe(2);
    });
    it("steps up once it has spent enough to have something to lose and is not getting it", () => {
        const stalled = pursuit({ progress: -0.2, commitment: 0.8, rungReached: 2 });
        expect(wantedRung(stalled)).toBe(3);
    });
    it("does not escalate on the strength of one bad week", () => {
        // Commitment is what makes escalation make sense: a state that has barely
        // started walks away instead of doubling down.
        const early = pursuit({ progress: -0.1, commitment: 0.2, rungReached: 2 });
        expect(wantedRung(early)).toBe(2);
    });
    it("never climbs past the top of the ladder", () => {
        const atTop = pursuit({ progress: -0.5, commitment: 1, rungReached: 5 });
        expect(wantedRung(atTop)).toBe(5);
    });
    it("gains on a success and loses on a failure, weighted by how far up the ladder the move was", () => {
        const opened = pursuit({ progress: 0, commitment: 0.2 });
        const smallWin = advancePursuit(opened, { success: true, rung: 1, instrument: "economic", summary: "x" }, 5);
        const bigWin = advancePursuit(opened, { success: true, rung: 5, instrument: "economic", summary: "x" }, 5);
        expect(bigWin.progress).toBeGreaterThan(smallWin.progress);
        const loss = advancePursuit(opened, { success: false, rung: 3, instrument: "economic", summary: "x" }, 5);
        expect(loss.progress).toBeLessThan(0);
    });
    it("remembers the highest rung it has used rather than the last one", () => {
        const escalated = advancePursuit(pursuit({ rungReached: 4 }), { success: true, rung: 2, instrument: "economic", summary: "x" }, 5);
        expect(escalated.rungReached).toBe(4);
    });
    it("becomes readable from outside the moment any part of it is run in the open", () => {
        const hidden = pursuit({ overt: false });
        const surfaced = advancePursuit(hidden, { success: true, rung: 2, instrument: "economic", summary: "x" }, 5);
        expect(surfaced.overt).toBe(true);
    });
    it("closes as achieved once it has got what it came for", () => {
        const nearly = pursuit({ progress: 0.95, commitment: 0.6 });
        const done = advancePursuit(nearly, { success: true, rung: 5, instrument: "economic", summary: "x" }, 9);
        expect(done.status).toBe("achieved");
        expect(done.closedTurn).toBe(9);
    });
    it("closes as abandoned once it has spent everything and moved the target backwards", () => {
        const spent = pursuit({ progress: -0.3, commitment: 0.9 });
        const over = advancePursuit(spent, { success: false, rung: 3, instrument: "economic", summary: "x" }, 9);
        expect(over.status).toBe("abandoned");
    });
    it("keeps every week of it on the record", () => {
        const opened = pursuit();
        const later = advancePursuit(opened, { success: false, rung: 2, instrument: "economic", summary: "Sanctions fail." }, 6);
        expect(later.beats).toHaveLength(2);
        expect(later.beats.at(-1)).toEqual({ turn: 6, description: "Sanctions fail." });
    });
});
describe("what the agent does with one", () => {
    it("adds nothing at all where there is no campaign", () => {
        // The floor matters: a world with no pursuits in it has to behave exactly
        // as it did before pursuits existed, or every balance figure moves.
        expect(focusFor(threeNations(), ALP, COD, 3)).toBe(0);
    });
    it("pulls hardest toward the rung the campaign wants, not toward the target as such", () => {
        const campaign = threeNations();
        const running = pursuit({ commitment: 0.8, progress: 0.3, rungReached: 3 });
        const withPursuit = { ...campaign, pursuits: { [running.id]: running } };
        const atWanted = focusFor(withPursuit, ALP, COD, 3);
        const oneOff = focusFor(withPursuit, ALP, COD, 2);
        expect(atWanted).toBeGreaterThan(oneOff);
        expect(oneOff).toBeGreaterThan(0);
    });
    it("says nothing about a move two rungs off what the campaign is for", () => {
        // A campaign running an embargo is not partly satisfied by a démarche. The
        // falloff used to be spread across the whole ladder, which left a pursuit
        // that had decided it needed the next rung almost as content with the one
        // below — and every other term then outvoted the difference, so nothing in
        // the world ever climbed past the third rung of any ladder.
        const campaign = threeNations();
        const running = pursuit({ commitment: 0.8, progress: 0.3, rungReached: 3 });
        const withPursuit = { ...campaign, pursuits: { [running.id]: running } };
        expect(focusFor(withPursuit, ALP, COD, 1)).toBe(0);
        expect(focusFor(withPursuit, ALP, COD, 5)).toBe(0);
    });
    it("pulls harder the more the nation has already put in", () => {
        const campaign = threeNations();
        const shallow = pursuit({ commitment: 0.2, rungReached: 3, progress: 0.3 });
        const deep = pursuit({ commitment: 1, rungReached: 3, progress: 0.3 });
        expect(focusFor({ ...campaign, pursuits: { [deep.id]: deep } }, ALP, COD, 3)).toBeGreaterThan(focusFor({ ...campaign, pursuits: { [shallow.id]: shallow } }, ALP, COD, 3));
    });
    it("says nothing about a target the campaign is not aimed at", () => {
        const campaign = threeNations();
        const running = pursuit({ commitment: 1 });
        expect(focusFor({ ...campaign, pursuits: { [running.id]: running } }, ALP, USA, 2)).toBe(0);
    });
});
describe("a pursuit nobody touched", () => {
    it("loses some of its force for every week it is left alone", () => {
        const idle = pursuit({ commitment: 0.6, lastActedTurn: 4 });
        const campaign = { ...threeNations(), turn: 6, pursuits: { [idle.id]: idle } };
        const [packet] = pursuitPhase(campaign);
        const after = apply(campaign, packet);
        expect(selectPursuitAgainst(after, ALP, COD).commitment).toBeLessThan(0.6);
    });
    it("lapses altogether once the actor has plainly moved on", () => {
        // Well past the stale window, which is counted in the actor's own turns:
        // only a few capitals act in a week, so a campaign that has gone this long
        // untouched has been passed over on turns its author actually had.
        const forgotten = pursuit({ commitment: 0.6, lastActedTurn: 2 });
        const campaign = { ...threeNations(), turn: 60, pursuits: { [forgotten.id]: forgotten } };
        const after = apply(campaign, pursuitPhase(campaign)[0]);
        expect(selectActivePursuits(after)).toHaveLength(0);
        expect(after.pursuits[forgotten.id].status).toBe("abandoned");
        expect(after.feed.some((item) => item.kind === "pursuit")).toBe(true);
    });
    it("does not report a campaign that has only ever been run in the dark", () => {
        const covert = pursuit({ overt: false, lastActedTurn: 2 });
        const campaign = { ...threeNations(), turn: 60, pursuits: { [covert.id]: covert } };
        const after = apply(campaign, pursuitPhase(campaign)[0]);
        expect(after.pursuits[covert.id].status).toBe("abandoned");
        expect(after.feed.filter((item) => item.kind === "pursuit")).toHaveLength(0);
    });
    it("leaves a campaign that was pressed this week alone", () => {
        const live = pursuit({ commitment: 0.6, lastActedTurn: 7 });
        const campaign = { ...threeNations(), turn: 7, pursuits: { [live.id]: live } };
        expect(pursuitPhase(campaign)).toEqual([]);
    });
});
describe("the world running campaigns on itself", () => {
    // A world hostile enough that somebody reaches for something. The point is
    // not which nation moves — it is that whoever does keeps at it.
    function pressured() {
        const campaign = threeNations();
        const raise = (id) => {
            const runtime = campaign.nations[id];
            return {
                ...runtime,
                traits: { ...runtime.traits, aggression: 0.8, opportunism: 0.9, isolationism: 0, riskTolerance: 0.7 },
            };
        };
        return {
            ...campaign,
            nations: { ...campaign.nations, [ALP]: raise(ALP), [COD]: raise(COD) },
        };
    }
    function runWeeks(count) {
        let campaign = pressured();
        for (let i = 0; i < count; i += 1) {
            for (const packet of npcActionPhase(campaign))
                campaign = apply(campaign, packet);
            campaign = { ...campaign, turn: campaign.turn + 1 };
        }
        return campaign;
    }
    it("turns a coercive move into a standing campaign, and a démarche into nothing", () => {
        const campaign = pressured();
        const streams = createRngStreams(campaign.seed);
        const outcome = runNpcTurn(campaign, ALP, streams);
        expect(outcome, "the pressured fixture must produce a move to assert about").toBeDefined();
        const coercive = opensPursuit(outcome.result.projection.request.instrument);
        expect(Boolean(outcome.pursuit)).toBe(coercive);
    });
    it("actually opens campaigns in a pressured world", () => {
        // The guard on the two tests below, which would otherwise pass on an empty
        // board: a world where nothing is ever pursued satisfies "no duplicates"
        // and "same result twice" without exercising a line of this file.
        expect(Object.keys(runWeeks(12).pursuits).length).toBeGreaterThan(0);
    });
    it("carries one campaign forward rather than opening a second against the same target", () => {
        const pairs = selectActivePursuits(runWeeks(12)).map((p) => `${p.actor}:${p.target}`);
        expect(new Set(pairs).size).toBe(pairs.length);
    });
    it("escalates a campaign that keeps failing rather than repeating one move forever", () => {
        // The emergent ladder: nothing decides in advance that this pair goes
        // further, only that a state which has spent and not gained reaches higher.
        const stalled = selectActivePursuits(runWeeks(16)).filter((p) => p.commitment > 0.4 && p.progress <= 0);
        for (const p of stalled)
            expect(wantedRung(p)).toBeGreaterThan(p.rungReached === 5 ? 4 : p.rungReached - 1);
    });
    it("produces the same campaigns from the same seed, every replay", () => {
        expect(runWeeks(10).pursuits).toEqual(runWeeks(10).pursuits);
    });
});
