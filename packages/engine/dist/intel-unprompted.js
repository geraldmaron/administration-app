import { selectActivePursuits, selectNation } from "./state.js";
import { campaignDay } from "./nomination.js";
import { draftAssessment } from "./assessments.js";
// --- What the community writes without being asked --------------------------
//
// Assessments used to be pull-only: `commissionAssessment` was called from
// exactly one place, an "Ask the community" button behind a question picker and
// a country picker. So the epistemics this engine is proudest of — likelihood
// separated from confidence, named gaps, attributed dissent, source reliability
// — arrived only when the player thought to go and ask for them.
//
// A government pressing the United States is the case where nobody should have
// to ask. The pursuit ledger is what makes that legible: a standing campaign
// against the player names the government running it, which is more than the
// action ledger records.
/** How long the community leaves its own judgment about a government standing. */
const REASSESS_AFTER_DAYS = 28;
/** The government pressing the United States hardest that acted this week. */
function pressingThePlayer(campaign) {
    const player = campaign.founding.nation;
    return [...selectActivePursuits(campaign)]
        .filter((pursuit) => pursuit.target === player && campaign.turn - pursuit.lastActedTurn <= 1)
        .sort((a, b) => b.commitment - a.commitment || a.id.localeCompare(b.id))[0]?.actor;
}
function assessedRecently(campaign, target, day) {
    return campaign.security.assessments.some((assessment) => assessment.question === "intent" &&
        assessment.target === target &&
        day - assessment.issuedDay < REASSESS_AFTER_DAYS);
}
export function unpromptedIntentPackets(state) {
    const actor = pressingThePlayer(state);
    if (!actor)
        return [];
    const day = campaignDay(state);
    if (assessedRecently(state, actor, day))
        return [];
    const assessment = draftAssessment(state, "intent", actor);
    if (!assessment)
        return [];
    const name = selectNation(state, actor)?.base.identity.name ?? actor;
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: {
                origin: "institution",
                entities: [actor, "INST-ODNI"],
                systems: ["intelligence"],
                visibility: "intelligence",
                confidence: assessment.confidence === "high" ? "assessed" : "contested",
            },
            narration: {
                summary: `The community writes an intent judgment on ${name} unasked: ${assessment.likelihood}, ${assessment.confidence} confidence.`,
            },
            effects: [{ kind: "assessment", issue: assessment }],
        },
    ];
}
