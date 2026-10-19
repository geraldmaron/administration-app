import { type BackgroundDriver, type Person } from "@admin/world";
import { type AttributeKey } from "./bio.js";
export type AssessmentTone = "strength" | "risk";
export type PersonAssessmentItem = {
    readonly attribute: AttributeKey;
    /** "Competence", "Ambition" — the reading being spoken about. */
    readonly label: string;
    readonly tone: AssessmentTone;
    /** The chair-relative sentence. Never a bare grade. */
    readonly reading: string;
    /**
     * The fact behind it, where the record carries one — "Most of it is the long
     * run in the civil service." Empty only for a person whose whole background
     * moves this reading not at all, which the generator does not produce.
     */
    readonly because: string;
};
export type PersonAssessment = {
    readonly strengths: readonly PersonAssessmentItem[];
    readonly risks: readonly PersonAssessmentItem[];
};
/**
 * One driver said out loud. Exported so a gate can check that the clause a
 * dossier prints is a fact the person's own record holds, rather than trusting
 * that it is.
 */
export declare function driverPhrase(driver: BackgroundDriver): string;
/**
 * What is unusual about this person for the chair they are being weighed for,
 * and which way it cuts.
 *
 * `role` is passed rather than read off the person because it is the seat being
 * weighed: a candidate is measured against the chair they do not yet hold, and
 * their own eligibility is the honest fallback.
 */
export declare function personAssessment(person: Person, role?: string): PersonAssessment;
