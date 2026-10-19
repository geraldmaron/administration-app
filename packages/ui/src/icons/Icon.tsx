import { useTheme } from "@tamagui/core";
import type { ThemeRoles } from "../theme/from-design";
import { ICONS, type IconName } from "./icon-data";

export type { IconName } from "./icon-data";

/** A theme role an icon or a drawing may take its ink from. */
export type InkRole = keyof ThemeRoles;

export type IconProps = {
  readonly name: IconName;
  /** 16–20 in rows and controls, 24–32 for a section's identity. */
  readonly size?: number;
  readonly weight?: "regular" | "duotone" | "bold" | "fill";
  readonly tone?: InkRole;
  /** An exact color, for data marks whose color is the reading itself. */
  readonly color?: string;
  /** Given only when the glyph carries meaning no visible text beside it does. */
  readonly label?: string;
};

export function isIconName(value: string | undefined): value is IconName {
  return value !== undefined && Object.prototype.hasOwnProperty.call(ICONS, value);
}

/** The ink a theme role resolves to here, for drawings (SVG, charts) that cannot read theme names. */
export function useInk(role: InkRole): string {
  const theme = useTheme();
  return String(theme[role]?.get("web") ?? theme.color?.get("web") ?? "currentColor");
}

/** A glyph from the set. Decorative unless labeled: an icon beside a word says nothing a screen reader needs twice. */
export function Icon({ name, size = 20, weight = "duotone", tone = "color", color, label }: IconProps) {
  const ink = useInk(tone);
  const Glyph = ICONS[name].glyph;
  return (
    <Glyph
      size={size}
      weight={weight}
      color={color ?? ink}
      {...(label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const })}
    />
  );
}
