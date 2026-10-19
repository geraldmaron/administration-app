import { selectDateOfTurn, selectFiscalStatement, type Campaign } from "@admin/engine";
import { fiscalBooks, fiscalOutlaySeries, fiscalPath, fiscalRevenueSeries, formatDate, formatMoney, formatRatio, type FiscalPathPoint } from "@admin/player-core";
import { Bar, Gauge, Series, SortHeader, Tag, sortRows, useSort } from "@admin/ui-web";
import type { Valence } from "../../shell/valence";
import { domainOf } from "../economy/scale";
import "./budget.css";

const OUTLOOK_WORDS = { positive: "Positive outlook", stable: "Stable outlook", negative: "Negative outlook: the next review is more likely to cut than hold" } as const;

/** Only the credit rating's own words carry the valence; the other bases are plain units. */
const outlookCell = (label: string, valence: Valence): Valence => (label === "Credit rating" ? valence : "neutral");

/** "order" is the order the books keep their lines in; it has no header, so nothing is re-sorted until a column is pressed. */
// A line's share is its amount over a fixed total, so the amount header ranks the share column too.
type LineSort = "order" | "line" | "amount";

const LINE_VALUE = {
  order: () => 0,
  line: (point: FiscalPathPoint) => point.label,
  amount: (point: FiscalPathPoint) => point.value,
} as const;

/** One year's lines by source or function: the amount a year and each line's share of the total, right-aligned. */
function Breakdown({ title, points }: { readonly title: string; readonly points: readonly FiscalPathPoint[] }) {
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;
  const [sort, onSort] = useSort<LineSort>({ key: "order", direction: "ascending" });
  const lines = sort.key === "order" ? points : sortRows(points, sort, LINE_VALUE);
  return (
    <div className="budget-table-wrap">
      <table className="budget-table">
        <caption className="budget-table__caption">
          {title}, {formatMoney(total)} a year
        </caption>
        <thead>
          <tr>
            <SortHeader label="Line" sortKey="line" sort={sort} onSort={onSort} />
            <SortHeader label="A year" sortKey="amount" sort={sort} onSort={onSort} first="descending" align="end" className="budget-table__num" />
            <th scope="col" colSpan={2} className="budget-table__num">Share</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td className="budget-table__num" data-label="A year">{point.figure}</td>
              <td className="budget-books__bar" aria-hidden="true">
                <Bar label={`${point.label}: ${formatRatio(point.value / total)}`} value={Math.max(0, point.value) / total} />
              </td>
              <td className="budget-table__num" data-label="Share">{formatRatio(point.value / total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The year's revenue and outlays, source by source. */
export function Ledger({ campaign }: { readonly campaign: Campaign }) {
  const purchases = campaign.cleanPowerPurchases ?? [];
  const payments = selectFiscalStatement(campaign).cleanPowerPaymentsRecorded;
  const unknownEarlier = purchases.some((purchase) => purchase.deliveredMwh > 0
    && (purchase.paymentTrackingStartMwh === undefined || purchase.paymentTrackingStartMwh > 0));
  return (
    <section className="budget-section" aria-labelledby="books-ledger">
      <h2 id="books-ledger" className="budget-section__title">
        Revenue and outlays
      </h2>
      <div className="budget-pair">
        <Breakdown title="Revenue" points={fiscalRevenueSeries(campaign)} />
        <Breakdown title="Outlays" points={fiscalOutlaySeries(campaign)} />
      </div>
      {purchases.length > 0 ? <p className="budget-note">
        Clean-power supplier payments recorded: ${payments.toFixed(2)} million cumulative. These payments are covered by ordinary discretionary outlays above; they are not an additional annual outlay or debt charge.
        {unknownEarlier ? " Payments before tracking began are unknown." : null}
      </p> : null}
    </section>
  );
}

/** The federal position: debt against output and where it heads, the year's balance, interest, the rating and the debt limit. */
export function Position({ campaign }: { readonly campaign: Campaign }) {
  const books = fiscalBooks(campaign);
  if (!books) return <p className="budget-note">The books for this administration are not open yet.</p>;
  const path = fiscalPath(campaign);
  const values = path.map((point) => point.value);
  const limit = books.limit;
  const limitUse = limit.ceiling > 0 ? limit.subjectToLimit / limit.ceiling : 0;
  const outlook: Valence = books.sovereign.outlook === "positive" ? "good" : books.sovereign.outlook === "negative" ? "bad" : "neutral";
  const rows: readonly (readonly [string, string, string, Valence])[] = [
    [books.balance < 0 ? "This year's deficit" : "This year's surplus", formatMoney(Math.abs(books.balance)), "A year", books.balance < 0 ? "watch" : "good"],
    ["Debt held by the public", formatRatio(books.debtToGdp), "Share of a year's output", books.debtToGdp >= 1 ? "watch" : "neutral"],
    ["Interest", formatRatio(books.interestShare), "Share of revenue", "neutral"],
    ["Credit rating", books.sovereign.notch, OUTLOOK_WORDS[books.sovereign.outlook], outlook],
  ];
  const rising = books.debtToGdpComingYear > 0;
  return (
    <section className="budget-section" aria-labelledby="books-position">
      <h2 id="books-position" className="budget-section__title">
        Federal position
      </h2>
      <div className="budget-pair">
        <div className="budget-table-wrap">
          <table className="budget-table budget-table--text">
            <caption className="ui-visually-hidden">The federal position</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" className="budget-table__num">Now</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, figure, basis, valence]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className={valence === "neutral" ? "budget-table__num" : "budget-table__num ui-valence-ink"} data-valence={valence} data-label="Now">{figure}</td>
                  <td className={label === "Credit rating" && valence !== "neutral" ? "ui-valence-ink" : undefined} data-valence={outlookCell(label, valence)} data-label="Basis">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="budget-chart">
          <Series label="Debt against a year's output, the ten-year path on current policy" values={values} domain={domainOf([...values, 1])} format={formatRatio} reference={{ value: 1, label: "Dotted line: debt equal to a year's output." }} />
          <p className="budget-note">
            <span className="ui-valence-ink" data-valence={rising ? "watch" : "good"}>
              {rising ? "▲ +" : "▼ −"}
              {(Math.abs(books.debtToGdpComingYear) * 100).toFixed(1)} pts
            </span>{" "}
            over the coming year on this path, a staff projection. New borrowing costs {formatRatio(books.sovereign.marketRate)} a year; the agencies review the rating again on {formatDate(selectDateOfTurn(campaign, books.sovereign.nextReview))}.
          </p>
        </div>
      </div>
      <div className="budget-limit">
        <Gauge shape="meter" label="The debt limit, used" value={limitUse} valueText={`${formatMoney(limit.subjectToLimit)} of ${formatMoney(limit.ceiling)}`} tone={limitUse >= 0.95 ? "bad" : limitUse >= 0.85 ? "watch" : "good"} />
        <p className="budget-note">
          {limit.binding ? <Tag tone="risk">At the ceiling</Tag> : null}{" "}
          {limit.binding
            ? `The Treasury is at its ceiling${limit.prioritizing ? ` and withholding payments; ${formatMoney(limit.arrears)} is owed on the lift` : ""}.`
            : `About ${limit.headroomWeeks} weeks of headroom at this year's pace of borrowing, the extraordinary measures included.`}
        </p>
      </div>
    </section>
  );
}

/** The historical books: the federal position, then the ledger behind it. */
export function Books({ campaign }: { readonly campaign: Campaign }) {
  return (
    <div className="budget-proposal">
      <Position campaign={campaign} />
      <Ledger campaign={campaign} />
    </div>
  );
}
