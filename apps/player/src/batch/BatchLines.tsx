import type { ReactNode } from "react";
import { Column, Icon, Pressable, Row, Text, View } from "@admin/ui";

// The lines of a package, one per chosen subject: whether it is in, the
// choice for it when it differs from the one set for all, its own readings,
// and why it cannot go when it cannot. See selection.ts for the pattern.

export type LineChoice = { readonly id: string; readonly label: string };

export type BatchLineView = {
  readonly key: string;
  readonly title: string;
  readonly included: boolean;
  /** The choices this line can take; one chip each. Empty when the line has nothing it can do. */
  readonly choices: readonly LineChoice[];
  readonly choice?: string;
  /** This line's own readings: its price, its odds, who has to agree. */
  readonly readings?: ReactNode;
  /** Why the line can't go as set; it is left out of the package while this is said. */
  readonly blocked?: string;
};

function Check({ on, label, onPress }: { readonly on: boolean; readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable role="checkbox" aria-checked={on} aria-label={label} onPress={onPress} width={28} height={28} alignItems="center" justifyContent="center" borderRadius="control" borderWidth={2} borderColor={on ? "accent" : "borderColorStrong"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
      {on ? <Icon name="approve" size={16} tone="accentInk" weight="bold" /> : null}
    </Pressable>
  );
}

function Chips({ line, onChoice }: { readonly line: BatchLineView; readonly onChoice: (id: string) => void }) {
  if (line.choices.length < 2) return null;
  return (
    <Row gap="xs" wrap role="radiogroup" aria-label={`Choice for ${line.title}`}>
      {line.choices.map((choice) => {
        const on = choice.id === line.choice;
        return (
          <Pressable key={choice.id} role="radio" aria-checked={on} onPress={() => onChoice(choice.id)} paddingVertical="2xs" paddingHorizontal="sm" borderRadius="pill" borderWidth={1} borderColor={on ? "accent" : "borderColor"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
            <Text variant="caption" weight="strong" color={on ? "accentInk" : "color"}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

export type BatchLinesProps = {
  readonly lines: readonly BatchLineView[];
  readonly onToggle: (key: string) => void;
  readonly onChoice: (key: string, choice: string) => void;
  /** The landmark's name: what the lines are lines of. */
  readonly label: string;
};

/** Every line of the package with the same anatomy, so a price or an odds reads straight down the list. */
export function BatchLines({ lines, onToggle, onChoice, label }: BatchLinesProps) {
  return (
    <Column gap="xs" role="list" aria-label={label}>
      {lines.map((line) => (
        <View key={line.key} role="listitem" padding="sm" borderWidth={1} borderColor={line.included && !line.blocked ? "borderColorStrong" : "borderColor"} borderRadius="card" backgroundColor="surface" opacity={line.included ? 1 : 0.7}>
          <Row gap="sm" top>
            <Check on={line.included} label={line.included ? `Leave ${line.title} out` : `Put ${line.title} back in`} onPress={() => onToggle(line.key)} />
            <Column flex={1} minWidth={0} gap="xs">
              <Text variant="label">{line.title}</Text>
              {line.included ? <Chips line={line} onChoice={(id) => onChoice(line.key, id)} /> : null}
              {line.included ? line.readings : null}
              {line.included && line.blocked ? (
                <Text variant="caption" tone="warning">
                  {line.blocked}
                </Text>
              ) : null}
              {line.included ? null : (
                <Text variant="caption" tone="tertiary">
                  Left out of this package.
                </Text>
              )}
            </Column>
          </Row>
        </View>
      ))}
    </Column>
  );
}
