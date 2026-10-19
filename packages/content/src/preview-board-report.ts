import {
  apply, declareStaffordDisaster, intelligencePhase, obligationPhase, openPursuit, PUBLIC_STATE_QUESTION, signBill,
  relationshipKey, selectCollectionProducts, selectRelationshipsFrom, shareCollectionReport, taskCollection,
  type Campaign, type CollectionProduct, type NationCondition,
} from "@admin/engine";
import type { NationId, StateId } from "@admin/world";
import { sealedCampaign } from "./preview-board.js";
import type { ScenarioDef } from "./scenario.js";
import type { ReportGate } from "./scenario-report.js";

function filed(state: Campaign): Campaign {
  return intelligencePhase(state).reduce((current, packet) => apply(current, packet), state);
}

function domesticBoard(gate: ReportGate): Campaign | undefined {
  const base = sealedCampaign("report-domestic-reachability");
  const stateId = Object.keys(base.states)[0] as StateId;
  const state = base.states[stateId]!;
  const withRequest: Campaign = { ...base, states: { ...base.states, [stateId]: { ...state,
    claims: [{ signature: gate.basis === "governor-request" && gate.condition ? `relief:${gate.condition}` : "public-report-preview", openedTurn: base.turn, expiresTurn: base.turn + 5,
      weight: 0.5, reason: "The governor requests federal help with a recorded state problem." }],
  } } };
  const condition: NationCondition | undefined = gate.condition ? {
    id: `condition:${gate.condition}:${stateId}:${base.turn}`, kind: gate.condition,
    nation: base.founding.nation, state: stateId, scope: "region", severity: 0.5,
    startedTurn: base.turn, status: "active", beats: [],
  } : undefined;
  const conditioned = gate.status === "no-result" ? base : condition ? apply(withRequest, { source: "simulate", actor: "world", turn: base.turn,
    narration: { summary: "A state condition is on the public record." }, effects: [{ kind: "condition", set: condition }] }) : withRequest;
  let ready = conditioned;
  if (gate.basis === "governor-request" && condition && gate.status !== "no-result") {
    ready = obligationPhase(ready).reduce((current, packet) => apply(current, packet), ready);
    const declaration = declareStaffordDisaster(ready, stateId);
    if (!declaration.ok) return undefined;
    ready = apply(ready, declaration.packet);
    const bill = { id: `bill:disaster-recovery:${base.turn}`, act: "act-disaster-recovery",
      title: "The Disaster Recovery and Resilience Act", sponsor: "administration" as const,
      introducedTurn: base.turn, status: "on-the-desk" as const, passage: [] };
    ready = { ...ready, bills: { ...ready.bills, [bill.id]: bill } };
    const enactment = signBill(ready, bill.id);
    if (!enactment.ok) return undefined;
    ready = apply(ready, enactment.packet);
  }
  const tasked = taskCollection(ready, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state",
    target: stateId, question: PUBLIC_STATE_QUESTION });
  if (!tasked.ok) return undefined;
  const result = filed(apply(ready, tasked.packet));
  return selectCollectionProducts(result).some((report) => gate.status === "no-result" ? report.status === "no-result" :
    report.findings?.some((finding) => finding.basis?.kind === gate.basis)) ? result : undefined;
}

function foreignBoard(gate: ReportGate): Campaign | undefined {
  for (let seed = 0; seed < 24; seed += 1) {
    const base = sealedCampaign(`report-foreign-reachability-${seed}`);
    const edges = selectRelationshipsFrom(base, base.founding.nation).filter((edge) => edge.to !== base.founding.nation);
    const target = edges[0]?.to;
    const recipient = edges.find((edge) => edge.to !== target)?.to;
    if (!target || !recipient) continue;
    const pursuit = openPursuit(target, recipient, "prestige", base.turn, "diplomatic", 2, "preview report pursuit");
    const relation = edges.find((edge) => edge.to === recipient)!;
    const keyed = relationshipKey(base.founding.nation, recipient);
    const ready: Campaign = { ...base, pursuits: { ...base.pursuits, [pursuit.id]: pursuit },
      relationships: { ...base.relationships, [keyed]: { ...relation, trust: Math.max(relation.trust, 0.5) } } };
    const request = taskCollection(ready, { element: "IC-CIA", discipline: "humint", targetKind: "foreign-nation",
      target, question: "What is the current foreign posture?" });
    if (!request.ok) continue;
    const issued = filed(apply(ready, request.packet));
    const report = selectCollectionProducts(issued).find((entry): entry is CollectionProduct =>
      entry.target === target && (gate.status === "no-result" ? entry.status === "no-result" :
        entry.status === "findings" && entry.findings?.some((finding) => finding.topic === gate.topic) === true) &&
      (gate.confidence === undefined || entry.confidence === "high" || entry.confidence === gate.confidence));
    if (!report) continue;
    if (gate.shared !== true) return issued;
    const shared = shareCollectionReport(issued, report.id, [recipient as NationId]);
    if (shared.ok) return apply(issued, shared.packet);
  }
  return undefined;
}

export function reportBoards(defs: readonly ScenarioDef[]): readonly Campaign[] {
  const gates = defs.flatMap((def) => def.conditions.filter((condition): condition is ReportGate => condition.kind === "collectionReport"));
  const wanted = new Map<string, ReportGate>(gates.map((gate) => [JSON.stringify(gate), gate]));
  return [...wanted.values()].flatMap((gate) => {
    const board = gate.targetKind === "domestic-state" ? domesticBoard(gate) : foreignBoard(gate);
    return board ? [board] : [];
  });
}
