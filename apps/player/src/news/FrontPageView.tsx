import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { dispatchReading, sealFor, type CoverageRow, type DeskRow } from "@admin/player-core";
import { Button, CardGrid, CardLink, Column, Empty, Masthead, Pressable, Row, Surface, Tag, Text, useMedia } from "@admin/ui";
import { ArticleCard, LeadStory, Wire } from "@admin/ui/news";
import { frontPage, nationsInCoverage } from "./front-page";
import { feedHref } from "./press-params";
import { SceneArt, go, storySummary, topicHref } from "./story-parts";

const STANCE_TONE = { hostile: "danger", skeptical: "warning", neutral: "outline", friendly: "success" } as const;

function Heading({ children, action }: { readonly children: string; readonly action?: { readonly label: string; readonly href: string } }) {
  return (
    <Row between gap="sm">
      <Text variant="heading" role="heading" aria-level={2}>
        {children}
      </Text>
      {action ? (
        <Button kind="quiet" size="compact" iconAfter="chevron" onPress={() => go(action.href)}>
          {action.label}
        </Button>
      ) : null}
    </Row>
  );
}

function Sections({ sections }: { readonly sections: ReturnType<typeof frontPage>["sections"] }) {
  if (sections.length === 0) return null;
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }} gap="xl">
      {sections.map((section) => (
        <Column key={section.topic} gap="sm" flexGrow={1}>
          <Heading action={{ label: "All", href: topicHref(section.topic) }}>{section.label}</Heading>
          <Wire label={`${section.label}, widest-read outlets first`} flexGrow={1} stories={section.rows.map((row) => storySummary(row))} storyKey={(_, i) => String(section.rows[i]!.index)} />
        </Column>
      ))}
    </CardGrid>
  );
}

/** The governments the press is writing about, each a door to the stories that name it, and to its file. */
function InTheNews({ rows }: { readonly rows: readonly CoverageRow[] }) {
  const named = useMemo(() => nationsInCoverage(rows).slice(0, 14), [rows]);
  if (named.length === 0) return null;
  return (
    <Column gap="sm">
      <Heading>Countries in the news</Heading>
      <Row gap="sm" wrap>
        {named.map((nation) => (
          <Pressable key={nation.id} href={feedHref({ nation: nation.id })} onPress={() => go(feedHref({ nation: nation.id }))} role="link" aria-label={`${nation.name}: ${nation.count} stories`} flexDirection="row" gap="xs" alignItems="center" paddingHorizontal="md" paddingVertical="xs" borderRadius="pill" borderWidth={1} borderColor="borderColor">
            <Text variant="label">{nation.name}</Text>
            <Text variant="caption" tone="tertiary" tabular>
              {nation.count}
            </Text>
          </Pressable>
        ))}
      </Row>
    </Column>
  );
}

function CorpsBody({ desk }: { readonly desk: DeskRow }) {
  return (
    <Column gap="xs">
      <Masthead spec={sealFor(desk.id, desk.name)} name={desk.name} size="compact" />
      <Row gap="sm" wrap>
        <Tag tone={STANCE_TONE[desk.stance]}>{desk.stanceWord}</Tag>
        <Text variant="caption" tone="secondary">
          {desk.format}
        </Text>
      </Row>
    </Column>
  );
}

/** An outlet that has filed opens its stories; one that has filed nothing has nowhere to go, so it only reads. */
function CorpsCard({ desk }: { readonly desk: DeskRow }) {
  if (desk.filed === 0) {
    return (
      <Surface pad="sm" flexGrow={1} role="group" aria-label={`${desk.name}, ${desk.stanceWord}. No stories yet`}>
        <CorpsBody desk={desk} />
      </Surface>
    );
  }
  return (
    <CardLink pad="sm" flexGrow={1} label={`${desk.name}, ${desk.stanceWord}. Open its stories`} href={feedHref({ outlet: desk.id })} onPress={() => go(feedHref({ outlet: desk.id }))}>
      <CorpsBody desk={desk} />
    </CardLink>
  );
}

/** Every masthead covering the administration, each with where it stands; a press opens its stories. */
function Corps({ desks }: { readonly desks: readonly DeskRow[] }) {
  return (
    <Column gap="sm">
      <Heading action={{ label: "All news outlets", href: "/washington/office/press?view=desks" }}>News outlets covering you</Heading>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 4 }}>
        {desks.map((desk) => <CorpsCard key={desk.id} desk={desk} />)}
      </CardGrid>
    </Column>
  );
}

function Lead({ campaign, lead, week }: { readonly campaign: Campaign; readonly lead: CoverageRow; readonly week: number | undefined }) {
  const dek = useMemo(() => dispatchReading(campaign, lead.index)?.article.standfirst, [campaign, lead.index]);
  return <LeadStory story={storySummary(lead)} art={<SceneArt campaign={campaign} index={lead.index} />} {...(dek ? { dek } : {})} eyebrow={week !== undefined && week > 0 ? `Top story · Week ${week}` : "Top story · This week"} />;
}

/** The front page: the week's lead over its still, the next stories, the week by topic, who is in the news and who is writing it. */
export function FrontPageView({ campaign, rows, desks }: { readonly campaign: Campaign; readonly rows: readonly CoverageRow[]; readonly desks: readonly DeskRow[] }) {
  const media = useMedia();
  const reach = useMemo(() => new Map(desks.map((desk) => [desk.id, desk.reachShare])), [desks]);
  const page = useMemo(() => frontPage(rows, reach), [rows, reach]);
  if (!page.lead) {
    return (
      <Surface level="sunken">
        <Empty title="No stories yet" detail="No news outlet has written about you or the world yet." icon="press" />
      </Surface>
    );
  }
  return (
    <Column gap="xl">
      <Lead campaign={campaign} lead={page.lead} week={page.week} />
      {page.top.length > 0 ? (
        <Row gap="md" wrap>
          {page.top.map((row) => (
            <ArticleCard key={row.index} story={storySummary(row, false)} {...(media.phone ? {} : { art: <SceneArt campaign={campaign} index={row.index} /> })} />
          ))}
        </Row>
      ) : null}
      <Sections sections={page.sections} />
      <InTheNews rows={rows} />
      <Corps desks={desks} />
      <Row>
        <Button kind="secondary" size="compact" icon="record" iconAfter="chevron" onPress={() => go(feedHref({}))}>
          {`All stories (${rows.length.toLocaleString("en-US")})`}
        </Button>
      </Row>
    </Column>
  );
}
