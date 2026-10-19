import { useMedia } from "@tamagui/core";
import { Icon, isIconName } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Surface } from "../primitives/Surface";
import { Text } from "../primitives/Text";
import { ChipRow } from "./Chips";
import { LawBeside } from "./LawCard";
import type { GlossaryCardView } from "./types";

function Part({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <Column gap="2xs">
      <Text variant="eyebrow" tone="secondary">
        {title}
      </Text>
      <Text variant="body">{body}</Text>
    </Column>
  );
}

function Words({ entry, hideTerm }: { readonly entry: GlossaryCardView; readonly hideTerm: boolean }) {
  return (
    <Column gap="sm" flex={1} minWidth={240}>
      {hideTerm ? null : (
        <Row gap="sm">
          <Icon name={isIconName(entry.icon) ? entry.icon : "info"} size={24} tone="gold" />
          <Text variant="title" role="heading" aria-level={3} flex={1}>
            {entry.term}
          </Text>
        </Row>
      )}
      <Text variant="body">{entry.definition}</Text>
      {entry.inGame ? <Part title="In this game" body={entry.inGame} /> : null}
      {entry.example ? <Part title="For example" body={entry.example} /> : null}
    </Column>
  );
}

/**
 * One glossary entry in full: what it is, what the game does with it, a
 * case, the law it rests on beside the definition, and the entries next to
 * it. On a wide card the law stands in its own column so the eye meets it
 * with the definition; on a phone it follows the definition directly.
 */
export function GlossaryCard({ entry, onRelated, onLaw, hideTerm = false }: { readonly entry: GlossaryCardView; readonly onRelated?: (id: string) => void; readonly onLaw: (cite: string) => void; readonly hideTerm?: boolean }) {
  const media = useMedia();
  const side = entry.law.length > 0 && !media.phone;
  return (
    <Surface level="raised" pad="lg" role="article" aria-label={entry.term}>
      <Column gap="md">
        <Row gap="lg" top wrap={!side}>
          <Words entry={entry} hideTerm={hideTerm} />
          {entry.law.length > 0 ? (
            <Column width={side ? "42%" : "100%"} maxWidth={side ? 420 : undefined}>
              <LawBeside laws={entry.law} onOpen={onLaw} />
            </Column>
          ) : null}
        </Row>
        {entry.related.length > 0 ? (
          <Column gap="xs">
            <Text variant="eyebrow" tone="secondary">
              Related terms
            </Text>
            <ChipRow items={entry.related} {...(onRelated ? { onOpen: onRelated } : {})} label={`Terms related to ${entry.term}`} />
          </Column>
        ) : null}
      </Column>
    </Surface>
  );
}
