import { z } from "zod";
import { NationId } from "./ids.js";
/**
 * Where a person's readings come from.
 *
 * A person is schooled and employed before they are scored, so that a dossier
 * answers *why* someone is like this rather than captioning a character sheet.
 * The seat decides the *range* — an intelligence director is selected for
 * competence, and that selection is real — but where inside that range someone
 * lands is earned by where they studied and what they have done since.
 */
export const SchoolId = z.string().min(1).brand();
/**
 * What someone studied. Kept deliberately short: these are the fields that
 * change how a person governs, not a course catalogue. A field earns its place
 * here only if some rule downstream reads it.
 */
export const StudyField = z.enum([
    "law",
    "economics",
    "engineering",
    "military-science",
    "medicine",
    "international-relations",
    "public-administration",
    "journalism",
    "theology",
    "natural-sciences",
]);
/**
 * How much reach a school's name carries.
 *
 * Not a quality ranking — it is a proxy for the network and the presumption a
 * graduate walks into a room with. A service academy is not "worse" than a
 * global-elite university; it produces a different person, which is why it is
 * its own tier rather than a low rung of one scale.
 */
export const SchoolTier = z.enum(["global-elite", "national-flagship", "regional", "service-academy"]);
// Named `School` rather than `Institution` because a charter already uses that
// word for an organ of government — an assembly, an executive, a judiciary.
// Two meanings of "institution" in one dataset is a reliable way to write the
// wrong import.
export const School = z.object({
    id: SchoolId,
    name: z.string().min(1),
    /** Where it is. */
    nation: NationId,
    tier: SchoolTier,
    /** What it is actually known for. A graduate's field is drawn from this list. */
    fields: z.array(StudyField).min(1),
});
export const Education = z.object({
    school: SchoolId,
    field: StudyField,
    /**
     * Whether they went back for a further degree. Separate from tier because it
     * is a different claim: persistence and specialization rather than access.
     */
    postgraduate: z.boolean(),
});
/**
 * The kinds of working life that produce someone senior enough to hold a seat.
 *
 * Each one has to pull its weight in the derivation table — an archetype that
 * moves no attribute is decoration, and the paired test refuses it.
 */
export const CareerArchetype = z.enum([
    "civil-service",
    "military-command",
    "intelligence-service",
    "diplomatic-corps",
    "private-law",
    "business",
    "academia",
    "party-organizing",
    "local-government",
    "state-media",
    "independent-press",
    "activism",
    "medicine",
    "labor-union",
    // A sitting judge's life: a state bench or a federal trial court. No seat in
    // the dataset's pool draws it; only the bench a judicial vacancy generates
    // does, so adding it moved no seeded cast.
    "judiciary",
]);
export const CareerPost = z.object({
    archetype: CareerArchetype,
    /** How long they spent in it. The span is what makes a career a history rather than a list. */
    years: z.number().int().min(1).max(40),
    /** The age they started it, so a dossier can lay the posts out on a timeline. */
    startAge: z.number().int().min(18).max(90),
});
