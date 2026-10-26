import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Tag } from "../primitives/Tag";
import { Pressable } from "../primitives/Button";
import { CardGrid } from "../primitives/CardGrid";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";

export type StageView = { readonly key: string; readonly label: string; readonly note: string; readonly state: "done" | "now" | "ahead" };

const DOT = { done: "successInk", now: "gold", ahead: "borderColorStrong" } as const;

/** Where an act stands, issued to resolved, each step with its date or why it has none. */
export function StageTrack({ stages, label }: { readonly stages: readonly StageView[]; readonly label: string }) {
  return (
    <Row gap="xs" top role="list" aria-label={label}>
      {stages.map((stage, i) => (
        <Column key={stage.key} flex={1} gap="2xs" role="listitem" aria-label={`${stage.label}: ${stage.state === "now" ? "now" : stage.state === "done" ? "done" : "not yet"}, ${stage.note}`}>
          <Row gap="2xs">
            <View width={14} height={14} borderRadius="pill" backgroundColor={DOT[stage.state]} borderWidth={stage.state === "now" ? 3 : 0} borderColor="goldRule" />
            {i < stages.length - 1 ? <View flex={1} height={2} backgroundColor={stage.state === "ahead" ? "borderColor" : "successInk"} /> : null}
          </Row>
          <Text variant="label" tone={stage.state === "ahead" ? "tertiary" : "primary"}>
            {stage.label}
          </Text>
          <Text variant="caption" tone="secondary">
            {stage.note}
          </Text>
        </Column>
      ))}
    </Row>
  );
}

export type MoveView = { readonly key: string; readonly label: string; readonly before: string; readonly after: string; readonly change: string; readonly up: boolean; readonly good?: boolean };

/** Each reading an act moved, from where it stood before to where it stood after. */
export function MoveTable({ moves, none }: { readonly moves: readonly MoveView[]; readonly none: string }) {
  if (moves.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        {none}
      </Text>
    );
  }
  return (
    <Column gap="xs" role="table" aria-label="Numbers before and after">
      {moves.map((move) => (
        <Row key={move.key} gap="md" wrap role="row" paddingVertical="xs" borderBottomWidth={1} borderBottomColor="borderColor">
          <Text variant="label" flex={1} minWidth={140}>
            {move.label}
          </Text>
          <Text variant="body" tabular tone="secondary">
            {move.before}
          </Text>
          <Icon name="chevron" size={14} tone="colorTertiary" />
          <Text variant="body" tabular weight="strong">
            {move.after}
          </Text>
          <Text variant="label" tabular tone={move.good === undefined ? "secondary" : move.good ? "success" : "danger"} minWidth={110} textAlign="right">
            {move.up ? "▲" : "▼"} {move.change}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

export type ChainLink = { readonly href?: string; readonly id: string; readonly label: string; readonly date: string };

function Branch({ title, links, none, onOpen }: { readonly title: string; readonly links: readonly ChainLink[]; readonly none: string; readonly onOpen: (id: string) => void }) {
  return (
    <Column gap="xs" flex={1} minWidth={220}>
      <Row gap="xs">
        <Text variant="eyebrow" tone="secondary">
          {title}
        </Text>
        {links.length > 0 ? <Tag tone="outline">{String(links.length)}</Tag> : null}
      </Row>
      {links.length === 0 ? (
        <Text variant="caption" tone="tertiary">
          {none}
        </Text>
      ) : (
        links.map((link) => (
          <Pressable href={link.href} key={link.id} onPress={() => onOpen(link.id)} role="link" aria-label={`${link.label}, ${link.date}`} padding="xs" gap="2xs" borderWidth={1} borderColor="borderColor" borderRadius="chip">
            <Text variant="label" numberOfLines={2}>
              {link.label}
            </Text>
            <Text variant="caption" tone="tertiary">
              {link.date}
            </Text>
          </Pressable>
        ))
      )}
    </Column>
  );
}

/** The recorded chain around one entry: what it answered to, the entry itself, and what followed. */
export function CausalChain({ causes, current, consequences, onOpen }: { readonly causes: readonly ChainLink[]; readonly current: ChainLink; readonly consequences: readonly ChainLink[]; readonly onOpen: (id: string) => void }) {
  return (
    <Row gap="md" top wrap role="group" aria-label="What led to this and what came after">
      <Branch title="What led to this" links={causes} none="Nothing earlier is linked to this." onOpen={onOpen} />
      <Surface level="raised" pad="sm" accentEdge="gold" flex={1} minWidth={200}>
        <Column gap="2xs">
          <Text variant="eyebrow" tone="gold">
            This entry
          </Text>
          <Text variant="label">{current.label}</Text>
          <Text variant="caption" tone="secondary">
            {current.date}
          </Text>
        </Column>
      </Surface>
      <Branch title="What came after" links={consequences} none="Nothing yet. Some results take a while, and they'll show up here when they happen." onOpen={onOpen} />
    </Row>
  );
}

/** A labeled figure among several, for counts and facts set in a grid: the name a step below its value. */
export function Fact({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <Column gap="2xs" flexGrow={1} flexBasis={150} minWidth={130}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text variant="label" tabular>
          {value}
        </Text>
      ) : (
        value
      )}
    </Column>
  );
}

/** Facts a matter is read by, in equal columns for the width. */
export function FactGrid({ items }: { readonly items: readonly { readonly label: string; readonly value: ReactNode }[] }) {
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 4 }}>
      {items.map((item) => (
        <Fact key={item.label} label={item.label} value={item.value} />
      ))}
    </CardGrid>
  );
}
