import { emptyMarkets } from "./markets.js";
import { FED_CREDIBILITY_PREMIUM, FED_PRESSURE_TILT, fedChair, fedRecord, nextFomcDecision } from "./monetary.js";
/** Starting value: the standing a President spends leaning on an independent central bank in public. */
export const FED_LEAN_STANDING_COST = 0.02;
// Read at call time, not at load: monetary.ts re-exports this module, so this
// module is evaluated before monetary.ts has initialized its constants.
const premiumPercentagePoints = () => Math.round(FED_CREDIBILITY_PREMIUM * 10_000) / 100;
/** What leaning on the Fed would cost and do, before it is done. */
export function projectFedLean(campaign, direction) {
    const standing = campaign.markets?.fed?.pressure;
    if (standing) {
        return { ok: false, reason: "The administration has already leaned on the Fed ahead of its next meeting. It answers once." };
    }
    const meeting = nextFomcDecision(campaign.calendar);
    const chair = fedChair(campaign)?.base.name ?? "the chair";
    return {
        ok: true,
        cost: { standing: -FED_LEAN_STANDING_COST },
        risks: [
            {
                id: "fed-credibility",
                chance: 1,
                description: `Markets will read this as pressure on ${chair}. The rate set at the next meeting will run ${premiumPercentagePoints()} percentage points higher.`,
            },
        ],
        bound: direction === "ease" ? -FED_PRESSURE_TILT : FED_PRESSURE_TILT,
        meeting,
    };
}
/** Lean on the Fed ahead of its next meeting. Commits through the ordinary act path, priced by `projectFedLean`. */
export function leanOnTheFed(campaign, direction) {
    const projection = projectFedLean(campaign, direction);
    if (!projection.ok)
        return projection;
    const markets = campaign.markets ?? emptyMarkets();
    const fed = markets.fed ?? fedRecord(campaign) ?? { rate: 0, chairTilt: 0 };
    const verb = direction === "ease" ? "to cut rates" : "to hold the line on prices";
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", systems: ["markets", "macro"], entities: ["INST-FED"] },
            narration: { summary: `The President presses the Federal Reserve in public ${verb} before its next meeting.` },
            effects: [
                { kind: "markets", set: { ...markets, fed: { ...fed, pressure: { since: campaign.calendar, bound: projection.bound } } } },
                { kind: "metric", deltas: projection.cost },
                {
                    kind: "feed",
                    items: [
                        {
                            turn: campaign.turn,
                            kind: "press",
                            visibility: "public",
                            headline: `The President calls on the Federal Reserve ${verb}.`,
                            facts: { subject: "the Federal Reserve", topicTags: ["markets", "economy"], sceneFacet: { kind: "economy" } },
                        },
                    ],
                },
            ],
        },
    };
}
