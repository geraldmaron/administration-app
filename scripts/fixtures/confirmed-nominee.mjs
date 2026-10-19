// A nominee the Senate has confirmed, holding the office on the record: the
// Administrator of FEMA is removed, a successor is sent up and confirmed, and
// then the Director of the CDC is removed. The confirmed Administrator holds
// FEMA and is not among the names offered for the CDC, which is the defect a
// confirmation that never wrote the officer's role produced.
import { AGENCY_HEAD_ROLE } from "../../packages/world/dist/index.js";
import { apply } from "../../packages/engine/dist/effects.js";
import { removeOfficer } from "../../packages/engine/dist/career-incumbents.js";
import { fillVacantOffices, selectNominableFor } from "../../packages/engine/dist/nomination.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "confirmed-nominee";

function removed(campaign, institution) {
  const result = removeOfficer(campaign, institution);
  if (!result.ok) throw new Error(`removing the head of ${institution} was refused: ${result.reason}`);
  return apply(campaign, result.packet);
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-confirmed-nominee", leaderName: "Fixture President" });
  const vacant = removed(sworn, "INST-FEMA");
  const [sent] = fillVacantOffices(vacant, ["OFF-FEMA-HEAD"]);
  if (!sent) throw new Error("nobody was sent up for FEMA");
  let campaign = apply(vacant, sent);
  const nominee = sent.effects.find((effect) => effect.kind === "nomination")?.nomination?.nominee;

  const nomination = sent.effects.find((effect) => effect.kind === "nomination")?.nomination?.id;
  // Run to the oath, not just the vote: a confirmed officer is sworn in a week
  // later, and until then the nomination is still open on the calendar.
  for (let week = 0; week < 40 && campaign.nominations[nomination]?.stage !== "sworn-in"; week += 1) {
    campaign = advanceWeeks(campaign, 1);
  }
  if (campaign.nominations[nomination]?.stage !== "sworn-in") throw new Error("the FEMA nominee was never sworn in");
  if (campaign.institutions["INST-FEMA"]?.leader !== nominee) throw new Error("the sworn-in nominee does not lead FEMA");
  if (campaign.people[nominee]?.currentRole !== AGENCY_HEAD_ROLE) throw new Error("the confirmed Administrator holds no role on the record");

  campaign = removed(campaign, "INST-CDC");
  if (selectNominableFor(campaign, "OFF-CDC-HEAD").some((runtime) => runtime.base.id === nominee)) {
    throw new Error("the confirmed Administrator of FEMA is offered for the CDC");
  }
  return campaign;
}
