import { type Campaign, type StagingSource } from "@admin/engine";
/** The clock's staging source. A quiet-week document is not held. */
export declare function scenarioStagingSource(): StagingSource<Campaign>;
