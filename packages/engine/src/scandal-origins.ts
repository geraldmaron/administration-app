import { fnv1a, mulberry32, type PersonId, type RoleId } from "@admin/world";
import { institutionDef } from "./institutions.js";
import { RIVAL_LEAK_SYSTEM } from "./cabinet-alignment.js";
import { flagMarker } from "./marked-flags.js";
import type { OversightMatter } from "./oversight.js";
import type { ActionRecord, Campaign, FlagId } from "./state.js";

// Where a story comes from, what it charges, who it names and how grave it is.
//
// Everything here is read off facts the campaign already holds: a bad leak on
// the press record, a decision on the ledger, a cabinet leak the sweep put on
// the ledger, or an authored flag. Nothing is stored for a story, so the story
// and the fact that caused it cannot disagree. The lifecycle (how hot it runs
// week to week) lives in press-scandal.ts; this file says what the story is.

/** A charge a decision on the President's own record can be asked about. */
export type OwnActCharge = "emergency-powers" | "burned-source" | "covert-failure" | "conduct-in-question";

/** What a story is about, whatever opened it. */
export type ScandalCharge = OwnActCharge | "leak" | "cabinet-leak" | "ig-finding" | "flagged";

export type ScandalOrigin =
  /** A leak placed with a masthead that ran the sourcing back to the building. */
  | { readonly kind: "leak-backfire"; readonly engagementId: string }
  /**
   * A decision on the President's own record that the press could take up: the
   * `institutional` cost the act declared, or a covert operation that failed.
   * `eventId` is the ledger entry's own causal id, so the story and the week
   * that caused it are the same fact rather than two.
   */
  | { readonly kind: "own-act"; readonly eventId: string; readonly charge: OwnActCharge }
  /**
   * An officer who talked to the press about something the government did.
   * Opened by the world rather than by the President: the leak is on the ledger
   * with the cabinet sweep's provenance, and the story is about what it said.
   */
  | {
      readonly kind: "cabinet-leak";
      readonly eventId: string;
      readonly person: PersonId;
      /** The colleague a leak was aimed at, when it was aimed: the story is about them. */
      readonly target?: PersonId;
    }
  /**
   * An inspector general's report on a department, published. The audit ran
   * inside the building for weeks; the week it reports is the week the country
   * reads it, and the story is what it found.
   */
  | { readonly kind: "inspector-general"; readonly matterId: string; readonly institution: string }
  /**
   * A flag a scenario reply set directly. Lifecycled from its turn-stamped
   * marker where one exists; a flag set before markers, or by something that
   * does not stamp them, still stands at full weight for as long as the flag
   * does.
   */
  | { readonly kind: "flagged"; readonly flag: string };

/**
 * The officer a story names. Derived from the act's own counsel where the act
 * took counsel, so the person a story asks about is the person who advised the
 * decision rather than a name picked for the occasion.
 */
export type ScandalImplicated = { readonly person: PersonId; readonly role?: RoleId };

export type ScandalIdentity = {
  readonly id: string;
  readonly subject: string;
  readonly origin: ScandalOrigin;
  readonly charge: ScandalCharge;
  readonly brokeTurn: number;
  readonly context?: string;
  readonly implicated?: ScandalImplicated;
};

/**
 * How grave a story is by what it charges, 0..1, scaling what the story costs
 * the country's belief in the government's honesty at any given heat.
 *
 * One at most, so the heaviest story costs what a live story always cost and
 * the rest cost less. The order is the order a public weighs them in: a hearing
 * about the act itself and a covert operation that came apart are about the
 * President's own honesty; a source lost is grave and mostly unseen; reaching
 * for emergency powers splits the country on whether it was warranted; a leak
 * traced to the building is about the staff before it is about the President;
 * an auditor's report is about a department before it is about its chief; and
 * an officer talking out of turn is the officer's story first.
 */
export const SCANDAL_GRAVITY: Readonly<Record<ScandalCharge, number>> = {
  "conduct-in-question": 1,
  "covert-failure": 1,
  flagged: 1,
  "burned-source": 0.8,
  "emergency-powers": 0.7,
  leak: 0.7,
  "ig-finding": 0.6,
  "cabinet-leak": 0.5,
};

