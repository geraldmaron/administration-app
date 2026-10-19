import { type Campaign } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
export declare function outstandingLobbyItems(campaign: Campaign): readonly AttentionItem[];
export declare function outstandingPressItems(campaign: Campaign): readonly AttentionItem[];
export declare function outstandingTreatyItems(campaign: Campaign): readonly AttentionItem[];
export declare function outstandingAuthorizationItems(campaign: Campaign): readonly AttentionItem[];
export declare function outstandingInstrumentItems(campaign: Campaign): readonly AttentionItem[];
