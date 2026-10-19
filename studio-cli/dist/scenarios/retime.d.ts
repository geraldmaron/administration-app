import { z } from "zod";
import { type ScenarioDef } from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
/**
 * A scenario needs a retime pass when its commit-time copy — the fields on
 * screen the instant the player commits — carries an error-tier finding. This
 * mirrors the baseline's own corpus rows exactly: `scenario-audit-time-baseline.test.ts`
 * lists the same set, read from the bake rather than the live shards.
 */
export declare function needsRetime(def: ScenarioDef): boolean;
/**
 * Scenarios worth a retime job, narrowed by class (`--shard`, matching the
 * corpus's own shard-per-class convention) so a batch can be drafted and
 * reviewed one class at a time and a reviewer has one shard's worth of prose
 * to compare repetition against.
 */
export declare function selectRetimeCandidates(defs: readonly ScenarioDef[], shard?: string): readonly ScenarioDef[];
/** Every flagged commit-time field on a scenario, with the phrase that tripped it. */
export type FlaggedField = {
    readonly label: string;
    readonly phrase: string;
    readonly severity: "error" | "warning";
};
export declare function flaggedFieldsOf(def: ScenarioDef): readonly FlaggedField[];
/**
 * The brief for one scenario's retime pass: what is flagged and why, the
 * doctrine and the rewrite rules in full, and the reference set as the bar —
 * the same exemplars `buildUpgradeBrief` quotes, so a rewritten reference set
 * (R0) is what every later retime brief shows.
 */
export declare function buildRetimeBrief(original: ScenarioDef): string;
/**
 * One item per scenario, deliberately, same reasoning as `upgradeJob`: a
 * short batch must not drop a shipped scenario from the run, and the journal
 * names exactly which scenarios were retimed.
 */
export declare function retimeJob(id: string, driver: JobFile["driver"], originals: readonly ScenarioDef[]): JobFile;
/** Content-word 3-grams in one passage, unique — a repeated run inside one line counts once. */
export declare function passageTrigrams(text: string): ReadonlySet<string>;
export declare const NgramBaseline: z.ZodObject<{
    totalPassages: z.ZodNumber;
    grams: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, z.core.$strip>;
export type NgramBaseline = z.infer<typeof NgramBaseline>;
/**
 * The corpus-wide 3-gram baseline over every commit-time passage: how many
 * passages carry each gram. Taken once, before any rewrite, and stored beside
 * the wave's evidence — the after figure is compared against the same
 * tokenizer over the same set of grams, never re-measured with a different one.
 */
export declare function measureNgramBaseline(defs: readonly ScenarioDef[]): NgramBaseline;
/** One field a retime job item actually changed, before and after. */
export type RetimeChange = {
    readonly scenarioId: string;
    readonly label: string;
    readonly before: string;
    readonly after: string;
};
/** The commit-time fields a revision touched, by comparing every field's text. */
export declare function collectRetimeChanges(original: ScenarioDef, revised: ScenarioDef): readonly RetimeChange[];
export type CeilingViolation = {
    readonly rule: 1 | 2 | 3;
    readonly message: string;
};
/** §8 rule 4, informational here (the gate already refuses it for routine and serious): critical scenarios that reached for a countdown phrase. */
export declare function criticalCountdownUses(changes: readonly RetimeChange[], severityOf: (scenarioId: string) => string | undefined): readonly string[];
export type RetimeReport = {
    readonly violations: readonly CeilingViolation[];
    readonly changeCount: number;
};
/** The whole §8 ceiling, over one batch's changes against the wave's before-baseline. */
export declare function evaluateRetimeCeiling(changes: readonly RetimeChange[], baseline: NgramBaseline): RetimeReport;
