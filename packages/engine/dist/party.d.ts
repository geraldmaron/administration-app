import type { AdministrationParty, HillCaucus, UsMajorParty, UsParty } from "./state-legislature.js";
import { type Party } from "@admin/world";
export type { AdministrationParty } from "./state-legislature.js";
/**
 * The caucus the ideology suggestion falls back to. A default for a *suggestion*
 * only — nothing seals a party from this. What the administration is, is what
 * the player chose.
 */
export declare const DEFAULT_ADMINISTRATION_PARTY: UsMajorParty;
/** The two caucuses, in the order every list of them is written. */
export declare const US_MAJOR_PARTIES: readonly UsMajorParty[];
export declare const US_PARTY_WORD: Readonly<Record<UsParty, "Democrat" | "Republican" | "Independent">>;
export declare function usPartyWord(party: UsParty): "Democrat" | "Republican" | "Independent";
/**
 * The major party a set of politics suggests — a suggestion, not the answer.
 *
 * Party is chosen outright at founding; this preselects the control from the
 * ideology sliders and seals the caucus anchor for a president who picked
 * neither major party. It stays a major party by construction: it names a
 * caucus, and Independent is not one.
 */
export declare function resolveAdministrationParty(ideology: {
    readonly economicLeftRight: number;
}): UsMajorParty;
/**
 * The caucus an administration is counted against, sealed beside the party.
 *
 * A Democrat anchors on the Democrats and a Republican on the Republicans. An
 * independent has no caucus of their own, so they anchor on the one their
 * economics is nearest — read off the same charter tickets the founding control
 * preselects from, so no fact about them is invented to fill the field.
 */
export declare function sealCaucusAnchor(party: AdministrationParty, ideology: {
    readonly economicLeftRight: number;
}): UsMajorParty;
/**
 * The other caucus. A statement about the two majors, not about the president —
 * ask `oppositionParties` for who is actually across the aisle.
 */
export declare function otherMajorParty(party: UsMajorParty): UsMajorParty;
/**
 * Every caucus that is not the administration's.
 *
 * One for a Democrat or a Republican. Two for an independent, who has no
 * caucus of their own and therefore no single opposition: both majors are
 * across the aisle, and a bill has to be argued to each of them separately.
 * The shape is a list rather than a value for exactly that reason — an
 * independent does not have a differently-named opposition, they have a
 * differently-shaped one.
 */
export declare function oppositionParties(party: AdministrationParty): readonly UsMajorParty[];
/**
 * The charter ticket an administration of this party runs on.
 *
 * Throws rather than falling back to a major: a silent fallback is how an
 * independent administration came to read as the Republican Party everywhere
 * beliefs were consulted.
 */
export declare function usTicket(party: AdministrationParty): Party;
/**
 * Leadership posts are always one of the two major parties. Counted against the
 * caucus anchor rather than the president's own label: the Speaker and the
 * Majority Leader are whoever holds the chamber, and a chamber does not stop
 * having two sides because the president belongs to neither.
 */
export declare function partyForCaucus(caucus: HillCaucus, caucusAnchor: UsMajorParty): UsMajorParty;
export declare function partyForShare(share: "administration" | "opposition" | "independent", caucusAnchor: UsMajorParty): UsParty;
/** The charter ticket a president of this party runs on. */
export declare function partyTicketId(party: AdministrationParty): string;
/**
 * The two ways an administration without a party is worse off, both stated
 * once and read everywhere rather than applied as a difficulty dial.
 *
 * `INDEPENDENT_REACH` is how much of a co-partisan's pull an independent
 * commands over the caucus nearest them: three quarters, because the members
 * closest to their politics are still closest to their politics, and none of
 * them owe them a nomination. `INDEPENDENT_STANDING_GAP` is what they give up
 * everywhere for having no party at all — the floor a major-party president
 * stands on before any state's lean is counted, and an independent does not.
 *
 * Together they make governing harder in a way a whip count can show: an
 * independent needs a chamber that likes them roughly twenty points more than a
 * party president does to pass the same bill, and needs a broader country to be
 * re-elected. Neither number multiplies a result; both move the reading the
 * result is counted from.
 */
export declare const INDEPENDENT_REACH = 0.75;
export declare const INDEPENDENT_STANDING_GAP = 0.15;
/**
 * The pair of labels every alignment reading is taken against. Structurally the
 * relevant slice of `Congress`, spelled out so this file stays free of the
 * campaign's shape.
 */
export type AdministrationStanding = {
    readonly administrationParty: AdministrationParty;
    readonly caucusAnchor: UsMajorParty;
};
/** Which way along the Dem ← → Rep axis is toward the administration. */
export declare function towardAdministrationSign(caucusAnchor: UsMajorParty): 1 | -1;
/**
 * How much of a co-partisan president's pull this administration commands.
 * One for a president with a party; less for one without.
 */
export declare function administrationReach(party: AdministrationParty): number;
/**
 * How far a Dem ← → Rep lean sits from the administration, −1..1.
 *
 * The one reading that replaced "is this bloc the president's party". For a
 * Democrat or a Republican it is exactly the state's lean signed toward them,
 * which is what every one of these sites computed before. For an independent it
 * is that lean at three-quarter reach, minus the standing every president
 * without a caucus gives up: nothing is fully with them, and the far side is
 * further away than it would be from a partisan they at least share a party
 * machine's enemies with.
 */
export declare function administrationAlignment(lean: number, standing: AdministrationStanding): number;
/**
 * A displacement along the partisan axis, signed and scaled for who is asking.
 *
 * Distinct from `administrationAlignment`, which reads a level: this converts
 * an administration-relative quantity (a favor done, a grievance earned) into
 * movement on the Dem ← → Rep axis. An independent's acts still move a state,
 * but less of that movement is banked by any party — including the one they
 * sit nearest, which did not do it.
 */
export declare function towardAdministration(raw: number, standing: AdministrationStanding): number;
