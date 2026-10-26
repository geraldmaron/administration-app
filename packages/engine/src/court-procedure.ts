import type { Charter } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import { strikeDownChance } from "./strike-odds.js";
import { createRngStreams, type CampaignSeed } from "./rng.js";
import { turnsFor } from "./pace.js";
import type { CourtHolding, CourtMatter, CourtProceeding, CourtStage } from "./state-judiciary.js";

export function openedProceeding(recordId: string, orderId: string, filedTurn: number, dueTurn: number, matter?: CourtMatter): CourtProceeding {
  return { id: `case:${recordId}`, subject: { kind: "executive-order", recordId, orderId }, filedTurn,
    ...(matter ? { matter } : {}), stage: "threshold", nextTurn: dueTurn,
    history: [{ turn: filedTurn, stage: "threshold", account: `${matter?.parties[0]?.name ?? "A challenger"} files; the lower court has not ruled.` }] };
}

export function courtStep(proceeding: CourtProceeding, stage: CourtStage, turn: number, account: string,
  extra: Partial<CourtProceeding> = {}, waitUntil?: number): CourtProceeding {
  return { ...proceeding, ...extra, stage, nextTurn: stage === "final" ? turn : Math.max(turn + 1, waitUntil ?? 0),
    history: [...proceeding.history, { turn, stage, account }] };
}

// How long each step takes, in days, as bands a draw lands inside. Interim
// relief is expedited; merits and appeals run on ordinary dockets. A filing
// deadline is never read as a minimum wait: a party may petition the day
// after judgment, and many do.
export type CourtBand = { readonly min: number; readonly max: number; readonly source: string };

export const COURT_TIMING_DAYS = {
  interim: { min: 2, max: 21, source: "Fed. R. Civ. P. 65(b)(2): a temporary restraining order lasts at most 14 days, extendable once for good cause; 65(a): a preliminary injunction on notice. Design band." },
  lowerMerits: { min: 60, max: 270, source: "U.S. Courts, Federal Court Management Statistics, 12 months to 2026-06-30: median civil filing to disposition 6.9 months; challenges with interim relief are often expedited. Design band around it." },
  circuitMerits: { min: 90, max: 365, source: "Federal Court Management Statistics, appellate profile to 2026-06-30: median notice of appeal to disposition 10.1 months, 5.8 to 15.9 by circuit; expedited appeals run shorter." },
  certDisposition: { min: 28, max: 240, source: "Sup. Ct. R. 13.1 (90 days to petition, a deadline), 13.5 (up to 60 more), 15.3 (30 days to respond), 15.5 (distribution at least 14 days after the response, unless waived). No official median found." },
} as const satisfies Record<string, CourtBand>;

/** Weeks a step takes for this proceeding, drawn once inside its band. */
export function courtWeeks(seed: CampaignSeed, proceedingId: string, step: keyof typeof COURT_TIMING_DAYS): number {
  const band = COURT_TIMING_DAYS[step];
  const days = band.min + Math.floor(createRngStreams(seed).stream("court-timing", proceedingId, step).next() * (band.max - band.min + 1));
  return turnsFor(days);
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
