import { TREATY_TERMS, metricImpact, projectEngagement } from "@admin/engine";
import { engagementReading, warmthWord } from "../world/engagement";
import { treatyReading } from "./preview";
const READINGS = ["trust", "tension", "alignment"];
function stepsOf(deltas, size) {
    return READINGS.flatMap((reading) => {
        const delta = deltas[reading] ?? 0;
        return delta === 0 ? [] : [{ reading, direction: delta > 0 ? "up" : "down", size: size(delta) }];
    });
}
export function engagementPlan(campaign, nation, kind) {
    const option = engagementReading(campaign, nation)?.options.find((entry) => entry.kind === kind);
    const projection = projectEngagement(campaign, { actor: campaign.founding.nation, target: nation, kind });
    if (!option || !projection)
        return undefined;
    const first = projection.effects.find((effect) => effect.kind === "relationship");
    const deltas = first?.kind === "relationship" ? (first.deltas ?? {}) : {};
    return { option, steps: stepsOf(deltas, warmthWord) };
}
const BAND_WORDS = { slight: "a little", moderate: "noticeably", major: "sharply" };
/** How far a move of a relationship reading goes, in the bands the engine's projections use for any 0..1 reading. */
function bandWord(delta) {
    return BAND_WORDS[metricImpact("relationship", delta, "next-turn", 0, "modeled").band];
}
export function treatyPlan(campaign, nation, kind) {
    const { result, senate } = treatyReading(campaign, nation, kind);
    if (!result.ok)
        return undefined;
    const terms = TREATY_TERMS[kind];
    const metric = result.packet.effects.flatMap((effect) => (effect.kind === "metric" ? [effect.deltas] : []));
    const onSigning = metric.reduce((sum, deltas) => Object.fromEntries([...new Set([...Object.keys(sum), ...Object.keys(deltas)])].map((key) => [key, (sum[key] ?? 0) + (deltas[key] ?? 0)])), {});
    const congress = result.packet.effects.find((effect) => effect.kind === "congress");
    const counterpart = engagementReading(campaign, nation)?.treaties.find((entry) => entry.kind === kind);
    return {
        binds: terms.bindsOn,
        summary: terms.summary,
        ...(counterpart ? { counterpart } : {}),
        onSigning,
        congressCools: congress?.kind === "congress" && congress.set.disposition < campaign.congress.disposition,
        inForce: stepsOf(terms.effect, bandWord),
        ...(senate ? { senate } : {}),
    };
}
