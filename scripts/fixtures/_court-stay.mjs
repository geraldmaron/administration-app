import { apply } from "../../packages/engine/dist/effects.js";
import { withDueCaseDefaults } from "../../packages/engine/dist/case-defaults.js";
import { judicialReviewPhase, answerLowerOrderReview } from "../../packages/engine/dist/judicial-review.js";
import { signOrder } from "../../packages/engine/dist/orders.js";
import { prospectiveOrderAuthority } from "../../packages/engine/dist/order-authority.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { rulemakingPhase } from "../../packages/engine/dist/rulemaking.js";
import { advanceTurn, noopPhase, runPhase } from "../../packages/engine/dist/turn-loop.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

const ORDER = "order-border-controls";
const LIMIT = 400;
let cached;

function court(campaign) {
  return judicialReviewPhase(charterOf(campaign));
}

// Run the actual court and rulemaking phases on their normal weekly clock.
// The fixture isolates those two systems so unrelated generated content cannot
// hold the Desk or decide this case for the player.
function week(campaign) {
  return advanceTurn(campaign, { simulate: [court(campaign), rulemakingPhase], select: noopPhase });
}

function adverse(seed) {
  const opening = foundFixture({ seedText: seed, leaderName: "Fixture President" });
  const signature = signOrder(opening, charterOf(opening), ORDER, createRngStreams(opening.seed));
  if (!signature.ok || !signature.contested) return undefined;
  let campaign = apply(opening, signature.packet);
  // Lower merits take 60 to 270 days from filing (court-procedure.ts), so the
  // search waits out the longest band before giving up on a seed.
  for (let elapsed = 0; elapsed < 45; elapsed += 1) {
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
      && entry.subject.recordId === signature.record.id);
    if (proceeding?.lower) {
      if (proceeding.lower.holding !== "struck-down" || proceeding.lower.enforcement !== "in-force"
        || proceeding.stage !== "appeal" || campaign.pendingRules.find((entry) => entry.id === signature.record.id)?.status !== "in-effect"
        || campaign.cases?.[`case:review:${proceeding.id}`]?.status !== "raised"
        || prospectiveOrderAuthority(campaign, signature.record.id) !== "suspended") return undefined;
      return { campaign, proceeding };
    }
    campaign = week(campaign);
  }
  return undefined;
}

function requestStay(review) {
  const answer = answerLowerOrderReview(review.campaign, review.proceeding.id, "seek-with-stay");
  if (!answer.ok) throw new Error(`Real lower judgment refused the stay request: ${answer.reason}`);
  const pending = apply(review.campaign, answer.packet);
  if (pending.judiciary.proceedings?.find((entry) => entry.id === review.proceeding.id)?.stayApplication?.status !== "pending"
    || prospectiveOrderAuthority(pending, review.proceeding.subject.recordId) !== "suspended") {
    throw new Error("A stay request changed authority before the court decided it");
  }
  let decided = week(pending);
  for (let elapsed = 0; elapsed < 8 && decided.judiciary.proceedings?.find((entry) => entry.id === review.proceeding.id)?.stayApplication?.status === "pending"; elapsed += 1) {
    decided = week(decided);
  }
  const ruling = decided.judiciary.proceedings?.find((entry) => entry.id === review.proceeding.id);
  if (ruling?.stayApplication?.status !== "granted" && ruling?.stayApplication?.status !== "denied")
    throw new Error("The court did not independently decide the stay request");
  return { pending, decided, result: ruling.stayApplication.status };
}

function defaulted(review) {
  // The live operational clock reaches the seven-day deadline; the existing
  // default writer closes the Desk case before the court phase finalizes it.
  const due = withDueCaseDefaults(week(review.campaign));
  const settled = runPhase(due, court(due), due.turn);
  const response = settled.cases?.[`case:review:${review.proceeding.id}`];
  if (response?.status !== "defaulted" || settled.judiciary.proceedings?.find((entry) => entry.id === review.proceeding.id)?.stage !== "final")
    throw new Error("The unanswered lower judgment did not default and finalize");
  return settled;
}

function scheduledReview(stay, proceedingId) {
  let campaign = stay.decided;
  // Circuit merits take 90 to 365 days and the certiorari step 28 to 240.
  for (let elapsed = 0; elapsed < 104; elapsed += 1) {
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === proceedingId);
    if (!proceeding) throw new Error("The pending court proceeding disappeared during appeal");
    if (proceeding.stayApplication?.status !== stay.result)
      throw new Error("The stay ruling changed while the merits appeal advanced");
    if (proceeding.stage === "supreme-merits" && proceeding.calendar?.status === "scheduled") return campaign;
    if (proceeding.stage === "final" || campaign.orders.find((entry) => entry.id === proceeding.subject.recordId)?.review?.status !== "pending")
      return undefined;
    campaign = week(campaign);
  }
  return undefined;
}

export function courtStay(stage) {
  if (!cached) {
    const found = {};
    for (let attempt = 0; attempt < LIMIT && (!found.granted || !found.denied || !found.calendar); attempt += 1) {
      const review = adverse(`court-stay-${attempt}`);
      if (!review) continue;
      const stay = requestStay(review);
      if (!found[stay.result]) found[stay.result] = { review, stay };
      if (!found.calendar) found.calendar = scheduledReview(stay, review.proceeding.id);
    }
    if (!found.granted || !found.denied || !found.calendar) throw new Error(`No real adverse lower judgments yielded both stay rulings and a term-calendar review within ${LIMIT} seeded oaths`);
    cached = {
      review: found.granted.review.campaign,
      "review-denied": found.denied.review.campaign,
      pending: found.granted.stay.pending,
      granted: found.granted.stay.decided,
      denied: found.denied.stay.decided,
      defaulted: defaulted(found.granted.review),
      calendar: found.calendar,
    };
  }
  if (!cached[stage]) throw new Error(`No court stay fixture stage ${stage}`);
  return cached[stage];
}
