import type { ReactNode } from "react";
import { View, useMedia } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type StageState = "done" | "current" | "ahead" | "possible";

export type StageStep = {
  readonly id: string;
  readonly label: string;
  readonly state: StageState;
  /** What the record holds at this step, or the next date. */
  readonly detail?: ReactNode;
};

const GLYPH: Readonly<Record<StageState, IconName>> = { done: "approve", current: "pending", ahead: "schedule", possible: "schedule" };
const SPOKEN: Readonly<Record<StageState, string>> = { done: "completed", current: "current step", ahead: "not yet", possible: "could happen, not scheduled" };

/**
 * A process drawn as the path it travels: a bill from referral to the statute
 * book, a case from filing to final disposition. Done steps are solid, the
 * current one is gold, the rest open. Across on a wide screen, down on a phone.
 */
export function StagePath({ label, steps }: { readonly label: string; readonly steps: readonly StageStep[] }) {
  const media = useMedia();
  const across = !media.phone && steps.length <= 7;
  const Line = across ? Row : Column;
  return (
    <Line role="list" aria-label={label} gap={across ? "2xs" : "xs"} alignItems={across ? "flex-start" : "stretch"}>
      {steps.map((step, index) => {
        const current = step.state === "current";
        return (
          <View key={step.id} role="listitem" aria-current={current ? "step" : undefined} flex={across ? 1 : undefined} minWidth={0} gap="xs" flexDirection={across ? "column" : "row"} alignItems={across ? "stretch" : "flex-start"}>
            <Row gap="2xs" alignItems="center">
              <View width={26} height={26} borderRadius="pill" alignItems="center" justifyContent="center" borderWidth={2} borderColor={current ? "gold" : step.state === "done" ? "accent" : "borderColorStrong"} backgroundColor={step.state === "done" ? "accent" : current ? "goldFill" : "transparent"}>
                <Icon name={GLYPH[step.state]} size={14} weight="bold" tone={step.state === "done" ? "accentInk" : current ? "goldInk" : "colorTertiary"} />
              </View>
              {across && index < steps.length - 1 ? <View flex={1} height={2} backgroundColor={step.state === "done" ? "accent" : "borderColor"} /> : null}
            </Row>
            <Column gap="2xs" flexGrow={1} flexShrink={1} flexBasis="auto" minWidth={0} paddingRight={across ? "sm" : 0}>
              <Text variant="label" tone={step.state === "ahead" || step.state === "possible" ? "secondary" : "primary"}>
                {step.label}
                <Text variant="caption" tone="tertiary">{` · ${SPOKEN[step.state]}`}</Text>
              </Text>
              {typeof step.detail === "string" ? <Text variant="caption" tone="secondary">{step.detail}</Text> : step.detail ?? null}
            </Column>
          </View>
        );
      })}
    </Line>
  );
}
