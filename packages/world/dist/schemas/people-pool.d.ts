import { z } from "zod";
/**
 * How a tradition writes a name, from the leader table's surname rule:
 * - `given-family`: the personal name, then the family name;
 * - `family-given`: the family name first (China, Korea, Vietnam, Cambodia);
 * - `patronymic`: no family name, the father's given name second (Ethiopia,
 *   Somalia, the Comoros); the group's surname list is its fathers' names;
 * - `malay-patronymic`: "bin" or "binti" and the father's name (Malaysia, Brunei);
 * - `mauritanian-patronymic`: "Ould" or "Mint" and the father's name.
 */
export declare const NameForm: z.ZodEnum<{
    "given-family": "given-family";
    "family-given": "family-given";
    patronymic: "patronymic";
    "malay-patronymic": "malay-patronymic";
    "mauritanian-patronymic": "mauritanian-patronymic";
}>;
export type NameForm = z.infer<typeof NameForm>;
export declare const NameGroup: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    form: z.ZodOptional<z.ZodEnum<{
        "given-family": "given-family";
        "family-given": "family-given";
        patronymic: "patronymic";
        "malay-patronymic": "malay-patronymic";
        "mauritanian-patronymic": "mauritanian-patronymic";
    }>>;
    given: z.ZodObject<{
        masculine: z.ZodArray<z.ZodString>;
        feminine: z.ZodArray<z.ZodString>;
        neutral: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    surname: z.ZodArray<z.ZodString>;
    weight: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type NameGroup = z.infer<typeof NameGroup>;
export declare const NameBank: z.ZodObject<{
    groups: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        form: z.ZodOptional<z.ZodEnum<{
            "given-family": "given-family";
            "family-given": "family-given";
            patronymic: "patronymic";
            "malay-patronymic": "malay-patronymic";
            "mauritanian-patronymic": "mauritanian-patronymic";
        }>>;
        given: z.ZodObject<{
            masculine: z.ZodArray<z.ZodString>;
            feminine: z.ZodArray<z.ZodString>;
            neutral: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
        surname: z.ZodArray<z.ZodString>;
        weight: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type NameBank = z.infer<typeof NameBank>;
export declare const PersonAttributeRanges: z.ZodObject<{
    competence: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    loyalty: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    ambition: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    integrity: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    charisma: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PersonAttributeRanges = z.infer<typeof PersonAttributeRanges>;
export declare const RoleProfile: z.ZodObject<{
    role: z.core.$ZodBranded<z.ZodString, "RoleId", "out">;
    cabinet: z.ZodBoolean;
    attributes: z.ZodObject<{
        competence: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        loyalty: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        ambition: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        integrity: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        charisma: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
    likelyTraits: z.ZodArray<z.ZodEnum<{
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
    ageRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    ideologySpread: z.ZodNumber;
}, z.core.$strip>;
export type RoleProfile = z.infer<typeof RoleProfile>;
export declare const PersonPoolSpec: z.ZodObject<{
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    nameCulture: z.ZodString;
    roles: z.ZodArray<z.core.$ZodBranded<z.ZodString, "RoleId", "out">>;
    depthPerRole: z.ZodNumber;
    roleDepth: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, z.core.$strip>;
export type PersonPoolSpec = z.infer<typeof PersonPoolSpec>;
