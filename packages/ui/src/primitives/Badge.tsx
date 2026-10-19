import { View, styled } from "@tamagui/core";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { Text } from "./Text";

const Chip = styled(View, {
  name: "Badge",
  flexDirection: "row",
  alignItems: "center",
  gap: "xs",
  paddingHorizontal: "sm",
  paddingVertical: "2xs",
  borderRadius: "pill",
  alignSelf: "flex-start",
  variants: {
    status: {
      info: { backgroundColor: "infoFill" },
      success: { backgroundColor: "successFill" },
      warning: { backgroundColor: "warningFill" },
      danger: { backgroundColor: "dangerFill" },
      pending: { backgroundColor: "pendingFill" },
      outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "borderColorStrong" },
      gold: { backgroundColor: "transparent", borderWidth: 1, borderColor: "goldRule" },
    },
  } as const,
  defaultVariants: { status: "pending" },
});

type Status = "info" | "success" | "warning" | "danger" | "pending" | "outline" | "gold";

const INK = { info: "infoInk", success: "successInk", warning: "warningInk", danger: "accentInk", pending: "pendingInk", outline: "color", gold: "gold" } as const;
const TONE = { info: "info", success: "success", warning: "warning", danger: "inverse", pending: "secondary", outline: "primary", gold: "gold" } as const;

/** A state label: never a color alone, always words, optionally a glyph. */
export function Badge({ children, status = "pending", icon }: { readonly children: ReactNode; readonly status?: Status; readonly icon?: IconName }) {
  return (
    <Chip status={status}>
      {icon ? <Icon name={icon} size={14} tone={INK[status]} weight="bold" /> : null}
      <Text variant="caption" weight="strong" tone={TONE[status]}>
        {children}
      </Text>
    </Chip>
  );
}

/** A count on a navigation item or a bell. */
export function CountDot({ count, label }: { readonly count: number; readonly label: string }) {
  if (count <= 0) return null;
  return (
    <View aria-label={label} minWidth={18} height={18} paddingHorizontal={5} borderRadius="pill" backgroundColor="dangerFill" alignItems="center" justifyContent="center">
      <Text variant="caption" weight="strong" tone="inverse">
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
