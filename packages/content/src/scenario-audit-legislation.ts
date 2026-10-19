import { LEGISLATIVE_ACTS } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";

/** A transmitted bill is a real administration proposal, gated on its live calendar slot. */
export function auditLegislativeTransmission(def: ScenarioDef, findings: ScenarioFinding[]): void {
  const error = (message: string) => findings.push({ kind: "ungrounded-transmission", severity: "error", scenario: def.id, message });
  const guards = def.conditions.filter((condition) => condition.kind === "legislationAvailable");
  const replies = def.replies.filter((reply) => reply.commitment.kind === "position" && reply.commitment.transmit);
  for (const guard of guards) {
    if (!replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.transmit === guard.act)) {
      error(`legislationAvailable gate for ${guard.act} has no transmitting reply`);
    }
  }
  for (const reply of replies) {
    if (reply.commitment.kind !== "position" || !reply.commitment.transmit) continue;
    const actId = reply.commitment.transmit;
    const act = LEGISLATIVE_ACTS.find((entry) => entry.id === actId);
    if (!act || act.sponsor !== "administration") error(`${actId} is not an administration bill`);
    if (!guards.some((guard) => guard.act === actId)) error(`${actId} needs a matching legislationAvailable gate`);
    if (reply.commitment.collection || reply.commitment.relief || reply.commitment.localeAct ||
      reply.commitment.impact || Object.keys(reply.commitment.cost).length > 0) {
      error(`${actId} transmission cannot be combined with another action or authored price`);
    }
  }
}
