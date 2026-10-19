import type { ScenarioBriefSpec } from "./brief.js";
export type Refusal = {
    readonly index: number;
    readonly id?: string;
    readonly reason: string;
};
export type Cell = {
    readonly key: string;
    readonly spec: ScenarioBriefSpec;
    readonly scenarios: readonly unknown[];
    readonly ids: readonly string[];
};
export type Header = {
    readonly ok: true;
    readonly kitVersion: string;
    readonly author?: string;
    readonly scenarios: readonly unknown[];
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function readHeader(raw: unknown, currentVersion: string): Header;
/**
 * Sort a file's scenarios into cells. A scenario the gate could not be pointed
 * at (no id, no class, a cast the kit does not offer) is refused here with the
 * reason, because a cell is chosen by exactly those fields.
 */
export declare function planCells(scenarios: readonly unknown[]): {
    readonly cells: readonly Cell[];
    readonly refused: readonly Refusal[];
};
export type Defect = {
    readonly scenario: string;
    readonly severity: "error" | "warning";
    readonly kind: string;
    readonly message: string;
};
/** The session driver's findings file, re-keyed by scenario id; `scenarios` is the cell's output, for shape detail. */
export declare function defectsFrom(findings: unknown, ids: readonly string[], scenarios?: readonly unknown[]): readonly Defect[];
export type CellOutcome = {
    readonly itemId: string;
    readonly cell: string;
    readonly ids: readonly string[];
    readonly passed: boolean;
    readonly defects: readonly Defect[];
};
export type IngestReport = {
    readonly source: string;
    readonly jobId: string;
    readonly kitVersion: string;
    readonly author?: string;
    readonly cells: readonly CellOutcome[];
    readonly refused: readonly Refusal[];
};
export declare function needsPasteBack(report: IngestReport): boolean;
export declare function formatReport(report: IngestReport, pasteBack?: string): string;
/** The findings file an author pastes back into the chat that wrote the batch. */
export declare function formatPasteBack(report: IngestReport): string;
