import { liveNation } from "./instrument-gates.js";
import { markedFlags } from "./marked-flags.js";
import { REGIME_DIALS } from "./regime-dials.js";
import { createRngStreams } from "./rng.js";
import { daysBetween } from "./clock.js";
import { turnsFor } from "./pace.js";
// Operations one government runs against another's hold on power, through the
// paths the world already has. None of them is a new way for a government to
// fall: a sponsored coup is the existing coup hazard with a term added, a
// political operation moves the existing selection and confidence draws, and
// removing a leader seats the charter's successor through the existing
// succession. What this file adds is the bookkeeping that lets an operation run,
// be exposed, lapse, and leave a successor leaning toward whoever sponsored it.
/** Every operation on record, running or ended. Absent on older saves, which ran none. */
export function selectRegimeOperations(campaign) {
    return campaign.regimeOperations?.operations ?? [];
}
/** Every indictment the Justice Department has filed against a foreign leader, served or not. Absent on older saves, which filed none. */
export function selectIndictments(campaign) {
    return campaign.regimeOperations?.indictments ?? [];
}
/** The indictment on a government's leader that has not yet been served, if the Justice Department has filed one. */
export function openIndictment(campaign, target) {
    return selectIndictments(campaign).find((entry) => entry.target === target && entry.servedTurn === undefined);
}
export function indictmentId(target, turn) {
    return `indictment:${target}:${turn}`;
}
export function runningOperations(campaign, target) {
    return selectRegimeOperations(campaign).filter((op) => op.status === "running" && (target === undefined || op.target === target));
}
/** The standing acts, the ones that run until they land, lapse or are exposed. */
export const STANDING_ACTS = ["political-action", "coup-support"];
export function isStandingAct(act) {
    return STANDING_ACTS.includes(act);
}
/** How much of a standing operation's force is left after it has run this long. */
export function operationStrength(op, turn) {
    return Math.pow(0.5, Math.max(0, turn - op.startedTurn) / REGIME_DIALS.coupSupportHalfLifeWeeks);
}
/**
 * The weekly coup hazard a sponsor adds: the target's own exposure to a coup
 * (its proneness, its armed rival's ambition and how far it sits below full
 * order) times the operation's remaining strength. Read past the stability
 * ceiling: a sponsor can make a coup possible in a country that would not have
 * one on its own, which is the point of sponsoring one, but a country at full
 * order carries no exposure and gives the sponsor nothing to work with.
 */
export function sponsoredCoupTerm(campaign, nation, proneness, ambition) {
    const stability = campaign.nations[nation]?.stats.politics.regimeStability ?? 1;
    const exposure = proneness * ambition * Math.max(0, 1 - stability);
    return runningOperations(campaign, nation)
        .filter((op) => op.act === "coup-support")
        .reduce((sum, op) => sum + REGIME_DIALS.coupSupportWeight * exposure * operationStrength(op, campaign.turn), 0);
}
/** What a running political operation does to the target's next selection and to its parliament's patience. */
export function politicalActionPressure(campaign, nation) {
    const running = runningOperations(campaign, nation).filter((op) => op.act === "political-action");
    if (running.length === 0)
        return { standingPull: 0, confidenceLift: 1 };
    const strength = Math.max(...running.map((op) => operationStrength(op, campaign.turn)));
    return {
        standingPull: REGIME_DIALS.politicalActionStandingPull * strength,
        confidenceLift: 1 + (REGIME_DIALS.politicalActionConfidenceLift - 1) * strength,
    };
}
/** The id an operation is filed under: who, against whom, which act, from which week. */
export function operationId(act, sponsor, target, turn) {
    return `regime:${act}:${sponsor}:${target}:${turn}`;
}
/** The standing operation a covert regime act starts, filed the week it lands. */
export function startOperationEffect(ctx, act) {
    const op = {
        id: operationId(act, ctx.actor, ctx.target, ctx.campaign.turn),
        act,
        sponsor: ctx.actor,
        target: ctx.target,
        startedTurn: ctx.campaign.turn,
        status: isStandingAct(act) ? "running" : "done",
        ...(isStandingAct(act) ? {} : { endedTurn: ctx.campaign.turn }),
    };
    return { kind: "regime", upsert: op };
}
/**
 * The weekly chance a running operation comes out: its footprint, how well the
 * target looks, and how well the sponsor covers. A political operation leaves
 * half the footprint a coup does.
 */
