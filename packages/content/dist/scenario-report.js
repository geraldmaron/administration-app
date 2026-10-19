import { campaignDay, PRODUCT_CYCLE_DAYS, selectCollectionProducts, selectCollectionShares, selectNation, } from "@admin/engine";
import { worldDataset } from "@admin/world";
export function reportGate(conditions) {
    return conditions.find((condition) => condition.kind === "collectionReport");
}
function reportMatches(campaign, report, gate) {
    const age = campaignDay(campaign) - report.day;
    const confidence = { low: 0, moderate: 1, high: 2 };
    const status = gate.status ?? "findings";
    return report.status === status && report.targetKind === gate.targetKind &&
        (gate.activeTasking !== true || activeReportTasking(campaign, report)) &&
        age >= 0 && age < PRODUCT_CYCLE_DAYS && report.confidence !== undefined &&
        (gate.confidence === undefined || confidence[report.confidence] >= confidence[gate.confidence]) &&
        (gate.exposed === undefined || Boolean(report.exposed) === gate.exposed) &&
        (status === "no-result" ? report.findings?.length === 0 && (report.gaps?.length ?? 0) > 0 :
            report.findings?.some((finding) => finding.topic === gate.topic && finding.asOfDay === report.day &&
                (gate.basis === undefined || finding.basis?.kind === gate.basis) &&
                (gate.condition === undefined || ((finding.basis?.kind === "state-condition" || finding.basis?.kind === "governor-request") && finding.basis.condition === gate.condition))) === true) &&
        (gate.targetKind === "domestic-state" || selectNation(campaign, report.target) !== undefined);
}
function activeReportTasking(campaign, report) {
    const tasking = campaign.security.intelligence.taskings[report.tasking];
    return tasking !== undefined && tasking.closedDay === undefined &&
        tasking.target === report.target && tasking.targetKind === report.targetKind &&
        tasking.element === report.element && tasking.discipline === report.discipline && tasking.question === report.question;
}
export function selectScenarioReport(campaign, gate, scenarioId) {
    const shares = [...selectCollectionShares(campaign)].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
    for (const report of selectCollectionProducts(campaign)) {
        if (!reportMatches(campaign, report, gate))
            continue;
        const reportShares = shares.filter((entry) => entry.reportId === report.id);
        const share = gate.shared === true ? reportShares.find((entry) => campaign.cases?.[`scenario:${scenarioId}@report:${report.id}:${entry.id}`] === undefined &&
            reportMatches(campaign, entry.report, gate) &&
            (gate.recipientAffected !== true || entry.report.findings?.some((finding) => finding.topic === gate.topic &&
                finding.basis?.kind === "pursuit" && finding.basis.target === entry.recipient) === true)) : undefined;
        if (gate.shared === true && !share)
            continue;
        if (gate.shared === false && reportShares.length > 0)
            continue;
        if (gate.shared !== true && campaign.cases?.[`scenario:${scenarioId}@report:${report.id}`] !== undefined)
            continue;
        const boundReport = share?.report ?? report;
        const targetKind = boundReport.targetKind;
        // Person-level reports are not a scenario input: no authored gate names one.
        if (targetKind !== "foreign-nation" && targetKind !== "domestic-state")
            continue;
        return {
            id: boundReport.id, tasking: boundReport.tasking, question: boundReport.question, status: boundReport.status, target: boundReport.target, targetKind, day: boundReport.day,
            date: boundReport.date, element: boundReport.element, discipline: boundReport.discipline,
            summary: boundReport.summary, confidence: boundReport.confidence, exposed: Boolean(boundReport.exposed),
            findings: boundReport.findings, gaps: boundReport.gaps ?? [], ...(gate.topic ? { topic: gate.topic } : {}),
            ...(gate.basis ? { basis: gate.basis } : {}),
            ...(gate.condition ? { condition: gate.condition } : {}),
            ...(gate.shared === true && share ? { share: { id: share.id, recipient: share.recipient, day: share.day,
                    partial: (share.report.findings?.length ?? 0) < (report.findings?.length ?? 0) || (share.report.gaps?.length ?? 0) < (report.gaps?.length ?? 0) } } : {}),
        };
    }
    return undefined;
}
export function reportCounterpart(campaign, report, bind) {
    if (bind === "home")
        return report.targetKind === "domestic-state" ? campaign.founding.nation : undefined;
    if (bind === "recipient")
        return report.share?.recipient;
    return report.targetKind === "foreign-nation" ? report.target : undefined;
}
export function reportStillLive(campaign, frozen, requireActiveTasking = false) {
    const day = campaignDay(campaign);
    if (day < frozen.day || day - frozen.day >= PRODUCT_CYCLE_DAYS)
        return false;
    if (!selectCollectionProducts(campaign).some((report) => report.id === frozen.id))
        return false;
    if (requireActiveTasking && !activeReportTasking(campaign, frozen))
        return false;
    if (!frozen.share)
        return true;
    return selectCollectionShares(campaign).some((share) => share.id === frozen.share.id && share.reportId === frozen.id && share.recipient === frozen.share.recipient);
}
export function reportTokens(campaign, report) {
    const finding = report.findings.find((entry) => entry.topic === report.topic &&
        (report.basis === undefined || entry.basis?.kind === report.basis) &&
        (report.condition === undefined || ((entry.basis?.kind === "state-condition" || entry.basis?.kind === "governor-request") && entry.basis.condition === report.condition)));
    const target = report.targetKind === "foreign-nation"
        ? selectNation(campaign, report.target)?.base.identity.name ?? report.target
        : worldDataset.states.find((state) => state.id === report.target)?.name ?? report.target;
    const recipient = report.share ? selectNation(campaign, report.share.recipient)?.base.identity.name ?? report.share.recipient : undefined;
    return {
        reportId: report.id,
        reportSummary: report.summary,
        reportFinding: finding?.observation ?? report.summary,
        reportSource: finding?.source ?? "the intelligence community",
        reportGaps: report.gaps.length > 0 ? report.gaps.join("; ") : report.share?.partial
            ? "The source report's gaps were not provided in this disclosure"
            : "No gap was recorded in the issued report",
        reportConfidence: report.confidence,
        reportExposure: report.exposed ? "exposed" : "not exposed",
        reportTarget: target,
        reportAgeDays: String(campaignDay(campaign) - report.day),
        reportFindingCount: String(report.findings.length),
        ...(recipient ? { reportRecipient: recipient } : {}),
    };
}
