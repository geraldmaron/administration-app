import { z } from "zod";
// A generation job is a file under content/jobs/, not a queue row —
// any driver can pick it up, and progress/spend journal to disk so an
// interrupted run resumes without re-spending completed items.
export const JobFile = z.object({
    id: z.string().min(1),
    // What the job produces, which is what decides the gate its output must
    // clear (jobs/gate.ts). A kind with no registered gate cannot publish.
    kind: z.string().min(1),
    driver: z.enum(["session", "openrouter", "image", "mock", "replicate"]),
    items: z
        .array(z.object({ id: z.string().min(1), payload: z.record(z.string(), z.unknown()), stage: z.string().min(1).optional() }))
        .min(1),
});
export const ProgressEntry = z.object({
    itemId: z.string().min(1),
    status: z.enum(["done", "failed"]),
    spendUsd: z.number().nonnegative(),
    timestamp: z.string(),
    // Why a failed item failed, so "reported rather than silently dropped"
    // means something a human can act on, not just an id with no reason.
    error: z.string().optional(),
    // What produced the item (a model id, for a generation driver). Optional
    // because journals written before this field existed must still parse —
    // their entries are readable, they just cannot say what made them.
    producer: z.string().optional(),
});
/**
 * The owner's standing permission for one job to spend real money with nobody
 * at the keyboard.
 *
 * It rides the progress journal rather than a file beside it because the
 * journal is what a resumed run already reads to decide what is left to do: an
 * authorization kept anywhere else can be lost, copied onto another job, or
 * survive the journal it was granted against. Recorded before the first
 * request, so a run that dies mid-batch resumes under the same permission and
 * the same estimate it was granted, and a run that was never authorized has
 * nothing to resume under.
 */
export const SpendAuthorization = z.object({
    kind: z.literal("spend-authorization"),
    /** The job this permission is for. A journal is per job; this is what makes a copied line useless. */
    jobId: z.string().min(1),
    /** Who approved it. A name, not a role — "the owner" is not a signature. */
    authorizedBy: z.string().trim().min(1),
    at: z.string().min(1),
    /** What they were told it would cost. An estimate, not the cap: the budget ceiling is what actually binds. */
    estimatedSpendUsd: z.number().nonnegative(),
});
/** A line of the progress journal: either an item's result or the authorization the run proceeds under. */
export const ProgressLine = z.union([SpendAuthorization, ProgressEntry]);
/**
 * The item result on a journal line, or undefined when the line is not one.
 * Every reader of the journal goes through this, so adding a non-item line
 * never turns into a parse error in a consumer that only cares about items.
 */
export function progressEntryOf(line) {
    const parsed = ProgressLine.parse(line);
    return "kind" in parsed ? undefined : parsed;
}
