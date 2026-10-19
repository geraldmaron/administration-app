import { z } from "zod";
import { NationId, RoleId } from "./ids.js";
import { PersonTrait } from "./person.js";
import { TraitRange } from "./traits.js";
// The pool is generated per campaign rather than stored as thousands of fixed
// records: which people exist is one of the things that has to differ between
// playthroughs. What is authored is the *shape* of the draw — the names a
// nation draws from, the roles it needs filled, and what a person in each role
// tends to be like.
// A bank is one or more weighted groups rather than one flat given/surname
// pair. Most nations only need one group — the naming convention is uniform.
// A nation whose population is itself diverse (the United States) can carry
// several: a person drawn from it should read as belonging to one
// coherent naming tradition, not a given name from one group stitched to a
// surname from another.
//
// Given names are split by presentation — masculine, feminine, neutral — and
// drawn against the same gender roll that picks the person's portrait, so the
// name and the face agree instead of being rolled from unrelated tables.
// "Neutral" holds names that read as unisex or non-binary-coded within that
// naming tradition, not an androgynous-only leftover bucket.
/**
 * How a tradition writes a name, from the leader table's surname rule:
 * - `given-family`: the personal name, then the family name;
 * - `family-given`: the family name first (China, Korea, Vietnam, Cambodia);
 * - `patronymic`: no family name, the father's given name second (Ethiopia,
 *   Somalia, the Comoros); the group's surname list is its fathers' names;
 * - `malay-patronymic`: "bin" or "binti" and the father's name (Malaysia, Brunei);
 * - `mauritanian-patronymic`: "Ould" or "Mint" and the father's name.
 */
export const NameForm = z.enum(["given-family", "family-given", "patronymic", "malay-patronymic", "mauritanian-patronymic"]);
export const NameGroup = z.object({
    /** The tradition's own name, so a test can hold a nation to the traditions it may draw from. */
    id: z.string().min(1).optional(),
    /** How a name from this tradition is written; absent reads as `given-family`. */
    form: NameForm.optional(),
    given: z.object({
        masculine: z.array(z.string().min(1)).min(60),
        feminine: z.array(z.string().min(1)).min(60),
        neutral: z.array(z.string().min(1)).min(30),
    }),
    surname: z.array(z.string().min(1)).min(60),
    // Relative draw weight among the bank's groups. Absolute scale doesn't
    // matter, only the ratio between groups.
    weight: z.number().positive().default(1),
});
export const NameBank = z.object({
    groups: z.array(NameGroup).min(1),
});
export const PersonAttributeRanges = z.object({
    competence: TraitRange,
    loyalty: TraitRange,
    ambition: TraitRange,
    integrity: TraitRange,
    charisma: TraitRange,
});
// What a person holding this seat tends to be like.
//
// A `portraitClass` string sat here claiming to be the imagery contract. It
// never was: a portraitRef is composed from the role's attire weights and the
// nation's heritage mix, and nothing ever read the class. It is gone rather
// than wired up, because the facet tuple already says everything it said.
export const RoleProfile = z.object({
    role: RoleId,
    cabinet: z.boolean(),
    attributes: PersonAttributeRanges,
    likelyTraits: z.array(PersonTrait).min(2),
    ageRange: z.object({ min: z.number().int().min(18), max: z.number().int().max(100) }),
    ideologySpread: z.number().min(0).max(1),
});
export const PersonPoolSpec = z.object({
    nation: NationId,
    nameCulture: z.string().min(1),
    roles: z.array(RoleId).min(1),
    // Candidates generated per role. More than one is what makes a cabinet
    // appointment a choice rather than an announcement — and the player's own
    // nation needs a deeper bench than an NPC's, because it is the only pool a
    // campaign ever hires out of. Dismiss four ministers over forty turns and a
    // three-deep bench is an empty one.
    depthPerRole: z.number().int().min(1).max(12),
    // Per-seat override. US governors need fifty holders; the default
    // PLAYER_DEPTH_PER_ROLE is eight and must not silently become fifty.
    roleDepth: z.record(z.string(), z.number().int().min(1).max(80)).optional(),
});
