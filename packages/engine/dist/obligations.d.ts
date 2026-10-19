import { type StateId } from "@admin/world";
import type { Campaign, NationCondition, PendingClaim } from "./state.js";
import type { StateEffect } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
/** A claim opens under this prefix so an answering act can match it by kind. */
export declare const RELIEF_SIGNATURE_PREFIX = "relief";
export declare function reliefSignature(kind: NationCondition["kind"]): string;
/**
 * How long a state waits for an answer before the silence becomes a mark.
 *
 * Inverted against severity on purpose: the worse the emergency, the less
 * patience the state has. A mild condition gives most of a season; a
 * catastrophe gives under a month.
 */
export declare const CLAIM_WINDOW_MAX_TURNS = 8;
export declare const CLAIM_WINDOW_MIN_TURNS = 3;
export declare function claimWindowTurns(severity: number): number;
/** Share of severity a claim against the one state that is living through it carries. */
export declare const LOCAL_CLAIM_WEIGHT = 0.8;
/**
 * Share of the local weight a nationwide condition carries *per state*.
 *
 * A nation-scope condition names no state at all (`placeUsOnset` returns no
 * place for it), so without this the broadest 15% of emergencies in the game
 * would open no claim anywhere and cost nothing to ignore — teaching the player
 * that the bigger the disaster, the safer it is to walk away. It is well under
 * 1 because this weight lands on every state at once: a national emergency
 * ignored should anger the whole country a little, not anger each state as much
 * as its own local disaster would.
 */
export declare const NATIONAL_CLAIM_SHARE = 0.25;
export declare function claimWeightFor(condition: NationCondition): number;
export declare function claimFor(condition: NationCondition, stateName: string, turn: number): PendingClaim;
export declare const obligationPhase: TurnPhase;
/**
 * Answer every open relief claim of this kind in one state, without a mark.
 *
 * The one route by which a locale act discharges an obligation. Removing the
 * claim rather than marking it is the whole point: a president who answered is
 * not a president who was silent.
 */
export declare function answerReliefClaims(campaign: Campaign, id: StateId, kind: NationCondition["kind"]): StateEffect | undefined;
/** The mark an answered relief claim leaves behind. */
export declare function answeredSignature(kind: NationCondition["kind"]): string;
/** How long an answer still counts as this state's file being worked. */
export declare const ANSWER_ATTENTION_TURNS = 6;
/**
 * Whether this administration has actually answered this state on this kind
 * recently — the targeted evidence that a condition's own file is being worked,
 * as opposed to the government having signed anything at all that week.
 */
export declare function stateAnswered(campaign: Campaign, condition: NationCondition): boolean;
