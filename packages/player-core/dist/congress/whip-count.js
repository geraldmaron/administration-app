import { assessMemberSupport } from "./support-assessment.js";
import { CHAMBERS, actOf, restrainsThePresident, } from "@admin/engine";
import { STATE_IDS, stateById } from "@admin/world";
import { CHAMBER_TITLE } from "./floor-schedule.js";
const SWING_SHOWN = 5;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** Each row's share of a quota scaled to `total`, holding every row at or under its cap. */
function waterFill(total, rows, desired) {
    const out = rows.map(() => 0);
    const fixed = new Set();
    for (let pass = 0; pass <= rows.length; pass += 1) {
        const free = rows.map((_, i) => i).filter((i) => !fixed.has(i));
        const remaining = total - [...fixed].reduce((sum, i) => sum + rows[i].cap, 0);
        const mass = free.reduce((sum, i) => sum + desired[i], 0);
        const capMass = free.reduce((sum, i) => sum + rows[i].cap, 0);
        const over = [];
        for (const i of free) {
            const value = mass > 0 ? (desired[i] * remaining) / mass : capMass > 0 ? (rows[i].cap * remaining) / capMass : 0;
            out[i] = value;
            if (value > rows[i].cap)
                over.push(i);
        }
        if (over.length === 0)
            break;
        for (const i of over) {
            fixed.add(i);
            out[i] = rows[i].cap;
        }
    }
    return out;
}
/** Whole votes from a fractional split, largest remainders first, ties in state order. */
function roundToTotal(total, rows, shares) {
    const floors = shares.map((share, i) => Math.min(rows[i].cap, Math.floor(share + 1e-9)));
    let left = total - floors.reduce((sum, n) => sum + n, 0);
    const order = shares
        .map((share, i) => ({ i, rest: share - floors[i] }))
        .sort((a, b) => b.rest - a.rest || a.i - b.i);
    const out = [...floors];
    for (const { i } of order) {
        if (left <= 0)
            break;
        if (out[i] < rows[i].cap) {
            out[i] = out[i] + 1;
            left -= 1;
        }
    }
    return out;
}
/**
 * Place `total` yeas across rows of members, each row voting yea at the
 * caucus's own rate moved by how far its weight sits from the caucus's mean.
 * Sums to `total` exactly and never exceeds a row's seats.
 */
export function spreadVotes(total, rows) {
    const seats = rows.reduce((sum, row) => sum + row.cap, 0);
    const target = Math.max(0, Math.min(seats, Math.round(total)));
    if (seats === 0)
        return new Map();
    const rate = target / seats;
    const mean = rows.reduce((sum, row) => sum + row.cap * row.weight, 0) / seats;
    const desired = rows.map((row) => row.cap * clamp01(rate + row.weight - mean));
    const placed = roundToTotal(target, rows, waterFill(target, rows, desired));
    return new Map(rows.map((row, i) => [row.key, placed[i]]));
}
function delegationsFor(campaign, vote, frame) {
    if (vote.rollCall)
        return STATE_IDS.flatMap((state) => {
            const members = vote.rollCall.filter((member) => member.state === state);
            if (members.length === 0)
                return [];
            const yeas = members.filter((member) => member.yea).length;
            const nays = members.length - yeas;
            return [{ state, name: stateById.get(state)?.name ?? state, seats: members.length, yeas, nays, withYou: frame === "with" ? yeas : nays }];
        });
    return []; // Legacy aggregate votes do not establish any individual or state vote.
}
function chamberWhip(campaign, vote, frame) {
    const delegations = delegationsFor(campaign, vote, frame);
    const swing = delegations
        .filter((row) => row.yeas > 0 && row.nays > 0)
        .sort((a, b) => Math.min(b.yeas, b.nays) - Math.min(a.yeas, a.nays) || b.seats - a.seats || a.state.localeCompare(b.state))
        .slice(0, SWING_SHOWN);
    const placed = delegations.reduce((sum, row) => sum + row.yeas, 0);
    const presiding = delegations.length > 0 ? vote.yeas - placed : 0;
    return { chamber: vote.chamber, name: CHAMBER_TITLE[vote.chamber], vote, delegations, swing, presiding };
}
function countFor(campaign, bill) {
    const act = actOf(bill);
    const passageFrame = act && restrainsThePresident(act) ? "against" : "with";
    if (bill.status === "in-progress") {
        return { question: "passage", frame: passageFrame, votes: [] };
    }
    if (bill.status === "on-the-desk")
        return { question: "override", frame: "against", votes: [] };
    const votes = bill.status === "dead" ? bill.passage.filter((vote) => vote.recordedTurn !== undefined || vote.cloture?.recordedTurn !== undefined).map((vote) => vote.recordedTurn === undefined ? vote.cloture : vote) : bill.passage;
    return { question: "recorded", frame: passageFrame, votes };
}
/**
 * The count a bill faces next, by chamber and by delegation: the floor count
 * while it is in the chambers, the override count while it is on the desk,
 * and the recorded count once it is settled.
 */
export function whipCount(campaign, bill) {
    const { question, frame, votes } = countFor(campaign, bill);
    const ordered = CHAMBERS.flatMap((chamber) => votes.filter((vote) => vote.chamber === chamber));
    return { question, frame, assessment: question === "recorded" ? [] : assessMemberSupport(campaign, bill, question === "override"), chambers: ordered.map((vote) => chamberWhip(campaign, vote, frame)) };
}
/** One chamber's whip, by state, for the map: how much of each delegation is with the administration. */
export function whipByState(whip, chamber) {
    const found = whip.chambers.find((entry) => entry.chamber === chamber);
    return new Map((found?.delegations ?? []).map((row) => [row.state, row]));
}
