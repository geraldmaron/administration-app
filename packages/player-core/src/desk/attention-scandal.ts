/**
 * Live scandals as Desk rows.
 *
 * One row per story still standing. A story stands for weeks, so a row that
 * asked for the President every week it stood would stop the clock on every
 * tick of a thirteen-week story: the row is soft only in the week the story
 * broke, and ambient after. A story with no date of its own (an authored flag
 * nothing stamped) has no week it broke, so it is never soft, whatever its age
 * reads as. A resolved story has no row.
 */
import {
  roleTitle,
  scandalResponseTaken,
  selectLiveScandals,
  sentenceCase,
  SCANDAL_RESPONSE_LABELS,
  type Campaign,
  type Scandal,
} from "@admin/engine";
import { subjectHref } from "../shell/subject";
import { justHappened, type AttentionItem } from "./attention-row";

const FALLBACK_TITLE = "A scandal needs your response";
const UNANSWERED = "You haven't responded yet.";

function facingLine(scandal: Scandal): string | undefined {
  const subject = scandal.subject.trim();
  if (subject.length > 0) return sentenceCase(subject);
  const context = scandal.context?.trim() ?? "";
  if (context.length > 0) return sentenceCase(context);
  return undefined;
}

function namedLine(campaign: Campaign, scandal: Scandal): string | undefined {
  const implicated = scandal.implicated;
  const name = implicated ? campaign.people[implicated.person]?.base.name : undefined;
  if (!implicated || !name) return undefined;
  return implicated.role ? `It names ${name}, ${roleTitle(implicated.role)}.` : `It names ${name}.`;
}

function rowReason(campaign: Campaign, scandal: Scandal, title: string): string {
  const answered = scandalResponseTaken(campaign, scandal.id);
  if (answered) return `Your response: ${SCANDAL_RESPONSE_LABELS[answered].toLowerCase()}. The story is still running.`;
  const named = namedLine(campaign, scandal);
  if (named) return `${named} ${UNANSWERED}`;
  const context = scandal.context?.trim() ?? "";
  if (context.length > 0 && sentenceCase(context) !== title) return context;
  return UNANSWERED;
}

/** Soft only in the week a dated story broke and before it has been answered. */
function brokeThisWeek(campaign: Campaign, scandal: Scandal): boolean {
  if (scandal.brokeTurn < 0) return false;
  if (scandalResponseTaken(campaign, scandal.id)) return false;
  return justHappened(campaign, scandal.brokeTurn);
}

function scandalRow(campaign: Campaign, scandal: Scandal): AttentionItem | undefined {
  if (scandal.stage === "resolved") return undefined;
  const title = facingLine(scandal) ?? FALLBACK_TITLE;
  return {
    id: `scandal:${scandal.id}`,
    source: "scandal",
    urgency: brokeThisWeek(campaign, scandal) ? "soft" : "ambient",
    subject: `scandal:${scandal.id}`,
    title,
    reason: rowReason(campaign, scandal, title),
    href: subjectHref({ kind: "scandal", id: scandal.id }),
    stance: "adverse",
    icon: "caution",
  };
}

/** The given stories as rows; a resolved story is omitted. */
export function scandalDeskItems(campaign: Campaign, scandals: readonly Scandal[]): readonly AttentionItem[] {
  return scandals.flatMap((scandal) => {
    const row = scandalRow(campaign, scandal);
    return row === undefined ? [] : [row];
  });
}

/** One row per live story on the campaign's board. */
export function scandalAttentionItems(campaign: Campaign): readonly AttentionItem[] {
  return scandalDeskItems(campaign, selectLiveScandals(campaign));
}
