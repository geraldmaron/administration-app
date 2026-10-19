import {
  appointableRoles,
  defaultLeaderDraft,
  validLeadershipAnswers,
  type CandidateFit,
  type FoundingChoices,
  type FoundingMandate,
  type LeaderDraft,
  type RunningMateCandidate,
} from "@admin/engine";
import {
  WHITE_HOUSE_STAFF_ROLE_IDS,
  leaderBackgroundById,
  type Charter,
  type Nation,
  type PersonId,
  type PlankId,
  type RoleId,
  type WhiteHouseStaff,
  type WhiteHouseStaffRoleId,
} from "@admin/world";
import {
  cabinetSlate,
  charterFor,
  rankBench,
  runningMateSlate,
  staffSlate,
  type FoundingOptions,
  type RankedCandidate,
} from "@admin/player-core";
import { drawnFace, faceAtAge, faceOf, faceRef, withPresentation } from "./faces";
import { usableSeed } from "./seed";

// What the player has said so far, and nothing they have not. Every default
// (the first name on each shortlist, the best-balanced running mate, the best
// fit for each staff post) is derived from this draft on demand, the same way
// the seal derives it, so a choice the player never touched follows their
// party and politics instead of freezing at whatever was first on the screen.

export type FoundingDraft = {
  readonly setupMode?: "short" | "long";
  readonly customizeSetup?: boolean;
  /** Short setup where the team is drawn at random once the President is described. */
  readonly quickStart?: boolean;
  readonly questionnaire?: readonly (number | null)[];
  /** The order each ranked question was put in, since two orders can score the same. */
  readonly questionnaireRanks?: Readonly<Record<string, readonly number[]>>;
  readonly seedText: string;
  /** The seed in force when the field was last cleared, so an empty field never founds an empty world. */
  readonly lastValidSeed: string;
  readonly leader: LeaderDraft;
  readonly runningMate?: PersonId;
  readonly mandate?: FoundingMandate;
  readonly platform: readonly PlankId[];
  /** Planks promoted to first-hundred-days pledges. Always a subset of `platform`. */
  readonly priorities: readonly PlankId[];
  readonly staff: WhiteHouseStaff;
  readonly cabinet: Readonly<Record<string, PersonId>>;
};

/** The choices the seal reads, the first-hundred-days priorities among them. */
export type DraftChoices = FoundingChoices;

/** Stands in for a President with no name yet, so everything that reads the President can still be read. */
export const PROVISIONAL_NAME = "The President";

/**
 * The President as the shortlists and the preview read them. A blank name is
 * replaced by the stand-in, because the engine draws a birthplace from the
 * name and the ticket is balanced against it; reading both sides with the
 * same stand-in keeps the screen's defaults and the rail's in agreement.
 */
export function readableLeader(leader: LeaderDraft): LeaderDraft {
  return leader.name.trim().length > 0 ? leader : { ...leader, name: PROVISIONAL_NAME };
}

export function openingDraft(seed: string): FoundingDraft {
  return { seedText: seed, lastValidSeed: seed, leader: defaultLeaderDraft(), platform: [], priorities: [], staff: {}, cabinet: {} };
}

export function draftSeed(draft: FoundingDraft): string {
  return usableSeed(draft.seedText, draft.lastValidSeed);
}

/** The long path cannot seal an earlier profile after its answers have changed. */
export function needsLeadershipReview(draft: FoundingDraft): boolean {
  if (draft.setupMode !== "long") return false;
  const applied = draft.leader.leadershipAnswers;
  return !applied || !validLeadershipAnswers(applied) || (draft.questionnaire !== undefined && (draft.questionnaire.length !== 20 || draft.questionnaire.some((answer, index) => answer !== applied.values[index])));
}

// --- Changes the player makes -------------------------------------------------

/** A new seed is a new cast, so every pick made from the old one is let go. */
export function withSeedText(draft: FoundingDraft, seedText: string): FoundingDraft {
  const before = draftSeed(draft);
  const lastValidSeed = seedText.trim().length > 0 ? seedText.trim() : draft.lastValidSeed;
  const next = { ...draft, seedText, lastValidSeed };
  if (draftSeed(next) === before) return next;
  const { runningMate: _mate, ...rest } = next;
  return { ...rest, staff: {}, cabinet: {} };
}

