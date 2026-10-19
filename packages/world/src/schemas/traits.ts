import { z } from "zod";
import { NationId } from "./ids.js";
import { Agenda } from "./nation.js";

// A nation's personality is authored as a *range*, not a point. Each campaign
// rolls one value inside the range, so the same nation is recognizably itself
// across playthroughs without being identically motivated in each of them.
export const TraitRange = z
  .object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
  })
  .refine((r) => r.min <= r.max, { message: "trait range min must not exceed max" });
export type TraitRange = z.infer<typeof TraitRange>;

export const TraitRanges = z.object({
  aggression: TraitRange,
  opportunism: TraitRange,
  legalism: TraitRange,
  isolationism: TraitRange,
  riskTolerance: TraitRange,
  vengefulness: TraitRange,
  reliability: TraitRange,
  transparency: TraitRange,
});
export type TraitRanges = z.infer<typeof TraitRanges>;

export const TRAIT_KEYS = [
  "aggression",
  "opportunism",
  "legalism",
  "isolationism",
  "riskTolerance",
  "vengefulness",
  "reliability",
  "transparency",
] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];

// Candidates, not selections: the campaign roll picks `agendaCount` of them.
// At least three are required so the pick is a real choice rather than a
// relabeled constant.
export const NationTraitProfile = z.object({
  nation: NationId,
  ranges: TraitRanges,
  candidateAgendas: z.array(Agenda).min(3),
  agendaCount: z.number().int().min(1).max(3),
});
export type NationTraitProfile = z.infer<typeof NationTraitProfile>;
