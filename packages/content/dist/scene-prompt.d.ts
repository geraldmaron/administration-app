import type { SceneFacets } from "./scene.js";
/** How wide a dispatch photograph sits above its story. */
export declare const SCENE_STANDARD: {
    readonly format: "webp";
    readonly width: 768;
    readonly height: 432;
    readonly maxBytes: 60000;
    readonly aspect: "16:9";
};
export declare const SCENE_NEGATIVE_PROMPTS: readonly string[];
/**
 * The prompt for one dispatch photograph, and the negatives that go with it.
 *
 * Deterministic per facet tuple, so a still regenerated later gets the same
 * instruction rather than whatever the composer happened to say that day.
 *
 * Composed on three axes rather than written per image for the same reason the
 * portrait prompt is: 18 classes across 6 sites and 4 registers is 432
 * photographs, and hand-authoring 432 subject lines produces 432 chances to
 * drift the grade. The class says what the event is, the site says where the
 * camera is, the register says what state the place is in — and the grade,
 * shared by the photographic pipeline, is what lets a still generated today sit beside
 * one generated last month.
 */
export declare function scenePrompt(facets: SceneFacets): {
    prompt: string;
    negative: string;
};
/** The single instruction sent to an image model. */
export declare function sceneInstruction(facets: SceneFacets): string;
