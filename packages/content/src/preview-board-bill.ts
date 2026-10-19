import { advanceBills, amendableAct, apply, proposeBillText, recommendBillConferenceText, transmit, transmittableActs, type Campaign } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import type { ScenarioDef } from "./scenario.js";
import type { BillGate } from "./scenario-bill.js";

function advance(state: Campaign): Campaign {
  const next = { ...state, turn: state.turn + 1 };
  const result = advanceBills(next);
  return result.effects.length ? apply(next, { source: "simulate", actor: "world", turn: next.turn,
    narration: { summary: "Congress considers the bill." }, effects: result.effects }) : next;
}

/** Stage a real transmitted bill and let Congress move it to the requested live text decision. */
function billBoard(gate: BillGate): Campaign | undefined {
  for (let seed = 0; seed < 8; seed += 1) {
    const sealed = sealedCampaign(`preview-bill-${seed}`);
    // The grid measure comes onto the agenda when import dependence rises;
    // stage that real trigger before asking whether its conference can occur.
    const home = sealed.founding.nation;
    const runtime = sealed.nations[home];
    const base = gate.act === "act-clean-grid" && runtime
      ? { ...sealed, nations: { ...sealed.nations, [home]: { ...runtime,
        stats: { ...runtime.stats, energy: { ...runtime.stats.energy, importDependence: 0.16 } } } } }
      : sealed;
    for (const act of transmittableActs(base).filter((entry) => amendableAct(entry.id) && (!gate.act || entry.id === gate.act))) {
      const sent = transmit(base, act.id);
      if (!sent.ok) continue;
      let state = apply(base, sent.packet);
      const id = Object.values(state.bills).find((bill) => bill.act === act.id && bill.status === "in-progress")?.id;
      if (!id) continue;
      for (let turn = 0; turn < 20; turn += 1) {
        const bill = state.bills[id];
        if (!bill || bill.status !== "in-progress") break;
        if (bill.stage === "markup") {
          if (gate.stage === "markup" && proposeBillText(state, id).ok) return state;
          const proposed = proposeBillText(state, id);
          if (proposed.ok) state = apply(state, proposed.packet);
        }
        if (bill.stage === "conference" && gate.stage === "conference" && gate.responseText &&
          (gate.responseText === "both"
            ? bill.text?.house !== undefined && bill.text?.senate !== undefined && bill.text.house !== bill.text.senate &&
              recommendBillConferenceText(state, id, bill.text.house).ok && recommendBillConferenceText(state, id, bill.text.senate).ok
            : recommendBillConferenceText(state, id, gate.responseText).ok)) return state;
        state = advance(state);
      }
    }
  }
  return undefined;
}

export function billBoards(defs: readonly ScenarioDef[]): readonly Campaign[] {
  const gates = defs.flatMap((def) => def.conditions.filter((condition): condition is BillGate => condition.kind === "liveBill"));
  const unique = new Map(gates.map((gate) => [JSON.stringify(gate), gate]));
  return [...unique.values()].flatMap((gate) => {
    const board = billBoard(gate);
    return board ? [board] : [];
  });
}
