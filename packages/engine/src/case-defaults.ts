// Save repair and deadline defaults. A damaged entry is dropped. It is not
// recorded as a decline the player never made.
import type { CaseEffect, PresidentialCase } from "./case-types.js";
import { dueCases } from "./cases.js";
import { apply, type EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";

function isCase(id: string, value: unknown): value is PresidentialCase {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<PresidentialCase>;
  return item.id === id && typeof item.status === "string" && Array.isArray(item.history) && item.history.length > 0;
}

/** Drops entries that cannot be a case. Absence of the registry is left absent. */
export function repairCases(campaign: Campaign): Campaign {
  if (campaign.cases === undefined) return campaign;
  const next: Record<string, PresidentialCase> = {};
  for (const [id, value] of Object.entries(campaign.cases)) {
    if (isCase(id, value)) next[id] = value;
  }
  const before = Object.keys(campaign.cases).length;
  if (before === Object.keys(next).length) return campaign;
  return { ...campaign, cases: next };
}

function deadlinePacket(campaign: Campaign, effects: readonly CaseEffect[]): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "A deadline passed." },
    effects,
  };
}

/** Applies due defaults. The case stays, with status `defaulted`. The legal sentence is not run. */
export function withDueCaseDefaults(campaign: Campaign): Campaign {
  const effects = dueDefaultEffects(campaign);
  if (effects.length === 0) return campaign;
  return apply(campaign, deadlinePacket(campaign, effects));
}

/** World effects for open cases whose deadline is today or earlier. */
export function dueDefaultEffects(campaign: Campaign): readonly CaseEffect[] {
  return dueCases(campaign, campaign.calendar)
    .filter((item) => item.allowedDispositions.includes("allow-default"))
    .map((item) => ({
      kind: "case",
      actor: "world",
      transition: {
        id: item.id,
        disposition: { kind: "allow-default" },
        narration: "The deadline passed.",
      },
    }));
}
