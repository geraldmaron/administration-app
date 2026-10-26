import type { Campaign } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { InstitutionId } from "./institutions.js";
import { INSTITUTION_CATALOG, institutionDef } from "./institutions.js";
import { committeeName } from "./committees.js";
import { turnsFor } from "./pace.js";
import type { TurnPhase } from "./turn-loop.js";

// Who watches the government, and what it costs the President that somebody
// does.
//
// The presidency had every instrument and no auditor. An administration could
// hollow out an agency, bend it to its own politics, sign an order the courts
// then threw out, and the only account anybody kept of it was the polling. The
// one thing missing was the thing American government is actually full of: a
// standing apparatus whose job is to look, that the President did not appoint
// this week and cannot call off.
//
// A matter is one piece of that looking. It runs in a direction — some of it is
// oversight this administration directed, most of it is oversight aimed at the
// administration — it moves through stages on a clock rather than resolving the
// week it opens, and at some point it becomes public, which is the one thing
// about it that can never be taken back.

/**
 * Which way the looking runs.
 *
 * `directed` is the administration's own: an agency told to audit a program, a
 * review the President ordered. `received` is oversight of the administration,
 * which is the half that costs it anything. Both are on one board on purpose —
 * a president who opens six of their own reviews the week three are opened into
 * them is doing something legible, and a board that only showed one direction
 * could not show it.
 */
export type MatterDirection = "directed" | "received";

/**
 * Where a matter has got to.
 *
 * `opened` is the week the file is started and nobody outside the building
 * knows. `gathering` is the long middle: documents, interviews, the part an
 * administration can answer if it chooses to. `reported` is a finding on the
 * record. `closed` is over — kept rather than deleted, because what was looked
 * into is part of the record of a presidency whether or not it found anything.
 */
export type MatterStage = "opened" | "gathering" | "reported" | "closed";

/** One week of the proceeding, in the words the board prints. */
export type MatterBeat = {
  readonly turn: number;
  readonly description: string;
};

/**
 * Who is doing the looking.
 *
 * Kept as the body rather than as a label so a surface can name the actual
 * office — this department's inspector general, that committee of the Senate —
 * and so the pressure reading can tell an internal audit from a subpoena.
 */
export type MatterOrigin =
  | { readonly kind: "inspector-general"; readonly institution: InstitutionId }
  | { readonly kind: "committee"; readonly committee: string }
  /**
   * A special counsel: a prosecutor the Attorney General appoints out of a
   * matter the department can no longer be seen to handle itself.
   *
   * Carries the matter it grew out of rather than an office id, because that
   * is the whole of what distinguishes it from the department's own work. A
   * counsel is not a standing body that could open a file next week; it exists
   * because one specific inquiry got somewhere, and when a screen asks what it
   * is looking into, the honest answer names that inquiry.
   */
  | { readonly kind: "special-counsel"; readonly predicate: string };

export type OversightMatter = {
  readonly id: string; // "matter:<origin>:<subject key>:<opened turn>"
  /** The concealed act that an inspector's later finding establishes, when there is one. */
  readonly causeId?: string;
  /** The recorded interception this audit investigates; an unrelated audit supplies no attribution. */
  readonly surveillanceIncidentId?: string;
  readonly origin: MatterOrigin;
  readonly direction: MatterDirection;
  /** What is being looked into, in the words the board prints. */
  readonly subject: string;
  readonly openedTurn: number;
  readonly stage: MatterStage;
  /**
   * Whether the country knows about this.
   *
   * Set once and never unset, and the applier is what guarantees that rather
   * than the callers: a fact the public has is not a fact any later week can
   * take back, and a flag a writer could clear would make the whole board a
   * thing an administration could quietly tidy.
   */
  readonly public: boolean;
  /**
   * Whether this administration moved against the people conducting it.
   *
   * The single most expensive fact a matter can carry, and the reason it is
   * stored on the matter rather than counted somewhere else: what compounds is
   * not that an inspector general was removed, it is that one was removed while
   * they were in the middle of something.
   */
  readonly obstructed: boolean;
  readonly beats: readonly MatterBeat[];
  readonly closedTurn?: number;
  readonly finding?: string;
};

