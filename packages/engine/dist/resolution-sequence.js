import { rungBand } from "./consequences.js";
import { hashFraction } from "./rng.js";
import { sentenceCase } from "./naming.js";
import { movePhrase, rungCatalogueName, wireName } from "./wire.js";
/**
 * The canonical situation string, in the order the content package's own key
 * function writes it. It is a seed and a label, never a contract either side
 * parses: matching is done field by field below.
 */
export function resolutionSituationKey(situation) {
    return [situation.instrument, situation.rungBand, situation.valence, situation.riskId ?? "any"].join(":");
}
/** Whether one authored sequence answers one situation. */
function covers(entry, situation) {
    if (entry.instrument !== situation.instrument || entry.valence !== situation.valence)
        return false;
    if (!entry.rungBands.includes(situation.rungBand))
        return false;
    // No affinity is the floor for the cell: it fits any branch of its valence.
    if (!entry.riskAffinity)
        return true;
    return situation.riskId !== undefined && entry.riskAffinity.includes(situation.riskId);
}
/**
 * The sequence this situation plays, or nothing.
 *
 * Keyed rather than streamed: a resolution is read back on the Record and
 * re-rendered every time a screen mounts, and a stateful draw would give the
 * same act different steps on the second reading. The hash is over the campaign
 * seed, the act and the situation, so the same read is the same steps forever
 * and two campaigns that made the same move do not watch the same one.
 */
export function selectResolutionSequence(pool, situation, seed) {
    const eligible = pool.filter((entry) => entry.weight > 0 && covers(entry, situation));
    if (eligible.length === 0)
        return undefined;
    const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
    const roll = hashFraction(`${seed}::${resolutionSituationKey(situation)}`) * total;
    let cursor = 0;
    for (const entry of eligible) {
        cursor += entry.weight;
        if (roll < cursor)
            return entry;
    }
    // Floating-point residue at the very top of the range: the last one owns it.
    return eligible[eligible.length - 1];
}
function seedPartsFor(act) {
    return [act.campaignSeed, "resolution-sequence", act.actor, act.target, act.instrument, String(act.rung), String(act.turn)];
}
/**
 * The staged reading of one resolved act, spread straight into the result.
 *
 * An empty object rather than an undefined key, so a resolution nobody banked a
 * sequence for hands back exactly the object it always did.
 */
export function stagedResolutionFor(act, valence, riskId, pool) {
    if (!pool || pool.length === 0)
        return {};
    const situation = {
        instrument: act.instrument,
        rungBand: rungBand(act.rung),
        valence,
        ...(riskId === undefined ? {} : { riskId }),
    };
    const seedParts = seedPartsFor(act);
    const chosen = selectResolutionSequence(pool, situation, seedParts.join(":"));
    if (!chosen)
        return {};
    return { staged: { sequenceId: chosen.id, situationKey: resolutionSituationKey(situation), seedParts } };
}
const HEADLINE = {
    success: (subject, move, target) => `${subject} finished ${move} in ${target}.`,
    partial: (subject, move, target) => `${subject} came out of ${move} in ${target} short of the order.`,
    failure: (subject, move, target) => `${subject} did not bring ${move} in ${target} off.`,
};
/**
 * The wire's one line about a staged act, naming the formation that carried it.
 *
 * A hook, not an emission: it builds a FeedItem and stops there. Whether the
 * week reports this is the caller's call, and the item lands the way every
 * other feed write lands — through a packet — rather than by a second path out
 * of the resolver.
 */
export function stagedResolutionFeedItem(report) {
    const { act } = report;
    // No formation named means no sequence step named one, and the government
    // itself is then the only honest subject the line has.
    const subject = sentenceCase(report.unit ?? wireName(report.actorName));
    const headline = HEADLINE[report.valence](subject, movePhrase(act.instrument, act.rung), wireName(report.targetName));
    const catalogueName = rungCatalogueName(act.instrument, act.rung);
    return {
        turn: act.turn,
        kind: report.byPlayer ? "player-action" : "npc-action",
        visibility: report.visible ? "public" : "intelligence",
        headline,
        actor: act.actor,
        target: act.target,
        facts: {
            ...(report.unit === undefined ? {} : { subject: report.unit }),
            ...(catalogueName === undefined ? {} : { instrument: catalogueName }),
        },
    };
}
