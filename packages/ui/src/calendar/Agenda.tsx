import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { LegalCitation } from "../context/LegalCitation";
import { Tag } from "../primitives/Tag";
import { PressRow } from "../primitives/PressRow";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { AgendaDayView, DatedRow, Urgency } from "./types";

const URGENCY: Record<Urgency, { status: "danger" | "warning" | "pending"; word: string }> = {
  hard: { status: "danger", word: "Stops time" },
  soft: { status: "warning", word: "Needs you" },
  ambient: { status: "pending", word: "On the calendar" },
};

function AgendaBody({ row }: { readonly row: DatedRow }) {
  return (
    <>
      <Row gap="md" top>
        <Icon name={row.icon} size={22} tone={row.urgency === "hard" ? "danger" : row.urgency === "soft" ? "warningInk" : "colorSecondary"} />
        <Column flex={1} gap="2xs" minWidth={0}>
          <Row gap="sm" wrap>
            <Text variant="eyebrow" tone="secondary">
              {row.kindLabel}
            </Text>
            <Tag tone={URGENCY[row.urgency].status}>{URGENCY[row.urgency].word}</Tag>
          </Row>
          <Text variant="label">{row.title}</Text>
          {row.detail ? (
            <Text variant="caption" tone="secondary">
              {row.detail}
            </Text>
          ) : null}
          {row.refs}
          {row.lapse ? (
            <Text variant="caption" tone="warning">
              If nothing is done: {row.lapse}
            </Text>
          ) : null}
        </Column>
        {row.onPress ? <Icon name="chevron" size={16} tone="colorTertiary" /> : null}
      </Row>
      {row.cite ? (
        <View paddingLeft={34}>
          <LegalCitation citation={{ cite: row.cite, title: "The law that sets this date" }} onPress={row.onCite} compact />
        </View>
      ) : null}
    </>
  );
}

/** One dated matter: when it opens its matter, the whole row is the door, and the law chip inside still opens the law. */
function AgendaRow({ row }: { readonly row: DatedRow }) {
  const frame = { gap: "xs", padding: "md", borderTopWidth: 1, borderTopColor: "borderColor" } as const;
  if (!row.onPress) {
    return (
      <Column {...frame}>
        <AgendaBody row={row} />
      </Column>
    );
  }
  return (
    <PressRow onPress={row.onPress} label={`${row.kindLabel}: ${row.title}`} {...frame} outlineOffset={-2}>
      <AgendaBody row={row} />
    </PressRow>
  );
}

/** Dated matters grouped under their day, each with what lapses and the law that sets the date. */
export function Agenda({ days, empty }: { readonly days: readonly AgendaDayView[]; readonly empty: string }) {
  if (days.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    );
  }
  return (
    <Column gap="md">
      {days.map((day) => (
        <View key={day.key} borderWidth={1} borderColor="borderColor" borderRadius="card" overflow="hidden" backgroundColor="surface">
          <Row between paddingHorizontal="md" paddingVertical="sm" backgroundColor="surfaceRaised">
            <Text variant="label" weight="strong">
              {day.label}
            </Text>
            <Text variant="caption" tone="secondary">
              {day.relative}
            </Text>
          </Row>
          {day.rows.map((row) => (
            <AgendaRow key={row.id} row={row} />
          ))}
        </View>
      ))}
    </Column>
  );
}
