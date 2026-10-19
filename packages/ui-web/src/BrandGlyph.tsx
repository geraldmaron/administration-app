import { BRAND_DESK_PATH, BRAND_PORTAL_PATH, BRAND_VIEW_BOX } from "@admin/design";

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
      viewBox={BRAND_VIEW_BOX}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BRAND_PORTAL_PATH} fill="currentColor" />
      <path d={BRAND_DESK_PATH} fill="var(--color-gold, currentColor)" />
    </svg>
  );
}
