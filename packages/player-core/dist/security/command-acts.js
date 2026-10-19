import { POSTURE_PRESSURE_RELIEF, POSTURE_READINESS_COST, SUCCESSOR_CONFIRMATION_DAYS, amendUnifiedCommandPlan, apply, commandChain, commandDef, commandEngagement, commandFor, effectivePosture, reassignForces, relieveCommander, selectNation, setCommandPosture, } from "@admin/engine";
import { packetCost } from "../dossier/person-lever.js";
import { formatRatio, formatSignedPoints } from "../format/figures.js";
import { cell, metricCell, weeksWords } from "../policy/choice-table.js";
import { POSTURE_WORDS, branchName } from "./command-board.js";
// The four acts on a combatant command, each as a table read as its change
// from the theater today. A price is read off the packet the act would commit, or
// off the campaign that packet produces, so the figure on the screen is the
// figure the engine charges.
const POSTURES = ["routine", "heightened", "surge"];
const unlocked = (result) => (result.ok ? {} : { locked: `Not available right now. ${result.reason}` });
function built(result) {
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
const abbrOf = (id) => commandDef(id)?.abbr ?? id;
/** The weekly readiness bill of holding a posture, as the points the commands phase takes off the national bench. */
const billWords = (posture) => (POSTURE_READINESS_COST[posture] === 0 ? "Nothing. Forces get more ready at a normal alert level" : `Military readiness ${formatSignedPoints(-POSTURE_READINESS_COST[posture])} pts a week`);
// --- Posture ---------------------------------------------------------------
export function postureOfChoice(choice) {
    return POSTURES.find((posture) => posture === choice);
}
function toneVs(held, next) {
    return next > held ? "adverse" : next < held ? "favorable" : "neutral";
}
function postureCells(campaign, id, posture) {
    const held = effectivePosture(campaign, id);
    const stands = posture === "routine" && commandEngagement(campaign, id) !== undefined;
    return [
        cell(stands ? "Raised until the fighting ends, then back to normal" : POSTURE_WORDS[posture]),
        cell(billWords(stands ? "heightened" : posture), toneVs(POSTURE_READINESS_COST[held], POSTURE_READINESS_COST[stands ? "heightened" : posture])),
        cell(POSTURE_PRESSURE_RELIEF[posture] === 0 ? "None" : `Eases ${formatRatio(POSTURE_PRESSURE_RELIEF[posture])} of the strain a week of war puts on us`, POSTURE_PRESSURE_RELIEF[posture] > 0 ? "favorable" : "neutral"),
    ];
}
/** Raising or lowering a theater's posture, each read as its change from where it stands. */
export function postureChoices(campaign, id) {
    const runtime = campaign.security.unifiedCommand.commands[id];
    if (!runtime)
        return undefined;
    const others = POSTURES.filter((posture) => posture !== runtime.posture);
    const columns = others.map((posture) => ({ id: posture, label: `Order ${POSTURE_WORDS[posture].toLowerCase()}`, ...unlocked(setCommandPosture(campaign, id, posture)) }));
    const each = others.map((posture) => postureCells(campaign, id, posture));
    const row = (rowId, label, index) => ({ id: rowId, label, cells: each.map((cells) => cells[index]) });
    const from = POSTURE_WORDS[runtime.posture].toLowerCase();
    return {
        columns,
        rows: [{ id: "stands", label: "Alert level", cells: each.map((cells) => cell(`${cells[0].text}, from ${from}`, cells[0].tone)) }, row("bill", "Every week", 1), row("relief", "In a war", 2), { id: "now", label: "Cost now", cells: others.map(() => cell("Nothing now. It costs readiness each week")) }],
    };
}
export function postureOrder(campaign, id, posture) {
    return built(setCommandPosture(campaign, id, posture));
}
// --- Relief ----------------------------------------------------------------
const REVIEW_WEEKS = Math.round(SUCCESSOR_CONFIRMATION_DAYS / 7);
/** Relieving the commander, read as its change from today; the reason is the one the Record keeps. */
export function reliefChoices(campaign, id, rationale) {
    const runtime = campaign.security.unifiedCommand.commands[id];
    const def = commandDef(id);
    if (!runtime?.commander || !def)
        return undefined;
    const probe = rationale.trim() ? rationale : "stated reason";
    const result = relieveCommander(campaign, id, probe);
    const after = result.ok ? apply(campaign, result.packet) : undefined;
    const before = commandChain(campaign, id).execution;
    const next = after ? commandChain(after, id).execution : before;
    return {
        columns: [
            { id: "relieve", label: `Remove ${runtime.commander.name}`, ...(result.ok ? (rationale.trim() ? {} : { locked: "Not available right now. Write your reason for removing the commander first." }) : unlocked(result)) },
        ],
        rows: [
            { id: "seat", label: "The command", cells: [cell(`${def.deputy.name} takes over from ${runtime.commander.name} for now, and the Senate confirms a replacement in about ${weeksWords(REVIEW_WEEKS)}`)] },
            { id: "chain", label: "How much of an order gets carried out", cells: [cell(`${formatRatio(next)} carried out, from ${formatRatio(before)}`, next < before ? "adverse" : "neutral")] },
            { id: "reliefs", label: "Commanders you've removed here", cells: [cell(`${runtime.reliefs + 1}, from ${runtime.reliefs}`, "adverse")] },
            { id: "public", label: "In public", cells: [cell(`A news story that you removed the commander of ${def.abbr}`)] },
            { id: "now", label: "Cost now", cells: [metricCell(result.ok ? packetCost(result.packet) : {}, "Nothing")] },
        ],
    };
}
export function reliefOrder(campaign, id, rationale) {
    return built(relieveCommander(campaign, id, rationale));
}
// --- The laydown -----------------------------------------------------------
/** The shares of a service's force a reassignment can move. */
export const REASSIGN_SHARES = [0.05, 0.1, 0.25];
const shareWords = (share) => `${Math.round(share * 100)}%`;
function assignedTo(campaign, id, branch) {
    return campaign.security.unifiedCommand.commands[id]?.assignment[branch] ?? 0;
}
/** Moving a share of one service's force between two commands, read as its change from today's laydown. */
export function reassignChoices(campaign, from, to, branch, share) {
    const result = reassignForces(campaign, from, to, branch, share);
    const after = result.ok ? apply(campaign, result.packet) : campaign;
    const service = branchName(branch);
    return {
        columns: [
            { id: "reassign", label: `Move ${shareWords(share)} of the ${service}`, ...unlocked(result) },
        ],
        rows: [
            { id: "from", label: `${abbrOf(from)}'s share of the ${service}`, cells: [cell(`${shareWords(assignedTo(after, from, branch))}, from ${shareWords(assignedTo(campaign, from, branch))}`, "adverse")] },
            { id: "to", label: `${abbrOf(to)}'s share of the ${service}`, cells: [cell(`${shareWords(assignedTo(after, to, branch))}, from ${shareWords(assignedTo(campaign, to, branch))}`, "favorable")] },
            { id: "who", label: "Who signs", cells: [cell("The Secretary of Defense, under procedures you approved")] },
            { id: "now", label: "Cost now", cells: [metricCell(result.ok ? packetCost(result.packet) : {}, "Nothing, because moving forces you already have doesn't cost money")] },
        ],
    };
}
export function reassignOrder(campaign, from, to, branch, share) {
    return built(reassignForces(campaign, from, to, branch, share));
}
/** Moving a country between commands' maps, read as its change from today's plan. */
export function amendChoices(campaign, nation, to, rationale) {
    const probe = rationale.trim() ? rationale : "stated reason";
    const result = amendUnifiedCommandPlan(campaign, nation, to, probe);
    const name = selectNation(campaign, nation)?.base.identity.name ?? nation;
    const from = commandFor(campaign, nation);
    return {
        columns: [
            { id: "amend", label: `Move ${name} to ${abbrOf(to)}`, ...(result.ok ? (rationale.trim() ? {} : { locked: "Not available right now. Write your reason for the change first." }) : unlocked(result)) },
        ],
        rows: [
            { id: "map", label: "On the map", cells: [cell(`${name} moves to ${abbrOf(to)} today${from ? `, from ${abbrOf(from)}` : ""}`)] },
            { id: "forces", label: "Forces already there", cells: [cell(`Answer to ${abbrOf(to)}'s commander`)] },
            { id: "record", label: "On the record", cells: [cell("The change, its date, and your reason, kept on file")] },
            { id: "now", label: "Cost now", cells: [metricCell(result.ok ? packetCost(result.packet) : {}, "Nothing, because only the command in charge of the country changes")] },
        ],
    };
}
export function amendOrder(campaign, nation, to, rationale) {
    return built(amendUnifiedCommandPlan(campaign, nation, to, rationale));
}
