import { projectForceAuthorization, tradeSector, tariffPriceStep, AUTHORIZATION_DELAY_DAYS } from "@admin/engine";
import { METRIC_LABELS, formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";
import { priceStep } from "../economy/tariff-prices";
import { engagementReading } from "../world/engagement";
import { assessCell, likelihoodStepOfWord } from "./assessment";
import { engagementPlan, treatyPlan } from "./plan";
import { RETALIATION_STANCE, WILLINGNESS_WORDS, tariffDraft } from "./preview";
// Willingness has three of the five likelihood words, so it lights the same pips at the same steps.
const WILLINGNESS_STEP = { likely: 4, close: 3, unlikely: 2 };
const stepOf = (word) => {
    const step = likelihoodStepOfWord(word);
    return step ? { likelihood: step } : {};
};
const nameOf = (campaign, id) => campaign.nations[id]?.base.identity.name ?? id;
const READING_WORDS = { trust: "Trust", tension: "Tension", alignment: "Common aims" };
function stepsCell(steps, none) {
    if (steps.length === 0)
        return assessCell(none);
    const lines = steps.map((step) => `${READING_WORDS[step.reading]} ${step.direction === "up" ? "rises" : "falls"} ${step.size}`);
    const better = steps.some((step) => (step.reading === "tension" ? step.direction === "down" : step.direction === "up"));
    return assessCell(lines[0], better ? "favorable" : "adverse", lines.slice(1));
}
const ENGAGEMENT_VERBS = {
    call: "Place the call",
    envoy: "Send the envoy",
    visit: "Host the state visit",
    summit: "Call the summit",
    declaration: "Issue the declaration",
};
function locked(option, preview, verb, name) {
    const reason = preview.reason ?? "This isn't possible this week. Check again next week.";
    return { option, title: `${option.name}: ${name}`, verb, tone: "commit", locked: reason, review: reason, rows: [{ label: "What it does", act: assessCell(option.name) }] };
}
/** A meeting with a government, against not meeting. */
export function engagementAssessment(campaign, nation, option, preview) {
    if (option.ref.kind !== "engagement")
        throw new Error(`${option.id} is not a meeting`);
    const kind = option.ref.engagement;
    const name = nameOf(campaign, nation);
    const verb = ENGAGEMENT_VERBS[kind];
    const plan = engagementPlan(campaign, nation, kind);
    if (preview.state !== "open" || !plan)
        return locked(option, preview, verb, name);
    const accepted = plan.option;
    const reading = engagementReading(campaign, nation);
    const rows = [
        { label: "What it does", act: assessCell(option.name, undefined, [`A meeting with ${name}'s government. They decide whether to accept.`]) },
        { label: "Would they accept", act: { ...assessCell(WILLINGNESS_WORDS[accepted.forecast], preview.odds?.stance, accepted.reasons), likelihood: WILLINGNESS_STEP[accepted.forecast] } },
        { label: "Cost now", act: assessCell("No money") },
        { label: "When", act: assessCell("Answered right away") },
        { label: "The relationship if they accept", act: stepsCell(plan.steps, "No change") },
        { label: "If they decline", act: assessCell("Only their refusal is recorded", "caution", ["Nothing changes between you, but you'll have to wait a few weeks before you can ask again."]) },
        ...(reading ? [{ label: "Envoy", act: assessCell(reading.envoy.line) }] : []),
    ];
    return { option, title: `${option.name}: ${name}`, verb, tone: "commit", review: `${option.name} with ${name}. It costs nothing, and you'll get an answer right away. It goes on your Record either way.`, rows };
}
/** A treaty, against not signing one. */
export function treatyAssessment(campaign, nation, option, preview) {
    if (option.ref.kind !== "treaty")
        throw new Error(`${option.id} is not a treaty`);
    const name = nameOf(campaign, nation);
    const plan = treatyPlan(campaign, nation, option.ref.treaty);
    if (preview.state !== "open" || !plan)
        return locked(option, preview, "Sign the treaty", name);
    const signing = Object.entries(plan.onSigning).flatMap(([key, delta]) => (delta ? [`${METRIC_LABELS[key]}: ${formatSignedPoints(delta)} points`] : []));
    const rows = [
        { label: "What it does", act: assessCell(plan.summary) },
        ...(plan.counterpart ? [{ label: "Would they sign", act: { ...assessCell(WILLINGNESS_WORDS[plan.counterpart.forecast], undefined, plan.counterpart.reasons), likelihood: WILLINGNESS_STEP[plan.counterpart.forecast] } }] : []),
        { label: plan.binds === "ratification" ? "The Senate" : "Your authority", act: assessCell(plan.binds === "ratification" ? `Needs two thirds of the Senate: ${plan.senate?.forecast.likelihood ?? "unknown"}` : "In force once signed", preview.odds?.stance) },
        { label: "Cost now", act: assessCell("No money", undefined, signing) },
        { label: plan.binds === "ratification" ? "The relationship once ratified" : "The relationship once signed", act: stepsCell(plan.inForce, "No change") },
        ...(plan.congressCools ? [{ label: "Congress", act: assessCell("Grows cooler toward you for skipping the Senate", "caution") }] : []),
    ];
    return { option, title: `${option.name}: ${name}`, verb: "Sign the treaty", tone: "commit", review: `${option.name} with ${name}. ${plan.binds === "ratification" ? "Then it goes to the Senate for a vote." : "It takes effect when signed."} It goes on your Record.`, rows };
}
/** The consumer-price step in words; a step too small to print as a figure says so rather than print "+under". */
function priceWords(step) {
    return Math.abs(step * 100) < 0.01 ? "Under 0.01 points on overall prices" : `${priceStep(step)} on overall prices`;
}
/** A tariff on one kind of goods, against leaving the schedule alone. */
/** Ordering the investigation a trade law's finding comes from, against ordering none. */
function investigationAssessment(option, name, goods, law) {
    const by = law.investigation;
    const about = by.subject === "partner" ? `${name}'s trade practices` : `imports of ${goods.toLowerCase()}`;
    const rows = [
        { label: "What it does", act: assessCell(`${law.name} investigation of ${about}`, undefined, [`If ${by.by} makes the finding, you can then set a tariff under ${law.name}.`]) },
        { label: "Cost now", act: assessCell("No money") },
        { label: "When", act: assessCell(`Finding in about ${by.weeks} weeks`) },
    ];
    return { option, title: `${law.name} investigation: ${name}`, verb: "Order the investigation", tone: "commit", review: `${by.by.charAt(0).toUpperCase()}${by.by.slice(1)} investigates ${about} under ${law.name}. The finding is due in about ${by.weeks} weeks, and it goes on your Record.`, rows };
}
export function tariffAssessment(campaign, nation, option, preview, sector, rate, statute) {
    const name = nameOf(campaign, nation);
    const draft = tariffDraft(campaign, nation, sector, rate, statute);
    if (draft && preview.state === "open" && draft.law.orders === "investigation" && draft.law.investigation) {
        return investigationAssessment(option, name, tradeSector(draft.sector.sector)?.name ?? draft.sector.sector, draft.law);
    }
    const incidence = draft?.incidence;
    if (preview.state !== "open" || !draft || !incidence)
        return locked(option, preview, "Impose the tariff", name);
    const goods = tradeSector(draft.sector.sector)?.name ?? draft.sector.sector;
    const retaliation = incidence.retaliationTarget ? (tradeSector(incidence.retaliationTarget)?.name.toLowerCase() ?? incidence.retaliationTarget) : undefined;
    const rows = [
        { label: "What it does", act: assessCell(`${draft.rate}% on ${goods.toLowerCase()} from ${name}`, undefined, draft.standing > 0 ? [`There's already a ${draft.standing}% tariff on these goods.`] : []) },
        { label: "Revenue", act: assessCell(`${formatMoney(incidence.revenue)} a year coming in`) },
        { label: "Prices at home", act: assessCell(priceWords(tariffPriceStep(nation, draft.sector.sector, draft.rate / 100)), "caution", [`Shelf prices on these goods rise about ${Math.round(incidence.shelfPriceRise * 100)}% within a year.`]) },
        { label: "Trade with them", act: assessCell(`Imports fall about ${Math.round(incidence.importFall * 100)}%`, undefined, [`Of what we stop buying from them, ${Math.round(incidence.diversionShare * 100)}% we'd buy from other countries instead.`]) },
        { label: "Chance they hit back", act: { ...assessCell(preview.odds?.word ? preview.odds.word.charAt(0).toUpperCase() + preview.odds.word.slice(1) : "Unknown", RETALIATION_STANCE[preview.odds?.word] ?? "caution", retaliation ? [`If they hit back, they'll most likely target our ${retaliation}.`] : []), ...stepOf(preview.odds?.word) } },
        { label: "Law", act: assessCell(`${draft.law.name} (${draft.law.cite})`, undefined, [draft.law.limits]) },
        { label: "When", act: assessCell("Takes effect right away") },
    ];
    const review = `${draft.rate}% on ${goods.toLowerCase()} from ${name}: ${formatMoney(incidence.revenue)} a year coming in, and prices at home rise. It goes on your Record.`;
    return { option, title: `${option.name}: ${name}`, verb: "Impose the tariff", tone: "commit", review, rows };
}
/** Asking Congress to authorize force, against asking no one. */
export function authorizationAssessment(campaign, nation, option, preview) {
    const name = nameOf(campaign, nation);
    if (preview.state !== "open")
        return locked(option, preview, "Ask Congress", name);
    const projection = projectForceAuthorization(campaign, nation);
    const rows = [
        { label: "What it does", act: assessCell(projection.title, undefined, ["The House and Senate vote. A yes lets you use force, but doesn't require it."]) },
        { label: "Congress says yes", act: { ...assessCell(preview.odds?.word ? preview.odds.word.charAt(0).toUpperCase() + preview.odds.word.slice(1) : "Unknown", preview.odds?.stance, [projection.reasoning]), ...stepOf(preview.odds?.word) } },
        { label: "Cost now", act: assessCell("No money") },
        { label: "When", act: assessCell(`Congress answers in ${AUTHORIZATION_DELAY_DAYS} days`) },
        { label: "Without it", act: assessCell("Force against them has Congress's approval") },
    ];
    return { option, title: `Request to use force: ${name}`, verb: "Ask Congress", tone: "commit", review: `${projection.title} goes to the House and Senate. They answer in ${AUTHORIZATION_DELAY_DAYS} days. It goes on your Record.`, rows };
}
