import { z } from "zod";
export declare const Grudge: z.ZodObject<{
    cause: z.ZodString;
    weight: z.ZodNumber;
    createdTurn: z.ZodNumber;
    decayRate: z.ZodNumber;
}, z.core.$strip>;
export type Grudge = z.infer<typeof Grudge>;
export declare const RelationshipEvent: z.ZodObject<{
    turn: z.ZodNumber;
    kind: z.ZodString;
    description: z.ZodString;
}, z.core.$strip>;
export type RelationshipEvent = z.infer<typeof RelationshipEvent>;
export declare const Relationship: z.ZodObject<{
    from: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    to: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    trust: z.ZodNumber;
    alignment: z.ZodNumber;
    tension: z.ZodNumber;
    tradeDependence: z.ZodNumber;
    militaryThreat: z.ZodNumber;
    treaties: z.ZodArray<z.core.$ZodBranded<z.ZodString, "TreatyId", "out">>;
    grudges: z.ZodArray<z.ZodObject<{
        cause: z.ZodString;
        weight: z.ZodNumber;
        createdTurn: z.ZodNumber;
        decayRate: z.ZodNumber;
    }, z.core.$strip>>;
    history: z.ZodArray<z.ZodObject<{
        turn: z.ZodNumber;
        kind: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Relationship = z.infer<typeof Relationship>;
