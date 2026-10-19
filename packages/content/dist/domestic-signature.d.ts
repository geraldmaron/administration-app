import { MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP } from "@admin/engine";
import { z } from "zod";
export declare const DomesticMagnitudeSchema: z.ZodEnum<{
    moderate: "moderate";
    light: "light";
    heavy: "heavy";
}>;
export type DomesticMagnitudeSchema = z.infer<typeof DomesticMagnitudeSchema>;
/**
 * Who a nationally-scoped act hits at home. Declared by the reply, never
 * inferred from prose. Compiles through `domesticSignatureEffects` into
 * `routeDomestic` StateEffects and `routeCohorts` CohortEffects at cast time.
 *
 * `values` is the field that lets a reply about something other than an
 * industry — an identity or rights question, a religious-liberty dispute, an
 * immigration-status decision — still land with real state and cohort
 * texture instead of falling through to a national-only effect. It reads the
 * same `IdeologyVector` a reply's `pull` already commits to, so declaring
 * both is naming one fact once: what this decision says about the country.
 */
export declare const DomesticSignatureShape: z.ZodObject<{
    axes: z.ZodOptional<z.ZodObject<{
        industrial: z.ZodOptional<z.ZodNumber>;
        agricultural: z.ZodOptional<z.ZodNumber>;
        energy: z.ZodOptional<z.ZodNumber>;
        tech: z.ZodOptional<z.ZodNumber>;
        services: z.ZodOptional<z.ZodNumber>;
        defense: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    sectors: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        auto: "auto";
        aerospace: "aerospace";
        semiconductors: "semiconductors";
        "steel-heavy": "steel-heavy";
        "defense-industrial": "defense-industrial";
        "ports-shipping": "ports-shipping";
        "telecom-cyber": "telecom-cyber";
        finance: "finance";
        "housing-construction": "housing-construction";
        "public-infrastructure": "public-infrastructure";
        "energy-oil": "energy-oil";
        "energy-gas": "energy-gas";
        "energy-nuclear": "energy-nuclear";
        "energy-renewables": "energy-renewables";
        agriculture: "agriculture";
        textiles: "textiles";
        mining: "mining";
        chemicals: "chemicals";
        "food-processing": "food-processing";
        "tourism-hospitality": "tourism-hospitality";
        healthcare: "healthcare";
        pharma: "pharma";
        utilities: "utilities";
    }>>>;
    urban: z.ZodOptional<z.ZodNumber>;
    federal: z.ZodOptional<z.ZodNumber>;
    values: z.ZodOptional<z.ZodObject<{
        economicLeftRight: z.ZodOptional<z.ZodNumber>;
        authLibertarian: z.ZodOptional<z.ZodNumber>;
        nationalistGlobalist: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    channels: z.ZodOptional<z.ZodObject<{
        civilRights: z.ZodOptional<z.ZodNumber>;
        immigration: z.ZodOptional<z.ZodNumber>;
        healthAccess: z.ZodOptional<z.ZodNumber>;
        disabilityPrograms: z.ZodOptional<z.ZodNumber>;
        veterans: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    magnitude: z.ZodEnum<{
        moderate: "moderate";
        light: "light";
        heavy: "heavy";
    }>;
    signature: z.ZodString;
    reason: z.ZodString;
}, z.core.$strict>;
export type DomesticSignatureShape = z.infer<typeof DomesticSignatureShape>;
export { MAGNITUDE_STEP, STATE_ROUTE_CAP, STATE_ROUTE_TURN_CAP };
