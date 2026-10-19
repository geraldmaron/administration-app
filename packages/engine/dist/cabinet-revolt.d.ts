import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import { type RngStream } from "./rng.js";
import type { EffectPacket } from "./effects.js";
import { type CabinetOutcome } from "./cabinet.js";
import { type CabinetTie } from "./cabinet-alignment.js";
import { type Term, type Willingness, type WillingnessProjection } from "./willingness.js";
type Person = PersonRuntime["base"];
/**
 * The colleague a leaker is most at odds with, if the tie is a feud they have
 * actually fought: opposed, and on the record the two have taken opposite sides
 * in the room more often than the same side over the last half year. A feud on
 * paper is a reason to dislike someone; a lost argument is a reason to leak
 * about them. Without the second condition a cabinet's leaks went at a
 * colleague almost every time anyone was opposed to anyone, whether or not the
 * two had ever crossed in a meeting.
 */
export declare function feudTarget(state: Campaign, person: PersonId): CabinetTie | undefined;
export declare function aimLeakTerms(leaker: Person, tie: CabinetTie): readonly Term[];
export declare function decideAimLeak(state: Campaign, leaker: Person, tie: CabinetTie): Willingness;
/** Where a leak from this Secretary would point if it came this week, with no draw in it. */
export type AimLeakForecast = {
    readonly tie: CabinetTie;
    readonly projection: WillingnessProjection;
};
export declare function projectAimLeak(state: Campaign, leaker: Person): AimLeakForecast | undefined;
/**
 * The end of an announced departure with no successor confirmed in time: the
 * Secretary goes when they said they would, through `vacates`, and the deputy
 * acts from that week.
 */
export declare function ordinaryExitPacket(state: Campaign, turn: number, role: RoleId, person: Person): EffectPacket;
/**
 * The end of an announced departure once somebody else holds the chair: the
 * successor the Senate confirmed, or whoever it went to by another road. The
 * confirmation already seated them; what is left is the record that the one
 * who announced it has gone, unless the other road already wrote it.
 */
export declare function handoverPacket(state: Campaign, turn: number, role: RoleId, person: Person): EffectPacket;
/** The packet a chair's break or ordinary exit writes, told in the voice drawn for it. */
export declare function revoltPacket(state: Campaign, outcome: CabinetOutcome | "ordinary", turn: number, role: RoleId, person: Person, voices: RngStream): EffectPacket;
export {};
