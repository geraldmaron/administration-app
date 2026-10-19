/**
 * Ambient calendar rows and one state opposition.
 *
 * Calendar releases, foreign selections and political opposition do not pause the clock.
 * Every release of the week just run is listed on its own date with the figure
 * it printed; a market crash has its own row (`attention-markets.ts`).
 */
import {
  stateOppositionThisWeek,
  releasesThisWeek,
  selectionDueNation,
  selectNation,
  type Campaign,
  type EconomicRelease,
  type ReleaseKind,
} from "@admin/engine";
import { formatDate } from "../format/figures";
import type { NationId } from "@admin/world";
import { RELEASE_HREF, RELEASE_MEASURE } from "../economy/market-releases";
import { anchored } from "../navigation/places";
import { subjectHref } from "../shell/subject";
import type { AttentionItem } from "./attention-row";

const RELEASE_TITLE: Readonly<Record<ReleaseKind, string>> = {
  jobs: "The jobs report is out",
  cpi: "The inflation report is out",
  gdp: "The growth report is out",
  fomc: "The Federal Reserve has set interest rates",
};

const RELEASE_READING: Readonly<Record<ReleaseKind, string>> = {
  jobs: "unemployment",
  cpi: "inflation",
  gdp: "growth",
  fomc: "the Fed's interest rate",
};

function releaseRow(release: EconomicRelease): AttentionItem {
  const { kind, date } = release;
  const figure = release.figure === undefined ? undefined : `${(release.figure * 100).toFixed(1)}%`;
  return {
    id: `release:${kind}:${date.year}-${date.month}-${date.day}`,
    source: "standing-threshold",
    urgency: "ambient",
    subject: `release:${kind}`,
    title: `${RELEASE_TITLE[kind]} (${formatDate(date)})`,
    reason: figure ? `It puts ${RELEASE_READING[kind]} at ${figure}.` : "The new number is on the economy page.",
    href: anchored(RELEASE_HREF[kind], `measure-${RELEASE_MEASURE[kind]}`),
    stance: "neutral",
    ...(figure ? { figure } : {}),
  };
}

function selectionRow(campaign: Campaign): AttentionItem | undefined {
  const nationId = selectionDueNation(campaign.calendar);
  if (!nationId) return undefined;
  const name = selectNation(campaign, nationId as NationId)?.base.identity.name;
  if (!name) return undefined;
  return {
    id: `selection-due:${nationId}:${campaign.calendar.year}-${campaign.calendar.month}`,
    source: "standing-threshold",
    urgency: "ambient",
    subject: `selection:${nationId}`,
    title: "Another country is choosing its leader",
    reason: `${name} chooses its leader this month.`,
    href: anchored(subjectHref({ kind: "nation", id: nationId }), "country-leader"),
    stance: "neutral",
  };
}

function oppositionRow(campaign: Campaign): AttentionItem | undefined {
  const opposition = stateOppositionThisWeek(campaign);
  if (!opposition) return undefined;
  return {
    id: `state-opposition:${opposition.stateId}`,
    source: "standing-threshold",
    urgency: "ambient",
    subject: `state:${opposition.stateId}`,
    title: opposition.title,
    reason: opposition.reason,
    href: anchored(subjectHref({ kind: "state", id: opposition.stateId }), "state-governor"),
    stance: "caution",
  };
}

/** Releases, a due selection, and at most one state opposition. */
export function briefAttentionItems(campaign: Campaign): readonly AttentionItem[] {
  return [...releasesThisWeek(campaign).map(releaseRow), ...[selectionRow(campaign), oppositionRow(campaign)].flatMap((row) => (row ? [row] : []))];
}
