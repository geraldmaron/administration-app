import { selectOrders } from "./state.js";
// How far an order has reached past the office, and how likely the courts are
// to say so. Split out of the order catalogue so the odds of review can be read
// by the case file without loading the whole executive-order module, and so
// every term of one question — the check a charter puts on an order, the
// administration's own record of being refused, the minister defending it, the
// ground Congress has left it on, and the bench's reading of the same overreach
// — sits in one place rather than half here and half beside the catalogue.
/**
 * How much of a check the charter's own institutions actually are.
 *
 * A judiciary and an assembly are the two bodies that can refuse an order, and
 * a charter that seats neither — a junta compact answers to an officers'
 * council, not a court — is one where an order is contested by the people who
 * could remove the player instead, which is a rarer and far worse event. The
 * floor is what keeps a charter with no courts from being a free hand.
 */
export function institutionalCheck(charter) {
    const kinds = new Set(charter.institutions.map((institution) => institution.kind).filter(Boolean));
    return clamp01((kinds.has("judiciary") ? 0.55 : 0) + (kinds.has("assembly") ? 0.35 : 0) + 0.15);
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const STRIKE_MIN = 0.05;
const STRIKE_MAX = 0.9;
/**
 * How much of the overreach a statute answers for.
 *
 * An authorized order is not an unreviewable one — a court can still find that
 * Congress had no power to authorize what it authorized — so the relief is
 * large and short of total. It is applied to the institutional term rather than
 * to the finished odds because what a statute changes is the reading of how far
 * the act reached past the office, which is the only thing that term measures.
 */
const AUTHORIZED_RELIEF = 0.45;
/**
 * What the three grounds do to the institutional reading of an order.
 *
 * Silence leaves it exactly where it was, which is what makes this a widening
 * of the model rather than a retune of it: an order nobody has legislated about
 * is priced today the way it was priced before Congress could speak at all.
 *
 * Exported because the challenge and the strike-down are the same question put
 * to two bodies, and the relief a statute buys has to be the same size at both
 * or a player would read one number before signing and meet another at the
 * bench.
 */
export function groundFactor(ground) {
    return ground === "authorized" ? 1 - AUTHORIZED_RELIEF : 1;
}
/** How much every previously contested order adds to the next one's odds. */
const OVERREACH_STEP = 0.12;
/**
 * What the administration's own record does to it. Only contested orders count:
 * an order nobody challenged did not establish that this government reaches too
 * far, and counting it would make the mere use of the instrument the offense
 * rather than the overreach.
 */
export function accumulatedOverreach(campaign) {
    return selectOrders(campaign).filter((record) => record.contested).length * OVERREACH_STEP;
}
/** How far a minister can move the odds, either way. */
const MINISTER_SWAY = 0.25;
/**
 * The seated minister's effect on a challenge.
 *
 * Competence defends the order — a well-drafted instrument survives review —
 * and loyalty is the other half: a minister who does not want to be holding
 * this is a minister the challengers can talk to. Both are read off the same
 * Person the rest of the cabinet model reads, and a vacant chair is priced at
 * neither end, because a ministry with nobody in it neither defends the order
 * nor betrays it.
 */
export function ministerSway(minister) {
    if (!minister)
        return 1;
    const standing = minister.base.competence * 0.6 + minister.base.loyalty * 0.4;
    return 1 - MINISTER_SWAY * (standing - 0.5) * 2;
}
export function orderDomainLean(order) {
    const pull = order.alignment;
    return {
        economicLeftRight: pull.economicLeftRight ?? 0,
        authLibertarian: pull.authLibertarian ?? (order.domain === "security" || order.domain === "emergency" ? 0.25 : 0),
        nationalistGlobalist: pull.nationalistGlobalist ?? (order.domain === "security" ? 0.15 : 0),
    };
}
export function ideologyDistanceFromLean(ideology, lean) {
    const axes = [
        ideology.economicLeftRight - lean.economicLeftRight,
        ideology.authLibertarian - lean.authLibertarian,
        ideology.nationalistGlobalist - lean.nationalistGlobalist,
    ];
    return axes.reduce((total, gap) => total + Math.abs(gap), 0) / (axes.length * 2);
}
function median(values) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
/**
 * How likely a challenged order is to be struck down.
 *
 * Read off the same overreach the challenge itself was read off, because it is
 * the same question asked by a different body. When a bench is provided, the
 * median distance from the order's domain lean and the bench's own
 * integrity/competence add uncertainty rather than turning review into a
 * partisan scoreboard.
 *
 * `ground` is the third thing the bench actually asks, and the one the model
 * had no way to represent: whether Congress has authorized the act, said
 * nothing about it, or forbidden it. It is passed already resolved rather than
 * as the campaign so that this module stays readable from the case file without
 * pulling in the statute book.
 */
export function strikeDownChance(charter, order, bench, ground = "silent") {
    // An order Congress has forbidden and the President signed anyway is at the
    // lowest ebb of the office's power, and there is nothing left for a bench to
    // weigh: it goes to the ceiling and no term below can bring it back down.
    if (ground === "forbidden")
        return STRIKE_MAX;
    const institutional = order.overreach * institutionalCheck(charter) * groundFactor(ground);
    const base = 0.15 + institutional * 0.8;
    if (!bench || bench.length === 0) {
        return clamp01(Math.min(STRIKE_MAX, base));
    }
    const lean = orderDomainLean(order);
    const medianDistance = median(bench.map((member) => ideologyDistanceFromLean(member.ideology, lean)));
    const judicialSkill = median(bench.map((member) => member.integrity * 0.55 + member.competence * 0.45));
    const uncertainty = (1 - judicialSkill) * 0.12;
    const ideologicalTerm = medianDistance * 0.28;
    const blended = base * 0.55 + ideologicalTerm + institutional * 0.25 + uncertainty;
    return Math.max(STRIKE_MIN, Math.min(STRIKE_MAX, blended));
}
/**
 * One justice's inclination to strike, read off the same terms as the
 * bench's odds with their own ideology and skill in place of the medians. The
 * bench's odds stay the median formula above; this is what orders the votes
 * behind them, never what decides the holding.
 */
export function justiceStrikePropensity(charter, order, member, ground = "silent") {
    if (ground === "forbidden")
        return STRIKE_MAX;
    const institutional = order.overreach * institutionalCheck(charter) * groundFactor(ground);
    const base = 0.15 + institutional * 0.8;
    const distance = ideologyDistanceFromLean(member.ideology, orderDomainLean(order));
    const skill = member.integrity * 0.55 + member.competence * 0.45;
    const blended = base * 0.55 + distance * 0.28 + institutional * 0.25 + (1 - skill) * 0.12;
    return Math.max(STRIKE_MIN, Math.min(STRIKE_MAX, blended));
}
