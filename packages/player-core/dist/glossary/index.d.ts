import type { Explainer, GlossaryEntry } from "./types.js";
export type { Explainer, ExplainerCastMember, ExplainerExample, ExplainerLink, ExplainerStep, ExplainerThreshold, GlossaryEntry } from "./types.js";
export declare const GLOSSARY: readonly GlossaryEntry[];
export declare const EXPLAINERS: readonly Explainer[];
export declare function glossaryEntry(id: string): GlossaryEntry | undefined;
export declare function explainer(id: string): Explainer | undefined;
export { HANDBOOK, HANDBOOK_INTRO, handbookChapter, chapterForExplainer, type HandbookChapter } from "./handbook.js";
