import type { ResolvedLocus } from "./scenario-locus.js";
import { type StorySubject, type Campaign } from "@admin/engine";
import { type InstitutionKind, type NationId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
export declare function institutionNamed(campaign: Campaign, kind: InstitutionKind): string | undefined;
export type PlaceTokens = {
    readonly subjects?: Readonly<Record<string, string>>;
    readonly city?: string;
    readonly settlement?: string;
    readonly cityKind?: string;
    /**
     * A US state's name, from the running condition a bound scenario is about or
     * from `locus.state`. Unlike `counterpart` or
     * `nation`, a state is not chosen per campaign — the fifty states are a
     * fixed dataset row, so a scenario may cite one by name at authoring time
     * without becoming a claim that varies by board draw. This token exists so a
     * writer reaches for `{{state}}` instead of hardcoding the name, which is
     * what lets a domestic scenario later re-cast across which state a disaster
     * or a strike lands in without a prose rewrite.
     */
    readonly state?: string;
    /**
     * The seated governor of the bound state.
     *
     * Only ever a real person on the live board — a scenario about a wildfire in
     * Colorado is being answered beside the governor who is actually in office in
     * Colorado, and that person is rolled per campaign, so the prose cannot name
     * them and the token has to. Absent where no state is bound or the seat is
     * unseated, which is what the audit refuses to publish a `{{governor}}`
     * against.
     */
    readonly governor?: string;
    /** What time of year it is on the scenario's own ground. */
    readonly season?: string;
    /** How long ago the deed this scenario waits on was done. See `sinceDeedPhrase`. */
    readonly sinceDeed?: string;
    /** The masthead an outlet week is about. Filled only on an outlet cast; see scenario-outlet.ts. */
    readonly outlet?: string;
    readonly reportId?: string;
    readonly reportSummary?: string;
    readonly reportFinding?: string;
    readonly reportSource?: string;
    readonly reportGaps?: string;
    readonly reportConfidence?: string;
    readonly reportExposure?: string;
    readonly reportTarget?: string;
    readonly reportRecipient?: string;
    readonly reportAgeDays?: string;
    readonly reportFindingCount?: string;
    readonly matterSubject?: string;
    readonly matterInstitution?: string;
    /** The name of the body the player and the counterpart share, from the scenario's own `sharedMembership` gate. */
    readonly sharedOrganization?: string;
    /** The sector of the U.S. tariff the counterpart's retaliation answers, read off the trade ledger. */
    readonly ourTariffSector?: string;
    readonly tradeSector?: string;
    readonly tradeRate?: string;
    readonly billTitle?: string;
    readonly billProvision?: string;
    readonly billHouseProvision?: string;
    readonly billSenateProvision?: string;
    readonly judicialSeat?: string;
    readonly judicialNominee?: string;
    readonly judicialNomineeRecord?: string;
    readonly judicialAlternate?: string;
    readonly judicialAlternateRecord?: string;
    readonly courtOrder?: string;
    readonly courtQuestion?: string;
};
/**
 * The tokens whose value comes from the board rather than from the writer.
 *
 * Exported so the binder's vocabulary and the audit's are one list rather than
 * two that can disagree: a token this file fills but the audit does not know is
 * an error on every scenario that reaches for it, and one the audit knows but
 * this file does not fill prints a blank where a name should be. The type
 * assertion below is what holds the list to `PlaceTokens` rather than to a
 * comment.
 */
export declare const PLACE_TOKEN_NAMES: readonly ["city", "settlement", "cityKind", "state", "governor", "season", "sinceDeed", "outlet", "sharedOrganization", "ourTariffSector", "reportId", "reportSummary", "reportFinding", "reportSource", "reportGaps", "reportConfidence", "reportExposure", "reportTarget", "reportRecipient", "reportAgeDays", "reportFindingCount", "matterSubject", "matterInstitution", "tradeSector", "tradeRate", "billTitle", "billProvision", "billHouseProvision", "billSenateProvision", "judicialSeat", "judicialNominee", "judicialNomineeRecord", "judicialAlternate", "judicialAlternateRecord", "courtOrder", "courtQuestion"];
/**
 * Every token whose value comes from the board rather than from the writer.
 *
 * One function because they are one question — where is this happening, and
 * therefore who answers for it, and what time of year is it there — and because
 * every caller that renders authored prose needs all of them or none: a beat
 * that got `{{state}}` and not `{{governor}}` would print a raw brace beside a
 * real state name.
 */
/** What `{{state}}` and `{{governor}}` read when a bound condition names no state. */
export declare const UNPLACED_STATE = "the country";
export declare const UNPLACED_GOVERNOR = "a governor";
export declare function boundPlace(campaign: Campaign, def: ScenarioDef, counterpart: NationId, locus?: ResolvedLocus, subjects?: readonly StorySubject[]): PlaceTokens;
export declare function renderText(campaign: Campaign, counterpart: NationId, text: string, place?: PlaceTokens): string;
