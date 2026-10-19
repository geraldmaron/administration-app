import Svg, { Path } from "react-native-svg";
import { useInk } from "../icons/Icon";
import { pathDirection, sparklineKeyEntries, type KeyEntry } from "./key-entries";
import { fitDomain, linePath, plotValues, type PlotPoint } from "./scale";

export type Valence = "good" | "watch" | "bad" | "neutral";

const INK = { good: "goodInk", watch: "warningInk", bad: "badInk", neutral: "accent" } as const;
const ARROW = 4;

/** The key a sparkline's frame prints: its own line, the inherited stretch when drawn, and the end arrow. */
export function sparklineKey(valence: Valence = "neutral", splitAt = 0): readonly KeyEntry[] {
  return sparklineKeyEntries({ ink: INK[valence], inherited: splitAt > 0 });
}

/** A small head at the path's last point, pointing the way the term's stretch moved; flat draws a bar. */
function arrowPath([x, y]: PlotPoint, direction: "up" | "down" | "flat"): string {
  if (direction === "flat") return `M${x - ARROW} ${y - ARROW} V${y + ARROW}`;
  const tip = direction === "up" ? y - ARROW - 1 : y + ARROW + 1;
  const base = direction === "up" ? y + 1 : y - 1;
  return `M${x - ARROW} ${base} L${x} ${tip} L${x + ARROW} ${base} Z`;
}

/**
 * A reading's recent path at the size of a word, for a row that already says
 * the figure. The administration's own stretch is solid in the reading's ink
 * and ends in an arrow the way it moved, so the direction never rests on
 * color; what came before is dashed and faint. Given `label`, a screen reader
 * hears it; otherwise it is decoration beside the figure that carries it.
 */
export function Sparkline({ values, splitAt = 0, valence = "neutral", width = 96, height = 28, label }: { readonly values: readonly number[]; readonly splitAt?: number; readonly valence?: Valence; readonly width?: number; readonly height?: number; readonly label?: string }) {
  const ink = useInk(INK[valence]);
  const faint = useInk("colorTertiary");
  if (values.length < 2) return null;
  const pts = plotValues(values, fitDomain(values), width - ARROW - 2, height, ARROW + 2);
  const split = Math.min(Math.max(splitAt - 1, 0), pts.length - 1);
  const before = splitAt > 0 ? pts.slice(0, split + 1) : [];
  const after = splitAt > 0 ? pts.slice(split) : pts;
  const direction = pathDirection(values, splitAt);
  const end = pts[pts.length - 1]!;
  return (
    <Svg width={width} height={height} {...(label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true })}>
      {before.length > 1 ? <Path d={linePath(before)} stroke={faint} strokeWidth={1.5} strokeDasharray="3 3" fill="none" /> : null}
      <Path d={linePath(after)} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={arrowPath(end, direction)} fill={direction === "flat" ? "none" : ink} stroke={ink} strokeWidth={direction === "flat" ? 2 : 1} strokeLinejoin="round" />
    </Svg>
  );
}