export function exposureChance(campaign, op) {
    const target = campaign.nations[op.target]?.stats.security.counterIntel ?? 0;
    const sponsor = campaign.nations[op.sponsor]?.stats.security.counterIntel ?? 0;
    const footprint = op.act === "coup-support" ? REGIME_DIALS.footprint["coup-support"] : REGIME_DIALS.footprint["political-action"];
    return REGIME_DIALS.exposureBase * footprint * (0.5 + target) * (1.5 - sponsor);
}
/** The flag a story about an exposed operation run by the President's own government stands on. */
export function exposureScandalFlag(op) {
    return `scandal:exposed-operation-${op.target}`;
}
function nationName(campaign, id) {
    return campaign.nations[id]?.base.identity.name ?? id;
}
/** What exposure leaves: a target government that remembers, and, when the sponsor is the player, a story. */
export function exposureEffects(campaign, op) {
    const ended = { ...op, status: "exposed", endedTurn: campaign.turn, exposedTurn: campaign.turn };
    const effects = [
        { kind: "regime", upsert: ended },
        { kind: "relationship", from: op.target, to: op.sponsor, deltas: { trust: -REGIME_DIALS.exposedGrudge * 0.5, tension: REGIME_DIALS.exposedGrudge * 0.5, alignment: REGIME_DIALS.exposedAlignment } },
    ];
    if (op.sponsor === campaign.founding.nation) {
        effects.push({ kind: "flag", set: markedFlags([exposureScandalFlag(op)], campaign.turn) });
    }
    return effects;
}
function exposurePacket(campaign, op) {
    const summary = `An operation by ${nationName(campaign, op.sponsor)} against the government of ${nationName(campaign, op.target)} comes to light.`;
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary },
        effects: [...exposureEffects(campaign, op), { kind: "feed", items: [{ turn: campaign.turn, kind: "drift", visibility: "public", headline: summary }] }],
    };
}
function lapsePacket(campaign, op) {
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        background: true,
        narration: { summary: `An operation against the government of ${nationName(campaign, op.target)} runs its course without result.` },
        effects: [{ kind: "regime", upsert: { ...op, status: "lapsed", endedTurn: campaign.turn } }],
    };
}
/** The government the operation was aimed at no longer sits: the operation is over, and its successor leans toward the sponsor. */
export function fellEffects(campaign, op) {
    const act = op.act === "coup-support" ? "coup-support" : "political-action";
    const installed = { turn: campaign.turn, alignment: REGIME_DIALS.installedAlignment[act], trust: REGIME_DIALS.installedTrust[act] };
    return [
        { kind: "regime", upsert: { ...op, status: "fell", endedTurn: campaign.turn, installed } },
        { kind: "relationship", from: op.target, to: op.sponsor, deltas: { alignment: installed.alignment, trust: installed.trust } },
    ];
}
/** Whether the government an operation was started against has since left office. */
export function targetFell(campaign, op) {
    return (campaign.foreignPolitics?.recent ?? []).some((change) => change.nation === op.target && change.kind !== "election" && changeTurn(campaign, change.date) >= op.startedTurn) || (campaign.foreignPolitics?.recent ?? []).some((change) => change.nation === op.target && change.kind === "election" && change.held !== true && changeTurn(campaign, change.date) >= op.startedTurn);
}
function changeTurn(campaign, date) {
    return campaign.turn - turnsFor(daysBetween(date, campaign.calendar));
}
/** One running operation's week: it fell, was exposed, lapsed, or carries on. */
function operationWeek(campaign, op) {
    if (targetFell(campaign, op)) {
        return { source: "simulate", actor: "world", turn: campaign.turn, background: true, narration: { summary: `The government ${nationName(campaign, op.sponsor)} worked against in ${nationName(campaign, op.target)} has fallen.` }, effects: fellEffects(campaign, op) };
    }
    const draw = createRngStreams(campaign.seed).stream("regime-exposure", op.id, campaign.turn).next();
    if (draw < exposureChance(campaign, op))
        return exposurePacket(campaign, op);
    if (campaign.turn - op.startedTurn >= REGIME_DIALS.operationWeeks)
        return lapsePacket(campaign, op);
    return undefined;
}
/** Every running operation's week. */
export function operationsWeek(campaign) {
    return runningOperations(campaign).flatMap((op) => {
        const packet = operationWeek(campaign, op);
        return packet ? [packet] : [];
    });
}
/** Whether a government declares an arsenal it can deliver: such powers are refused as targets. */
export function nuclearArmed(campaign, nation) {
    const arsenal = campaign.nations[nation] ? liveNation(campaign, nation).stats.military.arsenal : undefined;
    return arsenal !== undefined && arsenal.warheads > 0 && arsenal.deliveryTriad;
}
