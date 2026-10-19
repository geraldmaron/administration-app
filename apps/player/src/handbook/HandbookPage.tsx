import type { ReactNode } from "react";
import { HANDBOOK_INTRO } from "@admin/player-core";
import { Column, Icon, Row, SealNotice, Surface, Text } from "@admin/ui";
import { ContentsGrid, HandbookFrame } from "@admin/ui/handbook";
import { PageBack } from "../settings/parts";
import { RouterLink } from "../shell/RouterLink";
import { chapterLinks, contentsEntries } from "./selectors";

/** Every Handbook page in its own frame: readable without an administration, with the way back to wherever the player came from. */
export function HandbookPage({ eyebrow, title, lede, current, landOn, children }: { readonly eyebrow: string; readonly title: string; readonly lede?: string; readonly current?: string; readonly landOn?: string; readonly children: ReactNode }) {
  return (
    <HandbookFrame eyebrow={eyebrow} title={title} {...(lede ? { lede } : {})} back={<PageBack />} chapters={chapterLinks()} {...(current ? { current } : {})} {...(landOn ? { landOn } : {})} Link={RouterLink}>
      {children}
    </HandbookFrame>
  );
}

/** Stated once in the Handbook, here on its front page (DECISIONS §8.10). */
function EmblemNotice() {
  return (
    <Surface level="raised" pad="md" role="note" aria-label="About the emblems">
      <Row gap="sm" top>
        <Icon name="info" size={18} tone="colorSecondary" />
        <Column flex={1} gap="2xs">
          <Text variant="label">About the emblems</Text>
          <SealNotice />
        </Column>
      </Row>
    </Surface>
  );
}

/** The front page: what the Handbook is, the chapters in order with what each opens up, and the A to Z. */
export function ContentsBody() {
  return (
    <Column gap="xl">
      <Text variant="document" maxWidth={760}>
        {HANDBOOK_INTRO}
      </Text>
      <ContentsGrid entries={contentsEntries()} Link={RouterLink} />
      <EmblemNotice />
    </Column>
  );
}
