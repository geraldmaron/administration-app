import type { ReactNode } from "react";
import { View, styled } from "@tamagui/core";
import { Icon, type IconName, type InkRole } from "../icons/Icon";
import { Text } from "./Text";

const Frame = styled(View, {
  name: "Button",
  role: "button",
  tabIndex: 0,
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "sm",
  minHeight: "control",
  paddingHorizontal: "lg",
  borderRadius: "control",
  borderWidth: 1,
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  variants: {
    kind: {
      primary: { backgroundColor: { default: "accentFill", hover: "accentFillHover", press: "accentFillHover" }, borderColor: "accentFill" },
      secondary: { backgroundColor: { default: "surface", hover: "surfaceHover", press: "backgroundPress" }, borderColor: "borderColorStrong" },
      quiet: { backgroundColor: { default: "transparent", hover: "surfaceHover", press: "backgroundPress" }, borderColor: "transparent" },
      danger: { backgroundColor: { default: "dangerFill", hover: "dangerFillHover", press: "dangerFillHover" }, borderColor: "dangerFill" },
      gold: { backgroundColor: { default: "goldFill", hover: "goldRule", press: "goldRule" }, borderColor: "goldRule" },
    },
    size: {
      compact: { minHeight: "compact", paddingHorizontal: "md" },
      regular: {},
      large: { minHeight: 52, paddingHorizontal: "xl" },
    },
    block: { true: { alignSelf: "stretch" } },
    disabled: { true: { opacity: 0.5, cursor: "not-allowed" } },
  } as const,
  defaultVariants: { kind: "secondary", size: "regular" },
});

type Kind = "primary" | "secondary" | "quiet" | "danger" | "gold";

const INK: Record<Kind, InkRole> = { primary: "accentInk", secondary: "color", quiet: "color", danger: "accentInk", gold: "goldInk" };
const TEXT_TONE = { primary: "inverse", secondary: "primary", quiet: "primary", danger: "inverse", gold: "goldInk" } as const;

export type ButtonProps = {
  readonly children?: ReactNode;
  readonly kind?: Kind;
  readonly size?: "compact" | "regular" | "large";
  readonly icon?: IconName;
  readonly iconAfter?: IconName;
  readonly block?: boolean;
  readonly disabled?: boolean;
  /** Required when the button shows only an icon. */
  readonly label?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
};

/** Every press in the player. An icon-only button must carry `label`. */
export function Button({ children, kind = "secondary", size = "regular", icon, iconAfter, block, disabled, label, onPress, testID }: ButtonProps) {
  return (
    <Frame
      kind={kind}
      size={size}
      block={block}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={label}
      testID={testID}
      onPress={disabled ? undefined : onPress}
      {...(children ? {} : { paddingHorizontal: "sm" as const, minWidth: "control" as const })}
    >
      {icon ? <Icon name={icon} size={size === "compact" ? 16 : 20} tone={INK[kind]} weight="bold" /> : null}
      {children ? (
        <Text variant="label" tone={TEXT_TONE[kind]} numberOfLines={1}>
          {children}
        </Text>
      ) : null}
      {iconAfter ? <Icon name={iconAfter} size={16} tone={INK[kind]} weight="bold" /> : null}
    </Frame>
  );
}

export { Pressable } from "./Pressable";
