import { useId } from "react";
import { View, styled } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Column } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Legend } from "./Field";
import { useRoving } from "./roving";

export type SegmentOption<T extends string> = { readonly value: T; readonly label: string; readonly icon?: IconName };

const Track = styled(View, {
  name: "SegmentedTrack",
  flexDirection: "row",
  padding: "2xs",
  gap: "2xs",
  borderRadius: "control",
  borderWidth: 1,
  borderColor: "borderColorStrong",
  backgroundColor: "backgroundStrong",
  alignSelf: "flex-start",
  maxWidth: "100%",
  // A phrase never loses its tail to an ellipsis: segments drop to the next line when the bar is too narrow for them.
  flexWrap: "wrap",
});

const Segment = styled(View, {
  name: "Segment",
  role: "radio",
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "xs",
  flexShrink: 0,
  minHeight: "compact",
  paddingHorizontal: "md",
  borderRadius: "chip",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 1,
  outlineWidth: { default: 0, "focus-visible": 2 },
  variants: {
    selected: {
      true: { backgroundColor: "accentFill" },
      false: { backgroundColor: { default: "transparent", hover: "surfaceHover", press: "backgroundPress" } },
    },
  } as const,
});

/**
 * A short, exclusive choice laid out as one bar: two to four words that are
 * read together; at a narrow width the segments wrap onto further lines
 * rather than shorten their words. A radio group to assistive technology, with the arrows
 * moving the choice; longer options belong in a ChoiceList.
 */
export function Segmented<T extends string>({ label, help, options, value, onChange, fill }: { readonly label: string; readonly help?: string; readonly options: readonly SegmentOption<T>[]; readonly value: T | undefined; readonly onChange: (value: T) => void; readonly fill?: boolean }) {
  const legend = useId();
  const roving = useRoving(options.map((option) => option.value), value, onChange);
  return (
    <Column gap="xs" maxWidth="100%">
      <Legend id={legend} label={label} help={help} />
      <Track role="radiogroup" aria-labelledby={legend} {...(fill ? { alignSelf: "stretch" as const } : {})}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Segment
              key={option.value}
              ref={roving.refFor(index)}
              selected={selected}
              aria-checked={selected}
              tabIndex={roving.tabIndexFor(index)}
              onKeyDown={roving.keyDownFor(index)}
              onPress={() => onChange(option.value)}
              {...(fill ? { flexGrow: 1 } : {})}
            >
              {option.icon ? <Icon name={option.icon} size={16} tone={selected ? "accentInk" : "colorSecondary"} weight={selected ? "fill" : "regular"} /> : null}
              <Text variant="label" tone={selected ? "inverse" : "primary"}>
                {option.label}
              </Text>
            </Segment>
          );
        })}
      </Track>
    </Column>
  );
}