/**
 * The auditor inside a department.
 *
 * Seated at founding rather than appointed, because that is the fact of the
 * office: an incoming president inherits inspectors general already in post
 * and their inquiries already running. The President may remove one, and the
 * only thing standing between them and an empty office is the notice this
 * record holds.
 */
export type InspectorGeneral = {
  readonly institution: InstitutionId;
  readonly seatedTurn: number;
  /**
   * The day the President's written notice of intent to remove was filed, as an
   * ordinal week of the campaign.
   *
   * Absent on an inspector nobody has moved against. Its presence is the whole
   * of the constraint: the office is not empty yet, everyone can read that it
   * is about to be, and the weeks between the notice and the vacancy are weeks
   * the inquiry keeps running.
   */
  readonly noticeFiledTurn?: number;
  /** The reasons the President gave, on the record, in the order given. */
  readonly noticeReasons: readonly string[];
  /** Where the notice failed to give the detailed, case-specific reasons the law requires; absent on a notice that did. */
  readonly noticeDeficiencies?: readonly ("conclusory" | "no-such-record" | "outside-tenure" | "protected-audit")[];
  readonly removedTurn?: number;
};

export type OversightState = {
  /** Keyed by the institution the inspector serves in. */
  readonly inspectors: Readonly<Record<InstitutionId, InspectorGeneral>>;
  /** Every matter, open and closed, oldest first. */
  readonly matters: readonly OversightMatter[];
};

// --- The clocks -------------------------------------------------------------

// Written in days and converted where they are read, the same way the removal
// arc's are: a turn is one week today, and if that ever becomes a dial these
// have to keep meaning the same stretches of governing rather than silently
// becoming two or four times as long. `turnsFor` is the engine's one converter
// and lives in pace.ts, which imports nothing — so reading it here cannot join
// the value-import cycle this module already sits beside.

/** Three weeks of a file nobody outside the building has heard of yet. */
const MATTER_QUIET_DAYS = 21;

/**
 * How long the long middle runs: a quarter of a fictional year.
 *
 * The same span a removal proceeding gets, and for the same reason — long
 * enough that the administration has a real chance to answer, short enough that
 * the answer has to come inside one political season.
 */
const MATTER_RIPENS_DAYS = 84;

/** How long a filed report stands before the file is closed on it. */
const MATTER_REPORT_STANDS_DAYS = 28;

/**
 * The notice an inspector general is owed before the office can be emptied.
 *
 * Thirty days, in writing, with the reasons stated. It is not a veto — the
 * President may still do it — it is the fact that they cannot do it quietly or
 * quickly, which is the whole of what the protection is worth and the whole of
 * what makes firing one mid-inquiry a decision instead of a click.
 */
export const IG_REMOVAL_NOTICE_DAYS = 30;

/**
 * The notice period in weeks, converted where it is read rather than once at
 * module load.
 *
 * A function rather than a constant, and not a style choice: the effect gate
 * imports this module's writer and this module imports the turn loop's week
 * length, so a conversion done in the module body runs while that cycle is
 * still settling and quietly yields a not-a-number the whole file then
 * arithmetics with. Every other clock here is converted at its point of use for
 * the same reason.
 */
export function igRemovalNoticeTurns(): number {
  return turnsFor(IG_REMOVAL_NOTICE_DAYS);
}

/**
 * How long an obstructed matter is still counted against the administration
 * after it closes: half a fictional year.
 *
 * Only the obstruction carries past the close. The inquiry itself stops costing
 * anything the week it ends — that is what ending means — but a president who
 * removed the person conducting it does not get the account settled by the file
 * being shut, because shutting the file is what they were accused of.
 */
const OBSTRUCTION_MEMORY_DAYS = 168;

// --- Founding ---------------------------------------------------------------

/**
 * The institutions that have an inspector general.
 *
 * Every standing body of the executive branch that is not a component of
 * another one: a department has an auditor, and the bureaus inside it are
 * audited by their department's rather than by fourteen of their own. The other
 * branches are excluded because this is the executive's own internal auditor
 * and Congress is not audited by one — Congress is the other half of this file.
 *
 * Read off the catalog rather than listed, so a body the catalog adds gets an
 * auditor without this file changing, and one it removes stops having a
 * phantom.
 */
