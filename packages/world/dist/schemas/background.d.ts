import { z } from "zod";
/**
 * Where a person's readings come from.
 *
 * A person is schooled and employed before they are scored, so that a dossier
 * answers *why* someone is like this rather than captioning a character sheet.
 * The seat decides the *range* — an intelligence director is selected for
 * competence, and that selection is real — but where inside that range someone
 * lands is earned by where they studied and what they have done since.
 */
export declare const SchoolId: z.core.$ZodBranded<z.ZodString, "SchoolId", "out">;
export type SchoolId = z.infer<typeof SchoolId>;
/**
 * What someone studied. Kept deliberately short: these are the fields that
 * change how a person governs, not a course catalogue. A field earns its place
 * here only if some rule downstream reads it.
 */
export declare const StudyField: z.ZodEnum<{
    law: "law";
    economics: "economics";
    engineering: "engineering";
    "military-science": "military-science";
    medicine: "medicine";
    "international-relations": "international-relations";
    "public-administration": "public-administration";
    journalism: "journalism";
    theology: "theology";
    "natural-sciences": "natural-sciences";
}>;
export type StudyField = z.infer<typeof StudyField>;
/**
 * How much reach a school's name carries.
 *
 * Not a quality ranking — it is a proxy for the network and the presumption a
 * graduate walks into a room with. A service academy is not "worse" than a
 * global-elite university; it produces a different person, which is why it is
 * its own tier rather than a low rung of one scale.
 */
export declare const SchoolTier: z.ZodEnum<{
    "global-elite": "global-elite";
    "national-flagship": "national-flagship";
    regional: "regional";
    "service-academy": "service-academy";
}>;
export type SchoolTier = z.infer<typeof SchoolTier>;
export declare const School: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "SchoolId", "out">;
    name: z.ZodString;
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    tier: z.ZodEnum<{
        "global-elite": "global-elite";
        "national-flagship": "national-flagship";
        regional: "regional";
        "service-academy": "service-academy";
    }>;
    fields: z.ZodArray<z.ZodEnum<{
        law: "law";
        economics: "economics";
        engineering: "engineering";
        "military-science": "military-science";
        medicine: "medicine";
        "international-relations": "international-relations";
        "public-administration": "public-administration";
        journalism: "journalism";
        theology: "theology";
        "natural-sciences": "natural-sciences";
    }>>;
}, z.core.$strip>;
export type School = z.infer<typeof School>;
export declare const Education: z.ZodObject<{
    school: z.core.$ZodBranded<z.ZodString, "SchoolId", "out">;
    field: z.ZodEnum<{
        law: "law";
        economics: "economics";
        engineering: "engineering";
        "military-science": "military-science";
        medicine: "medicine";
        "international-relations": "international-relations";
        "public-administration": "public-administration";
        journalism: "journalism";
        theology: "theology";
        "natural-sciences": "natural-sciences";
    }>;
    postgraduate: z.ZodBoolean;
}, z.core.$strip>;
export type Education = z.infer<typeof Education>;
/**
 * The kinds of working life that produce someone senior enough to hold a seat.
 *
 * Each one has to pull its weight in the derivation table — an archetype that
 * moves no attribute is decoration, and the paired test refuses it.
 */
export declare const CareerArchetype: z.ZodEnum<{
    medicine: "medicine";
    "civil-service": "civil-service";
    "military-command": "military-command";
    "intelligence-service": "intelligence-service";
    "diplomatic-corps": "diplomatic-corps";
    "private-law": "private-law";
    business: "business";
    academia: "academia";
    "party-organizing": "party-organizing";
    "local-government": "local-government";
    "state-media": "state-media";
    "independent-press": "independent-press";
    activism: "activism";
    "labor-union": "labor-union";
    judiciary: "judiciary";
}>;
export type CareerArchetype = z.infer<typeof CareerArchetype>;
export declare const CareerPost: z.ZodObject<{
    archetype: z.ZodEnum<{
        medicine: "medicine";
        "civil-service": "civil-service";
        "military-command": "military-command";
        "intelligence-service": "intelligence-service";
        "diplomatic-corps": "diplomatic-corps";
        "private-law": "private-law";
        business: "business";
        academia: "academia";
        "party-organizing": "party-organizing";
        "local-government": "local-government";
        "state-media": "state-media";
        "independent-press": "independent-press";
        activism: "activism";
        "labor-union": "labor-union";
        judiciary: "judiciary";
    }>;
    years: z.ZodNumber;
    startAge: z.ZodNumber;
}, z.core.$strip>;
export type CareerPost = z.infer<typeof CareerPost>;
