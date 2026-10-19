import { daysBetween, type Campaign, type ImpactEvent, type ImpactRange, type ImpactReport } from "@admin/engine";
import { formatMoney } from "../format/money";

// What has been reported about an incident's human and economic toll, read
// from the filed reports alone. The simulation's own running totals are what
// the reports estimate; a President sees the estimates, with their ranges and
// confidence, and never the figure the reports are trying to find.

export type ImpactFigure = { readonly label: string; readonly range: string };

export type ImpactReportRow = {
  readonly id: string;
  readonly title: string;
  readonly nationName: string;
  readonly kind: ImpactEvent["spec"]["mechanism"]["kind"];
  /** "Assessment ongoing" or "Recovery complete". */
  readonly stage: string;
  readonly reported: ImpactReport["date"];
  readonly confidence: ImpactReport["confidence"];
  /** The headline figures, in the order a reader weighs them. */
  readonly figures: readonly ImpactFigure[];
  /** Whether the site's kind was confirmed, assessed, or never classified. */
  readonly site: string;
  readonly basis: string;
  /** How many reports have been filed, so a single estimate reads as one. */
  readonly revisions: number;
};

function range(value: ImpactRange): string {
  const low = value.low.toLocaleString("en-US");
  return value.low === value.high ? low : `${low} to ${value.high.toLocaleString("en-US")}`;
}

function siteWords(event: ImpactEvent): string {
  const site = event.spec.site;
  if (!site) return "Type of site not confirmed";
  return `${site.category.charAt(0).toUpperCase()}${site.category.slice(1)} site, ${site.confirmed ? "confirmed" : "likely but not confirmed"}`;
}

function figuresOf(event: ImpactEvent, report: ImpactReport): readonly ImpactFigure[] {
  const outbreak = event.spec.mechanism.kind === "outbreak";
  return [
    outbreak ? { label: "Total infections", range: range(report.infections) } : { label: "Reported deaths", range: range(report.deaths) },
    ...(outbreak ? [{ label: "Reported deaths", range: range(report.deaths) }] : []),
    { label: "Injured or severely ill", range: range(report.injured) },
    { label: "People without services now", range: range(report.serviceDisruption) },
    { label: "Estimated economic loss", range: `${formatMoney(report.lossUSDm.low)} to ${formatMoney(report.lossUSDm.high)}` },
  ];
}

export type ImpactReportFilter = {
  /** Only incidents a Record entry caused. */
  readonly causedBy?: string;
  readonly nation?: string;
  /** Only incidents whose latest report is this recent. */
  readonly withinDays?: number;
};

/** Every incident with at least one filed report, most recently updated first. */
export function impactReports(campaign: Campaign, filter: ImpactReportFilter = {}): readonly ImpactReportRow[] {
  return Object.values(campaign.impactEvents ?? {})
    .filter((event) => event.reports.length > 0)
    .filter((event) => filter.causedBy === undefined || event.causedBy === filter.causedBy)
    .filter((event) => filter.nation === undefined || event.spec.nation === filter.nation)
    .filter((event) => filter.withinDays === undefined || daysBetween(event.lastUpdated, campaign.calendar) <= filter.withinDays)
    .sort((a, b) => daysBetween(a.lastUpdated, b.lastUpdated) || a.spec.id.localeCompare(b.spec.id))
    .map((event) => {
      const report = event.reports.at(-1)!;
      return {
        id: event.spec.id,
        title: event.spec.title,
        nationName: campaign.nations[event.spec.nation]?.base.identity.name ?? event.spec.nation,
        kind: event.spec.mechanism.kind,
        stage: report.stage === "final" ? "Recovery complete" : "Still being assessed",
        reported: report.date,
        confidence: report.confidence,
        figures: figuresOf(event, report),
        site: siteWords(event),
        basis: report.basis,
        revisions: event.reports.length,
      };
    });
}