/**
 * The President's face through every edit to the biography: drawn the moment a
 * presentation is stated, turned to a new presentation rather than thrown away
 * when that changes, and dropped only when it no longer reads at all.
 */
function keptFace(leader: LeaderDraft): LeaderDraft {
  const { portraitRef: ref, presentation } = leader;
  if (ref === undefined) {
    return presentation === undefined ? leader : { ...leader, portraitRef: faceRef(drawnFace(presentation, leader.age, leader.name || "president")) };
  }
  const face = faceOf(ref, leader.age);
  if (face === undefined) {
    const { portraitRef: _unreadable, ...rest } = leader;
    return rest;
  }
  if (presentation !== undefined && face.presentation !== presentation) return { ...leader, portraitRef: faceRef(withPresentation(face, presentation)) };
  return { ...leader, portraitRef: faceAtAge(ref, leader.age) };
}

/**
 * Amends the biography. A new career pulls the age into its own window,
 * because the seal refuses an age outside it and the player never asked to be
 * refused for a field they did not touch; a new presentation lets go of a face
 * drawn for another one.
 */
export function withLeader(draft: FoundingDraft, change: Partial<LeaderDraft>): FoundingDraft {
  const merged = { ...draft.leader, ...change };
  const background = leaderBackgroundById.get(merged.backgroundId as string);
  const age = background && change.backgroundId !== undefined
    ? Math.min(Math.max(merged.age, background.ageRange.min), background.ageRange.max)
    : merged.age;
  return { ...draft, leader: keptFace({ ...merged, age }) };
}

export function withoutLeaderField(draft: FoundingDraft, field: "homeState" | "presentation" | "pronouns" | "portraitRef"): FoundingDraft {
  const { [field]: _dropped, ...rest } = draft.leader;
  return { ...draft, leader: rest as LeaderDraft };
}

export function withSeat(draft: FoundingDraft, role: string, person: PersonId): FoundingDraft {
  return { ...draft, cabinet: { ...draft.cabinet, [role]: person } };
}

export function withRunningMate(draft: FoundingDraft, person: PersonId): FoundingDraft {
  return { ...draft, runningMate: person };
}

export function withStaff(draft: FoundingDraft, post: WhiteHouseStaffRoleId, person: PersonId): FoundingDraft {
  return { ...draft, staff: { ...draft.staff, [post]: person } };
}

export function withMandate(draft: FoundingDraft, mandate: FoundingMandate | undefined): FoundingDraft {
  if (mandate !== undefined) return { ...draft, mandate };
  const { mandate: _declared, ...rest } = draft;
  return rest;
}

export function togglePlank(draft: FoundingDraft, plank: PlankId): FoundingDraft {
  if (!draft.platform.includes(plank)) return { ...draft, platform: [...draft.platform, plank] };
  return { ...draft, platform: draft.platform.filter((id) => id !== plank), priorities: draft.priorities.filter((id) => id !== plank) };
}

export function togglePriority(draft: FoundingDraft, plank: PlankId): FoundingDraft {
  if (draft.priorities.includes(plank)) return { ...draft, priorities: draft.priorities.filter((id) => id !== plank) };
  return draft.platform.includes(plank) ? { ...draft, priorities: [...draft.priorities, plank] } : draft;
}

// --- What the draft resolves to ---------------------------------------------

export type FoundingSeats = {
  readonly nation: Nation;
  readonly charter: Charter;
  readonly leadRole: RoleId;
  /** The chairs the player appoints, in the charter's order. The lead chair is the President's own. */
  readonly departments: readonly RoleId[];
};

/** The one playable nation and the constitution it names, the same answer `openingChoices` gives. */
export function foundingSeats(options: FoundingOptions): FoundingSeats {
  const nation = options.nations[0];
  const charter = nation ? charterFor(options, nation.identity.government as string) : undefined;
  const leadRole = charter?.cabinetRoles[0];
  if (!nation || !charter || !leadRole) throw new Error("The shipped dataset has no playable nation or charter to found under.");
  return { nation, charter, leadRole, departments: appointableRoles(charter) };
}

export type SeatedCast = {
  readonly cabinet: Readonly<Record<string, PersonId>>;
  readonly runningMate?: PersonId;
  readonly staff: WhiteHouseStaff;
};

