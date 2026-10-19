import { View } from "@tamagui/core";
import { Icon, type IconName, type InkRole } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type StageState = "done" | "now" | "ahead" | "ended";
export type StageView = { readonly id: string; readonly label: string; readonly state: StageState; readonly note?: string };

const LOOK: Readonly<Record<StageState, { readonly icon: IconName; readonly ink: InkRole; readonly word: string }>> = {
  done: { icon: "approve", ink: "successInk", word: "done" },
  now: { icon: "loadingOrbit", ink: "accent", word: "in progress" },
  ahead: { icon: "pending", ink: "colorTertiary", word: "not yet" },
  ended: { icon: "reject", ink: "danger", word: "stopped" },
};

/**
 * Where an act or a story stands, step by step: each stage is reached only
 * when what it names has actually happened, and says so in words.
 */
export function Stages({ label, stages, vertical }: { readonly label: string; readonly stages: readonly StageView[]; readonly vertical?: boolean }) {
  const Line = vertical ? Column : Row;
  return (
    <Line gap="sm" {...(vertical ? {} : { wrap: true })} role="list" aria-label={label}>
      {stages.map((stage, index) => {
        const look = LOOK[stage.state];
        return (
          <Row key={stage.id} gap="xs" role="listitem" aria-label={`${stage.label}: ${look.word}${stage.note ? `, ${stage.note}` : ""}`}>
            {index > 0 && !vertical ? <View width={16} height={1} backgroundColor="borderColorStrong" aria-hidden /> : null}
            <Icon name={look.icon} size={18} tone={look.ink} weight={stage.state === "ahead" ? "regular" : "fill"} />
            <Column>
              <Text variant="label" tone={stage.state === "ahead" ? "tertiary" : "primary"}>
                {stage.label}
              </Text>
              {stage.note ? (
                <Text variant="caption" tone="secondary">
                  {stage.note}
                </Text>
              ) : null}
            </Column>
          </Row>
        );
      })}
    </Line>
  );
}
