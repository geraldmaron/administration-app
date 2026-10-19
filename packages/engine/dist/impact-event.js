import { z } from "zod";
import { NationId } from "@admin/world";
export const IMPACT_EVENT_VERSION = 1;
const fraction = z.number().finite().min(0).max(1);
const amount = z.number().finite().nonnegative();
const people = amount.int();
const days = z.number().int().min(1).max(3650);
/** Units are persons, calendar days and USD millions throughout. */
export const ImpactExposure = z.object({
    population: people,
    assetsUSDm: amount,
    dailyOutputUSDm: amount,
    serviceUsers: people,
    careCapacity: people,
    vulnerability: fraction,
    resilience: fraction,
    evidence: z.enum(["site-assessment", "regional-estimate", "country-proxy"]),
    basis: z.string().min(1),
    demographics: z.object({ children: people, adults: people, assessmentRef: z.string().min(1) }).strict().optional(),
}).strict().refine((x) => x.serviceUsers <= x.population, "Service users cannot exceed the exposed population").refine((x) => !x.demographics || x.demographics.children + x.demographics.adults === x.population, "Demographic exposure must sum to the exposed population");
/** Aggregate hazard parameters, not tactical targeting or pathogen-design data. */
export const ImpactMechanism = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("strike"), intensity: fraction, civilianHarmChance: fraction, casualtyRate: fraction, injuryRatio: amount.max(20), damageShare: fraction, recoveryDays: days }).strict(),
    z.object({ kind: z.literal("outbreak"), initialInfected: people, transmissionPerDay: amount.max(2), infectiousDays: days, latentDays: days, fatalityFraction: fraction, severeFraction: fraction, durationDays: days }).strict(),
    z.object({ kind: z.literal("cyber"), initialCompromisedShare: fraction, spreadPerDay: fraction, restorePerDay: fraction, dataExposureShare: fraction, durationDays: days }).strict(),
    z.object({ kind: z.literal("industrial"), hazard: z.enum(["fire", "explosion", "toxic-release"]), intensity: fraction, fatalityRate: fraction, injuryRatio: amount.max(20), damageShare: fraction, displacementShare: fraction, durationDays: days }).strict(),
    z.object({ kind: z.literal("natural"), hazard: z.enum(["earthquake", "flood", "cyclone", "wildfire", "drought", "tornado", "winter-storm", "heat-wave"]), intensity: fraction, fatalityRate: fraction, injuryRatio: amount.max(20), damageShare: fraction, displacementShare: fraction, durationDays: days }).strict(),
    z.object({ kind: z.literal("infrastructure"), service: z.enum(["power", "water", "transport", "communications", "healthcare"]), outageShare: fraction, repairDays: days, dailyExcessMortalityRate: fraction }).strict(),
]);
export const ImpactSpec = z.object({
    version: z.literal(IMPACT_EVENT_VERSION), id: z.string().min(1), nation: NationId,
    title: z.string().min(1), source: z.enum(["action", "condition", "operator", "scenario"]),
    parentId: z.string().optional(),
    site: z.object({ category: z.enum(["military", "residential", "industrial", "education", "healthcare", "transport", "utilities"]), assessmentRef: z.string().min(1), confirmed: z.boolean() }).strict().optional(),
    exposure: ImpactExposure, mechanism: ImpactMechanism,
    accounting: z.object({ population: z.enum(["self", "parent"]), economy: z.enum(["self", "parent"]) }).strict(),
    calibration: z.object({ status: z.enum(["provisional", "calibrated"]), basis: z.string().min(1), sourceRefs: z.array(z.string().min(1)) }).strict(),
}).strict().superRefine((spec, ctx) => {
    if ((spec.accounting.population === "parent" || spec.accounting.economy === "parent") && !spec.parentId)
        ctx.addIssue({ code: "custom", path: ["parentId"], message: "Parent-owned effects require a parent record" });
    if (spec.mechanism.kind === "outbreak" && spec.mechanism.initialInfected > spec.exposure.population)
        ctx.addIssue({ code: "custom", path: ["mechanism", "initialInfected"], message: "Infections exceed exposed population" });
    if (spec.calibration.status === "calibrated" && spec.calibration.sourceRefs.length === 0)
        ctx.addIssue({ code: "custom", path: ["calibration"], message: "Calibration requires source references" });
});
export const NO_IMPACT_RESPONSE = { containment: 0, care: 0, evacuation: 0, repair: 0 };
export const EMPTY_IMPACT_TOTALS = { deaths: 0, childDeaths: 0, injured: 0, infections: 0, displaced: 0, servicePersonDays: 0, assetLossUSDm: 0, outputLossUSDm: 0, compromisedRecords: 0 };
