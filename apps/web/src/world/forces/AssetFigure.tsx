import { Icon } from "@admin/ui-web";
import type { ForceAssetId } from "@admin/world";
import { assetGlyph, unitNoun } from "./units";
import "./forces.css";

/** The silhouette of one kind of asset, decorative: the name beside it carries the meaning. */
export function AssetGlyph({ unitType, size = 24 }: { readonly unitType: ForceAssetId; readonly size?: number }) {
  return <Icon name={assetGlyph(unitType)} size={size} className="asset-glyph" />;
}

/** An asset's identity: its glyph and its name. */
export function AssetName({ unitType, label }: { readonly unitType: ForceAssetId; readonly label: string }) {
  return (
    <span className="asset-name">
      <AssetGlyph unitType={unitType} />
      <span>{label}</span>
    </span>
  );
}

/** A count with its unit beside it, so hulls, airframes and formations are never read as the same quantity. */
export function AssetFigure({ unitType, count }: { readonly unitType: ForceAssetId; readonly count: number }) {
  return (
    <span className="asset-figure">
      <span className="asset-figure__n">{count.toLocaleString("en-US")}</span> <span className="asset-figure__unit">{unitNoun(unitType, count)}</span>
    </span>
  );
}

/** A line naming a count of an asset the way a receipt or comparison cell does: glyph, number, unit. */
export function AssetCountLine({ unitType, count, label }: { readonly unitType: ForceAssetId; readonly count: number; readonly label?: string }) {
  return (
    <span className="asset-line">
      <AssetGlyph unitType={unitType} size={20} />
      {label ? <span className="asset-line__label">{label}</span> : null}
      <AssetFigure unitType={unitType} count={count} />
    </span>
  );
}

/** A count already worded ("4 destroyers") with its asset's glyph before it. */
export function AssetTextLine({ unitType, text }: { readonly unitType: ForceAssetId; readonly text: string }) {
  return (
    <span className="asset-line">
      <AssetGlyph unitType={unitType} size={20} />
      <span>{text}</span>
    </span>
  );
}
