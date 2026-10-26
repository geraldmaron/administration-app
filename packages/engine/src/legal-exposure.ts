import { FEDERAL_SITES, STATE_IDS, type PersonId, type StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ExecutiveOrder } from "./orders.js";
import type { OrderSubject } from "./order-subjects.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { CourtMatter } from "./state-judiciary.js";
import { orderExposure, type OrderExposure, type PlaintiffClass } from "./order-exposure.js";
import { statePartyName, statePlaintiffs, type StatePlaintiff } from "./state-suits.js";
import { createRngStreams } from "./rng.js";
import { institutionDef, type ContestedRemoval } from "./institutions.js";
import { courtOrderLosses } from "./court-order-records.js";

// Legal exposure: the one stream every dispute about a presidential act runs
// through. An act carries exposure the moment it is signed. Whether anyone
// sues is decided by who is injured, how loudly and in which court; whether
// the act is lawful is a different question the bench answers later
// (strike-odds.ts). Each representation of a dispute (the proceeding, its
// case, a committee inquiry into the same act) links back to one origin, so
// one dispute is counted once.

/** How loud an act is, after the administration's record of losing in court, its own suits included. */
function loudness(campaign: Campaign, exposure: OrderExposure): number {
  const lost = campaign.orders.filter((record) => record.review?.status === "struck-down").length + courtOrderLosses(campaign);
  const salience = Math.min(1, exposure.salience + Math.min(0.2, lost * 0.05));
  return 0.35 + 0.65 * salience;
}

function subjectState(campaign: Campaign, subject: OrderSubject | undefined): StateId | undefined {
  if (subject?.kind === "state" || subject?.kind === "locale-mission") return subject.state;
  if (subject?.kind === "construction")
    return campaign.militaryConstructionProjects?.find((project) => project.id === subject.sourceId)?.hostState;
  // A protected federal building sits in one state, whose attorney general is the one who can sue.
  if (subject?.kind === "federal-site")
    return FEDERAL_SITES.find((site) => site.institution === subject.institutionId && site.location === "sourced")?.state as StateId | undefined;
  return undefined;
}

function rawInjury(campaign: Campaign, exposure: OrderExposure, state: StateId, subject?: OrderSubject): number {
  const character = campaign.states[state]?.base.character;
  if (!character) return 0;
  const reach = exposure.stateReach;
  if (reach.kind === "cohort") return character.cohorts.nativity[reach.cohort] ?? 0;
  if (reach.kind === "economy") return character.economy[reach.axis];
  if (reach.kind === "federal-dependence") return character.federalDependence;
  if (reach.kind === "subject-state") return subjectState(campaign, subject) === state ? 1 : 0;
  return 0;
}

/** Each state's injury relative to the most injured state, 0..1. */
export function stateInjuries(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): Readonly<Partial<Record<StateId, number>>> {
  const exposure = orderExposure(order.id);
  const raw = STATE_IDS.map((state) => [state, rawInjury(campaign, exposure, state, subject)] as const);
  const peak = Math.max(0, ...raw.map(([, value]) => value));
  if (peak <= 0) return {};
  return Object.fromEntries(raw.filter(([, value]) => value > 0)
    .map(([state, value]) => [state, Math.round((value / peak) * 1000) / 1000]));
}

export type FilingOdds = {
  /** The chance a suit is filed at all; says nothing about who would win. */
  readonly chance: number;
  readonly states: readonly StatePlaintiff[];
  readonly classes: Readonly<Partial<Record<PlaintiffClass, number>>>;
  readonly venue: string;
};

/**
 * Whether anyone sues: the strongest state plaintiff, and each private class
 * that can show an injury, as independent chances to file. Lawfulness is not
 * an input.
 */
export function filingOdds(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): FilingOdds {
  const exposure = orderExposure(order.id);
  const loud = loudness(campaign, exposure);
  const states = statePlaintiffs(campaign, stateInjuries(campaign, order, subject), exposure.stateBasis, loud);
  const classes = Object.fromEntries((Object.entries(exposure.classes) as [PlaintiffClass, number][])
    .map(([kind, injury]) => [kind, Math.round(injury * loud * 1000) / 1000]));
  const quiet = Object.values(classes).reduce((product, chance) => product * (1 - chance), 1 - (states[0]?.weight ?? 0));
  return { chance: Math.round((1 - quiet) * 10000) / 10000, states, classes, venue: "a federal district court" };
}

/** At most this many states are named in the caption; the rest join as "et al.". */
const NAMED_STATES = 4;

