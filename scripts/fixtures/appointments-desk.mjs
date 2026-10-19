import { apply } from "../../packages/engine/dist/effects.js";
import { dismissMinister } from "../../packages/engine/dist/appointments.js";
import { vacancyBenchEffects } from "../../packages/engine/dist/appointment-bench.js";
import { institutionDef } from "../../packages/engine/dist/institutions.js";
import { CIRCUIT_SEATS } from "../../packages/engine/dist/lower-bench.js";
import { fillVacantOffices } from "../../packages/engine/dist/nomination.js";
import { POLITICAL_OFFICE_INSTITUTIONS } from "../../packages/engine/dist/career-incumbents.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "appointments-desk";

function world(campaign, summary, effects) {
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary }, effects });
}

/** A court seat emptied the way the yearly draw empties one, with the bench that vacancy brings. */
function retire(campaign, institution, office, summary) {
  const holder = campaign.institutions[institution]?.leader;
  return world(campaign, summary, [
    ...(holder ? [{ kind: "person", person: holder, changes: { currentRole: undefined, judicialRetired: true } }] : []),
    { kind: "institution", institution, vacate: true },
    ...vacancyBenchEffects(campaign, office),
  ]);
}

/**
 * The appointments plan's second probe, staged: the Treasury Secretary
 * dismissed, the Chief Justice retired and one D.C. Circuit seat open. The four
 * political offices a founding opens empty are already sent up, so the desk
 * holds exactly those three seats and the pipeline has names in it.
 */
export function build() {
  const founded = foundFixture({ seedText: "appointments-probe", leaderName: "Avery Bell" });
  const political = POLITICAL_OFFICE_INSTITUTIONS.map((id) => institutionDef(id).offices[0].id);
  let campaign = fillVacantOffices(founded, political).reduce(apply, founded);
  const dismissal = dismissMinister(campaign, "role-treasury-minister");
  if (!dismissal.ok) throw new Error(dismissal.reason);
  campaign = apply(campaign, dismissal.packet);
  campaign = retire(campaign, "INST-SCOTUS-SEAT-1", "OFF-SCOTUS-SEAT-1", "The Chief Justice retires.");
  const circuit = CIRCUIT_SEATS.find((seat) => seat.circuit === "District of Columbia");
  if (!circuit) throw new Error("no D.C. Circuit seat in the source table");
  return retire(campaign, circuit.id, circuit.office, "A D.C. Circuit judge takes senior status.");
}
