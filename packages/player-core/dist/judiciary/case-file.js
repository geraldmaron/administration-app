import { executiveOrder, LEGISLATIVE_ACTS, selectDateOfTurn, selectPerson } from "@admin/engine";
import { formatDate } from "../format/figures";
import { place } from "../navigation/places";
import { reversedEffects, unreversedCost } from "./case-effects";
import { benchReading, courtDocket } from "./courts";
function dateOf(campaign, turn) {
    return formatDate(selectDateOfTurn(campaign, turn));
}
function nameOf(campaign, id) {
    return id ? selectPerson(campaign, id)?.base.name : undefined;
}
function timelineOf(campaign, record, order, ruled, proceeding) {
    const history = proceeding?.history ?? ruled?.procedure?.history;
    if (history)
        return history.map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account }));
    const due = record.review?.dueTurn ?? record.turn;
    const moments = [
        { date: dateOf(campaign, record.turn), text: `You sign ${order.name}, and someone challenges it in court the same week.` },
    ];
    if (ruled) {
        const verb = ruled.holding === "struck-down" ? "strikes it down" : "upholds it";
        moments.push({ date: dateOf(campaign, ruled.ruledTurn), text: `The Supreme Court ${verb}.` });
    }
    else {
        moments.push({ date: dateOf(campaign, due), text: "The Supreme Court is due to decide. It will rule with the justices and the laws in place that week." });
    }
    return moments;
}
function pathsFor(campaign, row) {
    if (row.status !== "pending")
        return [];
    const paths = [];
    const statute = row.order ? LEGISLATIVE_ACTS.find((act) => act.constrains?.authorizesOrders?.includes(row.order)) : undefined;
    if (row.ground === "silent" && statute) {
        paths.push({
            key: "statute",
            title: "Ask Congress to approve it",
            detail: `If Congress passes ${statute.title}, the order will be backed by a law. When the court decides if you had the power to act, it looks at the laws Congress has passed.`,
            href: place.congress(),
            door: "Open Congress",
        });
    }
    if (row.stage === "supreme-merits" && benchReading(campaign).vacancies > 0) {
        paths.push({
            key: "bench",
            title: "Fill the open seat first",
            detail: "A justice confirmed before the review takes part in the case. If the Court splits evenly, the lower court's decision stands, and the Supreme Court doesn't issue a ruling of its own.",
            href: place.courts(),
            door: "Open the Court",
        });
    }
    return paths;
}
function reversalOf(campaign, record, order) {
    const rule = campaign.pendingRules.find((entry) => entry.id === record.id);
    if (record.endReason)
        return { reversed: [], reversedNote: record.remedyApplied || rule?.remedyApplied
                ? `The order's future effects on the country stopped when it ${record.endReason === "sunset" ? "expired" : "was canceled"}. There's nothing more for this case to undo.`
                : "The order ended, but this saved game has no record of how much of its effect was rolled back." };
    if (order.viaRulemaking && rule && (rule.status === "pending" || rule.status === "stayed" || rule.status === "canceled")) {
        return { reversed: [], reversedNote: "The rule hasn't taken effect yet. If the Court strikes it down, it's canceled, so there's nothing to undo." };
    }
    const contribution = record.review?.status === "struck-down"
        ? rule ? rule.remedyContribution : record.remedyContribution
        : rule ? rule.nationContribution : record.nationContribution;
    if (!contribution)
        return { reversed: [], reversedNote: "This older order didn't record what it actually changed, so the saved game can't show what a ruling would undo." };
    const reversed = reversedEffects(contribution);
    return { reversed, ...(reversed.length === 0 ? { reversedNote: record.review?.status === "struck-down" ? "By the time the ruling took effect, nothing was left of the order's effects to undo." : "In the end, the order didn't change these numbers for the country." } : {}) };
}
function votesOf(campaign, ruled) {
    if (!ruled)
        return [];
    return [...ruled.votes]
        .sort((a, b) => a.seat - b.seat)
        .map((vote) => ({
        name: nameOf(campaign, vote.justice) ?? "A justice",
        seat: vote.seat,
        vote: vote.vote,
        ...(selectPerson(campaign, vote.justice)?.alive ? { href: place.person(vote.justice) } : {}),
    }));
}
function circuitVotesOf(campaign, row) {
    return row.circuit?.votes.map((vote) => ({ name: nameOf(campaign, vote.judge) ?? "Circuit judge",
        vote: vote.vote, ...(selectPerson(campaign, vote.judge)?.alive ? { href: place.person(vote.judge) } : {}) }));
}
/** The case behind an order record id, pending or ruled. */
export function caseFile(campaign, id) {
    const docket = courtDocket(campaign);
    const row = [...docket.pending, ...docket.ruled].find((entry) => entry.id === id);
    if (row?.subject?.kind === "state-election-access" && row.matter) {
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const finding = campaign.states[row.subject.state]?.electionAccess;
        return { ...row, summary: row.matter.injury, reversed: [],
            unreversed: finding?.remediedShare === 1
                ? "The state confirmed that every polling place had accessible voting equipment before this election. The order covers only this state and never changes an official election result."
                : finding?.remediedShare !== undefined
                    ? `The state confirmed the equipment at ${Math.round(finding.remediedShare * 100)}% of polling places. The places still without it ${campaign.turn >= finding.electionTurn ? "were noted on election night" : "may still be without it on Election Day"}. No official result changes.`
                    : `The state ${finding?.response ? "answered the audit, and the equipment the court ordered isn't installed yet" : "has until the audit deadline to answer"}. The court can only order access for future elections in this state. No official result changes.`,
            timeline: (proceeding?.history ?? ruled?.procedure?.history ?? []).map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled), ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    if (row?.subject?.kind === "statutory-authority" && row.matter) {
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const history = proceeding?.history ?? ruled?.procedure?.history ?? [];
        const majorityAuthor = nameOf(campaign, ruled?.majorityAuthor);
        const dissentAuthor = nameOf(campaign, ruled?.dissentAuthor);
        return { ...row, summary: row.matter.injury, reversed: [],
            ...(row.partyRelief?.active ? { partyEffects: reversedEffects(row.partyRelief.outstanding) } : {}),
            unreversed: row.relief === "statutory-construction"
                ? "Only the part of this law that lets the government put certain production first is narrowed. The rest of the law, and money already spent, stay in place."
                : row.partyRelief?.active
                    ? "The order's effects are held back for the suppliers named in the case. Other suppliers and the national authority stay in place."
                    : "The national authority stays in place unless the Supreme Court reads the law differently.",
            timeline: history.map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled),
            ...(majorityAuthor ? { majorityAuthor } : {}), ...(dissentAuthor ? { dissentAuthor } : {}),
            ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    if (row?.subject?.kind === "fair-housing-enforcement" && row.matter) {
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const complaint = campaign.services?.["fair-housing-complaints"]?.housingComplaint;
        return { ...row, summary: row.matter.injury, reversed: [],
            unreversed: complaint?.status === "reconsidered"
                ? `HUD recorded that the housing provider in this case reconsidered this applicant in week ${complaint.reconsideredTurn}, without using the unlawful reason. That doesn't guarantee them a home, and other providers aren't affected.`
                : complaint?.status === "reconsideration-ordered"
                    ? "The housing provider in this case must reconsider this applicant without using the unlawful reason. That doesn't guarantee them a home, and other providers aren't affected."
                    : complaint?.status === "interim-protected"
                        ? "The temporary order keeps only this application open while the case goes on in court."
                        : "The complaint against this one housing provider stays on HUD's record. No wider housing rules change.",
            timeline: (proceeding?.history ?? ruled?.procedure?.history ?? []).map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled), ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    if (row?.subject?.kind === "wage-hour-enforcement" && row.matter) {
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const complaint = campaign.services?.["wage-complaints"]?.wageComplaint;
        const shortfall = complaint ? Math.max(0, complaint.requiredPay - complaint.paid) : 0;
        return { ...row, summary: row.matter.injury, reversed: [],
            unreversed: complaint?.status === "recovered"
                ? `The Labor Department recorded that this worker got back $${shortfall} in unpaid overtime, plus $${shortfall} more in damages the law adds. No other employer's payroll changed.`
                : complaint?.status === "recovery-ordered"
                    ? `The employer in this case owes this worker $${shortfall} in overtime, plus $${shortfall} more in damages the law adds. The Labor Department hasn't collected it yet.`
                    : "The Secretary of Labor is suing for this one worker's pay. The employer's other workers aren't part of the case.",
            timeline: (proceeding?.history ?? ruled?.procedure?.history ?? []).map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled), ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    if (row?.subject?.kind === "commission-removal" && row.matter) {
        const subject = row.subject;
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const member = nameOf(campaign, subject.person) ?? "The removed member";
        const back = campaign.institutions[subject.institution]?.leader === subject.person;
        return { ...row, summary: row.matter.injury, reversed: [],
            unreversed: !ruled
                ? `The removal stands while the case goes on. ${member} stays out of the seat unless a final judgment says otherwise.`
                : ruled.holding === "upheld"
                    ? `The court let the removal stand. ${member} doesn't get the seat back and is owed nothing.`
                    : back
                        ? `The court ruled the removal unlawful. ${member} is back in the seat and is owed back pay from the day of the removal.`
                        : `The court ruled the removal unlawful, but the seat couldn't be returned. ${member} is owed back pay from the day of the removal.`,
            timeline: (proceeding?.history ?? ruled?.procedure?.history ?? []).map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled), ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    if (row?.subject?.kind === "unlawful-surveillance" && row.matter) {
        const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === id);
        const incident = campaign.security.intelligence.surveillanceIncident;
        return { ...row, summary: row.matter.injury, reversed: [],
            unreversed: incident?.status === "complied"
                ? `The officials responsible owe $${incident.damages} in damages. Separately, the NSA recorded in week ${incident.compliedTurn} that it deleted the data and shut down the unauthorized collection. The court didn't order that deletion.`
                : incident?.status === "damages-ordered"
                    ? `The officials responsible owe $${incident.damages} in damages. Deleting the data is a separate step for the agency, not something the court ordered under §1810.`
                    : "The improper collection that came to light stays on the Inspector General's record. The court hasn't ordered any damages yet.",
            timeline: (proceeding?.history ?? ruled?.procedure?.history ?? []).map((moment) => ({ date: dateOf(campaign, moment.turn), text: moment.account })),
            votes: votesOf(campaign, ruled), ...(ruled ? { opinion: ruled.opinion } : {}), paths: [] };
    }
    const record = campaign.orders.find((entry) => entry.id === id);
    const order = record ? executiveOrder(record.order) : undefined;
    if (!row || !record || !order)
        return undefined;
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === id);
    const ruled = campaign.judiciary.cases.find((entry) => entry.id === id || entry.id === proceeding?.id);
    const majorityAuthor = nameOf(campaign, ruled?.majorityAuthor);
    const dissentAuthor = nameOf(campaign, ruled?.dissentAuthor);
    const construction = record.subject?.kind === "construction" ? record.subject : undefined;
    const source = construction
        ? campaign.militaryConstructionProjects?.find((project) => project.id === construction.sourceId)
        : undefined;
    const unreversed = source && construction
        ? `${(source.redirected ?? construction.amount).toLocaleString()} million dollars that Congress set aside for construction was moved away from ${source.name}. ${(source.redirectedObligated ?? 0).toLocaleString()} million dollars is committed to emergency construction, and ${(source.redirectedSpent ?? 0).toLocaleString()} million dollars has been spent. ${record.endReason ? "Ending the order stopped any new commitments" : "A court ruling against the order would stop any new commitments"}, but money already committed or spent can't be taken back.`
        : unreversedCost(order);
    return {
        ...row,
        summary: row.matter?.injury ?? order.summary,
        ...(row.partyRelief?.active ? { partyEffects: reversedEffects(row.partyRelief.outstanding) } : {}),
        ...reversalOf(campaign, record, order),
        ...(unreversed ? { unreversed } : {}),
        timeline: timelineOf(campaign, record, order, ruled, proceeding),
        votes: votesOf(campaign, ruled),
        ...(row.circuit ? { circuitVotes: circuitVotesOf(campaign, row) } : {}),
        ...(majorityAuthor ? { majorityAuthor } : {}),
        ...(dissentAuthor ? { dissentAuthor } : {}),
        ...(ruled ? { opinion: ruled.opinion } : {}),
        paths: pathsFor(campaign, row),
    };
}
