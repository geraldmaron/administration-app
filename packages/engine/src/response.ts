import type { NationId, StateId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
import { SCOPE_WEIGHT } from "./condition-impacts.js";
import { underDeclaredEmergency } from "./emergency.js";
import { selectGovernor } from "./governors.js";
import {
  deriveImplementationQuality,
  institutionDef,
  type InstitutionDef,
  type InstitutionId,
  type InstitutionRuntime,
} from "./institutions.js";
import type { EffectPacket } from "./effects.js";
import { stateAnswered } from "./obligations.js";
import { selectActiveConditions, type Campaign, type NationCondition } from "./state.js";

// Deploying against a condition, which is the half of an emergency the game
// had never had.
//
// A condition arrives, it bills the country every week, and it eases on a
// recovery rate. Everything in that sentence happens to a president rather
// than because of one: the bodies that exist to answer a flood — FEMA, the
// CDC, the states' own emergency management — had no way to be *on* it. This
// module is the deployment. An operation is one body carrying one live
// condition at a posture, and what it is worth is the delivery reading that
// body already earns, so a hollowed-out agency answers a hurricane the way a
// hollowed-out agency actually does.
//
// **Law 8, stated for this module.** A response scales a condition's COSTS and
// its PROGRESSION and nothing else. It may never move the statistic the
// condition's own onset reads, because a standing condition that could lower
// its own cause would close on a reading it wrote itself — the self-exciting
// loop in the other direction, and just as fatal. The mechanism that makes
// that unbreakable rather than merely observed: `responseMitigation` returns a
// multiplier, and the only things multiplied by it are terms the `IMPACTS`
// table already writes. A multiplier cannot reach a stat its multiplicand does
// not, and `IMPACTS` is itself gated by the Law 8 table check, so the response
// inherits that proof rather than needing its own. `standingHold` — the reading
// of the country that holds a standing condition open — is deliberately NOT
// scaled here, and must not be.
//
// **Nothing is stored.** An operation is derived from facts the campaign
// already carries: which conditions are live, which bodies answer that kind,
// what the President has declared or signed, and what each body's own runtime
// says about it. That is the same choice `conditionFamily` made and for the
// same reason — a derivation needs no save migration and cannot drift from the
// records it is a reading of. What *does* accumulate is carried where the
// executive branch already accumulates: an operation's weekly load is
// converted into the lead body's backlog and morale, which are the terms
// `deriveImplementationQuality` was already built on. That number, the one
// every surface prints, is untouched.

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
export const RESPONSE_MEMBERS: Readonly<Record<ConditionKind, readonly InstitutionId[]>> = {
  earthquake: ["INST-FEMA", "INST-STATES"],
  flood: ["INST-FEMA", "INST-STATES"],
  // Infrastructure restoration is CISA's half of a storm: the grid, the water
  // system and the networks that come back before anything else can.
  cyclone: ["INST-FEMA", "INST-CISA", "INST-STATES"],
  wildfire: ["INST-FEMA", "INST-STATES"],
  pandemic: ["INST-CDC", "INST-HHS", "INST-STATES"],
  drought: ["INST-USDA", "INST-FEMA", "INST-STATES"],
  // A tornado is FEMA and the state's own emergency management, the same roster a
  // flood has, because it is the same work: search, shelter and claims.
  tornado: ["INST-FEMA", "INST-STATES"],
  // A winter storm is roads and airports before it is anything else, so
  // Transportation joins, and CISA holds the grid and the water system.
  "winter-storm": ["INST-FEMA", "INST-DOT", "INST-CISA", "INST-STATES"],
  // A heat wave is a grid emergency that kills people, so Energy leads it rather
  // than FEMA: what the federal government can actually do is keep the power on
  // and open cooling, and neither of those is a disaster-recovery job.
  "heat-wave": ["INST-DOE", "INST-HHS", "INST-CISA", "INST-STATES"],
  // The police power is the states', and it is theirs first. A federal lead on
  // civil unrest is not a response, it is a different decision entirely.
  unrest: ["INST-STATES"],
  "energy-shortage": ["INST-DOE", "INST-CISA", "INST-STATES"],
  recession: [],
  "inflation-shock": [],
  "unemployment-shock": [],
  "fiscal-crisis": [],
  "housing-crunch": [],
  // An intrusion is CISA's to contain and the FBI's to investigate. A mass
  // killing is the FBI and ATF behind the state's own police. A strike, a
  // failed bank and an American held abroad have no body to send: a mediator,
  // a receivership and a negotiation are programs and diplomacy, not a
  // deployment.
  cyberattack: ["INST-CISA", "INST-FBI"],
  "work-stoppage": [],
  "bank-failure": [],
  "mass-casualty-attack": ["INST-FBI", "INST-ATF", "INST-STATES"],
  "wrongful-detention": [],
};

/** The states, who are a member of most responses and a subordinate of none. */
export const STATES_INSTITUTION: InstitutionId = "INST-STATES";

/**
 * Federal bodies that can actually be deployed to a condition.
 *
 * `INST-STATES` is the federalism counterparty — present on most rosters so
 * consent and federalization have somewhere to land — not a federal agency
 * the Emergency room can send. A kind whose only member is the states (civil
 * unrest) is a governor's file, not a deployment board.
 */
export function federalResponseMembers(kind: ConditionKind): readonly InstitutionId[] {
  return RESPONSE_MEMBERS[kind].filter((id) => id !== STATES_INSTITUTION);
}

/** True when a federal agency can be sent — the Emergency room's own subject. */
export function isFederallyDeployable(kind: ConditionKind): boolean {
  return federalResponseMembers(kind).length > 0;
}

/**
 * What each posture is worth, and what it takes out of the body holding it.
 *
 * The two are deliberately not proportional. Surging buys 43% more delivery
 * than sustaining and costs 60% more load, which is what makes a surge a thing
 * a president spends rather than a setting they leave on.
 */
export const POSTURE_EFFORT: Readonly<Record<ResponsePosture, number>> = {
  standby: 0.35,
  sustained: 0.7,
  surge: 1,
};

export const POSTURE_LOAD: Readonly<Record<ResponsePosture, number>> = {
  standby: 0.4,
  sustained: 1,
  surge: 1.6,
};

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
export const OPERATION_SHARE = 0.1;

/**
 * How much of a lead body's exhaustion comes off what it delivers.
 *
 * Half, at full stretch. Not all of it, because an exhausted agency does not
 * stop — it gets slower and it makes more mistakes, and the rest of that cost
 * is charged where it belongs, in the backlog and the morale the weekly tick
 * already carries.
 */
export const EXHAUSTION_DRAG = 0.5;

/**
 * The most a response can take off what a condition costs the country.
 *
 * A floor of 0.55 rather than 0: no deployment makes a hurricane not have
 * happened. The best-run federal response in the game still leaves 55% of the
 * bill standing, which is the honest reading of what emergency management is
 * for — it is the difference between a bad month and a catastrophe, never the
 * difference between a catastrophe and nothing.
 */
export const RESPONSE_FLOOR = 0.55;

/**
 * How far a governor has to lean toward the administration to send their own
 * emergency management into a federal response unasked.
 *
 * At the midpoint, which is what makes it a real gate: the delegation-derived
 * disposition on a state's `governor` sits either side of 0.5 depending on the
 * politics of the place, so about half the country requires either a
 * relationship or a declaration.
 */
export const GOVERNOR_CONSENT = 0.5;

/**
 * Weekly backlog charged to a body per unit of load.
 *
 * The one number here tuned to a horizon rather than to a principle: at 3.5, a
 * FEMA holding two nationwide disasters accumulates enough backlog over a
 * season to cross into the visible half of `BACKLOG_DRAG_CEILING`, which is
 * what "two disasters exhaust it" has to mean if it is to be something the
 * player can see happening rather than a claim in a comment.
 */
export const RESPONSE_BACKLOG_PER_LOAD = 3.5;

/** Load a body carries for free before the week starts costing it morale. */
export const MORALE_STRAIN_FLOOR = 0.5;

/**
 * Morale lost per week per unit of load past the floor.
 *
 * Set against `MORALE_DRIFT` (0.01), the rate a body recovers at: a fully
 * loaded body holds its morale level and a surging one loses ground, which is
 * exactly the shape a sustained surge should have.
 */
export const RESPONSE_MORALE_STRAIN = 0.01;

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);
const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/** How much country this condition is happening to, 0..1. */
function conditionWeight(condition: NationCondition): number {
  return condition.severity * SCOPE_WEIGHT[condition.scope];
}

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
export function statesConsent(campaign: Campaign, condition: NationCondition): boolean {
  // Asked with no state, `underDeclaredEmergency` answers whether a
  // NATION-scoped declaration is in force, which is the right question for a
  // condition with no single place in it.
  if (underDeclaredEmergency(campaign, condition.state)) return true;
  if (!condition.state) return false;
  const governor = selectGovernor(campaign, condition.state);
  return governor !== undefined && governor.disposition >= GOVERNOR_CONSENT;
}

