import type { BriefMatter, PlaceKey } from "@admin/player-core";
import { currentPlace } from "../modes";

/**
 * One thing a nav badge counts, tied to the part of a page that shows it.
 * `version` changes when the thing needs fresh attention (a new deadline, a
 * sharper urgency, a different set of orders), so a mark the player has seen
 * turns new again instead of staying quiet through a change.
 */
export type AttentionMark = {
  readonly id: string;
  readonly place: PlaceKey;
  /** What it is, in a line, for the "Waiting on you here" list. */
  readonly title: string;
  /** Separate subject and status for compact standing-work rows; title remains the badge announcement. */
  readonly subject?: string;
  readonly status?: string;
  /** The full link to the section that shows it, query and hash included. */
  readonly href: string;
  /** The page that shows it, without query or hash. */
  readonly path: string;
  /** The id of the section on that page that shows it, when the link names one. */
  readonly anchor?: string;
  readonly version: string;
};

/** Seen state per mark id: the version the player last saw. */
export type SeenLedger = Readonly<Record<string, string>>;

export type PlaceCount = { readonly fresh: number; readonly waiting: number };

function parts(href: string): { readonly path: string; readonly anchor?: string } {
  const [beforeHash, anchor] = href.split("#", 2);
  const path = (beforeHash ?? href).split("?")[0] ?? href;
  return anchor ? { path, anchor } : { path };
}

function versionOf(matter: BriefMatter): string {
  const due = matter.due ?? matter.clock?.due;
  return `${due ? `${due.year}-${due.month}-${due.day}` : "open"}|${matter.urgency}`;
}

/**
 * A Desk matter is counted under the place its answer lives, as before, and a
 * matter that holds time is also counted on the Brief, where its row is the
 * thing to see. Matters answered on the Brief's own pages count only there.
 */
function matterMarks(matter: BriefMatter): readonly AttentionMark[] {
  const version = versionOf(matter);
  const marks: AttentionMark[] = [];
  if (matter.href) {
    const { path, anchor } = parts(matter.href);
    const place = currentPlace(path);
    if (place && place !== "brief" && place !== "digest") marks.push({ id: matter.id, place, title: matter.title, href: matter.href, path, version, ...(anchor ? { anchor } : {}) });
  }
  if (matter.holds) marks.push({ id: matter.id, place: "brief", title: matter.title, href: "/brief", path: "/brief", version });
  return marks;
}

export function attentionMarks(matters: readonly BriefMatter[], standing: readonly AttentionMark[]): readonly AttentionMark[] {
  return [...matters.flatMap(matterMarks), ...standing];
}

export function isFresh(mark: AttentionMark, ledger: SeenLedger): boolean {
  return ledger[mark.id] !== mark.version;
}

/** New and still-waiting counts per place, each mark counted once per place. */
export function countsByPlace(marks: readonly AttentionMark[], ledger: SeenLedger): Partial<Record<PlaceKey, PlaceCount>> {
  const counts: Partial<Record<PlaceKey, PlaceCount>> = {};
  const counted = new Set<string>();
  for (const mark of marks) {
    const key = `${mark.place}>${mark.id}`;
    if (counted.has(key)) continue;
    counted.add(key);
    const now = counts[mark.place] ?? { fresh: 0, waiting: 0 };
    counts[mark.place] = { fresh: now.fresh + (isFresh(mark, ledger) ? 1 : 0), waiting: now.waiting + 1 };
  }
  return counts;
}

/** The ledger with these marks recorded at their current version, and nothing kept for marks that no longer exist. */
export function withSeen(ledger: SeenLedger, seen: readonly AttentionMark[], live: readonly AttentionMark[]): SeenLedger {
  const liveIds = new Set(live.map((mark) => mark.id));
  const kept = Object.fromEntries(Object.entries(ledger).filter(([id]) => liveIds.has(id)));
  return { ...kept, ...Object.fromEntries(seen.map((mark) => [mark.id, mark.version])) };
}

/** The marks the page at `pathname` shows, by section. */
export function marksOnPage(marks: readonly AttentionMark[], pathname: string): readonly AttentionMark[] {
  const here = pathname.replace(/\/$/, "") || "/";
  return marks.filter((mark) => mark.path.replace(/\/$/, "") === here);
}
