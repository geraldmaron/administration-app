import { z } from "zod";
import { CareerArchetype, StudyField } from "./background.js";
import { PersonTrait } from "./person.js";
// The player is not drawn from the person pool. They are composed from a life:
// a career that formed them and the route by which that career reached the top
// chair. Both are authored here rather than surfaced as raw attribute sliders,
// because a slider lets a player buy a leader who is masterful, devoted,
// incorruptible and beloved at once — a person no rule in the simulation was
// written to score, and one no career produces.
//
// What the player chooses is a biography. The readings are what that biography
// is worth, computed the same way every time.
export const LeaderBackgroundId = z.string().min(1).brand();
export const LeaderRouteId = z.string().min(1).brand();
/** The five readings every person in the world carries, as a point rather than a range. */
export const LeaderAttributes = z.object({
    competence: z.number().min(0).max(1),
    loyalty: z.number().min(0).max(1),
    ambition: z.number().min(0).max(1),
    integrity: z.number().min(0).max(1),
    charisma: z.number().min(0).max(1),
});
/** Signed shifts a route applies to the background's readings. */
export const LeaderAttributeShift = z.object({
    competence: z.number().min(-0.5).max(0.5),
    loyalty: z.number().min(-0.5).max(0.5),
    ambition: z.number().min(-0.5).max(0.5),
    integrity: z.number().min(-0.5).max(0.5),
    charisma: z.number().min(-0.5).max(0.5),
});
/**
 * A career. What the player did before politics, which is where their readings
 * come from and what the world's press will call them.
 */
export const LeaderBackground = z.object({
    id: LeaderBackgroundId,
    name: z.string().min(1),
    /** The one line that says what this life was, shown on the choice itself. */
    kicker: z.string().min(1),
    /** Why these readings and not others — shown when the background is selected. */
    rationale: z.string().min(20),
    base: LeaderAttributes,
    /** The disposition the career itself leaves behind. */
    anchorTrait: PersonTrait,
    /**
     * The plausible age window for someone who reached the top chair by this
     * route. A central banker is not thirty-one; a street organizer is rarely
     * seventy-eight. The player picks inside the window, not around it.
     */
    ageRange: z.object({ min: z.number().int().min(18), max: z.number().int().max(100) }),
    /** The opening clause of the composed bio. `{nation}` is substituted. */
    careerLine: z.string().min(20),
    /**
     * The same life, stated in the vocabulary every other person in the world
     * carries. The player picks a biography; without this the person that
     * biography produces reached the top chair with an empty service record and
     * no school, and their own dossier said so on every screen that reads a
     * career. Authored rather than inferred: which archetype a central banker
     * belongs to is a judgment about the world, not a string transformation.
     */
    formation: z.object({
        archetype: CareerArchetype,
        field: StudyField,
        /** Whether this life normally requires going back for a further degree. */
        postgraduate: z.boolean(),
        /** The age this career typically began, so its span is real rather than assumed. */
        startAge: z.number().int().min(18).max(40),
    }),
});
/**
 * How the career reached the chair. The same person arrives with a different
 * claim on the office depending on which American path put them in it, and the
 * government reads them differently for it. The paths themselves are authored
 * in the dataset rather than listed here, so this stays true as they change.
 */
export const LeaderRoute = z.object({
    id: LeaderRouteId,
    name: z.string().min(1),
    kicker: z.string().min(1),
    rationale: z.string().min(20),
    shift: LeaderAttributeShift,
    /** A second disposition, where the route leaves one. */
    anchorTrait: PersonTrait.optional(),
    /** The closing clause of the composed bio. `{nation}` is substituted. */
    arrivalLine: z.string().min(20),
});
