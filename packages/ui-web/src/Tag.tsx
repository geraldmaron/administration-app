import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { Icon, type IconName } from "./Icon";

/** Red for force and urgent risk, gold for the institution and current state, blue for where you go, neutral for a plain fact. */
export type TagTone = "risk" | "caution" | "identity" | "action" | "neutral" | "good";

export type TagProps = {
  readonly children: ReactNode;
  readonly tone?: TagTone;
  readonly icon?: IconName;
  /** Filled rather than tinted: the one tag on a card that must be seen first, such as CRITICAL. */
  readonly solid?: boolean;
};

/** Tones that are a state of play get a status dot; a kind (identity) or a plain fact (neutral) is the word alone. */
const DOTTED: ReadonlySet<TagTone> = new Set(["risk", "caution", "action", "good"]);

/**
 * A short label set as a chip: a severity, a kind, a staffing. Read at a
 * glance, never the only place the fact is said. A status reads by its dot and
 * tint; only the solid tag, the one that must be seen first, keeps its glyph.
 */
export function Tag({ children, tone = "neutral", icon, solid = false }: TagProps) {
  const mark = solid ? (icon ? <Icon name={icon} size={14} weight="bold" /> : null) : DOTTED.has(tone) ? <span className="ui-tag__dot" aria-hidden="true" /> : null;
  return (
    <Badge className="ui-tag" variant="outline" data-tone={tone} data-solid={solid ? "true" : undefined}>
      {mark}
      {children}
    </Badge>
  );
}
