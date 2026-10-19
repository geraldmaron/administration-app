import { ScrollView } from "react-native";
import { View, styled, useMedia } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** Where a stage stands: done, the one in hand, one that needs attention, or ahead. */
export type StepStanding = "settled" | "current" | "blocked" | "ahead";

export type Step = { readonly id: string; readonly title: string; readonly standing: StepStanding };

const Door = styled(View, {
  name: "StepperDoor",
  role: "button",
  tabIndex: 0,
  cursor: "pointer",
  flexDirection: "row",
  alignItems: "center",
  gap: "sm",
  minHeight: "hit",
  paddingHorizontal: "xs",
  borderRadius: "control",
  outlineColor: "outlineColor",
  outlineStyle: "solid",
  outlineOffset: 2,
  outlineWidth: { default: 0, "focus-visible": 2 },
  backgroundColor: { default: "transparent", hover: "surfaceHover", press: "backgroundPress" },
});

const DOT_FILL = { settled: "goldFill", current: "accentFill", blocked: "dangerFill", ahead: "transparent" } as const;
const DOT_EDGE = { settled: "goldRule", current: "accentFill", blocked: "dangerFill", ahead: "borderColorStrong" } as const;
const DOT_INK = { settled: "goldInk", current: "inverse", blocked: "inverse", ahead: "secondary" } as const;
const STANDING_WORD: Readonly<Record<StepStanding, string>> = { settled: "done", current: "current step", blocked: "needs attention", ahead: "not yet visited" };

function Dot({ index, standing }: { readonly index: number; readonly standing: StepStanding }) {
  return (
    <View width={30} height={30} borderRadius="pill" borderWidth={2} borderColor={DOT_EDGE[standing]} backgroundColor={DOT_FILL[standing]} alignItems="center" justifyContent="center" aria-hidden>
      {standing === "settled" ? <Icon name="approve" size={16} tone="goldInk" weight="bold" /> : standing === "blocked" ? <Icon name="caution" size={16} tone="accentInk" weight="bold" /> : <Text variant="label" tone={DOT_INK[standing]} tabular>{index + 1}</Text>}
    </View>
  );
}

function Rule({ settled }: { readonly settled: boolean }) {
  return <View aria-hidden flexGrow={1} minWidth={12} height={2} backgroundColor={settled ? "goldRule" : "borderColor"} />;
}

/**
 * Numbered progress through a sequence of stages, each a door back to that
 * stage. On a phone it is the numbers alone with the current stage named
 * beneath; wider, every stage is named on the rail.
 */
export function Stepper({ label, steps, onSelect }: { readonly label: string; readonly steps: readonly Step[]; readonly onSelect: (id: string) => void }) {
  const media = useMedia();
  const compact = Boolean(media.phone);
  const at = steps.findIndex((step) => step.standing === "current");
  const current = steps[at];
  const rail = (
    <Row gap="xs" role="list" aria-label={label} flexGrow={1}>
      {steps.map((step, index) => (
        <Row key={step.id} role="listitem" gap="xs" flexGrow={index === steps.length - 1 ? 0 : 1}>
          <Door aria-label={`Step ${index + 1}, ${step.title}, ${STANDING_WORD[step.standing]}`} aria-current={step.standing === "current" ? "step" : undefined} onPress={() => onSelect(step.id)}>
            <Dot index={index} standing={step.standing} />
            {compact ? null : (
              <Text variant="label" tone={step.standing === "current" ? "primary" : "secondary"} weight={step.standing === "current" ? "strong" : "medium"} numberOfLines={1}>
                {step.title}
              </Text>
            )}
          </Door>
          {index < steps.length - 1 ? <Rule settled={step.standing === "settled"} /> : null}
        </Row>
      ))}
    </Row>
  );
  return (
    <Column gap="2xs">
      {compact ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {rail}
        </ScrollView>
      ) : (
        rail
      )}
      {compact && current ? (
        <Text variant="caption" tone="secondary">
          Step {at + 1} of {steps.length} · {current.title}
        </Text>
      ) : null}
    </Column>
  );
}
