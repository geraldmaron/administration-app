import type { ConsequenceCard, ConsequenceConditions as EngineConditions, ConsequenceRecipe as EngineRecipe } from "@admin/engine";
import type { ConsequenceConditions, ConsequenceDef, ConsequenceRecipe } from "./consequence.js";

// Where authored aftermath becomes something the engine will run. The mapping
// is total and dull by design: the document schema was written against the
// engine's card, so compiling is a rename rather than a translation, and there
// is no branch here where a valid document fails to become a valid card.
//
// It is written out longhand rather than passed through, because the two types
// are allowed to diverge later and a structural pass-through would compile
// silently on the day they do.

function compileRecipe(recipe: ConsequenceRecipe): EngineRecipe {
  switch (recipe.kind) {
    case "metric":
      return { kind: "metric", deltas: recipe.deltas, ...(recipe.scaleBySeverity === undefined ? {} : { scaleBySeverity: recipe.scaleBySeverity }) };
    case "relationship":
      return { kind: "relationship", direction: recipe.direction, deltas: recipe.deltas };
    case "grudge":
      return { kind: "grudge", cause: recipe.cause, weight: recipe.weight };
    case "feed":
      return { kind: "feed", headline: recipe.headline };
  }
}

function compileConditions(conditions: ConsequenceConditions): EngineConditions {
  return {
    ...(conditions.scenarioClass ? { scenarioClass: conditions.scenarioClass } : {}),
    ...(conditions.tone ? { tone: conditions.tone } : {}),
    ...(conditions.flagsSet ? { flagsSet: conditions.flagsSet } : {}),
    ...(conditions.flagsClear ? { flagsClear: conditions.flagsClear } : {}),
    ...(conditions.minTension === undefined ? {} : { minTension: conditions.minTension }),
    ...(conditions.maxTrust === undefined ? {} : { maxTrust: conditions.maxTrust }),
    ...(conditions.intelFalse === undefined ? {} : { intelFalse: conditions.intelFalse }),
  };
}

export function compileConsequence(def: ConsequenceDef): ConsequenceCard {
  return {
    id: def.id,
    instrument: def.instrument,
    rungBands: def.rungBands,
    valence: def.valence,
    ...(def.riskAffinity ? { riskAffinity: def.riskAffinity } : {}),
    ...(def.conditions ? { conditions: compileConditions(def.conditions) } : {}),
    weight: def.weight,
    ...(def.once === undefined ? {} : { once: def.once }),
    beats: def.beats,
    effects: def.effects.map(compileRecipe),
    ...(def.sets ? { sets: def.sets } : {}),
    ...(def.remembered ? { remembered: def.remembered } : {}),
  };
}

export function compileConsequences(defs: readonly ConsequenceDef[]): readonly ConsequenceCard[] {
  return defs.map(compileConsequence);
}
