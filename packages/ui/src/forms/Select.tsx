import { useState } from "react";
import { View, styled } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Sheet } from "../layers/Sheet";
import { Column } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { ChoiceList, type ChoiceOption } from "./ChoiceList";
import type { FieldControl } from "./Field";
import { TextInput } from "./TextInput";

const Trigger = styled(View, {
  name: "SelectTrigger",
  role: "button",
  tabIndex: 0,
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "center",
  gap: "sm",
  minHeight: "control",
  paddingHorizontal: "md",
  borderRadius: "control",
  borderWidth: 1,
  borderColor: { default: "borderColorStrong", hover: "borderColorHover" },
  backgroundColor: { default: "surface", hover: "surfaceHover", press: "backgroundPress" },
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
});

/** Past this many options the sheet offers a filter, so a list of states is typed into rather than scrolled. */
const FILTER_FROM = 12;

export type SelectProps<T extends string> = Partial<FieldControl> & {
  /** The sheet's title and the trigger's name: what is being chosen. */
  readonly label: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
  readonly placeholder?: string;
  readonly testID?: string;
};

/**
 * One of many, where the options would crowd the page: the current choice
 * as a field, and the full list in a sheet over the page. A long list can be
 * filtered by typing.
 */
export function Select<T extends string>({ label, options, value, onChange, placeholder = "Choose", testID, ...aria }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  return (
    <>
      <Trigger {...aria} aria-haspopup="dialog" aria-label={`${label}: ${current?.label ?? placeholder}`} testID={testID} onPress={() => setOpen(true)}>
        <Text variant="body" flex={1} numberOfLines={1} tone={current ? "primary" : "tertiary"}>
          {current?.label ?? placeholder}
        </Text>
        <Icon name="chevron" size={16} tone="colorSecondary" weight="bold" />
      </Trigger>
      <Sheet open={open} onClose={close} title={label}>
        <Column gap="md">
          {options.length > FILTER_FROM ? <TextInput kind="search" icon="review" label={`Filter ${label.toLowerCase()}`} placeholder="Type to filter" value={query} onChangeText={setQuery} /> : null}
          {shown.length > 0 ? (
            <ChoiceList
              label={label}
              legendHidden
              minCardWidth={420}
              options={shown}
              value={value}
              onChange={(next) => {
                onChange(next);
                close();
              }}
            />
          ) : (
            <Text variant="body" tone="secondary">
              Nothing matches “{query.trim()}”.
            </Text>
          )}
        </Column>
      </Sheet>
    </>
  );
}
