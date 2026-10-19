import { type Campaign, type LapseSource } from "@admin/engine";
/**
 * Whether this document already had its silence priced this week.
 *
 * `inactionPacket` stamps a turn-scoped marker. Reading it back is what keeps
 * a one-day step from billing the same silence twice.
 */
export declare function chargedThisWeek(campaign: Campaign, scenarioId: string): boolean;
/**
 * The durable mark that the held docket, not Continue, priced this scenario's
 * silence. Continue reads it to avoid a second weekly charge for a document the
 * docket already closed the book on. Kept distinct from the durable
 * `scenario-unanswered:` flag, which Continue also sets — that flag marks any
 * silence, and using it to gate Continue would silence documents the docket
 * never held.
 */
export declare function docketSilenceFlag(scenarioId: string): string;
/** Whether the held docket has already charged this scenario's silence. */
export declare function docketSilenced(campaign: Campaign, scenarioId: string): boolean;
/** The clock's lapse source. An answered document is already gone, so it is not charged. */
export declare function scenarioLapseSource(): LapseSource<Campaign>;
