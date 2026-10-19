// Washington with work in it: a Secretary's offer to resign still standing,
// and a second cabinet chair emptied by dismissal so a deputy is acting in it
// and the shortlist has a chair to fill.
//
// Built on `resignation-offer`, whose offer the engine raises through its own
// weighing. The dismissal is the President's own act, `dismissMinister`, so
// the acting deputy is the one the engine steps up.
import { apply } from "../../packages/engine/dist/effects.js";
import { dismissMinister } from "../../packages/engine/dist/appointments.js";
import { build as withOffer } from "./resignation-offer.mjs";

export const name = "washington-chairs";

const CHAIRS = ["role-defense-minister", "role-treasury-minister"];

export function build() {
  const campaign = withOffer();
  const offered = new Set((campaign.cabinetAgenda?.offers ?? []).map((offer) => offer.role));
  const role = CHAIRS.find((chair) => !offered.has(chair));
  const dismissal = dismissMinister(campaign, role);
  if (!dismissal.ok) throw new Error(`the ${role} could not be dismissed: ${dismissal.reason}`);
  const emptied = apply(campaign, dismissal.packet);
  if (emptied.player.cabinet[role] !== undefined && emptied.people[emptied.player.cabinet[role]]?.alive) throw new Error(`the ${role} is still held`);
  if ((emptied.cabinetAgenda?.offers ?? []).length === 0) throw new Error("the offer to resign is gone");
  return emptied;
}
