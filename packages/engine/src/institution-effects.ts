import { currentEventId } from "./causality.js";
import type { Campaign } from "./state.js";
import type { InstitutionId, InstitutionRuntime, InstitutionTick } from "./institutions.js";
import { institutionDef, deriveImplementationQuality, leaderCompetenceOf, leadsInstitution, officeInstitution, seatOfficer } from "./institutions.js";
import type { Directive, DirectiveId } from "./directives.js";
import type { Nomination, NominationId } from "./nomination.js";
import type { NominationStage } from "./nomination-stages.js";
import type { ServiceRuntime } from "./services.js";
import type { ProjectRuntime } from "./projects.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { withoutVicePresident, withVicePresident } from "./vice-president.js";

// The two writers for the executive-branch graph, kept beside their domain
// rather than inside effects.ts for the same reason the cohort and state
// geography writers are: the mutation gate stays one dispatch table, and the
// rules for a domain live with the domain.

export type InstitutionEffect = {
  readonly kind: "institution";
  /** The week's routine drift, one entry per institution that moved. */
  readonly ticks?: readonly InstitutionTick[];
  /** Institutions whose acting authority ran out this week. */
  readonly actingLapsed?: readonly InstitutionId[];
  /**
   * Instructions issued this week, each written whole and keyed by id.
   *
   * Carried on the institution effect rather than on one of its own, because a
   * directive is never a fact about the record alone: the same week it is
   * written the body it was pointed at gains politicization and oversight, and
   * splitting the two across two effects would let a save exist in which the
   * memorandum was filed and nobody was charged for it.
   */
  readonly directives?: readonly Directive[];
  /** A direct change to one institution — its leader, its politicization, its budget. */
  readonly institution?: InstitutionId;
  readonly changes?: Partial<InstitutionRuntime>;
  /**
   * Empty the named institution's top office.
   *
   * Its own field rather than `changes: { leader: undefined }` because an
   * explicit undefined does not survive the JSON round trip a save is: the key
   * has to be deleted, and only a writer can delete it. The same rule
   * `seatCabinetOffice` follows for an emptied cabinet chair.
   */
  readonly vacate?: true;
  /** The week's service records, each written whole and keyed by its id. */
  readonly services?: readonly ServiceRuntime[];
  /** The week's grant programs, each written whole and keyed by its id. */
  readonly projects?: readonly ProjectRuntime[];
};

export type NominationAdvance = {
  readonly id: NominationId;
  readonly stage: NominationStage;
  readonly day: number;
  readonly note: string;
  readonly outcome?: string;
};

export type NominationEffect = {
  readonly kind: "nomination";
  /** A nomination opening, recorded whole. */
  readonly nomination?: Nomination;
  /** An existing nomination moving to its next stage. */
  readonly advance?: NominationAdvance;
};

function withDerived(
  people: Campaign["people"],
  runtime: InstitutionRuntime,
  changes: Partial<InstitutionRuntime>,
): InstitutionRuntime {
  const next = { ...runtime, ...changes };
  const def = institutionDef(runtime.id);
  // Implementation quality is never written by a caller: it is what the other
  // fields add up to, so a handler that let one through would let a surface
  // claim delivery the state does not support.
  return def ? { ...next, implementationQuality: deriveImplementationQuality(next, def, leaderCompetenceOf({ people }, next)) } : next;
}

/**
 * File the week's instructions, and stamp each one onto the body it was given
 * to.
 *
 * The join is written here rather than by the caller for the reason
 * `seatCabinetOffice` seats a minister in both records at once: a directive
 * that existed in the store and not on the institution would be an instruction
 * no screen reading the agency could find.
 */
function fileDirectives(
  state: Campaign,
  institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>,
  filed: readonly Directive[],
): {
  readonly directives: Readonly<Record<DirectiveId, Directive>>;
  readonly institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>;
} {
  const directives: Record<DirectiveId, Directive> = { ...(state.directives ?? {}) };
  const next: Record<InstitutionId, InstitutionRuntime> = { ...institutions };
  for (const directive of filed) {
    directives[directive.id] = directive;
    const runtime = next[directive.institution];
    if (!runtime || runtime.directives.includes(directive.id)) continue;
    next[directive.institution] = { ...runtime, directives: [...runtime.directives, directive.id] };
  }
  return { directives, institutions: next };
}

