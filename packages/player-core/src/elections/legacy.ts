import {
  campaignFoundingDate,
  daysBetween,
  selectConflicts,
  selectDateOfTurn,
  selectEnding,
  selectNation,
  type Campaign,
  type Conflict,
  type GameDate,
} from "@admin/engine";
import { plankById, type NationId } from "@admin/world";
import { formatDate } from "../format/figures";
import { LEGACY_CLOSING, LEGACY_LINES, lawsLine, promisesLine, type EndingKind } from "./finale-copy";

// What the administration leaves behind, drawn as a record rather than listed
// as a scoreboard: the term as a line with every law, night, war and step
// toward removal marked on it where it happened, the country's own numbers as
// arcs over the weeks the save still holds, and the few counts a history of a
// presidency would actually print.
//
// Every figure here is read from what the campaign stored. The approval arc
// covers only the closed weeks the save keeps, and says so; it never
// interpolates the rest of a term it did not record.

export type LegacyMarkKind = "law" | "election" | "removal" | "war" | "pledge";
export type LegacyTone = "favorable" | "adverse" | "neutral";

export type LegacyMark = {
  readonly key: string;
  readonly kind: LegacyMarkKind;
  /** Days from the oath. */
  readonly at: number;
  readonly date: string;
  readonly label: string;
  readonly tone: LegacyTone;
};

export type LegacyPoint = { readonly label: string; readonly at: number; readonly value: number };

export type LegacyWar = { readonly key: string; readonly name: string; readonly outcome: string; readonly tone: LegacyTone };

export type LegacyReading = {
  readonly ending: EndingKind;
  readonly from: string;
  readonly to: string;
  /** Days from the oath to the last day the record reaches. */
  readonly span: number;
  readonly timelineLine: string;
  readonly marks: readonly LegacyMark[];
  readonly approval: readonly LegacyPoint[];
  readonly unemployment: readonly LegacyPoint[];
  readonly inflation: readonly LegacyPoint[];
  readonly countryLine: string;
  readonly laws: { readonly line: string; readonly titles: readonly string[] };
  readonly promises: { readonly line: string; readonly kept: number; readonly broken: number; readonly open: number };
  readonly wars: { readonly line?: string; readonly list: readonly LegacyWar[] };
  readonly record: {
    readonly unauthorizedForce: number;
    readonly struckDownOrders: number;
    readonly overriddenVetoes: number;
    readonly removalSteps: number;
  };
  readonly closing: string;
};

function markAt(campaign: Campaign, founded: GameDate, turn: number) {
  const date = selectDateOfTurn(campaign, turn);
  return { at: Math.max(0, daysBetween(founded, date)), date: formatDate(date) };
}

function lawMarks(campaign: Campaign, founded: GameDate): readonly LegacyMark[] {
  return Object.values(campaign.bills)
    .filter((bill) => bill.status === "law")
    .map((bill) => ({
      key: `law:${bill.id}`,
      kind: "law" as const,
      ...markAt(campaign, founded, bill.resolvedTurn ?? bill.introducedTurn),
      label: bill.title,
      tone: (bill.override ? "adverse" : "favorable") as LegacyTone,
    }));
}

function electionMarks(campaign: Campaign, founded: GameDate): readonly LegacyMark[] {
  return campaign.termClock.elections.map((result) => ({
    key: `election:${result.id}`,
    kind: "election" as const,
    ...markAt(campaign, founded, result.turn),
    label: result.kind === "midterm" ? "The midterms" : result.won === undefined ? "Not on the ballot" : "Your election",
    tone: (result.won === false ? "adverse" : result.won === true ? "favorable" : "neutral") as LegacyTone,
  }));
}

function removalMarks(campaign: Campaign, founded: GameDate): readonly LegacyMark[] {
  return campaign.removal.beats.map((beat, index) => ({
    key: `removal:${index}`,
    kind: "removal" as const,
    ...markAt(campaign, founded, beat.turn),
    label: beat.description,
    tone: "adverse" as const,
  }));
}

function nationName(campaign: Campaign, id: NationId): string {
  return selectNation(campaign, id)?.base.identity.name ?? (id as string);
}

function usWars(campaign: Campaign): readonly Conflict[] {
  const us = campaign.founding.nation;
  return selectConflicts(campaign).filter(
    (conflict) =>
      conflict.aggressor === us || conflict.defender === us || conflict.joined.aggressor.includes(us) || conflict.joined.defender.includes(us),
  );
}

function warOutcome(campaign: Campaign, conflict: Conflict): { readonly outcome: string; readonly tone: LegacyTone } {
  if (conflict.status === "active") return { outcome: "Still being fought", tone: "neutral" };
  if (conflict.status === "settled") return { outcome: "Ended by agreement", tone: "neutral" };
  const us = campaign.founding.nation;
  const ourSide = conflict.aggressor === us || conflict.joined.aggressor.includes(us) ? "aggressor" : "defender";
  const won = (conflict.status === "aggressor-victory") === (ourSide === "aggressor");
  return won ? { outcome: "Won", tone: "favorable" } : { outcome: "Lost", tone: "adverse" };
}

