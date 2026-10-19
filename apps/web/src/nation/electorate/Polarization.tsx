import type { Campaign } from "@admin/engine";
import { Bar, Trend, type TrendProps } from "@admin/ui-web";
import { polarizationReading, type OpinionTrends, type PolarizationReading } from "@admin/player-core";
import { recordStartDate } from "./Course";
import { againstEraWords, percent, signedPercent, signedPoints, signedTenths } from "./draw";

function Cost({ reading }: { readonly reading: PolarizationReading }) {
  const { now, atEra } = reading.ownIdentifierMovement;
  const effect = Math.round(reading.headlineEffect * 1000) / 10;
  return (
    <ul className="elec-notes">
      <li className="elec-note">
        Your base is firmer, and so is the other party&rsquo;s against you. Your own party&rsquo;s identifiers move {percent(now)} as much as independents do on the same news{Math.round(now * 100) === Math.round(atEra * 100) ? "" : `, against ${percent(atEra)} at the 2020s level`}. Independents respond as they always do, so more of any swing comes from them.
      </li>
      <li className="elec-note">
        {effect === 0 ? "Against the 2020s level, this division does not change your approval." : `Against the 2020s level, this division ${effect > 0 ? "adds" : "takes"} ${Math.abs(effect).toFixed(1)} points ${effect > 0 ? "to" : "from"} your approval this week.`}
      </li>
    </ul>
  );
}

/**
 * How divided the country is, as the stock the engine holds: the 2020s level
 * every campaign opens at, this administration's drift above or below it, and
 * what that drift costs. A rise is not good or bad for approval on its own;
 * it makes the parties firmer and the record matter less to them.
 */
export function Polarization({ campaign, trends }: { readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const series = trends.polarization;
  const values = series.points.map((point) => point.value);
  const change = series.change13 ?? series.change4;
  const period = series.change13 !== undefined ? "in 13 weeks" : "in 4 weeks";
  const points = change === undefined ? 0 : Math.round(change * 100);
  const moved: TrendProps["change"] | undefined = change === undefined ? undefined : { text: signedPoints(change), direction: points > 0 ? "up" : points < 0 ? "down" : "flat", period };
  const reading = polarizationReading(campaign);
  const note = values.length < 2 || !trends.start.fromOath ? `Record starts ${recordStartDate(campaign, trends.start)}.` : undefined;
  const range = `${signedPercent(reading.driftMin)} to ${signedPercent(reading.driftMax)}`;
  return (
    <section className="elec-panel" aria-labelledby="elec-polarization">
      <h2 id="elec-polarization" className="elec-panel__title">
        Polarization
      </h2>
      <Trend label="Division against the 2020s level" figure={signedPercent(reading.againstEra)} values={values} tone="reading" {...(moved === undefined ? {} : { change: moved })} caption={note ?? againstEraWords(reading.againstEra)} />
      <div className="elec-stock">
        <Bar label={`Where this administration has taken division: ${againstEraWords(reading.againstEra)}, within a range of ${range}`} value={reading.position} mode="level" tone="neutral" marks={[{ at: reading.anchorAt, label: "2020s level" }]} />
        <p className="elec-stock__ends" aria-hidden="true">
          <span>Healed {signedPercent(reading.driftMin)}</span>
          <span className="elec-stock__era" style={{ insetInlineStart: `${reading.anchorAt * 100}%` }}>
            2020s level
          </span>
          <span>Deepened {signedPercent(reading.driftMax)}</span>
        </p>
      </div>
      <Cost reading={reading} />
      <p className="elec-note">
        Recorded increases: {signedTenths(reading.addedByUs)} from your decisions and {signedTenths(reading.addedByTheWorld)} from other events; {signedTenths(-reading.healed)} given back.
        {reading.heaviest ? ` Largest recorded increase: ${reading.heaviest.description}` : " No individual increase is recorded."} Division drifts back toward the 2020s level on its own, by half in about two years.
      </p>
    </section>
  );
}
