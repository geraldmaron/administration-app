import { View } from "@tamagui/core";
import Svg, { Line, Path } from "react-native-svg";
import { Meter } from "../data/Meter";
import { Icon, isIconName, useInk } from "../icons/Icon";
import { Badge } from "../primitives/Badge";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import type { CastMemberView, ExampleView, InfluenceView, StepView, ThresholdView } from "./types";

// The drawn parts of an explanation. Each takes only its own slice and draws
// nothing when the slice is empty, so the body can list them in order
// without checking.

export function CastList({ cast }: { readonly cast: readonly CastMemberView[] }) {
  return (
    <Row gap="sm" wrap top>
      {cast.map((member) => (
        <Surface key={member.label} level="raised" pad="md" flexBasis={240} flexGrow={1} maxWidth={420}>
          <Row gap="sm" top>
            <View width={36} height={36} borderRadius="pill" backgroundColor="infoFill" alignItems="center" justifyContent="center">
              <Icon name={isIconName(member.icon) ? member.icon : "info"} size={20} tone="infoInk" />
            </View>
            <Column flex={1} gap="2xs">
              <Text variant="label">{member.label}</Text>
              <Text variant="caption" tone="secondary">
                {member.role}
              </Text>
            </Column>
          </Row>
        </Surface>
      ))}
    </Row>
  );
}

function StepNode({ index, last }: { readonly index: number; readonly last: boolean }) {
  return (
    <Column alignItems="center" width={32} alignSelf="stretch">
      <View width={28} height={28} borderRadius="pill" backgroundColor="accentFill" alignItems="center" justifyContent="center">
        <Text variant="caption" weight="strong" tone="inverse">
          {index + 1}
        </Text>
      </View>
      {last ? null : <View width={2} flex={1} minHeight={16} backgroundColor="borderColorStrong" />}
    </Column>
  );
}

function StepBody({ step }: { readonly step: StepView }) {
  return (
    <Column flex={1} gap="xs" paddingBottom="lg">
      <Row gap="sm" wrap>
        <Text variant="label">{step.label}</Text>
        {step.duration ? <Badge status="outline">{step.duration}</Badge> : null}
      </Row>
      <Text variant="body">{step.detail}</Text>
      {step.exit ? (
        <Row gap="xs" top>
          <Icon name="adverse" size={16} tone="warningInk" />
          <Text variant="caption" flex={1}>
            <Text variant="caption" weight="strong">
              It can stop here.{" "}
            </Text>
            {step.exit}
          </Text>
        </Row>
      ) : null}
      {step.youCan ? (
        <Row gap="xs" top>
          <Icon name="appoint" size={16} tone="gold" />
          <Text variant="caption" flex={1}>
            <Text variant="caption" weight="strong">
              Your move.{" "}
            </Text>
            {step.youCan}
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}

/** The process as a numbered track: each step, how long it runs, where it can end, and the President's move in it. */
export function StepTrack({ steps }: { readonly steps: readonly StepView[] }) {
  return (
    <Column role="list">
      {steps.map((step, index) => (
        <Row key={step.label} gap="md" top role="listitem">
          <StepNode index={index} last={index === steps.length - 1} />
          <StepBody step={step} />
        </Row>
      ))}
    </Column>
  );
}

/** Each count that decides it as a filled share with the line marked, the figure said beside it. */
export function ThresholdBars({ thresholds }: { readonly thresholds: readonly ThresholdView[] }) {
  return (
    <Column gap="lg">
      {thresholds.map((threshold) => {
        const at = threshold.of > 0 ? Math.min(1, Math.max(0, threshold.needed / threshold.of)) : 0;
        return (
          <Column key={threshold.label} gap="xs">
            <Meter label={threshold.label} value={at} figure={`${threshold.needed} of ${threshold.of}`} marks={[{ id: "needed", label: `${threshold.needed} needed`, at, kind: "gate" }]} />
            <Text variant="caption" tone="secondary">
              {threshold.note}
            </Text>
          </Column>
        );
      })}
    </Column>
  );
}

const VERB = { raises: "Raises it", lowers: "Lowers it", shifts: "Shifts it" } as const;
const AMOUNT = { strong: "a lot", moderate: "somewhat", weak: "a little" } as const;
const VERDICT = { helps: "Good for you.", hurts: "Bad for you." } as const;
const STROKE = { strong: 4, moderate: 2.5, weak: 1.5 } as const;

/** "Raises it a lot. Bad for you." The drawing's weight and color, said in words. */
export function influenceWords(link: InfluenceView): string {
  return `${VERB[link.direction]} ${AMOUNT[link.weight]}.${link.outcome ? ` ${VERDICT[link.outcome]}` : ""}`;
}

function Arrow({ link }: { readonly link: InfluenceView }) {
  const ink = useInk(link.outcome === "helps" ? "successInk" : link.outcome === "hurts" ? "danger" : "colorSecondary");
  const turn = link.direction === "raises" ? "M3 12 L8 4 L13 12" : link.direction === "lowers" ? "M3 4 L8 12 L13 4" : "M3 5 H13 M10 2 L13 5 L10 8 M13 11 H3 M6 8 L3 11 L6 14";
  return (
    <Row gap="2xs">
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path d={turn} fill="none" stroke={ink} strokeWidth={2} />
      </Svg>
      <Svg width={48} height={16} viewBox="0 0 48 16">
        <Line x1={2} y1={8} x2={38} y2={8} stroke={ink} strokeWidth={STROKE[link.weight]} />
        <Path d="M36 2 L46 8 L36 14 Z" fill={ink} />
      </Svg>
    </Row>
  );
}

/** What moves what: each influence as a drawn arrow between its two ends, its weight as the stroke, its meaning in words. */
export function InfluenceList({ links }: { readonly links: readonly InfluenceView[] }) {
  return (
    <Column gap="sm">
      {links.map((link) => (
        <Surface key={`${link.from}>${link.to}`} level="raised" pad="md" accentEdge={link.outcome === "helps" ? "success" : link.outcome === "hurts" ? "danger" : undefined}>
          <Column gap="xs">
            <Row gap="sm" wrap role="img" aria-label={`${link.from} to ${link.to}. ${influenceWords(link)}`}>
              <Text variant="label">{link.from}</Text>
              <Arrow link={link} />
              <Text variant="label">{link.to}</Text>
            </Row>
            <Text variant="caption">
              <Text variant="caption" weight="strong">
                {influenceWords(link)}{" "}
              </Text>
              {link.how}
            </Text>
          </Column>
        </Surface>
      ))}
    </Column>
  );
}

export function ExampleList({ examples }: { readonly examples: readonly ExampleView[] }) {
  return (
    <Column gap="sm">
      {examples.map((example) => (
        <Surface key={example.title} level="sunken" pad="md" accentEdge={example.kind === "history" ? "gold" : "accent"}>
          <Column gap="xs">
            <Text variant="label">{example.title}</Text>
            {example.lines.map((line) => (
              <Text key={line} variant="body" serif>
                {line}
              </Text>
            ))}
          </Column>
        </Surface>
      ))}
    </Column>
  );
}
