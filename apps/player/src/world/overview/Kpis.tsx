import { TREND_FLAT, place, type StandingKpi, type WorldKpis, type WorldReadingId } from "@admin/player-core";
import { Text } from "@admin/ui";
import { Segments, Tile, TileRow, type ReadingValence } from "@admin/ui/world";
import { go } from "../parts";
import { stanceParts } from "./stance-parts";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function standingCaption({ counts, read, change4, mean }: StandingKpi): string {
  const move = change4 === undefined ? "" : change4 > TREND_FLAT ? " Warmer than 4 weeks ago." : change4 < -TREND_FLAT ? " Cooler than 4 weeks ago." : " Same as 4 weeks ago.";
  return `Average: ${mean ? mean.word.toLowerCase() : "unknown"}. ${counts.adverse} of ${read} hostile.${move}`;
}

function pendingCaption({ byKind, total }: WorldKpis["pending"]): string {
  if (total === 0) return "No operations, votes, treaties, or trade responses are waiting.";
  const parts = [
    [byKind.operation, "operation under way", "operations under way"],
    [byKind.authorization, "request waiting in Congress", "requests waiting in Congress"],
    [byKind.treaty, "treaty waiting on the Senate", "treaties waiting on the Senate"],
    [byKind.retaliation, "trade response expected", "trade responses expected"],
  ] as const;
  return `${parts.filter(([count]) => count > 0).map(([count, one, many]) => `${count} ${count === 1 ? one : many}`).join(", ")}.`;
}

const STANCE_VALENCE = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" } as const;

function warsTile(wars: WorldKpis["wars"]) {
  const valence: ReadingValence = wars.count === 0 ? "good" : wars.withUs > 0 ? "bad" : "watch";
  const caption = wars.count === 0 ? "No wars right now. Tension may still be building." : `${wars.withUs > 0 ? `The United States is fighting in ${wars.withUs}.` : "The United States isn't in any."}${wars.hottest ? ` Hottest: ${wars.hottest.sides.map((side) => side.name).join(" and ")}.` : ""}`;
  const hottest = wars.hottest;
  return <Tile icon="conflict" label="Wars" figure={String(wars.count)} unit={wars.count === 1 ? "war" : "wars"} valence={valence} caption={caption} {...(hottest ? { onPress: () => go(hottest.href) } : {})} />;
}

/**
 * The world in six readings a President scans before anything else. Each tile
 * opens the reading it summarizes: the map's color, the hottest war, or the
 * security desk for what the services read.
 */
export function Kpis({ kpis, onReading }: { readonly kpis: WorldKpis; readonly onReading: (reading: WorldReadingId) => void }) {
  const { standing, treaties, pending, trade, intelligence } = kpis;
  const counts = standing.counts;
  const quiet = [treaties.inForce === 0 && treaties.awaiting === 0 ? "No treaties are in force." : "", pending.total === 0 ? "Nothing is in progress abroad." : ""].filter(Boolean);
  return (
    <>
    <TileRow label="The world at a glance">{[
      warsTile(kpis.wars),
      <Tile
        key="views"
        icon="subjectChamber"
        label="Views of us"
        figure={String(counts.favorable)}
        unit="trust you"
        valence={standing.mean ? STANCE_VALENCE[standing.mean.stance] : "neutral"}
        reading={<Segments keyed label="Countries by how they see the United States" parts={stanceParts(counts)} />}
        caption={standingCaption(standing)}
        onPress={() => onReading("standing")}
      />,
      ...(treaties.inForce > 0 || treaties.awaiting > 0 ? [<Tile key="treaties" icon="sign" label="Treaties" figure={String(treaties.inForce)} unit="in force" valence={treaties.awaiting > 0 ? "watch" : "neutral"} caption={`${plural(treaties.alliances, "alliance")}, ${treaties.awaiting} waiting on the Senate. ${treaties.alignedGovernments} countries side with you.`} onPress={() => onReading("alignment")} />] : []),
      ...(pending.total > 0 ? [<Tile key="progress" icon="pending" label="In progress" figure={String(pending.total)} unit={pending.total === 1 ? "item abroad" : "items abroad"} valence={pending.total > 0 ? "watch" : "good"} caption={pendingCaption(pending)} />] : []),
      <Tile key="trade" icon="subjectTrade" label="Trade partners" figure={trade.topText} unit="with our top five" valence={trade.measures > 0 || trade.expectedAnswers > 0 ? "watch" : "neutral"} caption={`${trade.topNames.slice(0, 3).join(", ")} lead. ${plural(trade.measures, "trade action")} in force, ${plural(trade.expectedAnswers, "response")} expected.`} onPress={() => onReading("trade")} />,
      <Tile
        key="intel"
        icon="intel"
        label="Countries we read"
        figure={String(intelligence.assessed)}
        unit={`of ${intelligence.total}`}
        valence={intelligence.unread > 0 ? "watch" : "good"}
        reading={<Segments keyed label="Countries our intelligence agencies can read" parts={[{ key: "a", count: intelligence.assessed, word: "read", valence: "info" }, { key: "u", count: intelligence.unread, word: "unread", valence: "neutral" }]} />}
        caption={intelligence.unread > 0 ? `We can't yet tell how ${intelligence.unread} of them see you.` : "We know how every country sees you."}
        onPress={() => go(place.security())}
      />,
    ]}</TileRow>
    {quiet.length > 0 ? <Text variant="caption" tone="secondary">{`${quiet.join(" ")}`}</Text> : null}
    </>
  );
}
