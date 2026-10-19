import { useId, type ReactNode } from "react";
import { View, styled } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Legend } from "./Field";
import { useRoving } from "./roving";

export type ChoiceOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly detail?: string;
  readonly icon?: IconName;
  /** A drawing that identifies the option before it is read: a party mark, a margin bar. */
  readonly visual?: ReactNode;
  readonly disabled?: boolean;
};

/** The card every option and every checkable row is drawn on. */
export const OptionCard = styled(View, {
  name: "OptionCard",
  tabIndex: 0,
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: "md",
  padding: "md",
  minHeight: "hit",
  borderRadius: "card",
  borderWidth: 1,
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  variants: {
    selected: {
      true: { backgroundColor: "infoFill", borderColor: "accent", borderWidth: 2, padding: 11 },
      false: { backgroundColor: { default: "surface", hover: "surfaceHover", press: "backgroundPress" }, borderColor: { default: "borderColor", hover: "borderColorHover" } },
    },
    disabled: { true: { opacity: 0.55, cursor: "not-allowed" } },
  } as const,
});

/** The mark that says chosen or not: a ring for one-of-many, a box for any-of-many. */
export function ChoiceMark({ selected, shape }: { readonly selected: boolean; readonly shape: "radio" | "check" }) {
  const radius = shape === "radio" ? "pill" : "chip";
  return (
    <View width={22} height={22} marginTop={1} borderRadius={radius} borderWidth={2} borderColor={selected ? "accent" : "borderColorStrong"} backgroundColor={selected && shape === "check" ? "accent" : "surface"} alignItems="center" justifyContent="center" aria-hidden>
      {selected && shape === "radio" ? <View width={10} height={10} borderRadius="pill" backgroundColor="accent" /> : null}
      {selected && shape === "check" ? <Icon name="approve" size={14} tone="accentInk" weight="bold" /> : null}
    </View>
  );
}

/** The words and the visual of one option, shared by the radio and the checkbox cards. */
export function OptionBody({ label, detail, icon, visual, children }: { readonly label: string; readonly detail?: string; readonly icon?: IconName; readonly visual?: ReactNode; readonly children?: ReactNode }) {
  return (
    <>
      {visual ?? (icon ? <Icon name={icon} size={26} tone="gold" /> : null)}
      <Column flex={1} gap="2xs" minWidth={0}>
        <Text variant="label">{label}</Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
        {children}
      </Column>
    </>
  );
}

export type ChoiceListProps<T extends string> = {
  readonly label: string;
  readonly help?: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
  /** The narrowest a card may be before the list wraps to fewer columns. */
  readonly minCardWidth?: number;
  /** Hide the legend when the stage's own heading already names the choice; it is still announced. */
  readonly legendHidden?: boolean;
};

/**
 * One of several options as cards with a mark, a title and what it means:
 * a radio group to assistive technology, with the arrows moving the choice.
 * Cards wrap to as many columns as the width allows.
 */
export function ChoiceList<T extends string>({ label, help, options, value, onChange, minCardWidth = 240, legendHidden }: ChoiceListProps<T>) {
  const legend = useId();
  const enabled = options.filter((option) => !option.disabled).map((option) => option.value);
  const roving = useRoving(enabled, value, onChange);
  return (
    <Column gap="sm">
      {legendHidden ? null : <Legend id={legend} label={label} help={help} />}
      <Row wrap gap="sm" alignItems="stretch" role="radiogroup" aria-labelledby={legendHidden ? undefined : legend} aria-label={legendHidden ? label : undefined}>
        {options.map((option) => {
          const selected = option.value === value;
          const index = enabled.indexOf(option.value);
          return (
            <OptionCard
              key={option.value}
              role="radio"
              ref={index === -1 ? undefined : roving.refFor(index)}
              selected={selected}
              disabled={option.disabled}
              aria-checked={selected}
              aria-disabled={option.disabled}
              tabIndex={index === -1 ? -1 : roving.tabIndexFor(index)}
              onKeyDown={index === -1 ? undefined : roving.keyDownFor(index)}
              onPress={option.disabled ? undefined : () => onChange(option.value)}
              flexGrow={1}
              flexBasis={minCardWidth}
              minWidth={Math.min(minCardWidth, 260)}
            >
              <ChoiceMark selected={selected} shape="radio" />
              <OptionBody label={option.label} detail={option.detail} icon={option.icon} visual={option.visual} />
            </OptionCard>
          );
        })}
      </Row>
    </Column>
  );
}

/** One thing that can be taken or left: a plank, an order. Extra content sits under its words. */
export function CheckCard({ label, detail, icon, visual, checked, onChange, disabled, children }: { readonly label: string; readonly detail?: string; readonly icon?: IconName; readonly visual?: ReactNode; readonly checked: boolean; readonly onChange: (checked: boolean) => void; readonly disabled?: boolean; readonly children?: ReactNode }) {
  return (
    <OptionCard role="checkbox" selected={checked} disabled={disabled} aria-checked={checked} aria-disabled={disabled} onPress={disabled ? undefined : () => onChange(!checked)}>
      <ChoiceMark selected={checked} shape="check" />
      <OptionBody label={label} detail={detail} icon={icon} visual={visual}>
        {children}
      </OptionBody>
    </OptionCard>
  );
}
