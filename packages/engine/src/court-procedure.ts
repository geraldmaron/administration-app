import type { Charter } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import { strikeDownChance } from "./strike-odds.js";
import type { CourtHolding, CourtMatter, CourtProceeding, CourtStage } from "./state-judiciary.js";

export function openedProceeding(recordId: string, orderId: string, filedTurn: number, dueTurn: number, matter?: CourtMatter): CourtProceeding {
  return { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId }, filedTurn,
    ...(matter ? { matter } : {}), stage: "threshold", nextTurn: dueTurn,
    history: [{ turn: filedTurn, stage: "threshold", account: `${matter?.parties[0]?.name ?? "A challenger"} files; the lower court has not ruled.` }] };
}

export function courtStep(proceeding: CourtProceeding, stage: CourtStage, turn: number, account: string, extra: Partial<CourtProceeding> = {}): CourtProceeding {
  return { ...proceeding, ...extra, stage, nextTurn: stage === "final" ? turn : turn + 1,
    history: [...proceeding.history, { turn, stage, account }] };
}

export function thresholdPasses(charter: Charter, order: ExecutiveOrder, ground: ConstitutionalGround, draw: number): boolean {
  const merits = strikeDownChance(charter, order, undefined, ground);
  return draw < Math.min(0.98, 0.65 + merits * 0.3);
}

export function lowerMerits(charter: Charter, order: ExecutiveOrder, ground: ConstitutionalGround, draw: number): CourtHolding {
  return draw < strikeDownChance(charter, order, undefined, ground) ? "struck-down" : "upheld";
}

export function appealGrantChance(ground: ConstitutionalGround, lower: CourtHolding, adjustment = 0): number {
  return Math.min(0.9, Math.max(0.1,
    (ground === "forbidden" && lower === "upheld" ? 0.8 : lower === "struck-down" ? 0.55 : 0.35) + adjustment));
}

export function appealGranted(ground: ConstitutionalGround, lower: CourtHolding, draw: number, adjustment = 0): boolean {
  return draw < appealGrantChance(ground, lower, adjustment);
}
