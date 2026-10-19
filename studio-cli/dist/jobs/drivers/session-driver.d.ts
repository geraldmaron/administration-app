import type { ItemResult, JobDriver, JobItem } from "../driver.js";
export declare const SCENARIO_README = "# Scenario generation work directory\n\nEach `*.brief.md` in this folder is one batch of scenarios to write. For each brief:\n\n1. Read the brief in full. It contains the JSON contract, the hard gates, the craft\n   rules, and two shipped exemplar scenarios that set the quality bar.\n2. Write your scenarios as a JSON array of ScenarioDef objects to the matching\n   `<item>.out.json` (same basename as the brief).\n3. Re-run the job (`studio scenarios run <jobId>`). Every output is validated:\n   a clean item is journaled done; a rejected one gets a `<item>.findings.json`\n   naming each defect \u2014 fix the output and run again. Items already done are\n   never re-checked or re-spent unless you pass --recheck.\n\nFor a scenario-repair job, a sibling output can supply a callback flag only while\nthat sibling passes its own full repair gate. After changing or removing an output\nfrom a job with done items, run with --recheck to check dependent readers again.\n\nThe validator is the same gate every generated scenario faces regardless of who\nor what wrote it. There is no path around it.\n";
/**
 * What a driver needs of a validator and no more: a file name, a parsed
 * document, and a verdict with findings against it. Both content gates satisfy
 * it, which is what lets one driver serve both — the alternative, a second
 * driver class differing only in which function it calls, would have to be kept
 * in step with this one forever and would not be.
 */
export type DocumentValidation = {
    readonly shapeErrors: readonly string[];
    readonly findings: readonly {
        readonly severity: string;
        readonly message: string;
    }[];
    /**
     * Defects outside the audit's own finding vocabulary — today, the binding
     * contract a fresh scenario batch is held to. Optional because the gates that
     * have no such rule simply do not carry the field, rather than every one of
     * them growing an empty list to satisfy this driver.
     */
    readonly binding?: readonly {
        readonly kind: string;
        readonly scenario: string;
        readonly message: string;
    }[];
    readonly ok: boolean;
};
/** `item` is the job item being checked, so a revision's validator can read the original it revises. */
export type DocumentValidator = (file: string, raw: unknown, item?: JobItem) => DocumentValidation;
export type SessionDriverOptions = {
    readonly workDir: string;
    /** The gate this job's outputs are held to, chosen by job kind at the call site. */
    readonly validate: DocumentValidator;
    readonly readme?: string;
};
export declare class SessionDriver implements JobDriver {
    private readonly options;
    readonly name = "session";
    constructor(options: SessionDriverOptions);
    private file;
    runItem(item: JobItem): Promise<ItemResult>;
}
