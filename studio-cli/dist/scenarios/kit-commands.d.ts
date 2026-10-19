import { type IngestReport } from "./ingest.js";
import { type PlayerBundle } from "../corpus/player-bundle.js";
import type { ContentManifest } from "@admin/contracts";
export type IngestDeps = {
    readonly jobsDir: string;
    readonly corpusDir: string;
    readonly inboxDir: string;
    /** The gate: `scenarios run <jobId>` in the CLI, injected so this module never imports it. */
    readonly run: (jobId: string) => Promise<number>;
    readonly kitVersion?: () => string;
};
export declare const DEFAULT_INGEST_DIRS: {
    readonly jobsDir: string;
    readonly corpusDir: string;
    readonly inboxDir: string;
};
export declare const DEFAULT_KIT_DIR: string;
/** Same file, same job: re-ingesting re-gates the outputs already in the work directory. */
export declare function ingestJobId(file: string, bytes: string): string;
export type IngestResult = {
    readonly code: number;
    readonly report?: IngestReport;
    readonly pasteBack?: string;
    readonly text: string;
};
export declare function ingestFile(file: string, deps: IngestDeps, jobOverride?: string): Promise<IngestResult>;
/**
 * Remove a session job's workspace once its scenarios are published or
 * returned. For an ingest job, also file the dropped source under
 * `processed/`. The review record under content/reviews and any findings
 * returned to the author are kept: they are the batch's history.
 */
export declare function finishJob(jobId: string, deps: IngestDeps): Promise<string>;
/**
 * The bake, and the kit rewritten from it in the same step: the kit's corpus
 * listing, deeds and needs are read off the bake, so the two are committed
 * together or the kit-current gate refuses the tree.
 */
export declare function bakeWithKit(outDir: string, manifest: ContentManifest): Promise<PlayerBundle>;
/** The CLI's own gate and flag parser, passed in so this module never imports the CLI. */
export type KitCommandDeps = {
    readonly run: IngestDeps["run"];
    readonly takeFlag: (args: string[], name: string) => string | undefined;
};
export declare function cmdKitGroup(command: string, rest: readonly string[], cli: KitCommandDeps): Promise<number>;
