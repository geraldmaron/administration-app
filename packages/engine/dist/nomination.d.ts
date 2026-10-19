import type { PersonId } from "@admin/world";
import type { CausalId } from "./causality.js";
import type { Campaign, PersonRuntime } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { type InstitutionId, type OfficeId } from "./institutions.js";
import { campaignDay } from "./clock.js";
import { type CommitteePanel } from "./committees.js";
import { type NominationStage } from "./nomination-stages.js";
export type NominationId = string;
export type NominationStep = {
    readonly stage: NominationStage;
    readonly day: number;
    readonly note: string;
};
export type Nomination = {
    readonly id: NominationId;
    readonly office: OfficeId;
    readonly institution: InstitutionId;
    readonly nominee: PersonId;
    readonly stage: NominationStage;
    /** Campaign ordinal day the current stage was entered. */
    readonly stageEnteredDay: number;
    /** Campaign ordinal day the nomination opened. */
    readonly openedDay: number;
    readonly committee?: string;
    /** What has surfaced against the nominee. Each one slows and costs. */
    readonly controversies: readonly string[];
    readonly history: readonly NominationStep[];
    /** Why it ended, for a terminal nomination. */
    readonly outcome?: string;
    /**
     * The ledger event that sent this name up.
     *
     * A confirmation lands months after the nomination, in a phase that holds
     * only the record. Without this, the day the Senate seats a Secretary and
     * the day the President chose them are two sentences on the ledger with
     * nothing between them.
     */
    readonly causedBy?: CausalId;
    /**
     * Sent up by the seal rather than by a decision the President took in office:
     * a founding pick the Senate did not confirm on the first morning. Its
     * confirmation is the cabinet the President already announced taking its
     * seat, not a win, so it earns none of the standing a confirmation otherwise
     * does; the picks confirmed at the seal earned none either.
     */
    readonly transition?: true;
};
export declare function selectNomination(campaign: Campaign, id: NominationId): Nomination | undefined;
/** Everything waiting for floor time, which is what makes the next one slower. */
export declare function selectPendingOnFloor(campaign: Campaign): readonly Nomination[];
export declare function selectNominationsBefore(campaign: Campaign, committee: string): readonly Nomination[];
/**
 * One committee with its panel and everything currently before it.
 *
 * The join every reader of the lattice wants, made once here rather than in
 * each of them: the panel's own reading and the nominations it is holding are
 * two halves of the same question, and a screen that computed them separately
 * would be one refactor away from showing a chair beside somebody else's
 * docket.
 */
export type CommitteeDocket = {
    readonly panel: CommitteePanel;
    readonly pending: readonly Nomination[];
};
export declare function selectCommitteeDocket(campaign: Campaign, committee: string): CommitteeDocket;
/** Every committee, in the catalog's own order. */
export declare function selectCommitteeDockets(campaign: Campaign): readonly CommitteeDocket[];
/** The committee a nomination is before, in the words a screen prints. */
export declare function nominationCommitteeName(nomination: Nomination): string | undefined;
/** How long this nomination has been running, in days. */
export declare function nominationAge(campaign: Campaign, nomination: Nomination): number;
export { campaignDay };
/**
 * What vetting turns up, decided once from facts already on the person rather
 * than drawn fresh — so the same nominee is the same nominee whenever they are
 * sent up, and a president cannot reroll a problem away by withdrawing and
 * renominating.
 */
export declare function vettingFindings(person: PersonRuntime["base"]): readonly string[];
export type NominationResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Who the President could actually send up for an office right now, best fit
 * for the seat first: the appointment pool's people, without its reasons.
 * Kept for the readers that want a list of people (the judicial-vacancy
 * scenario's cast, fixtures); a screen that shows why reads `appointmentPool`.
 */
export declare function selectNominableFor(campaign: Campaign, office: OfficeId): readonly PersonRuntime[];
/** Who goes up for which office in a batch; an office with no pick takes its pool's first name. */
export type NominationPicks = Readonly<Record<string, PersonId>>;
/**
 * Send a name up for every empty office in one act: the President's pick where
 * there is one, the pool's first name where there is not.
 *
 * A president does not fill fifty offices one click at a time, and the game
 * should not ask them to: the appointment that matters is *who* goes where, and
 * the rest is paperwork the office exists to do. Each packet is built against
 * the state the previous ones produced, so the same person is never sent up
 * twice, a pick already sent for an earlier seat is refused for a later one,
 * and the returned list applies in order to reproduce exactly what was
 * computed here.
 *
 * Nothing is seated by this. Every name still goes through vetting, committee
 * and the floor on the Senate's schedule, and a president who sends up fifty at
 * once gets what a real one gets: a queue, and floor congestion that stretches
 * every stage.
 */
export declare function fillVacantOffices(campaign: Campaign, offices: readonly OfficeId[], picks?: NominationPicks): readonly EffectPacket[];
/**
 * Send a name up for an office.
 *
 * Deliberately does not check whether the Senate would confirm: a president may
 * spend a nomination on a fight they will lose, and the game should let them,
 * because choosing to have the fight in public is a real presidential act. What
 * it refuses is what is structurally impossible — an office that does not
 * exist or that the Senate does not confirm, a seat already contested or
 * already filled, a person already serving or already sent up elsewhere — and
 * what the seat's own rules forbid (appointment-eligibility.ts).
 *
 * The one commit path for every Senate-confirmed seat, cabinet chairs
 * included: an empty chair waits on the Senate under its acting, the way every
 * other seat does.
 */
export declare function openNomination(campaign: Campaign, office: OfficeId, nominee: PersonId): NominationResult;
/** Pull a name back. Cheaper than losing a floor vote, and not free. */
export declare function withdrawNomination(campaign: Campaign, id: NominationId): NominationResult;
export declare const nominationPhase: TurnPhase;
