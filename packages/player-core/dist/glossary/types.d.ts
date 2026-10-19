/** A word a player meets, defined where they meet it. */
export type GlossaryEntry = {
    readonly id: string;
    readonly term: string;
    /** What it is in the real government, in a sentence a newcomer can read. */
    readonly definition: string;
    /** What the simulation does with it, where that narrows or departs from the real thing. */
    readonly inGame?: string;
    /** One everyday case of the thing, so a definition is never only abstract. */
    readonly example?: string;
    /** An icon name from the ui-web set, drawn on the card beside the term. */
    readonly icon?: string;
    /** Other entries worth reading next. Every id must exist. */
    readonly related?: readonly string[];
};
/** One stage of a process, drawn as a node on a line. */
export type ExplainerStep = {
    readonly label: string;
    readonly detail: string;
    /** A glossary id the step's label defines. */
    readonly term?: string;
    /** An icon name from the ui-web set; unknown names draw no icon. */
    readonly icon?: string;
    /** How a thing can leave the process at this step, if it can. */
    readonly exit?: string;
    /** How long the step usually takes, in the game's weeks, as a short phrase ("Usually 1 week"). */
    readonly duration?: string;
    /** What the player can do at this step, said as an act. */
    readonly youCan?: string;
};
/**
 * One of the people or bodies a process involves, introduced before the steps
 * so a reader knows who the steps are about. A newcomer meets "the committee"
 * and "the floor" as characters here, not as undefined nouns in a sentence.
 */
export type ExplainerCastMember = {
    readonly label: string;
    /** What they do in this process, in a sentence. */
    readonly role: string;
    readonly icon?: string;
    readonly term?: string;
};
/**
 * A count that decides something: how many of a body must agree. Drawn as a
 * bar with the line marked, because "218 of 435" is a picture before it is a
 * number.
 */
export type ExplainerThreshold = {
    readonly label: string;
    readonly needed: number;
    readonly of: number;
    /** What reaching it does, in a sentence. */
    readonly note: string;
};
/**
 * One influence: a reading or act that moves another. `weight` must come from
 * the engine's own weighting (a constant, a multiplier, a threshold) and the
 * comment beside the entry names it; an influence nobody can point to in
 * source is not written.
 */
export type ExplainerLink = {
    readonly from: string;
    readonly to: string;
    readonly how: string;
    readonly direction: "raises" | "lowers" | "shifts";
    readonly weight: "strong" | "moderate" | "weak";
    /**
     * Whether the move is good or bad for the President, when that is not in
     * doubt. Direction alone is not a verdict: integrity lowering a break risk
     * is good news. Left out, the arrow is drawn in a neutral ink.
     */
    readonly outcome?: "helps" | "hurts";
};
/**
 * A worked example: either a real episode, said as history, or a case in this
 * game's own terms, said as an illustration. Never invented figures dressed as
 * the player's own campaign.
 */
export type ExplainerExample = {
    readonly title: string;
    readonly kind: "history" | "illustration";
    readonly lines: readonly string[];
};
export type Explainer = {
    readonly id: string;
    readonly title: string;
    /** One or two sentences: what this is and why the player should care. */
    readonly summary: string;
    /** Who is involved, before the steps that involve them. */
    readonly cast?: readonly ExplainerCastMember[];
    readonly steps?: readonly ExplainerStep[];
    readonly thresholds?: readonly ExplainerThreshold[];
    readonly links?: readonly ExplainerLink[];
    /**
     * Worked cases. Lead with one in the game's own terms that follows the steps
     * through; a historical one, where it helps, comes after it.
     */
    readonly examples?: readonly ExplainerExample[];
    /** What the player can do about it, each said as an act. */
    readonly youCan?: readonly string[];
    /** Explainer ids worth reading after this one. Every id must exist. */
    readonly next?: readonly string[];
    /** Glossary ids to offer as chips under the explanation. */
    readonly terms?: readonly string[];
};
