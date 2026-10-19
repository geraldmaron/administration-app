import { formatDate } from "../format/figures.js";
import { isRetiredStatus, type CampaignSummary } from "./save-store";

/**
 * One saved administration, as the replace-a-slot chooser shows it.
 *
 * Everything the chooser prints is decided here rather than in the sheet so the
 * order, the default and the sentence the player confirms against are one
 * tested account of what is about to be lost.
 */
export type ReplacementCandidate = {
  readonly id: string;
  readonly name: string;
  readonly leader: string;
  readonly dateLabel: string;
  readonly savedAt: number | null;
  readonly inPlay: boolean;
  /** The save cannot be continued, so replacing it loses a record rather than a game. */
  readonly unplayable: boolean;
  /** Its bytes are still worth a copy: intact but retired, or healthy. Damaged payloads have nothing to give back. */
  readonly exportable: boolean;
};

function readableDate(label: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  return match ? formatDate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }) : label;
}

function toCandidate(summary: CampaignSummary, activeCampaignId: string | null): ReplacementCandidate {
  const healthy = summary.status === "healthy";
  return {
    id: summary.id,
    name: summary.name,
    leader: summary.leader,
    dateLabel: readableDate(summary.date),
    savedAt: summary.savedAt,
    // An unreadable active row is not a term being played, so it carries no in-play warning.
    inPlay: summary.id === activeCampaignId && healthy,
    unplayable: !healthy,
    exportable: healthy || isRetiredStatus(summary.status),
  };
}

const age = (candidate: ReplacementCandidate): number => candidate.savedAt ?? 0;

/**
 * Every saved administration in the order the chooser lists them: saves that can
 * no longer be continued first (they cost the player least), then the rest from
 * the longest untouched, with the one in play last so it is the hardest to reach
 * by accident.
 */
export function replacementCandidates(campaigns: readonly CampaignSummary[], activeCampaignId: string | null): readonly ReplacementCandidate[] {
  const rank = (candidate: ReplacementCandidate): number => (candidate.inPlay ? 2 : candidate.unplayable ? 0 : 1);
  return campaigns
    .map((summary) => toCandidate(summary, activeCampaignId))
    .sort((a, b) => rank(a) - rank(b) || age(a) - age(b) || a.name.localeCompare(b.name));
}

/** The slot the chooser preselects: the first in order, unless that is the one in play, which is never a default. */
export function defaultReplacementId(candidates: readonly ReplacementCandidate[]): string | null {
  return candidates.find((candidate) => !candidate.inPlay)?.id ?? null;
}

/** The lines under a candidate in the list, so a damaged save and the one in play each say what they are. */
export function candidateStanding(candidate: ReplacementCandidate): string {
  if (candidate.inPlay) return "In play";
  if (candidate.unplayable) return "Can't be opened";
  return "Saved";
}

/**
 * The sentence the player confirms against: exactly what is deleted, that it
 * cannot be brought back, and what happens next. It names a copy only when one
 * was actually exported this sitting, so it never promises a safety net that
 * does not exist.
 */
export function replacementSentence(candidate: ReplacementCandidate, options: { readonly then: string; readonly copyKept: boolean }): string {
  const what = candidate.unplayable
    ? `“${candidate.name}”, a save that can't be opened`
    : `“${candidate.name}” (${candidate.leader}, in office ${candidate.dateLabel})`;
  const gone = options.copyKept
    ? "It will be deleted from this device. You can import the copy you saved later."
    : "It will be deleted from this device. You haven't saved a copy, so it can't be brought back.";
  const play = candidate.inPlay ? " It's the game you're playing now. Anything since its last save will be lost, and your current term ends." : "";
  return `${what} will be replaced so you can ${options.then}. ${gone}${play}`;
}
