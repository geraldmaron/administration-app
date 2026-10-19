import { z } from "zod";
import { type Campaign, type Effect, type StorySubject } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import type { ResolvedLocus } from "./scenario-locus.js";
export declare const ScenarioSubjectSlot: z.ZodDiscriminatedUnion<[z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"entity">;
    entity: z.ZodEnum<{
        [x: string]: string;
    }>;
}, z.core.$strict>, z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"governor">;
}, z.core.$strict>, z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"mayor">;
}, z.core.$strict>, z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"member">;
    chamber: z.ZodEnum<{
        house: "house";
        senate: "senate";
    }>;
    scope: z.ZodEnum<{
        state: "state";
        nation: "nation";
    }>;
}, z.core.$strict>, z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"institution">;
    institution: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    key: z.ZodString;
    source: z.ZodLiteral<"inherit">;
    scenario: z.ZodString;
    slot: z.ZodString;
}, z.core.$strict>], "source">;
/** Absence means the scenario cannot honestly be cast, never an invented substitute. */
export declare function bindStorySubjects(campaign: Campaign, def: ScenarioDef, locus: ResolvedLocus | undefined, originCase?: string): readonly StorySubject[] | undefined;
/** Existing narrative assets keep their location across unrelated callbacks too. */
export declare function priorSubjectPlace(campaign: Campaign, def: ScenarioDef): {
    settlement?: (string & z.core.$brand<"SettlementId">) | undefined;
    city?: (string & z.core.$brand<"CityId">) | undefined;
    state: "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "DC" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";
} | undefined;
/** The selector can reject an unavailable predecessor without loading/rendering a body. */
export declare function subjectRequirementsMet(campaign: Campaign, slots?: readonly z.infer<typeof ScenarioSubjectSlot>[]): boolean;
/** Materialize a city's existing fictional officeholder through the engine's person effect. */
export declare function storySubjectEffects(campaign: Campaign, cast: {
    readonly locus?: ResolvedLocus;
    readonly script: {
        readonly subjects?: readonly StorySubject[];
    };
}): readonly Effect[];
