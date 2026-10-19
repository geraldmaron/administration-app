import { type NationId, type NationTraits, type PartyId, type Person, type PersonId, type PersonTrait, type RoleId } from "@admin/world";
import type { RngStream } from "./rng.js";
import { type Campaign } from "./state.js";
import type { TemperamentAxisKey, TemperamentOffset } from "./state-world.js";
/** The lead chair a nation's own charter names, or undefined for a nation with no charter on record. */
export declare function leadRoleFor(campaign: Campaign, nationId: NationId): RoleId | undefined;
/** The person the leader table describes: the first candidate drawn for the lead chair. */
export declare function tableIncumbentId(nationId: NationId, lead: RoleId): PersonId;
/**
 * The seated head of government for a nation that is not the player's own —
 * the same living national `/nation`, `/ops` and `/person` already name for
 * that office, so a counterpart who speaks in a conversation is the same
 * person those surfaces already point at, not a second guess at who runs
 * the place.
 *
 * Whoever holds the chair on the record holds it: a successor an election, a
 * coup or a lost war seated carries the lead role as their `currentRole`, and
 * outranks everyone, including the table's incumbent and whatever chair the
 * successor was first drawn for. With nobody seated on the record, the table's
 * incumbent holds the chair while alive, and only after them does the most
 * competent living candidate for it succeed, so a stronger rival drawn for the
 * same chair never outranks the head of government the table seats.
 */
export declare function foreignLeaderFor(campaign: Campaign, nationId: NationId): {
    readonly person: PersonId;
    readonly name: string;
} | undefined;
/** The party the leader table says governs a nation, or none for a government that runs without one. */
export declare function tableGoverningParty(nation: NationId): PartyId | undefined;
/**
 * The party in power: the one the seat abroad records once foreign politics
 * has seated anybody, and the table's before that. A seat that names no party
 * (a junta, a throne) reads as none, which is the slate's reading.
 */
export declare function governingPartyOf(campaign: Campaign, nation: NationId): PartyId | undefined;
/** The weights the three dispositions are read at, from a government's own temperament. */
export declare function dispositionWeights(traits: NationTraits): Readonly<Record<"hawkish" | "dovish" | "pragmatic", number>>;
/**
 * A foreign head of government's traits, with the disposition read from the
 * government they lead.
 *
 * Takes exactly the draws the seat's ordinary pick takes — one roll for the
 * anchor, one for whether there is a second trait, and one more only when
 * there is — so everything drawn after it from the same stream (party,
 * ideology, the face) lands exactly where it did, and no name moves. The
 * anchor's roll is read against the government's temperament rather than the
 * seat's list; the second trait still comes from the seat, and never names a
 * second disposition. Undefined for the President's own country and for a
 * nation the dataset does not carry, which the caller draws the ordinary way.
 */
export declare function pickLeadTraits(stream: RngStream, likely: readonly PersonTrait[], nation: string): PersonTrait[] | undefined;
/** The most a seated leader moves any one axis of their government's temperament, either way. */
export declare const LEADER_OFFSET_BOUND = 0.1;
/** A hawk's or a dove's pull on both the government's aggression and the risk it will run. */
export declare const LEADER_DISPOSITION_SWING = 0.06;
/** Ambition's pull on the risk a government will run, at the reading's two ends. */
export declare const LEADER_AMBITION_SWING = 0.04;
/** Integrity's pull on how far a government holds to law and treaty. */
export declare const LEADER_INTEGRITY_SWING = 0.06;
/** Loyalty's pull on how far a government keeps its word to partners. */
export declare const LEADER_LOYALTY_SWING = 0.04;
/** A nationalist's or a globalist's pull on how far the government keeps to its own business. */
export declare const LEADER_OUTLOOK_SWING = 0.06;
/** An ambitious leader's pull toward taking an opening, and a cautious one's away from it. */
export declare const LEADER_OPPORTUNISM_SWING = 0.04;
/** A pragmatist's pull toward letting a slight go. */
export declare const LEADER_VENGEFULNESS_SWING = 0.04;
/** What a person would put on a government's temperament, before it is measured against anyone. */
export declare function personalLean(person: Person): Readonly<Record<TemperamentAxisKey, number>>;
/**
 * The offset a leader holds while in office: how far their lean sits from the
 * lean of the leader the table seated, per axis, within the bound.
 *
 * Measured against the table's incumbent because the stored seat is what
 * changes when the chair changes hands: the incumbent stores nothing, a
 * successor stores how they differ from them, and the incumbent's own lean is
 * added on read (`incumbentResidual`), so a successor ends up measured against
 * the same expected leader the incumbent is. Zero axes are left out.
 */
export declare function leaderOffset(successor: Person | undefined, baseline: Person | undefined): TemperamentOffset;
/**
 * How far the leader in office at the start leans from the leader their
 * government would typically have, within the bound.
 *
 * The dataset's temperament describes the government, not the person the
 * founding drew to lead it, so a markedly hawkish incumbent of a cautious
 * government used to move nothing. Read on every call rather than stored, from
 * the table's incumbent whoever now holds the chair: a successor's stored
 * offset is measured against that incumbent, so adding this puts every leader
 * against the same expected one.
 */
export declare function incumbentResidual(campaign: Campaign, nation: NationId): TemperamentOffset;
/**
 * How well the leaders of two capitals get on personally, centered on the
 * typical pair of governments, -1..1; nothing where either chair is empty. The
 * President is read as the American side's leader, a fact about the other
 * government's situation and never a choice the President makes.
 */
export declare function leaderRapportBetween(campaign: Campaign, from: NationId, to: NationId): number;
