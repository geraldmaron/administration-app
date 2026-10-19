/**
 * Other governments' coercion, rationed: acts of force spend a term's cap and
 * rest the pair, a war newly opened with a government on a priced strait's
 * shores spends one of the term's two strait closures and rests the strait,
 * and the agent refuses what the ledger has no room for before it prices it.
 */
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { NPC_ACTS_OF_FORCE, NPC_STRAIT_CLOSURES, coercionClaims, straitsANewWarWouldClose } from "./coercion-tempo.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { decideNpcAction } from "./npc-agent.js";
import { firstTempoRefusal, pairKey, tempoLedger } from "./npc-tempo.js";
import { npcTempoRecord } from "./npc-turn.js";
import { createRngStreams } from "./rng.js";
const ISR = "ISR";
const LBN = "LBN";
const IRN = "IRN";
const SAU = "SAU";
const YEM = "YEM";
const { campaign: BARE } = foundedForBalance("npc-restraint", "democrat", {}, { carriedWorld: false });
function withLedger(campaign, entries) {
    return { ...campaign, npcTempo: entries.map((entry) => ({ ...entry, keepUntil: entry.turn + 208 })) };
}
function atWar(campaign, aggressor, defender) {
    const war = openConflict(aggressor, defender, campaign.turn, "A test war.");
    return { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
}
const force = (rung, actor, target) => ({ actor, target, instrument: "military", rung });
describe("the straits a new war would close", () => {
    it("names a priced strait one of the pair holds a shore of, while no war contests it", () => {
        expect(straitsANewWarWouldClose(BARE, SAU, IRN)).toEqual(["CP-HORMUZ"]);
        expect(straitsANewWarWouldClose(BARE, SAU, YEM)).toEqual(["CP-BAB-EL-MANDEB"]);
        expect(straitsANewWarWouldClose(BARE, ISR, LBN)).toEqual([]);
    });
    it("names nothing a war on the board already contests, and nothing between a pair already at war", () => {
        expect(straitsANewWarWouldClose(atWar(BARE, ISR, IRN), SAU, IRN)).toEqual([]);
        expect(straitsANewWarWouldClose(atWar(BARE, SAU, IRN), SAU, IRN)).toEqual([]);
    });
});
describe("what an act claims", () => {
    it("claims the pair for an act of force, and nothing for a lower rung", () => {
        expect(coercionClaims(BARE, force(4, ISR, LBN)).map((claim) => claim.family.id)).toEqual([NPC_ACTS_OF_FORCE.id]);
        expect(coercionClaims(BARE, { actor: ISR, target: LBN, instrument: "military", rung: 2 })).toEqual([]);
        expect(coercionClaims(BARE, { actor: ISR, target: LBN, instrument: "economic", rung: 5 })).toEqual([]);
    });
    it("claims a strait closure where the act could open a war with a government on its shores", () => {
        const claims = coercionClaims(BARE, force(3, SAU, IRN));
        expect(claims.map((claim) => [claim.family.id, claim.key])).toEqual([
            [NPC_ACTS_OF_FORCE.id, pairKey(SAU, IRN)],
            [NPC_STRAIT_CLOSURES.id, "CP-HORMUZ"],
        ]);
    });
    it("refuses an act once the term's two strait closures are spent, naming the closures", () => {
        const spent = withLedger(BARE, [
            { family: NPC_STRAIT_CLOSURES.id, key: "CP-BAB-EL-MANDEB", actor: ISR, turn: 0 },
            { family: NPC_STRAIT_CLOSURES.id, key: "CP-BAB-EL-MANDEB", actor: ISR, turn: 0 },
        ]);
        expect(firstTempoRefusal(spent, coercionClaims(spent, force(3, SAU, IRN)))).toMatch(/2 strait closures/);
        expect(firstTempoRefusal(spent, coercionClaims(spent, force(4, ISR, LBN)))).toBeUndefined();
    });
    it("rests a strait half a term after a closure", () => {
        const closed = withLedger(BARE, [{ family: NPC_STRAIT_CLOSURES.id, key: "CP-HORMUZ", actor: ISR, turn: 0 }]);
        expect(firstTempoRefusal({ ...closed, turn: 50 }, coercionClaims(closed, force(3, SAU, IRN)))).toMatch(/Strait of Hormuz rest 104 weeks/);
        expect(firstTempoRefusal({ ...closed, turn: 104 }, coercionClaims(closed, force(3, SAU, IRN)))).toBeUndefined();
    });
});
describe("the agent", () => {
    const military = (campaign) => decideNpcAction(campaign, ISR, createRngStreams(campaign.seed), { targets: [LBN] });
    it("ranks acts of force against a pair with room in the ledger", () => {
        expect(military(BARE).ranked.some((candidate) => candidate.request.instrument === "military" && candidate.request.rung >= 3)).toBe(true);
    });
    it("refuses every act of force on a pair still resting, and still weighs what is not force", () => {
        const resting = withLedger(BARE, [{ family: NPC_ACTS_OF_FORCE.id, key: pairKey(ISR, LBN), actor: LBN, turn: BARE.turn }]);
        const decision = military(resting);
        expect(decision.ranked.some((candidate) => candidate.request.instrument === "military" && candidate.request.rung >= 3)).toBe(false);
        expect(decision.ranked.some((candidate) => candidate.request.instrument === "military" && candidate.request.rung === 2)).toBe(true);
        expect(decision.rejected.filter((rejection) => rejection.missingCapability === "room in the world's tempo for this act")).toHaveLength(3);
    });
    it("refuses every act of force once the world has made a term's worth", () => {
        const entries = Array.from({ length: NPC_ACTS_OF_FORCE.perTerm }, (_, i) => ({ family: NPC_ACTS_OF_FORCE.id, key: `X${i}|Y${i}`, actor: SAU, turn: BARE.turn }));
        const decision = military(withLedger(BARE, entries));
        expect(decision.ranked.some((candidate) => candidate.request.instrument === "military" && candidate.request.rung >= 3)).toBe(false);
    });
});
describe("what a made act spends", () => {
    const opened = (campaign, aggressor, defender) => [
        { kind: "conflict", set: openConflict(aggressor, defender, campaign.turn, "A war.", "blockade") },
    ];
    it("spends an act of force landed or not, and a closure only where the act opened a war on a strait's shore", () => {
        const failed = npcTempoRecord(BARE, force(3, SAU, IRN), []);
        expect(failed?.kind === "npcTempo" && failed.entries.map((entry) => entry.family)).toEqual([NPC_ACTS_OF_FORCE.id]);
        const war = npcTempoRecord(BARE, force(3, SAU, IRN), opened(BARE, SAU, IRN));
        expect(war?.kind === "npcTempo" && war.entries.map((entry) => entry.family)).toEqual([NPC_ACTS_OF_FORCE.id, NPC_STRAIT_CLOSURES.id]);
    });
    it("spends nothing for a lower rung, and writes what it spends onto the ledger", () => {
        expect(npcTempoRecord(BARE, { actor: ISR, target: LBN, instrument: "military", rung: 2 }, [])).toBeUndefined();
        const record = npcTempoRecord(BARE, force(4, ISR, LBN), []);
        const after = apply(BARE, { source: "simulate", actor: "world", turn: BARE.turn, narration: { summary: "A strike." }, effects: [record] });
        expect(tempoLedger(after).map((entry) => [entry.family, entry.key, entry.actor])).toEqual([[NPC_ACTS_OF_FORCE.id, pairKey(ISR, LBN), ISR]]);
    });
});