function legacyWars(campaign: Campaign, founded: GameDate): { readonly wars: readonly LegacyWar[]; readonly marks: readonly LegacyMark[] } {
  const conflicts = usWars(campaign);
  const wars = conflicts.map((conflict) => ({
    key: conflict.id,
    name: `${nationName(campaign, conflict.aggressor)} against ${nationName(campaign, conflict.defender)}`,
    ...warOutcome(campaign, conflict),
  }));
  const marks = conflicts.map((conflict, index) => ({
    key: `war:${conflict.id}`,
    kind: "war" as const,
    ...markAt(campaign, founded, Math.max(1, conflict.startedTurn)),
    label: wars[index]!.name,
    tone: "adverse" as const,
  }));
  return { wars, marks };
}

function pledgeMarks(campaign: Campaign, founded: GameDate): readonly LegacyMark[] {
  return (campaign.pledges ?? []).flatMap((pledge) => {
    if (pledge.status === "open" || !pledge.settledDate) return [];
    const title = plankById.get(pledge.plank)?.title ?? String(pledge.plank);
    return [{
      key: `pledge:${pledge.id}`,
      kind: "pledge" as const,
      at: Math.max(0, daysBetween(founded, pledge.settledDate)),
      date: formatDate(pledge.settledDate),
      label: `${pledge.status === "kept" ? "Kept" : "Broken"}: ${title}`,
      tone: (pledge.status === "kept" ? "favorable" : "adverse") as LegacyTone,
    }];
  });
}

function series(campaign: Campaign, values: readonly { readonly turn: number; readonly value: number }[]): readonly LegacyPoint[] {
  return values.map(({ turn, value }) => ({ label: formatDate(selectDateOfTurn(campaign, turn)), at: turn, value }));
}

function approvalSeries(campaign: Campaign): readonly LegacyPoint[] {
  const history = campaign.player.metricHistory;
  const closed = history.map((set, index) => ({ turn: campaign.turn - history.length + index, value: set.approval * 100 }));
  return series(campaign, [...closed, { turn: campaign.turn, value: campaign.player.metrics.approval * 100 }]);
}

function economySeries(campaign: Campaign, pick: "unemployment" | "inflation"): readonly LegacyPoint[] {
  return series(campaign, (campaign.economyHistory ?? []).map((sample) => ({ turn: sample.turn, value: sample[pick] * 100 })));
}

function promiseCounts(campaign: Campaign) {
  const pledges = campaign.pledges ?? [];
  const kept = pledges.filter((pledge) => pledge.status === "kept").length;
  const broken = pledges.filter((pledge) => pledge.status === "broken").length;
  return { kept, broken, open: pledges.length - kept - broken };
}

function recordCounts(campaign: Campaign) {
  return {
    unauthorizedForce: campaign.congress.unauthorized.length,
    struckDownOrders: campaign.orders.filter((order) => order.review?.status === "struck-down").length,
    overriddenVetoes: Object.values(campaign.bills).filter((bill) => bill.status === "law" && bill.override !== undefined).length,
    removalSteps: campaign.removal.beats.length,
  };
}

/** The record a finished presidency leaves. Undefined while the President is in office. */
export function legacyReading(campaign: Campaign): LegacyReading | undefined {
  const ending = selectEnding(campaign);
  if (ending === "in-office") return undefined;
  const founded = campaignFoundingDate(campaign);
  const war = legacyWars(campaign, founded);
  const marks = [
    ...lawMarks(campaign, founded),
    ...electionMarks(campaign, founded),
    ...removalMarks(campaign, founded),
    ...war.marks,
    ...pledgeMarks(campaign, founded),
  ].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
  const laws = marks.filter((mark) => mark.kind === "law").map((mark) => mark.label);
  const promises = promiseCounts(campaign);
  const hasPromises = promises.kept + promises.broken + promises.open > 0;
  return {
    ending,
    from: formatDate(founded),
    to: formatDate(campaign.calendar),
    span: Math.max(1, daysBetween(founded, campaign.calendar)),
    timelineLine: LEGACY_LINES.timeline,
    marks,
    approval: approvalSeries(campaign),
    unemployment: economySeries(campaign, "unemployment"),
    inflation: economySeries(campaign, "inflation"),
    countryLine: LEGACY_LINES.country,
    laws: { line: laws.length === 0 ? LEGACY_LINES.lawsNone : lawsLine(laws.length), titles: laws },
    promises: { ...promises, line: hasPromises ? promisesLine(promises.kept, promises.broken, promises.open) : LEGACY_LINES.promisesNone },
    wars: { ...(war.wars.length === 0 ? { line: LEGACY_LINES.warsNone } : {}), list: war.wars },
    record: recordCounts(campaign),
    closing: LEGACY_CLOSING[ending],
  };
}
