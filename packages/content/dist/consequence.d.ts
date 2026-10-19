import { z } from "zod";
export declare const ConsequenceInstrument: z.ZodEnum<{
    diplomatic: "diplomatic";
    economic: "economic";
    covert: "covert";
    military: "military";
    assistance: "assistance";
}>;
export type ConsequenceInstrument = z.infer<typeof ConsequenceInstrument>;
export declare const ConsequenceRungBand: z.ZodEnum<{
    low: "low";
    high: "high";
    mid: "mid";
}>;
export type ConsequenceRungBand = z.infer<typeof ConsequenceRungBand>;
export declare const ConsequenceValence: z.ZodEnum<{
    success: "success";
    partial: "partial";
    failure: "failure";
}>;
export type ConsequenceValence = z.infer<typeof ConsequenceValence>;
/**
 * The closed vocabulary of what an authored aftermath may do: move metrics,
 * move a relationship, plant a grudge, put a line in the feed. Nothing here can
 * reach nation stats, the cabinet, or the removal arc — those change the shape
 * of a campaign, and nothing arriving as generated prose gets to do that.
 */
export declare const ConsequenceRecipe: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"metric">;
    deltas: z.ZodObject<{
        treasury: z.ZodOptional<z.ZodNumber>;
        stability: z.ZodOptional<z.ZodNumber>;
        militaryReadiness: z.ZodOptional<z.ZodNumber>;
        standing: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    scaleBySeverity: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"relationship">;
    direction: z.ZodEnum<{
        "actor-to-target": "actor-to-target";
        "target-to-actor": "target-to-actor";
    }>;
    deltas: z.ZodObject<{
        trust: z.ZodOptional<z.ZodNumber>;
        alignment: z.ZodOptional<z.ZodNumber>;
        tension: z.ZodOptional<z.ZodNumber>;
        tradeDependence: z.ZodOptional<z.ZodNumber>;
        militaryThreat: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"grudge">;
    cause: z.ZodString;
    weight: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"feed">;
    headline: z.ZodString;
}, z.core.$strip>], "kind">;
export type ConsequenceRecipe = z.infer<typeof ConsequenceRecipe>;
/**
 * What the board has to look like for a card to be allowed to speak. Every
 * field is optional and every present field must match — which makes a card
 * with no conditions at all the unconditioned floor that guarantees there is
 * always something to say. The coverage audit is what holds a cell to having
 * one.
 */
export declare const ConsequenceConditions: z.ZodObject<{
    scenarioClass: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tone: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        conciliatory: "conciliatory";
        firm: "firm";
        principled: "principled";
        evasive: "evasive";
        coercive: "coercive";
    }>>>;
    flagsSet: z.ZodOptional<z.ZodArray<z.ZodString>>;
    flagsClear: z.ZodOptional<z.ZodArray<z.ZodString>>;
    minTension: z.ZodOptional<z.ZodNumber>;
    maxTrust: z.ZodOptional<z.ZodNumber>;
    intelFalse: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type ConsequenceConditions = z.infer<typeof ConsequenceConditions>;
