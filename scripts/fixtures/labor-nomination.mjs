// A Secretary of Labor nomination in flight: the Secretary the oath seated is
// dismissed, the best other name on the Labor bench is sent up, and the weeks run
// until the Health, Education, Labor and Pensions committee holds it. The
// office file shows its stage, the days it has run, the committee and the
// Withdraw it can take, and neither a second name nor an instant appointment
// can be put in the chair while it waits.
import { apply } from "../../packages/engine/dist/effects.js";
import { dismissMinister, selectAppointableFor } from "../../packages/engine/dist/appointments.js";
import { openNomination } from "../../packages/engine/dist/nomination.js";
import { selectNominationForOffice } from "../../packages/engine/dist/nomination-stages.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "labor-nomination";

const ROLE = "role-labor-secretary";
const OFFICE = "OFF-LABOR-SEC";
const COMMITTEE_STAGES = new Set(["disclosures", "hearing-scheduled", "hearing", "committee-action"]);

function applied(campaign, result, act) {
  if (!result.ok) throw new Error(`${act} was refused: ${result.reason}`);
  return apply(campaign, result.packet);
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-labor-nomination", leaderName: "Fixture President" });
  const dismissed = sworn.player.cabinet[ROLE];
  const vacant = applied(sworn, dismissMinister(sworn, ROLE), "dismissing the Secretary of Labor");
  // The bench still ranks the Secretary just dismissed first, on the record
  // that seated them; a President sending back up the name they fired would
  // make the file read as nonsense, so the next name goes up instead.
  const [nominee, rival] = selectAppointableFor(vacant, ROLE).filter((person) => person.base.id !== dismissed);
  if (!nominee || !rival) throw new Error("the Labor bench has fewer than two names");
  let campaign = applied(vacant, openNomination(vacant, OFFICE, nominee.base.id), "sending the Labor nominee up");

  for (let week = 0; week < 24 && !COMMITTEE_STAGES.has(selectNominationForOffice(campaign, OFFICE)?.stage); week += 1) {
    campaign = advanceWeeks(campaign, 1);
  }
  const nomination = selectNominationForOffice(campaign, OFFICE);
  if (!nomination || !COMMITTEE_STAGES.has(nomination.stage)) {
    throw new Error(`the Labor nomination is at ${nomination?.stage ?? "nothing"}, not before the committee`);
  }
  if (nomination.committee !== "CMTE-HELP") throw new Error(`the Labor nomination went to ${nomination.committee}`);
  if (campaign.player.cabinet[ROLE] !== undefined) throw new Error("the Labor chair is filled while its nomination waits");
  if (openNomination(campaign, OFFICE, rival.base.id).ok) throw new Error("a second Labor nomination was allowed");
  return campaign;
}
