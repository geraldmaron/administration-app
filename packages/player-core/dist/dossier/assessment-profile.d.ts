/**
 * The five readings on a person, assembled once for every surface that draws
 * them.
 *
 * There were three of these tables — one on the dossier, one on the cabinet
 * roster's readouts, one in the shortlist card — none importing from the
 * others, and two independent copies of the rule that picks the reading worth
 * naming first. Regrading an attribute in one propagated to none of them.
 *
 * The shape does one thing the three did not: it makes ambition's status
 * structural. A reading carries `kind`, and a pressure never carries a stance,
 * so a renderer cannot reach for a favorable or an adverse color on the one
 * reading the same screen calls ungraded two elements away. That was a live
 * defect — an amber caution chip on the ambition row — and it came back from a
 * boolean flag that a caller was free to reinterpret.
 *
 * No renderer import: the cabinet roster's own view model is a plain module
 * kept off the render graph so it can be unit tested, and it reads this.
 */
import type { AttributeKey } from "@admin/engine";
import { type Person } from "@admin/world";
import { type MetricStance } from "../format/figures";
import { type ConsequenceSubject } from "./attribute-consequence";
/**
 * A graded reading takes a stance: higher is better and the color says so. A
 * pressure never does. The simulation does not score ambition as good and does
 * not need to — it only ever costs, and only past the mark a challenge is
 * mounted at.
 */
export type ReadingKind = "graded" | "pressure";
export type AssessmentReading = {
    readonly key: AttributeKey;
    readonly label: string;
    /**
     * Two marks for five readings, on purpose. There is no conventional glyph
     * for "integrity," and five invented ones would be five marks a reader has
     * to learn before the name beside them tells them the same thing. The name
     * carries the identity; the mark says only which of the two kinds of reading
     * this is.
     */
    readonly mark: string;
    readonly kind: ReadingKind;
    /** 0..1 as stored, used only to size a bar — never printed as a figure. */
    readonly value: number;
    /**
     * Empty, on purpose. Nothing in the fiction of the office hands a president
     * a minister's loyalty, integrity, ambition, charisma or competence as a
     * number, so the trailing figure column stays blank and `word` carries the
     * whole reading (`scripts/verify-disclosure.mjs`).
     */
    readonly figure: string;
    /** The qualitative read. For a pressure this is a direction, never a verdict. */
    readonly word: string;
    /** Undefined whenever `kind` is "pressure". A caller must not compute one. */
    readonly stance?: MetricStance;
    /** Where this sits in the window the chair actually recruits from, 0..1. Undefined off-chair. */
    readonly position?: number;
    /** What this reading moves, for this subject, in the simulation. */
    readonly consequence: string;
};
/** The one reading worth naming first. Ambition is eligible; it is drawn as pressure, not as a fault. */
export type AssessmentWatch = {
    readonly key: AttributeKey;
    readonly label: string;
    readonly kind: ReadingKind;
    readonly line: string;
};
export type AssessmentProfile = {
    /** Always five, in the fixed order competence, loyalty, integrity, charisma, ambition. */
    readonly readings: readonly AssessmentReading[];
    readonly watch?: AssessmentWatch;
    /** The chair the readings were placed against, where the seat authors a window. */
    readonly seat?: string;
};
export type AssessmentOptions = {
    /** The seat id whose recruiting window places the readings — "role-treasury-minister". */
    readonly role?: string;
    /** Whose file this is. An officer unless the caller says otherwise. */
    readonly subject?: ConsequenceSubject;
    /** The charter's own titles, so the seat reads as the player's government names it. */
    readonly titles?: Readonly<Record<string, string>>;
};
/** Above this, the worst reading is the thing a reader should be told first. */
export declare const WATCH_RISK_FLOOR = 0.6;
/**
 * The five readings, the one worth naming first, and the chair they were
 * placed against.
 *
 * `role` is the seat id, not its title: the window a reading is placed in
 * belongs to the seat the person is being read for, and 0.32 loyalty is
 * disqualifying in a chief of staff and unremarkable in an opposition leader
 * because those two chairs recruit from different windows. A seat that authors
 * no window gets no `position` rather than a placement pretending to be one.
 */
export declare function assessmentProfile(person: Person, options?: AssessmentOptions): AssessmentProfile;
