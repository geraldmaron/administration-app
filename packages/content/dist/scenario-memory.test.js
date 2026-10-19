import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, flagMarker } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { castScenario, rememberReply } from "./scenario-cast.js";
import { scenarioAnsweredFlag, scenarioFiredFlag } from "./scenario.js";
import { deskDriftFlag, inactionPacket, priorAnswer, scenarioUnansweredFlag } from "./scenario-memory.js";
const def = (id) => {
    const found = FIXTURE_SCENARIOS.find((candidate) => candidate.id === id);
    if (!found)
        throw new Error(`no scenario ${id} in the fixtures`);
    return found;
};
const BORDER = "fixture-the-border-reading";
function answered(campaign, id, replyId) {
    const cast = castScenario(campaign, def(id));
    const option = cast.script.options.find((candidate) => candidate.id === replyId);
    const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
    if (!result.ok)
        throw new Error(`the fixture reply ${replyId} was refused: ${result.missingCapability}`);
    return apply(campaign, rememberReply(campaign, result.packet, cast, option.id));
}
function withTradeLane(campaign, partner) {
    const home = campaign.founding.nation;
    const runtime = campaign.nations[home];
    const trade = { ...runtime.stats.trade, tradeDependence: { ...runtime.stats.trade.tradeDependence, [partner]: 0.05 } };
    const stats = { ...runtime.stats, trade };
    return { ...campaign, nations: { ...campaign.nations, [home]: { ...runtime, stats, base: { ...runtime.base, stats } } } };
}
function metricDelta(packet, key) {
    return packet.effects
        .filter((effect) => effect.kind === "metric")
        .reduce((sum, effect) => sum + (effect.deltas[key] ?? 0), 0);
}
function flagsSet(packet) {
    return packet.effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : []));
}
describe("what the campaign remembers about a decision it already took", () => {
    it("dates the fired flag, so a callback can tell a fresh deed from a cold one", () => {
        const campaign = sealedCampaign();
        const next = answered(campaign, BORDER, "answer-the-paper-with-paper");
        expect(next.player.flags[scenarioFiredFlag(BORDER)]).toBe(true);
        expect(next.player.flags[flagMarker(scenarioFiredFlag(BORDER), campaign.turn)]).toBe(true);
    });
    it("names the week and the course when the same document comes back", () => {
        const campaign = sealedCampaign();
        expect(priorAnswer(campaign, def(BORDER))).toBeUndefined();
        const next = answered(campaign, BORDER, "answer-the-paper-with-paper");
        const prior = priorAnswer({ ...next, turn: next.turn + 9 }, def(BORDER));
        expect(prior).toEqual({
            turn: campaign.turn,
            replyId: "answer-the-paper-with-paper",
            course: def(BORDER).replies[0].text,
        });
    });
    it("says nothing at all when the record does not carry which door was taken", () => {
        const campaign = sealedCampaign();
        // A campaign whose fired flag stands with no answer beside it — the shape a
        // term played before this stamping existed leaves behind. Inventing a week
        // for it would be worse than saying nothing.
        const stale = {
            ...campaign,
            player: { ...campaign.player, flags: { ...campaign.player.flags, [scenarioFiredFlag(BORDER)]: true } },
        };
        expect(priorAnswer(stale, def(BORDER))).toBeUndefined();
    });
    it("keeps the two answers apart when one scenario has been decided twice", () => {
        // Closing our side of a crossing presumes traffic through it. The tensest
        // capital at founding is one the United States is at war with and does not
        // trade with, so the board gives the reply the lane it acts on.
        const sealed = sealedCampaign();
        const campaign = withTradeLane(sealed, castScenario(sealed, def(BORDER)).counterpart);
        const first = answered(campaign, BORDER, "answer-the-paper-with-paper");
        const later = answered({ ...first, turn: first.turn + 6 }, BORDER, "close-our-side-too");
        const prior = priorAnswer(later, def(BORDER));
        expect(prior.replyId).toBe("close-our-side-too");
        expect(prior.turn).toBe(first.turn + 6);
        // The older answer is still on the record; it is simply not the one a
        // returning document reminds the president of.
        expect(later.player.flags[scenarioAnsweredFlag(BORDER, "answer-the-paper-with-paper")]).toBe(true);
    });
});
describe("the price of ending a week unanswered", () => {
    it("charges the country's reading of its government, and nothing in money", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, def(BORDER));
        const packet = inactionPacket(campaign, cast);
        const opinion = packet.effects.find((effect) => effect.kind === "opinion");
        expect(opinion?.kind === "opinion" && opinion.deltas.competence).toBeLessThan(0);
        // A border crisis reads as security, not as services.
        expect(opinion?.kind === "opinion" && opinion.deltas.security).toBeLessThan(0);
        expect(metricDelta(packet, "stability")).toBeLessThan(0);
        expect(metricDelta(packet, "treasury")).toBe(0);
    });
    it("leaves a dated record a later scenario can wait on, and files it on the wire", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, def(BORDER));
        const packet = inactionPacket(campaign, cast);
        expect(flagsSet(packet)).toContain(scenarioUnansweredFlag(BORDER));
        expect(flagsSet(packet)).toContain(flagMarker(scenarioUnansweredFlag(BORDER), campaign.turn));
        expect(flagsSet(packet)).toContain(deskDriftFlag(campaign.turn));
        const feed = packet.effects.find((effect) => effect.kind === "feed");
        expect(feed?.kind === "feed" && feed.items[0]?.kind).toBe("drift");
        expect(feed?.kind === "feed" && feed.items[0]?.visibility).toBe("public");
    });
    it("carries the provenance a decision carries, and does not claim to be one", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, def(BORDER));
        const packet = inactionPacket(campaign, cast);
        expect(packet.actor).toBe("world");
        expect(packet.provenance?.origin).toBe("scenario");
        expect(packet.provenance?.marks).toContain(scenarioUnansweredFlag(BORDER));
        expect(packet.provenance?.visibility).toBe("public");
    });
    it("costs a president who never decides more than one who missed a week", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, def(BORDER));
        const lapse = inactionPacket(campaign, cast);
        const drifting = {
            ...campaign,
            player: {
                ...campaign.player,
                flags: Object.fromEntries(Array.from({ length: 12 }, (_, back) => [deskDriftFlag(campaign.turn - back - 1), true])),
            },
        };
        const pattern = inactionPacket(drifting, castScenario(drifting, def(BORDER)));
        const competenceOf = (packet) => {
            const opinion = packet.effects.find((effect) => effect.kind === "opinion");
            return opinion?.kind === "opinion" ? (opinion.deltas.competence ?? 0) : 0;
        };
        expect(competenceOf(pattern)).toBeLessThan(competenceOf(lapse));
        expect(competenceOf(lapse)).toBeGreaterThan(-0.1);
    });
    it("narrates the price the author wrote, and one of its own where none was authored", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, def(BORDER));
        // The fixtures author no context block, which the schema allows — the
        // charge still lands and the week is still narrated.
        expect(inactionPacket(campaign, cast).narration.summary).toContain(cast.script.subject.toLowerCase());
        const authored = {
            ...cast,
            def: {
                ...cast.def,
                context: {
                    standing: "x",
                    precedent: "y",
                    pressures: [],
                    inaction: "The doors open on their own at eighteen-thirty.",
                    unknown: "z",
                },
            },
        };
        expect(inactionPacket(campaign, authored).narration.summary).toBe("The doors open on their own at eighteen-thirty.");
    });
});
