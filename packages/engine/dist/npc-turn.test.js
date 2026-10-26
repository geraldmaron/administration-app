import { describe, expect, it } from "vitest";
import { Nation, Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
import { relationshipKey, selectFeed, selectRelationship } from "./state.js";
import { feedVisibility, MAX_NPC_ACTIONS_PER_TURN, npcActionPhase, npcActorsThisTurn, runNpcTurn } from "./npc-turn.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { decideNpcAction, explainNpcDecision, npcActStamp, toTerms } from "./npc-agent.js";
import { createGrudge } from "./relationships.js";
import { resolveAction } from "./resolution.js";
import { apply } from "./effects.js";
const seed = makeCampaignSeed("npc-turn-seed");
const streams = () => createRngStreams(seed);
// A third nation, so two NPCs can act on each other while the player watches.
const nationC = Nation.parse({
    ...nationB,
    id: "BOR",
    identity: { ...nationB.identity, name: "Boria" },
    geo: { ...nationB.geo, neighbors: ["ALP"] },
    stats: { ...nationB.stats, trade: { ...nationB.stats.trade, topPartners: ["USA"] } },
    traits: {
        ...nationB.traits,
        aggression: 0.85,
        opportunism: 0.85,
        isolationism: 0,
        riskTolerance: 0.8,
        vengefulness: 0.8,
        legalism: 0.1,
        agendas: [{ id: "sphere-of-influence", description: "Dominate its near abroad", weight: 0.9 }],
    },
});
function relation(from, to, overrides = {}) {
    return Relationship.parse({
        from,
        to,
        trust: 0.2,
        alignment: 0.1,
        tension: 0.1,
        tradeDependence: 0.3,
        militaryThreat: 0.1,
        treaties: [],
        grudges: [],
        history: [],
        ...overrides,
    });
}
// The player is the largest trading partner of both NPCs, so whichever of
// them moves on the other, it is not a spectator sport: the ripple reaches
// the player's own reading of the aggressor.
function threeNationCampaign(overrides = {}) {
    const base = buildCampaign();
    const hostile = { trust: -0.5, tension: 0.85, ...overrides };
    const alpNation = Nation.parse({
        ...nationB,
        geo: { ...nationB.geo, neighbors: ["BOR"] },
        stats: { ...nationB.stats, trade: { ...nationB.stats.trade, topPartners: [nationA.id] } },
    });
    const alp = { ...base.nations[nationB.id], base: alpNation, stats: alpNation.stats };
    const pairs = [
        [nationC.id, nationB.id, hostile],
        [nationB.id, nationC.id, hostile],
        [nationA.id, nationB.id, {}],
        [nationB.id, nationA.id, {}],
        [nationA.id, nationC.id, {}],
        [nationC.id, nationA.id, {}],
    ];
    return {
        ...base,
        nations: {
            ...base.nations,
            [nationB.id]: alp,
            [nationC.id]: { base: nationC, stats: nationC.stats, traits: nationC.traits },
        },
        relationships: Object.fromEntries(pairs.map(([from, to, o]) => [relationshipKey(from, to), relation(from, to, o)])),
    };
}
describe("nations acting against each other", () => {
    it("resolves an NPC move through the same resolver the player commits through", () => {
        const campaign = threeNationCampaign();
        const outcome = runNpcTurn(campaign, nationC.id, streams());
        expect(outcome).toBeDefined();
        // The packet is a normal resolver packet, marked as world-simulated.
        expect(outcome.result.packet.source).toBe("simulate");
        expect(outcome.result.projection.successChance).toBe(outcome.decision.chosen.projection.successChance);
        expect(outcome.result.projection.cost).toEqual(outcome.decision.chosen.projection.cost);
    });
    it("stamps the move with the weighted terms the actor chose it on, and names the heaviest by key", () => {
        const campaign = threeNationCampaign();
        const outcome = runNpcTurn(campaign, nationC.id, streams());
        const stamp = outcome.result.packet.provenance?.decision;
        expect(stamp?.question).toBe("npc-act");
        expect(stamp?.actor).toBe(nationC.id);
        expect(stamp?.subject).toBe(outcome.decision.chosen.request.target);
        expect(stamp?.visibility).toBe("intelligence");
        expect(stamp?.terms).toEqual(toTerms(outcome.decision.chosen.terms));
        const heaviest = [...stamp.terms].sort((a, b) => b.value - a.value)[0];
        expect(explainNpcDecision(outcome.decision)).toContain(`led by ${heaviest.key}.`);
        const after = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
        const stamped = after.ledger.filter((entry) => entry.causal?.decision?.question === "npc-act");
        expect(stamped.length).toBeGreaterThan(0);
    });
    it("stamps the same reason on a replay, since a reason is read off the decision rather than drawn", () => {
        const campaign = threeNationCampaign();
        const once = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
        const again = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
        expect(again.ledger.map((entry) => entry.causal?.decision)).toEqual(once.ledger.map((entry) => entry.causal?.decision));
        const decision = decideNpcAction(campaign, nationC.id, streams());
        expect(npcActStamp(campaign, decision)).toEqual(npcActStamp(campaign, decision));
    });
    it("never lets the player's own nation act as an NPC", () => {
        const campaign = threeNationCampaign();
        for (const packet of npcActionPhase(campaign)) {
            expect(packet.narration.summary.startsWith(nationA.id)).toBe(false);
        }
    });
    it("caps how many nations move in one turn", () => {
        const campaign = threeNationCampaign();
        expect(npcActionPhase(campaign).length).toBeLessThanOrEqual(MAX_NPC_ACTIONS_PER_TURN);
    });
    it("puts what happened in front of the player, in fiction", () => {
        const campaign = threeNationCampaign();
        const after = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
        const feed = selectFeed(after);
        expect(feed.length).toBeGreaterThan(0);
        for (const item of feed) {
            expect(item.headline.trim().length).toBeGreaterThan(0);
            expect(item.kind).toBe("npc-action");
            expect(item.actor).not.toBe(nationA.id);
            expect(item.facts?.instrument).toEqual(expect.any(String));
            expect(item.facts?.instrument?.length).toBeGreaterThan(0);
            // A feed item and the ledger entry beside it describe the same turn, in
            // different words: the ledger keeps the resolver's own account of the
            // commitment, and the feed is written for a reader.
            expect(after.ledger.some((entry) => entry.turn === item.turn)).toBe(true);
            // And the feed line is a sentence, not a catalogue row.
            expect(item.headline).not.toMatch(/ attempts | applies | uses .* against /);
            expect(item.headline).toMatch(/[.!?]$/);
        }
    });
    it("changes the player's own standing with the nations involved", () => {
        const campaign = threeNationCampaign();
        const after = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
        const aggressor = selectFeed(after)[0].actor;
        const before = selectRelationship(campaign, nationA.id, aggressor);
        const now = selectRelationship(after, nationA.id, aggressor);
        // The player trades with the target, so an attack on it is the player's
        // business: their reading of the aggressor moves without them acting.
        expect(now.trust).toBeLessThan(before.trust);
        expect(now.tension).toBeGreaterThan(before.tension);
    });
    it("keeps a covert move the player cannot see out of the feed", () => {
        const campaign = threeNationCampaign();
        // Blind the player's services and harden the actor's: whatever BOR runs
        // quietly this turn, USA does not hear about it unless it goes wrong.
        const blinded = {
            ...campaign,
            nations: {
                ...campaign.nations,
                [nationA.id]: {
                    ...campaign.nations[nationA.id],
                    stats: {
                        ...campaign.nations[nationA.id].stats,
                        security: { ...campaign.nations[nationA.id].stats.security, intelCapability: 0 },
                    },
                },
            },
        };
        const after = advanceTurn(blinded, { simulate: npcActionPhase, select: noopPhase });
        for (const item of selectFeed(after)) {
            expect(item.headline).not.toContain("quietly folds");
        }
    });
    it("runs an escalation between two NPCs to resolution without the player", () => {
        let campaign = threeNationCampaign({
            grudges: [createGrudge("border-incident", 0.8, 0, 0.8)],
        });
        const feedByTurn = [];
        const playerLedgerBefore = campaign.ledger.length;
        for (let i = 0; i < 12; i++) {
            campaign = advanceTurn(campaign, { simulate: npcActionPhase, select: noopPhase });
            feedByTurn.push(selectFeed(campaign).length);
        }
        // Both sides pressed each other, not one side monologuing.
        const actors = new Set(selectFeed(campaign).map((item) => item.actor));
        expect(actors.has(nationC.id)).toBe(true);
        expect(actors.size).toBeGreaterThan(1);
        // It went somewhere: the exchange left a mark on the pair's own reading of
        // each other rather than looping forever on the same beat.
        const rel = selectRelationship(campaign, nationC.id, nationB.id);
        expect(rel.history.length + rel.grudges.length).toBeGreaterThan(0);
        // And the player was never required to participate.
        expect(campaign.ledger.length).toBeGreaterThan(playerLedgerBefore);
        expect(feedByTurn[feedByTurn.length - 1]).toBeGreaterThan(feedByTurn[0]);
    });
    it("produces the same world twice from the same seed", () => {
        const campaign = threeNationCampaign();
        const run = () => {
            let c = campaign;
            for (let i = 0; i < 6; i++)
                c = advanceTurn(c, { simulate: npcActionPhase, select: noopPhase });
            return c;
        };
        const [first, second] = replay(seed, run);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
});
// Openness does not establish that this particular operation was exposed.
describe("covert news requires recorded exposure", () => {
    function withTransparency(nation, transparency) {
        const campaign = buildCampaign();
        const runtime = campaign.nations[nation];
        return {
            ...campaign,
            nations: {
                ...campaign.nations,
                [nation]: { ...runtime, traits: { ...runtime.traits, transparency } },
                // Blind the player's own services, so nothing but the actor's own
                // openness could put this in the feed.
                [campaign.founding.nation]: {
                    ...campaign.nations[campaign.founding.nation],
                    stats: {
                        ...campaign.nations[campaign.founding.nation].stats,
                        security: { ...campaign.nations[campaign.founding.nation].stats.security, intelCapability: 0 },
                    },
                },
            },
        };
    }
    const unexposedCovert = { covert: true, exposed: false, actor: "ALP" };
    it("keeps an open state's unexposed operation out of the papers", () => {
        expect(feedVisibility(withTransparency("ALP", 0.95), unexposedCovert)).toBeUndefined();
        expect(feedVisibility(withTransparency("ALP", 0.95), { ...unexposedCovert, exposed: true })).toBe("public");
    });
    it("leaves a closed state's operation invisible to services that cannot outread it", () => {
        expect(feedVisibility(withTransparency("ALP", 0.05), unexposedCovert)).toBeUndefined();
    });
    it("does not touch how an overt move is reported", () => {
        const overt = { covert: false, exposed: false, actor: "ALP" };
        expect(feedVisibility(withTransparency("ALP", 0.05), overt)).toBe("public");
    });
});
describe("a government keeping a promise it published", () => {
    // The neighbor declares a line, the President crosses it, and the week
    // after it is the government's turn to answer.
    function afterTheStrike() {
        const base = threeNationCampaign();
        const runtime = base.nations[nationC.id];
        const declared = {
            ...runtime,
            base: {
                ...runtime.base,
                doctrine: {
                    posture: "assertive",
                    redLines: [{ id: "homeland-defense", description: "No foreign force operates on its soil, ever." }],
                    alignmentPull: [],
                },
            },
        };
        return {
            ...base,
            turn: 4,
            nations: { ...base.nations, [nationC.id]: declared },
            ledger: [
                {
                    turn: 3,
                    actor: "player",
                    description: "United States uses Forward Deploy against Boria.",
                    commitment: { instrument: "military", rung: 3, target: nationC.id, landed: true },
                },
            ],
        };
    }
    it("names the line in the bulletin, in the words the government published", () => {
        const outcome = runNpcTurn(afterTheStrike(), nationC.id, streams());
        expect(outcome?.decision.chosen?.answering?.redLine.id).toBe("homeland-defense");
        expect(outcome?.feedItem?.headline).toContain("No foreign force operates on its soil, ever.");
    });
    it("says it plainly the rest of the time", () => {
        const outcome = runNpcTurn(threeNationCampaign(), nationC.id, streams());
        expect(outcome?.feedItem?.headline).not.toContain("answers what it said it would answer");
    });
});
describe("who gets the week", () => {
    it("draws the order rather than taking it in alphabetical order", () => {
        // The old rule sorted on the nation id, which made the cap a permanent
        // queue: whoever sorted last never acted, however often they wanted to.
        const campaign = threeNationCampaign();
        const eager = { ...campaign.nations[nationB.id].traits, opportunism: 1, aggression: 1, isolationism: 0 };
        const keen = {
            ...campaign,
            nations: {
                ...campaign.nations,
                [nationB.id]: { ...campaign.nations[nationB.id], traits: eager },
                [nationC.id]: { ...campaign.nations[nationC.id], traits: eager },
            },
        };
        const seen = new Set();
        for (let turn = 1; turn <= 40; turn++) {
            for (const id of npcActorsThisTurn({ ...keen, turn }, streams()))
                seen.add(id);
        }
        // Both act across the run, and the one that sorts later is not the one
        // that never appears.
        expect(seen.has(nationB.id)).toBe(true);
        expect(seen.has(nationC.id)).toBe(true);
    });
    it("picks the same capitals in the same weeks on a replay", () => {
        const campaign = threeNationCampaign();
        const walk = () => {
            const order = [];
            for (let turn = 1; turn <= 25; turn++) {
                order.push(npcActorsThisTurn({ ...campaign, turn }, streams()).join(","));
            }
            return order;
        };
        expect(walk()).toEqual(walk());
    });
});
describe("a government with something to answer", () => {
    // The player sanctions ALP the week before each draw, so ALP holds a fresh
    // intent to answer in every week measured; nothing else differs.
    function sanctionedAt(campaign, turn) {
        const before = { ...campaign, turn: turn - 1 };
        const sanction = resolveAction(before, { actor: nationA.id, target: nationB.id, instrument: "economic", rung: 1 }, streams(), "action");
        if (!sanction.ok)
            throw new Error(`sanction refused: ${sanction.reason}`);
        return { ...apply(before, sanction.packet), turn };
    }
    it("takes the week more often while the act is fresh, and still never past the cap", () => {
        const campaign = threeNationCampaign();
        let quiet = 0;
        let coerced = 0;
        for (let turn = 2; turn <= 61; turn++) {
            if (npcActorsThisTurn({ ...campaign, turn }, streams()).includes(nationB.id))
                quiet += 1;
            const drawn = npcActorsThisTurn(sanctionedAt(campaign, turn), streams());
            expect(drawn.length).toBeLessThanOrEqual(MAX_NPC_ACTIONS_PER_TURN);
            if (drawn.includes(nationB.id))
                coerced += 1;
        }
        expect(coerced).toBeGreaterThan(quiet);
    });
});
describe("an answer on the wire", () => {
    it("names the act it answers in the bulletin", () => {
        const calm = threeNationCampaign({ trust: 0.3, tension: 0.05 });
        const sanction = resolveAction(calm, { actor: nationA.id, target: nationB.id, instrument: "economic", rung: 1 }, streams(), "action");
        if (!sanction.ok)
            throw new Error(`sanction refused: ${sanction.reason}`);
        const after = { ...apply(calm, sanction.packet), turn: calm.turn + 1 };
        const outcome = runNpcTurn(after, nationB.id, streams());
        expect(outcome?.decision.chosen?.responding?.toward).toBe(nationA.id);
        expect(outcome?.feedItem?.headline).toMatch(/^Alpland answers /);
    });
});
