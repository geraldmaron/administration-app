import { useState } from "react";
import { TextInput as NativeTextInput } from "react-native";
import { View, styled } from "@tamagui/core";
import { Icon, useInk, type IconName } from "../icons/Icon";
import { FONT_FACES } from "../theme/tamagui.config";
import { fontSize } from "../theme/from-design";

const Frame = styled(View, {
  name: "TextInputFrame",
  flexDirection: "row",
  alignItems: "center",
  gap: "sm",
  minHeight: "control",
  paddingHorizontal: "md",
  borderRadius: "control",
  borderWidth: 1,
  borderColor: { default: "borderColorStrong", hover: "borderColorHover" },
  backgroundColor: "surface",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: 0,
  variants: {
    focused: { true: { outlineWidth: 2, borderColor: "outlineColor" } },
    invalid: { true: { borderColor: "danger" } },
    disabled: { true: { opacity: 0.5 } },
  } as const,
});

export type TextInputProps = {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
  /** Required when no Field labels the input. */
  readonly label?: string;
  readonly id?: string;
  readonly "aria-labelledby"?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
  readonly "aria-required"?: boolean;
  readonly icon?: IconName;
  readonly maxLength?: number;
  readonly autoFocus?: boolean;
  readonly disabled?: boolean;
  /** "search" clears with the platform's control and submits as a search. */
  readonly kind?: "text" | "search" | "name";
  readonly onSubmit?: () => void;
  readonly testID?: string;
};

/**
 * One line of typed text on the theme's surface, with the shared focus ring
 * drawn on the frame because the platform input draws none of its own.
 */
export function TextInput({ value, onChangeText, placeholder, label, icon, maxLength, autoFocus, disabled, kind = "text", onSubmit, testID, invalid, ...aria }: TextInputProps & { readonly invalid?: boolean }) {
  const [focused, setFocused] = useState(false);
  const ink = useInk("color");
  const placeholderInk = useInk("placeholderColor");
  return (
    <Frame focused={focused} invalid={invalid || aria["aria-invalid"] === true} disabled={disabled}>
      {icon ? <Icon name={icon} size={18} tone="colorSecondary" /> : null}
      <NativeTextInput
        {...aria}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderInk}
        aria-label={label}
        maxLength={maxLength}
        autoFocus={autoFocus}
        editable={!disabled}
        autoCapitalize={kind === "name" ? "words" : "none"}
        autoComplete="off"
        autoCorrect={false}
        enterKeyHint={kind === "search" ? "search" : "done"}
        inputMode={kind === "search" ? "search" : "text"}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID}
        style={{ flex: 1, minWidth: 0, alignSelf: "stretch", color: ink, fontFamily: FONT_FACES.sans[400], fontSize: fontSize.body, outlineStyle: "none" } as never}
      />
    </Frame>
  );
}
