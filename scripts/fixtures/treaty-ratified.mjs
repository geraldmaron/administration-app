// A trade instrument the Senate has consented to and that is now in force: the
// record /treaty/$id shows once the floor has voted, and the binding entry the
// world's relationship carries. `treaty-pending.mjs` stops before the send.
//
// The instrument is signed, sent up and counted through the engine's own acts,
// and the vote is taken by the engine's own resolution once its due date has
// passed, the way `war-joined.mjs` takes its authorization vote, rather than
// written here. Two thirds of this Senate is not reachable under every
// seed, so the seed is one whose opening Senate the whip reads as carrying it;
// the build fails, naming the count, when that stops being true.
import { apply } from "../../packages/engine/dist/effects.js";
import { issueRatification, projectRatification, resolveDueTreaties, signTreaty } from "../../packages/engine/dist/treaties.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "treaty-ratified";

const ALLIES = ["GBR", "CAN", "AUS", "JPN", "KOR", "FRA", "DEU"];

function signedWithAlly(sworn) {
  const charter = charterOf(sworn);
  for (const ally of ALLIES) {
    const result = signTreaty(sworn, charter, "trade", ally);
    if (result.ok) return { campaign: apply(sworn, result.packet), id: result.record.id };
  }
  throw new Error(`no ally in ${ALLIES.join(", ")} trusts the founding government enough for a trade instrument`);
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-treaty-in-force", leaderName: "Fixture President" });
  const signed = signedWithAlly(sworn);
  const projection = projectRatification(signed.campaign, signed.campaign.treaties[signed.id]);
  if (!projection.wouldRatify) throw new Error(`the opening Senate would not ratify: ${projection.vote.yeas} yeas of the 67 needed`);
  const issued = issueRatification(signed.campaign, signed.id);
  if (!issued.ok) throw new Error(`sending the treaty up was refused: ${issued.reason}`);
  const campaign = resolveDueTreaties(advanceWeeks(apply(signed.campaign, issued.packet), 1)).campaign;
  const status = campaign.treaties[signed.id]?.status;
  if (status !== "ratified") throw new Error(`the treaty came back ${status ?? "missing"}, not ratified`);
  return campaign;
}
