import { TREND_FLAT, place, type StandingKpi, type WorldKpis, type WorldReadingId } from "@admin/player-core";
import { Column, Reading, Text } from "@admin/ui";
import { Segments, TileRow, type ReadingValence } from "@admin/ui/world";
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
  return `${parts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
    .join(", ")}.`;
}

const STANCE_VALENCE = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" } as const;

function warsTile(wars: WorldKpis["wars"]) {
  const valence: ReadingValence = wars.count === 0 ? "good" : wars.withUs > 0 ? "bad" : "watch";
  const caption =
    wars.count === 0
      ? "No wars right now. Tension may still be building."
      : `${wars.withUs > 0 ? `The United States is fighting in ${wars.withUs}.` : "The United States isn't in any."}${wars.hottest ? ` Hottest: ${wars.hottest.sides.map((side) => side.name).join(" and ")}.` : ""}`;
  const hottest = wars.hottest;
  return (
    <Column key="wars" gap="xs" flexGrow={1}>
      <Reading icon="conflict" name="Wars" value={String(wars.count)} source={wars.count === 1 ? "war" : "wars"} standing={valence} {...(hottest ? { onPress: () => go(hottest.href) } : {})} />
      <Text variant="caption" tone="secondary">
        {caption}
      </Text>
    </Column>
  );
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
      <TileRow label="The world at a glance">
        {[
          warsTile(kpis.wars),
          <Column key="views" gap="xs" flexGrow={1}>
            <Reading
              icon="subjectChamber"
              basis="estimate"
              name="Views of us"
              value={String(counts.favorable)}
              source="trust you"
              standing={standing.mean ? STANCE_VALENCE[standing.mean.stance] : "neutral"}
              onPress={() => onReading("standing")}
            />
            {<Segments keyed label="Countries by how they see the United States" parts={stanceParts(counts)} />}
            <Text variant="caption" tone="secondary">
              {standingCaption(standing)}
            </Text>
          </Column>,
          ...(treaties.inForce > 0 || treaties.awaiting > 0
            ? [
                <Column key="treaties" gap="xs" flexGrow={1}>
                  <Reading
                    icon="sign"
                    name="Treaties"
                    value={String(treaties.inForce)}
                    source="in force"
                    standing={treaties.awaiting > 0 ? "watch" : "neutral"}
                    onPress={() => onReading("alignment")}
                  />
                  <Text
                    variant="caption"
                    tone="secondary">{`${plural(treaties.alliances, "alliance")}, ${treaties.awaiting} waiting on the Senate. ${treaties.alignedGovernments} countries side with you.`}</Text>
                </Column>,
              ]
            : []),
          ...(pending.total > 0
            ? [
                <Column key="progress" gap="xs" flexGrow={1}>
                  <Reading
                    icon="pending"
                    name="In progress"
                    value={String(pending.total)}
                    source={pending.total === 1 ? "item abroad" : "items abroad"}
                    standing={pending.total > 0 ? "watch" : "good"}
                  />
                  <Text variant="caption" tone="secondary">
                    {pendingCaption(pending)}
                  </Text>
                </Column>,
              ]
            : []),
          <Column key="trade" gap="xs" flexGrow={1}>
            <Reading
              icon="subjectTrade"
              name="Trade partners"
              value={trade.topText}
              source="with our top five"
              standing={trade.measures > 0 || trade.expectedAnswers > 0 ? "watch" : "neutral"}
              onPress={() => onReading("trade")}
            />
            <Text
              variant="caption"
              tone="secondary">{`${trade.topNames.slice(0, 3).join(", ")} lead. ${plural(trade.measures, "trade action")} in force, ${plural(trade.expectedAnswers, "response")} expected.`}</Text>
          </Column>,
          <Column key="intel" gap="xs" flexGrow={1}>
            <Reading
              icon="intel"
              name="Countries we read"
              value={String(intelligence.assessed)}
              source={`of ${intelligence.total}`}
              standing={intelligence.unread > 0 ? "watch" : "good"}
              onPress={() => go(place.security())}
            />
            {
              <Segments
                keyed
                label="Countries our intelligence agencies can read"
                parts={[
                  { key: "a", count: intelligence.assessed, word: "read", valence: "info" },
                  { key: "u", count: intelligence.unread, word: "unread", valence: "neutral" },
                ]}
              />
            }
            <Text variant="caption" tone="secondary">
              {intelligence.unread > 0 ? `We can't yet tell how ${intelligence.unread} of them see you.` : "We know how every country sees you."}
            </Text>
          </Column>,
        ]}
      </TileRow>
      {quiet.length > 0 ? <Text variant="caption" tone="secondary">{`${quiet.join(" ")}`}</Text> : null}
    </>
  );
}
