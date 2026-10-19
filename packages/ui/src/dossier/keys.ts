import type { KeyEntry } from "../data/key-entries";
import { READ_INK, type ReadTone } from "./read-ink";

/** What a tie's tone says about two people, in the words the key prints. */
const TIE_WORD: Readonly<Partial<Record<ReadTone, string>>> = { good: "On good terms", bad: "At odds", neutral: "No known leaning" };
const TONE_ORDER: readonly ReadTone[] = ["good", "bad", "neutral"];

export type TieKeyInput = {
  readonly nodes: readonly { readonly tone: ReadTone }[];
  readonly links: readonly { readonly tone: ReadTone; readonly evidence: "recorded" | "inferred" }[];
  readonly formalHub?: boolean;
};

/**
 * The relationship map's key: the tones its rings and lines carry, the two
 * kinds of evidence a line stands for (an arrow for a recorded exchange, a
 * dash for staff inference), and the gold spokes of formal membership. Only
 * what the map draws is listed.
 */
export function tieKeyEntries({ nodes, links, formalHub }: TieKeyInput): readonly KeyEntry[] {
  const tones = new Set<ReadTone>([...nodes.map((node) => node.tone), ...links.map((link) => link.tone)]);
  const evidence = new Set(links.map((link) => link.evidence));
  return [
    ...TONE_ORDER.filter((tone) => tones.has(tone)).map((tone): KeyEntry => ({ id: `tone:${tone}`, kind: "ring", label: TIE_WORD[tone]!, ink: READ_INK[tone] })),
    ...(evidence.has("recorded") ? [{ id: "recorded", kind: "line" as const, label: "Talked about an issue (arrow from who reached out)", ink: "colorTertiary" as const, weight: 2 }] : []),
    ...(evidence.has("inferred") ? [{ id: "inferred", kind: "dash" as const, label: "Staff think they know each other", ink: "colorTertiary" as const, weight: 2, dash: "6 5" }] : []),
    ...(formalHub ? [{ id: "hub", kind: "line" as const, label: "Belongs to the group, not a sign of trust", ink: "goldRule" as const, weight: 1 }] : []),
  ];
}
