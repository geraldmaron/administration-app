import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
import { RED_LINE_RULES, answers, crossingsAgainst, holdsTerritorialLine, redLinePull } from "./red-lines.js";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { resolveAction } from "./resolution.js";
import { apply } from "./effects.js";
import { decideNpcAction } from "./npc-agent.js";
import { createRngStreams } from "./rng.js";
describe("the authored lines all mean something", () => {
    it("carries a rule for every red line the dataset ships", () => {
        const missing = worldDataset.nations.flatMap((nation) => nation.doctrine.redLines.filter((line) => !RED_LINE_RULES[line.id]).map((line) => `${nation.id}:${line.id}`));
        expect(missing).toEqual([]);
    });
    it("declares no rule for a line nothing authors", () => {
        const authored = new Set(worldDataset.nations.flatMap((n) => n.doctrine.redLines.map((line) => line.id)));
        expect(Object.keys(RED_LINE_RULES).filter((id) => !authored.has(id))).toEqual([]);
    });
    it("refuses to pass on a dataset with no red lines at all", () => {
        // The gate above is only worth having if it fails on an empty corpus rather
        // than reporting nothing missing from nothing.
        const authored = worldDataset.nations.flatMap((n) => n.doctrine.redLines);
        expect(authored.length).toBeGreaterThan(50);
    });
    it("answers a crossing at least as far up the ladder as the line names", () => {
        for (const rule of Object.values(RED_LINE_RULES)) {
            expect(rule.answeredAt).toBeGreaterThanOrEqual(1);
            expect(rule.answeredAt).toBeLessThanOrEqual(5);
            expect(rule.instruments.length).toBeGreaterThan(0);
        }
    });
});
// A campaign in which the President has just struck the neighbor's declared
// nuclear sites, which is the exact act that country's own file says it will
// answer.
function afterAStrike() {
    const base = buildCampaign();
    const target = {
        ...base.nations[nationB.id],
        base: {
            ...nationB,
            doctrine: {
                ...nationB.doctrine,
                redLines: [{ id: "nuclear-program", description: "No external strike on its declared nuclear facilities goes unanswered." }],
            },
        },
    };
    return {
        ...base,
        turn: 6,
        nations: { ...base.nations, [nationB.id]: target },
        ledger: [
            {
                turn: 5,
                actor: "player",
                description: "United States uses Limited Strike against Alpland.",
                commitment: { instrument: "military", rung: 4, target: nationB.id, landed: true },
            },
        ],
    };
}
describe("a crossing the President made", () => {
    it("is visible to the government that drew the line", () => {
        const crossings = crossingsAgainst(afterAStrike(), nationB.id);
        expect(crossings).toHaveLength(1);
        expect(crossings[0].redLine.id).toBe("nuclear-program");
        expect(crossings[0].by).toBe(nationA.id);
    });
    it("goes unnoticed when the act was below the rung the line names", () => {
        const campaign = afterAStrike();
        const soft = {
            ...campaign,
            ledger: [
                {
                    ...campaign.ledger[0],
                    commitment: { instrument: "military", rung: 1, target: nationB.id, landed: true },
                },
            ],
        };
        expect(crossingsAgainst(soft, nationB.id)).toEqual([]);
    });
    it("stops being answerable once it is old news", () => {
        const campaign = afterAStrike();
        expect(crossingsAgainst({ ...campaign, turn: 40 }, nationB.id)).toEqual([]);
    });
    it("is answered by a move that reaches the rung the line names, not by a démarche", () => {
        const crossings = crossingsAgainst(afterAStrike(), nationB.id);
        expect(answers(crossings, nationA.id, 4)).toBeDefined();
        expect(answers(crossings, nationA.id, 2)).toBeUndefined();
        expect(answers(crossings, nationB.id, 5)).toBeUndefined();
    });
    it("prefers the promised answer to an escalation on top of it", () => {
        const crossing = crossingsAgainst(afterAStrike(), nationB.id)[0];
        expect(redLinePull(crossing, 4)).toBeGreaterThan(redLinePull(crossing, 5));
        expect(redLinePull(undefined, 5)).toBe(0);
    });
});
describe("a disputed border", () => {
    it("is a government whose own lines are drawn around ground", () => {
        const territorial = worldDataset.nations.find((n) => n.doctrine.redLines.some((l) => l.id === "kashmir-status"));
        const notTerritorial = worldDataset.nations.find((n) => n.doctrine.redLines.every((l) => l.id === "eu-fiscal-sovereignty"));
        expect(holdsTerritorialLine(territorial)).toBe(true);
        if (notTerritorial)
            expect(holdsTerritorialLine(notTerritorial)).toBe(false);
    });
});
// The whole path, on the shipped dataset rather than on a fixture: the
// President strikes the declared nuclear sites of a country whose file says
// that will be answered, the week turns, and the government answers.
describe("the President strikes Iran's declared nuclear facilities", () => {
    it("is answered by Iran, at the rung Iran's own file names", () => {
        const { campaign, charter } = foundedForBalance("red-line-acceptance");
        const iran = "IRN";
        const streams = createRngStreams(campaign.seed);
        const strike = resolveAction(campaign, { actor: campaign.founding.nation, target: iran, instrument: "military", rung: 4 }, streams, "action");
        expect(strike.ok).toBe(true);
        if (!strike.ok)
            return;
        const week = advanceTurn(apply(campaign, strike.packet), campaignTurnPhases(charter));
        const crossings = crossingsAgainst(week, iran);
        expect(crossings.map((c) => c.redLine.id)).toContain("nuclear-program");
        const answer = decideNpcAction(week, iran, createRngStreams(week.seed));
        expect(answer.chosen?.request.target).toBe(week.founding.nation);
        expect(answer.chosen?.request.rung).toBeGreaterThanOrEqual(4);
        expect(answer.chosen?.answering?.redLine.description).toBe("No external strike on its declared nuclear facilities goes unanswered.");
    }, 60000);
});
