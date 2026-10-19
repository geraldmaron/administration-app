import { forceAssetFor, type ForceAssetId, type ForceCountNoun } from "@admin/world";
import type { IconName } from "@admin/ui-web";
import { FORCE_ASSET_GLYPH } from "../../shell/glyphs";

const SINGULAR: Readonly<Record<ForceCountNoun, string>> = {
  formations: "formation",
  hulls: "hull",
  airframes: "airframe",
  satellites: "satellite",
  teams: "team",
  batteries: "battery",
};

/** What a count of this asset is counted in: hulls for ships, airframes for aircraft, formations for brigades and squadrons. */
export function unitNoun(unitType: ForceAssetId, count: number): string {
  const plural = forceAssetFor(unitType).counts;
  return count === 1 ? SINGULAR[plural] : plural;
}

export function assetGlyph(unitType: ForceAssetId): IconName {
  return FORCE_ASSET_GLYPH[unitType];
}

/** A count as a reader says it, number first, unit after: "1,550 airframes". */
export function figureWords(unitType: ForceAssetId, count: number): string {
  return `${count.toLocaleString("en-US")} ${unitNoun(unitType, count)}`;
}