export type ResolvedFounding = {
  readonly seed: string;
  readonly seats: FoundingSeats;
  readonly cabinetSlates: Readonly<Record<string, readonly RankedCandidate[]>>;
  readonly runningMates: readonly RunningMateCandidate[];
  readonly staffSlates: Readonly<Record<WhiteHouseStaffRoleId, readonly CandidateFit[]>>;
  /** Who each post would seat right now: the player's pick, or the default the seal would take. */
  readonly seated: SeatedCast;
  readonly choices: DraftChoices;
};

function rankedCabinet(options: FoundingOptions, seats: FoundingSeats, leader: LeaderDraft): Readonly<Record<string, readonly RankedCandidate[]>> {
  const slate = cabinetSlate(options, seats.charter, seats.nation, leader);
  return Object.fromEntries(seats.departments.map((role) => [role as string, rankBench(slate[role] ?? [], leader)]));
}

function seatedCabinet(departments: readonly RoleId[], slates: Readonly<Record<string, readonly RankedCandidate[]>>, picks: FoundingDraft["cabinet"]): Record<string, PersonId> {
  return Object.fromEntries(
    departments.flatMap((role) => {
      const list = slates[role as string] ?? [];
      const chosen = list.find((row) => row.person.id === picks[role as string]) ?? list[0];
      return chosen ? [[role as string, chosen.person.id] as const] : [];
    }),
  );
}

/**
 * The staff shortlists, filled post by post in the seal's own order: each
 * default leaves out the ticket, the cabinet, every post the player named and
 * every post already filled above it.
 */
function staffing(
  options: FoundingOptions,
  draft: FoundingDraft,
  cabinet: Readonly<Record<string, PersonId>>,
  runningMate: PersonId | undefined,
): { readonly slates: Record<WhiteHouseStaffRoleId, readonly CandidateFit[]>; readonly seated: WhiteHouseStaff } {
  return WHITE_HOUSE_STAFF_ROLE_IDS.reduce(
    (acc, post) => {
      const placed = { ...draft.staff, ...acc.seated };
      const slate = staffSlate(options, { leader: readableLeader(draft.leader), cabinet, ...(runningMate ? { runningMate } : {}), staff: placed }, post);
      const pick = slate.find((row) => row.person.id === draft.staff[post])?.person.id ?? slate[0]?.person.id;
      return { slates: { ...acc.slates, [post]: slate }, seated: pick ? { ...acc.seated, [post]: pick } : acc.seated };
    },
    { slates: {} as Record<WhiteHouseStaffRoleId, readonly CandidateFit[]>, seated: {} as WhiteHouseStaff },
  );
}

/**
 * Every shortlist the draft opens, who each post would seat, and the choices
 * the seal reads. Only what the player chose is sent for the running mate and
 * the staff: the seal fills the rest itself, by the same rule this mirrors.
 */
export function resolveFounding(options: FoundingOptions, draft: FoundingDraft): ResolvedFounding {
  const seats = foundingSeats(options);
  const cabinetSlates = rankedCabinet(options, seats, draft.leader);
  const cabinet = seatedCabinet(seats.departments, cabinetSlates, draft.cabinet);
  const reader = readableLeader(draft.leader);
  const runningMates = runningMateSlate(options, { leader: reader, cabinet, staff: draft.staff });
  const chosenMate = runningMates.find((row) => row.person.id === draft.runningMate)?.person.id;
  const runningMate = chosenMate ?? runningMates[0]?.person.id;
  const staff = staffing(options, draft, cabinet, runningMate);
  const chosenStaff = Object.fromEntries(
    WHITE_HOUSE_STAFF_ROLE_IDS.flatMap((post) => (draft.staff[post] && staff.seated[post] === draft.staff[post] ? [[post, draft.staff[post]] as const] : [])),
  ) as WhiteHouseStaff;
  const choices: DraftChoices = {
    cabinet,
    leader: draft.leader,
    ...(chosenMate ? { runningMate: chosenMate } : {}),
    platform: draft.platform,
    firstHundredDays: draft.priorities.filter((plank) => draft.platform.includes(plank)),
    staff: chosenStaff,
    ...(draft.mandate ? { mandate: draft.mandate } : {}),
  };
  return {
    seed: draftSeed(draft),
    seats,
    cabinetSlates,
    runningMates,
    staffSlates: staff.slates,
    seated: { cabinet, ...(runningMate ? { runningMate } : {}), staff: staff.seated },
    choices,
  };
}
