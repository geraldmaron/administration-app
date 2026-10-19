import { commitmentWeeklyCost, describeCommitment, selectCommitments, setCommitmentStatus, } from "@admin/engine";
import { formatSignedPoints } from "../format/figures.js";
import { formatMoney } from "../format/money.js";
import { cell } from "../policy/choice-table.js";
import { holdingCount } from "../world/nation-forces.js";
// What the administration has promised abroad: aid, arms, deployments and
// basing, each with its status and what it costs a week. Pulling one back
// early is an act with a price on the other side, so the table reads it off
// the packet the engine would commit.
const STATUS_WORDS = { proposed: "Proposed", active: "Active", suspended: "Paused", "wound-down": "Ended" };
const STATUS_COLUMNS = [
    { status: "active", label: "Resume it" },
    { status: "suspended", label: "Pause it" },
    { status: "wound-down", label: "End it" },
];
function rowOf(campaign, commitment) {
    const forces = commitment.source.kind === "orderOfBattle" ? holdingCount(commitment.source.unitType, commitment.source.count) : undefined;
    const money = commitment.resource.spec.kind === "currency" ? commitment.resource.amountPerTurn : undefined;
    return {
        id: commitment.id,
        what: describeCommitment(commitment, campaign),
        kind: commitment.kind,
        status: commitment.status,
        statusWord: STATUS_WORDS[commitment.status],
        ...(money !== undefined ? { weekly: `${formatMoney(money)} a week` } : {}),
        ...(forces ? { forces } : {}),
        ...(commitment.source.kind === "orderOfBattle" ? { asset: { unitType: commitment.source.unitType, count: commitment.source.count } } : {}),
        review: commitment.review === "standing" ? "No end date" : `Reviewed in week ${commitment.review.endsTurn}`,
        rationale: commitment.rationale,
        final: commitment.status === "wound-down",
    };
}
/** The administration's commitments, those still standing first. */
export function commitmentsReading(campaign) {
    const rows = selectCommitments(campaign, campaign.founding.nation)
        .filter((commitment) => commitment.status !== "wound-down")
        .map((commitment) => rowOf(campaign, commitment));
    return { rows, weeklyBill: formatMoney(commitmentWeeklyCost(campaign)) };
}
function trustMove(packet) {
    const effect = packet.effects.find((entry) => entry.kind === "relationship");
    return effect?.kind === "relationship" ? { trust: effect.deltas?.trust ?? 0, tension: effect.deltas?.tension ?? 0 } : undefined;
}
/** Resuming, suspending or winding down one commitment, each read as its change from today. */
export function commitmentChoices(campaign, id) {
    const commitment = campaign.commitments[id];
    if (!commitment)
        return undefined;
    const options = STATUS_COLUMNS.filter((option) => option.status !== commitment.status).map((option) => ({ ...option, result: setCommitmentStatus(campaign, id, option.status, "Decided at the security desk.") }));
    const columns = options.map((option) => ({ id: option.status, label: option.label, ...(option.result.ok ? {} : { locked: `Not available right now. ${option.result.reason}` }) }));
    const weekly = commitment.resource.spec.kind === "currency" ? commitment.resource.amountPerTurn : 0;
    const bill = (status) => (status === "active" && weekly > 0 ? `${formatMoney(weekly)} a week` : weekly > 0 ? "Nothing, because the weekly payment stops" : "No weekly payment of its own");
    return {
        columns,
        rows: [
            { id: "bill", label: "Every week", cells: options.map((option) => cell(option.status === "active" && weekly > 0 ? `${bill(option.status)}, from nothing today` : bill(option.status), option.status === "active" && weekly > 0 ? "adverse" : "favorable")) },
            {
                id: "view",
                label: "How the other side takes it",
                cells: options.map((option) => {
                    const move = option.result.ok ? trustMove(option.result.packet) : undefined;
                    return move ? cell(`Their trust in you ${formatSignedPoints(move.trust)} pts, tension with them ${formatSignedPoints(move.tension)} pts, and a grudge that fades slowly`, "adverse") : cell("Nothing, because you're not breaking a promise");
                }),
            },
            { id: "after", label: "Afterward", cells: options.map((option) => cell(option.status === "wound-down" ? "Final. You can't restart it, only make a new commitment" : option.status === "suspended" ? "Can be restarted later" : "Running again")) },
            { id: "now", label: "Cost now", cells: options.map(() => cell("Nothing now. The weekly cost changes starting next week")) },
        ],
    };
}
export function commitmentOrder(campaign, id, status, reason) {
    const result = setCommitmentStatus(campaign, id, status, reason);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
