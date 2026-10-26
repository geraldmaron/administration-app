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
 * Share of the local weight a nationwide standing condition carries *per state*.
 *
 * A recession names no state, so without this the broadest economic trouble in
 * the game would open no claim anywhere and cost nothing to ignore. It is well
 * under 1 because this weight lands on every state at once: a national slump
 * ignored should anger the whole country a little, not anger each state as much
 * as its own local disaster would. A nationwide hazard is different: it has a
 * footprint (`nationFootprint`), and every state inside it is living through it.
 */
export declare const NATIONAL_CLAIM_SHARE = 0.25;
export declare function claimWeightFor(condition: NationCondition): number;
export declare function claimFor(condition: NationCondition, stateName: string, turn: number): PendingClaim;
/**
 * Which states a condition puts under an obligation this turn.
 *
 * Only on the turn it opened. Re-opening a claim every week a condition ran
 * would reset its own deadline every week, so it could never expire and the
 * neglect could never be charged — the mechanic would silently do nothing.
 * A state is asked once per emergency; ignoring that once is what marks.
 *
 * A hazard asks from where it struck: its state, or for a nationwide one the
 * states of its footprint, drawn on a stream keyed to the condition so every
 * reader of the same condition agrees on its reach. A standing condition is
 * the whole country's. A home event (a strike, a detention abroad) is no
 * state's to ask about unless it happened in one.
 */
export declare function statesOwedBy(campaign: Campaign, condition: NationCondition): readonly StateId[];
/**
 * The statewide per capita impact indicator for a major-disaster declaration,
 * in dollars: $1.94 for incidents from October 1, 2025 (FEMA notice, Federal
 * Register document 2026-19855; 44 C.F.R. 206.48(b)(1)). Public damage in a
 * state at or above this times its population is the threshold FEMA reads as
 * beyond the state's own capacity.
 */
export declare const STATEWIDE_PER_CAPITA_INDICATOR = 1.94;
/**
 * The public share of a disaster's losses: about a quarter. FEMA's Disaster
 * Relief Fund has obligated about $40 billion a year since 2020 (CRS IF12834,
 * December 2024) against $137 billion a year of billion-dollar losses over
 * 2020-2024 (NOAA NCEI). An approximation across years and events, not a
 * per-event fact.
 */
export declare const PUBLIC_LOSS_SHARE = 0.25;
/**
 * The same share for the two hazards whose losses are crops, power and lives
 * rather than public works: heat and drought. The OpenFEMA record for 2005 to
 * 2024 names no heat incident and one drought emergency across roughly nine
 * significant heat events and nine droughts, so the share is set where even a
 * severe nationwide heat wave stays under the indicator. That is the record's
 * own answer to whether a heat request is lawful: it is, and it is seldom made.
 */
export declare const PUBLIC_LOSS_SHARE_UNBUILT = 0.005;
/**
 * How close to the indicator a governor's own estimate has to come before the
 * state asks: half of it. A design value. Governors do ask below the line, and
 * some asks are turned down: OpenFEMA's DeclarationDenials record 217
 * major-disaster denials from 2005 to 2024 against about 1,280 declarations,
 * roughly one request in seven. That ratio is not this file's target, because
 * the record's requests include the many small events that never become a
 * condition; among the significant events the game opens, about one request in
 * fifty lacks the capacity finding.
 */
export declare const REQUEST_SHARE_OF_INDICATOR = 0.5;
/**
 * The public damage this condition did, in USD millions, before any response:
 * the first day's asset loss of its impact record, or of the record its onset
 * would have opened when the condition was written without one.
 */
export declare function estimatedPublicLossUSDm(campaign: Campaign, condition: NationCondition): number;
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
