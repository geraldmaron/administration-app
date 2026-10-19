import type { ReactNode } from "react";
import { StackedBar, type BarSegment } from "../news/StackedBar";

export type ShareSegment = { readonly id: string; readonly label: string; readonly share: number; readonly figure: string; readonly icon?: ReactNode; readonly muted?: boolean };

// Each segment takes a role in turn, told apart by its key's words as well as its ink.
const INKS = ["accent", "gold", "infoInk", "successInk", "warningInk", "partyInd", "colorSecondary"] as const;

/** Shares as the stacked bar's segments, each taking the next ink in turn and a muted one its quiet ink. */
export function shareSegments(segments: readonly ShareSegment[]): readonly BarSegment[] {
  return segments.map((segment, index) => ({ key: segment.id, count: Math.max(0, segment.share), label: segment.label, figure: segment.figure, ink: segment.muted ? "borderColorStrong" : INKS[index % INKS.length]! }));
}

/**
 * Parts of one whole on one bar with their key beneath. Kept so the nation
 * screens compile while they move to `StackedBar` with `shareSegments`; it
 * draws exactly that.
 */
export function ShareBar({ label, segments }: { readonly label: string; readonly segments: readonly ShareSegment[] }) {
  return <StackedBar label={label} segments={shareSegments(segments)} height={14} keyed />;
}
