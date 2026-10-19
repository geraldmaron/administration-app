import { type Campaign, type ConversationScript, type ReplyProjection } from "@admin/engine";
import type { PersonId } from "@admin/world";
export type CounselSentence = {
    readonly speaker: PersonId;
    readonly line: string;
    /** A second adviser who disagrees, where the engine found one. */
    readonly dissent?: {
        readonly speaker: PersonId;
        readonly line: string;
    };
};
/**
 * One counsel sentence for the reply on screen, composed only from
 * `CabinetCounsel`'s own fields — never a raw `stance`, `reason` or `stake`.
 *
 * `undefined` where there is no seated chair to compose from: no role routes
 * to this reply, or the chair that would is vacant. Both are the surface's own
 * cases to render (a caller already handles them); this only speaks for a
 * living minister.
 */
export declare function counselSentence(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): CounselSentence | undefined;
