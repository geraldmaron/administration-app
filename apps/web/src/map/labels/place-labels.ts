// Which locale names the map writes, at what length, and where, for one view.
// Pure: the label layer projects the candidates and hands them here on every
// camera move, so the rules are tested apart from the DOM.

/** One locale that could be named: where its name sits, how much room its shape gives, and the forms its name comes in. */
export interface LabelCandidate {
  readonly key: string;
  /** The interior anchor on screen. */
  readonly x: number;
  readonly y: number;
  /** The shape's on-screen extent, from its bounds: a name that will not fit inside it shortens or moves out. */
  readonly width: number;
  readonly height: number;
  /** Longest first: "Pennsylvania", "PA"; "PA-7 · Allentown", "PA-7". */
  readonly texts: readonly string[];
  /** Higher places first: the selection, then the larger shapes. */
  readonly priority: number;
  /** A shape too small for even its short name keeps that name beside it on a leader line (Rhode Island, Delaware, D.C.). */
  readonly callout: boolean;
  readonly tier: LabelTier;
  /** Context behind a selection: named quietly, so the selection's own names lead. */
  readonly dim?: boolean;
}

/** How a label is set: a country or a state in tracked capitals, a district on a chip, a province in small haloed text. */
export type LabelTier = "nation" | "state" | "district" | "province";

export interface PlacedLabel {
  readonly key: string;
  readonly text: string;
  readonly tier: LabelTier;
  readonly dim?: boolean;
  /** The label's center on screen. */
  readonly x: number;
  readonly y: number;
  /** The anchor a callout's leader line runs back to, where the label was moved out of its shape. */
  readonly leader?: { readonly x: number; readonly y: number };
}

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface LabelBudget {
  /** The part of the map the shell leaves uncovered: a name under the sheet or the panel is a name nobody reads. */
  readonly viewport: Rect;
  /** The most names one view writes: fewer on a phone, where every name competes with the pins and the sheet. */
  readonly max: number;
  /** Screen boxes already taken: the pins and their names. */
  readonly reserved: readonly Rect[];
}

/** Per tier: type size in pixels, and the width of an average glyph as a share of it (tracked capitals run wider). */
const METRICS: Readonly<Record<LabelTier, { readonly size: number; readonly glyph: number }>> = {
  nation: { size: 11, glyph: 0.72 },
  state: { size: 11, glyph: 0.74 },
  district: { size: 11, glyph: 0.56 },
  province: { size: 10, glyph: 0.6 },
};
/** A name fits a shape when it takes no more than this share of the shape's width: bounds overstate an irregular shape. */
const FIT_WIDTH = 0.72;
const FIT_HEIGHT = 0.6;
/** The gap kept around every label so neighbors never touch. */
const PAD = 3;
/** How far a callout sits from the shape it names, to the right, into the margin. */
const CALLOUT_DX = 22;

export function textWidth(text: string, tier: LabelTier): number {
  const metrics = METRICS[tier];
  return text.length * metrics.size * metrics.glyph;
}

function box(x: number, y: number, text: string, tier: LabelTier): Rect {
  const half = textWidth(text, tier) / 2 + PAD;
  const halfHeight = METRICS[tier].size * 0.65 + PAD;
  return { x0: x - half, y0: y - halfHeight, x1: x + half, y1: y + halfHeight };
}

const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

function inside(rect: Rect, viewport: Rect): boolean {
  return rect.x0 >= viewport.x0 && rect.y0 >= viewport.y0 && rect.x1 <= viewport.x1 && rect.y1 <= viewport.y1;
}

/** The longest form of the name the shape has room for, or none. */
function fitting(candidate: LabelCandidate): string | undefined {
  const room = candidate.width * FIT_WIDTH;
  if (METRICS[candidate.tier].size > candidate.height * FIT_HEIGHT && candidate.height > 0) return undefined;
  return candidate.texts.find((text) => textWidth(text, candidate.tier) <= room);
}

function attempt(candidate: LabelCandidate): PlacedLabel | undefined {
  const dim = candidate.dim ? { dim: true } : {};
  const text = fitting(candidate);
  if (text !== undefined) return { key: candidate.key, text, tier: candidate.tier, x: candidate.x, y: candidate.y, ...dim };
  const short = candidate.texts[candidate.texts.length - 1];
  if (!candidate.callout || short === undefined) return undefined;
  const x = candidate.x + CALLOUT_DX + textWidth(short, candidate.tier) / 2;
  return { key: candidate.key, text: short, tier: candidate.tier, x, y: candidate.y, leader: { x: candidate.x, y: candidate.y }, ...dim };
}

/**
 * Place the names greedily by priority: each takes the longest form its shape
 * has room for, or its callout, and is dropped if it would touch a name
 * already placed, a pin, or the edge of the view. Dropping is the rule, not
 * the failure: a name the map has no room for is still in the panel and the
 * tooltip.
 */
export function placeLabels(candidates: readonly LabelCandidate[], budget: LabelBudget): readonly PlacedLabel[] {
  const taken: Rect[] = [...budget.reserved];
  const placed: PlacedLabel[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority)) {
    if (placed.length >= budget.max) break;
    const label = attempt(candidate);
    if (!label) continue;
    const rect = box(label.x, label.y, label.text, label.tier);
    if (!inside(rect, budget.viewport) || taken.some((other) => overlaps(rect, other))) continue;
    taken.push(rect);
    placed.push(label);
  }
  return placed;
}
