import { type Campaign, type TariffFinding } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
/** What an investigation is about, in a few words: "steel" or "China's trade practices". */
export declare function findingSubjectWords(campaign: Campaign, finding: TariffFinding): string;
export declare function investigationItems(campaign: Campaign): readonly AttentionItem[];
/**
 * A finding made in the last week, as news: what it found and what it opens.
 * It is the row the week's stop opens, and it is ambient because the stop
 * itself already happened.
 */
export declare function rulingItems(campaign: Campaign): readonly AttentionItem[];
export declare function retaliationItems(campaign: Campaign): readonly AttentionItem[];
export declare function tariffExpiryItems(campaign: Campaign): readonly AttentionItem[];
