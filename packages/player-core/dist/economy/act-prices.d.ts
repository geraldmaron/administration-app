import { type Campaign, type Effect, type ExecutiveOrder, type ReplyOption, type ResolutionRequest, type RngStreams } from "@admin/engine";
/** The effects of an executive order that reach the books. */
export declare function orderPriceEffects(campaign: Campaign, order: ExecutiveOrder): readonly Effect[];
/** Conditional fiscal footprint if the instrument works, without rolling its hidden outcome. */
export declare function rungFiscalEffects(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): readonly Effect[];
/** The borrowing a reply commits the President to, if its impact borrows. */
export declare function replyBorrowing(option: ReplyOption): readonly Effect[];
