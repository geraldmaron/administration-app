import type { NationId, Person, WhiteHouseStaffRoleId } from "@admin/world";
import { bandedAgainstList, orderByFit, type CandidateFit, type FitPresident } from "./cast-fit.js";

// The President's own staff: a chief of staff, a national security adviser and
// a press secretary.
//
// These are the President's hires, with no Senate vote, and until now the
// West Wing opened with the outgoing administration's career bench in it. Each
// post is drawn from the part of the cast that produces its kind of person in
// life: a chief of staff from the Hill, where the job is counting votes and
// running a room; a national security adviser from the foreign, defense and
// intelligence benches; a press secretary from the press. The ranking is the
// same fit every founding shortlist reads, and nobody from across the aisle is
// offered, because these are political offices.

/** The seats each staff post is drawn from. */
export const STAFF_BENCH_ROLES: Readonly<Record<WhiteHouseStaffRoleId, readonly string[]>> = {
  "role-chief-of-staff": ["role-congressional-leader", "role-committee-chair"],
  "role-national-security-adviser": ["role-foreign-minister", "role-defense-minister", "role-intelligence-director"],
  "role-press-secretary": ["role-journalist"],
};

export const STAFF_SHORTLIST = 5;

/** Whether this person is drawn from the right part of the cast for this post. */
export function onStaffBench(person: Person, nation: NationId, post: WhiteHouseStaffRoleId): boolean {
  return (
    (person.nationality as string) === (nation as string) &&
    person.eligibleRoles.some((role) => STAFF_BENCH_ROLES[post].includes(role as string))
  );
}

/** The shortlist for one post, best fit first, leaving out anyone the founding has already placed elsewhere. */
export function staffCandidates(
  pool: readonly Person[],
  nation: NationId,
  president: FitPresident,
  post: WhiteHouseStaffRoleId,
  placed: ReadonlySet<string> = new Set(),
): readonly CandidateFit[] {
  const bench = pool.filter((person) => onStaffBench(person, nation, post) && !placed.has(person.id as string));
  return bandedAgainstList(
    orderByFit(bench, president)
      .filter((candidate) => !candidate.crossesTheAisle)
      .slice(0, STAFF_SHORTLIST),
  );
}
