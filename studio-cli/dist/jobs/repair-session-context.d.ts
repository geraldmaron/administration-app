import { type HarnessCorpus } from "../corpus/harness-corpus.js";
import type { JobFile } from "./job-file.js";
/** A sibling contributes flags only while it can itself pass the full repair gate. */
export declare function repairSessionCorpus(job: JobFile, workDir: string, corpus: HarnessCorpus): Promise<HarnessCorpus>;
/** Use one corpus view for both the session's findings and the enforced gate. */
export declare function jobHarnessCorpus(job: JobFile, jobsDir: string, corpusRoot: string): Promise<HarnessCorpus>;
