import type { NationId, StateId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
import { type InstitutionId } from "./institutions.js";
import type { EffectPacket } from "./effects.js";
import { type Campaign, type NationCondition } from "./state.js";
/**
 * How hard a body is working a condition.
 *
 * Not a dial the player sets directly, and deliberately so: posture is bought
 * with acts that already exist and already cost something. Declaring an
 * emergency that reaches the condition surges the response; answering the
 * state it is in with a locale act sustains it; doing neither leaves the
 * career staff on it, which is what a federal response is when nobody in the
 * building has asked for anything.
 */
export type ResponsePosture = "standby" | "sustained" | "surge";
/**
 * One body carrying one live condition.
 *
 * `lead` is the body doing the carrying. Where a kind is answered by several,
 * the first in `RESPONSE_MEMBERS` is the lead of the response as a whole and
 * the rest support it — see `responseEffectiveness`.
 */
export type ResponseOperation = {
    readonly id: string;
    readonly lead: InstitutionId;
    /** The `NationCondition.id` this operation answers. */
    readonly condition: string;
    readonly kind: ConditionKind;
    readonly nation: NationId;
    readonly state?: StateId;
    readonly posture: ResponsePosture;
    readonly openedTurn: number;
    /** Turns this operation has been running, which is the condition's own age. */
    readonly weeks: number;
    /** Share of the lead body's own week this one operation takes. */
    readonly load: number;
    /** How far past its own size the lead body is stretched by everything it holds, 0..1. */
    readonly exhaustion: number;
    /** What this body is actually worth on this file right now, 0..1. */
    readonly effectiveness: number;
};
/**
 * Which bodies answer which condition, lead first.
 *
 * Small on purpose. These are the agencies that can be *deployed* — that put
 * people and materiel somewhere a condition is happening. The five economic
 * standing kinds have no members at all, and that absence is a statement: no
 * agency can be sent to a recession. What answers one is a program, which is
 * what `conditionAttention` already reads, and giving those kinds a deployable
 * body would have quietly made the appropriation and the policy program
 * redundant with a posture switch.
 */
export declare const RESPONSE_MEMBERS: Readonly<Record<ConditionKind, readonly InstitutionId[]>>;
/** The states, who are a member of most responses and a subordinate of none. */
export declare const STATES_INSTITUTION: InstitutionId;
/**
 * Federal bodies that can actually be deployed to a condition.
 *
 * `INST-STATES` is the federalism counterparty — present on most rosters so
 * consent and federalization have somewhere to land — not a federal agency
 * the Emergency room can send. A kind whose only member is the states (civil
 * unrest) is a governor's file, not a deployment board.
 */
export declare function federalResponseMembers(kind: ConditionKind): readonly InstitutionId[];
/** True when a federal agency can be sent — the Emergency room's own subject. */
export declare function isFederallyDeployable(kind: ConditionKind): boolean;
/**
 * What each posture is worth, and what it takes out of the body holding it.
 *
 * The two are deliberately not proportional. Surging buys 43% more delivery
 * than sustaining and costs 60% more load, which is what makes a surge a thing
 * a president spends rather than a setting they leave on.
 */
export declare const POSTURE_EFFORT: Readonly<Record<ResponsePosture, number>>;
export declare const POSTURE_LOAD: Readonly<Record<ResponsePosture, number>>;
/**
 * The share of a reference-sized body's week one full-weight operation takes.
 *
 * Divided by the body's own `staffScale`, which is where FEMA's size becomes a
 * mechanic rather than a line in a catalog. FEMA is authored at 0.12, so one
 * sustained operation on a nationwide disaster at severity 0.6 takes about half
 * its week and two take all of it — the agency the country reaches for first is
 * the one it can exhaust in a season. HHS at 0.6 carries five of the same
 * operations before it notices.
 */
export declare const OPERATION_SHARE = 0.1;
/**
 * How much of a lead body's exhaustion comes off what it delivers.
 *
 * Half, at full stretch. Not all of it, because an exhausted agency does not
 * stop — it gets slower and it makes more mistakes, and the rest of that cost
 * is charged where it belongs, in the backlog and the morale the weekly tick
 * already carries.
 */
export declare const EXHAUSTION_DRAG = 0.5;
/**
 * The most a response can take off what a condition costs the country.
 *
 * A floor of 0.55 rather than 0: no deployment makes a hurricane not have
 * happened. The best-run federal response in the game still leaves 55% of the
 * bill standing, which is the honest reading of what emergency management is
 * for — it is the difference between a bad month and a catastrophe, never the
 * difference between a catastrophe and nothing.
 */
export declare const RESPONSE_FLOOR = 0.55;
/**
 * How far a governor has to lean toward the administration to send their own
 * emergency management into a federal response unasked.
 *
 * At the midpoint, which is what makes it a real gate: the delegation-derived
 * disposition on a state's `governor` sits either side of 0.5 depending on the
 * politics of the place, so about half the country requires either a
 * relationship or a declaration.
 */
export declare const GOVERNOR_CONSENT = 0.5;
/**
 * Weekly backlog charged to a body per unit of load.
 *
 * The one number here tuned to a horizon rather than to a principle: at 3.5, a
 * FEMA holding two nationwide disasters accumulates enough backlog over a
 * season to cross into the visible half of `BACKLOG_DRAG_CEILING`, which is
 * what "two disasters exhaust it" has to mean if it is to be something the
 * player can see happening rather than a claim in a comment.
 */
export declare const RESPONSE_BACKLOG_PER_LOAD = 3.5;
/** Load a body carries for free before the week starts costing it morale. */
export declare const MORALE_STRAIN_FLOOR = 0.5;
/**
 * Morale lost per week per unit of load past the floor.
 *
 * Set against `MORALE_DRIFT` (0.01), the rate a body recovers at: a fully
 * loaded body holds its morale level and a surging one loses ground, which is
 * exactly the shape a sustained surge should have.
 */
export declare const RESPONSE_MORALE_STRAIN = 0.01;
/**
 * Whether the states are in this response.
 *
 * Two routes and no third. A governor whose statehouse leans toward this
 * administration sends their own people, and that is consent. Otherwise the
 * federal government has to have declared an emergency that reaches the place
 * — the act that already exists, already has a scope, and already costs
 * standing every week it is held. There is no way to simply order a state into
 * a federal response, which is not a simplification: it is the arrangement.
 */
export declare function statesConsent(campaign: Campaign, condition: NationCondition): boolean;
/**
 * What posture the administration has actually bought on this condition.
 *
 * Read off acts rather than stored, so the surge is the emergency declaration
 * and the sustained effort is the locale act — the same two things the player
 * was already choosing between, now with an operational consequence instead of
 * only a political one.
 */
export declare function responsePosture(campaign: Campaign, condition: NationCondition): ResponsePosture;
/**
 * Every operation the federal government is running this week, lead first
 * within each condition.
 *
 * The player's own country only. The other fifty capitals have no institution
 * graph in this game, so asking how well their emergency management is doing
 * would be asking a question the dataset cannot answer.
 */
export declare function responseOperations(campaign: Campaign): readonly ResponseOperation[];
/** The operations answering one condition, lead first. */
export declare function responseOperationsFor(campaign: Campaign, condition: NationCondition): readonly ResponseOperation[];
/**
 * What the whole response to one condition is worth, 0..1.
 *
 * Lead-dominant on the same 0.7/0.3 split `selectWorkDelivery` blends an owner
 * with its support, and for the same reason: the work routes to the body that
 * owns it, and a healthy CDC does not fix a hollow FEMA. The lead here is the
 * first body `RESPONSE_MEMBERS` names, never the healthiest, so ownership is
 * fixed by the table rather than by the week's readings.
 */
export declare function responseEffectiveness(campaign: Campaign, condition: NationCondition): number;
/**
 * What a condition's bill is multiplied by, between `RESPONSE_FLOOR` and 1.
 *
 * 1 means nobody is answering it and the week costs what the tables say. The
 * floor means the best response the government can mount. See this module's
 * header for why a multiplier — and only a multiplier — is Law 8 safe.
 */
export declare function responseMitigation(campaign: Campaign, condition: NationCondition): number;
/**
 * What a body's open operations do to it this week, as the two figures the
 * executive branch's own tick already carries.
 *
 * This is the conversion the whole module turns on. Nothing here invents a
 * dial: an operation costs a body backlog and, past a point, morale, and
 * `deriveImplementationQuality` reads both already. So the number every
 * surface prints — the delivery reading on the office dossier, the branch
 * capacity on the situation room — moves because the government is stretched,
 * with no term added to the derivation and nothing to explain to a player
 * beyond "FEMA is holding three disasters".
 */
export type ResponseLoad = {
    readonly institution: InstitutionId;
    readonly backlog: number;
    readonly morale: number;
};
export declare function responseLoads(campaign: Campaign): readonly ResponseLoad[];
/**
 * The week the bodies answering the country's live conditions actually worked,
 * billed to the two figures the executive branch's own tick already keeps.
 *
 * Emitted by `conditionPhase` rather than by `institutionPhase` because that is
 * the phase that knows what is running, and it lands earlier in the sequence —
 * so the branch's own week clears a backlog that already includes what the
 * emergencies put on it, and `deriveImplementationQuality` never has to learn a
 * new term. Read off the state the onsets left, so a disaster that opened this
 * morning is on the books it is charged against.
 */
export declare function responseLoadPacket(campaign: Campaign): readonly EffectPacket[];
