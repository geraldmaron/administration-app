import { selectActiveConflicts, selectNation, } from "./state.js";
import { forceOnTheRecord } from "./force-record.js";
import { OPENING_WAR_SUPPORT, settle } from "./war-tick.js";
import { alliedDeterrence } from "./war-join.js";
import { possessive } from "./naming.js";
// A war is a state the board carries, not an event that resolves in the same
// breath it starts. Opening one is cheap; what it costs is decided week by
// week here, by the same seeded arithmetic for the player and for an NPC.
/**
 * Which side of a war a nation is on, principal or joiner, or none. It reads a
 * conflict rather than a campaign, which is why it lives here and not with the
 * campaign selectors in state.ts.
 */
export function sideOf(conflict, nation) {
    if (nation === conflict.aggressor || conflict.joined.aggressor.includes(nation))
        return "aggressor";
    if (nation === conflict.defender || conflict.joined.defender.includes(nation))
        return "defender";
    return undefined;
}
export function selectConflictsInvolving(campaign, nation) {
    return selectActiveConflicts(campaign).filter((conflict) => sideOf(conflict, nation) !== undefined);
}
/**
 * The live war between two nations in either direction, if there is one. The
 * pair is what matters, not who is nominally the aggressor: a second invasion
 * of a country already being invaded is the same war getting hotter.
 */
export function selectConflictBetween(campaign, a, b) {
    return selectActiveConflicts(campaign).find((conflict) => sideOf(conflict, a) !== undefined && sideOf(conflict, b) !== undefined);
}
export function conflictId(aggressor, defender, turn) {
    return `war:${aggressor}:${defender}:${turn}`;
}
export function openConflict(aggressor, defender, turn, cause, opening) {
    return {
        ...(opening ? { opening } : {}),
        id: conflictId(aggressor, defender, turn),
        aggressor,
        defender,
        joined: { aggressor: [], defender: [] },
        startedTurn: turn,
        cause,
        intensity: 0.5,
        warSupport: { ...OPENING_WAR_SUPPORT },
        exhaustion: { aggressor: 0, defender: 0 },
        status: "active",
        beats: [{ turn, description: cause }],
    };
}
/**
 * What a fresh act of war does to the board: it opens a conflict if the two
 * are not already fighting, and makes the existing one hotter if they are.
 * A second invasion of a country already under invasion is not a second war.
 */
export function openOrEscalate(campaign, aggressor, defender, cause, opening) {
    const existing = selectConflictBetween(campaign, aggressor, defender);
    if (!existing)
        return openConflict(aggressor, defender, campaign.turn, cause, opening);
    return escalate(existing, campaign.turn, cause);
}
/** A blow struck inside a war already running: hotter front, one more beat. */
export function escalate(conflict, turn, cause) {
    return {
        ...conflict,
        intensity: clamp01(conflict.intensity + ESCALATION_STEP),
        beats: [...conflict.beats, { turn, description: cause }],
    };
}
// --- What a decision can do to a war it is about ---
//
// Attrition and exhaustion end a war when the fighting has used both sides up.
// That is the only way one ended, which meant a scenario whose whole subject
// was the terms on the table could not put them into force: the room agreed to
// stop and the front went on billing the country every week. These are the
// moves a decision may make on a war instead, and they are deliberately the
// same size as the move that started it — one answer cools a front by exactly
// what one strike heats it.
const ESCALATION_STEP = 0.2;
/** The peace moves a conversation reply may make on a war the board is carrying. */
export const CONFLICT_MOVES = ["offerTerms", "acceptTerms", "deescalate"];
/**
 * The flag left when terms are put to the other side and not yet answered.
 * Keyed by conflict, so a second war with someone else does not read as the
 * same offer, and readable by a follow-up scenario the same way any other
 * governance flag is.
 */
export function termsOfferedFlag(conflictId) {
    return `terms-offered:${conflictId}`;
}
/**
 * A war ended at a table rather than by exhaustion. Status and shape are
 * `settle`'s, because a settled war has to look identical however it got
 * there — the ending screens, the feed and every selector read `status`, and a
 * second terminal shape would be a second set of rules to keep in step.
 */
