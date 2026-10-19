import type { Campaign } from "./state.js";
import type { InstitutionId } from "./institutions.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * Which way the looking runs.
 *
 * `directed` is the administration's own: an agency told to audit a program, a
 * review the President ordered. `received` is oversight of the administration,
 * which is the half that costs it anything. Both are on one board on purpose —
 * a president who opens six of their own reviews the week three are opened into
 * them is doing something legible, and a board that only showed one direction
 * could not show it.
 */
export type MatterDirection = "directed" | "received";
/**
 * Where a matter has got to.
 *
 * `opened` is the week the file is started and nobody outside the building
 * knows. `gathering` is the long middle: documents, interviews, the part an
 * administration can answer if it chooses to. `reported` is a finding on the
 * record. `closed` is over — kept rather than deleted, because what was looked
 * into is part of the record of a presidency whether or not it found anything.
 */
export type MatterStage = "opened" | "gathering" | "reported" | "closed";
/** One week of the proceeding, in the words the board prints. */
export type MatterBeat = {
    readonly turn: number;
    readonly description: string;
};
/**
 * Who is doing the looking.
 *
 * Kept as the body rather than as a label so a surface can name the actual
 * office — this department's inspector general, that committee of the Senate —
 * and so the pressure reading can tell an internal audit from a subpoena.
 */
export type MatterOrigin = {
    readonly kind: "inspector-general";
    readonly institution: InstitutionId;
} | {
    readonly kind: "committee";
    readonly committee: string;
}
/**
 * A special counsel: a prosecutor the Attorney General appoints out of a
 * matter the department can no longer be seen to handle itself.
 *
 * Carries the matter it grew out of rather than an office id, because that
 * is the whole of what distinguishes it from the department's own work. A
 * counsel is not a standing body that could open a file next week; it exists
 * because one specific inquiry got somewhere, and when a screen asks what it
 * is looking into, the honest answer names that inquiry.
 */
 | {
    readonly kind: "special-counsel";
    readonly predicate: string;
};
export type OversightMatter = {
    readonly id: string;
    /** The concealed act that an inspector's later finding establishes, when there is one. */
    readonly causeId?: string;
    /** The recorded interception this audit investigates; an unrelated audit supplies no attribution. */
    readonly surveillanceIncidentId?: string;
    readonly origin: MatterOrigin;
    readonly direction: MatterDirection;
    /** What is being looked into, in the words the board prints. */
    readonly subject: string;
    readonly openedTurn: number;
    readonly stage: MatterStage;
    /**
     * Whether the country knows about this.
     *
     * Set once and never unset, and the applier is what guarantees that rather
     * than the callers: a fact the public has is not a fact any later week can
     * take back, and a flag a writer could clear would make the whole board a
     * thing an administration could quietly tidy.
     */
    readonly public: boolean;
    /**
     * Whether this administration moved against the people conducting it.
     *
     * The single most expensive fact a matter can carry, and the reason it is
     * stored on the matter rather than counted somewhere else: what compounds is
     * not that an inspector general was removed, it is that one was removed while
     * they were in the middle of something.
     */
    readonly obstructed: boolean;
    readonly beats: readonly MatterBeat[];
    readonly closedTurn?: number;
    readonly finding?: string;
};
/**
 * The auditor inside a department.
 *
 * Seated at founding rather than appointed, because that is the fact of the
 * office: an incoming president inherits inspectors general already in post
 * and their inquiries already running. The President may remove one, and the
 * only thing standing between them and an empty office is the notice this
 * record holds.
 */
export type InspectorGeneral = {
    readonly institution: InstitutionId;
    readonly seatedTurn: number;
    /**
     * The day the President's written notice of intent to remove was filed, as an
     * ordinal week of the campaign.
     *
     * Absent on an inspector nobody has moved against. Its presence is the whole
     * of the constraint: the office is not empty yet, everyone can read that it
     * is about to be, and the weeks between the notice and the vacancy are weeks
     * the inquiry keeps running.
     */
    readonly noticeFiledTurn?: number;
    /** The reasons the President gave, on the record, in the order given. */
    readonly noticeReasons: readonly string[];
    readonly removedTurn?: number;
};
export type OversightState = {
    /** Keyed by the institution the inspector serves in. */
    readonly inspectors: Readonly<Record<InstitutionId, InspectorGeneral>>;
    /** Every matter, open and closed, oldest first. */
    readonly matters: readonly OversightMatter[];
};
/**
 * The notice an inspector general is owed before the office can be emptied.
 *
 * Thirty days, in writing, with the reasons stated. It is not a veto — the
 * President may still do it — it is the fact that they cannot do it quietly or
 * quickly, which is the whole of what the protection is worth and the whole of
 * what makes firing one mid-inquiry a decision instead of a click.
 */
