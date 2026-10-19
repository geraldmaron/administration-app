import { z } from "zod";
/**
 * The three axes in the fixed order every consumer that iterates them shares —
 * `cohortAffinity` and `stateAffinity` in engine/domestic-signature.ts fold a
 * declared `values` pull against exactly this list, so a fourth axis added
 * here reaches both without either needing to know it exists.
 */
export declare const IDEOLOGY_AXES: readonly ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
export type IdeologyAxis = (typeof IDEOLOGY_AXES)[number];
/**
 * What each end of an axis is called: the one table every screen and every
 * dossier reads, because the names are not the polarity their keys suggest.
 * `authLibertarian` is positive toward authority and `nationalistGlobalist` is
 * positive toward the nation, the direction every party platform, counsel
 * reading and alignment term in the engine already uses. The last founding
 * screen labeled both backwards from their keys, and three copies of this
 * table disagreed about which way the world view ran.
 */
export declare const IDEOLOGY_AXIS_POLES: Readonly<Record<IdeologyAxis, {
    readonly caption: string;
    readonly negative: string;
    readonly positive: string;
}>>;
/** Signed, -1..1 per axis; which way is positive is `IDEOLOGY_AXIS_POLES`. */
export declare const IdeologyVector: z.ZodObject<{
    economicLeftRight: z.ZodNumber;
    authLibertarian: z.ZodNumber;
    nationalistGlobalist: z.ZodNumber;
}, z.core.$strip>;
export type IdeologyVector = z.infer<typeof IdeologyVector>;
export declare const PersonTrait: z.ZodEnum<{
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
export type PersonTrait = z.infer<typeof PersonTrait>;
export declare const Person: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "PersonId", "out">;
    name: z.ZodString;
    nationality: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    portraitRef: z.ZodString;
    age: z.ZodNumber;
    bio: z.ZodString;
    education: z.ZodObject<{
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
    career: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
    ideology: z.ZodObject<{
        economicLeftRight: z.ZodNumber;
        authLibertarian: z.ZodNumber;
        nationalistGlobalist: z.ZodNumber;
    }, z.core.$strip>;
    competence: z.ZodNumber;
    loyalty: z.ZodNumber;
    ambition: z.ZodNumber;
    integrity: z.ZodNumber;
    charisma: z.ZodNumber;
    traits: z.ZodArray<z.ZodEnum<{
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
    eligibleRoles: z.ZodArray<z.core.$ZodBranded<z.ZodString, "RoleId", "out">>;
    affiliation: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "FactionId", "out">>;
    party: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "PartyId", "out">>;
    birthplace: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Person = z.infer<typeof Person>;