export function applyInstitution(state: Campaign, effect: InstitutionEffect): Campaign {
  let institutions = state.institutions;
  let directives = state.directives;

  if (effect.directives && effect.directives.length > 0) {
    const filed = fileDirectives(state, institutions, effect.directives);
    directives = filed.directives;
    institutions = filed.institutions;
  }

  if (effect.ticks) {
    const next: Record<InstitutionId, InstitutionRuntime> = { ...institutions };
    for (const tick of effect.ticks) {
      const runtime = next[tick.id];
      if (!runtime) continue;
      next[tick.id] = { ...runtime, ...tick.changes };
    }
    institutions = next;
  }

  if (effect.actingLapsed && effect.actingLapsed.length > 0) {
    const next: Record<InstitutionId, InstitutionRuntime> = { ...institutions };
    for (const id of effect.actingLapsed) {
      const runtime = next[id];
      if (!runtime) continue;
      // The authority lapses, the office does not fill itself: what is left is
      // a vacancy with nobody signing, which is the actual consequence the
      // Vacancies Act's time limit produces.
      const { actingLeader: _dropped, actingExpiresDay: _expired, ...rest } = runtime;
      next[id] = withDerived(state.people, rest as InstitutionRuntime, { vacancy: true });
    }
    institutions = next;
  }

  if (effect.institution && (effect.changes || effect.vacate)) {
    const runtime = institutions[effect.institution];
    if (runtime) {
      const { leader: _departed, actingLeader: _acting, actingExpiresDay: _expires, ...emptied } = runtime;
      // The vacancy clock restarts from the removal rather than carrying the
      // last one's total: what the delivery reading is about is how long
      // nobody has been in this chair.
      const base = effect.vacate ? (emptied as InstitutionRuntime) : runtime;
      const changes = effect.vacate
        ? { vacancy: true as const, vacantDays: 0, ...effect.changes }
        : effect.changes!;
      institutions = { ...institutions, [effect.institution]: withDerived(state.people, base, changes) };
    }
  }

  const services =
    effect.services && effect.services.length > 0
      ? { ...(state.services ?? {}), ...Object.fromEntries(effect.services.map((service) => [service.id, service])) }
      : state.services;

  const projects =
    effect.projects && effect.projects.length > 0
      ? { ...(state.projects ?? {}), ...Object.fromEntries(effect.projects.map((program) => [program.id, program])) }
      : state.projects;

  // The vice presidency empties the Senate's chair as well, and that must not
  // depend on the office having a runtime to empty.
  const vacatesVicePresident = effect.vacate === true && effect.institution === VICE_PRESIDENCY_INSTITUTION_ID;
  if (institutions === state.institutions && directives === state.directives && services === state.services && projects === state.projects) {
    return vacatesVicePresident ? withoutVicePresident(state) : state;
  }
  const next = { ...state, institutions, directives, ...(services ? { services } : {}), ...(projects ? { projects } : {}) };
  return vacatesVicePresident ? withoutVicePresident(next) : next;
}

// A confirmed leader lifts morale a little: the building reads it as being
// taken seriously, whoever the person is.
const CONFIRMATION_MORALE_LIFT = 0.05;

/**
 * Confirmation is the moment the institution stops being headless. The body,
 * its cabinet chair where it has one, and the person all move through the one
 * writer (`seatOfficer`), or a confirmed officer still reads as unseated to
 * anything walking the cast — the confirmed Administrator of FEMA offered for
 * the CDC the next time the President filled a vacancy.
 *
 * Only the office a body's leader holds seats anybody. A deputy's office has no
 * record of its own to seat, and treating it as the top chair made a confirmed
 * Deputy Secretary the Secretary, displacing whoever the Senate was about to
 * confirm for the chair itself.
 */
function seatConfirmed(state: Campaign, nomination: Nomination): Campaign {
  const institution = officeInstitution(nomination.office);
  const before = institution ? state.institutions[institution.id] : undefined;
  if (!institution || !before || !leadsInstitution(nomination.office)) return state;
  const seated = seatOfficer(state, institution.id, nomination.nominee);
  const led = seated.institutions[institution.id]!;
  const judicial = institution.kind === "judiciary"
    ? { judicialProvenance: { serviceStartYear: state.calendar.year, appointingParty: state.congress.administrationParty }, judicialAssessmentYear: state.calendar.year }
    : {};
  const lowerBenchSeat = before.lowerBenchSeat
    ? { lowerBenchSeat: { ...before.lowerBenchSeat, appointingParty: state.congress.administrationParty } }
    : {};
  const filled: Campaign = {
    ...seated,
    institutions: {
      ...seated.institutions,
      [institution.id]: withDerived(seated.people, led, { morale: Math.min(1, before.morale + CONFIRMATION_MORALE_LIFT), ...judicial, ...lowerBenchSeat }),
    },
  };
  return institution.id === VICE_PRESIDENCY_INSTITUTION_ID ? withVicePresident(filled, nomination.nominee) : filled;
}

export function applyNomination(state: Campaign, effect: NominationEffect): Campaign {
  let nominations = state.nominations;
  let confirmed: Nomination | undefined;

  if (effect.nomination) {
    // The event that sent the name up, written here because it is only
    // knowable inside the fold. The confirmation phase reads it back off
    // months later to name what it is finishing.
    const event = currentEventId();
    const opened =
      effect.nomination.causedBy === undefined && event !== undefined
        ? { ...effect.nomination, causedBy: event }
        : effect.nomination;
    nominations = { ...nominations, [opened.id]: opened };
  }

  if (effect.advance) {
    const existing = nominations[effect.advance.id];
    if (existing) {
      const advanced: Nomination = {
        ...existing,
        stage: effect.advance.stage,
        stageEnteredDay: effect.advance.day,
        history: [
          ...existing.history,
          { stage: effect.advance.stage, day: effect.advance.day, note: effect.advance.note },
        ],
        ...(effect.advance.outcome ? { outcome: effect.advance.outcome } : {}),
      };
      nominations = { ...nominations, [effect.advance.id]: advanced };
      if (effect.advance.stage === "confirmed") confirmed = existing;
    }
  }

  if (nominations === state.nominations) return state;
  const next = { ...state, nominations };
  return confirmed ? seatConfirmed(next, confirmed) : next;
}
