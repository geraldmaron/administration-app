import { View, styled } from "@tamagui/core";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { Text } from "./Text";

const Chip = styled(View, {
  name: "Tag",
  flexDirection: "row",
  alignItems: "center",
  gap: "xs",
  minHeight: 24,
  paddingHorizontal: "sm",
  borderRadius: "chip",
  alignSelf: "flex-start",
  variants: {
    tone: {
      info: { backgroundColor: "infoFill" },
      success: { backgroundColor: "successFill" },
      warning: { backgroundColor: "warningFill" },
      danger: { backgroundColor: "dangerSoft" },
      // A draft, a pending or unknown state: outlined and never filled, so it never reads as settled.
      pending: { backgroundColor: "transparent", borderWidth: 1, borderColor: "pendingInk", borderStyle: "dashed" },
      authority: { backgroundColor: "transparent", borderWidth: 1, borderColor: "goldRule" },
      outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "borderColorStrong" },
    },
  } as const,
  defaultVariants: { tone: "pending" },
});

export type TagTone = "info" | "success" | "warning" | "danger" | "pending" | "authority" | "outline";

const INK = { info: "infoInk", success: "successInk", warning: "warningInk", danger: "danger", pending: "pendingInk", authority: "gold", outline: "color" } as const;
const TEXT_TONE = { info: "info", success: "success", warning: "warning", danger: "danger", pending: "secondary", authority: "gold", outline: "primary" } as const;

export type TagProps = {
  readonly children: ReactNode;
  readonly tone?: TagTone;
  /** A glyph instead of the dot, when the state has one of its own. */
  readonly icon?: IconName;
  /** The dot before the word; off for a tag that names a kind rather than a state. */
  readonly dot?: boolean;
};

/** A state in a word: the word carries the meaning, the tone confirms it. Never a color alone. */
export function Tag({ children, tone = "pending", icon, dot = true }: TagProps) {
  return (
    <Chip tone={tone}>
      {icon ? (
        <Icon name={icon} size={14} tone={INK[tone]} weight="bold" />
      ) : dot ? (
        <View width={7} height={7} borderRadius="pill" aria-hidden {...(tone === "pending" ? { borderWidth: 1.5, borderColor: "pendingInk" } : { backgroundColor: INK[tone] })} />
      ) : null}
      <Text variant="label" tone={TEXT_TONE[tone]} numberOfLines={1}>
        {children}
      </Text>
    </Chip>
  );
}