export const INSPECTED_INSTITUTIONS: readonly InstitutionId[] = INSTITUTION_CATALOG.filter(
  (def) =>
    def.parent === undefined &&
    def.kind !== "presidency" &&
    def.kind !== "legislature" &&
    def.kind !== "judiciary" &&
    def.kind !== "state-government",
).map((def) => def.id);

export function foundingOversight(turn = 1): OversightState {
  return {
    inspectors: Object.fromEntries(
      INSPECTED_INSTITUTIONS.map((institution) => [
        institution,
        { institution, seatedTurn: turn, noticeReasons: [] } satisfies InspectorGeneral,
      ]),
    ),
    matters: [],
  };
}

export function selectMatter(campaign: Campaign, id: string): OversightMatter | undefined {
  return campaign.oversight.matters.find((matter) => matter.id === id);
}

export function isMatterOpen(matter: OversightMatter): boolean {
  return matter.stage !== "closed";
}

export function selectOpenMatters(campaign: Campaign): readonly OversightMatter[] {
  return campaign.oversight.matters.filter(isMatterOpen);
}

/** Every matter this institution's own auditor has running, open or closed. */
export function selectMattersFor(campaign: Campaign, institution: InstitutionId): readonly OversightMatter[] {
  return campaign.oversight.matters.filter(
    (matter) => matter.origin.kind === "inspector-general" && matter.origin.institution === institution,
  );
}

export function selectInspector(campaign: Campaign, institution: InstitutionId): InspectorGeneral | undefined {
  return campaign.oversight.inspectors[institution];
}

/** Whether this auditor is in post: seated, and not yet removed. */
export function inspectorIsSeated(inspector: InspectorGeneral | undefined): inspector is InspectorGeneral {
  return inspector !== undefined && inspector.removedTurn === undefined;
}

/** The office the matter came out of, in the words a screen prints. */
export function matterSource(matter: OversightMatter): string {
  if (matter.origin.kind === "committee") return committeeName(matter.origin.committee);
  if (matter.origin.kind === "special-counsel") return "The Office of the Special Counsel";
  const def = institutionDef(matter.origin.institution);
  return def ? `Office of Inspector General, ${def.name}` : matter.origin.institution;
}

/** When the matter next moves on its own, as a week of the campaign. */
export function matterRipensTurn(matter: OversightMatter): number | undefined {
  const opened = matter.openedTurn;
  if (matter.stage === "opened") return opened + turnsFor(MATTER_QUIET_DAYS);
  if (matter.stage === "gathering") return opened + turnsFor(MATTER_QUIET_DAYS + MATTER_RIPENS_DAYS);
  if (matter.stage === "reported") {
    return opened + turnsFor(MATTER_QUIET_DAYS + MATTER_RIPENS_DAYS + MATTER_REPORT_STANDS_DAYS);
  }
  return undefined;
}

// --- What it costs ----------------------------------------------------------

/**
 * What each stage of an open matter is worth against the administration.
 *
 * A file nobody knows about is worth nothing, which is why `opened` is zero
 * rather than a small number: the week an inquiry is started is not a week the
 * presidency is in any trouble, and pricing it as one would make the mere
 * existence of an auditor a standing tax on governing. A filed report is worth
 * the most, because that is the week there is something to answer.
 */
const STAGE_WEIGHT: Readonly<Record<MatterStage, number>> = {
  opened: 0,
  gathering: 0.12,
  reported: 0.3,
  closed: 0,
};

/**
 * What moving against the people conducting an inquiry is worth.
 *
 * More than the inquiry itself at any stage, and deliberately so: the case
 * against a president is rarely the thing they were first asked about.
 */
const OBSTRUCTION_WEIGHT = 0.45;

