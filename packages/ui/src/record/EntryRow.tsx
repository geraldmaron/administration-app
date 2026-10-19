import { View } from "@tamagui/core";
import { Icon, type IconName, type InkRole } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** Gold is the administration's own act, blue the world's, red anything done by force, whoever did it. */
export type EntryTone = "gold" | "blue" | "red";

const RING: Readonly<Record<EntryTone, InkRole>> = { gold: "gold", blue: "infoInk", red: "danger" };

export type EntryMove = { readonly key: string; readonly label: string; readonly text: string; readonly up: boolean; readonly good?: boolean };

export type EntryRowView = {
  readonly id: string;
  readonly mark: IconName;
  readonly tone: EntryTone;
  readonly date: string;
  readonly actor: string;
  readonly place?: string;
  readonly headline: string;
  readonly moves: readonly EntryMove[];
  /** How many more readings moved than are drawn. */
  readonly more: number;
};

/** The glyph of an entry in its ring: what kind of act it was, and whose. */
export function EntryMark({ mark, tone, size = 36 }: { readonly mark: IconName; readonly tone: EntryTone; readonly size?: number }) {
  return (
    <View width={size} height={size} borderRadius="pill" borderWidth={2} borderColor={RING[tone]} alignItems="center" justifyContent="center" backgroundColor="surfaceRaised">
      <Icon name={mark} size={Math.round(size * 0.5)} tone={RING[tone]} weight="fill" />
    </View>
  );
}

/** A reading's move in words and an arrow, colored by whether it helps where that is known. */
export function MoveChip({ move }: { readonly move: EntryMove }) {
  const tone = move.good === undefined ? "secondary" : move.good ? "success" : "danger";
  return (
    <Text variant="caption" tone={tone} aria-label={`${move.label} ${move.up ? "up" : "down"} ${move.text}`}>
      {move.up ? "▲" : "▼"} {move.label} {move.text}
    </Text>
  );
}

/**
 * One Record entry on the timeline: its mark on the spine, the date and who
 * acted, what happened, and the readings it moved. The spine runs through
 * every row so a column of entries reads as one line of time.
 */
export function EntryRow({ entry, href, selected, onPress, last }: { readonly entry: EntryRowView; readonly href?: string; readonly selected?: boolean; readonly onPress: () => void; readonly last?: boolean }) {
  return (
    <Pressable href={href} onPress={onPress} role="link" aria-current={selected ? "true" : undefined} aria-label={`${entry.date}, ${entry.actor}: ${entry.headline}`} flexDirection="row" alignItems="stretch" gap="md" paddingHorizontal="sm" borderRadius="chip" backgroundColor={selected ? "surfaceHover" : { default: "transparent", hover: "surfaceHover" }} borderLeftWidth={3} borderLeftColor={selected ? "accent" : "transparent"}>
      <Column alignItems="center" width={36}>
        <View width={2} height={10} backgroundColor="borderColor" />
        <EntryMark mark={entry.mark} tone={entry.tone} />
        {last ? null : <View width={2} flex={1} minHeight={10} backgroundColor="borderColor" />}
      </Column>
      <Column flex={1} gap="2xs" paddingVertical="sm" minWidth={0}>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {entry.date} · {entry.actor}
          {entry.place ? ` · ${entry.place}` : ""}
        </Text>
        <Text variant="label" numberOfLines={3}>
          {entry.headline}
        </Text>
        {entry.moves.length > 0 ? (
          <Row gap="md" wrap>
            {entry.moves.map((move) => (
              <MoveChip key={move.key} move={move} />
            ))}
            {entry.more > 0 ? (
              <Text variant="caption" tone="tertiary">
                +{entry.more} more
              </Text>
            ) : null}
          </Row>
        ) : null}
      </Column>
    </Pressable>
  );
}
