import { Image } from "expo-image";
import { feedSceneFacet, pressOutletById, type Campaign } from "@admin/engine";
import { COVERAGE_TONE_WORD, GENRE_LABEL, place, sealFor, type CoverageRow } from "@admin/player-core";
import { EntityLink, Masthead, Row, Seal, Text } from "@admin/ui";
import type { ArticleSummary } from "@admin/ui/news";
import { leanWords } from "./outlet-lean";
import { sceneSource } from "./scene-art";
import { sceneKeyFor, sceneLabel } from "./scene-key";
import { feedHref } from "./press-params";
import { go } from "../shell/navigate";

export { go };


/** The issuer of a paper that is not journalism: the White House for a notice, the DNI for a summary. */
const ISSUER = {
  official: { id: "SEAL-WHITE-HOUSE", name: "The White House" },
  intelligence: { id: "INST-ODNI", name: "Office of the Director of National Intelligence" },
} as const;

/** An outlet's politics in words, for its masthead; foreign outlets carry no beliefs and say nothing. */
export function outletLean(outletId: string): string | undefined {
  const outlet = pressOutletById(outletId);
  return outlet ? leanWords(outlet.beliefs) : undefined;
}

/** Who filed a story, drawn as its masthead (an outlet) or its seal and name (an issuing office). */
export function StorySource({ row, size = "compact" }: { readonly row: Pick<CoverageRow, "genre" | "outletId" | "source">; readonly size?: "compact" | "full" }) {
  if (row.genre !== "journalism") {
    const issuer = ISSUER[row.genre];
    return (
      <Row gap="sm">
        <Seal spec={sealFor(issuer.id)} size={size === "full" ? 44 : 24} />
        <Text variant="label" tone="secondary">
          {issuer.name}
        </Text>
      </Row>
    );
  }
  if (!row.outletId) {
    return (
      <Text variant="label" tone="secondary">
        {row.source}
      </Text>
    );
  }
  const lean = size === "full" ? outletLean(row.outletId) : undefined;
  return <Masthead spec={sealFor(row.outletId, row.source)} name={row.source} size={size} {...(lean ? { lean } : {})} />;
}

/** The governments a story names, each opening its file, and its topic as a door to the topic's feed. */
export function StoryTags({ row }: { readonly row: CoverageRow }) {
  return (
    <>
      {row.nations.map((nation) => (
        <EntityLink key={nation.id} label={nation.name} icon="flag" href={nation.href} onPress={() => go(nation.href)} />
      ))}
    </>
  );
}

/** A coverage row as the design system draws it. */
export function storySummary(row: CoverageRow, withTags = true): ArticleSummary {
  return {
    headline: row.headline,
    source: <StorySource row={row} />,
    when: row.when,
    topic: row.topicLabel,
    ...(row.genre === "journalism" ? {} : { kind: GENRE_LABEL[row.genre] }),
    ...(row.tone ? { lean: { word: COVERAGE_TONE_WORD[row.tone], tone: row.tone } } : {}),
    ...(withTags && row.nations.length > 0 ? { tags: <StoryTags row={row} /> } : {}),
    onOpen: () => go(place.dispatch(String(row.index))),
  };
}

/** The scene still a feed item is set over, or nothing for an index the feed does not hold. */
export function SceneArt({ campaign, index }: { readonly campaign: Campaign; readonly index: number }) {
  const item = campaign.feed[index];
  if (!item) return null;
  const facet = feedSceneFacet(item);
  const key = sceneKeyFor(facet);
  if (!key) return null;
  return <Image source={sceneSource(key)} contentFit="cover" style={{ width: "100%", height: "100%" }} accessibilityLabel={sceneLabel(facet.kind)} accessibilityIgnoresInvertColors />;
}

/** Opens the feed narrowed to one topic. */
export function topicHref(topic: CoverageRow["topic"]): string {
  return feedHref({ topic });
}
