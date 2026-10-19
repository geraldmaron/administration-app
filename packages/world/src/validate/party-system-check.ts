import type { WorldDataset } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";

type WorldDatasetT = WorldDataset;

/**
 * Every shipped nation states how power is contested inside it.
 *
 * The field is optional on the schema so a save or a fixture written before it
 * still loads; it is required here so a nation cannot ship without it. An
 * absent slate and an authored `contest: "none"` are different statements —
 * absent is "nobody researched this", "none" is "researched, and this country
 * runs no parties" — and only the second is a fact a surface may print.
 */
export function checkNationPartySystem(dataset: WorldDatasetT): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, string>();
  for (const nation of dataset.nations) {
    const partySystem = nation.partySystem;
    if (!partySystem) {
      errors.push({
        kind: "shape",
        path: `nations.${nation.id}.partySystem`,
        message: `"${nation.id}" ships without a party system — state the parties, or state that it runs none`,
      });
      continue;
    }
    const contested = partySystem.contest !== "none";
    if (contested && partySystem.parties.length === 0) {
      errors.push({
        kind: "shape",
        path: `nations.${nation.id}.partySystem`,
        message: `"${nation.id}" says power is contested ("${partySystem.contest}") but names no ticket that contests it`,
      });
    }
    if (!contested && partySystem.parties.length > 0) {
      errors.push({
        kind: "shape",
        path: `nations.${nation.id}.partySystem`,
        message: `"${nation.id}" says it runs no parties but names ${partySystem.parties.length}`,
      });
    }
    for (const party of partySystem.parties) {
      const id = party.id as string;
      const owner = seen.get(id);
      // A shared id would make two countries' tickets the same ticket, which
      // is the exact collapse moving parties off the charter was for.
      if (owner !== undefined && owner !== (nation.id as string)) {
        errors.push({
          kind: "shape",
          path: `nations.${nation.id}.partySystem`,
          message: `party id "${id}" is claimed by both "${owner}" and "${nation.id}"`,
        });
      }
      seen.set(id, nation.id as string);
    }
  }
  return errors;
}
