import { type ConsequenceCorpusContext, type CorpusContext } from "@admin/content";
export type HarnessCorpus = {
    readonly scenarios: CorpusContext;
    /** Bundled vocabulary plus every flag the consequence corpus stamps. */
    readonly scenarioFlags: readonly string[];
    readonly consequences: ConsequenceCorpusContext;
    /** Bundled vocabulary plus every flag the scenario corpus's replies stamp. */
    readonly consequenceFlags: readonly string[];
};
export declare function harnessCorpus(corpusRoot: string): Promise<HarnessCorpus>;
