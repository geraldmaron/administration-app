import type { ScenarioClass, ScenarioDef, ScenarioLocusSite } from "./scenario.js";
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
export declare const SCENE_REGISTERS: readonly ["intact", "strained", "damaged", "ceremonial"];
export type SceneRegister = (typeof SCENE_REGISTERS)[number];
export type SceneFacets = {
    readonly kind: ScenarioClass;
    readonly site: SceneSite;
    readonly register: SceneRegister;
};
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
export declare function sceneFacets(def: ScenarioDef): SceneFacets;
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
export declare function classStillOverstates(facets: SceneFacets): boolean;
/** The catalogue key for a fully specified still. */
export declare function sceneKey(facets: SceneFacets): string;
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
export declare function sceneCandidates(facets: SceneFacets): readonly string[];
