import { documentMarking, feedTopics, type Campaign } from "@admin/engine";
import { dispatchReading, place, sealFor, type DispatchReading } from "@admin/player-core";
import { Button, Column, DocParagraph, Document, Empty, EntityLink, Page, RelatedRail, ReleasePaper, Row, Seal, Sticky, Surface, Text, classificationKey, useMedia } from "@admin/ui";
import { ArticleView, TopicTag } from "@admin/ui/news";
import { BackButton } from "../shell/BackButton";
import { feedHref } from "./press-params";
import { SceneArt, StorySource, go } from "./story-parts";

function Tags({ reading, topics }: { readonly reading: DispatchReading; readonly topics: readonly string[] }) {
  return (
    <>
      {topics.map((topic) => (
        <TopicTag key={topic}>{topic}</TopicTag>
      ))}
      {reading.related.map((link) => (
        <EntityLink key={link.href} label={link.label} icon="flag" href={link.href} onPress={() => go(link.href)} />
      ))}
    </>
  );
}

function Journalism({ campaign, reading }: { readonly campaign: Campaign; readonly reading: DispatchReading }) {
  const { article } = reading;
  const item = campaign.feed[reading.index];
  const dateline = item?.facts?.dateline ? `${item.facts.dateline}, ${reading.when}` : reading.when;
  const outletId = article.outletId;
  return (
    <ArticleView
      masthead={<StorySource row={{ genre: "journalism", source: reading.source, ...(outletId ? { outletId } : {}) }} size="full" />}
      kicker={`${reading.genreLabel}${reading.stanceWord ? ` · ${reading.stanceWord} toward you` : ""}`}
      headline={article.headline}
      dek={article.standfirst}
      dateline={dateline}
      byline={article.byline}
      paragraphs={article.paragraphs}
      art={<SceneArt campaign={campaign} index={reading.index} />}
      {...(article.also ? { also: `${article.also.outlet} ran the same story. ${article.also.byline}` } : {})}
      {...(article.relevance ? { relevance: article.relevance } : {})}
      entities={reading.related.map((link) => ({ text: link.label, href: link.href, onOpen: () => go(link.href) }))}
      tags={<Tags reading={reading} topics={item ? feedTopics(item) : []} />}
    />
  );
}

/** A notice the administration itself issued, as the press office puts it out; why it matters to the President sits under the release, not in it. */
function Official({ reading }: { readonly reading: DispatchReading }) {
  const { article } = reading;
  return (
    <Column gap="md">
      <ReleasePaper
        seal={<Seal spec={sealFor("SEAL-WHITE-HOUSE")} size={64} label="The White House" />}
        office="Office of the Press Secretary"
        date={reading.when}
        kind={reading.genreLabel}
        headline={article.headline}
        paragraphs={[article.standfirst, ...article.paragraphs]}
      />
      {article.relevance ? <Text variant="body" tone="secondary">{article.relevance}</Text> : null}
    </Column>
  );
}

/**
 * An intelligence summary, marked as the engine marks the President's daily
 * intelligence paper: the level and caveats are the engine's, never chosen
 * here (DECISIONS §8.11).
 */
function Intelligence({ reading }: { readonly reading: DispatchReading }) {
  const { article } = reading;
  const marking = documentMarking({ family: "presidential-daily-brief" });
  return (
    <Document issuer={reading.source} kind={reading.genreLabel} title={article.headline} date={reading.when} level={classificationKey(marking.level)} {...(marking.caveats.length > 0 ? { caveat: marking.caveats.join("//") } : {})} seal={<Seal spec={sealFor("INST-ODNI")} size={72} label="Office of the Director of National Intelligence" />} footer={<Text variant="caption" tone="secondary">{marking.helper}</Text>}>
      <DocParagraph>{`For the President. ${article.standfirst}`}</DocParagraph>
      {article.paragraphs.map((paragraph, i) => (
        <DocParagraph key={i}>{paragraph}</DocParagraph>
      ))}
      {article.relevance ? <DocParagraph>{article.relevance}</DocParagraph> : null}
    </Document>
  );
}

/** The foreign governments the story's feed item names, by id, for the feed's government filter. */
function namedIn(campaign: Campaign, index: number): readonly { readonly id: string; readonly name: string }[] {
  const item = campaign.feed[index];
  const ids = [item?.actor, item?.target].filter((id): id is NonNullable<typeof id> => id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined);
  return [...new Set(ids)].map((id) => ({ id: id as string, name: campaign.nations[id]!.base.identity.name }));
}

function Related({ campaign, reading }: { readonly campaign: Campaign; readonly reading: DispatchReading }) {
  const named = namedIn(campaign, reading.index);
  return (
    <Column gap="md">
      {reading.genre === "journalism" ? (
        <Surface level="raised" pad="md" accentEdge="gold">
          <Column gap="sm">
            <Text variant="label">Respond to this story</Text>
            <Text variant="caption" tone="secondary">You can hold a press conference, explain one of your orders, or send your press secretary. Each choice is shown next to saying nothing, so you can compare.</Text>
            <Button kind="primary" size="compact" icon="microphone" onPress={() => go(`${place.pressOffice()}?view=respond`)}>Respond to the press</Button>
          </Column>
        </Surface>
      ) : null}
      <RelatedRail title="Countries in this story" items={reading.related.map((link) => ({ id: link.href, label: link.label, icon: "flag", detail: "Open its file", href: link.href, onPress: () => go(link.href) }))} />
      <RelatedRail title="Earlier stories about these countries" items={reading.earlier.slice(0, 6).map((story) => ({ id: String(story.index), label: story.headline, detail: story.when, icon: "press", href: place.dispatch(String(story.index)), onPress: () => go(place.dispatch(String(story.index))) }))} />
      <RelatedRail title="All stories about" items={named.map((nation) => ({ id: nation.id, label: nation.name, detail: "Every story that names it", icon: "record", href: feedHref({ nation: nation.id }), onPress: () => go(feedHref({ nation: nation.id })) }))} />
    </Column>
  );
}

/** One story opened whole, in the form of its kind: a news report, an official notice or an intelligence summary. */
export function Dispatch({ campaign, index }: { readonly campaign: Campaign; readonly index: number }) {
  const media = useMedia();
  const reading = dispatchReading(campaign, index);
  if (!reading) {
    return (
      <Page eyebrow="Press" icon="press" title="We couldn't find this story" lede="The link may be old, or the story may be from one of your other games." actions={<BackButton parent={place.press()} parentLabel="Coverage" />}>
        <Empty title="Nothing to show here" detail="Open a story from Coverage to read it." />
      </Page>
    );
  }
  const body = reading.genre === "official" ? <Official reading={reading} /> : reading.genre === "intelligence" ? <Intelligence reading={reading} /> : <Journalism campaign={campaign} reading={reading} />;
  return (
    <Page eyebrow={reading.source} icon="press" title={reading.genreLabel} actions={<BackButton parent={place.press()} parentLabel="Coverage" />}>
      <Row gap="xl" top wrap={!media.desktop}>
        <Column flex={1} minWidth={0}>{body}</Column>
        {media.desktop ? (
          <Sticky width={340}>
            <Related campaign={campaign} reading={reading} />
          </Sticky>
        ) : (
          <Column width="100%">
            <Related campaign={campaign} reading={reading} />
          </Column>
        )}
      </Row>
    </Page>
  );
}
