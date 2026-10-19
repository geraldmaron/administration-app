// The courts and oversight with everything on them at once: one ruling handed
// down with every justice's vote, a second order of yours before the bench, a
// seat left open by a justice's death, an inspector general's audit opened by
// two refused instructions at the Internal Revenue Service, and a covert
// finding whose notice to the committees is still withheld.
//
// Every piece goes through the engine's own act or phase: the orders through
// `signOrder` (seeded, so the fixture walks weeks until a signature comes back
// contested, the way `court-challenge.mjs` walks oaths), the ruling through the
// weekly phases, the death as the person effect every death writes, the audit
// through `issueDirective`'s own refusal path, and the finding through
// `signFinding`.
import { issueDirective } from "../../packages/engine/dist/directives.js";
import { apply } from "../../packages/engine/dist/effects.js";
import { signFinding } from "../../packages/engine/dist/findings.js";
import { judiciaryBenchSeats } from "../../packages/engine/dist/judiciary.js";
import { advanceWeeks } from "./_campaign.mjs";
import { build as courtChallenge, contestedOn } from "./court-challenge.mjs";

export const name = "courts-and-oversight";

const RULING_WEEKS = 24;
const SECOND_CHALLENGE_WEEKS = 10;
const OPEN_SEAT = 5;

function applied(campaign, result, act) {
  if (!result.ok) throw new Error(`${act} was refused: ${result.reason}`);
  return apply(campaign, result.packet);
}

function secondChallenge(campaign) {
  let working = campaign;
  for (let week = 0; week < SECOND_CHALLENGE_WEEKS; week += 1) {
    const contested = contestedOn(working);
    if (contested) return contested;
    working = advanceWeeks(working, 1);
  }
  throw new Error(`no week in ${SECOND_CHALLENGE_WEEKS} drew a second court challenge`);
}

function justiceDies(campaign, seat) {
  const justice = judiciaryBenchSeats(campaign).find((row) => row.seat === seat)?.personId;
  if (!justice) throw new Error(`seat ${seat} is already empty`);
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "A justice of the Supreme Court dies." },
    effects: [{ kind: "person", person: justice, changes: { alive: false } }],
  });
}

function auditOpened(campaign) {
  const once = applied(campaign, issueDirective(campaign, { institution: "INST-IRS", kind: "investigation", subject: "a named donor's returns" }), "the first IRS instruction");
  const twice = applied(once, issueDirective(once, { institution: "INST-IRS", kind: "targeting", subject: "a named critic's business" }), "the second IRS instruction");
  if (!twice.oversight.matters.some((matter) => matter.stage === "opened")) throw new Error("two refusals at the Service opened no inquiry");
  return twice;
}

function findingWithheld(campaign) {
  const target = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation && id !== "CAN");
  return applied(campaign, signFinding(campaign, "Disrupt a weapons shipment bound for an armed group", target, "written", "withheld", "The operation is under way and a leak would end it."), "signing the finding");
}

export function build() {
  let ruled = courtChallenge();
  for (let week = 0; week < RULING_WEEKS && ruled.judiciary.cases.length === 0; week += 1) {
    ruled = advanceWeeks(ruled, 1);
  }
  if (ruled.judiciary.cases.length !== 1) throw new Error(`expected one ruling, found ${ruled.judiciary.cases.length}`);
  const pending = secondChallenge(ruled);
  if (!pending.orders.some((record) => record.review?.status === "pending")) throw new Error("the second order is not before the bench");
  const open = justiceDies(pending, OPEN_SEAT);
  return findingWithheld(auditOpened(open));
}
