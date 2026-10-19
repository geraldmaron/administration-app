import { actForText, amendableAct, compareDates, conferenceRecommendationDeadline, proposeBillText, recommendBillConferenceText } from "@admin/engine";
export function billGate(conditions) {
    return conditions.find((condition) => condition.kind === "liveBill");
}
export function selectScenarioBill(campaign, gate, scenarioId) {
    return Object.values(campaign.bills)
        .filter((bill) => {
        const deadline = gate.stage === "conference" ? conferenceRecommendationDeadline(campaign, bill) : undefined;
        return bill.status === "in-progress" && bill.stage === gate.stage && amendableAct(bill.act) &&
            (gate.act === undefined || bill.act === gate.act) &&
            campaign.cases?.[`scenario:${scenarioId}@bill:${bill.id}`] === undefined &&
            (gate.stage !== "conference" || (deadline !== undefined && compareDates(campaign.calendar, deadline) < 0)) &&
            (gate.stage === "markup" ? proposeBillText(campaign, bill.id).ok :
                gate.responseText === "both" ? bill.text?.house !== undefined && bill.text?.senate !== undefined &&
                    bill.text.house !== bill.text.senate && recommendBillConferenceText(campaign, bill.id, bill.text.house).ok &&
                    recommendBillConferenceText(campaign, bill.id, bill.text.senate).ok :
                    gate.responseText !== undefined && recommendBillConferenceText(campaign, bill.id, gate.responseText).ok);
    })
        .sort((a, b) => b.introducedTurn - a.introducedTurn || a.id.localeCompare(b.id))
        .map((bill) => ({ id: bill.id, act: bill.act, title: bill.title, introducedTurn: bill.introducedTurn,
        stage: bill.stage, ...(bill.text ? { text: structuredClone(bill.text) } : {}),
        ...(bill.stage === "conference" ? { conferenceDeadline: conferenceRecommendationDeadline(campaign, bill) } : {}) }))[0];
}
export function billStillLive(campaign, frozen) {
    const bill = campaign.bills?.[frozen.id];
    return bill !== undefined && bill.status === "in-progress" && bill.act === frozen.act && bill.title === frozen.title &&
        bill.introducedTurn === frozen.introducedTurn && bill.stage === frozen.stage &&
        (frozen.conferenceDeadline === undefined ||
            JSON.stringify(conferenceRecommendationDeadline(campaign, bill)) === JSON.stringify(frozen.conferenceDeadline)) &&
        JSON.stringify(bill.text ?? null) === JSON.stringify(frozen.text ?? null);
}
export function billProvision(frozen, responseText) {
    const choice = frozen.stage === "markup" ? "targeted" : responseText === "both" ? frozen.text?.house ?? "base" : responseText ?? frozen.text?.house ?? "base";
    return actForText(frozen.act, choice)?.summary ?? "the bill's proposed provision";
}
export function billChamberProvision(frozen, chamber) {
    return actForText(frozen.act, frozen.text?.[chamber] ?? "base")?.summary ?? "the chamber's passed provision";
}
