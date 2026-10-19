import { describe, expect, it } from "vitest";
import { apply, hasIntelOnNation, openConflict } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { warFileReading } from "./war-file";
const RUS = "RUS";
const UKR = "UKR";
function invasion() {
    const opening = openingCampaign({ seedText: "war-file" });
    const conflict = openConflict(RUS, UKR, opening.turn, "Russia invades Ukraine.");
    return { campaign: { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } }, id: conflict.id };
}
/** Make a British government read possible while keeping China's internal decision covered. */
function withBritishRead(campaign) {
    const home = campaign.founding.nation;
    const ours = campaign.nations[home];
    const britain = campaign.nations["GBR"];
    const china = campaign.nations["CHN"];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [home]: { ...ours, stats: { ...ours.stats, security: { ...ours.stats.security, intelCapability: 1 } } },
            ["GBR"]: { ...britain, stats: { ...britain.stats, security: { ...britain.stats.security, counterIntel: 0 } } },
            ["CHN"]: { ...china, stats: { ...china.stats, security: { ...china.stats.security, counterIntel: 1 } } },
        },
    };
}
/**
 * One government's stamped answer about this war. An answer to the
 * President's call is public and weighs the call itself; a government
 * deciding on its own is an intelligence read with no term the file needs.
 */
function decision(question, nation, id, acts) {
    const called = question === "answer-call";
    return {
        question,
        actor: nation,
        subject: id,
        terms: called ? [{ key: "call-raised", source: "obligation", value: 0.2 }] : [],
        score: acts ? 0.7 : 0.3,
        threshold: 0.5,
        acts,
        close: false,
        visibility: called ? "public" : "intelligence",
    };
}
/** The campaign with one more decision on its ledger, recorded the way the engine records a world decision. */
function withStamp(campaign, stamp) {
    return apply(campaign, {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: `${stamp.actor} decides.` },
        effects: [],
        provenance: { origin: "world", entities: [stamp.actor, ...(stamp.subject ? [stamp.subject] : [])], systems: ["alliances"], visibility: stamp.visibility, decision: stamp },
    });
}
describe("a war's own file", () => {
    it("reads nothing for a conflict not on the board", () => {
        const { campaign } = invasion();
        expect(warFileReading(campaign, "war:none")).toBeUndefined();
    });
    it("prints a joiner with no reasons as 'Joined' alone, once one has joined with no stamp on record", () => {
        const { campaign, id } = invasion();
        const withJoiner = { ...campaign, conflicts: { ...campaign.conflicts, [id]: { ...campaign.conflicts[id], joined: { aggressor: ["BLR"], defender: [] } } } };
        const file = warFileReading(withJoiner, id);
        expect(file.joiners).toEqual([{ nation: "BLR", side: "aggressor", reasons: [] }]);
    });
    it("carries casualty bands per side, empty until the war has counted a week", () => {
        const { campaign, id } = invasion();
        const file = warFileReading(campaign, id);
        expect(file.casualties.aggressor).toBeUndefined();
        expect(file.casualties.defender).toBeUndefined();
    });
    it("reads the fogged join projection for each side without drawing", () => {
        const { campaign, id } = invasion();
        const file = warFileReading(campaign, id);
        expect(file.likelyJoiners.aggressor).toEqual([]);
        expect(file.likelyJoiners.defender).toEqual([]);
    });
    it("names no non-joiner the engine never stamped as staying out", () => {
        const { campaign, id } = invasion();
        expect(warFileReading(campaign, id).notableNonJoiners).toEqual([]);
    });
    it("names the refusals the engine stamped, only for governments the President reads, and never one that has gone home", () => {
        const { campaign: opening, id } = invasion();
        const campaign = withBritishRead(opening);
        const stamped = ["GBR", "CHN", "POL", "FRA"].reduce((state, nation) => withStamp(state, decision("join-war", nation, id, nation === "FRA")), campaign);
        const left = { ...stamped, conflicts: { ...stamped.conflicts, [id]: { ...stamped.conflicts[id], left: ["POL"] } } };
        expect(hasIntelOnNation(left, "GBR")).toBe(true);
        expect(hasIntelOnNation(left, "CHN")).toBe(false);
        expect(warFileReading(left, id).notableNonJoiners).toEqual(["GBR"]);
    });
});
describe("a war the President called allies into", () => {
    it("gives an ally that answered the call its reasons, not 'Joined' alone", () => {
        const { campaign: opening, id } = invasion();
        const campaign = withBritishRead(opening);
        const answered = withStamp(campaign, decision("answer-call", "GBR", id, true));
        const joined = { ...answered, conflicts: { ...answered.conflicts, [id]: { ...answered.conflicts[id], joined: { aggressor: [], defender: ["GBR"] } } } };
        const [britain] = warFileReading(joined, id).joiners;
        expect(britain?.nation).toBe("GBR");
        expect(britain?.reasons.map((reason) => reason.text)).toEqual(["Because of the call it was sent."]);
    });
    it("names an ally that turned the call down, only where the President's services read it", () => {
        const { campaign: opening, id } = invasion();
        const campaign = withBritishRead(opening);
        const declined = ["GBR", "CHN"].reduce((state, nation) => withStamp(state, decision("answer-call", nation, id, false)), campaign);
        expect(hasIntelOnNation(declined, "CHN")).toBe(false);
        expect(warFileReading(declined, id).notableNonJoiners).toEqual(["GBR"]);
    });
});
