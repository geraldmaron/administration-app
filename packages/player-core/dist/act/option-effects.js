import { ENGAGEMENT_TERMS, TREATY_TERMS, createRngStreams, metricImpact, projectEngagement, projectSuccessEffects, warmthScale, } from "@admin/engine";
import { METRIC_LABELS, formatSignedPoints } from "../format/figures";
import { configUnder } from "./catalogue";
import { instrumentDraft, treatyReading } from "./preview";
/** The obligations an act opens, said once, from the effects that open them. */
function notesOf(effects) {
    return effects.flatMap((effect) => {
        if (effect.kind !== "warPowers" || !("open" in effect) || !effect.open)
            return [];
        const days = effect.open.dueDay - effect.open.openedDay;
        return [`Starts the War Powers clock. Your report to Congress is due within ${days * 24} hours.`];
    });
}
/**
 * The largest step a single act takes on any relationship reading: a mutual
 * defense treaty's. Every option is drawn against it, so a call and a treaty
 * read in proportion to each other rather than each filling its own bar.
 */
export const EFFECT_SCALE = Math.max(...Object.values(TREATY_TERMS).flatMap((terms) => Object.values(terms.effect).map(Math.abs)));
const LABELS = {
    theirTrust: "Their trust in you",
    ourTrust: "Your trust in them",
    tension: "Tension between you",
    alignment: "Common aims",
    threat: "The threat they see from you",
    reliance: "How much they rely on our trade",
};
// Tension and the threat they see are good news when they fall; the rest when they rise.
const FALLING_IS_GOOD = new Set(["tension", "threat"]);
const BAND_WORDS = { slight: "a little", moderate: "noticeably", major: "sharply" };
function relationshipMark(key, delta) {
    const band = BAND_WORDS[metricImpact("relationship", delta, "next-turn", 0, "modeled").band];
    return {
        key,
        label: LABELS[key],
        delta,
        good: FALLING_IS_GOOD.has(key) ? delta < 0 : delta > 0,
        share: Math.min(1, Math.abs(delta) / EFFECT_SCALE),
        word: `${delta > 0 ? "Rises" : "Falls"} ${band}`,
    };
}
// Panel metrics run 0..1 and print as points; drawn on a tenth of the scale, a point and a step of trust read alike.
const METRIC_SCALE = 0.1;
function metricMark(key, delta) {
    return { key, label: METRIC_LABELS[key], delta, good: delta > 0, share: Math.min(1, Math.abs(delta) / METRIC_SCALE), word: `${formatSignedPoints(delta)} points` };
}
const sum = (values) => values.reduce((total, value) => total + (value ?? 0), 0);
/** The marks a set of effects makes: the President's edge, their edge, and the panel. */
export function marksOf(campaign, nation, effects) {
    const home = campaign.founding.nation;
    const edge = (from, to) => effects.flatMap((effect) => (effect.kind === "relationship" && effect.from === from && effect.to === to && effect.deltas ? [effect.deltas] : []));
    const ours = edge(home, nation);
    const theirs = edge(nation, home);
    const both = [...ours, ...theirs];
    // Tension, aims and threat are one fact about the pair, so the larger side's move is the one drawn.
    const pairOf = (key) => {
        const a = sum(ours.map((d) => d[key]));
        const b = sum(theirs.map((d) => d[key]));
        return Math.abs(a) >= Math.abs(b) ? a : b;
    };
    const relationship = [
        ["theirTrust", sum(theirs.map((d) => d.trust))],
        ["ourTrust", sum(ours.map((d) => d.trust))],
        ["tension", pairOf("tension")],
        ["alignment", pairOf("alignment")],
        // The engine writes an act's military pressure on the actor's edge and a rival's on theirs; either way it is one fact about the pair.
        ["threat", pairOf("militaryThreat")],
        ["reliance", sum(theirs.map((d) => d.tradeDependence))],
    ];
    const metric = effects.flatMap((effect) => (effect.kind === "metric" ? [effect.deltas] : []));
    const metricKeys = [...new Set(metric.flatMap((deltas) => Object.keys(deltas)))];
    return [
        ...relationship.filter(([, delta]) => Math.abs(delta) > 1e-6 && both.length > 0).map(([key, delta]) => relationshipMark(key, delta)),
        ...metricKeys.filter((key) => key !== "treasury").map((key) => [key, sum(metric.map((deltas) => deltas[key]))]).filter(([, delta]) => Math.abs(delta) > 1e-6).map(([key, delta]) => metricMark(key, delta)),
    ];
}
function engagementEffects(campaign, nation, kind) {
    const request = { actor: campaign.founding.nation, target: nation, kind };
    const projected = projectEngagement(campaign, request)?.effects;
    // A meeting that is not on the table this week still says what it would do, sized as the Secretary of State would prepare it.
    const scale = warmthScale(campaign, request);
    const { warmth } = ENGAGEMENT_TERMS[kind];
    const deltas = { trust: warmth.trust * scale, tension: warmth.tension * scale, alignment: warmth.alignment * scale };
    const effects = projected ?? [
        { kind: "relationship", from: request.actor, to: nation, deltas },
        { kind: "relationship", from: nation, to: request.actor, deltas },
    ];
    return { when: "If they accept", marks: marksOf(campaign, nation, effects) };
}
function treatyEffects(campaign, nation, kind) {
    const terms = TREATY_TERMS[kind];
    const home = campaign.founding.nation;
    const { result } = treatyReading(campaign, nation, kind);
    const signing = result.ok ? result.packet.effects.filter((effect) => effect.kind === "metric") : [];
    const inForce = [
        { kind: "relationship", from: home, to: nation, deltas: terms.effect },
        { kind: "relationship", from: nation, to: home, deltas: terms.effect },
    ];
    return { when: terms.bindsOn === "ratification" ? "Once the Senate ratifies it" : "Once it's signed", marks: marksOf(campaign, nation, [...inForce, ...signing]) };
}
function instrumentEffects(campaign, nation, option, config) {
    if (option.ref.kind !== "instrument")
        return undefined;
    const draft = instrumentDraft(campaign, nation, option.ref.instrument, option.ref.rung, config.count, configUnder(option.ref, config));
    const effects = projectSuccessEffects(campaign, draft.request, createRngStreams(campaign.seed));
    if (!effects)
        return undefined;
    const notes = notesOf(effects);
    return { when: "If it works", marks: marksOf(campaign, nation, effects), ...(notes.length > 0 ? { notes } : {}) };
}
/** What one option moves, where the engine can say before it is taken. */
export function optionEffects(campaign, nation, option, config = {}) {
    switch (option.ref.kind) {
        case "engagement":
            return engagementEffects(campaign, nation, option.ref.engagement);
        case "treaty":
            return treatyEffects(campaign, nation, option.ref.treaty);
        case "instrument":
            return instrumentEffects(campaign, nation, option, config);
        case "tariff":
        case "authorization":
            return undefined;
    }
}
