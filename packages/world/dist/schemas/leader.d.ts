import { z } from "zod";
export declare const LeaderBackgroundId: z.core.$ZodBranded<z.ZodString, "LeaderBackgroundId", "out">;
export type LeaderBackgroundId = z.infer<typeof LeaderBackgroundId>;
export declare const LeaderRouteId: z.core.$ZodBranded<z.ZodString, "LeaderRouteId", "out">;
export type LeaderRouteId = z.infer<typeof LeaderRouteId>;
/** The five readings every person in the world carries, as a point rather than a range. */
export declare const LeaderAttributes: z.ZodObject<{
    competence: z.ZodNumber;
    loyalty: z.ZodNumber;
    ambition: z.ZodNumber;
    integrity: z.ZodNumber;
    charisma: z.ZodNumber;
}, z.core.$strip>;
export type LeaderAttributes = z.infer<typeof LeaderAttributes>;
/** Signed shifts a route applies to the background's readings. */
export declare const LeaderAttributeShift: z.ZodObject<{
    competence: z.ZodNumber;
    loyalty: z.ZodNumber;
    ambition: z.ZodNumber;
    integrity: z.ZodNumber;
    charisma: z.ZodNumber;
}, z.core.$strip>;
export type LeaderAttributeShift = z.infer<typeof LeaderAttributeShift>;
/**
 * A career. What the player did before politics, which is where their readings
 * come from and what the world's press will call them.
 */
export declare const LeaderBackground: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "LeaderBackgroundId", "out">;
    name: z.ZodString;
    kicker: z.ZodString;
    rationale: z.ZodString;
    base: z.ZodObject<{
        competence: z.ZodNumber;
        loyalty: z.ZodNumber;
        ambition: z.ZodNumber;
        integrity: z.ZodNumber;
        charisma: z.ZodNumber;
    }, z.core.$strip>;
    anchorTrait: z.ZodEnum<{
        ambitious: "ambitious";
        cautious: "cautious";
        loyal: "loyal";
        corrupt: "corrupt";
        principled: "principled";
        charismatic: "charismatic";
        reclusive: "reclusive";
        hawkish: "hawkish";
        dovish: "dovish";
        pragmatic: "pragmatic";
    }>;
    ageRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    careerLine: z.ZodString;
    formation: z.ZodObject<{
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
        startAge: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type LeaderBackground = z.infer<typeof LeaderBackground>;
/**
 * How the career reached the chair. The same person arrives with a different
 * claim on the office depending on which American path put them in it, and the
 * government reads them differently for it. The paths themselves are authored
 * in the dataset rather than listed here, so this stays true as they change.
 */
export declare const LeaderRoute: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "LeaderRouteId", "out">;
    name: z.ZodString;
    kicker: z.ZodString;
    rationale: z.ZodString;
    shift: z.ZodObject<{
        competence: z.ZodNumber;
        loyalty: z.ZodNumber;
        ambition: z.ZodNumber;
        integrity: z.ZodNumber;
        charisma: z.ZodNumber;
    }, z.core.$strip>;
    anchorTrait: z.ZodOptional<z.ZodEnum<{
        ambitious: "ambitious";
        cautious: "cautious";
        loyal: "loyal";
        corrupt: "corrupt";
        principled: "principled";
        charismatic: "charismatic";
        reclusive: "reclusive";
        hawkish: "hawkish";
        dovish: "dovish";
        pragmatic: "pragmatic";
    }>>;
    arrivalLine: z.ZodString;
}, z.core.$strip>;
export type LeaderRoute = z.infer<typeof LeaderRoute>;
