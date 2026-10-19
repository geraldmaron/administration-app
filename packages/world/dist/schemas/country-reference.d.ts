import { z } from "zod";
export declare const CountryReference: z.ZodObject<{
    nationId: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    executiveSummary: z.ZodString;
    background: z.ZodString;
    governmentSystem: z.ZodString;
    economyNarrative: z.ZodString;
    societyNarrative: z.ZodOptional<z.ZodString>;
    securityNarrative: z.ZodOptional<z.ZodString>;
    whyItMatters: z.ZodString;
}, z.core.$strip>;
export type CountryReference = z.infer<typeof CountryReference>;
