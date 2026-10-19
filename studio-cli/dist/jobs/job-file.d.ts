import { z } from "zod";
export declare const JobFile: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    driver: z.ZodEnum<{
        session: "session";
        openrouter: "openrouter";
        image: "image";
        mock: "mock";
        replicate: "replicate";
    }>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        stage: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type JobFile = z.infer<typeof JobFile>;
export declare const ProgressEntry: z.ZodObject<{
    itemId: z.ZodString;
    status: z.ZodEnum<{
        done: "done";
        failed: "failed";
    }>;
    spendUsd: z.ZodNumber;
    timestamp: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    producer: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ProgressEntry = z.infer<typeof ProgressEntry>;
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
export declare const SpendAuthorization: z.ZodObject<{
    kind: z.ZodLiteral<"spend-authorization">;
    jobId: z.ZodString;
    authorizedBy: z.ZodString;
    at: z.ZodString;
    estimatedSpendUsd: z.ZodNumber;
}, z.core.$strip>;
export type SpendAuthorization = z.infer<typeof SpendAuthorization>;
/** A line of the progress journal: either an item's result or the authorization the run proceeds under. */
export declare const ProgressLine: z.ZodUnion<readonly [z.ZodObject<{
    kind: z.ZodLiteral<"spend-authorization">;
    jobId: z.ZodString;
    authorizedBy: z.ZodString;
    at: z.ZodString;
    estimatedSpendUsd: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    itemId: z.ZodString;
    status: z.ZodEnum<{
        done: "done";
        failed: "failed";
    }>;
    spendUsd: z.ZodNumber;
    timestamp: z.ZodString;
    error: z.ZodOptional<z.ZodString>;
    producer: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
export type ProgressLine = z.infer<typeof ProgressLine>;
/**
 * The item result on a journal line, or undefined when the line is not one.
 * Every reader of the journal goes through this, so adding a non-item line
 * never turns into a parse error in a consumer that only cares about items.
 */
export declare function progressEntryOf(line: unknown): ProgressEntry | undefined;
