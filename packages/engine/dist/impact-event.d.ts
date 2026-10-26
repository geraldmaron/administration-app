import type { CausalId } from "./causality.js";
import { z } from "zod";
import type { GameDate } from "./state.js";
export declare const IMPACT_EVENT_VERSION = 1;
/** Units are persons, calendar days and USD millions throughout. */
export declare const ImpactExposure: z.ZodObject<{
    population: z.ZodNumber;
    assetsUSDm: z.ZodNumber;
    dailyOutputUSDm: z.ZodNumber;
    serviceUsers: z.ZodNumber;
    careCapacity: z.ZodNumber;
    vulnerability: z.ZodNumber;
    resilience: z.ZodNumber;
    evidence: z.ZodEnum<{
        "site-assessment": "site-assessment";
        "regional-estimate": "regional-estimate";
        "country-proxy": "country-proxy";
    }>;
    basis: z.ZodString;
    demographics: z.ZodOptional<z.ZodObject<{
        children: z.ZodNumber;
        adults: z.ZodNumber;
        assessmentRef: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ImpactExposure = z.infer<typeof ImpactExposure>;
/** Aggregate hazard parameters, not tactical targeting or pathogen-design data. */
export declare const ImpactMechanism: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"strike">;
    intensity: z.ZodNumber;
    civilianHarmChance: z.ZodNumber;
    casualtyRate: z.ZodNumber;
    injuryRatio: z.ZodNumber;
    damageShare: z.ZodNumber;
    recoveryDays: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"outbreak">;
    initialInfected: z.ZodNumber;
    transmissionPerDay: z.ZodNumber;
    infectiousDays: z.ZodNumber;
    latentDays: z.ZodNumber;
    fatalityFraction: z.ZodNumber;
    severeFraction: z.ZodNumber;
    durationDays: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"cyber">;
    initialCompromisedShare: z.ZodNumber;
    spreadPerDay: z.ZodNumber;
    restorePerDay: z.ZodNumber;
    dataExposureShare: z.ZodNumber;
    durationDays: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"industrial">;
    hazard: z.ZodEnum<{
        fire: "fire";
        explosion: "explosion";
        "toxic-release": "toxic-release";
    }>;
    intensity: z.ZodNumber;
    fatalityRate: z.ZodNumber;
    injuryRatio: z.ZodNumber;
    damageShare: z.ZodNumber;
    displacementShare: z.ZodNumber;
    durationDays: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"natural">;
    hazard: z.ZodEnum<{
        earthquake: "earthquake";
        flood: "flood";
        drought: "drought";
        cyclone: "cyclone";
        wildfire: "wildfire";
        tornado: "tornado";
        "winter-storm": "winter-storm";
        "heat-wave": "heat-wave";
    }>;
    intensity: z.ZodNumber;
    fatalityRate: z.ZodNumber;
    injuryRatio: z.ZodNumber;
    damageShare: z.ZodNumber;
    displacementShare: z.ZodNumber;
    durationDays: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"infrastructure">;
    service: z.ZodEnum<{
        healthcare: "healthcare";
        transport: "transport";
        power: "power";
        water: "water";
        communications: "communications";
    }>;
    outageShare: z.ZodNumber;
    repairDays: z.ZodNumber;
    dailyExcessMortalityRate: z.ZodNumber;
}, z.core.$strict>], "kind">;
export type ImpactMechanism = z.infer<typeof ImpactMechanism>;
export declare const ImpactSpec: z.ZodObject<{
    version: z.ZodLiteral<1>;
    id: z.ZodString;
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    title: z.ZodString;
    source: z.ZodEnum<{
        action: "action";
        operator: "operator";
        scenario: "scenario";
        condition: "condition";
    }>;
    parentId: z.ZodOptional<z.ZodString>;
    site: z.ZodOptional<z.ZodObject<{
        category: z.ZodEnum<{
            healthcare: "healthcare";
            utilities: "utilities";
            military: "military";
            industrial: "industrial";
            residential: "residential";
            education: "education";
            transport: "transport";
        }>;
        assessmentRef: z.ZodString;
        confirmed: z.ZodBoolean;
    }, z.core.$strict>>;
    exposure: z.ZodObject<{
        population: z.ZodNumber;
        assetsUSDm: z.ZodNumber;
        dailyOutputUSDm: z.ZodNumber;
        serviceUsers: z.ZodNumber;
        careCapacity: z.ZodNumber;
        vulnerability: z.ZodNumber;
        resilience: z.ZodNumber;
        evidence: z.ZodEnum<{
            "site-assessment": "site-assessment";
            "regional-estimate": "regional-estimate";
            "country-proxy": "country-proxy";
        }>;
        basis: z.ZodString;
        demographics: z.ZodOptional<z.ZodObject<{
            children: z.ZodNumber;
            adults: z.ZodNumber;
            assessmentRef: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    mechanism: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"strike">;
        intensity: z.ZodNumber;
        civilianHarmChance: z.ZodNumber;
        casualtyRate: z.ZodNumber;
        injuryRatio: z.ZodNumber;
        damageShare: z.ZodNumber;
        recoveryDays: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"outbreak">;
        initialInfected: z.ZodNumber;
        transmissionPerDay: z.ZodNumber;
        infectiousDays: z.ZodNumber;
        latentDays: z.ZodNumber;
        fatalityFraction: z.ZodNumber;
        severeFraction: z.ZodNumber;
        durationDays: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"cyber">;
        initialCompromisedShare: z.ZodNumber;
        spreadPerDay: z.ZodNumber;
        restorePerDay: z.ZodNumber;
        dataExposureShare: z.ZodNumber;
        durationDays: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"industrial">;
        hazard: z.ZodEnum<{
            fire: "fire";
            explosion: "explosion";
            "toxic-release": "toxic-release";
        }>;
        intensity: z.ZodNumber;
        fatalityRate: z.ZodNumber;
        injuryRatio: z.ZodNumber;
        damageShare: z.ZodNumber;
        displacementShare: z.ZodNumber;
        durationDays: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"natural">;
        hazard: z.ZodEnum<{
            earthquake: "earthquake";
            flood: "flood";
            drought: "drought";
            cyclone: "cyclone";
            wildfire: "wildfire";
            tornado: "tornado";
            "winter-storm": "winter-storm";
            "heat-wave": "heat-wave";
        }>;
        intensity: z.ZodNumber;
        fatalityRate: z.ZodNumber;
        injuryRatio: z.ZodNumber;
        damageShare: z.ZodNumber;
        displacementShare: z.ZodNumber;
        durationDays: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"infrastructure">;
        service: z.ZodEnum<{
            healthcare: "healthcare";
            transport: "transport";
            power: "power";
            water: "water";
            communications: "communications";
        }>;
        outageShare: z.ZodNumber;
        repairDays: z.ZodNumber;
        dailyExcessMortalityRate: z.ZodNumber;
    }, z.core.$strict>], "kind">;
    accounting: z.ZodObject<{
        population: z.ZodEnum<{
            self: "self";
            parent: "parent";
        }>;
        economy: z.ZodEnum<{
            self: "self";
            parent: "parent";
        }>;
    }, z.core.$strict>;
    calibration: z.ZodObject<{
        status: z.ZodEnum<{
            provisional: "provisional";
            calibrated: "calibrated";
        }>;
        basis: z.ZodString;
        sourceRefs: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type ImpactSpec = z.infer<typeof ImpactSpec>;
export type ImpactResponse = {
    readonly containment: number;
    readonly care: number;
    readonly evacuation: number;
    readonly repair: number;
};
export declare const NO_IMPACT_RESPONSE: ImpactResponse;
export type ImpactTotals = {
    readonly deaths: number;
    readonly childDeaths: number;
    readonly injured: number;
    readonly infections: number;
    readonly displaced: number;
    readonly servicePersonDays: number;
    readonly assetLossUSDm: number;
    readonly outputLossUSDm: number;
    readonly compromisedRecords: number;
};
export declare const EMPTY_IMPACT_TOTALS: ImpactTotals;
export type ImpactRange = {
    readonly low: number;
    readonly high: number;
};
export type ImpactReport = {
    readonly date: GameDate;
    readonly revision: number;
    readonly confidence: "low" | "medium" | "high";
    readonly stage: "initial" | "update" | "final";
    readonly deaths: ImpactRange;
    readonly childDeaths?: ImpactRange;
    readonly injured: ImpactRange;
    readonly infections: ImpactRange;
    readonly displaced: ImpactRange;
    readonly lossUSDm: ImpactRange;
    readonly serviceDisruption: ImpactRange;
    readonly compromisedRecords: ImpactRange;
    readonly basis: string;
};
export type ImpactState = {
    readonly susceptible: number;
    readonly exposed: number;
    readonly infected: number;
    readonly recovered: number;
    readonly careDemand: number;
    readonly disruptedShare: number;
    readonly displacedNow: number;
};
export type ImpactEvent = {
    readonly causedBy?: CausalId;
    readonly spec: ImpactSpec;
    readonly revision: number;
    readonly started: GameDate;
    readonly lastUpdated: GameDate;
    readonly elapsedDays: number;
    readonly status: "active" | "recovering" | "resolved";
    readonly state: ImpactState;
    readonly totals: ImpactTotals;
    /** Reporting is bounded; cumulative totals remain independent of retained reports. */
    readonly reports: readonly ImpactReport[];
};
export type ImpactEventEffect = {
    readonly kind: "impactEvent";
    readonly event: ImpactEvent;
    readonly expectedRevision: number | null;
};