/**
 * What the office doing the looking is worth, as a multiplier on the rest.
 *
 * An audit and a subpoena are the same weight because they are the same fact
 * about a president: somebody with standing is asking. A special counsel is not
 * — it is a prosecutor the department itself decided it could no longer be seen
 * to do this work without, appointed out of a matter that had already reported,
 * with nobody in the administration able to tell it what to do next. A little
 * over an ordinary inquiry rather than a great deal: what makes a counsel
 * expensive is mostly that its matter carries the facts that got it appointed,
 * not a number attached to the name.
 */
const ORIGIN_WEIGHT: Readonly<Record<MatterOrigin["kind"], number>> = {
  "inspector-general": 1,
  committee: 1,
  "special-counsel": 1.4,
};

function matterContribution(matter: OversightMatter, turn: number): number {
  return round3(rawContribution(matter, turn) * ORIGIN_WEIGHT[matter.origin.kind]);
}

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

function rawContribution(matter: OversightMatter, turn: number): number {
  if (matter.direction !== "received") return 0;
  // A matter the country has not heard of moves nothing on the Hill. It is on
  // the board because the President can see their own government's files; it is
  // not a fact anybody can act on until it is public.
  if (!matter.public) return 0;
  if (matter.stage === "closed") {
    const closed = matter.closedTurn ?? turn;
    const remembered = turn - closed < turnsFor(OBSTRUCTION_MEMORY_DAYS);
    return matter.obstructed && remembered ? OBSTRUCTION_WEIGHT : 0;
  }
  return STAGE_WEIGHT[matter.stage] + (matter.obstructed ? OBSTRUCTION_WEIGHT : 0);
}

/**
 * How much trouble the standing oversight of this administration is worth, 0..1.
 *
 * The third term the chamber reads about a presidency, beside how it is
 * regarded and how much force it has used without asking. It is deliberately
 * the same shape as the second one — a bounded count of specific, dated,
 * nameable facts rather than a mood — because that is what makes it something
 * a president can see coming and act on.
 *
 * Exported rather than folded into a caller because two branches need it and
 * they must not each grow their own: the Hill's disposition reads it as one of
 * the things Congress is currently looking at, and the removal arc reads it as
 * part of what an impeachment would be built out of. A record that entered both
 * accounts by two different formulas would be two different governments.
 */
export function selectOversightPressure(campaign: Campaign): number {
  const total = campaign.oversight.matters.reduce(
    (sum, matter) => sum + matterContribution(matter, campaign.turn),
    0,
  );
  return Math.max(0, Math.min(1, total));
}

// --- The one writer ---------------------------------------------------------

/**
 * A change to the oversight board.
 *
 * Whole records rather than patches, on the rule the funding record follows: a
 * matter and an inspector are both small, both keyed, and a patch-shaped writer
 * would need a merge rule per field that the callers would then have to agree
 * about. The one thing the applier does not take from a caller is the public
 * flag going back down.
 */
export type OversightEffect = {
  readonly kind: "oversight";
  /** Matters opened or advanced this week, each written whole and keyed by id. */
  readonly matters?: readonly OversightMatter[];
  /** Inspectors seated, noticed or removed this week, keyed by institution. */
  readonly inspectors?: readonly InspectorGeneral[];
};

function upsertMatter(
  matters: readonly OversightMatter[],
  next: OversightMatter,
): readonly OversightMatter[] {
  const existing = matters.find((matter) => matter.id === next.id);
  if (!existing) return [...matters, next];
  // The one rule no caller gets to break. Everything else about a matter can be
  // rewritten by the week it is in; what the country already knows cannot be
  // unknown, and enforcing that here rather than at each call site is what makes
  // it a property of the record instead of a convention.
  const settled: OversightMatter = { ...next, public: existing.public || next.public };
  return matters.map((matter) => (matter.id === next.id ? settled : matter));
}

export function applyOversight(state: Campaign, effect: OversightEffect): Campaign {
  const matters = (effect.matters ?? []).reduce(upsertMatter, state.oversight.matters);
  const inspectors = (effect.inspectors ?? []).reduce<Record<InstitutionId, InspectorGeneral>>(
    (acc, inspector) => ({ ...acc, [inspector.institution]: inspector }),
    { ...state.oversight.inspectors },
  );
  return { ...state, oversight: { inspectors, matters } };
}

// --- The week ---------------------------------------------------------------

