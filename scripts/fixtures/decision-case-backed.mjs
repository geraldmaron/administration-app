// A real critical decision frozen through the same builder the campaign store uses.
// It retains the engine-issued opportunity deadline; no date is supplied by this fixture.
import { seatScenarioCases } from "../../packages/player-core/dist/index.js";
import { build as buildCritical } from "./decision-critical.mjs";

export const name = "decision-case-backed";
export function build() {
  return seatScenarioCases(buildCritical());
}
