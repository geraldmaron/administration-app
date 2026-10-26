import { benchForVotes, caseQuestion, constitutionalGround, executiveOrder, institutionDef, judiciaryBenchSeats, judiciarySeatInstitution, majorityStrikeChance, selectDateOfTurn, selectNominationForOffice, selectPerson, specializedGround, specializedMeritsChance, } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { assessmentProfile } from "../dossier/assessment-profile";
import { attributeIsRead } from "../dossier/attribute-consequence";
import { formatDate } from "../format/figures";
import { nominationStanding } from "../government/machine";
import { place } from "../navigation/places";
const AXIS_WORDS = {
    economicLeftRight: { label: "On the economy", ends: ["Left", "Right"], steps: ["Leans left", "Leans a little left", "Center", "Leans a little right", "Leans right"] },
    authLibertarian: { label: "On government power", ends: ["Individual liberty", "Executive authority"], steps: ["Favors liberty", "Leans toward liberty", "Center", "Leans toward authority", "Favors authority"] },
    nationalistGlobalist: { label: "On the world", ends: ["Works with other countries", "Puts the nation first"], steps: ["Favors working with other countries", "Leans toward working with other countries", "Center", "Leans toward putting the nation first", "Puts the nation first"] },
};
const AXIS_ORDER = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
/** Where a value sits on a scale, in its five steps. */
function axisWord(value, words) {
    if (value <= -0.33)
        return words.steps[0];
    if (value < -0.1)
        return words.steps[1];
    if (value <= 0.1)
        return words.steps[2];
    if (value < 0.33)
        return words.steps[3];
    return words.steps[4];
}
/** The three scales, in the order the glossary names them. */
export function leanAxes(ideology) {
    return AXIS_ORDER.map((key) => ({ key, label: AXIS_WORDS[key].label, ends: AXIS_WORDS[key].ends, value: ideology[key], word: axisWord(ideology[key], AXIS_WORDS[key]) }));
}
function seatOffice(seat) {
    const institution = judiciarySeatInstitution(seat);
    const office = institution ? institutionDef(institution)?.offices[0] : undefined;
    return institution && office ? { institution, office: office.id, title: office.title } : undefined;
}
function pendingFor(campaign, office) {
    const nomination = selectNominationForOffice(campaign, office);
    if (!nomination)
        return undefined;
    return { name: selectPerson(campaign, nomination.nominee)?.base.name ?? "A nominee", standing: nominationStanding(nomination) };
}
/** The nine seats as the campaign holds them, and how they line up. */
export function benchReading(campaign) {
    const seats = judiciaryBenchSeats(campaign).flatMap((row) => {
        const office = seatOffice(row.seat);
        if (!office)
            return [];
        const person = row.personId ? selectPerson(campaign, row.personId)?.base : undefined;
        const lean = person && !row.vacant ? person.ideology.economicLeftRight : undefined;
        const pending = pendingFor(campaign, office.office);
        return [
            {
                seat: row.seat,
                title: office.title,
                office: office.office,
                institution: office.institution,
                vacant: row.vacant,
                chief: row.senior,
                name: row.name,
                ...(row.personId && !row.vacant ? { personId: row.personId, href: place.person(row.personId) } : {}),
                ...(lean !== undefined ? { lean, leanWord: axisWord(lean, AXIS_WORDS.economicLeftRight) } : {}),
                ...(pending ? { pending } : {}),
            },
        ];
    });
    const seated = seats.filter((seat) => !seat.vacant).length;
    const byLean = [...seats].sort((a, b) => (a.lean ?? 2) - (b.lean ?? 2) || a.seat - b.seat);
    return { seats, byLean, seated, vacancies: seats.length - seated, majority: Math.floor(seated / 2) + 1 };
}
function voteOf(campaign, entry, personId) {
    const cast = entry.votes.find((vote) => vote.justice === personId);
    if (!cast)
        return undefined;
    const majorityVote = entry.holding === "struck-down" ? "strike" : "uphold";
    const wrote = entry.majorityAuthor === personId ? "majority" : entry.dissentAuthor === personId ? "dissent" : undefined;
    return {
        caseId: entry.id,
        href: place.case(entry.id.startsWith("case:") ? entry.id.slice(5) : entry.id),
        order: entry.matter?.title ?? (entry.order ? executiveOrder(entry.order)?.name ?? entry.order : "Court matter"),
        ruled: formatDate(selectDateOfTurn(campaign, entry.ruledTurn)),
        vote: cast.vote,
        holding: entry.holding,
        withMajority: entry.procedure?.appeal !== "equally-divided" && cast.vote === majorityVote,
        ...(wrote ? { wrote } : {}),
    };
}
/** A seated justice's file: where they sit, the five readings in words, and how they have voted. */
export function justiceFile(campaign, personId) {
    const seat = benchReading(campaign).seats.find((row) => row.personId === personId);
    const person = seat ? selectPerson(campaign, personId)?.base : undefined;
    if (!seat || !person)
        return undefined;
    const votes = [...campaign.judiciary.cases]
        .sort((a, b) => b.ruledTurn - a.ruledTurn || a.id.localeCompare(b.id))
        .flatMap((entry) => voteOf(campaign, entry, personId) ?? []);
    return {
        personId,
        name: person.name,
        seat: seat.seat,
        title: seat.title,
        chief: seat.chief,
        axes: leanAxes(person.ideology),
        readings: assessmentProfile(person, { subject: "justice" }).readings.filter((reading) => attributeIsRead(reading.key, "justice")),
        votes,
    };
}
export const GROUND_WORDS = {
    silent: "Congress has said nothing on it",
    authorized: "Congress authorized it",
    forbidden: "Congress forbade it",
};
/** The odds `judicialReviewPhase` rolls a pending case against, read with this week's bench and statute book. */
export function pendingStrikeChance(campaign, order, record, proceeding) {
    const lower = proceeding.circuit?.holding ?? proceeding.lower?.holding;
    if (!lower)
        return undefined;
    const rule = campaign.pendingRules.find((entry) => entry.id === record.id);
    const ground = specializedGround(proceeding.matter, rule, constitutionalGround(campaign, order.id), record, campaign);
    return majorityStrikeChance(charterOf(campaign), order, benchForVotes(campaign, record), ground, lower, (member) => specializedMeritsChance(charterOf(campaign), order, proceeding.matter, rule, member, ground));
}
function splitOf(entry) {
    if (entry.procedure?.forum === "lower")
        return "District court";
    if (entry.procedure?.forum === "circuit")
        return "Circuit court";
    if (entry.votes.length === 0)
        return "Unsigned ruling";
    const strikes = entry.votes.filter((vote) => vote.vote === "strike").length;
    const upholds = entry.votes.length - strikes;
    if (entry.procedure?.appeal === "equally-divided")
        return `${strikes} to ${upholds}, equally divided`;
    return entry.holding === "struck-down" ? `${strikes} to ${upholds}` : `${upholds} to ${strikes}`;
}
function docketRow(campaign, record, order) {
    const review = record.review;
    if (!review)
        return undefined;
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === record.id);
    const response = proceeding && campaign.cases?.[`case:review:${proceeding.id}`];
    const responseDue = proceeding?.stage === "appeal" && proceeding.lower?.holding === "struck-down"
        && !proceeding.governmentReview && response?.clock.kind === "operational"
        ? formatDate(response.clock.dueAt) : undefined;
    if (record.order === "order-entry-suspension" && !proceeding)
        return undefined;
    const ruled = campaign.judiciary.cases.find((entry) => entry.id === record.id || entry.id === proceeding?.id);
    const ground = ruled?.ground ?? constitutionalGround(campaign, record.order);
    const base = {
        id: record.id,
        href: place.case(record.id),
        order: record.order,
        orderName: proceeding?.matter?.title ?? order.name,
        question: ruled?.question ?? proceeding?.matter?.question ?? caseQuestion(order, ground),
        ground,
        groundWords: GROUND_WORDS[ground],
        signed: formatDate(selectDateOfTurn(campaign, record.turn)),
        due: formatDate(selectDateOfTurn(campaign, proceeding?.nextTurn ?? review.dueTurn)),
        weeksLeft: (proceeding?.nextTurn ?? review.dueTurn) - campaign.turn,
        ...(record.endReason ? { endReason: record.endReason,
            ended: formatDate(selectDateOfTurn(campaign, record.rescindedTurn ?? campaign.turn)) } : {}),
        ...(proceeding ? { stage: proceeding.stage, lower: proceeding.lower, lowerForum: proceeding.lowerForum,
            circuitPanel: proceeding.circuitPanel,
            circuit: proceeding.circuit, interim: proceeding.interim, appeal: proceeding.appeal,
            ...(proceeding.calendar ? { calendar: proceeding.calendar } : {}),
            ...(responseDue ? { responseDue } : {}),
            subject: proceeding.subject, ...(proceeding.matter ? { matter: proceeding.matter } : {}),
            ...(proceeding.partyRelief ? { partyRelief: proceeding.partyRelief } : {}) } : {}),
    };
    if (review.status === "pending") {
        const chance = proceeding?.stage === "supreme-merits" ? pendingStrikeChance(campaign, order, record, proceeding) : undefined;
        return { ...base, status: "pending", forum: proceeding?.stage === "supreme-merits" ? "supreme"
                : proceeding?.stage === "circuit-merits" || proceeding?.circuit ? "circuit" : "lower",
            ...(chance !== undefined ? { strikeChance: chance } : {}) };
    }
    const ruledTurn = ruled?.ruledTurn ?? review.ruledTurn ?? review.dueTurn;
    return {
        ...base,
        status: review.status,
        forum: ruled?.procedure?.forum,
        lowerForum: ruled?.procedure?.lowerForum ?? proceeding?.lowerForum,
        circuit: ruled?.procedure?.circuit ?? proceeding?.circuit,
        appeal: ruled?.procedure?.appeal,
        dismissedAtThreshold: ruled?.procedure?.dismissedAtThreshold,
        ruled: formatDate(selectDateOfTurn(campaign, ruledTurn)),
        ...(ruled ? { split: splitOf(ruled) } : {}),
    };
}
/** Every order and autonomous matter a represented federal court has taken up. */
export function courtDocket(campaign) {
    const orderRows = campaign.orders.flatMap((record) => {
        const order = executiveOrder(record.order);
        const row = order ? docketRow(campaign, record, order) : undefined;
        return row ? [row] : [];
    });
    const autonomousRows = (campaign.judiciary.proceedings ?? []).flatMap((proceeding) => {
        if (proceeding.subject.kind === "executive-order" || !proceeding.matter)
            return [];
        const ruled = campaign.judiciary.cases.find((entry) => entry.id === proceeding.id);
        const subject = proceeding.subject;
        const record = subject.kind === "statutory-authority"
            ? campaign.orders.find((entry) => entry.id === subject.recordId) : undefined;
        const row = {
            id: proceeding.id, href: place.case(proceeding.id),
            ...(proceeding.subject.kind === "statutory-authority" ? { order: proceeding.subject.orderId } : {}),
            orderName: proceeding.matter.title, question: proceeding.matter.question,
            ground: proceeding.subject.kind === "statutory-authority" ? "authorized" : "forbidden",
            groundWords: proceeding.subject.kind === "statutory-authority"
                ? "How far Congress's factory-production law reaches"
                : proceeding.subject.kind === "fair-housing-enforcement" ? "Fair Housing Act complaint against one housing provider"
                    : proceeding.subject.kind === "wage-hour-enforcement" ? "Overtime pay owed to one worker, under the FLSA"
                        : proceeding.subject.kind === "unlawful-surveillance" ? "Damages for someone spied on unlawfully, under FISA"
                            : proceeding.subject.kind === "commission-removal" ? "A removed commissioner's suit to get the seat back, after Trump v. Slaughter"
                                : "Accessible voting equipment under HAVA",
            signed: formatDate(selectDateOfTurn(campaign, record?.turn ?? proceeding.filedTurn)),
            due: formatDate(selectDateOfTurn(campaign, proceeding.nextTurn)),
            weeksLeft: proceeding.nextTurn - campaign.turn,
            ...(record?.endReason ? { endReason: record.endReason,
                ended: formatDate(selectDateOfTurn(campaign, record.rescindedTurn ?? campaign.turn)) } : {}),
            status: ruled?.holding ?? "pending", stage: proceeding.stage,
            forum: ruled?.procedure?.forum ?? (proceeding.stage === "supreme-merits" ? "supreme" : proceeding.stage === "circuit-merits" ? "circuit" : "lower"),
            lower: proceeding.lower, lowerForum: ruled?.procedure?.lowerForum ?? proceeding.lowerForum,
            circuitPanel: proceeding.circuitPanel,
            circuit: ruled?.procedure?.circuit ?? proceeding.circuit,
            interim: proceeding.interim, appeal: ruled?.procedure?.appeal ?? proceeding.appeal,
            subject: proceeding.subject, matter: proceeding.matter,
            ...(proceeding.partyRelief ? { partyRelief: proceeding.partyRelief } : {}),
            ...(ruled?.procedure?.relief ? { relief: ruled.procedure.relief } : {}),
            ...(ruled?.procedure?.dismissedAtThreshold ? { dismissedAtThreshold: true } : {}),
            ...(ruled ? { ruled: formatDate(selectDateOfTurn(campaign, ruled.ruledTurn)), ruledTurn: ruled.ruledTurn, split: splitOf(ruled) } : {}),
        };
        return [row];
    });
    const rows = [...orderRows, ...autonomousRows];
    return {
        pending: rows.filter((row) => row.status === "pending").sort((a, b) => a.weeksLeft - b.weeksLeft || a.id.localeCompare(b.id)),
        ruled: rows.filter((row) => row.status !== "pending").sort((a, b) => b.weeksLeft - a.weeksLeft || a.id.localeCompare(b.id)),
    };
}
