import { daysBetween } from "@admin/engine";
import { formatMoney } from "../format/money";
function range(value) {
    const low = value.low.toLocaleString("en-US");
    return value.low === value.high ? low : `${low} to ${value.high.toLocaleString("en-US")}`;
}
function siteWords(event) {
    const site = event.spec.site;
    if (!site)
        return "Type of site not confirmed";
    return `${site.category.charAt(0).toUpperCase()}${site.category.slice(1)} site, ${site.confirmed ? "confirmed" : "likely but not confirmed"}`;
}
function figuresOf(event, report) {
    const outbreak = event.spec.mechanism.kind === "outbreak";
    return [
        outbreak ? { label: "Total infections", range: range(report.infections) } : { label: "Reported deaths", range: range(report.deaths) },
        ...(outbreak ? [{ label: "Reported deaths", range: range(report.deaths) }] : []),
        { label: "Injured or severely ill", range: range(report.injured) },
        { label: "People without services now", range: range(report.serviceDisruption) },
        { label: "Estimated economic loss", range: `${formatMoney(report.lossUSDm.low)} to ${formatMoney(report.lossUSDm.high)}` },
    ];
}
/** Every incident with at least one filed report, most recently updated first. */
export function impactReports(campaign, filter = {}) {
    return Object.values(campaign.impactEvents ?? {})
        .filter((event) => event.reports.length > 0)
        .filter((event) => filter.causedBy === undefined || event.causedBy === filter.causedBy)
        .filter((event) => filter.nation === undefined || event.spec.nation === filter.nation)
        .filter((event) => filter.withinDays === undefined || daysBetween(event.lastUpdated, campaign.calendar) <= filter.withinDays)
        .sort((a, b) => daysBetween(a.lastUpdated, b.lastUpdated) || a.spec.id.localeCompare(b.spec.id))
        .map((event) => {
        const report = event.reports.at(-1);
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
