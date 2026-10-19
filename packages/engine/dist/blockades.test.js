/**
 * A blockade as an act of war with a standing record: it opens the war and the
 * War Powers clock the first time, stops the target's seaborne trade only while
 * the force is on station, never compounds, and buys its President no rally.
 */
import { describe, expect, it } from "vitest";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { BLOCKADE_MAX_CUT, blockadeBy, blockadeCutOn, blockadesInForce } from "./blockades.js";
import { setCommitmentStatus } from "./commitments.js";
import { settleByAgreement } from "./conflicts.js";
import { apply } from "./effects.js";
import { externalMacroPressure } from "./external-pressure.js";
import { rungDefinition } from "./instruments.js";
import { warOpinionTerms } from "./opinion-war.js";
import { createRngStreams } from "./rng.js";
import { selectObligations, terminateForce, terminationClockRuns } from "./war-powers-report.js";
const USA = "USA";
const IRN = "IRN";
const CHN = "CHN";
const RUS = "RUS";
const { campaign: BARE } = foundedForBalance("blockade-proof", "democrat", {}, { carriedWorld: false });
const ctx = (campaign, actor, target) => ({ campaign, actor, target, streams: createRngStreams(campaign.seed) });
const BLOCKADE = rungDefinition("military", 3);
/** The rung's landed effects, applied as one packet the way the resolver applies them. */
function blockaded(campaign, actor, target) {
    const effects = BLOCKADE.resolve(ctx(campaign, actor, target));
    return apply(campaign, { source: "action", actor: actor === USA ? "player" : "world", turn: campaign.turn, narration: { summary: "A blockade." }, effects });
}
const growth = (campaign, nation) => externalMacroPressure(campaign, nation).growth;
describe("a first blockade is an act of war", () => {
    const after = blockaded(BARE, USA, IRN);
    it("opens a war on the first act, marked as opened by a blockade", () => {
        const wars = Object.values(after.conflicts).filter((war) => war.aggressor === USA && war.defender === IRN);
        expect(wars).toHaveLength(1);
        expect(wars[0].opening).toBe("blockade");
        expect(wars[0].status).toBe("active");
    });
    it("starts the War Powers clock and records the act as taken without a vote", () => {
        const obligation = selectObligations(after).find((entry) => entry.target === IRN);
        expect(obligation.kind).toBe("hostilities");
        expect(terminationClockRuns(after, obligation)).toBe(true);
        expect(after.congress.unauthorized.some((action) => action.target === IRN && action.rung === 3)).toBe(true);
    });
    it("writes nothing onto the target's trade and leaves a standing record instead", () => {
        expect(after.nations[IRN].stats.trade).toEqual(BARE.nations[IRN].stats.trade);
        const standing = blockadeBy(after, USA, IRN);
        expect(standing?.cut).toBeGreaterThan(0.5);
        expect(standing?.commitmentId).toBeDefined();
        expect(standing?.obligationId).toBeDefined();
    });
});
describe("what a blockade stops, and for how long", () => {
    const after = blockaded(BARE, USA, IRN);
    const standing = blockadeBy(after, USA, IRN);
    it("takes growth off the target only while it stands", () => {
        expect(growth(after, IRN)).toBeLessThan(growth(BARE, IRN));
    });
    it("is lifted by a recall, and the target's growth returns to where it would have been", () => {
        const recalled = setCommitmentStatus(after, standing.commitmentId, "wound-down", "Recalled.");
        expect(recalled.ok).toBe(true);
        if (!recalled.ok)
            return;
        const home = apply(after, recalled.packet);
        expect(blockadesInForce(home)).toEqual([]);
        expect(blockadeCutOn(home, IRN)).toBe(0);
        const war = after.conflicts[standing.conflictId];
        const sameWarNoBlockade = { ...BARE, conflicts: { [war.id]: war } };
        expect(growth(home, IRN)).toBeCloseTo(growth(sameWarNoBlockade, IRN), 9);
    });
    it("is lifted when the war it opened ends", () => {
        const war = after.conflicts[standing.conflictId];
        const ended = { ...after, conflicts: { ...after.conflicts, [war.id]: settleByAgreement(war, after.turn, "Terms agreed.") } };
        expect(blockadeCutOn(ended, IRN)).toBe(0);
    });
    it("is lifted when the President terminates the use of force", () => {
        const terminated = terminateForce(after, standing.obligationId);
        expect(terminated.ok).toBe(true);
        if (!terminated.ok)
            return;
        expect(blockadeCutOn(apply(after, terminated.packet), IRN)).toBe(0);
    });
});
describe("repeated blockades do not compound", () => {
    const once = blockaded(BARE, CHN, RUS);
    it("refuses a second blockade by the same government while the first is on station", () => {
        expect(BLOCKADE.gate(ctx(once, CHN, RUS)).ok).toBe(false);
    });
    it("leaves the target's trade at founding however many blockades it has seen", () => {
        expect(once.nations[RUS].stats.trade.imports).toBe(BARE.nations[RUS].stats.trade.imports);
        const ended = { ...once, conflicts: Object.fromEntries(Object.entries(once.conflicts).map(([id, war]) => [id, settleByAgreement(war, once.turn, "Terms agreed.")])) };
        const lifted = withWeeksElapsed(ended, 1);
        const twice = blockaded(lifted, CHN, RUS);
        expect(twice.nations[RUS].stats.trade.imports).toBe(BARE.nations[RUS].stats.trade.imports);
        expect(blockadesInForce(twice)).toHaveLength(1);
    });
    it("reads two navies off one coast as the heavier blockade, never the sum", () => {
        const both = blockaded(once, USA, RUS);
        const cuts = blockadesInForce(both).filter((blockade) => blockade.target === RUS).map((blockade) => blockade.cut);
        expect(cuts).toHaveLength(2);
        expect(blockadeCutOn(both, RUS)).toBe(Math.max(...cuts));
        expect(blockadeCutOn(both, RUS)).toBeLessThanOrEqual(BLOCKADE_MAX_CUT);
    });
});
describe("no rally for a war the President opened by blockade", () => {
    it("withholds the rally from a war the country started by closing a coast", () => {
        const after = blockaded(BARE, USA, IRN);
        const terms = warOpinionTerms(after);
        expect(terms.wars).toBe(1);
        expect(terms.rally).toBe(0);
    });
    it("still rallies a country that is itself blockaded", () => {
        const after = blockaded(BARE, CHN, USA);
        expect(warOpinionTerms(after).rally).toBeGreaterThan(0);
    });
});
