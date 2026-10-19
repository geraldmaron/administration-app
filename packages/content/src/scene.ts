import type { ScenarioClass, ScenarioDef, ScenarioLocusSite } from "./scenario.js";

// Which still a scenario is shown against.
//
// The first version of this keyed the image on the scenario *class* alone, and
// the defect that made the cost obvious: a war scenario about an aircraft shot
// down over a contested strait rendered against a burnt-out apartment block,
// because "war" is the only thing the renderer knew. The class says what kind
// of event it is. It does not say where the event is, and it does not say
// whether anything has been broken yet — and those are most of what a
// photograph of a place actually shows.
//
// Both missing axes were already in the data. `locus.site` is authored on every
// scenario and validated; the board's own `warState` and condition severity say
// how bad it has got. So this is a join over facts the content already carries,
// not a new authoring burden — the same move the portrait catalogue makes when
// it keys on a person's facets rather than on their nation.

/**
 * Where the photograph is taken. The scenario's own locus vocabulary, reused
 * rather than paralleled: a second list of places would drift from the first
 * the week after it was written.
 */
export type SceneSite = ScenarioLocusSite;

/**
 * What has happened to the place by the time it is photographed.
 *
 * This is the axis that stops a class from having one look forever. A war can
 * be a mobilization or a ruin; an economy can be a busy port or a shuttered
 * one; unrest can be a square being swept or a square still burning. Four
 * values, because a photograph can carry about that many distinctions before
 * the differences stop being legible at the size a briefing draws them.
 */
export const SCENE_REGISTERS = ["intact", "strained", "damaged", "ceremonial"] as const;
export type SceneRegister = (typeof SCENE_REGISTERS)[number];

export type SceneFacets = {
  readonly kind: ScenarioClass;
  readonly site: SceneSite;
  readonly register: SceneRegister;
};

// What a class looks like when nothing on the board says otherwise.
//
// Read as: what does this kind of event *usually* do to the place it happens
// in. The interior classes — a leak, a trial, a disputed election — damage
// institutions rather than buildings, so their default is a room that is
// perfectly intact and all the worse for it.
// Only the classes whose event *is* the destruction default to `damaged`. A
// flood is water in the street and a bombing is a wrecked frontage; there is
// no honest quiet version of either.
//
// `war` is deliberately not among them, and that correction is the whole point
// of this table. War is a state a country is in, not damage done to the place
// in the photograph: a scenario about an aircraft shot down over a contested
// strait, gated on nothing worse than relationship tension, was rendering a
// shell-scarred street and a burnt-out car. The image claimed a catastrophe
// the scenario did not contain. Destruction has to be earned from the board —
// see `derivedRegister` — rather than assumed from the class.
const DEFAULT_REGISTER: Readonly<Record<ScenarioClass, SceneRegister>> = {
  tragedy: "damaged",
  terror: "damaged",
  unrest: "strained",
  disaster: "damaged",
  "public-health": "strained",
  migration: "strained",
  "foreign-crisis": "strained",
  war: "strained",
  espionage: "intact",
  hostage: "strained",
  technology: "strained",
  economy: "strained",
  scandal: "intact",
  justice: "intact",
  institution: "intact",
  culture: "ceremonial",
  death: "ceremonial",
  triumph: "ceremonial",
};

// Severity at or above this reads as physical damage rather than pressure.
// Below it a condition is something the country is coping with; above it, it
// is something that has already taken buildings.
const DAMAGE_SEVERITY = 0.6;

/**
 * The facets a scenario is drawn against, derived from what it already
 * declares.
 *
 * Deriving rather than authoring is deliberate. There is no corpus to
 * re-author — and more to the point, a field an author has to remember to set
 * is a field that is wrong on most of the corpus by the second batch. An
 * author who genuinely needs to override it can, via `scene`, and that
 * override is the only hand-set value in the join.
 */
export function sceneFacets(def: ScenarioDef): SceneFacets {
  const authored = def.scene?.register;
  return {
    kind: def.class,
    site: def.locus.site,
    register: authored ?? derivedRegister(def),
  };
}

function derivedRegister(def: ScenarioDef): SceneRegister {
  const fallback = DEFAULT_REGISTER[def.class];

  for (const condition of def.conditions) {
    // A scenario gated on the country actually being in a war is a scenario
    // about a war that is happening, not one being argued about.
    if (condition.kind === "warState" && (condition.role === "aggressor" || condition.role === "defender")) {
      return "damaged";
    }
    // A scenario that only opens once a condition is severe is a scenario
    // about the severity — the flood that took the district, not the forecast.
    if (condition.kind === "conditionActive" && (condition.atLeast ?? 0) >= DAMAGE_SEVERITY) {
      return "damaged";
    }
  }

  return fallback;
}

// How much damage each register depicts. Ordered so a candidate still can be
// compared against what the scenario actually supports.
const SEVERITY: Readonly<Record<SceneRegister, number>> = {
  intact: 0,
  ceremonial: 0,
  strained: 1,
  damaged: 2,
};

// What the class's terminal still actually shows. These are the 18 generic
// images, and four of them depict destruction outright — the war still is a
// shell-scarred block and a burnt-out car, the disaster still is a flooded
// street.
//
// That matters because the terminal is the end of every fallback chain: a war
// scenario with no faceted still falls through to it, and without this table a
// tension-gated incident at sea would land on a photograph of a ruined city.
const CLASS_STILL_REGISTER: Readonly<Record<ScenarioClass, SceneRegister>> = {
  tragedy: "damaged",
  terror: "damaged",
  unrest: "strained",
  disaster: "damaged",
  "public-health": "strained",
  migration: "strained",
  "foreign-crisis": "strained",
  war: "damaged",
  espionage: "intact",
  hostage: "strained",
  technology: "strained",
  economy: "strained",
  scandal: "intact",
  justice: "intact",
  institution: "intact",
  culture: "ceremonial",
  death: "ceremonial",
  triumph: "ceremonial",
};

/**
 * Whether the class's terminal still shows more damage than the scenario
 * supports.
 *
 * When it does, the honest answer is no photograph at all. A briefing with no
 * image is a briefing; a briefing showing a bombed city above an aircraft lost
 * in open water has told the player something false before they read a word,
 * and it cannot be unread. The empty case resolves itself the moment coverage
 * for that facet tuple is generated.
 */
export function classStillOverstates(facets: SceneFacets): boolean {
  return SEVERITY[CLASS_STILL_REGISTER[facets.kind]] > SEVERITY[facets.register];
}

/** The catalogue key for a fully specified still. */
export function sceneKey(facets: SceneFacets): string {
  return `${facets.kind}_${facets.site}_${facets.register}`;
}

/**
 * Where to look for a still, best first, ending somewhere that always exists.
 *
 * The chain degrades along the axis that costs the least to be wrong about.
 * Register is given up before site, because a photograph taken in the wrong
 * *place* contradicts the dateline printed beside it, while one taken in the
 * right place in the wrong condition merely under- or overstates it. The class
 * still is last and is never absent, so a lookup through this list cannot come
 * back empty and no caller needs a null branch.
 */
export function sceneCandidates(facets: SceneFacets): readonly string[] {
  const fallbackRegister = DEFAULT_REGISTER[facets.kind];
  return [
    sceneKey(facets),
    sceneKey({ ...facets, register: fallbackRegister }),
    sceneKey({ ...facets, site: "capital" }),
    sceneKey({ ...facets, site: "capital", register: fallbackRegister }),
    facets.kind,
  ].filter((key, index, all) => all.indexOf(key) === index);
}
