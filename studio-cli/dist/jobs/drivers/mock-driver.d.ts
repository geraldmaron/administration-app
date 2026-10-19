import type { JobDriver, JobItem, ItemResult } from "../driver.js";
export declare class MockDriver implements JobDriver {
    private readonly failItemIds;
    private readonly output;
    readonly name = "mock";
    constructor(failItemIds?: ReadonlySet<string>, output?: unknown);
    runItem(item: JobItem): Promise<ItemResult>;
}