export function settleByAgreement(conflict, turn, summary) {
    return settle(conflict, turn, "settled", summary);
}
/** A front cooled by a decision: still a war, one step less hot, one more beat. */
export function deescalateConflict(conflict, turn, summary) {
    return {
        ...conflict,
        intensity: clamp01(conflict.intensity - ESCALATION_STEP),
        beats: [...conflict.beats, { turn, description: summary }],
    };
}
/**
 * Deterrence is information, not a wall. The projection shows what a nuclear
 * defender makes of the odds and what it would cost to be wrong, and the
 * player commits with open eyes — a locked door would teach them nothing.
 *
 * Asked about the war an attack would start, it also reads who would come in
 * beside the victim, from the same forecast a war already on the board is
 * read with: an alliance deters by the governments it would bring, not by the
 * paper. Only asked for the rung that opens a war, because the forecast weighs
 * every government in the world.
 */
export function assessDeterrence(campaign, aggressor, defender, options = {}) {
    const aggressorArsenal = selectNation(campaign, aggressor)?.stats.military.arsenal;
    const defenderArsenal = selectNation(campaign, defender)?.stats.military.arsenal;
    const warheads = defenderArsenal?.warheads ?? 0;
    const defenderNuclear = warheads > 0;
    const mutual = defenderNuclear && (aggressorArsenal?.warheads ?? 0) > 0;
    const retaliationSeverity = defenderNuclear
        ? Math.min(1, 0.55 + (defenderArsenal?.deliveryTriad ? 0.35 : 0) + Math.min(0.1, warheads / 3000))
        : 0;
    const base = { defenderNuclear, mutual, retaliationSeverity, summary: deterrenceSummary(defenderNuclear, mutual) };
    if (!options.expectJoiners)
        return base;
    const allied = alliedDeterrence(campaign, openConflict(aggressor, defender, campaign.turn, ""));
    const summary = allied.line ? `${base.summary} ${allied.line}` : base.summary;
    return { ...base, summary, expectedJoiners: allied.expectedJoiners, alliedSeverity: allied.alliedSeverity };
}
function deterrenceSummary(defenderNuclear, mutual) {
    if (!defenderNuclear)
        return "No nuclear retaliation is available to the defender.";
    if (mutual)
        return "Both sides hold arsenals: an existential exchange is the failure mode, not a remote one.";
    return "The defender is nuclear-armed and its retaliation is not bounded by the objective.";
}
/**
 * What this act would do to the war ledger, or nothing at all.
 *
 * `undefined` is the honest answer for every act that neither opens a conflict
 * nor makes a running one hotter — which includes a strike on a country this
 * government is not fighting. A caller that renders a war line whenever this is
 * present is then correct by construction.
 */
export function projectConflictConsequence(campaign, actor, target, instrument, rung) {
    if (instrument !== "military" || rung < 3)
        return undefined;
    const ongoing = selectConflictBetween(campaign, actor, target);
    const name = (id) => selectNation(campaign, id)?.base.identity.name ?? id;
    if (ongoing) {
        return {
            opens: false,
            escalates: true,
            effect: "widens",
            headline: "This widens the war",
            summary: `The war with ${name(target)} gets hotter, and the front costs both sides more every week it runs.`,
        };
    }
    // A first strike where there is no war stops short of one: expensive,
    // answered, and it starts nothing. A second one inside the window does not.
    // A blockade is an act of war on its own, and an invasion is a war.
    if (rung === 4 && !forceOnTheRecord(campaign, actor, target))
        return undefined;
    const opening = rung === 4
        ? `Force has already been used between ${name(actor)} and ${name(target)} this season, and this makes it a war.`
        : rung === 3 ? `Closing ${possessive(name(target))} ports by force is an act of war, and this starts one with ${name(target)}.` : `This starts a war with ${name(target)}.`;
    const carried = `The board carries it from here — weekly attrition, allies choosing sides, and an end that arrives when one side is spent rather than when you decide.`;
    return { opens: true, escalates: false, effect: "starts", headline: "This starts a war", summary: `${opening} ${carried}` };
}
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
