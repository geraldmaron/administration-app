// A NATO member attacked, and the United States calling its allies to answer: the call on the record, the answers weighed ally by ally, and one ally declining with its reason.
//
// Russia attacks Estonia with the United States already fighting beside it,
// staged through the engine's own conflict effect because a seed on which the
// board opens that war is not a draw the fixture can wait for. The call is the
// President's own act (`callCompact`), and the answers are the war's week:
// every member weighs its answer in `conflictPhase`, and the ledger keeps each
// join and each refusal with its stamp. One member's trust in the United
// States is lowered first, the fixture's stated premise, so the page shows a
// refusal and its reason on any seed rather than on the one that happens to
// produce one.
import { apply } from "../../packages/engine/dist/effects.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { callCompact } from "../../packages/engine/dist/compacts.js";
import { selectRelationship } from "../../packages/engine/dist/state.js";
import { projectCallAnswers } from "../../packages/engine/dist/war-join.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "nato-call";

const NATO = "ORG-NATO";

function world(campaign, summary, effects) {
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary }, effects });
}

function withWar(campaign) {
  const us = campaign.founding.nation;
  const war = {
    ...openConflict("RUS", "EST", campaign.turn, "Russian forces cross into Estonia."),
    joined: { aggressor: [], defender: [us] },
  };
  return { campaign: world(campaign, war.cause, [{ kind: "conflict", set: war }]), war: war.id };
}

/** The member least ready to answer, with its trust in the United States cut: the one that declines. */
function withReluctantAlly(campaign, war) {
  const rank = { unlikely: 0, close: 1, likely: 2 };
  const answers = projectCallAnswers(campaign, NATO, war).filter((answer) => answer.nation !== "EST");
  const reluctant = [...answers].sort((a, b) => rank[a.forecast] - rank[b.forecast] || a.nation.localeCompare(b.nation))[0];
  if (!reluctant) throw new Error("no NATO member has a question to answer in this war");
  const us = campaign.founding.nation;
  if (!selectRelationship(campaign, reluctant.nation, us)) throw new Error(`${reluctant.nation} has no reading of the United States`);
  const cooled = world(campaign, "A capital's confidence in Washington has worn thin.", [
    { kind: "relationship", from: reluctant.nation, to: us, deltas: { trust: -0.5 } },
  ]);
  return { campaign: cooled, reluctant: reluctant.nation };
}

export function build() {
  const opened = withWar(foundFixture({ seedText: "fixture-nato-call", leaderName: "Fixture President" }));
  const { campaign: staged, reluctant } = withReluctantAlly(opened.campaign, opened.war);
  const called = callCompact(staged, NATO, opened.war);
  if (!called.ok) throw new Error(called.reason);
  const answered = advanceWeeks(apply(staged, called.packet), 1);
  const stamps = answered.ledger.map((entry) => entry.causal?.decision).filter((stamp) => stamp?.question === "answer-call");
  if (stamps.length === 0) throw new Error("the call was weighed by no member: is the war's week stamping its decisions?");
  if (!stamps.some((stamp) => stamp.actor === reluctant && !stamp.acts)) throw new Error(`${reluctant} did not decline the call`);
  return answered;
}
