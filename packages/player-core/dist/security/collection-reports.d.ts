import { type Campaign, type EffectPacket } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table.js";
export declare function collectionReports(campaign: Campaign): {
    filed: string;
    weeks: number;
    summary: string;
    confidence: string;
    status: string;
    stale: boolean;
    exposure: string;
    findings: readonly import("@admin/engine").CollectionFinding[];
    gaps: readonly string[];
    shared: {
        recipient: string;
        date: string;
        findings: string[];
    }[];
    note?: string | undefined;
    focus?: string | undefined;
    question: string;
    href?: string | undefined;
    id: string;
    target: string;
}[];
export type CollectionReportRow = ReturnType<typeof collectionReports>[number];
export declare function collectionRecipients(campaign: Campaign, reportId: string): {
    id: NationId;
    name: string;
    reason: string | undefined;
}[];
export declare function shareReportChoices(campaign: Campaign, reportId: string, recipient: NationId | undefined, findingIndexes?: readonly number[]): ChoiceTable;
export declare function shareReportOrder(campaign: Campaign, reportId: string, recipient: NationId, findingIndexes?: readonly number[]): EffectPacket;
