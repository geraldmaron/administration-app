import type { CastScenario } from "./scenario-cast.js";

// Its own module so the memory and case modules that key on an occurrence do
// not import the casting module that imports them.
export function scenarioOccurrenceKey(cast: CastScenario): string {
  return cast.occurrence ?? cast.def.id;
}
