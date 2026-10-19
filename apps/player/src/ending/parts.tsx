import type { LegacyMarkKind, LegacyTone } from "@admin/player-core";
import { Button, Column, Page, Row, Surface, Text, type KeyEntry } from "@admin/ui";
import { go } from "../news/story-parts";
import { Haiku } from "../title/Haiku";

export const KIND_WORD: Readonly<Record<LegacyMarkKind, string>> = { law: "Law", election: "Election", removal: "Removal", war: "War", pledge: "Pledge" };

export const MARK_STATUS: Readonly<Record<LegacyTone, "success" | "danger" | "outline">> = { favorable: "success", adverse: "danger", neutral: "outline" };

export const PARTY_INK = { democrat: "partyDem", republican: "partyRep", independent: "partyInd" } as const;

/** A page that is written only when the term ends, said honestly while it is still in session. */
export function NotYet({ eyebrow, title, body, door }: { readonly eyebrow: string; readonly title: string; readonly body: string; readonly door: { readonly label: string; readonly href: string } }) {
  return (
    <Page eyebrow={eyebrow} icon="record" title="Your presidency is still going">
      <Surface level="sunken" pad="xl">
        <Column gap="sm">
          <Text variant="title">{title}</Text>
          <Text variant="body" tone="secondary">{body}</Text>
          <Haiku id="nothing-yet" />
          <Row>
            <Button kind="secondary" icon="return" onPress={() => go(door.href)}>{door.label}</Button>
          </Row>
        </Column>
      </Surface>
    </Page>
  );
}

/** What a dot on the term line means: whether the marked decision helped, hurt, or only happened. */
export const TERM_MARK_KEY: readonly KeyEntry[] = [
  { id: "favorable", kind: "dot", label: "Went well for you", ink: "successInk" },
  { id: "adverse", kind: "dot", label: "Went badly for you", ink: "danger" },
  { id: "neutral", kind: "dot", label: "Neither", ink: "gold" },
];