/**
 * What posture the administration has actually bought on this condition.
 *
 * Read off acts rather than stored, so the surge is the emergency declaration
 * and the sustained effort is the locale act — the same two things the player
 * was already choosing between, now with an operational consequence instead of
 * only a political one.
 */
export function responsePosture(campaign: Campaign, condition: NationCondition): ResponsePosture {
  if (underDeclaredEmergency(campaign, condition.state)) return "surge";
  if (stateAnswered(campaign, condition)) return "sustained";
  return "standby";
}

type Draft = {
  readonly lead: InstitutionId;
  readonly def: InstitutionDef;
  readonly runtime: InstitutionRuntime;
  readonly condition: NationCondition;
  readonly posture: ResponsePosture;
  readonly load: number;
};

function draftsFor(campaign: Campaign, condition: NationCondition): readonly Draft[] {
  const posture = responsePosture(campaign, condition);
  const weight = conditionWeight(condition);
  const drafts: Draft[] = [];
  for (const id of RESPONSE_MEMBERS[condition.kind]) {
    if (id === STATES_INSTITUTION && !statesConsent(campaign, condition)) continue;
    const def = institutionDef(id);
    const runtime = campaign.institutions[id];
    if (!def || !runtime || def.staffScale <= 0) continue;
    drafts.push({
      lead: id,
      def,
      runtime,
      condition,
      posture,
      load: round3((POSTURE_LOAD[posture] * weight * OPERATION_SHARE) / def.staffScale),
    });
  }
  return drafts;
}

