#!/usr/bin/env node
import { type ScenarioFinding } from "@admin/content";
import { type OpenRouterFetch } from "./jobs/drivers/openrouter-driver.js";
import { JobFile } from "./jobs/job-file.js";
import { type SpendAuthorizationRequest } from "./jobs/spend-authorization.js";
import { cmdRetimeBaseline, cmdRetimeJob, cmdRetimeReport, cmdUpgradeJob, cmdUpgradePublish } from "./scenarios/revision-commands.js";
import { type ScenarioBriefSpec } from "./scenarios/brief.js";
import { PersonaId } from "./personas/index.js";
import { type ConsequenceBriefSpec } from "./consequences/brief.js";
import { type HarnessCorpus } from "./corpus/harness-corpus.js";
import type { DocumentValidator } from "./jobs/drivers/session-driver.js";
export { cmdRetimeBaseline, cmdRetimeJob, cmdRetimeReport, cmdUpgradeJob, cmdUpgradePublish };
export type OpenRouterRunDeps = {
    readonly env?: NodeJS.ProcessEnv;
    readonly fetchImpl?: OpenRouterFetch;
    readonly readLine?: (prompt: string) => Promise<string>;
    readonly jobsDir?: string;
    readonly ledgerDir?: string;
    /** A pre-authorization off the command line, for a run with nobody at the keyboard. */
    readonly authorization?: SpendAuthorizationRequest;
    /** Whether anyone can answer the typed confirmation. Defaults to whether stdin is a terminal. */
    readonly interactive?: boolean;
    /** Put items the journal calls done back through the gate. Refused on any driver that would pay to regenerate them. */
    readonly recheck?: boolean;
};
export declare function parseCell(cell: string): ScenarioBriefSpec;
export declare function cmdJob(id: string, cells: readonly string[], driver: JobFile["driver"], persona?: PersonaId): Promise<void>;
export declare function validatorFor(kind: string, corpus?: HarnessCorpus): DocumentValidator;
export declare function cmdRun(id: string, deps?: OpenRouterRunDeps): Promise<number>;
export declare function parseConsequenceCell(cell: string): ConsequenceBriefSpec;
export declare function cmdConsequenceJob(id: string, cells: readonly string[], driver: JobFile["driver"], persona?: PersonaId): Promise<void>;
/**
 * The name git will put on the commit this batch lands in.
 *
 * Deliberately not a prompt. An owner authorization is the one place a human
 * overrides a machine check, and a prompt in a terminal is answered by whatever
 * is driving that terminal — which, on this project, is usually an agent. An
 * agent typing the owner's name into an exception is precisely the failure the
 * independence check exists to prevent, so the name is read from the identity
 * that is already on the hook for the commit rather than from the keyboard.
 */
export declare function gitIdentity(): string | undefined;
/**
 * `run`, in every group that has one: the job id, plus the pre-authorization an
 * unattended invocation carries. Shared so a scheduled portrait job and a
 * scheduled scenario job are gated identically — the money is the same money.
 */
export declare function cmdRunFrom(rest: readonly string[], usage: string): Promise<number>;
/** The production dashboard: the whole matrix, with the depth a player draws from. */
export declare function cmdCoverage(corpusRoot?: string): Promise<number>;
export type UnionAuditOutcome = {
    readonly newErrors: readonly ScenarioFinding[];
    readonly preExistingErrors: readonly ScenarioFinding[];
    readonly warnings: number;
};
/** Publish a finished batch into the sharded corpus, and report what the corpus holds. */
export declare function cmdCorpus(command: string | undefined, rest: readonly string[]): Promise<number>;
/** The aftermath group: the scenario group's verbs, one content type over, plus the matrix. */
export declare function cmdConsequences(command: string | undefined, rest: readonly string[]): Promise<number>;
export declare function main(argv: readonly string[]): Promise<number>;
