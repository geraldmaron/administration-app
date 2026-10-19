import { isOpenCase, prospectiveOrderAuthority, selectDateOfTurn, selectTurnOfDate } from "@admin/engine";
import { formatDate } from "../format/figures";
const STEP_OF = {
    threshold: "filed",
    interim: "interim",
    "lower-merits": "district",
    remand: "district",
    appeal: "appeal",
    "circuit-merits": "appeal",
    "supreme-merits": "supreme",
    final: "final",
};
const ORDER = ["filed", "interim", "district", "appeal", "supreme", "final"];
/**
 * The step a recorded moment belongs to. The engine files each moment under
 * the stage it moves the case into, so a decision that closes a step carries
 * the next step's stage; it belongs to the step it decided. A higher court's
 * own entry (granting review) and the final disposition stay where they land.
 */
function ownerOf(history, index) {
    const moment = history[index];
    const before = index > 0 ? history[index - 1] : undefined;
    if (!before || moment.stage === before.stage || moment.stage === "supreme-merits" || moment.stage === "final")
        return STEP_OF[moment.stage];
    return STEP_OF[before.stage];
}
/** A dated deadline named by its real date and placed by its week. */
function deadline(campaign, due) {
    const turn = selectTurnOfDate(campaign, due);
    return { turn, date: formatDate(due), weeks: turn - campaign.turn };
}
function governingOf(proceeding, ruled, final) {
    if (final) {
        return { kind: "final", upheld: ruled?.holding === "upheld", dismissed: ruled?.procedure?.dismissedAtThreshold === true };
    }
    // As the engine reads it: a circuit panel's judgment replaces the district court's, and with it any stay of that judgment.
    if (proceeding?.circuit)
        return { kind: "circuit", setAside: proceeding.circuit.holding === "struck-down" };
    if (proceeding?.stayApplication?.status === "granted")
        return { kind: "stay-granted" };
    if (proceeding?.lower) {
        const setAside = proceeding.lower.holding === "struck-down";
        return proceeding.lower.enforcement === "in-force" ? { kind: "lower-in-force", setAside } : { kind: "lower-stayed", setAside };
    }
    return proceeding?.interim && proceeding.interim !== "denied" ? { kind: "interim" } : { kind: "none" };
}
export function caseProcess(campaign, id) {
    const proceeding = (campaign.judiciary.proceedings ?? []).find((entry) => entry.id === id || (entry.subject.kind === "executive-order" && entry.subject.recordId === id));
    const ruled = campaign.judiciary.cases.find((entry) => entry.id === id || entry.id === proceeding?.id);
    const history = proceeding?.history ?? ruled?.procedure?.history ?? [];
    if (!proceeding && !ruled)
        return undefined;
    const date = (turn) => formatDate(selectDateOfTurn(campaign, turn));
    const dated = (turn) => ({ turn, date: date(turn), weeks: turn - campaign.turn });
    const final = ruled !== undefined || proceeding?.stage === "final";
    const current = final ? "final" : proceeding ? STEP_OF[proceeding.stage] : undefined;
    const reached = new Set(history.map((moment) => STEP_OF[moment.stage]));
    if (current)
        reached.add(current);
    const currentIndex = current ? ORDER.indexOf(current) : -1;
    const steps = ORDER.map((step, index) => {
        const moments = history.flatMap((moment, index) => (ownerOf(history, index) === step ? [{ date: date(moment.turn), text: moment.account }] : []));
        const state = step === current ? (final ? "done" : "now")
            : reached.has(step) ? "done"
                : final || index < currentIndex ? "not-reached" : "possible";
        return { id: step, state, moments };
    });
    // A legacy ruling with no recorded procedure still has its own decision as the final step's moment.
    const withLegacy = ruled && history.length === 0
        ? steps.map((step) => (step.id === "final" ? { ...step, moments: [{ date: date(ruled.ruledTurn), text: ruled.holding === "struck-down" ? "The Court struck the order down." : "The Court upheld the order." }] } : step))
        : steps;
    const response = proceeding ? campaign.cases?.[`case:review:${proceeding.id}`] : undefined;
    const responseDue = response && isOpenCase(response.status) && "dueAt" in response.clock ? deadline(campaign, response.clock.dueAt) : undefined;
    const stay = proceeding?.stayApplication;
    const subject = proceeding?.subject ?? ruled?.subject;
    return {
        steps: withLegacy,
        ...(current ? { current } : {}),
        ...(proceeding && !final ? { next: dated(proceeding.nextTurn) } : {}),
        ...(responseDue ? { response: responseDue } : {}),
        ...(stay ? { stay: { status: stay.status, requested: date(stay.requestedTurn), ...(stay.decidedTurn !== undefined ? { decided: date(stay.decidedTurn) } : {}),
                superseded: final || (proceeding?.circuit !== undefined && proceeding.circuit.ruledTurn >= (stay.decidedTurn ?? stay.requestedTurn)) } } : {}),
        governing: governingOf(proceeding, ruled, final),
        ...(subject?.kind === "executive-order" ? { operative: prospectiveOrderAuthority(campaign, subject.recordId) } : {}),
        remanded: proceeding?.remanded === true || history.some((moment) => moment.stage === "remand"),
    };
}
