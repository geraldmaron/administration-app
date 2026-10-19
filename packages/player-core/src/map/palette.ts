import { dark, divergingPalettes, mapBoard, mapPartyPalettes, sequential, type ColorVision } from "@admin/design";

/**
 * The colors every lens paints with. The map is drawn on the dark theater in
 * either page theme, so every slot resolves from the design package's dark
 * set and map palettes; a color-vision setting or high contrast is a
 * different palette object, never a different lens.
 */
export interface MapPalette {
  readonly ground: string;
  /** The neutral lens and land a lens has nothing to say about. */
  readonly neutral: string;
  /** No data: dim neutral. */
  readonly nodata: string;
  /** Land a lens says nothing about, as a quiet fill under the lens colors. */
  readonly land: string;
  /** The seam between regions. */
  readonly border: string;
  readonly line: string;
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
  /** A condition's three severities as the severity bars beside the map draw them: minor in the accent blue, serious in the brown-orange family, severe in red. */
  readonly minor: string;
  readonly serious: string;
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

/** Orange, the family of the brown the severity bars draw "serious" in, and clear of the institutional gold the map keeps for a declaration. */
const SERIOUS_ORANGE = "#E8903A";

/**
 * Standing, slate where the public behind the President is thin and
 * presidential gold where it is broad. The design package states this ramp
 * only in tokens.css (`--map-standing-1..7`); these are the same values.
 */
const STANDING = ["#3B3F5C", "#4D4D66", "#6A5E68", "#8C7560", "#B28E4E", "#D6AA45", "#F2C84B"] as const;

export interface PaletteOptions {
  readonly colorVision?: ColorVision;
  readonly highContrast?: boolean;
}

function basePalette(vision: ColorVision): MapPalette {
  const div = divergingPalettes[vision];
  const party = mapPartyPalettes[vision];
  const at = (index: number): string => div[index] ?? div[3];
  // Off the standard palette no lens leans on red against blue alone: the party pair moves onto the diverging ramp, so the two separate in lightness as well as hue.
  const standard = vision === "standard";
  return {
    ground: dark.ground.abyss,
    neutral: mapBoard.neutral,
    nodata: mapBoard.noData,
    land: mapBoard.land,
    border: mapBoard.border,
    line: mapBoard.line,
    seaGlow: mapBoard.seaGlow,
    coast: mapBoard.coast,
    graticule: mapBoard.graticule,
    seq: sequential,
    div,
    standing: STANDING,
    democrat: standard ? party.democrat : at(0),
    republican: standard ? party.republican : at(5),
    independent: party.independent,
    favorable: at(0),
    steady: at(3),
    caution: at(4),
    adverse: at(6),
    minor: dark.anchor.blue,
    // Protan and deutan already read the diverging ramp's warm end as orange, which severe takes, so serious steps down to its brown.
    serious: vision === "protan" || vision === "deutan" ? at(4) : SERIOUS_ORANGE,
    unread: dark.text.disabled,
    own: dark.anchor.gold,
    forStrong: at(0),
    forLean: at(2),
    againstLean: at(4),
    againstStrong: at(6),
    selection: dark.anchor.blue,
    shadow: dark.ground.abyss,
  };
}

/** High contrast: brighter neutral land, the ramps pushed toward their ends, and the focus color for selection. */
function contrasted(palette: MapPalette): MapPalette {
  const div = palette.div;
  const seq = [palette.seq[1], palette.seq[2], ...palette.seq.slice(2)].filter((step): step is string => step !== undefined);
  return {
    ...palette,
    neutral: dark.line.strong,
    border: dark.line.strong,
    line: dark.anchor.white,
    nodata: dark.text.disabled,
    seq,
    div: [div[0], div[1], div[1], div[3], div[5], div[5], div[6]].filter((step): step is string => step !== undefined),
    democrat: div[0] ?? palette.democrat,
    republican: dark.anchor.red,
    forLean: div[1] ?? palette.forLean,
    againstLean: div[5] ?? palette.againstLean,
    selection: dark.line.focus,
  };
}

/** The palette a player's display settings resolve to. */
export function mapPalette(options: PaletteOptions = {}): MapPalette {
  const base = basePalette(options.colorVision ?? "standard");
  return options.highContrast ? contrasted(base) : base;
}

/** A ramp step for a share in 0..1. */
export function rampStep(ramp: readonly string[], share: number): string {
  const clamped = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const index = Math.min(ramp.length - 1, Math.floor(clamped * ramp.length));
  return ramp[index] ?? ramp[0] ?? "";
}
