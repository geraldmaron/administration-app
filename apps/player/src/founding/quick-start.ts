import { FOUNDING_MANDATES } from "@admin/engine";
import { WHITE_HOUSE_STAFF_ROLE_IDS, type PersonId, type WhiteHouseStaff } from "@admin/world";
import type { FoundingOptions } from "@admin/player-core";
import { resolveFounding, type FoundingDraft } from "./draft";

// Quick start: the player says who they are, and the rest of the team is drawn
// at random from the same shortlists the other paths offer. A draw stays
// inside what the seal accepts by drawing only from those shortlists, never
// seating one person twice, and leaving out anyone the shortlist rates a poor
// fit, unless the poor fits are all there is.

export type Random = () => number;

function pick<T>(rows: readonly T[], random: Random): T | undefined {
  if (rows.length === 0) return undefined;
  return rows[Math.floor(random() * rows.length) % rows.length];
}

function playable<T extends { readonly band: string }>(rows: readonly T[]): readonly T[] {
  const fit = rows.filter((row) => row.band !== "poor");
  return fit.length > 0 ? fit : rows;
}

function withoutPicks(draft: FoundingDraft): FoundingDraft {
  const { runningMate: _mate, mandate: _mandate, ...rest } = draft;
  return { ...rest, cabinet: {}, staff: {} };
}

function drawCabinet(options: FoundingOptions, draft: FoundingDraft, random: Random): Readonly<Record<string, PersonId>> {
  const resolved = resolveFounding(options, draft);
  return resolved.seats.departments.reduce<Record<string, PersonId>>((seated, role) => {
    const taken = new Set<string>(Object.values(seated));
    const rows = playable(resolved.cabinetSlates[role as string] ?? []).filter((row) => !taken.has(row.person.id));
    const chosen = pick(rows, random);
    return chosen ? { ...seated, [role as string]: chosen.person.id } : seated;
  }, {});
}

function drawRunningMate(options: FoundingOptions, draft: FoundingDraft, random: Random): PersonId | undefined {
  return pick(playable(resolveFounding(options, draft).runningMates), random)?.person.id;
}

/** Staff are drawn post by post, in the seal's own order, so each shortlist already leaves out everyone seated above it. */
function drawStaff(options: FoundingOptions, draft: FoundingDraft, random: Random): WhiteHouseStaff {
  return WHITE_HOUSE_STAFF_ROLE_IDS.reduce<WhiteHouseStaff>((staff, post) => {
    const slate = resolveFounding(options, { ...draft, staff }).staffSlates[post] ?? [];
    const chosen = pick(playable(slate), random);
    return chosen ? { ...staff, [post]: chosen.person.id } : staff;
  }, {});
}

/** A whole team for the President the draft describes: Cabinet, running mate, White House staff and the size of the win. */
export function drawTeam(options: FoundingOptions, draft: FoundingDraft, random: Random = Math.random): FoundingDraft {
  const base = withoutPicks(draft);
  const cabinet = drawCabinet(options, base, random);
  const seated = { ...base, cabinet };
  const runningMate = drawRunningMate(options, seated, random);
  const ticket = runningMate ? { ...seated, runningMate } : seated;
  const staff = drawStaff(options, ticket, random);
  const mandate = pick(FOUNDING_MANDATES, random);
  return { ...ticket, staff, ...(mandate ? { mandate } : {}) };
}