/** The parties a filed challenge names: the states that would sue, then the leading private plaintiff. */
export function challengeParties(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): CourtMatter["parties"] {
  const odds = filingOdds(campaign, order, subject);
  const states = odds.states.slice(0, NAMED_STATES).map((entry) => ({ name: statePartyName(entry.stateId, entry.name), role: "plaintiff" as const }));
  const privateParty = Object.keys(odds.classes).length ? [{ name: orderExposure(order.id).privatePlaintiff, role: "plaintiff" as const }] : [];
  return [...states, ...privateParty, { name: "The United States", role: "defendant" as const }];
}

/** The brief for an ordinary order challenge: who sues, on what injury, on which distinct grounds. */
export function orderChallengeMatter(campaign: Campaign, order: ExecutiveOrder, question: string,
  ground: ConstitutionalGround, subject?: OrderSubject): CourtMatter {
  const exposure = orderExposure(order.id);
  const odds = filingOdds(campaign, order, subject);
  const parties = challengeParties(campaign, order, subject);
  const plaintiffs = parties.filter((party) => party.role === "plaintiff");
  const lead = plaintiffs[0]?.name.replace(/, by its Attorney General$/, "") ?? exposure.privatePlaintiff;
  const leadState = odds.states[0]?.stateId;
  const joined = plaintiffs.length > 1 || odds.states.length > NAMED_STATES;
  return {
    kind: "order-challenge", ...(leadState ? { state: leadState } : {}),
    title: `${lead}${joined ? " et al." : ""} v. United States`,
    parties,
    injury: odds.states.length
      ? `${odds.states.length} state${odds.states.length === 1 ? "" : "s"} claim injury ${exposure.stateBasis === "proprietary" ? "to their own funds and programs" : "through harm to their residents, which courts weigh cautiously"}; private plaintiffs claim direct injury.`
      : "Private plaintiffs claim direct injury from the order.",
    jurisdiction: `Federal-question action in ${odds.venue} (28 U.S.C. §1331). Each plaintiff must show its own standing.`,
    question,
    authority: order.authority ? `${order.authority.cite} (${order.authority.name}). ${order.authority.limit}` : "No authority is cited for the order.",
    disputedFacts: ground === "authorized" ? "Whether the order stays inside what Congress authorized, and whether the Constitution allows it even so."
      : "Whether the order stays inside the authority it cites.",
    reliefSought: "An injunction for the plaintiffs, or vacatur if the order is carried out by rule. Relief for nonparties requires a certified class (Trump v. CASA, 2025).",
    affected: plaintiffs.map((party) => party.name).join("; "),
    arguments: exposure.grounds,
  };
}

// --- One origin per dispute ---

export type LegalExposureOrigin =
  | { readonly kind: "executive-order"; readonly recordId: string; readonly orderId: string }
  | { readonly kind: "misconduct"; readonly matterId: string; readonly causeId: string }
  | { readonly kind: "removal"; readonly institution: string; readonly person: PersonId; readonly turn: number };

export type LegalExposure = {
  readonly id: string;
  readonly origin: LegalExposureOrigin;
  /** What the act stands on, kept from the originating act. */
  readonly authority: string;
  /** The chance a suit or a charge was put at when the exposure arose. */
  readonly filingChance: number;
  /**
   * The chance a court rules against the act, where the exposure prices it
   * once; an order's merits are priced at each stage by the bench instead.
   */
  readonly meritsChance?: number;
  readonly status: "exposed" | "filed" | "decided" | "referred" | "charged" | "declined";
  /** Every record that represents this one dispute. */
  readonly representations: readonly string[];
};

function orderExposures(campaign: Campaign, catalogue: (id: string) => ExecutiveOrder | undefined): readonly LegalExposure[] {
  return campaign.orders.map((record: ExecutiveOrderRecord) => {
    const proceeding = campaign.judiciary.proceedings?.find((entry) =>
      entry.subject.kind === "executive-order" && entry.subject.recordId === record.id);
    const decided = campaign.judiciary.cases.find((entry) => entry.id === proceeding?.id);
    const inquiries = campaign.oversight.matters.filter((matter) => matter.id.endsWith(`|order:${record.id}`));
    const authority = catalogue(record.order)?.authority;
    return {
      id: `exposure:${record.id}`,
      origin: { kind: "executive-order" as const, recordId: record.id, orderId: record.order },
      authority: authority ? authority.cite : "uncited",
      filingChance: record.challengeChance ?? 0,
      status: decided ? "decided" as const : proceeding || record.review ? "filed" as const : "exposed" as const,
      representations: [...(proceeding ? [proceeding.id] : []), ...(decided ? [`case:${decided.id}`] : []),
        ...inquiries.map((matter) => matter.id)],
    };
  });
}

/** Weeks from a public finding to a charging decision; a design band, not a statutory clock. */
export const CHARGING_DECISION_WEEKS = { min: 13, max: 52 } as const;
/** The share of public misconduct findings that end in a charge; a design judgment. */
export const CHARGE_CHANCE = 0.3;

