import { selectDateOfTurn, type Campaign } from "@admin/engine";
import { formatDate, type RecordStart, type TrendSeries } from "@admin/player-core";
import { Column, Row, Sparkline, Text } from "@admin/ui";
import { VALENCE_TEXT, moveGlyph, signValence, signedPoints } from "../format";

/** The date the record opened on, from the turn it was filed under. */
export function recordStartDate(campaign: Campaign, start: RecordStart): string {
  return formatDate(selectDateOfTurn(campaign, start.since ?? campaign.turn));
}

/**
 * A reading's observed course: a sparkline over the closed weeks and the move
 * over a quarter (or a month while the record is shorter). Where the record
 * has fewer than two weeks or did not open at the oath, it says when it starts.
 */
export function Course({ campaign, start, series, label, higherIs = "good", quiet = false }: { readonly campaign: Campaign; readonly start: RecordStart; readonly series: TrendSeries | undefined; readonly label: string; readonly higherIs?: "good" | "bad"; readonly quiet?: boolean }) {
  const values = series?.points.map((point) => point.value) ?? [];
  const change = series?.change13 ?? series?.change4;
  const span = series?.change13 !== undefined ? "13 weeks" : "4 weeks";
  const valence = change === undefined || Math.round(change * 100) === 0 ? "neutral" : signValence(higherIs === "good" ? change : -change);
  const note = !quiet && (values.length < 2 || !start.fromOath) ? `Tracked since ${recordStartDate(campaign, start)}` : undefined;
  return (
    <Column gap="2xs" aria-label={`${label}: ${values.length} weekly readings`}>
      <Row gap="sm">
        {values.length > 1 ? <Sparkline values={values} valence={valence} width={88} height={24} /> : null}
        {change !== undefined ? (
          <Text variant="caption" weight="strong" tone={VALENCE_TEXT[valence]}>
            {moveGlyph(change)} {signedPoints(change)}
            <Text variant="caption" tone="tertiary" weight="regular">
              {" "}
              in {span}
            </Text>
          </Text>
        ) : null}
      </Row>
      {note ? (
        <Text variant="caption" tone="tertiary">
          {note}
        </Text>
      ) : null}
    </Column>
  );
}