/**
 * A matter's next stage, if its clock has run out this week.
 *
 * Nothing here reads the administration. A proceeding that ripened faster
 * because the President was unpopular would be the polls under another name,
 * and the whole reason this apparatus is worth modeling is that it is the one
 * thing on the board that does not care: once a file is open it moves on its
 * own schedule until it is finished, and the only week that changes anything is
 * the week somebody is removed.
 */
function ripened(matter: OversightMatter, turn: number): OversightMatter | undefined {
  const due = matterRipensTurn(matter);
  if (due === undefined || turn < due) return undefined;
  if (matter.stage === "opened") {
    return {
      ...matter,
      stage: "gathering",
      beats: [...matter.beats, { turn, description: `${matterSource(matter)} starts collecting documents.` }],
    };
  }
  if (matter.stage === "gathering") {
    const finding = `${matterSource(matter)} reports on ${matter.subject}.`;
    return {
      ...matter,
      stage: "reported",
      // A report is the week it stops being an internal matter. This is the one
      // transition that sets the public flag on its own, and it is why an
      // administration's window to answer an audit is the weeks before it, not
      // after.
      public: true,
      finding,
      beats: [...matter.beats, { turn, description: finding }],
    };
  }
  return {
    ...matter,
    stage: "closed",
    closedTurn: turn,
    beats: [...matter.beats, { turn, description: `${matterSource(matter)} ends its investigation.` }],
  };
}

/**
 * Every open matter's week.
 *
 * Separate from the two phases that open matters because ripening is the same
 * rule whoever started the file: an audit and a subpoena are different things
 * to receive and the same thing to sit through.
 */
export const oversightRipeningPhase: TurnPhase = (state: Campaign) => {
  const moved = state.oversight.matters.flatMap((matter) => {
    const next = ripened(matter, state.turn);
    return next ? [next] : [];
  });
  if (moved.length === 0) return [];
  const incident = state.security.intelligence.surveillanceIncident;
  const reporting = incident?.status === "recorded" ? moved.find((matter) => matter.stage === "reported"
    && matter.origin.kind === "inspector-general" && matter.origin.institution === "INST-DOD"
    && matter.surveillanceIncidentId === incident.id) : undefined;
  const finding = reporting && incident
    ? `The Defense inspector general publishes NSA collection log ${incident.id}, documenting intentional interception of a known U.S. person's private domestic message without consent, a FISA order, or any statutory exception.`
    : undefined;
  const reported = finding ? moved.map((matter) => matter.id === reporting?.id ? { ...matter, finding,
    beats: [...matter.beats.slice(0, -1), { turn: state.turn, description: finding }] } : matter) : moved;
  const withGraftFindings = reported.map((matter) => {
    if (matter.stage !== "reported" || !matter.causeId) return matter;
    const graft = state.ledger.find((entry) => entry.causal?.eventId === matter.causeId)?.causal?.graft;
    if (!graft || matter.origin.kind !== "inspector-general") return matter;
    const name = state.people[graft.person as keyof typeof state.people]?.base.name ?? "the former officeholder";
    const department = institutionDef(matter.origin.institution)?.name ?? matter.origin.institution;
    const text = `${matterSource(matter)} reports that ${name} steered contracts under the ${graft.account} purchasing appropriation at ${department}.`;
    return { ...matter, finding: text, beats: [...matter.beats.slice(0, -1), { turn: state.turn, description: text }] };
  });
  const graftCauseIds = withGraftFindings.flatMap((matter) => matter.stage === "reported" && matter.causeId ? [matter.causeId] : []);
  const effects: Effect[] = [{ kind: "oversight", matters: withGraftFindings }];
  if (finding && incident) effects.push({ kind: "intelligence", surveillanceIncident: { ...incident,
    exposedTurn: state.turn, status: "exposed" } });
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: withGraftFindings[0]!.beats.at(-1)!.description },
      ...(graftCauseIds.length > 0 ? { provenance: { origin: "world" as const, systems: ["oversight", "graft"],
        causeIds: graftCauseIds } } : {}),
      effects,
    },
  ] satisfies readonly EffectPacket[];
};