const OWN_ACT_SUBJECT: Readonly<Record<OwnActCharge, string>> = {
  "emergency-powers": "the emergency powers the President reached for, and whether the situation warranted them",
  "burned-source": "a source this country was running, and what the decision cost the person who was it",
  "covert-failure": "a covert operation run on the President's own authority that did not stay covert",
  "conduct-in-question": "whether the administration told the truth about what it did, and who knew",
};

/**
 * Which declared costs are stories, and why the rest are not.
 *
 * The test is not how much an act cost but whether a newsroom would run it for
 * six weeks. `legal-authority-spent` is declared on about a fifth of every
 * authored reply, because spending legal authority is what a hard decision
 * ordinarily does; a charge that fires that often is a permanent condition, not
 * a scandal channel. Reaching for emergency powers and getting a source killed
 * are rare, and they are the two an administration gets asked about daily for a
 * month. A hearing about the act itself is the plainest scandal an act can
 * cost, and is declared only on the weeks where the question is whether the
 * government can be believed.
 *
 * A strained civil service, a spent legislative majority and alliance credit
 * are prices, not stories, and the press reads them as what the act argued for
 * (`press-beliefs.ts`), never as a charge.
 */
const CHARGE_FOR_COST: Readonly<Record<string, OwnActCharge>> = {
  "emergency-powers-invoked": "emergency-powers",
  "intelligence-source-burned": "burned-source",
  "conduct-in-question": "conduct-in-question",
};

/**
 * The chair a charge lands on when the act took no counsel: the officer whose
 * department did the thing. Read off the institution catalog, so a charter that
 * seats no such officer simply names nobody.
 */
const CHARGE_DEPARTMENT: Readonly<Partial<Record<ScandalCharge, string>>> = {
  "emergency-powers": "INST-DOJ",
  "conduct-in-question": "INST-DOJ",
  "burned-source": "INST-ODNI",
  "covert-failure": "INST-ODNI",
};

/**
 * The share of cabinet leaks that turn into a story about conduct. Most leaks
 * are an officer losing a policy argument in public, which is a bad day and not
 * a scandal; about one in three carries something the government did that it
 * would rather nobody knew. At the cabinet's six to fifteen leaks a term that is
 * two to five stories a term from inside the building.
 */
export const CABINET_LEAK_STORY_SHARE = 1 / 3;

/**
 * The charge a decision can be asked about, if any: one per act, in the order a
 * newsroom would lead on. A covert operation that came apart is the story
 * whatever else the same week also spent.
 */
function chargeFor(entry: ActionRecord): OwnActCharge | undefined {
  if (entry.commitment?.instrument === "covert" && entry.commitment.landed === false) return "covert-failure";
  for (const cost of entry.institutional ?? []) {
    const charge = CHARGE_FOR_COST[cost];
    if (charge) return charge;
  }
  return undefined;
}

function seatHolding(campaign: Campaign, person: PersonId): RoleId | undefined {
  const seat = Object.entries(campaign.player.cabinet).find(([, holder]) => holder === person);
  return seat ? (seat[0] as RoleId) : undefined;
}

function departmentChair(campaign: Campaign, charge: ScandalCharge): ScandalImplicated | undefined {
  const department = CHARGE_DEPARTMENT[charge];
  const role = department ? institutionDef(department)?.cabinetRole : undefined;
  const person = role ? campaign.player.cabinet[role] : undefined;
  return role && person ? { person, role } : undefined;
}

/** The officer a decision's story names: the chair that advised it, else the chair whose department carried it out. */
function implicatedFor(campaign: Campaign, entry: ActionRecord, charge: OwnActCharge): ScandalImplicated | undefined {
  if (entry.counsel && entry.counsel.role !== campaign.founding.leadRole) {
    return { person: entry.counsel.person, role: entry.counsel.role };
  }
  return departmentChair(campaign, charge);
}

function isChargedAct(entry: ActionRecord): boolean {
  return entry.actor === "player" && entry.causal !== undefined && chargeFor(entry) !== undefined;
}

function isCabinetLeak(entry: ActionRecord): boolean {
  const systems = entry.causal?.systems ?? [];
  return entry.actor === "world" && systems.includes("cabinet") && systems.includes("leak");
}

/** The ledger entries that can open a story, in ledger order, split by the kind of story they open. */
type StoryEntries = {
  readonly ledger: readonly ActionRecord[];
  readonly acts: readonly ActionRecord[];
  readonly leaks: readonly ActionRecord[];
};

