import { campaignDay, conclusoryAccount, fileInspectorRemovalNotice, INSPECTED_INSTITUTIONS, igRemovalNoticeTurns, inspectorIsSeated, institutionDef, isMatterOpen, matterRipensTurn, matterSource, notifyCommittees, selectDateOfTurn, selectFindings, selectInspector, selectMattersFor, selectNation, selectOversightPressure, } from "@admin/engine";
import { federalSitePoint } from "@admin/world";
import { formatDate } from "../format/figures";
// The oversight board: every inquiry running into or out of the government,
// the inspectors general in post with what removing one would cost, and the
// notices the law says the President owes the committees. Every price is read
// off the packet the act would commit.
export const MATTER_STAGE_ORDER = ["opened", "gathering", "reported", "closed"];
export const MATTER_STAGE_WORDS = {
    opened: "Opened, not yet public",
    gathering: "Gathering documents",
    reported: "Reported",
    closed: "Closed",
};
function inquiryRow(campaign, matter) {
    const next = matterRipensTurn(matter);
    return {
        id: matter.id,
        source: matterSource(matter),
        subject: matter.subject,
        stage: matter.stage,
        stageWord: MATTER_STAGE_WORDS[matter.stage],
        received: matter.direction === "received",
        public: matter.public,
        obstructed: matter.obstructed,
        opened: formatDate(selectDateOfTurn(campaign, matter.openedTurn)),
        ...(next !== undefined ? { nextMove: formatDate(selectDateOfTurn(campaign, next)) } : {}),
        ...(matter.origin.kind === "inspector-general" ? { institution: matter.origin.institution } : {}),
        latest: matter.beats.at(-1)?.description ?? matter.subject,
    };
}
/** Every inquiry, open ones by stage and the closed ones newest first. */
export function inquiryPipeline(campaign) {
    const rows = campaign.oversight.matters.map((matter) => inquiryRow(campaign, matter));
    return {
        stages: MATTER_STAGE_ORDER.filter((stage) => stage !== "closed").map((stage) => ({
            stage,
            label: MATTER_STAGE_WORDS[stage],
            matters: rows.filter((row) => row.stage === stage),
        })),
        closed: rows.filter((row) => row.stage === "closed").reverse(),
        pressure: selectOversightPressure(campaign),
    };
}
/** One pin per agency an open inquiry is auditing, at its sourced headquarters. */
export function inquiryPins(campaign) {
    const open = campaign.oversight.matters.filter((matter) => isMatterOpen(matter) && matter.origin.kind === "inspector-general");
    const byInstitution = new Map();
    for (const matter of open) {
        if (matter.origin.kind !== "inspector-general")
            continue;
        byInstitution.set(matter.origin.institution, [...(byInstitution.get(matter.origin.institution) ?? []), matter]);
    }
    return [...byInstitution.entries()].flatMap(([institution, matters]) => {
        const point = federalSitePoint(institution);
        const def = institutionDef(institution);
        if (!point || !def)
            return [];
        const furthest = Math.max(...matters.map((matter) => MATTER_STAGE_ORDER.indexOf(matter.stage)));
        return [{ id: `inquiry:${institution}`, institution, label: `Inquiry at ${def.name}`, where: def.name, lon: point.lon, lat: point.lat, weight: furthest + 1 }];
    });
}
function postureOf(campaign, institution) {
    const inspector = selectInspector(campaign, institution);
    if (!inspector)
        return undefined;
    if (!inspectorIsSeated(inspector))
        return "removed";
    return inspector.noticeFiledTurn !== undefined ? "notice-filed" : "in-post";
}
/** Every inspector general the government has, those with audits running first. */
export function inspectorsBoard(campaign) {
    return INSPECTED_INSTITUTIONS.flatMap((institution) => {
        const inspector = selectInspector(campaign, institution);
        const posture = postureOf(campaign, institution);
        const def = institutionDef(institution);
        if (!inspector || !posture || !def)
            return [];
        const leaves = inspector.removedTurn ?? (inspector.noticeFiledTurn !== undefined ? inspector.noticeFiledTurn + igRemovalNoticeTurns() : undefined);
        return [
            {
                institution,
                name: def.name,
                posture,
                openMatters: selectMattersFor(campaign, institution).filter(isMatterOpen).length,
                seated: formatDate(selectDateOfTurn(campaign, inspector.seatedTurn)),
                ...(leaves !== undefined ? { leaves: formatDate(selectDateOfTurn(campaign, leaves)) } : {}),
                reasons: inspector.noticeReasons,
            },
        ];
    }).sort((a, b) => b.openMatters - a.openMatters || a.name.localeCompare(b.name));
}
/** The account the board files until a surface collects particulars: the President's sentence, citing the audit it answers when one is running. */
function noticeAccount(campaign, institution, reason) {
    const audit = selectMattersFor(campaign, institution).find(isMatterOpen);
    return conclusoryAccount(reason, audit?.id ?? "", campaign.turn);
}
/** The stated reason does not change the price, so it is read with one supplied; the control asks for the real one. */
export function inspectorNoticeTerms(campaign, institution) {
    const result = fileInspectorRemovalNotice(campaign, institution, noticeAccount(campaign, institution, "stated"));
    if (!result.ok)
        return { refusal: result.reason };
    const congress = result.packet.effects.find((effect) => effect.kind === "congress");
    const oversight = result.packet.effects.find((effect) => effect.kind === "oversight");
    return {
        institution,
        name: institutionDef(institution)?.name ?? institution,
        leaves: formatDate(selectDateOfTurn(campaign, campaign.turn + igRemovalNoticeTurns())),
        dispositionBefore: campaign.congress.disposition,
        dispositionAfter: congress?.kind === "congress" && congress.set ? congress.set.disposition : campaign.congress.disposition,
        obstructs: oversight?.kind === "oversight" ? (oversight.matters ?? []).map((matter) => matter.subject) : [],
    };
}
/** The filing itself, with the President's own reasons, built on the campaign it is committed against. */
export function inspectorNoticePacket(campaign, institution, reason) {
    const result = fileInspectorRemovalNotice(campaign, institution, noticeAccount(campaign, institution, reason));
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
/** Covert findings whose notice to the intelligence committees was withheld and is still owed. */
export function noticesOwed(campaign) {
    const today = campaignDay(campaign);
    return selectFindings(campaign)
        .filter((finding) => finding.notification === "withheld" && finding.notifiedDay === undefined && finding.closedDay === undefined)
        .map((finding) => ({
        id: finding.id,
        target: selectNation(campaign, finding.target)?.base.identity.name ?? finding.target,
        objective: finding.objective,
        signed: formatDate(finding.signedDate),
        daysLate: today - finding.signedDay,
        ...(finding.reasonsWithheld ? { reasonsWithheld: finding.reasonsWithheld } : {}),
    }));
}
/** Telling the committees, with the statement of reasons the law requires, built on the campaign it is committed against. */
export function committeeNoticePacket(campaign, id, statement) {
    const result = notifyCommittees(campaign, id, statement);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
