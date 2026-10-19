import { callCompact, coolFront, fileWarPowersReport, issueForceAuthorization, joinConflict, joinCost, leaveWar, offerTerms, sentenceCase, settleWar, terminateForce, terminationDaysRemaining, } from "@admin/engine";
import { actCell, congressAfter, dispositionMove } from "../congress/act-comparison";
import { costLines } from "../economy/lever-comparison";
import { warPowersBeforeJoin, joinPriceBeforeJoin } from "./war-powers-reading";
import { nationNameIn, SIDE_LABEL } from "./war-screen";
// The acts a war answers, each read as its change from today; a clock that runs
// without an answer is the waiting line. Every column is
// read off the same engine call its commit makes, so the price on the matrix
// is the price charged.
/** A refusal is thrown in the engine's own words, which the screen shows where the press happened. */
export function mustPacket(result) {
    if (!result.ok || !result.packet)
        throw new Error(result.reason ?? result.missingCapability ?? "The act was refused.");
    return result.packet;
}
/** The metric price a packet writes, as the lines a matrix prints. */
function packetCost(packet) {
    const total = {};
    for (const effect of packet.effects) {
        if (effect.kind !== "metric")
            continue;
        for (const [key, delta] of Object.entries(effect.deltas))
            total[key] = (total[key] ?? 0) + (delta ?? 0);
    }
    return costLines(total);
}
const FORECAST_WORDS = {
    likely: "Likely to take it",
    close: "Could go either way",
    unlikely: "Unlikely to take it",
};
const FORECAST_STANCE = { likely: "favorable", close: "caution", unlikely: "adverse" };
// --- Joining a war the United States is not in -----------------------------
const JOIN_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "price", label: "What it costs now" },
    { key: "home", label: "At home" },
    { key: "law", label: "War Powers law" },
    { key: "risk", label: "The risks" },
];
/** The packet a join commits: the engine's own, so a refusal reads in its words. */
export function joinPacket(campaign, conflictId, side) {
    return mustPacket(joinConflict(campaign, campaign.founding.nation, conflictId, side));
}
function joinColumn(campaign, conflictId, side) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict)
        return undefined;
    const alongside = nationNameIn(campaign, side === "aggressor" ? conflict.aggressor : conflict.defender);
    const against = nationNameIn(campaign, side === "aggressor" ? conflict.defender : conflict.aggressor);
    const head = { id: side, label: `Join ${alongside}`, verb: `Send forces beside ${alongside}` };
    const result = joinConflict(campaign, campaign.founding.nation, conflictId, side);
    if (!result.ok)
        return { ...head, refusal: result.reason, review: result.reason, cells: {} };
    const law = warPowersBeforeJoin(campaign, conflictId, side);
    const price = joinPriceBeforeJoin(campaign, conflictId, side);
    return {
        ...head,
        review: `The United States joins the war on ${alongside}'s side, against ${against}. ${law?.report.dueLabel ?? "You owe Congress a report"}.`,
        cells: {
            happens: actCell(`${SIDE_LABEL[side]} now has the United States with it. ${against} sees this as an act of war.`),
            price: actCell(costLines(joinCost(campaign, conflict, side)), "caution"),
            home: actCell(price?.words ?? ["We can't tell yet how people at home will react."]),
            law: actCell([law?.report.dueLabel ?? "", law?.cover ?? law?.withdrawal?.dueLabel ?? ""].filter((line) => line !== ""), law?.withdrawal ? "caution" : "neutral"),
            risk: actCell(law?.deterrence ? [law.deterrence] : [`${against} won't forget that you joined against it.`], law?.deterrence ? "adverse" : "caution"),
        },
    };
}
/** Joining either side of a war the United States is outside of */
export function joinComparison(campaign, conflictId) {
    const columns = ["defender", "aggressor"].flatMap((side) => joinColumn(campaign, conflictId, side) ?? []);
    if (columns.length === 0)
        return undefined;
    return {
        rows: JOIN_ROWS,
        columns,
    };
}
// --- Asking Congress for the authority to fight ----------------------------
const ASK_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "congress", label: "How Congress is likely to answer" },
    { key: "cost", label: "What it costs" },
];
/** The packet that sends the authorization to Congress. */
export function authorizationPacket(campaign, target) {
    return mustPacket(issueForceAuthorization(campaign, target));
}
/** Asking Congress to authorize force against a government; without a vote, the waiting line says what force rests on. */
export function authorizationComparison(campaign, target) {
    const name = nationNameIn(campaign, target);
    const asked = issueForceAuthorization(campaign, target);
    const head = { id: "ask", label: `Ask Congress about ${name}`, verb: "Ask Congress to approve force" };
    const column = asked.ok
        ? {
            ...head,
            review: asked.packet.narration.summary,
            cells: {
                happens: actCell("The House and Senate vote on the due date. If they say yes, you can use force against this government with no sixty-day limit."),
                congress: actCell([`${asked.projection.forecast.likelihood[0].toUpperCase()}${asked.projection.forecast.likelihood.slice(1)}, with ${asked.projection.forecast.confidence} confidence.`, asked.projection.reasoning]),
                cost: actCell("Asking costs nothing. If they say no, you lose some standing, and Congress thinks less of you.", "caution"),
            },
        }
        : { ...head, refusal: asked.reason, review: asked.reason, cells: {} };
    return {
        rows: ASK_ROWS,
        waiting: "Without a vote, any force you use rests on your own power as president, and the sixty-day clock starts when it begins.",
        columns: [column],
    };
}
// --- Ending the President's own war ----------------------------------------
const END_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "price", label: "What it costs" },
    { key: "answer", label: "Their answer" },
];
const END_HEAD = {
    cool: { label: "Ease the fighting", verb: "Pull back for a week" },
    offer: { label: "Offer terms", verb: "Offer terms to the other side" },
    settle: { label: "Make peace", verb: "Sign the peace deal" },
    leave: { label: "Leave the war", verb: "Take the United States out" },
};
/** The packet an ending commits, built at press time on the campaign the matrix priced. */
export function endPacket(campaign, conflictId, option) {
    switch (option) {
        case "cool":
            return mustPacket(coolFront(campaign, conflictId));
        case "offer":
            return mustPacket(offerTerms(campaign, conflictId));
        case "settle":
            return mustPacket(settleWar(campaign, conflictId));
        case "leave":
            return mustPacket(leaveWar(campaign, conflictId));
        default:
            throw new Error("That is not a way to end a war.");
    }
}
function endColumn(campaign, conflictId, option, answer) {
    const head = { id: option, ...END_HEAD[option] };
    const built = (() => {
        try {
            return { packet: endPacket(campaign, conflictId, option) };
        }
        catch (cause) {
            return { refusal: cause instanceof Error ? cause.message : "Not available today." };
        }
    })();
    if (built.refusal !== undefined)
        return { ...head, refusal: built.refusal, review: built.refusal, cells: {} };
    const summary = sentenceCase(built.packet.narration.summary);
    const cost = packetCost(built.packet);
    const answerCell = option === "offer" || option === "settle" ? (answer ? actCell(FORECAST_WORDS[answer], FORECAST_STANCE[answer]) : actCell("Unread")) : actCell("They aren't asked");
    return {
        ...head,
        review: summary,
        cells: {
            happens: actCell(summary),
            price: actCell(cost.length > 0 ? cost : ["Costs no standing or military readiness"]),
            answer: answerCell,
        },
    };
}
/** How the President's own war can end or cool; until then it runs, which is the waiting line. */
export function endComparison(campaign, conflictId, role, answer) {
    const options = role === "principal" ? ["cool", "offer", "settle"] : ["cool", "leave"];
    return {
        rows: END_ROWS,
        waiting: "Until you end it, the war goes on as it is, and each week costs the country about what it costs now.",
        columns: options.map((option) => endColumn(campaign, conflictId, option, answer)),
    };
}
// --- The War Powers paper --------------------------------------------------
export const REPORT_AUTHORITIES = [
    { value: "Article II, as Commander in Chief", label: "Your own power as Commander in Chief (Article II)" },
    { value: "the authorization for the use of military force in effect", label: "The war authorization Congress passed" },
    { value: "the collective self-defense of an ally", label: "Defending an ally under attack" },
];
export const REPORT_WEEKS = [4, 8, 12, 26];
const REPORT_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "hill", label: "How Congress feels about you" },
];
/** The report as filed: the authority claimed, the scope the introduction described, and the estimate. */
export function reportPacket(campaign, obligation, terms) {
    return mustPacket(fileWarPowersReport(campaign, obligation.id, terms.authority, obligation.description, terms.weeks));
}
/** Filing the report Congress is owed; until it is filed, the law counts the days. */
export function reportComparison(campaign, obligation, terms) {
    const filed = fileWarPowersReport(campaign, obligation.id, terms.authority, obligation.description, terms.weeks);
    const column = filed.ok
        ? {
            id: "file",
            label: "File the report",
            verb: "File the report with Congress",
            review: filed.packet.narration.summary,
            cells: { happens: actCell(`The report goes to the leaders of the House and Senate. It cites ${terms.authority} and estimates ${terms.weeks} weeks.`), hill: dispositionMove(campaign.congress.disposition, congressAfter(filed.packet)) },
        }
        : { id: "file", label: "File the report", verb: "File the report with Congress", refusal: filed.reason, review: filed.reason, cells: {} };
    return {
        rows: REPORT_ROWS,
        waiting: "Until you file it, the law counts the days, and Congress is more upset by a late report than an on-time one.",
        columns: [column],
    };
}
/** The packet that brings the force out. */
export function terminatePacket(campaign, obligation) {
    return mustPacket(terminateForce(campaign, obligation.id));
}
/** Bringing the force out; until then, the sixty days count down. */
export function terminateComparison(campaign, obligation) {
    const result = terminateForce(campaign, obligation.id);
    const days = terminationDaysRemaining(campaign, obligation);
    const column = result.ok
        ? {
            id: "terminate",
            label: "Bring the troops home",
            verb: "End the use of force",
            review: result.packet.narration.summary,
            cells: {
                happens: actCell(days >= 0 ? "The troops leave within the sixty days, and the matter is closed." : "The troops leave after the sixty days. The record shows they stayed too long."),
                hill: actCell(days >= 0 ? "No complaint from Congress" : "The delay goes on your record", days >= 0 ? "favorable" : "caution"),
            },
        }
        : { id: "terminate", label: "Bring the troops home", verb: "End the use of force", refusal: result.reason, review: result.reason, cells: {} };
    return {
        rows: REPORT_ROWS,
        waiting: days >= 0 ? "Until they come home, the sixty days keep counting down." : "The troops are past the sixty days without a vote in Congress, and Congress grows colder the longer they stay.",
        columns: [column],
    };
}
// --- Calling a compact -----------------------------------------------------
const CALL_ROWS = [
    { key: "happens", label: "What happens" },
    { key: "price", label: "What it costs" },
    { key: "answers", label: "How the allies answer" },
];
/** The packet that calls the body to answer. */
export function callPacket(campaign, org, conflictId) {
    return mustPacket(callCompact(campaign, org, conflictId));
}
/** Calling the allies to answer. */
export function callComparison(campaign, conflictId, org, orgName, answers) {
    const called = callCompact(campaign, org, conflictId);
    const column = called.ok
        ? {
            id: "call",
            label: `Call ${orgName}`,
            verb: `Call on ${orgName}`,
            review: called.packet.narration.summary,
            cells: {
                happens: actCell(`Each ally decides how to answer during the war's next week.`),
                price: actCell(packetCost(called.packet)),
                answers: actCell(answers.length > 0 ? answers.map((answer) => `${answer.name}: ${FORECAST_WORDS[answer.forecast].toLowerCase()}`) : ["We don't have intelligence on how any member would answer"]),
            },
        }
        : { id: "call", label: `Call ${orgName}`, verb: `Call on ${orgName}`, refusal: called.reason, review: called.reason, cells: {} };
    return {
        rows: CALL_ROWS,
        columns: [column],
    };
}
