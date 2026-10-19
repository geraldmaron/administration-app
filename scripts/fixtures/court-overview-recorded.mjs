// A voted Supreme opinion and a later live filing, both reached through the
// engine's ordinary order, review-choice, and court-phase paths.
import { apply } from "../../packages/engine/dist/effects.js";
import { answerLowerOrderReview, judicialReviewPhase } from "../../packages/engine/dist/judicial-review.js";
import { advanceTurn, noopPhase } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";
import { contestedOn } from "./court-challenge.mjs";

export const name = "court-overview-recorded";
const SEEDS = 400;
const LOWER_WEEKS = 24;
const OPINION_WEEKS = 160;
const SECOND_WEEKS = 20;
const FILING_WEEKS = 12;

function week(campaign) {
  return advanceTurn(campaign, { simulate: [judicialReviewPhase(charterOf(campaign))], select: noopPhase });
}

function pendingOrderCase(campaign) {
  return campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
    && campaign.orders.some((order) => order.id === entry.subject.recordId && order.review?.status === "pending"));
}

function votedOpinion(seed) {
  const opening = foundFixture({ seedText: `court-overview-${seed}`, leaderName: "Fixture President" });
  let campaign = contestedOn(opening);
  if (!campaign) return undefined;
  let adverse;
  for (let elapsed = 0; elapsed < LOWER_WEEKS; elapsed += 1) {
    campaign = week(campaign);
    const proceeding = pendingOrderCase(campaign);
    if (proceeding?.stage === "appeal" && proceeding.lower?.holding === "struck-down"
      && campaign.cases?.[`case:review:${proceeding.id}`]?.status === "raised") {
      adverse = proceeding;
      break;
    }
    if (proceeding?.stage === "final") return undefined;
  }
  if (!adverse) return undefined;
  const answer = answerLowerOrderReview(campaign, adverse.id, "seek");
  if (!answer.ok) throw new Error(`A real adverse ruling refused review: ${answer.reason}`);
  campaign = apply(campaign, answer.packet);
  for (let elapsed = 0; elapsed < OPINION_WEEKS; elapsed += 1) {
    campaign = week(campaign);
    if (campaign.judiciary.cases.some((entry) => entry.id === adverse.id && entry.votes.length > 0)) return campaign;
    if (campaign.judiciary.proceedings?.find((entry) => entry.id === adverse.id)?.stage === "final") return undefined;
  }
  return undefined;
}

function laterFiling(campaign) {
  let working = campaign;
  for (let elapsed = 0; elapsed < SECOND_WEEKS; elapsed += 1) {
    const challenged = contestedOn(working);
    if (challenged) {
      const signed = challenged.orders.find((record) => !working.orders.some((prior) => prior.id === record.id));
      if (!signed) throw new Error("A contested signature added no order record");
      let filed = challenged;
      for (let wait = 0; wait < FILING_WEEKS; wait += 1) {
        filed = week(filed);
        const proceeding = filed.judiciary.proceedings?.find((entry) =>
          entry.subject.kind === "executive-order" && entry.subject.recordId === signed.id);
        if (proceeding?.lowerForum?.circuit && proceeding.stage !== "final") return filed;
        if (proceeding?.stage === "final") break;
      }
    }
    working = week(working);
  }
  return undefined;
}

export function build() {
  for (let seed = 0; seed < SEEDS; seed += 1) {
    const voted = votedOpinion(seed);
    if (!voted) continue;
    const populated = laterFiling(voted);
    if (populated) return populated;
  }
  throw new Error(`No real voted opinion and later mapped live filing in ${SEEDS} seeded oaths`);
}