// Every packet the engine applies re-reads approval, approval reads the
// standing stories, and every packet appends to the ledger: rescanning a
// term's twelve thousand entries per packet was a quarter of a week's cost.
// Whether an entry can open a story is a fact about the entry alone, so the
// list is extended from the last ledger read whenever the new ledger begins
// with it entry for entry, and rebuilt in full otherwise.
let lastStoryEntries: StoryEntries | undefined;

function beginsWith(ledger: readonly ActionRecord[], prefix: readonly ActionRecord[]): boolean {
  if (prefix.length > ledger.length) return false;
  for (let index = prefix.length - 1; index >= 0; index -= 1) if (ledger[index] !== prefix[index]) return false;
  return true;
}

function storyEntries(ledger: readonly ActionRecord[]): StoryEntries {
  const prior = lastStoryEntries;
  if (prior?.ledger === ledger) return prior;
  const extending = prior !== undefined && beginsWith(ledger, prior.ledger);
  const acts = extending ? [...prior.acts] : [];
  const leaks = extending ? [...prior.leaks] : [];
  for (let index = extending ? prior.ledger.length : 0; index < ledger.length; index += 1) {
    const entry = ledger[index]!;
    if (isChargedAct(entry)) acts.push(entry);
    else if (entry.causal !== undefined && isCabinetLeak(entry)) leaks.push(entry);
  }
  lastStoryEntries = { ledger, acts, leaks };
  return lastStoryEntries;
}

function ownActIdentities(campaign: Campaign): readonly ScandalIdentity[] {
  return storyEntries(campaign.ledger).acts.flatMap((entry) => {
    const charge = chargeFor(entry);
    if (!charge || entry.causal === undefined) return [];
    const implicated = implicatedFor(campaign, entry, charge);
    return [
      {
        id: `scandal:act:${entry.causal.eventId}`,
        subject: OWN_ACT_SUBJECT[charge],
        origin: { kind: "own-act" as const, eventId: entry.causal.eventId, charge },
        charge,
        brokeTurn: entry.turn,
        context: entry.description,
        ...(implicated ? { implicated } : {}),
      },
    ];
  });
}

/**
 * Whether this leak is one of the third that carries a story, the same answer
 * on every read. Mixed through a generator rather than read off the bare hash,
 * because event ids differ only in their last digits and the bare hash of two
 * such keys lands close together.
 */
function leakCarriesStory(campaign: Campaign, eventId: string): boolean {
  return mulberry32(fnv1a(`${campaign.seed}::leak-story::${eventId}`))() < CABINET_LEAK_STORY_SHARE;
}

/** The officer a story names, with the chair they still hold if they hold one. */
function implicatedPerson(campaign: Campaign, person: PersonId): ScandalImplicated {
  const role = seatHolding(campaign, person);
  return role ? { person, role } : { person };
}

/**
 * The colleague a leak was aimed at, read off the leak's own record: the
 * second person on an entry tagged as aimed. A story about an aimed leak is a
 * story about its target, which is the leaker's whole purpose in placing it.
 */
function aimedAt(campaign: Campaign, entry: ActionRecord): PersonId | undefined {
  if (!entry.causal?.systems?.includes(RIVAL_LEAK_SYSTEM)) return undefined;
  const target = entry.causal.entities?.[1] as PersonId | undefined;
  return target !== undefined && campaign.people[target] !== undefined ? target : undefined;
}

function leakSubject(campaign: Campaign, person: PersonId, target: PersonId | undefined): string {
  const name = campaign.people[person]?.base.name ?? "An officer";
  if (target === undefined) return `what ${name} told the press about how the administration does its business`;
  return `what ${name} told the press about how ${campaign.people[target]?.base.name ?? "a colleague"} does the job`;
}

function cabinetLeakIdentities(campaign: Campaign): readonly ScandalIdentity[] {
  return storyEntries(campaign.ledger).leaks.flatMap((entry) => {
    if (entry.causal === undefined) return [];
    const eventId = entry.causal.eventId;
    const person = (entry.causal.entities ?? []).find((id) => campaign.people[id as PersonId] !== undefined) as PersonId | undefined;
    if (!person || !leakCarriesStory(campaign, eventId)) return [];
    const target = aimedAt(campaign, entry);
    return [
      {
        id: `scandal:leak:${eventId}`,
        subject: leakSubject(campaign, person, target),
        origin: { kind: "cabinet-leak" as const, eventId, person, ...(target === undefined ? {} : { target }) },
        charge: "cabinet-leak" as const,
        brokeTurn: entry.turn,
        context: entry.description,
        implicated: implicatedPerson(campaign, target ?? person),
      },
    ];
  });
}

