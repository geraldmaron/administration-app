/**
 * The colors every lens paints with, resolved from the map layer's custom
 * properties. `map.css` points each `--map-lens-*` property at a design token
 * and swaps the pointers for the color-vision-safe and high-contrast palettes,
 * so a palette is a stylesheet change and no color is written here.
 */
export interface MapPalette {
  readonly ground: string;
  /** The neutral lens and land a lens has nothing to say about. */
  readonly neutral: string;
  /** No data: dim neutral dots. */
  readonly nodata: string;
  /** Land a lens says nothing about, as a quiet fill under the lens colors. */
  readonly land: string;
  /** The seam between regions. */
  readonly border: string;
  readonly line: string;
  /** Light pooled in the middle of the sea, the glow along the coasts, and the graticule. */
  readonly seaGlow: string;
  readonly coast: string;
  readonly graticule: string;
  /** Lightness-first sequential ramp, low to high. */
  readonly seq: readonly string[];
  /** Diverging ramp, negative to positive, the middle step neutral. */
  readonly div: readonly string[];
  /** The public's standing behind the President, thin to broad: never a party's colors. */
  readonly standing: readonly string[];
  readonly democrat: string;
  readonly republican: string;
  readonly independent: string;
  readonly favorable: string;
  readonly steady: string;
  readonly caution: string;
  readonly adverse: string;
  readonly unread: string;
  /** The United States itself, in gold. */
  readonly own: string;
  readonly forStrong: string;
  readonly forLean: string;
  readonly againstLean: string;
  readonly againstStrong: string;
  /** Selection outline and tint. */
  readonly selection: string;
  readonly shadow: string;
}

type Single = Exclude<keyof MapPalette, "seq" | "div" | "standing">;

const SINGLE: Readonly<Record<Single, string>> = {
  ground: "--map-lens-ground",
  neutral: "--map-lens-neutral",
  nodata: "--map-lens-nodata",
  land: "--map-lens-land",
  border: "--map-lens-border",
  line: "--map-lens-line",
  seaGlow: "--map-lens-sea-glow",
  coast: "--map-lens-coast",
  graticule: "--map-lens-graticule",
  democrat: "--map-lens-democrat",
  republican: "--map-lens-republican",
  independent: "--map-lens-independent",
  favorable: "--map-lens-favorable",
  steady: "--map-lens-steady",
  caution: "--map-lens-caution",
  adverse: "--map-lens-adverse",
  unread: "--map-lens-unread",
  own: "--map-lens-own",
  forStrong: "--map-lens-for-strong",
  forLean: "--map-lens-for-lean",
  againstLean: "--map-lens-against-lean",
  againstStrong: "--map-lens-against-strong",
  selection: "--map-lens-selection",
  shadow: "--map-lens-shadow",
};

const SEQ = [1, 2, 3, 4, 5, 6, 7].map((n) => `--map-lens-seq-${n}`);
const DIV = ["n3", "n2", "n1", "0", "p1", "p2", "p3"].map((n) => `--map-lens-div-${n}`);
const STANDING = [1, 2, 3, 4, 5, 6, 7].map((n) => `--map-lens-standing-${n}`);

/** Read the palette the layer's stylesheet resolved. A missing property is a broken stylesheet, so it throws. */
export function readPalette(element: Element): MapPalette {
  const style = getComputedStyle(element);
  const token = (name: string): string => {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`Map color ${name} is not defined on the map layer`);
    return value;
  };
  const singles = Object.fromEntries(Object.entries(SINGLE).map(([key, name]) => [key, token(name)])) as Record<Single, string>;
  return { ...singles, seq: SEQ.map(token), div: DIV.map(token), standing: STANDING.map(token) };
}

/** A ramp step for a share in 0..1. */
export function rampStep(ramp: readonly string[], share: number): string {
  const clamped = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const index = Math.min(ramp.length - 1, Math.floor(clamped * ramp.length));
  return ramp[index] ?? ramp[0] ?? "";
}
