import { SpendAuthorization, type JobFile } from "./job-file.js";
/**
 * The pre-authorization a run was invoked with, before the job is known well
 * enough to price it. The job id is carried rather than assumed so the flag can
 * be checked against the job actually loaded — a scheduled invocation that
 * drifts onto a different job is exactly the case a bare `--yes` would wave
 * through.
 */
export type SpendAuthorizationRequest = {
    readonly jobId: string;
    readonly authorizedBy: string;
};
/**
 * Read `--authorize-spend <jobId>` off the argv, with the authorizer's name
 * from `--as <name>` or the repo's git identity.
 *
 * Never a prompt, on the same reasoning the owner-review flag is never a
 * prompt: a question asked at this terminal is answered by whatever is driving
 * it, which on this project is usually an agent, and an agent approving spend
 * in the owner's name is the failure the spend gate exists to prevent. The
 * authorization has to arrive from outside the run or not at all.
 */
export declare function spendAuthorizationFrom(args: readonly string[], identity: () => string | undefined): SpendAuthorizationRequest | {
    readonly error: string;
} | undefined;
/** The authorizations already recorded in this job's journal, in the order they were granted. */
export declare function recordedAuthorizations(progressPath: string): Promise<readonly SpendAuthorization[]>;
export type SpendGateOutcome = {
    readonly ok: true;
    readonly notices: readonly string[];
} | {
    readonly ok: false;
    readonly messages: readonly string[];
};
export type SpendGateInput = {
    readonly job: JobFile;
    readonly progressPath: string;
    /** What this run is expected to cost at worst, in USD — recorded with the authorization it is granted against. */
    readonly estimatedSpendUsd: number;
    /** The pre-authorization this invocation carries, if any. */
    readonly requested?: SpendAuthorizationRequest | undefined;
    /** Whether a human is actually at this terminal. False means nobody can answer a prompt. */
    readonly interactive: boolean;
    /** The typed-confirmation path, unchanged: it stays the default for an attended run. */
    readonly confirm: () => Promise<boolean>;
};
/**
 * Decide whether a run against a keyed, billed API may proceed.
 *
 * Three ways past, in order of how much they leave behind. A fresh
 * pre-authorization names who approved this job and what they were told it
 * would cost, and is journaled before a single request goes out. A resumed run
 * proceeds on the authorization already in its journal, which is what makes a
 * cron-driven job safe to re-invoke: the permission was granted once, by a
 * person, against this job id. Failing both, an attended run falls back to the
 * typed confirmation it always used.
 *
 * An unattended run with neither is refused rather than prompted. A prompt with
 * nobody to read it is not a gate; it is a hang, and the shell that eventually
 * kills it reports a spend failure that never had anything to do with money.
 */
export declare function clearSpendGate(input: SpendGateInput): Promise<SpendGateOutcome>;