export declare const IG_REMOVAL_NOTICE_DAYS = 30;
/**
 * The notice period in weeks, converted where it is read rather than once at
 * module load.
 *
 * A function rather than a constant, and not a style choice: the effect gate
 * imports this module's writer and this module imports the turn loop's week
 * length, so a conversion done in the module body runs while that cycle is
 * still settling and quietly yields a not-a-number the whole file then
 * arithmetics with. Every other clock here is converted at its point of use for
 * the same reason.
 */
export declare function igRemovalNoticeTurns(): number;
/**
 * The institutions that have an inspector general.
 *
 * Every standing body of the executive branch that is not a component of
 * another one: a department has an auditor, and the bureaus inside it are
 * audited by their department's rather than by fourteen of their own. The other
 * branches are excluded because this is the executive's own internal auditor
 * and Congress is not audited by one — Congress is the other half of this file.
 *
 * Read off the catalog rather than listed, so a body the catalog adds gets an
 * auditor without this file changing, and one it removes stops having a
 * phantom.
 */
export declare const INSPECTED_INSTITUTIONS: readonly InstitutionId[];
export declare function foundingOversight(turn?: number): OversightState;
export declare function selectMatter(campaign: Campaign, id: string): OversightMatter | undefined;
export declare function isMatterOpen(matter: OversightMatter): boolean;
export declare function selectOpenMatters(campaign: Campaign): readonly OversightMatter[];
/** Every matter this institution's own auditor has running, open or closed. */
export declare function selectMattersFor(campaign: Campaign, institution: InstitutionId): readonly OversightMatter[];
export declare function selectInspector(campaign: Campaign, institution: InstitutionId): InspectorGeneral | undefined;
/** Whether this auditor is in post: seated, and not yet removed. */
export declare function inspectorIsSeated(inspector: InspectorGeneral | undefined): inspector is InspectorGeneral;
/** The office the matter came out of, in the words a screen prints. */
export declare function matterSource(matter: OversightMatter): string;
/** When the matter next moves on its own, as a week of the campaign. */
export declare function matterRipensTurn(matter: OversightMatter): number | undefined;
/**
 * How much trouble the standing oversight of this administration is worth, 0..1.
 *
 * The third term the chamber reads about a presidency, beside how it is
 * regarded and how much force it has used without asking. It is deliberately
 * the same shape as the second one — a bounded count of specific, dated,
 * nameable facts rather than a mood — because that is what makes it something
 * a president can see coming and act on.
 *
 * Exported rather than folded into a caller because two branches need it and
 * they must not each grow their own: the Hill's disposition reads it as one of
 * the things Congress is currently looking at, and the removal arc reads it as
 * part of what an impeachment would be built out of. A record that entered both
 * accounts by two different formulas would be two different governments.
 */
export declare function selectOversightPressure(campaign: Campaign): number;
/**
 * A change to the oversight board.
 *
 * Whole records rather than patches, on the rule the funding record follows: a
 * matter and an inspector are both small, both keyed, and a patch-shaped writer
 * would need a merge rule per field that the callers would then have to agree
 * about. The one thing the applier does not take from a caller is the public
 * flag going back down.
 */
export type OversightEffect = {
    readonly kind: "oversight";
    /** Matters opened or advanced this week, each written whole and keyed by id. */
    readonly matters?: readonly OversightMatter[];
    /** Inspectors seated, noticed or removed this week, keyed by institution. */
    readonly inspectors?: readonly InspectorGeneral[];
};
export declare function applyOversight(state: Campaign, effect: OversightEffect): Campaign;
/**
 * Every open matter's week.
 *
 * Separate from the two phases that open matters because ripening is the same
 * rule whoever started the file: an audit and a subpoena are different things
 * to receive and the same thing to sit through.
 */
export declare const oversightRipeningPhase: TurnPhase;