/**
 * Every operation the federal government is running this week, lead first
 * within each condition.
 *
 * The player's own country only. The other fifty capitals have no institution
 * graph in this game, so asking how well their emergency management is doing
 * would be asking a question the dataset cannot answer.
 */
export function responseOperations(campaign: Campaign): readonly ResponseOperation[] {
  const home = campaign.founding.nation;
  const drafts = selectActiveConditions(campaign)
    .filter((condition) => condition.nation === home && RESPONSE_MEMBERS[condition.kind].length > 0)
    .flatMap((condition) => draftsFor(campaign, condition));

  const loadByBody = new Map<InstitutionId, number>();
  for (const draft of drafts) {
    loadByBody.set(draft.lead, (loadByBody.get(draft.lead) ?? 0) + draft.load);
  }

  return drafts.map((draft) => {
    const exhaustion = clamp01(loadByBody.get(draft.lead) ?? 0);
    const quality = deriveImplementationQuality(draft.runtime, draft.def);
    return {
      id: `response:${draft.lead}:${draft.condition.id}`,
      lead: draft.lead,
      condition: draft.condition.id,
      kind: draft.condition.kind,
      nation: draft.condition.nation,
      ...(draft.condition.state ? { state: draft.condition.state } : {}),
      posture: draft.posture,
      openedTurn: draft.condition.startedTurn,
      weeks: Math.max(0, campaign.turn - draft.condition.startedTurn),
      load: draft.load,
      exhaustion: round3(exhaustion),
      effectiveness: round3(
        clamp01(quality * POSTURE_EFFORT[draft.posture] * (1 - EXHAUSTION_DRAG * exhaustion)),
      ),
    };
  });
}

