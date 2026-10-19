import { withCaseTransition } from "./cases.js";
import type { CaseDisposition, CaseMove } from "./case-types.js";
import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";

// The disposition tray's own commit: one act over every case family, for the
// four dispositions that need no family-specific act of their own (defer,
// delegate, decline, allow the default to stand). "act" is deliberately not
// answered here — signing a bill and confirming a nominee are different acts
// that already have their own document and their own price, and a generic
// "act" button here would either fake one or duplicate it. A family whose
// only allowed disposition is "act" has nothing this file can commit.

const NARRATION: Readonly<Record<Exclude<CaseDisposition["kind"], "act">, (title: string) => string>> = {
  defer: (title) => `The President defers ${title}.`,
  delegate: (title) => `${title} is delegated.`,
  decline: (title) => `The President declines ${title}.`,
  "allow-default": (title) => `${title} is allowed to default.`,
};

export type CaseDispositionAnswer = { readonly ok: true; readonly packet: EffectPacket } | { readonly ok: false; readonly reason: string };

/**
 * Commits one of the four generic dispositions, priced at nothing beyond the
 * case's own record: `withCaseTransition` is the one validator (a closed
 * case, a disposition the family does not allow, a deferral past the
 * deadline all refuse), called once here to turn its throw into a refusal
 * before anything commits, and once more inside `applyCase` when the packet
 * actually applies.
 */
export function dispositionCase(campaign: Campaign, id: string, disposition: Exclude<CaseDisposition, { readonly kind: "act" }>): CaseDispositionAnswer {
  const existing = (campaign.cases ?? {})[id];
  if (existing === undefined) return { ok: false, reason: "There is no such case." };
  const narration = NARRATION[disposition.kind](existing.title);
  try {
    withCaseTransition(campaign, id, disposition, narration, "player", undefined);
  } catch (cause) {
    return { ok: false, reason: cause instanceof Error ? cause.message : String(cause) };
  }
  const move: CaseMove = { id, disposition, narration };
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", entities: [id], systems: ["cases"] },
      narration: { summary: narration },
      effects: [{ kind: "case", actor: "player", transition: move }],
    },
  };
}
