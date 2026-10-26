import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { fitOf, useMeasuredWidth } from "../layout/Fit";
import { Pressable } from "../primitives/Pressable";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { DeltaText, type Delta, type Tone } from "./Delta";

/** Whether a figure was seen, worked out, or projected. An estimate or forecast never looks like a fact. */
export type Basis = "observed" | "estimate" | "forecast";

const BASIS_WORD: Readonly<Record<Basis, string>> = { observed: "Observed", estimate: "Estimate", forecast: "Forecast" };

/** Under 200px a reading is a compact stack; from 340px its history sits beside the figure. */
const READING_BREAKS = { regular: 200, wide: 340 } as const;

export type ReadingProps = {
  readonly name: string;
  /** The figure, already formatted with its unit: "48%", "$1.9T". */
  readonly value: string;
  readonly delta?: Delta;
  /** What the change is measured against: "since you took office". */
  readonly period?: string;
  readonly basis?: Basis;
  /** Where the figure comes from, said in small type. */
  readonly source?: string;
  readonly icon?: IconName;
  /** The drawn history: a sparkline or a meter, shown when the reading has room. */
  readonly history?: ReactNode;
  /** The reading's standing against its benchmark, as a short rule under the figure. */
  readonly standing?: Tone;
  readonly size?: "figure" | "heading" | "title";
  /** The narrowest the reading may get before a wrapping row drops it to the next line; a grid that owns its columns passes 0. */
  readonly minWidth?: number;
  /** The word for `standing` ("Low", "Watch"); it is drawn and spoken with the rule, so the rule's color is never the only cue. */
  readonly standingWord?: string;
  /** The reading is a door to what moves it: give its address so it is a real link, and `onPress` for in-app navigation. */
  readonly href?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
};

const STANDING_INK = { good: "successInk", watch: "warningInk", bad: "danger", neutral: "colorTertiary" } as const;
const STANDING_TONE = { good: "success", watch: "warning", bad: "danger", neutral: "tertiary" } as const;
const STANDING_WORD = { good: "Good", watch: "Watch", bad: "Low", neutral: "" } as const;

function Standing({ standing, word }: { readonly standing: Tone; readonly word: string }) {
  return (
    <Row gap="xs">
      <View height={3} width={24} borderRadius="pill" backgroundColor={STANDING_INK[standing]} aria-hidden />
      <Text variant="caption" weight="strong" tone={STANDING_TONE[standing]}>
        {word}
      </Text>
    </Row>
  );
}

function Note({ basis, period, source, delta }: Pick<ReadingProps, "basis" | "period" | "source" | "delta">) {
  const words = [basis && basis !== "observed" ? BASIS_WORD[basis] : undefined, delta ? undefined : period, source].filter(Boolean).join(" · ");
  if (!words) return null;
  return (
    <Text variant="caption" tone="tertiary" numberOfLines={2}>
      {words}
    </Text>
  );
}

/**
 * One reading: its name, its figure, how it moved and against what, whether it
 * was observed, estimated or forecast, and where it comes from. Its shape
 * follows the room it is given: a row, a tile, or a tile with its history
 * beside the figure. Every shape keeps the figure, the change and the basis.
 */
export function Reading({ name, value, delta, period, basis = "observed", source, icon, history, standing, standingWord, size = "figure", minWidth = 140, href, onPress, testID }: ReadingProps) {
  const [width, onLayout] = useMeasuredWidth();
  const shape = fitOf(width, READING_BREAKS);
  const word = standing && standing !== "neutral" ? standingWord ?? STANDING_WORD[standing] : undefined;
  const spoken = `${name}: ${value}${basis === "observed" ? "" : `, ${BASIS_WORD[basis].toLowerCase()}`}${word ? `, ${word.toLowerCase()}` : ""}`;
  const figureTone = basis === "observed" ? "primary" : "secondary";
  const label = (
    <Row gap="xs" flexShrink={1} minWidth={0}>
      {icon ? <Icon name={icon} size={16} tone="colorSecondary" /> : null}
      <Text variant="label" tone="secondary" numberOfLines={2} flexShrink={1}>
        {name}
      </Text>
    </Row>
  );
  const body =
    shape === "compact" ? (
      // A narrow tile stacks: a one-line row would cut the name short wherever four readings share a line.
      <Column gap="2xs">
        {label}
        <Text variant="title" tone={figureTone} tabular>
          {value}
        </Text>
        {delta ? <DeltaText delta={delta} {...(period ? { period } : {})} /> : null}
        {word && standing ? <Standing standing={standing} word={word} /> : null}
        <Note basis={basis} period={period} source={source} delta={delta} />
      </Column>
    ) : (
      <Column gap="xs">
        {label}
        <Row gap="md" between bottom>
          <Text variant={size} tone={figureTone} tabular>
            {value}
          </Text>
          {shape === "wide" && history ? (
            <View flex={1} minWidth={0} paddingBottom="xs">
              {history}
            </View>
          ) : null}
        </Row>
        {delta ? <DeltaText delta={delta} {...(period ? { period } : {})} /> : null}
        {word && standing ? <Standing standing={standing} word={word} /> : null}
        <Note basis={basis} period={period} source={source} delta={delta} />
      </Column>
    );
  // Grow into a wrapping row, but keep the content's height in a column: a zero flex basis collapses it there.
  const frame = {
    onLayout,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto" as const,
    minWidth,
    padding: shape === "compact" ? ("md" as const) : ("lg" as const),
    borderRadius: "control" as const,
    testID,
  };
  if (onPress || href) {
    return (
      <Pressable {...frame} backgroundColor={{ default: "surfaceRaised", hover: "surfaceHover", press: "backgroundPress" }} aria-label={spoken} {...(href ? { href } : {})} {...(onPress ? { onPress } : {})}>
        {body}
      </Pressable>
    );
  }
  return (
    <View {...frame} backgroundColor="surfaceRaised" role="group" aria-label={spoken}>
      {body}
    </View>
  );
}