export declare const ConsequenceDef: z.ZodObject<{
    id: z.ZodString;
    instrument: z.ZodEnum<{
        diplomatic: "diplomatic";
        economic: "economic";
        covert: "covert";
        military: "military";
        assistance: "assistance";
    }>;
    rungBands: z.ZodArray<z.ZodEnum<{
        low: "low";
        high: "high";
        mid: "mid";
    }>>;
    valence: z.ZodEnum<{
        success: "success";
        partial: "partial";
        failure: "failure";
    }>;
    riskAffinity: z.ZodOptional<z.ZodArray<z.ZodString>>;
    conditions: z.ZodOptional<z.ZodObject<{
        scenarioClass: z.ZodOptional<z.ZodArray<z.ZodString>>;
        tone: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            conciliatory: "conciliatory";
            firm: "firm";
            principled: "principled";
            evasive: "evasive";
            coercive: "coercive";
        }>>>;
        flagsSet: z.ZodOptional<z.ZodArray<z.ZodString>>;
        flagsClear: z.ZodOptional<z.ZodArray<z.ZodString>>;
        minTension: z.ZodOptional<z.ZodNumber>;
        maxTrust: z.ZodOptional<z.ZodNumber>;
        intelFalse: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    weight: z.ZodNumber;
    once: z.ZodOptional<z.ZodBoolean>;
    beats: z.ZodArray<z.ZodString>;
    effects: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"metric">;
        deltas: z.ZodObject<{
            treasury: z.ZodOptional<z.ZodNumber>;
            stability: z.ZodOptional<z.ZodNumber>;
            militaryReadiness: z.ZodOptional<z.ZodNumber>;
            standing: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        scaleBySeverity: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"relationship">;
        direction: z.ZodEnum<{
            "actor-to-target": "actor-to-target";
            "target-to-actor": "target-to-actor";
        }>;
        deltas: z.ZodObject<{
            trust: z.ZodOptional<z.ZodNumber>;
            alignment: z.ZodOptional<z.ZodNumber>;
            tension: z.ZodOptional<z.ZodNumber>;
            tradeDependence: z.ZodOptional<z.ZodNumber>;
            militaryThreat: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"grudge">;
        cause: z.ZodString;
        weight: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"feed">;
        headline: z.ZodString;
    }, z.core.$strip>], "kind">>;
    sets: z.ZodOptional<z.ZodArray<z.ZodString>>;
    remembered: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ConsequenceDef = z.infer<typeof ConsequenceDef>;
/** The unit of storage and delivery, mirroring ScenarioPack exactly. */
export declare const ConsequencePack: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    consequences: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        instrument: z.ZodEnum<{
            diplomatic: "diplomatic";
            economic: "economic";
            covert: "covert";
            military: "military";
            assistance: "assistance";
        }>;
        rungBands: z.ZodArray<z.ZodEnum<{
            low: "low";
            high: "high";
            mid: "mid";
        }>>;
        valence: z.ZodEnum<{
            success: "success";
            partial: "partial";
            failure: "failure";
        }>;
        riskAffinity: z.ZodOptional<z.ZodArray<z.ZodString>>;
        conditions: z.ZodOptional<z.ZodObject<{
            scenarioClass: z.ZodOptional<z.ZodArray<z.ZodString>>;
            tone: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                conciliatory: "conciliatory";
                firm: "firm";
                principled: "principled";
                evasive: "evasive";
                coercive: "coercive";
            }>>>;
            flagsSet: z.ZodOptional<z.ZodArray<z.ZodString>>;
            flagsClear: z.ZodOptional<z.ZodArray<z.ZodString>>;
            minTension: z.ZodOptional<z.ZodNumber>;
            maxTrust: z.ZodOptional<z.ZodNumber>;
            intelFalse: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        weight: z.ZodNumber;
        once: z.ZodOptional<z.ZodBoolean>;
        beats: z.ZodArray<z.ZodString>;
        effects: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"metric">;
            deltas: z.ZodObject<{
                treasury: z.ZodOptional<z.ZodNumber>;
                stability: z.ZodOptional<z.ZodNumber>;
                militaryReadiness: z.ZodOptional<z.ZodNumber>;
                standing: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
            scaleBySeverity: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"relationship">;
            direction: z.ZodEnum<{
                "actor-to-target": "actor-to-target";
                "target-to-actor": "target-to-actor";
            }>;
            deltas: z.ZodObject<{
                trust: z.ZodOptional<z.ZodNumber>;
                alignment: z.ZodOptional<z.ZodNumber>;
                tension: z.ZodOptional<z.ZodNumber>;
                tradeDependence: z.ZodOptional<z.ZodNumber>;
                militaryThreat: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"grudge">;
            cause: z.ZodString;
            weight: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"feed">;
            headline: z.ZodString;
        }, z.core.$strip>], "kind">>;
        sets: z.ZodOptional<z.ZodArray<z.ZodString>>;
        remembered: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ConsequencePack = z.infer<typeof ConsequencePack>;
