import { z } from "zod";
export declare const Chokepoint: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "ChokepointId", "out">;
    name: z.ZodString;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    connects: z.ZodArray<z.core.$ZodBranded<z.ZodString, "RegionId", "out">>;
    globalTrafficShare: z.ZodNumber;
    closableByOneState: z.ZodBoolean;
}, z.core.$strip>;
export type Chokepoint = z.infer<typeof Chokepoint>;
export declare const ChokepointDependence: z.ZodObject<{
    chokepoint: z.core.$ZodBranded<z.ZodString, "ChokepointId", "out">;
    weight: z.ZodNumber;
}, z.core.$strip>;
export type ChokepointDependence = z.infer<typeof ChokepointDependence>;
export declare const NationGeography: z.ZodObject<{
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    neighbors: z.ZodArray<z.core.$ZodBranded<z.ZodString, "NationId", "out">>;
    chokepointDependence: z.ZodArray<z.ZodObject<{
        chokepoint: z.core.$ZodBranded<z.ZodString, "ChokepointId", "out">;
        weight: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type NationGeography = z.infer<typeof NationGeography>;
