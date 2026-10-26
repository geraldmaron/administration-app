import { useState } from "react";
import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Button } from "../primitives/Button";
import { PressableFrame } from "../primitives/PressableFrame";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { TextInput } from "./TextInput";

type Value = number | string;

export type InlineChoice<T extends string> = { readonly value: T; readonly label: string };

type Common<T extends Value> = {
  /** What the value is, for the edit control's name: "Defense share". */
  readonly label: string;
  readonly value: T;
  /**
   * Today's value. With it, a changed value is a draft for the President to
   * review and sign: it turns gold with today's value struck beside it.
   */
  readonly baseline?: T;
  readonly onChange: (value: T) => void;
  /** Commit at once: a view setting or a filter, never something the simulation acts on. */
  readonly immediate?: boolean;
  /** A note beside the value while it is not being edited. */
  readonly hint?: string;
  readonly testID?: string;
};

export type InlineFieldProps =
  | (Common<number> & { readonly kind?: "number"; readonly min?: number; readonly max?: number; readonly step?: number; readonly format?: (value: number) => string })
  | (Common<string> & { readonly kind: "choice"; readonly options: readonly InlineChoice<string>[] })
  | (Common<string> & { readonly kind: "text" });

function shown(props: InlineFieldProps, value: Value): string {
  if (props.kind === "choice") return props.options.find((option) => option.value === value)?.label ?? String(value);
  if (props.kind === "text") return String(value);
  return props.format ? props.format(value as number) : String(value);
}

function signedChange(props: InlineFieldProps): string | undefined {
  if (props.kind === "choice" || props.kind === "text" || props.baseline === undefined) return undefined;
  const change = props.value - props.baseline;
  if (change === 0) return undefined;
  const digits = (props.step ?? 1) < 1 ? 2 : 0;
  return `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(digits)}`;
}

/**
 * The value is the control. Read, it is the figure with a quiet underline;
 * pressed, it opens an editor in place (steppers, choices or text) and keeping
 * it makes a draft, or with `immediate` sets it. Nothing navigates away to
 * change one number.
 */
export function InlineField(props: InlineFieldProps) {
  const { label, value, baseline, immediate, hint, testID } = props;
  const [open, setOpen] = useState(false);
  // The editor holds what is typed, so "4." or an emptied field is not rejected mid-keystroke; it is parsed when kept.
  const [temp, setTemp] = useState<string>(String(value));
  const isDraft = !immediate && baseline !== undefined && value !== baseline;
  const change = signedChange(props);

  const clamp = (n: number) => {
    if (props.kind === "choice" || props.kind === "text") return n;
    return Math.min(props.max ?? Number.POSITIVE_INFINITY, Math.max(props.min ?? Number.NEGATIVE_INFINITY, n));
  };
  const numeric = props.kind === undefined || props.kind === "number";
  const parsed = numeric && temp.trim() !== "" ? Number(temp) : Number.NaN;
  const step0 = props.kind === "number" || props.kind === undefined ? props.step ?? 1 : 1;
  // The grid runs through today's value where there is one, so a value already off a round step (a budget line at 0.76 in steps of 0.05) can still be stepped.
  const base = props.kind === "number" || props.kind === undefined ? (props.baseline ?? props.min ?? 0) : 0;
  // A value off the step grid is refused rather than accepted: a caller may only understand whole steps, and a fraction it drops would silently change what is ordered.
  // The limits themselves are always allowed, even off the grid: zero or the cap may not sit on a step from today's value.
  const atLimit = (props.kind === "number" || props.kind === undefined) && (parsed === props.min || parsed === props.max);
  const offStep = numeric && !Number.isNaN(parsed) && !atLimit && Math.abs((parsed - base) / step0 - Math.round((parsed - base) / step0)) > 1e-9;
  const invalid = numeric && (Number.isNaN(parsed) || offStep);

  const begin = () => {
    setTemp(String(value));
    setOpen(true);
  };
  const keep = () => {
    if (invalid) return;
    setOpen(false);
    // The union narrows by kind; each branch hands back the type its caller gave.
    if (props.kind === "choice" || props.kind === "text") {
      if (temp !== value) props.onChange(temp);
      return;
    }
    const next = clamp(parsed);
    if (next !== value) props.onChange(next);
  };

  if (!open) {
    return (
      <Row gap="sm" wrap>
        <PressableFrame onPress={begin} aria-label={`${label}: ${shown(props, value)}. Edit`} paddingHorizontal="xs" marginHorizontal={-4} minHeight={32} justifyContent="center" testID={testID}>
          <Row gap="xs">
            <View borderBottomWidth={isDraft ? 2 : 1} borderBottomColor={isDraft ? "gold" : "borderColorStrong"}>
              <Text variant="label" weight="medium" tone={isDraft ? "gold" : "primary"} tabular>
                {shown(props, value)}
              </Text>
            </View>
            <Icon name="sign" size={14} tone="colorTertiary" />
          </Row>
        </PressableFrame>
        {isDraft && baseline !== undefined ? (
          <Text variant="caption" tone="tertiary" tabular>
            <Text variant="caption" tone="tertiary" textDecorationLine="line-through">
              {shown(props, baseline)}
            </Text>
            {change ? ` ${change}` : ""} · draft
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </Row>
    );
  }

  const step = props.kind === "number" || props.kind === undefined ? props.step ?? 1 : 1;
  const nudge = (by: number) => setTemp((current) => String(clamp(Number(((Number.isNaN(Number(current)) ? Number(value) : Number(current)) + by).toFixed(6)))));

  return (
    <Row gap="xs" wrap role="group" aria-label={`Edit ${label}`} padding="xs" borderRadius="control" borderWidth={1} borderColor="accent" backgroundColor="surfaceRaised">
      {props.kind === "choice" ? (
        props.options.map((option) => (
          <Button key={option.value} size="compact" kind={option.value === temp ? "primary" : "quiet"} onPress={() => setTemp(option.value)}>
            {option.label}
          </Button>
        ))
      ) : props.kind === "text" ? (
        <View minWidth={180}>
          <TextInput value={temp} onChangeText={setTemp} label={label} autoFocus onSubmit={keep} />
        </View>
      ) : (
        <>
          <Button size="compact" label={`Decrease ${label}`} onPress={() => nudge(-step)}>
            −
          </Button>
          <View width={96}>
            <TextInput value={temp} onChangeText={setTemp} label={label} autoFocus onSubmit={keep} invalid={invalid} aria-invalid={invalid} />
          </View>
          <Button size="compact" label={`Increase ${label}`} onPress={() => nudge(step)}>
            +
          </Button>
        </>
      )}
      {offStep ? (
        <Text variant="caption" tone="danger">
          {`Use steps of ${step0}`}
        </Text>
      ) : null}
      <Button size="compact" kind="primary" disabled={invalid} onPress={keep}>
        {immediate ? "Set" : "Draft"}
      </Button>
      <Button size="compact" kind="quiet" onPress={() => setOpen(false)}>
        Cancel
      </Button>
    </Row>
  );
}
