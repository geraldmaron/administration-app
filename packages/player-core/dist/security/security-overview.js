import { POSTURE_READINESS_COST, campaignDay, commandFor, commitmentWeeklyCost, describeCommitment, selectCommitments, selectFindings, selectNation, } from "@admin/engine";
import { formatMoney } from "../format/money.js";
import { nowReadings } from "../desk/now-readings.js";
import { place } from "../navigation/places.js";
import { zoneCommand } from "../geo/force-placement.js";
import { commandCards } from "./command-board.js";
import { collectionReports } from "./collection-reports.js";
import { covertReading } from "./covert-reading.js";
export const OPERATION_KIND_LABELS = {
    aid: "Aid",
    arms: "Arms",
    deployment: "Deployment",
    basing: "Basing",
    sustainment: "Sustainment",
    program: "Program",
    covert: "Covert",
};
/** A review inside this many weeks is flagged, so the table sorts what is about to lapse to the top. */
export const REVIEW_SOON_WEEKS = 4;
const STAGE_TONE = { proposed: "watch", active: "good", suspended: "watch", "wound-down": "neutral" };
const STAGE_WORDS = { proposed: "Proposed", active: "Active", suspended: "Paused", "wound-down": "Ended" };
const nationName = (campaign, id) => selectNation(campaign, id)?.base.identity.name ?? id;
function subjectOf(campaign, target) {
    if (target.kind === "nation")
        return { name: nationName(campaign, target.id), href: place.country(target.id) };
    if (target.kind === "conflict") {
        const conflict = campaign.conflicts[target.id];
        return { name: conflict ? `${nationName(campaign, conflict.aggressor)} and ${nationName(campaign, conflict.defender)}` : "A war abroad", href: place.war(target.id) };
    }
    return { name: target.id, href: place.organization(target.id) };
}
function theaterOf(id, cards) {
    const card = cards.find((entry) => entry.id === id);
    return card ? { abbr: card.abbr, href: card.href } : undefined;
}
function commitmentTheater(campaign, commitment) {
    if (commitment.location?.theater)
        return zoneCommand(campaign, commitment.location.theater);
    return commitment.target.kind === "nation" ? commandFor(campaign, commitment.target.id) : undefined;
}
function commitmentRow(campaign, commitment, cards) {
    const money = commitment.resource.spec.kind === "currency" ? commitment.resource.amountPerTurn : undefined;
    const reviewIn = commitment.review === "standing" ? undefined : commitment.review.endsTurn - campaign.turn;
    const soon = commitment.status === "active" && reviewIn !== undefined && reviewIn <= REVIEW_SOON_WEEKS;
    const theater = theaterOf(commitmentTheater(campaign, commitment), cards);
    return {
        id: commitment.id,
        kind: commitment.kind,
        kindLabel: OPERATION_KIND_LABELS[commitment.kind],
        what: describeCommitment(commitment, campaign),
        subject: subjectOf(campaign, commitment.target),
        ...(theater ? { theater } : {}),
        stage: STAGE_WORDS[commitment.status],
        tone: STAGE_TONE[commitment.status],
        ...(money !== undefined && money > 0 ? { weekly: money, weeklyText: formatMoney(money) } : {}),
        weeks: Math.max(0, campaign.turn - commitment.startedTurn),
        ...(reviewIn !== undefined ? { reviewIn } : {}),
        ...(soon ? { flag: { text: reviewIn <= 0 ? "Review due" : `Review in ${reviewIn} ${reviewIn === 1 ? "week" : "weeks"}`, tone: "watch" } } : {}),
        act: { kind: "commitment", id: commitment.id },
    };
}
function findingRows(campaign, cards) {
    const day = campaignDay(campaign);
    const open = new Map(covertReading(campaign).open.map((row) => [row.id, row]));
    return selectFindings(campaign).flatMap((finding) => {
        const row = open.get(finding.id);
        if (!row)
            return [];
        const theater = theaterOf(commandFor(campaign, finding.target), cards);
        return [
            {
                id: finding.id,
                kind: "covert",
                kindLabel: OPERATION_KIND_LABELS.covert,
                what: finding.objective,
                subject: { name: row.targetName, href: place.country(finding.target) },
                ...(theater ? { theater } : {}),
                stage: row.state,
                tone: row.owesNotice ? "watch" : "good",
                weeks: Math.max(0, Math.floor((day - finding.signedDay) / 7)),
                ...(row.owesNotice ? { flag: { text: "Owes Congress notice", tone: "watch" } } : {}),
                act: { kind: "close-finding", id: finding.id },
            },
        ];
    });
}
/** Every operation still open: covert findings standing and the commitments abroad that have not been wound down. */
export function operationRows(campaign) {
    const cards = commandCards(campaign);
    const commitments = selectCommitments(campaign, campaign.founding.nation)
        .filter((commitment) => commitment.status !== "wound-down")
        .map((commitment) => commitmentRow(campaign, commitment, cards));
    return [...findingRows(campaign, cards), ...commitments];
}
/** Military readiness with the one weekly charge the security desk can name exactly: the postures the commands hold. */
export function readinessReading(campaign, cards = commandCards(campaign)) {
    const charges = cards
        .filter((card) => card.effective !== "routine")
        .map((card) => ({ id: card.id, abbr: card.abbr, href: card.href, posture: card.effective, engaged: card.engaged, cost: POSTURE_READINESS_COST[card.effective] }))
        .sort((a, b) => b.cost - a.cost || a.abbr.localeCompare(b.abbr));
    return {
        reading: nowReadings(campaign).find((entry) => entry.key === "militaryReadiness"),
        weeklyCost: charges.reduce((sum, charge) => sum + charge.cost, 0),
        charges,
    };
}
export function postureTally(cards) {
    const count = (posture) => cards.filter((card) => card.effective === posture).length;
    return { surge: count("surge"), heightened: count("heightened"), routine: count("routine"), total: cards.length, engaged: cards.filter((card) => card.engaged).length };
}
/** The services' shares averaged over every asset line they field, so a fleet of small units does not outweigh a few large ones. */
export function forceTally(services) {
    const lines = services.reduce((sum, service) => sum + service.lines, 0);
    const weighted = (pick) => (lines > 0 ? services.reduce((sum, service) => sum + pick(service) * service.lines, 0) / lines : 0);
    return { ready: weighted((service) => service.ready), abroad: weighted((service) => service.abroad), resting: weighted((service) => service.resting), lines };
}
export function operationsTally(campaign, rows) {
    const kinds = Object.keys(OPERATION_KIND_LABELS).map((kind) => ({ kind, label: OPERATION_KIND_LABELS[kind], count: rows.filter((row) => row.kind === kind).length }));
    return { total: rows.length, byKind: kinds.filter((entry) => entry.count > 0), flagged: rows.filter((row) => row.flag).length, weeklyBill: commitmentWeeklyCost(campaign) > 0 ? `${formatMoney(commitmentWeeklyCost(campaign))} a week` : "No weekly payments" };
}
const isOverdue = (row) => row.missed || (row.clock !== undefined && row.clock.left < 0);
export function obligationTally(board) {
    const clocked = board.warPowers.filter((row) => row.clock && row.clock.left >= 0).sort((a, b) => a.clock.left - b.clock.left)[0];
    return {
        open: board.warPowers.length,
        overdue: board.warPowers.filter(isOverdue).length,
        ...(clocked ? { soonest: { target: clocked.target, left: clocked.clock.left, href: clocked.href } } : {}),
        authorizationsWaiting: board.authorizations.filter((row) => !row.standing).length,
        authorizationsGranted: board.authorizations.filter((row) => row.standing).length,
    };
}
export function intelTally(campaign, board) {
    const items = (urgency) => board.pdb.items.filter((item) => item.urgency === urgency).length;
    const reports = collectionReports(campaign);
    return {
        urgent: items("hard"),
        watch: items("soft"),
        ambient: items("ambient"),
        taskings: board.collection.taskings.length,
        reports: reports.length,
        stale: reports.filter((report) => report.stale).length,
        assessments: board.assessments.length,
        revised: board.assessments.filter((row) => row.changes.length > 0).length,
    };
}
/** The whole overview for one campaign; the board is passed in so the screen reads each ledger once. */
export function securityOverview(campaign, board) {
    const cards = [...board.commands, ...board.functional];
    const rows = operationRows(campaign);
    return {
        rows,
        readiness: readinessReading(campaign, cards),
        postures: postureTally(cards),
        force: forceTally(board.readiness),
        operations: operationsTally(campaign, rows),
        intel: intelTally(campaign, board),
        obligations: obligationTally(board),
    };
}
