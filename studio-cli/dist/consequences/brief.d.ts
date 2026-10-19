import { ConsequenceInstrument, ConsequenceRungBand, ConsequenceValence } from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
import { type PersonaId } from "../personas/index.js";
export type ConsequenceBriefSpec = {
    readonly instrument: ConsequenceInstrument;
    readonly band: ConsequenceRungBand;
    readonly valence: ConsequenceValence;
    readonly steer?: string;
    readonly persona?: PersonaId;
    readonly count: number;
};
export declare function personaForInstrument(instrument: ConsequenceInstrument): PersonaId;
/** Per-cell override first, then the job-level flag, then the instrument map. */
export declare function resolveConsequencePersona(cell: ConsequenceBriefSpec, jobPersona?: PersonaId): PersonaId;
export declare function buildConsequenceBrief(spec: ConsequenceBriefSpec): string;
/**
 * A consequence batch as a job file the existing runner executes: one item per
 * cell, resumable, spend-journaled — the same discipline every other generation
 * job runs under.
 *
 * The resolved director is written into the payload rather than recomputed
 * later, for the same reason a scenario batch does it: the job file is the
 * durable record of what a batch was generated under, and a routing map edited
 * between the run and the review would otherwise rewrite that history.
 */
export declare function consequenceJob(id: string, driver: JobFile["driver"], cells: readonly ConsequenceBriefSpec[], jobPersona?: PersonaId): JobFile;
/** The procedure a session reads in the work directory, in the aftermath layer's terms. */
export declare const CONSEQUENCE_README = "# Consequence generation work directory\n\nEach `*.brief.md` in this folder is one cell of the aftermath matrix to write. For each brief:\n\n1. Read the brief in full. It contains the JSON contract, the hard gates, the craft\n   rules, and two shipped exemplar cards that set the quality bar.\n2. Write your cards as a JSON array of ConsequenceDef objects to the matching\n   `<item>.out.json` (same basename as the brief).\n3. Re-run the job (`studio consequences run <jobId>`). Every output is validated:\n   a clean item is journaled done; a rejected one gets a `<item>.findings.json`\n   naming each defect \u2014 fix the output and run again. Items already done are\n   never re-checked or re-spent.\n\nThe validator is the same gate every generated card faces regardless of who or\nwhat wrote it. There is no path around it.\n";
