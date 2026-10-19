import type { PersonId, RoleId } from "@admin/world";
import { type Campaign, type FlagId } from "./state.js";
import type { EffectPacket } from "./effects.js";
/** Half a year before a Secretary whose offer was declined or ignored puts it again. */
export declare const OFFER_COOLDOWN_TURNS = 26;
/** An offer the President never answered is a Secretary who was not worth an answer. */
export declare const IGNORED_OFFER_LOYALTY = -0.02;
/** The flag a lapsed or declined offer leaves, dated, so the Secretary does not put it again next week. */
export declare function offerAnsweredFlag(person: PersonId): FlagId;
/**
 * The flag a request nobody answered leaves on its department, dated: a
 * Secretary ignored once waits a couple of months before asking again, rather
 * than putting the same memo on the Desk every Monday.
 */
export declare function requestLapsedFlag(role: RoleId): FlagId;
/** Whether an item is still live in the week being run. */
export declare function agendaItemLive(item: {
    readonly expiresTurn?: number;
}, week: number): boolean;
/** Whether the person who raised an item still holds the chair they raised it from, or acts in it. */
export declare function stillRaisedBy(campaign: Campaign, role: RoleId, person: PersonId): boolean;
/** The flag a Secretary's own proposal leaves on them, dated, so a cabinet speaks a few times a year rather than every week. */
export declare function initiativeFlag(person: PersonId): FlagId;
/** The bar a request has to clear to reach the Desk under this Chief of Staff. */
export declare function triageBar(campaign: Campaign): number;
/**
 * The order the Chief of Staff puts the building's requests in. A chief with
 * good judgment reads them by how much trouble each department is in; a weak
 * one hears the loudest Secretary first.
 */
export declare function triageScore(campaign: Campaign, urgency: number, ambition: number): number;
/**
 * The cabinet's week: offers and proposals decided, items nobody answered
 * lapsed, and the agenda written whole. One packet per decision, so each
 * carries the reason it was made; each writes the agenda as it stands after
 * that decision, so the last one applied leaves the whole of it.
 */
export declare function cabinetAgendaPackets(state: Campaign): readonly EffectPacket[];