/** The week a matter's report went on the record, if it has reported. */
function reportedTurn(matter: OversightMatter): number | undefined {
  if (matter.finding === undefined) return undefined;
  return matter.beats.find((beat) => beat.description === matter.finding)?.turn;
}

function inspectorIdentities(campaign: Campaign): readonly ScandalIdentity[] {
  return campaign.oversight.matters.flatMap((matter) => {
    if (matter.origin.kind !== "inspector-general" || matter.direction !== "received" || !matter.public) return [];
    const turn = reportedTurn(matter);
    if (turn === undefined) return [];
    const institution = matter.origin.institution;
    const role = institutionDef(institution)?.cabinetRole;
    const cause = matter.causeId ? campaign.ledger.find((entry) => entry.causal?.eventId === matter.causeId) : undefined;
    const graft = cause?.causal?.graft;
    const person = graft?.person ?? (role ? campaign.player.cabinet[role] : undefined);
    return [
      {
        id: `scandal:ig:${matter.id}`,
        subject: `what the inspector general found about ${matter.subject}`,
        origin: { kind: "inspector-general" as const, matterId: matter.id, institution },
        charge: "ig-finding" as const,
        brokeTurn: turn,
        ...(matter.finding === undefined ? {} : { context: matter.finding }),
        ...(role && person ? { implicated: { person: person as PersonId, role } } : {}),
      },
    ];
  });
}

function leakIdentity(engagementId: string, brokeTurn: number): ScandalIdentity {
  return {
    id: `scandal:${engagementId}`,
    subject: "a leak placed with the press that came back sourced to the administration's own staff",
    origin: { kind: "leak-backfire", engagementId },
    charge: "leak",
    brokeTurn,
  };
}

/**
 * The week a flag was set, off the marker every authored flag is stamped with.
 * A flag with no marker has no date, and is read exactly as it was before
 * markers existed.
 */
export function flagSetTurn(campaign: Campaign, flag: FlagId): number | undefined {
  const prefix = flagMarker(flag, 0).slice(0, -1);
  const turns = Object.keys(campaign.player.flags)
    .filter((key) => key.startsWith(prefix) && campaign.player.flags[key])
    .map((key) => Number(key.slice(prefix.length)))
    .filter((turn) => Number.isInteger(turn));
  return turns.length > 0 ? Math.min(...turns) : undefined;
}

/**
 * The flag the scandal phase keeps standing while any story is live, so a
 * scenario can gate on "a story is running" without reading the board. It
 * shares the `scandal:` prefix a scenario would look for, so it is excluded
 * here by name or it would open a story about itself.
 */
export const SCANDAL_LIVE_FLAG: FlagId = "scandal:live";

export function flagIdentity(flag: string, brokeTurn: number): ScandalIdentity {
  const subject = flag.slice("scandal:".length).replace(/-/g, " ").trim();
  return {
    id: `scandal:flag:${flag}`,
    subject: subject.length > 0 ? subject : "a matter the administration has not answered for",
    origin: { kind: "flagged", flag },
    charge: "flagged",
    brokeTurn,
  };
}

/** Authored scandal flags standing on the board, with the week each was set where it was stamped. */
export function scandalFlags(campaign: Campaign): readonly { readonly flag: string; readonly setTurn?: number }[] {
  return Object.keys(campaign.player.flags)
    .filter((flag) => flag.startsWith("scandal:") && flag !== SCANDAL_LIVE_FLAG && campaign.player.flags[flag])
    .map((flag) => {
      const setTurn = flagSetTurn(campaign, flag);
      return setTurn === undefined ? { flag } : { flag, setTurn };
    });
}

/** Every dated story the campaign's facts can open: bad leaks, the President's own acts, cabinet leaks and auditors' reports. */
export function datedScandalIdentities(campaign: Campaign): readonly ScandalIdentity[] {
  const fromLeaks = campaign.press.engagements
    .filter((engagement) => engagement.kind === "leak" && !engagement.wentWell)
    .map((engagement) => leakIdentity(engagement.id, engagement.turn));
  return [
    ...fromLeaks,
    ...ownActIdentities(campaign),
    ...cabinetLeakIdentities(campaign),
    ...inspectorIdentities(campaign),
  ];
}
