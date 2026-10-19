import { ASSESSMENT_QUESTIONS, LIKELIHOOD_LADDER, apply, collectionAgainst, commissionAssessment, draftAssessment, icElement, pressAssessment, selectAssessment, selectAssessments, selectNation, } from "@admin/engine";
import { formatDate, formatSignedPoints } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { cell } from "../policy/choice-table.js";
// The community's judgments about other governments: the sentence, how sure
// it is and why, who dissented, and whether anyone leaned on the wording. A
// judgment reads the same world the player lives in, so the only honest way to
// change what it says is to change the world; pressing it changes the sentence
// and leaves a line saying so.
export const QUESTION_WORDS = {
    intent: { label: "Intentions", asks: "Is it likely to move against American troops or interests in the next six months?" },
    capability: { label: "Military strength", asks: "Could it keep up a major military operation outside its borders without supplies from other countries?" },
    stability: { label: "Stability", asks: "Is a serious challenge to its government likely within the year?" },
};
const nameOf = (campaign, id) => selectNation(campaign, id)?.base.identity.name ?? id;
const abbr = (id) => icElement(id)?.abbr ?? id;
function rowOf(campaign, assessment) {
    return {
        id: assessment.id,
        question: assessment.question,
        questionLabel: QUESTION_WORDS[assessment.question].label,
        target: assessment.target,
        targetName: nameOf(campaign, assessment.target),
        href: place.country(assessment.target),
        issued: formatDate(assessment.issuedDate),
        judgment: assessment.judgment,
        likelihood: assessment.likelihood,
        rung: LIKELIHOOD_LADDER.indexOf(assessment.likelihood) / (LIKELIHOOD_LADDER.length - 1),
        confidence: assessment.confidence,
        confidenceBasis: assessment.confidenceBasis,
        sources: assessment.sources.map((source) => `${abbr(source.element)}: ${source.reliability} reporting`),
        gaps: assessment.gaps,
        alternative: assessment.alternative,
        dissents: assessment.dissents.map((dissent) => `${abbr(dissent.element)}, ${dissent.confidence} confidence: ${dissent.note}`),
        changes: assessment.changes.map((change) => `${formatDate(change.date)}: reworded from "${change.from}" to "${change.to}" after you asked to ${change.direction} it. ${change.note}`),
    };
}
/** Every judgment on file, newest first. */
export function assessmentRows(campaign) {
    return [...selectAssessments(campaign)].sort((a, b) => b.issuedDay - a.issuedDay || a.id.localeCompare(b.id)).map((assessment) => rowOf(campaign, assessment));
}
/** The governments a judgment can be asked about: every one but the homeland. */
export function assessmentTargets(campaign) {
    return Object.keys(campaign.nations)
        .map((id) => id)
        .filter((id) => id !== campaign.founding.nation)
        .map((id) => ({ id, name: nameOf(campaign, id) }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
const CONFIDENCE_WORDS = { low: "Low confidence", moderate: "Moderate confidence", high: "High confidence" };
/** The three questions the community can be asked about a government, each read as what asking adds. What it will say is not read ahead; how sure it will be, and why, is. */
export function commissionChoices(campaign, target) {
    if (!selectNation(campaign, target))
        return undefined;
    const results = ASSESSMENT_QUESTIONS.map((question) => ({ question, draft: draftAssessment(campaign, question, target), result: commissionAssessment(campaign, question, target) }));
    const columns = results.map(({ question, result }) => ({ id: question, label: `Ask about ${QUESTION_WORDS[question].label.toLowerCase()}`, ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }) }));
    return {
        columns,
        rows: [
            { id: "asks", label: "The question", cells: results.map(({ question }) => cell(QUESTION_WORDS[question].asks)) },
            { id: "writes", label: "Who writes it", cells: results.map(({ draft }) => cell(draft ? draft.sources.map((source) => abbr(source.element)).join(", ") : "Nobody")) },
            { id: "sure", label: "How sure it will be", cells: results.map(({ draft }) => cell(draft ? CONFIDENCE_WORDS[draft.confidence] : "Unknown", draft?.confidence === "low" ? "adverse" : draft?.confidence === "high" ? "favorable" : "neutral")) },
            { id: "collection", label: "Ongoing intelligence gathering behind it", cells: results.map(({ draft }) => cell(draft ? collectionNote(campaign, target, draft) : "None")) },
            { id: "now", label: "Cost now", cells: results.map(() => cell("Nothing")) },
        ],
    };
}
function collectionNote(campaign, target, draft) {
    const products = collectionAgainst(campaign, target, draft.sources.map((source) => source.element));
    return products.length === 0 ? "None, so the judgment rests on what the intelligence agencies already know" : `${products.length} ongoing ${products.length === 1 ? "report backs" : "reports back"} it up`;
}
export function commissionOrder(campaign, question, target) {
    const result = commissionAssessment(campaign, question, target);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
export const PRESS_WORDS = { harden: "Harden the wording", soften: "Soften the wording" };
/** What pressing does to the element that wrote the judgment, read off the packet's institution change against the campaign. */
function buildingMove(campaign, packet) {
    const effect = packet.effects.find((entry) => entry.kind === "institution");
    if (effect?.kind !== "institution" || !effect.changes || !effect.institution)
        return undefined;
    const before = campaign.institutions[effect.institution];
    const after = apply(campaign, packet).institutions[effect.institution];
    if (!before || !after)
        return undefined;
    return { body: effect.institution, politicization: after.politicization - before.politicization, morale: after.morale - before.morale, integrity: after.integrity - before.integrity };
}
const leaks = (packet) => packet.provenance?.visibility === "public";
/** Leaning on a judgment's wording, in each direction, read as its change from the wording today. */
export function pressChoices(campaign, id, ask) {
    const assessment = selectAssessment(campaign, id);
    if (!assessment)
        return undefined;
    const directions = ["harden", "soften"];
    const probe = ask.trim() || "stated ask";
    const results = directions.map((direction) => ({ direction, result: pressAssessment(campaign, id, direction, probe) }));
    const columns = [
        ...results.map(({ direction, result }) => ({
            id: direction,
            label: PRESS_WORDS[direction],
            ...(result.ok ? (ask.trim() ? {} : { locked: "Not available right now. Write what you want changed first." }) : { locked: `Not available right now. ${result.reason}` }),
        })),
    ];
    const moveOf = ({ result }) => (result.ok ? buildingMove(campaign, result.packet) : undefined);
    const points = (pick, entry) => {
        const move = moveOf(entry);
        return move ? formatSignedPoints(pick(move)) + " pts" : "Nothing";
    };
    return {
        columns,
        rows: [
            { id: "sentence", label: "The sentence", cells: results.map(({ direction }) => cell(`"${LIKELIHOOD_LADDER[Math.max(0, Math.min(LIKELIHOOD_LADDER.length - 1, LIKELIHOOD_LADDER.indexOf(assessment.likelihood) + (direction === "harden" ? 1 : -1)))]}", from "${assessment.likelihood}"`)) },
            { id: "sure", label: "How sure it says it is", cells: results.map(() => cell(`${CONFIDENCE_WORDS[assessment.confidence]}. Changing the words doesn't make it surer`)) },
            { id: "bent", label: "Bent toward your politics", cells: results.map((entry) => cell(points((move) => move.politicization, entry), "adverse")) },
            { id: "morale", label: "Morale of the analysts", cells: results.map((entry) => cell(points((move) => move.morale, entry), "adverse")) },
            { id: "integrity", label: "Honesty of the report", cells: results.map((entry) => cell(points((move) => move.integrity, entry), "adverse")) },
            { id: "outside", label: "Outside the agency", cells: results.map(({ result }) => cell(result.ok && leaks(result.packet) ? "It leaks, and analysts say a judgment was rewritten after the White House objected" : "Stays inside, for now", result.ok && leaks(result.packet) ? "adverse" : "neutral")) },
            { id: "paper", label: "On the report", cells: results.map(() => cell("A note saying it was reworded, kept with it forever", "adverse")) },
        ],
    };
}
export function pressOrder(campaign, id, direction, ask) {
    const result = pressAssessment(campaign, id, direction, ask);
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
