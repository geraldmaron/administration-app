import { LEGACY_BRAND_DESK_PATH, LEGACY_BRAND_PORTAL_PATH, LEGACY_BRAND_VIEW_BOX } from "./brand-geometry";

export type BrandGlyphProps = {
  readonly size?: number;
  readonly className?: string;
};

/** Product identity, not an official government seal. Decorative beside a name. */
export function BrandGlyph({ size = 18, className }: BrandGlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={LEGACY_BRAND_VIEW_BOX}
      aria-hidden="true"
      focusable="false"
    >
      <path d={LEGACY_BRAND_PORTAL_PATH} fill="currentColor" />
      <path d={LEGACY_BRAND_DESK_PATH} fill="var(--color-gold, currentColor)" />
    </svg>
  );
}
