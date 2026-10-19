import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tableFromIndex, type RawIndex, type RegionTable } from "../data";
import type { MapPalette } from "../lenses/palette";

/** The baked region table, read from disk the way the renderer reads it over fetch. */
export function regionTable(): RegionTable {
  const path = fileURLToPath(new URL("../data/regions.json", import.meta.url));
  return tableFromIndex(JSON.parse(readFileSync(path, "utf8")) as RawIndex);
}

/** A palette of plain names, so a test reads which slot a lens chose. */
export const NAMED_PALETTE: MapPalette = {
  ground: "ground",
  neutral: "neutral",
  nodata: "nodata",
  land: "land",
  border: "border",
  line: "line",
  seaGlow: "seaGlow",
  coast: "coast",
  graticule: "graticule",
  seq: ["seq1", "seq2", "seq3", "seq4", "seq5", "seq6", "seq7"],
  div: ["n3", "n2", "n1", "d0", "p1", "p2", "p3"],
  standing: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  democrat: "democrat",
  republican: "republican",
  independent: "independent",
  favorable: "favorable",
  steady: "steady",
  caution: "caution",
  adverse: "adverse",
  unread: "unread",
  own: "own",
  forStrong: "forStrong",
  forLean: "forLean",
  againstLean: "againstLean",
  againstStrong: "againstStrong",
  selection: "selection",
  shadow: "shadow",
};
