import { strikeDownChance } from "./strike-odds.js";
export function openedProceeding(recordId, orderId, filedTurn, dueTurn, matter) {
    return { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId }, filedTurn,
        ...(matter ? { matter } : {}), stage: "threshold", nextTurn: dueTurn,
        history: [{ turn: filedTurn, stage: "threshold", account: `${matter?.parties[0]?.name ?? "A challenger"} files; the lower court has not ruled.` }] };
}
export function courtStep(proceeding, stage, turn, account, extra = {}) {
    return { ...proceeding, ...extra, stage, nextTurn: stage === "final" ? turn : turn + 1,
        history: [...proceeding.history, { turn, stage, account }] };
}
export function thresholdPasses(charter, order, ground, draw) {
    const merits = strikeDownChance(charter, order, undefined, ground);
    return draw < Math.min(0.98, 0.65 + merits * 0.3);
}
export function lowerMerits(charter, order, ground, draw) {
    return draw < strikeDownChance(charter, order, undefined, ground) ? "struck-down" : "upheld";
}
export function appealGrantChance(ground, lower, adjustment = 0) {
    return Math.min(0.9, Math.max(0.1, (ground === "forbidden" && lower === "upheld" ? 0.8 : lower === "struck-down" ? 0.55 : 0.35) + adjustment));
}
export function appealGranted(ground, lower, draw, adjustment = 0) {
    return draw < appealGrantChance(ground, lower, adjustment);
}
