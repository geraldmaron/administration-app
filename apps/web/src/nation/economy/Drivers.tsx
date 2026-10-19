import type { Campaign } from "@admin/engine";
import { Bar } from "@admin/ui-web";
import { rateDriverReadings, type DriverRow } from "@admin/player-core";

const RATE_TITLES = { growth: "Growth", inflation: "Inflation", unemployment: "Unemployment" } as const;

const isZero = (row: DriverRow): boolean => !/[1-9]/.test(row.figure);

/** A table of the parts of one figure: the part, and its signed effect in the row's own unit, right-aligned. */
export function DriverTable({ title, summary, rows, unit, goodWhen, span: sharedSpan }: { readonly span?: number; readonly title: string; readonly summary: string; readonly rows: readonly DriverRow[]; readonly unit: string; readonly goodWhen?: "up" | "down" }) {
  const span = sharedSpan ?? Math.max(Number.EPSILON, ...rows.map((row) => Math.abs(row.amount)));
  return (
    <div className="eco-table-wrap">
      <table className="eco-table">
        <caption className="eco-table__caption">
          {title}
          <span className="eco-table__sub">{summary}</span>
        </caption>
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col" className="eco-table__bar">
              <span className="ui-visually-hidden">Size of the effect</span>
            </th>
            <th scope="col" className="eco-table__num">
              {unit}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source}>
              <th scope="row">{row.label}</th>
              <td className="eco-table__bar" aria-hidden="true">
                <Bar
                  label={`${row.label}: ${row.figure}`}
                  value={0.5 + Math.max(-1, Math.min(1, row.amount / span)) / 2}
                  from={0.5}
                  tone={goodWhen && !isZero(row) ? ((row.amount > 0) === (goodWhen === "up") ? "good" : "bad") : "neutral"}
                  marks={[{ at: 0.5, label: "No effect" }]}
                />
              </td>
              <td className={goodWhen && !isZero(row) ? "eco-table__num ui-valence-ink" : "eco-table__num"} data-valence={goodWhen && !isZero(row) ? ((row.amount > 0) === (goodWhen === "up") ? "good" : "bad") : undefined}>
                {goodWhen && !isZero(row) ? (row.amount > 0 ? "▲ " : "▼ ") : ""}
                {row.figure}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What moved each of the three rates, as the engine attributes it. Parts sum to where the rate is heading, not where it stands. */
export function Drivers({ campaign, rate, embedded = false }: { readonly campaign: Campaign; readonly rate?: string; readonly embedded?: boolean }) {
  const all = rateDriverReadings(campaign);
  const readings = rate ? all.filter((reading) => reading.rate === rate) : all;
  if (readings.length === 0) return null;
  const span = Math.max(0.1, ...all.flatMap((reading) => reading.rows.map((row) => Math.abs(row.amount))));
  return (
    <section className={embedded ? "economic-drivers" : "eco-panel"} aria-labelledby="economy-drivers">
      <h2 id="economy-drivers" className="eco-panel__title">
        What is moving them
      </h2>
      <p className="nation-note">Model contributions set the target; the actual rate approaches it over time. Bars share a zero-centered scale in percentage points, not recorded historical changes.</p>
      <div className="eco-grid">
        {readings.map((reading) => (
          <DriverTable key={reading.rate} title={RATE_TITLES[reading.rate]} summary={`Heading ${reading.heading}, now ${reading.now}`} rows={reading.rows} unit="Effect, pts" goodWhen={reading.rate === "growth" ? "up" : "down"} span={span} />
        ))}
      </div>
    </section>
  );
}
