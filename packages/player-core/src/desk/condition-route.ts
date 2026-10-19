import { isFederallyDeployable } from "@admin/engine";
import { anchored, place } from "../navigation/places";
import type { ConditionReading } from "../world/board-state";
import type { AttentionRoute } from "./attention-row";

/**
 * Where an emergency at home actually opens, on the list that draws it.
 *
 * The narrowest place the condition names, not its `scope` field: a
 * `scope: "region"` condition still carries the state it is running in, and the
 * state is the more useful destination than the country. A condition naming no
 * place at all is genuinely national. The President's own country has no file
 * of its own, so a national condition opens the Nation screen's states view.
 *
 * A district is deliberately never a destination here. A condition is never
 * drawn at district granularity, so routing there would invent a precision the
 * data does not carry.
 */
export function conditionRoute(condition: Pick<ConditionReading, "id" | "kind" | "state">): AttentionRoute {
  // An emergency a federal agency can actually be sent to opens the room that
  // draws the deployment. INST-STATES on the roster is the federalism
  // counterparty, not a deployment — civil unrest lists only the states, and
  // that file is the state's own dossier, not the Emergency board.
  if (isFederallyDeployable(condition.kind)) return anchored(place.emergencyIncident(condition.id), "emergency-incidents");
  // The state file draws its conditions only on its conditions view.
  if (condition.state) return anchored(place.stateView(condition.state, "conditions"), "state-conditions");
  return anchored(place.nationView("states"), "nation-conditions");
}
