import { addDays, apply, judicialReviewPhase, rulemakingPhase, servicePhase, signOrder, type Campaign, type RngStreams } from "@admin/engine";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { sealedCampaign } from "./preview-board.js";
import { orderCaseGate, selectScenarioOrderCase } from "./scenario-order-case.js";
import type { ScenarioDef } from "./scenario.js";

const forced: RngStreams = { stream: () => ({ key: "preview-order-case", next: () => 0,
  nextInt: (min: number) => min, pick: <T>(items: readonly T[]) => items[0]! }) };

/** Sign a real order, let it operate, and wait for the Court's filing phase. */
export function orderCaseBoards(defs: readonly ScenarioDef[]): readonly Campaign[] {
  if (!defs.some((def) => def.cast.pick === "pendingOrderCase")) return [];
  const base = sealedCampaign("preview-order-case-order-border-controls-0", CHARTER_PRESIDENTIAL_REPUBLIC.id);
  const signed = signOrder(base, CHARTER_PRESIDENTIAL_REPUBLIC, "order-border-controls", forced);
  if (!signed.ok) return [];
  let state = apply(base, signed.packet);
  const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
  const boards: Campaign[] = [];
  for (let turn = 0; turn < 12; turn += 1) {
    state = phase(state).reduce(apply, state);
    state = rulemakingPhase(state).reduce(apply, state);
    if (defs.some((def) => def.cast.pick === "pendingOrderCase" &&
      selectScenarioOrderCase(state, def.id, orderCaseGate(def.conditions)))) boards.push(state);
    state = servicePhase(state).reduce(apply, state);
    state = { ...state, turn: state.turn + 1, calendar: addDays(state.calendar, 7) };
  }
  return boards;
}