/** The operations answering one condition, lead first. */
export function responseOperationsFor(
  campaign: Campaign,
  condition: NationCondition,
): readonly ResponseOperation[] {
  return responseOperations(campaign).filter((operation) => operation.condition === condition.id);
}

/**
 * What the whole response to one condition is worth, 0..1.
 *
 * Lead-dominant on the same 0.7/0.3 split `selectWorkDelivery` blends an owner
 * with its support, and for the same reason: the work routes to the body that
 * owns it, and a healthy CDC does not fix a hollow FEMA. The lead here is the
 * first body `RESPONSE_MEMBERS` names, never the healthiest, so ownership is
 * fixed by the table rather than by the week's readings.
 */
export function responseEffectiveness(campaign: Campaign, condition: NationCondition): number {
  const operations = responseOperationsFor(campaign, condition);
  if (operations.length === 0) return 0;
  const lead = operations[0]!.effectiveness;
  if (operations.length === 1) return lead;
  const support =
    operations.slice(1).reduce((sum, operation) => sum + operation.effectiveness, 0) /
    (operations.length - 1);
  return round3(lead * 0.7 + support * 0.3);
}

/**
 * What a condition's bill is multiplied by, between `RESPONSE_FLOOR` and 1.
 *
 * 1 means nobody is answering it and the week costs what the tables say. The
 * floor means the best response the government can mount. See this module's
 * header for why a multiplier — and only a multiplier — is Law 8 safe.
 */
export function responseMitigation(campaign: Campaign, condition: NationCondition): number {
  if (condition.nation !== campaign.founding.nation) return 1;
  if (RESPONSE_MEMBERS[condition.kind].length === 0) return 1;
  return round3(1 - (1 - RESPONSE_FLOOR) * responseEffectiveness(campaign, condition));
}

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

export function responseLoads(campaign: Campaign): readonly ResponseLoad[] {
  const totals = new Map<InstitutionId, number>();
  for (const operation of responseOperations(campaign)) {
    totals.set(operation.lead, (totals.get(operation.lead) ?? 0) + operation.load);
  }
  const loads: ResponseLoad[] = [];
  for (const [institution, load] of totals) {
    const runtime = campaign.institutions[institution];
    if (!runtime || load <= 0) continue;
    const strain = RESPONSE_MORALE_STRAIN * Math.max(0, load - MORALE_STRAIN_FLOOR);
    loads.push({
      institution,
      backlog: round3(runtime.backlog + RESPONSE_BACKLOG_PER_LOAD * load),
      morale: clamp01(round3(runtime.morale - strain)),
    });
  }
  // Sorted by id so a week's packet is a function of what is running rather
  // than of Map insertion order, which is condition iteration order.
  return loads.sort((a, b) => a.institution.localeCompare(b.institution));
}

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
export function responseLoadPacket(campaign: Campaign): readonly EffectPacket[] {
  const loads = responseLoads(campaign);
  if (loads.length === 0) return [];
  return [
    {
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      provenance: { origin: "world", systems: ["conditions", "response"] },
      narration: {
        summary: `Federal responders spend the week on what the country is living through: ${loads.length} ${loads.length === 1 ? "agency is" : "agencies are"} carrying an open operation.`,
      },
      effects: loads.map((load) => ({
        kind: "institution",
        institution: load.institution,
        changes: { backlog: load.backlog, morale: load.morale },
      })),
    },
  ];
}
