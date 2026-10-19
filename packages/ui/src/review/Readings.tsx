import { View } from "@tamagui/core";
import { Icon, type InkRole } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { axisShare, signedTick, type EffectAxis } from "./axis";
import type { EffectTone, EffectView, OutcomeView } from "./types";

export const TONE_INK: Readonly<Record<EffectTone, InkRole>> = { favorable: "successInk", neutral: "colorSecondary", caution: "warningInk", adverse: "danger" };
const VERDICT: Readonly<Record<EffectTone, string>> = { favorable: ", in your favor", adverse: ", against you", caution: ", worth watching", neutral: "" };

const pct = (share: number): `${number}%` => `${(share * 100).toFixed(2)}%` as `${number}%`;

function spoken(effect: EffectView): string {
  const range = effect.ifWell !== undefined && effect.ifBadly !== undefined ? `, ${signedTick(effect.ifWell)} if it goes well, ${signedTick(effect.ifBadly)} if badly` : "";
  return `${effect.label}: ${effect.text} likely${range}${VERDICT[effect.tone]}`;
}

/** Six steps, three each side of zero, filled out to the band the move is in. */
function BandSteps({ value, ink }: { readonly value: number; readonly ink: InkRole }) {
  return (
    <Row gap={2} flex={1} height={10}>
      {[-3, -2, -1, 1, 2, 3].map((step) => {
        const on = value < 0 ? step < 0 && step >= value : step > 0 && step <= value;
        return <View key={step} flex={1} height={10} borderRadius={2} backgroundColor={on ? ink : "borderColor"} marginLeft={step === 1 ? 4 : 0} />;
      })}
    </Row>
  );
}

/** One move as a slim bar from the zero line on the shared axis, its good-to-bad range as a hairline behind it. */
function Track({ effect, axis, ink }: { readonly effect: EffectView; readonly axis: EffectAxis; readonly ink: InkRole }) {
  const zero = axisShare(axis, 0);
  const end = axisShare(axis, effect.value);
  const ranged = effect.ifWell !== undefined && effect.ifBadly !== undefined;
  const from = ranged ? axisShare(axis, Math.min(effect.ifWell!, effect.ifBadly!)) : 0;
  const to = ranged ? axisShare(axis, Math.max(effect.ifWell!, effect.ifBadly!)) : 0;
  return (
    <View flex={1} height={12} position="relative" justifyContent="center">
      <View position="absolute" left={0} right={0} height={2} backgroundColor="borderColor" />
      {ranged ? <View position="absolute" left={pct(from)} width={pct(to - from)} height={2} backgroundColor={ink} opacity={0.45} /> : null}
      <View position="absolute" left={pct(Math.min(zero, end))} width={pct(Math.max(Math.abs(end - zero), 0.006))} height={8} borderRadius={2} backgroundColor={ink} />
      <View position="absolute" left={pct(zero)} width={1} height={12} backgroundColor="colorTertiary" />
    </View>
  );
}

export function EffectLine({ effect, axis }: { readonly effect: EffectView; readonly axis: EffectAxis }) {
  const ink = TONE_INK[effect.tone];
  return (
    <Row gap="sm" role="img" aria-label={spoken(effect)}>
      <Text variant="caption" tone="secondary" width={76} numberOfLines={1} aria-hidden>
        {effect.label}
      </Text>
      {effect.unit === "band" ? <BandSteps value={effect.value} ink={ink} /> : <Track effect={effect} axis={axis} ink={ink} />}
      <Text variant="caption" weight="strong" color={ink} width={88} textAlign="right" numberOfLines={1} aria-hidden>
        {effect.text}
      </Text>
    </Row>
  );
}

/** The axis's labeled ends, set once over the moves on the same grid as every line. */
export function AxisHead({ axis }: { readonly axis: EffectAxis }) {
  return (
    <Row gap="sm" aria-hidden>
      <Text variant="caption" tone="tertiary" width={76}>
        Likely effect
      </Text>
      <Row flex={1} between>
        {axis.ticks.map((tick) => (
          <Text key={tick.at} variant="caption" tone="tertiary">
            {tick.label}
          </Text>
        ))}
      </Row>
      <View width={88} />
    </Row>
  );
}

export function Odds({ odds }: { readonly odds: NonNullable<OutcomeView["odds"]> }) {
  const ink: InkRole = odds.share >= 0.6 ? "successInk" : odds.share >= 0.4 ? "warningInk" : "danger";
  const percent = Math.round(odds.share * 100);
  return (
    <Column gap="2xs" role="meter" aria-label={`Chance it goes well: ${percent}%, ${odds.word}${odds.confidence ? `, ${odds.confidence} confidence` : ""}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <Row gap="xs">
        <Text variant="label" weight="strong" color={ink} tabular>
          {`${percent}%`}
        </Text>
        <Text variant="caption" tone="secondary">
          {odds.word}
        </Text>
      </Row>
      <View height={6} borderRadius="pill" backgroundColor="borderColor" overflow="hidden">
        <View height={6} width={pct(odds.share)} backgroundColor={ink} />
      </View>
      {odds.confidence ? (
        <Text variant="caption" tone="tertiary">
          {`${odds.confidence} confidence`}
        </Text>
      ) : null}
    </Column>
  );
}

export function Cost({ cost }: { readonly cost: OutcomeView["cost"] }) {
  const coming = cost.figure !== undefined && cost.figure.value > 0;
  return (
    <Column gap="2xs">
      <Text variant="title" weight="strong" tabular tone={coming ? "success" : cost.figure ? "primary" : "secondary"}>
        {cost.borrowing && cost.text === "Free" ? "No money spent" : cost.text}
      </Text>
      {cost.borrowing ? (
        <Row gap="xs">
          <Icon name="budget" size={14} tone="warningInk" />
          <Text variant="caption" tone="warning">
            {`Borrowing ${cost.borrowing.text}`}
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}
