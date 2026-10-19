import { type UnitDesignationConstraint } from "@admin/world";
import { z } from "zod";
import { ConsequenceInstrument, ConsequenceRungBand, ConsequenceValence } from "./consequence.js";
/**
 * The only facts a step may name.
 *
 * Each one has a known filler at selection time — the two nations from the
 * resolution request, a generated unit designation, a name-bank person. A slot
 * with no generator behind it would be a line that can never be completed, so
 * the list is closed and grows only when a filler ships with it.
 */
export declare const ResolutionParticular: z.ZodEnum<{
    target: "target";
    unit: "unit";
    person: "person";
    actor: "actor";
}>;
export type ResolutionParticular = z.infer<typeof ResolutionParticular>;
/** What a step is, in the grammar of an act being carried out. */
export declare const ResolutionStepKind: z.ZodEnum<{
    hold: "hold";
    "order-given": "order-given";
    movement: "movement";
    contact: "contact";
    "named-unit-attack": "named-unit-attack";
    loss: "loss";
    rescue: "rescue";
    "stand-down": "stand-down";
    "report-back": "report-back";
}>;
export type ResolutionStepKind = z.infer<typeof ResolutionStepKind>;
/**
 * A step's own turn, one of four settled values.
 *
 * `held` is a step where nothing moved either way — an order read out, a column
 * on the road. It is not suspense; it is the part of the act with no local
 * result yet.
 */
export declare const ResolutionStepOutcome: z.ZodEnum<{
    held: "held";
    cost: "cost";
    gain: "gain";
    mixed: "mixed";
}>;
export type ResolutionStepOutcome = z.infer<typeof ResolutionStepOutcome>;
/**
 * The last step's outcome, per valence the key carries.
 *
 * This is where outcome honesty stops being an editorial note. A sequence drawn
 * for a failure ends on a cost, and there is no way to author one that ends on
 * a gain, so a sequence cannot end by claiming a result the packet then denies.
 */
export declare const TERMINAL_OUTCOME: Readonly<Record<z.infer<typeof ConsequenceValence>, ResolutionStepOutcome>>;
/**
 * What the step's verbs need the {{unit}} draw to be.
 *
 * Without this a line is written for one kind of formation and filled from all
 * six branches at unit scale, so "is wheels up ahead of the weather" comes back
 * against an undersea squadron five times in six and "puts two battalions
 * across" comes back against a battalion. Prose can be written down to what six
 * branches have in common, and where it can be it should be; where the act
 * itself is aviation or a corps-scale maneuver, no neutral phrasing exists and
 * the constraint has to travel with the line instead.
 */
