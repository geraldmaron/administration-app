import { useId } from "react";
import { View, styled } from "@tamagui/core";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

const Frame = styled(View, {
  name: "Toggle",
  role: "switch",
  tabIndex: 0,
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "center",
  gap: "md",
  minHeight: "hit",
  maxWidth: 720,
  flexShrink: 1,
  paddingVertical: "xs",
  borderRadius: "control",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  variants: { disabled: { true: { opacity: 0.5, cursor: "not-allowed" } } } as const,
});

const Track = styled(View, {
  name: "ToggleTrack",
  width: 46,
  height: 28,
  borderRadius: "pill",
  borderWidth: 1,
  padding: 2,
  justifyContent: "center",
  variants: {
    on: {
      true: { backgroundColor: "accentFill", borderColor: "accentFill", alignItems: "flex-end" },
      false: { backgroundColor: "backgroundStrong", borderColor: "borderColorStrong", alignItems: "flex-start" },
    },
  } as const,
});

/**
 * An on/off setting that takes effect at once. The whole row is the switch,
 * and its state is said in words beside the track so it never rests on the
 * track's color or position alone.
 */
export function Toggle({ label, hint, value, onChange, disabled, testID }: { readonly label: string; readonly hint?: string; readonly value: boolean; readonly onChange: (value: boolean) => void; readonly disabled?: boolean; readonly testID?: string }) {
  const hintId = useId();
  return (
    <Frame
      aria-checked={value}
      aria-label={label}
      aria-describedby={hint ? hintId : undefined}
      aria-disabled={disabled}
      disabled={disabled}
      testID={testID}
      onPress={disabled ? undefined : () => onChange(!value)}
    >
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="secondary" id={hintId}>
            {hint}
          </Text>
        ) : null}
      </Column>
      <Row gap="sm" flexShrink={0}>
        <Text variant="caption" tone="secondary" aria-hidden>
          {value ? "On" : "Off"}
        </Text>
        <Track on={value}>
          <View width={22} height={22} borderRadius="pill" backgroundColor={value ? "accentInk" : "colorSecondary"} />
        </Track>
      </Row>
    </Frame>
  );
}
