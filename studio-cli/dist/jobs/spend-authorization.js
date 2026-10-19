import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ProgressLine, SpendAuthorization } from "./job-file.js";
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
export function spendAuthorizationFrom(args, identity) {
    const at = args.indexOf("--authorize-spend");
    if (at === -1)
        return undefined;
    const jobId = args[at + 1];
    if (!jobId || jobId.startsWith("--")) {
        return { error: "--authorize-spend needs the job id it authorizes: --authorize-spend <jobId> --as <name>" };
    }
    const named = args.indexOf("--as");
    const authorizedBy = named === -1 ? identity() : args[named + 1];
    if (!authorizedBy) {
        return { error: "--authorize-spend needs a name: set git config user.name, or pass --as <name>" };
    }
    return { jobId, authorizedBy };
}
/** The authorizations already recorded in this job's journal, in the order they were granted. */
export async function recordedAuthorizations(progressPath) {
    if (!existsSync(progressPath))
        return [];
    const out = [];
    for (const line of (await readFile(progressPath, "utf8")).split("\n")) {
        if (!line.trim())
            continue;
        const parsed = ProgressLine.parse(JSON.parse(line));
        if ("kind" in parsed)
            out.push(parsed);
    }
    return out;
}
async function recordAuthorization(progressPath, authorization) {
    await mkdir(path.dirname(progressPath), { recursive: true });
    await appendFile(progressPath, `${JSON.stringify(authorization)}\n`, "utf8");
}
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
export async function clearSpendGate(input) {
    const { job, requested } = input;
    if (requested) {
        if (requested.jobId !== job.id) {
            return {
                ok: false,
                messages: [
                    `--authorize-spend names "${requested.jobId}", but this run is "${job.id}" — nothing was run and nothing was spent.`,
                ],
            };
        }
        const authorization = SpendAuthorization.parse({
            kind: "spend-authorization",
            jobId: job.id,
            authorizedBy: requested.authorizedBy,
            at: new Date().toISOString(),
            estimatedSpendUsd: input.estimatedSpendUsd,
        });
        await recordAuthorization(input.progressPath, authorization);
        return {
            ok: true,
            notices: [
                `${job.id}: pre-authorized by ${authorization.authorizedBy} for an estimated $${authorization.estimatedSpendUsd.toFixed(2)} — recorded in the journal before the first request.`,
            ],
        };
    }
    const existing = await recordedAuthorizations(input.progressPath);
    const forThisJob = existing.filter((entry) => entry.jobId === job.id);
    const latest = forThisJob[forThisJob.length - 1];
    if (latest) {
        return {
            ok: true,
            notices: [`${job.id}: resuming under the authorization ${latest.authorizedBy} recorded at ${latest.at}.`],
        };
    }
    if (!input.interactive) {
        return {
            ok: false,
            messages: [
                `${job.id}: refusing to spend — this run has no terminal to confirm at and no recorded authorization.`,
                `Re-run it as \`--authorize-spend ${job.id} --as <name>\`, which records who approved it before anything is spent.`,
            ],
        };
    }
    if (await input.confirm())
        return { ok: true, notices: [] };
    return { ok: false, messages: ["aborted — job id did not match, nothing was run and nothing was spent"] };
}