export declare const UnitAffinity: z.ZodObject<{
    branches: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        army: "army";
        navy: "navy";
        air: "air";
        marines: "marines";
        space: "space";
        cyber: "cyber";
    }>>>;
    echelon: z.ZodOptional<z.ZodEnum<{
        unit: "unit";
        formation: "formation";
    }>>;
}, z.core.$strict>;
export type UnitAffinity = z.infer<typeof UnitAffinity>;
export declare const ResolutionBeat: z.ZodObject<{
    kind: z.ZodEnum<{
        hold: "hold";
        "order-given": "order-given";
        movement: "movement";
        contact: "contact";
        "named-unit-attack": "named-unit-attack";
        loss: "loss";
        rescue: "rescue";
        "stand-down": "stand-down";
        "report-back": "report-back";
    }>;
    line: z.ZodString;
    outcome: z.ZodEnum<{
        held: "held";
        cost: "cost";
        gain: "gain";
        mixed: "mixed";
    }>;
    particulars: z.ZodArray<z.ZodEnum<{
        target: "target";
        unit: "unit";
        person: "person";
        actor: "actor";
    }>>;
    unitAffinity: z.ZodOptional<z.ZodObject<{
        branches: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            army: "army";
            navy: "navy";
            air: "air";
            marines: "marines";
            space: "space";
            cyber: "cyber";
        }>>>;
        echelon: z.ZodOptional<z.ZodEnum<{
            unit: "unit";
            formation: "formation";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ResolutionBeat = z.infer<typeof ResolutionBeat>;
declare const SequenceShape: z.ZodObject<{
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
    weight: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            hold: "hold";
            "order-given": "order-given";
            movement: "movement";
            contact: "contact";
            "named-unit-attack": "named-unit-attack";
            loss: "loss";
            rescue: "rescue";
            "stand-down": "stand-down";
            "report-back": "report-back";
        }>;
        line: z.ZodString;
        outcome: z.ZodEnum<{
            held: "held";
            cost: "cost";
            gain: "gain";
            mixed: "mixed";
        }>;
        particulars: z.ZodArray<z.ZodEnum<{
            target: "target";
            unit: "unit";
            person: "person";
            actor: "actor";
        }>>;
        unitAffinity: z.ZodOptional<z.ZodObject<{
            branches: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                army: "army";
                navy: "navy";
                air: "air";
                marines: "marines";
                space: "space";
                cyber: "cyber";
            }>>>;
            echelon: z.ZodOptional<z.ZodEnum<{
                unit: "unit";
                formation: "formation";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type SequenceShape = z.infer<typeof SequenceShape>;
/**
 * The one constraint the sequence's {{unit}} draw has to satisfy.
 *
 * A sequence names one formation however many steps mention it, so the step
 * affinities are merged rather than applied separately: branches intersect, and
 * a single step asking for corps scale sets the scale for the sequence.
 */
export declare function unitConstraintOf(def: SequenceShape): UnitDesignationConstraint;
export declare const ResolutionSequenceDef: z.ZodObject<{
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
    weight: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            hold: "hold";
            "order-given": "order-given";
            movement: "movement";
            contact: "contact";
            "named-unit-attack": "named-unit-attack";
            loss: "loss";
            rescue: "rescue";
            "stand-down": "stand-down";
            "report-back": "report-back";
        }>;
        line: z.ZodString;
        outcome: z.ZodEnum<{
            held: "held";
            cost: "cost";
            gain: "gain";
            mixed: "mixed";
        }>;
        particulars: z.ZodArray<z.ZodEnum<{
            target: "target";
            unit: "unit";
            person: "person";
            actor: "actor";
        }>>;
        unitAffinity: z.ZodOptional<z.ZodObject<{
            branches: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                army: "army";
                navy: "navy";
                air: "air";
                marines: "marines";
                space: "space";
                cyber: "cyber";
            }>>>;
            echelon: z.ZodOptional<z.ZodEnum<{
                unit: "unit";
                formation: "formation";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ResolutionSequenceDef = z.infer<typeof ResolutionSequenceDef>;
/** The unit of storage and delivery, mirroring ConsequencePack exactly. */
export declare const ResolutionSequencePack: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
    sequences: z.ZodArray<z.ZodObject<{
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
        weight: z.ZodNumber;
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                hold: "hold";
                "order-given": "order-given";
                movement: "movement";
                contact: "contact";
                "named-unit-attack": "named-unit-attack";
                loss: "loss";
                rescue: "rescue";
                "stand-down": "stand-down";
                "report-back": "report-back";
            }>;
            line: z.ZodString;
            outcome: z.ZodEnum<{
                held: "held";
                cost: "cost";
                gain: "gain";
                mixed: "mixed";
            }>;
            particulars: z.ZodArray<z.ZodEnum<{
                target: "target";
                unit: "unit";
                person: "person";
                actor: "actor";
            }>>;
            unitAffinity: z.ZodOptional<z.ZodObject<{
                branches: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    army: "army";
                    navy: "navy";
                    air: "air";
                    marines: "marines";
                    space: "space";
                    cyber: "cyber";
                }>>>;
                echelon: z.ZodOptional<z.ZodEnum<{
                    unit: "unit";
                    formation: "formation";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ResolutionSequencePack = z.infer<typeof ResolutionSequencePack>;
/**
 * The tuple a resolution produces and a sequence is authored against.
 *
 * `riskId` is present only on a failure, and only when the sequence claims a
 * branch; a failure sequence without one is the floor for its instrument, so
 * there is always something to play.
 */
export type ResolutionSequenceKey = {
    readonly instrument: z.infer<typeof ConsequenceInstrument>;
    readonly rungBand: z.infer<typeof ConsequenceRungBand>;
    readonly valence: z.infer<typeof ConsequenceValence>;
    readonly riskId?: string;
};
/** The canonical string form: one key, one stable seed, one deterministic draw. */
export declare function resolutionSequenceKey(key: ResolutionSequenceKey): string;
/** Every key a document answers to, which is its rung bands crossed with its branches. */
export declare function sequenceKeysOf(def: ResolutionSequenceDef): readonly ResolutionSequenceKey[];
export {};
