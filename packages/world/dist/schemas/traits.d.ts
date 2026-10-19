import { z } from "zod";
export declare const TraitRange: z.ZodObject<{
    min: z.ZodNumber;
    max: z.ZodNumber;
}, z.core.$strip>;
export type TraitRange = z.infer<typeof TraitRange>;
export declare const TraitRanges: z.ZodObject<{
    aggression: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    opportunism: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    legalism: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    isolationism: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    riskTolerance: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    vengefulness: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    reliability: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    transparency: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type TraitRanges = z.infer<typeof TraitRanges>;
export declare const TRAIT_KEYS: readonly ["aggression", "opportunism", "legalism", "isolationism", "riskTolerance", "vengefulness", "reliability", "transparency"];
export type TraitKey = (typeof TRAIT_KEYS)[number];
export declare const NationTraitProfile: z.ZodObject<{
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    ranges: z.ZodObject<{
        aggression: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        opportunism: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        legalism: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        isolationism: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        riskTolerance: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        vengefulness: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        reliability: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
        transparency: z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
    candidateAgendas: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        weight: z.ZodNumber;
    }, z.core.$strip>>;
    agendaCount: z.ZodNumber;
}, z.core.$strip>;
export type NationTraitProfile = z.infer<typeof NationTraitProfile>;
