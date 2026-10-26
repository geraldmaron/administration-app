import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { coverageRows } from "@admin/player-core";
import { Button, Column, Empty, Row, Section, Surface } from "@admin/ui";
import { Wire } from "@admin/ui/news";
import { feedHref } from "../news/press-params";
import { storySummary } from "../news/story-parts";
import { go } from "../shell/navigate";

const LATEST = 4;

/** The newest stories the simulation has filed, so the desk shows what the country is reading without leaving the Brief. */
export function Dispatches({ campaign }: { readonly campaign: Campaign }) {
  const rows = useMemo(() => coverageRows(campaign), [campaign]);
  const latest = rows.slice(0, LATEST);
  return (
    <Section id="wire" icon="press" title="From the wire" helper="Stories filed since your term began, newest first.">
      <Column gap="sm">
        {latest.length === 0 ? (
          <Surface level="sunken">
            <Empty title="No stories yet" detail="No news outlet has written about you or the world yet." icon="press" />
          </Surface>
        ) : (
          <Wire label="Latest stories, newest first" stories={latest.map((row) => storySummary(row, false))} storyKey={(_, i) => String(latest[i]!.index)} />
        )}
        {rows.length > latest.length ? (
          <Row>
            <Button kind="secondary" size="compact" icon="press" iconAfter="chevron" onPress={() => go(feedHref({}))}>
              {`All stories (${rows.length.toLocaleString("en-US")})`}
            </Button>
          </Row>
        ) : null}
      </Column>
    </Section>
  );
}
