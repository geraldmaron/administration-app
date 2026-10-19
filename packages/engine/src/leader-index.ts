import type { NationId, PersonId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";

// The cast sorted by country, built once per cast and kept beside it.
//
// Who leads a capital is read off the cast: whoever holds the chair, or failing
// that the table's incumbent, or failing that the strongest living candidate.
// Read the plain way that is a pass over all seven thousand people, and the
// agent asks it for the actor and the target of every candidate move it prices,
// so a week of the world became tens of thousands of whole-cast scans. The cast
// is replaced, never edited, whenever anyone in it changes, so an index keyed by
// the cast object is exactly as fresh as the cast and is dropped with it.

type CastIndex = {
  readonly byNation: ReadonlyMap<string, readonly PersonRuntime[]>;
  readonly leaders: Map<string, PersonRuntime | null>;
  readonly rapport: Map<string, number>;
};

const indexes = new WeakMap<Campaign["people"], CastIndex>();

function buildIndex(people: Campaign["people"]): CastIndex {
  const byNation = new Map<string, PersonRuntime[]>();
  for (const runtime of Object.values(people)) {
    const nation = runtime.base.nationality as string;
    const bucket = byNation.get(nation);
    if (bucket) bucket.push(runtime);
    else byNation.set(nation, [runtime]);
  }
  return { byNation, leaders: new Map(), rapport: new Map() };
}

function indexOf(people: Campaign["people"]): CastIndex {
  const known = indexes.get(people);
  if (known) return known;
  const built = buildIndex(people);
  indexes.set(people, built);
  return built;
}

/** Everyone of one nationality in the cast, living or not, in the cast's own order. */
export function nationalsOf(campaign: Campaign, nation: NationId): readonly PersonRuntime[] {
  return indexOf(campaign.people).byNation.get(nation as string) ?? [];
}

/**
 * The person `find` names as a nation's leader, worked out once per cast.
 * `lead` is in the key because a chair is named by the nation's charter, and a
 * campaign that changed one would otherwise read the old chair's holder.
 */
export function rememberedLeader(
  campaign: Campaign,
  nation: NationId,
  lead: string,
  find: () => PersonRuntime | undefined,
): PersonRuntime | undefined {
  const { leaders } = indexOf(campaign.people);
  const key = `${nation as string}|${lead}`;
  const known = leaders.get(key);
  if (known !== undefined) return known ?? undefined;
  const found = find();
  leaders.set(key, found ?? null);
  return found;
}

/**
 * A rapport `find` reads between two leaders, worked out once per cast and per
 * pair. Keyed by the two people rather than their countries, because the
 * President's chair is read off the administration rather than off the cast.
 */
export function rememberedRapport(campaign: Campaign, from: PersonId, to: PersonId, find: () => number): number {
  const { rapport } = indexOf(campaign.people);
  const key = `${from as string}|${to as string}`;
  const known = rapport.get(key);
  if (known !== undefined) return known;
  const found = find();
  rapport.set(key, found);
  return found;
}

// --- Measurement only --------------------------------------------------------

let personalityOn = true;

/** Whether foreign leaders' own character reaches their governments' decisions. Always true outside a measurement. */
export function leaderPersonalityOn(): boolean {
  return personalityOn;
}

/**
 * Runs `measure` with foreign leaders' own character switched off — the lean
 * the leader in office at the start puts on their government, the two axes
 * their traits fill, and their rapport with the leader across the table — so a
 * battery can measure the world with and without it from one copy of the code.
 * Restored on the way out, thrown or not, so nothing outside the run sees it off.
 */
export function withoutLeaderPersonality<T>(measure: () => T): T {
  const previous = personalityOn;
  personalityOn = false;
  try {
    return measure();
  } finally {
    personalityOn = previous;
  }
}
