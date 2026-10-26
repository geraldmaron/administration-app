import { addDays, apply, judicialReviewPhase, rulemakingPhase, servicePhase, signOrder } from "@admin/engine";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { sealedCampaign } from "./preview-board.js";
import { orderCaseGate, selectScenarioOrderCase } from "./scenario-order-case.js";
const forced = { stream: () => ({ key: "preview-order-case", next: () => 0,
        nextInt: (min) => min, pick: (items) => items[0] }) };
/** Sign a real order, let it operate, and wait for the Court's filing phase. */
export function orderCaseBoards(defs) {
    if (!defs.some((def) => def.cast.pick === "pendingOrderCase"))
        return [];
    // Seeded so the lower court strikes the order while its rule is in effect,
    // which gives the adverse-lower posture boards as well as the pending ones.
    const base = sealedCampaign("preview-order-case-order-border-controls-6", CHARTER_PRESIDENTIAL_REPUBLIC.id);
    const signed = signOrder(base, CHARTER_PRESIDENTIAL_REPUBLIC, "order-border-controls", forced);
    if (!signed.ok)
        return [];
    let state = apply(base, signed.packet);
    const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
    const boards = [];
    // Long enough for the lower merits to come back: 60 to 270 days from filing.
    for (let turn = 0; turn < 45; turn += 1) {
        state = phase(state).reduce(apply, state);
        state = rulemakingPhase(state).reduce(apply, state);
        if (defs.some((def) => def.cast.pick === "pendingOrderCase" &&
            selectScenarioOrderCase(state, def.id, orderCaseGate(def.conditions))))
            boards.push(state);
        state = servicePhase(state).reduce(apply, state);
        state = { ...state, turn: state.turn + 1, calendar: addDays(state.calendar, 7) };
    }
    return boards;
}
