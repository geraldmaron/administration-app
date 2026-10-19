import { useMedia } from "@tamagui/core";
import { LegalCitation } from "../context/LegalCitation";
import { Icon } from "../icons/Icon";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { CardLink } from "../primitives/CardLink";
import { PressRow } from "../primitives/PressRow";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import type { LawCardView } from "./types";

function Points({ title, icon, items, tone }: { readonly title: string; readonly icon: "approve" | "caution"; readonly items: readonly string[]; readonly tone: "successInk" | "warningInk" }) {
  if (items.length === 0) return null;
  return (
    <Column gap="xs" flex={1} minWidth={220}>
      <Row gap="xs">
        <Icon name={icon} size={16} tone={tone} weight="bold" />
        <Text variant="eyebrow" tone="secondary">
          {title}
        </Text>
      </Row>
      {items.map((item) => (
        <Row key={item} gap="sm" top>
          <Text variant="body" tone="gold" aria-hidden>
            ·
          </Text>
          <Text variant="body" flex={1}>
            {item}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

/**
 * One authority in full, as the Handbook's chapter on the law lists it: what
 * kind of law, its citation, what it is, what it lets the President do, what
 * limits it, and where to read the text. The whole card opens the shared
 * authority sheet; the source button opens the primary text.
 */
export function LawCard({ law, onOpen, onSource }: { readonly law: LawCardView; readonly onOpen: () => void; readonly onSource: () => void }) {
  const media = useMedia();
  return (
    <CardLink onPress={onOpen} label={`Open ${law.title}, ${law.cite}`} level="raised" pad={media.phone ? "md" : "lg"} accentEdge="gold">
      <Column gap="md">
        <Row gap="sm" wrap>
          <Badge status="gold" icon="law">
            {law.kindLabel}
          </Badge>
          {law.inForce ? null : <Badge status="warning">{law.lapsed ?? "No longer in effect"}</Badge>}
        </Row>
        <Column gap="xs">
          <Text variant="title" role="heading" aria-level={3}>
            {law.title}
          </Text>
          <LegalCitation citation={{ cite: law.cite, title: law.title }} compact />
        </Column>
        <Text variant="body">{law.summary}</Text>
        <Row gap="lg" wrap top>
          <Points title="What it lets you do" icon="approve" items={law.enables} tone="successInk" />
          <Points title="What limits it" icon="caution" items={law.limits} tone="warningInk" />
        </Row>
        <Row gap="sm" wrap between>
          <Text variant="caption" tone="secondary" flex={1} minWidth={200}>
            Original source: {law.sourceLabel}
          </Text>
          <Button kind="quiet" size="compact" icon="open" onPress={onSource} label={`Read the full text of ${law.title} where it was published`}>
            Read the text
          </Button>
        </Row>
      </Column>
    </CardLink>
  );
}

/**
 * The law a term rests on, set beside its definition: the citation and the
 * record's summary, the two together one door to the authority. This is where
 * "war powers" stops being a phrase and becomes 50 U.S.C. §§1541–1548.
 */
export function LawBeside({ laws, onOpen }: { readonly laws: readonly LawCardView[]; readonly onOpen: (cite: string) => void }) {
  if (laws.length === 0) return null;
  return (
    <Surface level="raised" pad="md" accentEdge="gold" role="region" aria-label="The law behind this term">
      <Column gap="sm">
        <Row gap="xs">
          <Icon name="law" size={18} tone="gold" weight="fill" />
          <Text variant="eyebrow" tone="gold">
            The law behind it
          </Text>
        </Row>
        {laws.map((law) => (
          <PressRow key={law.id} onPress={() => onOpen(law.cite)} label={`Open ${law.title}, ${law.cite}`} gap="2xs" padding="xs" borderRadius="chip" minHeight={44}>
            <LegalCitation citation={{ cite: law.cite, title: law.title }} />
            <Text variant="caption" tone="secondary">
              {law.summary}
            </Text>
          </PressRow>
        ))}
      </Column>
    </Surface>
  );
}
