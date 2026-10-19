import { useState } from "react";
import { View } from "@tamagui/core";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { Key } from "../data/Key";
import { useInk } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { RIDGE_HEIGHT, RIDGE_WIDTH, ridgeShapes, ridgeX } from "./geometry";
import { ridgeKeyEntries } from "./keys";
import { PARTY_INK, type Party } from "./types";

export type RidgeGroup = { readonly party: Party; readonly positions: readonly number[] };

const pct = (position: number) => `${((position + 1) / 2) * 100}%` as const;

/**
 * A chamber as a landscape: each party's members as a ridge by recorded
 * position, the President as a gold pin, the part of the scale being listed
 * shaded. A press anywhere on the ridges picks that position; the screen
 * gives a keyboard control for the same choice. The key prints under it
 * unless its frame keys it.
 */
export function PositionRidges({ label, groups, you, band, onPick, keyed = true }: { readonly label: string; readonly groups: readonly RidgeGroup[]; readonly you: number; readonly band?: { readonly from: number; readonly to: number }; readonly onPick?: (position: number) => void; readonly keyed?: boolean }) {
  const shapes = ridgeShapes(groups.map((group) => ({ id: group.party, positions: group.positions })));
  const ink = { democrat: useInk("partyDem"), independent: useInk("partyInd"), republican: useInk("partyRep") } as Record<Party, string>;
  const axis = useInk("borderColorStrong");
  const shade = useInk("gold");
  const [width, setWidth] = useState(1);
  return (
    <View gap="2xs">
      <View position="relative" height={22} aria-hidden>
        {shapes.map((shape) =>
          shape.median !== undefined ? (
            <View key={shape.id} position="absolute" top={0} left={pct(shape.median)} marginLeft={-16} width={32} alignItems="center">
              <View paddingHorizontal="xs" borderRadius="chip" backgroundColor={PARTY_INK[shape.id as Party]}>
                <Text variant="caption" weight="strong" tabular color="accentInk">
                  {shape.count}
                </Text>
              </View>
            </View>
          ) : null,
        )}
        <View position="absolute" top={0} left={pct(you)} marginLeft={-18} width={36} alignItems="center">
          <View paddingHorizontal="xs" borderRadius="chip" backgroundColor="goldFill">
            <Text variant="caption" weight="strong" tone="goldInk">
              You
            </Text>
          </View>
        </View>
      </View>
      <Pressable
        aria-label={label}
        role="img"
        tabIndex={-1}
        disabled={!onPick}
        backgroundColor={onPick ? { default: "transparent", hover: "surfaceHover", press: "backgroundPress" } : "transparent"}
        cursor={onPick ? "pointer" : "default"}
        borderRadius="chip"
        onLayout={(event: { nativeEvent: { layout: { width: number } } }) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        onPress={(event: { nativeEvent: { locationX?: number } }) => onPick?.(Math.max(-1, Math.min(1, ((event.nativeEvent.locationX ?? width / 2) / width) * 2 - 1)))}
      >
        <View width="100%" height={140}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${RIDGE_WIDTH} ${RIDGE_HEIGHT + 2}`} preserveAspectRatio="none">
            {[...shapes].sort((a, b) => b.count - a.count).map((shape) => (
              <Path key={shape.id} d={shape.path} fill="none" stroke={ink[shape.id as Party]} strokeWidth={3} />
            ))}
            {band ? <Rect x={ridgeX(band.from) - 6} width={Math.max(12, ridgeX(band.to) - ridgeX(band.from) + 12)} y={2} height={RIDGE_HEIGHT - 2} fill={shade} fillOpacity={0.14} stroke={shade} strokeWidth={2} /> : null}
            {shapes.map((shape) => (shape.median !== undefined ? <Line key={shape.id} x1={ridgeX(shape.median)} x2={ridgeX(shape.median)} y1={0} y2={RIDGE_HEIGHT} stroke={ink[shape.id as Party]} strokeWidth={3} strokeDasharray="6 4" /> : null))}
            <Line x1={ridgeX(you)} x2={ridgeX(you)} y1={0} y2={RIDGE_HEIGHT} stroke={shade} strokeWidth={5} />
            <Line x1={0} x2={RIDGE_WIDTH} y1={RIDGE_HEIGHT} y2={RIDGE_HEIGHT} stroke={axis} strokeWidth={2} />
          </Svg>
        </View>
      </Pressable>
      <Row between>
        <Text variant="caption" tone="tertiary">Left</Text>
        <Text variant="caption" tone="tertiary">Center</Text>
        <Text variant="caption" tone="tertiary">Right</Text>
      </Row>
      {keyed ? <Key entries={ridgeKeyEntries(groups.map((group) => group.party), band !== undefined)} label="What the ridges and lines mean" /> : null}
    </View>
  );
}
