import { View, useMedia } from "@tamagui/core";
import { Icon, type IconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import type { LinkComponent } from "../shell/nav-types";

export type ContentsEntry = {
  readonly id: string;
  readonly mark: string;
  readonly title: string;
  /** What the reader can do after it, said as abilities. */
  readonly opens: string;
  /** "3 explainers", "11 authorities". */
  readonly count: string;
  readonly href: string;
  /** Set on an entry worth standing out: the law. */
  readonly feature?: { readonly icon: IconName; readonly label: string };
};

function Card({ entry, Link }: { readonly entry: ContentsEntry; readonly Link: LinkComponent }) {
  return (
    <Link href={entry.href} label={`${entry.mark === "A" ? "" : `Chapter ${entry.mark}: `}${entry.title}. ${entry.opens}`}>
      <Surface level={entry.feature ? "raised" : "base"} pad="lg" interactive accentEdge={entry.feature ? "gold" : undefined} height="100%">
        <Row gap="md" top>
          <View width={40} height={40} borderRadius="pill" backgroundColor={entry.feature ? "goldFill" : "infoFill"} alignItems="center" justifyContent="center">
            {entry.feature ? (
              <Icon name={entry.feature.icon} size={22} tone="goldInk" weight="fill" />
            ) : (
              <Text variant="title" tone="info">
                {entry.mark}
              </Text>
            )}
          </View>
          <Column flex={1} gap="xs">
            {entry.feature ? (
              <Text variant="eyebrow" tone="gold">
                {entry.feature.label}
              </Text>
            ) : null}
            <Text variant="title">{entry.title}</Text>
            <Text variant="body" tone="secondary">
              {entry.opens}
            </Text>
            <Text variant="caption" tone="tertiary">
              {entry.count}
            </Text>
          </Column>
          <Icon name="chevron" size={18} tone="colorTertiary" />
        </Row>
      </Surface>
    </Link>
  );
}

/** The Handbook's contents as cards in reading order, each a door to its chapter with what it opens up. */
export function ContentsGrid({ entries, Link }: { readonly entries: readonly ContentsEntry[]; readonly Link: LinkComponent }) {
  const media = useMedia();
  const basis = media.wide ? "31%" : media.tablet ? "47%" : "100%";
  return (
    <Row gap="md" wrap top role="list" aria-label="Chapters">
      {entries.map((entry) => (
        <View key={entry.id} role="listitem" flexBasis={basis} flexGrow={1}>
          <Card entry={entry} Link={Link} />
        </View>
      ))}
    </Row>
  );
}
