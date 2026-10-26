import { lethalGround, likelihoodFromUnitInterval } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { consulteeEmblem } from "../government/office-emblem";
import { METRIC_LABELS, formatSignedPoints, roleTitle } from "../format/figures";
import { holdingCount } from "../world/nation-forces";
import { configUnder } from "./catalogue";
import { LIKELIHOOD_STANCE, instrumentDraft, instrumentProjection, moneyWords, timingWords } from "./preview";
const LIKELIHOOD_STEPS = ["remote", "unlikely", "roughly even", "likely", "almost certain"];
/** A chance as its step on the engine's five words, so a screen can light that many pips. */
export const likelihoodStep = (chance) => LIKELIHOOD_STEPS.indexOf(likelihoodFromUnitInterval(chance)) + 1;
/** A likelihood word as its step, for rows that carry the word rather than the chance; an unknown word has no step. */
export const likelihoodStepOfWord = (word) => {
    const step = LIKELIHOOD_STEPS.indexOf((word ?? "").toLowerCase()) + 1;
    return step > 0 ? step : undefined;
};
const withItems = (cell, items) => (items.length > 0 ? { ...cell, detail: items.map((item) => item.text), items } : cell);
export const assessCell = (text, stance, detail) => ({ text, ...(stance ? { stance } : {}), ...(detail?.length ? { detail } : {}) });
const RELATION_WORDS = {
    "bloc-partner": "bloc partner",
    ally: "ally",
    "trade-partner": "trading partner",
    "bloc-peer": "bloc peer",
    observer: "has a stake",
    domestic: "at home",
};
const RIPPLES_SHOWN = 4;
const nameOf = (campaign, id) => campaign.nations[id]?.base.identity.name ?? id;
function costCell(projection) {
    const others = Object.entries(projection.cost).flatMap(([key, delta]) => {
        if (key === "treasury" || !delta)
            return [];
        return [{ text: `${METRIC_LABELS[key]}: ${formatSignedPoints(delta)} points`, direction: delta > 0 ? "up" : "down" }];
    });
    return withItems(assessCell(moneyWords(projection.cost.treasury ?? 0)), others);
}
function reactionCell(campaign, projection) {
    if (projection.ripples.length === 0)
        return assessCell("No government is expected to react");
    const items = projection.ripples.slice(0, RIPPLES_SHOWN).map((ripple) => ({ text: `${nameOf(campaign, ripple.nation)}, ${RELATION_WORDS[ripple.relation]}: ${ripple.reason}`, nation: ripple.nation }));
    return withItems(assessCell(projection.rippleVisibility === "if-exposed" ? "Only if it comes out" : `${projection.ripples.length} ${projection.ripples.length === 1 ? "government" : "governments"} react`), items);
}
function riskCell(projection) {
    if (projection.risks.length === 0)
        return assessCell("No risks named");
    const items = projection.risks.map((risk) => ({ text: `${LIKELIHOOD_WORD(risk.chance)}: ${risk.description}`, likelihood: likelihoodStep(risk.chance) }));
    return withItems(assessCell(`${projection.risks.length} ${projection.risks.length === 1 ? "way" : "ways"} it can go wrong`), items);
}
const LIKELIHOOD_WORD = (chance) => {
    const word = likelihoodFromUnitInterval(chance);
    return word.charAt(0).toUpperCase() + word.slice(1);
};
function escalationCell(projection) {
    const { conflict, deterrence } = projection;
    if (!conflict && !deterrence)
        return assessCell("It doesn't affect any war");
    return assessCell(conflict?.headline ?? "They could strike back", conflict ? "adverse" : "caution", [conflict?.summary, deterrence?.summary].filter((line) => Boolean(line)));
}
function backingCell(projection) {
    const backers = projection.coalition?.backers ?? 0;
    const asked = projection.support?.responses ?? [];
    if (backers === 0 && asked.length === 0)
        return assessCell("No partner is lined up");
    const items = asked.map((response) => ({
        text: `${response.name}: ${response.status}. ${response.reason}`,
        nation: response.nation,
        stance: response.status === "confirmed" ? "favorable" : response.status === "refused" ? "adverse" : "caution",
    }));
    const text = backers > 0 ? `${backers} ${backers === 1 ? "partner stands" : "partners stand"} with you` : `${asked.length} asked to take part`;
    return withItems(assessCell(text, backers > 0 ? "favorable" : "caution"), items);
}
function consultCell(campaign, projection) {
    if (projection.consultation.length === 0)
        return undefined;
    const titles = charterOf(campaign).roleTitles;
    const items = projection.consultation.map((who) => ({ text: "roleId" in who ? roleTitle(who.roleId, titles) : who.body, consultee: who, emblem: consulteeEmblem(who) }));
    return { ...assessCell(items.map((item) => item.text).join(", ")), items };
}
function civilianCell(projection) {
    if (!projection.civilianRisk)
        return undefined;
    const word = likelihoodFromUnitInterval(projection.civilianRisk.chance);
    return { ...assessCell(`${LIKELIHOOD_WORD(projection.civilianRisk.chance)} chance of civilian harm`, word === "remote" || word === "unlikely" ? "favorable" : "adverse", [`An estimate, not a promise. ${projection.civilianRisk.basis}`]), likelihood: likelihoodStep(projection.civilianRisk.chance) };
}
function sentCell(projection) {
    const force = projection.request.force;
    return force ? { ...assessCell(holdingCount(force.unitType, force.count)), unitType: force.unitType } : undefined;
}
/** Counsel's opinion on a lethal operation, raised as a hard case: the ground that takes it outside the ban on assassination, and what that ground does not settle. */
function counselCell(campaign, projection) {
    const { request } = projection;
    if (request.regimeAct !== "kill")
        return undefined;
    const ground = lethalGround(campaign, request.actor, request.target);
    const view = ground === "armed-conflict" ? "an act in an armed conflict" : "self-defense against an imminent attack";
    return assessCell(`Counsel reads it as ${view}, so not assassination`, "adverse", [
        "Executive Order 12333, section 2.11 forbids assassination. Counsel's view is that this falls outside it only on the ground above, and that view is contested.",
        "No modern President has acknowledged ordering the killing of a sitting head of state or government.",
        "18 U.S.C. 1116 reaches a leader killed outside their own country, and the executive's public-authority argument is the only answer to it.",
        "This is a hard case. The decision stays with you and no standing delegation covers it.",
    ]);
}
/** The targeting review a strike goes through before it flies. */
function targetingCell(projection) {
    const { request } = projection;
    if (request.instrument !== "military" || request.rung !== 4)
        return undefined;
    const dualUse = request.strikeObjective === "infrastructure";
    return assessCell("Military lawyers review each target first", dualUse ? "caution" : undefined, [
        "Only a military objective may be attacked, meaning something that by its nature, location, purpose or use makes an effective contribution to military action.",
        ...(dualUse ? ["Power, ports and networks used by both the military and civilians qualify only on that test, one target at a time."] : []),
        "The civilian harm expected must not be excessive against the military advantage expected, and precautions apply before the strike.",
    ]);
}
function instrumentRows(campaign, projection) {
    const word = likelihoodFromUnitInterval(projection.successChance);
    const optional = (label, act) => (act ? [{ label, act }] : []);
    return [
        { label: "What it does", act: assessCell(projection.rungName) },
        { label: "Chance it works", act: { ...assessCell(LIKELIHOOD_WORD(projection.successChance), LIKELIHOOD_STANCE[word]), likelihood: likelihoodStep(projection.successChance) } },
        { label: "Cost now", act: costCell(projection) },
        { label: "When", act: assessCell(timingWords(projection), undefined, projection.timing?.basis ? [projection.timing.basis] : []) },
        ...optional("What it sends", sentCell(projection)),
        { label: "Who stands with you", act: backingCell(projection) },
        { label: "Who reacts", act: reactionCell(campaign, projection) },
        { label: "If it goes wrong", act: riskCell(projection) },
        ...optional("Could it leak", projection.successExposureChance === undefined ? undefined
            : assessCell(`${LIKELIHOOD_WORD(projection.successExposureChance)} chance it becomes public even if the mission succeeds`, "caution", ["Even if the mission works, people may still find out about it. Other governments react once it comes out."])),
        { label: "Escalation", act: escalationCell(projection) },
        ...optional("Civilian exposure", civilianCell(projection)),
        ...optional("Targeting review", targetingCell(projection)),
        ...optional("Counsel's opinion", counselCell(campaign, projection)),
        ...optional("Who is consulted", consultCell(campaign, projection)),
    ];
}
/** The money in a sentence: a figure keeps its capital letters, the words for none do not. */
function reviewMoney(treasury) {
    const words = moneyWords(treasury);
    return treasury === 0 ? words.toLowerCase() : words;
}
const INSTRUMENT_VERBS = { diplomatic: "Take the diplomatic step", economic: "Order the measure", covert: "Authorize the operation", military: "Order the force", assist: "Send the help" };
/** The assessment of one instrument rung against one government, held when the engine will not project it. */
export function instrumentAssessment(campaign, nation, option, preview, config) {
    if (option.ref.kind !== "instrument")
        throw new Error(`${option.id} is not an instrument rung`);
    const { instrument, rung } = option.ref;
    const name = nameOf(campaign, nation);
    const family = option.family;
    const base = {
        option,
        title: `${option.name}: ${name}`,
        verb: INSTRUMENT_VERBS[family] ?? "Take the step",
        tone: instrument === "military" || instrument === "covert" ? "danger" : "commit",
    };
    const projected = instrumentProjection(campaign, instrumentDraft(campaign, nation, instrument, rung, config.count, configUnder(option.ref, config)));
    if (preview.state !== "open" || !projected.ok) {
        const reason = preview.reason ?? (projected.ok ? "This isn't possible this week. Check again next week." : `This needs ${projected.missingCapability}.`);
        return { ...base, locked: reason, review: reason, rows: [{ label: "What it does", act: assessCell(option.name) }] };
    }
    const { projection } = projected;
    return { ...base, review: `${projection.rungName} against ${name}: ${reviewMoney(projection.cost.treasury ?? 0)}. ${timingWords(projection)}. It goes on your Record.`, rows: instrumentRows(campaign, projection) };
}
