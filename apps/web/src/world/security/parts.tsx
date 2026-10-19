import type { ReactNode } from "react";
import type { OperationTone } from "@admin/player-core";
import { Icon, type IconName } from "@admin/ui-web";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";

export type Segment = { readonly key: string; readonly count: number; readonly word: string };

/** A set divided into its parts on one bar, each part its count; the words are what a screen reader hears. */
export function Segments({ parts, label }: { readonly parts: readonly Segment[]; readonly label: string }) {
  const spoken = `${label}: ${parts.map((part) => `${part.count} ${part.word}`).join(", ")}.`;
  return (
    <span className="sec-segments" role="img" aria-label={spoken}>
      {parts.map((part) => (part.count > 0 ? <span key={part.key} data-segment={part.key} style={{ flexGrow: part.count }} /> : null))}
    </span>
  );
}

const CONFIDENCE_NOTCHES = { low: 1, moderate: 2, high: 3 } as const;

/** How sure the community is, as three notches filled from the left; the word beside it is the label, so the notches are decoration. */
export function ConfidenceMeter({ confidence }: { readonly confidence: string | undefined }) {
  const level = confidence ? CONFIDENCE_NOTCHES[confidence as keyof typeof CONFIDENCE_NOTCHES] : undefined;
  return (
    <span className="sec-confidence" data-level={level ?? 0}>
      <span className="sec-confidence__notches" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>{confidence ? `${confidence[0]!.toUpperCase()}${confidence.slice(1)}` : "Not recorded"}</span>
    </span>
  );
}

const TONE_SIGN: Readonly<Record<OperationTone, string>> = { good: "✓", watch: "⚠", bad: "▼", neutral: "" };

/** A status in the shared valence chip; the glyph is the cue that does not depend on color. */
export function StatusChip({ tone, children }: { readonly tone: OperationTone; readonly children: ReactNode }) {
  return (
    <span className="ui-valence-chip" data-valence={tone}>
      {TONE_SIGN[tone] ? `${TONE_SIGN[tone]} ` : ""}
      {children}
    </span>
  );
}

/** A name that is a link where its page exists in this build and plain words where it does not. */
/** Ends a player-written note as one sentence, whether or not they typed the period. */
export function asSentence(text: string): string {
  return /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

export function NameLink({ href, children, className = "ui-row-link" }: { readonly href: string | undefined; readonly children: ReactNode; readonly className?: string }) {
  const built = useBuilt();
  return built(href) ? (
    <Door href={href} className={className}>
      {children}
    </Door>
  ) : (
    <>{children}</>
  );
}

/** A section heading with its glyph, in the screen's panel voice. */
export function PanelHeading({ id, icon, children }: { readonly id: string; readonly icon: IconName; readonly children: ReactNode }) {
  return (
    <h2 id={id} className="sec__heading">
      <Icon name={icon} size={20} /> {children}
    </h2>
  );
}