/**
 * Misconduct an inspector general has made public is a referral, not an
 * indictment: prosecutors decide, months later, and most findings are not
 * charged.
 */
function misconductExposures(campaign: Campaign): readonly LegalExposure[] {
  return campaign.oversight.matters.flatMap((matter) => {
    if (!matter.causeId || !matter.public || matter.finding === undefined || matter.direction !== "received") return [];
    const reported = matter.beats.at(-1)?.turn ?? matter.openedTurn;
    const draws = createRngStreams(campaign.seed).stream("charging-decision", matter.id);
    const wait = draws.nextInt(CHARGING_DECISION_WEEKS.min, CHARGING_DECISION_WEEKS.max + 1);
    const charged = draws.next() < CHARGE_CHANCE;
    const status = campaign.turn < reported + wait ? "referred" as const : charged ? "charged" as const : "declined" as const;
    return [{ id: `exposure:misconduct:${matter.id}`, origin: { kind: "misconduct" as const, matterId: matter.id, causeId: matter.causeId },
      authority: "federal criminal law, on referral", filingChance: CHARGE_CHANCE, status, representations: [matter.id] }];
  });
}

/** The chance a member removed from a contested seat sues to be reinstated; a design judgment. */
export const REMOVAL_SUIT_CHANCE = 0.85;
/**
 * The chance a court orders such a member reinstated. A design judgment set
 * below even because Trump v. Slaughter's reasoning (a body that makes rules
 * with the force of law, enforces them and sues in court exercises executive
 * power, and its head must answer to the President) reaches every commission
 * that does those things, though no holding names it.
 */
export const REMOVAL_REINSTATEMENT_CHANCE = 0.2;
/** Weeks from the removal to the removed member's decision to sue; a design band. */
export const REMOVAL_FILING_WEEKS = { min: 1, max: 4 } as const;

/** When the removed member decides, and whether they sue: drawn once per removal. */
export function removalSuit(campaign: Campaign, institution: string, removal: ContestedRemoval): { readonly decidesTurn: number; readonly sues: boolean } {
  const draws = createRngStreams(campaign.seed).stream("removal-suit", institution, removal.person, removal.turn);
  const wait = draws.nextInt(REMOVAL_FILING_WEEKS.min, REMOVAL_FILING_WEEKS.max + 1);
  return { decidesTurn: removal.turn + wait, sues: draws.next() < REMOVAL_SUIT_CHANCE };
}

/** The proceeding id a filed removal suit runs under. */
export function removalProceedingId(institution: string, removal: ContestedRemoval): string {
  return `removal:${institution}:${removal.person}:${removal.turn}`;
}

/**
 * A removal from a seat whose protection the Court's reasoning, not its
 * holding, reaches. The removed member decides within weeks whether to sue;
 * a filed suit runs as a court proceeding (removal-court.ts).
 */
function removalExposures(campaign: Campaign): readonly LegalExposure[] {
  return Object.values(campaign.institutions).flatMap((runtime) => (runtime.contestedRemovals ?? []).map((removal) => {
    const office = institutionDef(runtime.id)?.offices[0];
    const suit = removalSuit(campaign, runtime.id, removal);
    const id = removalProceedingId(runtime.id, removal);
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
    const decided = campaign.judiciary.cases.find((entry) => entry.id === id);
    const status = decided ? "decided" as const : proceeding ? "filed" as const
      : campaign.turn < suit.decidesTurn ? "exposed" as const : suit.sues ? "filed" as const : "declined" as const;
    return {
      id: `exposure:removal:${runtime.id}:${removal.person}:${removal.turn}`,
      origin: { kind: "removal" as const, institution: runtime.id, person: removal.person, turn: removal.turn },
      authority: `Art. II, §1 and §3, on the reasoning of Trump v. Slaughter (2026), against the protection of ${office?.title ?? "the seat"}`,
      filingChance: REMOVAL_SUIT_CHANCE,
      meritsChance: REMOVAL_REINSTATEMENT_CHANCE,
      status,
      representations: [runtime.id, ...(proceeding ? [proceeding.id] : []), ...(decided ? [`case:${decided.id}`] : [])],
    };
  }));
}

/** The exposures contested commission removals carry, for the officers board. */
export function selectRemovalExposures(campaign: Campaign): readonly LegalExposure[] {
  return removalExposures(campaign);
}

/** Every legal exposure the administration carries, one per origin. */
export function selectLegalExposures(campaign: Campaign, catalogue: (id: string) => ExecutiveOrder | undefined): readonly LegalExposure[] {
  return [...orderExposures(campaign, catalogue), ...misconductExposures(campaign), ...removalExposures(campaign)];
}
