import type { Campaign } from "@admin/engine";
import { selectDateOfTurn } from "@admin/engine";
import { formatDate, type RecordStart, type TrendSeries } from "@admin/player-core";
import { Sparkline } from "@admin/ui-web";
import { signValence, moveGlyph, signedPoints } from "./draw";

/** The date the record opened on, from the turn it was filed under. */
export function recordStartDate(campaign: Campaign, start: RecordStart): string {
  const since = start.since ?? campaign.turn;
  return formatDate(selectDateOfTurn(campaign, since));
}

export type CourseProps = {
  readonly campaign: Campaign;
  readonly start: RecordStart;
  readonly series: TrendSeries | undefined;
  /** What the reading is, for a screen reader: "Support among veterans". */
  readonly label: string;
  /** Whether a rise helps the President. A rise in polarization does not. */
  readonly higherIs?: "good" | "bad";
  /** A table of many rows says where the record starts once, above them, and not on every row. */
  readonly quiet?: boolean;
};

/**
 * A reading's observed course: a sparkline over the closed weeks, and the move
 * over a quarter (or a month while the record is shorter). Where the record has
 * not yet got two weeks, or did not open at the oath, it says when it starts.
 */
export function Course({ campaign, start, series, label, higherIs = "good", quiet = false }: CourseProps) {
  const values = series?.points.map((point) => point.value) ?? [];
  const change = series?.change13 ?? series?.change4;
  const span = series?.change13 !== undefined ? "13 weeks" : "4 weeks";
  const valence = change === undefined || Math.round(change * 100) === 0 ? "neutral" : higherIs === "good" ? signValence(change) : signValence(-change);
  const note = !quiet && (values.length < 2 || !start.fromOath) ? `Record starts ${recordStartDate(campaign, start)}` : undefined;
  return (
    <div className="elec-course">
      {values.length > 1 ? (
        <>
          <Sparkline values={values} valence={valence === "neutral" ? "neutral" : valence} />
          <span className="ui-visually-hidden">{label}: {values.length} weekly readings.</span>
        </>
      ) : null}
      {change !== undefined ? (
        <p className="elec-course__change ui-valence-ink" data-valence={valence}>
          <span className="elec-course__figure">{moveGlyph(change)} {signedPoints(change)}</span>
          <span className="elec-course__span"> in {span}</span>
        </p>
      ) : null}
      {note ? <p className="elec-course__note">{note}</p> : null}
    </div>
  );
}
