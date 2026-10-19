import { Children, type ReactNode } from "react";
import { View } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { CardGrid } from "../primitives/CardGrid";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { valenceFill, valenceText, type ReadingValence } from "./Readings";

export type PanelProps = {
  readonly title: string;
  readonly icon?: IconName;
  /** A count beside the title: how many rows the panel holds. */
  readonly count?: number;
  /** An emblem before the title: the seal of the body the panel speaks for. */
  readonly emblem?: ReactNode;
  /** Controls or a note at the head's right: a help, a citation. */
  readonly aside?: ReactNode;
  /** One sentence under the title. */
  readonly lede?: string;
  readonly children?: ReactNode;
  readonly level?: "base" | "raised" | "sunken";
  readonly edge?: "accent" | "gold" | "danger" | "warning" | "success";
  readonly testID?: string;
  /** The anchor a link that names this part of the page lands on. */
  readonly id?: string;
};

/** A region of a working screen: its heading, what it holds, then the rows. */
export function Panel({ title, icon, count, emblem, aside, lede, children, level = "base", edge, testID, id }: PanelProps) {
  return (
    <Surface level={level} pad="lg" role="region" aria-label={title} testID={testID} {...(id ? { id } : {})} {...(edge ? { accentEdge: edge } : {})}>
      <Column gap="md">
        <Row gap="sm" between wrap top>
          <Row gap="sm" flexShrink={1}>
            {emblem}
            {!emblem && icon ? <Icon name={icon} size={22} tone="gold" weight="fill" /> : null}
            <Text variant="title" role="heading" aria-level={2} flexShrink={1}>
              {title}
            </Text>
            {count !== undefined ? (
              <View paddingHorizontal="sm" borderRadius="pill" backgroundColor="pendingFill">
                <Text variant="caption" weight="strong" tone="secondary" tabular>
                  {count}
                </Text>
              </View>
            ) : null}
          </Row>
          {aside ? <Row gap="sm" wrap flexShrink={1} maxWidth="100%">{aside}</Row> : null}
        </Row>
        {lede ? (
          <Text variant="body" tone="secondary">
            {lede}
          </Text>
        ) : null}
        {children}
      </Column>
    </Surface>
  );
}

export type TileProps = {
  readonly icon: IconName;
  readonly label: string;
  readonly figure: string;
  readonly unit?: string;
  readonly valence?: ReadingValence;
  /** A drawn reading under the figure: segments, a bar. */
  readonly reading?: ReactNode;
  /** What the figure is made of, in a sentence. */
  readonly caption: string;
  /** The tile is a door to the part of the work that explains it. */
  readonly onPress?: () => void;
  /** Where the door goes, so the web build renders a real link. */
  readonly href?: string;
};

/** One headline reading a President scans first: its figure, its make-up drawn, a sentence, and the way into it. */
export function Tile({ icon, label, figure, unit, valence = "neutral", reading, caption, onPress, href }: TileProps) {
  return (
    <Pressable
      href={href}
      onPress={onPress}
      disabled={!onPress}
      role={onPress ? "link" : undefined}
      aria-label={`${label}: ${figure}${unit ? ` ${unit}` : ""}. ${caption}`}
      flexGrow={1}
      padding="md"
      borderRadius="card"
      borderWidth={1}
      borderColor="borderColor"
      backgroundColor={{ default: "surface", hover: "surfaceHover", press: "backgroundPress" }}
    >
      <Column gap="xs" flexGrow={1}>
        <Row gap="xs">
          <Icon name={icon} size={16} tone="colorSecondary" />
          <Text variant="label" tone="secondary" flex={1}>
            {label}
          </Text>
          {onPress ? <Icon name="chevron" size={14} tone="colorTertiary" /> : null}
        </Row>
        <Row gap="xs" alignItems="baseline">
          <Text variant={/^[\d$.,%+−-]/.test(figure) ? "figure" : "title"} tabular tone={valence === "neutral" ? "primary" : valenceText(valence)}>
            {figure}
          </Text>
          {unit ? (
            <Text variant="caption" tone="secondary">
              {unit}
            </Text>
          ) : null}
        </Row>
        {reading}
        <View flexGrow={1} />
        <Text variant="caption" tone="secondary">
          {caption}
        </Text>
      </Column>
    </Pressable>
  );
}

/** Headline tiles in equal columns for the width, all one height, so the last row never leaves a hole. */
export function TileRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const count = Children.count(children);
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: Math.min(count, 3), wide: Math.min(count, 6) }} role="list" aria-label={label}>
      {children}
    </CardGrid>
  );
}

/** A short state chip with its glyph, never color alone. */
export function StateChip({ valence, icon, children }: { readonly valence: ReadingValence; readonly icon?: IconName; readonly children: ReactNode }) {
  return (
    <Row gap="2xs" paddingHorizontal="sm" paddingVertical="2xs" borderRadius="pill" borderWidth={1} borderColor={valenceFill(valence)} alignSelf="flex-start">
      {icon ? <Icon name={icon} size={14} tone={valenceFill(valence)} weight="bold" /> : null}
      <Text variant="caption" weight="strong" tone={valenceText(valence)}>
        {children}
      </Text>
    </Row>
  );
}

/** An honest gap: what the services cannot read, said in words with the hidden glyph. */
export function Unread({ children }: { readonly children: ReactNode }) {
  return (
    <Row gap="xs" top>
      <Icon name="hidden" size={16} tone="colorTertiary" />
      <Text variant="label" tone="secondary" weight="regular" flex={1}>
        {children}
      </Text>
    </Row>
  );
}
