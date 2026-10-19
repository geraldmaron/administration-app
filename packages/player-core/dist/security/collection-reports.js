import { COLLECTION_FOCUS_LABELS, campaignDay, collectionShareRefusal, PRODUCT_CYCLE_DAYS, selectCollectionProducts, selectCollectionShares, selectNation, shareCollectionReport, } from "@admin/engine";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { cell } from "../policy/choice-table.js";
const nationName = (campaign, id) => selectNation(campaign, id)?.base.identity.name ?? id;
export function collectionReports(campaign) {
    const shares = selectCollectionShares(campaign);
    return selectCollectionProducts(campaign).map((report) => ({
        id: report.id,
        target: report.targetKind === "domestic-state"
            ? Object.values(campaign.states).find((state) => state.base.id === report.target)?.base.name ?? report.target
            : nationName(campaign, report.target),
        ...(report.targetKind === "foreign-nation" ? { href: place.country(report.target) } : report.targetKind === "domestic-state" ? { href: place.state(report.target) } : {}),
        question: report.question,
        ...(report.focus ? { focus: COLLECTION_FOCUS_LABELS[report.focus] } : {}),
        ...(report.note ? { note: report.note } : {}),
        filed: formatDate(report.date),
        weeks: Math.max(0, Math.floor((campaignDay(campaign) - report.day) / 7)),
        summary: report.summary,
        confidence: report.confidence ?? "Not recorded",
        status: report.status === "findings" ? "Found something" : report.status === "no-result" ? "Nothing useful found" : "Older report",
        stale: campaignDay(campaign) - report.day >= PRODUCT_CYCLE_DAYS,
        exposure: report.targetKind === "domestic-state" ? "Built from public records. No secret gathering was ordered." : report.exposed ? "The gathering was discovered. Useful findings don't undo the fallout." : "Nobody found out about this report's gathering.",
        findings: report.findings ?? [],
        gaps: report.gaps ?? ["This older report doesn't list its findings one by one."],
        shared: shares.filter((share) => share.reportId === report.id).map((share) => ({
            recipient: nationName(campaign, share.recipient), date: formatDate(share.date),
            findings: share.report.findings?.map((finding) => finding.observation) ?? [],
        })),
    }));
}
export function collectionRecipients(campaign, reportId) {
    return Object.keys(campaign.nations)
        .filter((id) => id !== campaign.founding.nation)
        .map((id) => ({ id: id, name: nationName(campaign, id), reason: collectionShareRefusal(campaign, reportId, id) }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
export function shareReportChoices(campaign, reportId, recipient, findingIndexes) {
    const result = recipient ? shareCollectionReport(campaign, reportId, [recipient], findingIndexes) : undefined;
    const reason = !recipient ? "Choose a government to share it with." : result && !result.ok ? result.reason : result?.ok && result.packet.effects.length === 0 ? "This government already has the findings you picked. Pick different ones." : undefined;
    return {
        columns: [
            { id: "share", label: "Share this report", ...(reason ? { locked: `Not available right now. ${reason}` } : {}) },
        ],
        rows: [
            { id: "received", label: "What they receive", cells: [cell(findingIndexes === undefined
                        ? "This report as of its date, including how sure it is and what it doesn't know"
                        : "Only the new findings you picked, with how sure the report is. Other findings and gaps stay private")] },
            { id: "scope", label: "Access afterward", cells: [cell("This report only. Anything gathered later stays with your administration")] },
            { id: "risk", label: "What to weigh", cells: [cell("They now have the intelligence. Sharing it doesn't make an unsure report any surer.")] },
        ],
    };
}
export function shareReportOrder(campaign, reportId, recipient, findingIndexes) {
    const result = shareCollectionReport(campaign, reportId, [recipient], findingIndexes);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
