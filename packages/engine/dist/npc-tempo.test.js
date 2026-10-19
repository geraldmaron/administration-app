/**
 * The world's tempo ledger: a family's cap counts acts in the last term, a key
 * rests for the family's cooldown, entries leave the ledger once they can no
 * longer refuse anything, and two families never read each other's acts.
 */
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { TERM_WEEKS, actsThisTerm, firstTempoRefusal, pairKey, tempoEffect, tempoLedger, tempoRefusal, } from "./npc-tempo.js";
const CHN = "CHN";
const RUS = "RUS";
const POL = "POL";
const { campaign: BARE } = foundedForBalance("tempo-proof", "democrat", {}, { carriedWorld: false });
const FORCE = { id: "test-force", perTerm: 2, cooldownWeeks: 26, noun: "acts of force" };
const OPERATIONS = { id: "test-operations", perTerm: 6, cooldownWeeks: 52, noun: "regime operations" };
const at = (campaign, turn) => ({ ...campaign, turn });
function acted(campaign, actor, claims) {
    const effect = tempoEffect(campaign, actor, claims);
    if (!effect)
        return campaign;
    return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "An act." }, effects: [effect] });
}
const claim = (family, a, b) => ({ family, key: pairKey(a, b), label: `${a} and ${b}` });
describe("the tempo ledger", () => {
    it("reads an older save with no ledger as no acts made", () => {
        expect(BARE.npcTempo).toBeUndefined();
        expect(tempoLedger(BARE)).toEqual([]);
        expect(tempoRefusal(BARE, claim(FORCE, CHN, RUS))).toBeUndefined();
    });
    it("keys a pair the same whichever government acted", () => {
        expect(pairKey(CHN, RUS)).toBe(pairKey(RUS, CHN));
    });
    it("rests a pair for the family's cooldown, in both directions, and then lets it act", () => {
        const after = acted(at(BARE, 10), CHN, [claim(FORCE, CHN, RUS)]);
        expect(tempoRefusal(at(after, 20), claim(FORCE, RUS, CHN))).toMatch(/rest 26 weeks/);
        expect(tempoRefusal(at(after, 36), claim(FORCE, RUS, CHN))).toBeUndefined();
        expect(tempoRefusal(at(after, 20), claim(FORCE, CHN, POL))).toBeUndefined();
    });
    it("refuses every key once the world has made a term's acts, and counts only the last term", () => {
        const one = acted(at(BARE, 10), CHN, [claim(FORCE, CHN, RUS)]);
        const two = acted(at(one, 50), POL, [claim(FORCE, POL, RUS)]);
        expect(actsThisTerm(at(two, 60), FORCE)).toBe(2);
        expect(tempoRefusal(at(two, 60), claim(FORCE, CHN, POL))).toMatch(/its 2 acts of force for this term/);
        expect(tempoRefusal(at(two, 10 + TERM_WEEKS), claim(FORCE, CHN, POL))).toBeUndefined();
    });
    it("keeps two families apart: one family's acts never spend another's cap or rest its keys", () => {
        const one = acted(at(BARE, 10), CHN, [claim(FORCE, CHN, RUS)]);
        const two = acted(at(one, 11), POL, [claim(FORCE, POL, RUS)]);
        expect(firstTempoRefusal(at(two, 12), [claim(OPERATIONS, CHN, RUS)])).toBeUndefined();
        expect(actsThisTerm(at(two, 12), OPERATIONS)).toBe(0);
    });
    it("drops an entry once it can no longer refuse anything, so the ledger stays a term long", () => {
        const one = acted(at(BARE, 0), CHN, [claim(FORCE, CHN, RUS)]);
        const later = acted(at(one, TERM_WEEKS + 1), POL, [claim(FORCE, POL, RUS)]);
        expect(tempoLedger(later).map((entry) => entry.key)).toEqual([pairKey(POL, RUS)]);
    });
    it("writes nothing for an act that claims nothing", () => {
        expect(tempoEffect(BARE, CHN, [])).toBeUndefined();
    });
});
