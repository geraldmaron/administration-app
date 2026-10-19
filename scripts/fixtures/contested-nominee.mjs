// A contested cabinet nomination on the Senate floor while an acting Secretary
// runs the department.
//
// Founded exactly as the engine's founding-confirmations test founds its
// Independent: a Senate the President's side does not hold sends the picks that
// clear the majority by less than the consensus margin to the calendar, with
// their deputies acting. Searching seeds for a contested oath, as this fixture
// once did, broke the day the Senate's composition changed under it; this
// founding is the one the engine's own test promises stays contested, so its
// seed moves when that test's does. The closest of its fights is then run
// forward until it reaches the floor.
import { selectActing } from "../../packages/engine/dist/appointments.js";
import { foundedForBalance } from "../../packages/engine/dist/balance-harness.js";
import { confirmationVote, isConsensus } from "../../packages/engine/dist/confirmation-count.js";
import { institutionDef } from "../../packages/engine/dist/institutions.js";
import { advanceWeeks } from "./_campaign.mjs";

export const name = "contested-nominee";

const FLOOR = new Set(["floor-pending", "cloture", "vote"]);

function closestFight(campaign) {
  const ranked = Object.values(campaign.nominations)
    .map((nomination) => ({ nomination, yeas: confirmationVote(campaign, nomination.nominee).yeas }))
    .sort((a, b) => a.yeas - b.yeas || a.nomination.id.localeCompare(b.nomination.id));
  if (ranked.length === 0) {
    throw new Error(`the Senate confirmed every pick at the seal; nothing is contested (${JSON.stringify(campaign.congress.chambers.senate)})`);
  }
  return ranked[0].nomination;
}

export function build() {
  const sworn = foundedForBalance("confirmations-independent", "independent").campaign;
  const fight = closestFight(sworn);
  if (isConsensus(confirmationVote(sworn, fight.nominee))) throw new Error("the seal sent a pick to the calendar that it would have confirmed");
  const role = institutionDef(fight.institution)?.cabinetRole;
  if (!role) throw new Error(`the contested nomination ${fight.id} is for no cabinet chair`);
  const acting = selectActing(sworn, role);
  if (!acting) throw new Error(`nobody is acting in ${role} while its nominee waits`);

  let campaign = sworn;
  for (let week = 0; week < 12 && !FLOOR.has(campaign.nominations[fight.id]?.stage); week += 1) campaign = advanceWeeks(campaign, 1);
  const stage = campaign.nominations[fight.id]?.stage;
  if (!FLOOR.has(stage)) throw new Error(`the contested nomination never reached the floor (stage ${stage})`);
  if (selectActing(campaign, role) !== acting) throw new Error("the acting Secretary is no longer in the chair while the nomination is on the floor");
  return campaign;
}
