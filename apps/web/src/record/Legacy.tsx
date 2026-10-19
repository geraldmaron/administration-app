import type { Campaign } from "@admin/engine";
import { legacyReading, place, type LegacyMark, type LegacyPoint, type LegacyReading } from "@admin/player-core";
import { Bar, Collection, EmptyState, Gauge, Series, Tabs, Tag, type TabSpec } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";
import { KIND_WORD } from "./legacy-words";
import type { LegacySearch, LegacyView } from "./legacy-search";
import { legacyDomain, legacyPosition } from "./legacy-scale";
import "./record.css";

const WIDTH = 100;
const PAD = 4;

/** Every row is in percent (approval and the labor and price rates arrive as points), so one formatter says them all. */
type Baseline = { readonly label: string; readonly start: number; readonly end: number; readonly higherIsBetter: boolean | undefined; readonly domain: readonly [number, number] };

const percent = (value: number): string => `${Number(value.toFixed(1))}%`;

function changeWords(row: Baseline): { readonly text: string; readonly tone: "good" | "risk" | "neutral" } {
  const delta = row.end - row.start;
  if (Math.abs(delta) < 0.05) return { text: "No change", tone: "neutral" };
  const better = row.higherIsBetter === undefined ? undefined : delta > 0 === row.higherIsBetter;
  return { text: `${delta > 0 ? "▲ Up" : "▼ Down"} ${Number(Math.abs(delta).toFixed(1))} points`, tone: better === undefined ? "neutral" : better ? "good" : "risk" };
}

/** A rate's own track runs to a little past its larger end, so a 4% move reads as a move; approval and division run the full 0 to 100. */
function span(label: string, points: readonly LegacyPoint[], higherIsBetter: boolean | undefined, full: boolean): Baseline | undefined {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return undefined;
  return { label, start: first.value, end: last.value, higherIsBetter, domain: legacyDomain([first.value, last.value], full) };
}

/** What the country stood at on the day of the oath beside what it stood at on the last day the record reaches. */
function Comparison({ legacy }: { readonly legacy: LegacyReading }) {
  const rows: readonly Baseline[] = [
    span("Approval", legacy.approval, true, true),
    span("Unemployment", legacy.unemployment, false, false),
    span("Inflation", legacy.inflation, undefined, false),
  ].filter((row): row is Baseline => row !== undefined);
  return (
    <section aria-labelledby="legacy-country" className="rec-section">
      <h2 id="legacy-country" className="rec-section__title">Inherited baseline and end state</h2>
      <p className="rec-note">{legacy.countryLine}</p>
      <ul className="shift" aria-label="Readings at the oath and on the last day">
        <li className="shift__row shift__row--head" aria-hidden="true">
          <span>Reading</span>
          <span />
          <span className="shift__figures">At the oath → At the end</span>
          <span>Change</span>
        </li>
        {rows.map((row) => {
          const change = changeWords(row);
          const valence = change.tone === "good" ? "good" : change.tone === "risk" ? "bad" : "neutral";
          const unit = (value: number) => legacyPosition(value, row.domain);
          const from = unit(row.start);
          const to = unit(row.end);
          return (
            <li key={row.label} className="shift__row">
              <span className="shift__label">{row.label}</span>
              <Bar value={to} from={from} mode="shift" tone={valence} slim marks={[{ at: legacyPosition(0, row.domain), label: "Zero" }]} label={`${row.label}: ${percent(row.start)} to ${percent(row.end)} on a ${percent(row.domain[0])} to ${percent(row.domain[1])} scale`} />
              <span className="shift__figures">
                <span className="shift__num">{percent(row.start)}</span>
                <span aria-hidden="true">→</span>
                <span className="shift__num shift__num--end">{percent(row.end)}</span>
              </span>
              <Tag tone={change.tone}>{change.text}</Tag>
            </li>
          );
        })}
      </ul>
      {[legacy.approval, legacy.unemployment, legacy.inflation].map((points, index) => {
        if (points.length < 2) return null;
        const label = ["Approval", "Unemployment", "Inflation"][index]!;
        const values = points.map((point) => point.value);
        return <Series key={label} label={`${label}, week by week`} values={values} domain={legacyDomain(values, label === "Approval")} showDomain unitLabel={label === "Inflation" ? "Percent; negative inflation represents falling prices" : "Percent"} format={percent} />;
      })}
      <p className="rec-note">The table and arcs show what the readings did during the term. They do not say what caused each change; the Record traces causes entry by entry.</p>
    </section>
  );
}

/** Every mark at its day from the oath on one line; the list beneath names each, and carries the tone in words. */
function TermLine({ legacy }: { readonly legacy: LegacyReading }) {
  return (
    <figure className="rec-termline">
      <svg viewBox={`0 0 ${WIDTH} 14`} className="rec-termline__plot" role="img" aria-label={`${legacy.marks.length} marks across ${legacy.from} to ${legacy.to}; the list below names each.`}>
        <line className="rec-landscape__axis" x1={PAD} y1={9} x2={WIDTH - PAD} y2={9} />
        {legacy.marks.map((mark) => (
          <circle key={mark.key} className="rec-landscape__dot" data-tone={mark.tone} cx={(PAD + (mark.at / Math.max(1, legacy.span)) * (WIDTH - PAD * 2)).toFixed(2)} cy={9} r={1.1}>
            <title>{`${mark.date}: ${mark.label}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="rec-termline__ends">
        <span>{legacy.from}</span>
        <span>{legacy.to}</span>
      </figcaption>
    </figure>
  );
}

function MarkItem({ mark }: { readonly mark: LegacyMark }) {
  return (
    <li className="rec-item" data-tone={mark.tone}>
      <p className="rec-item__title">{mark.label}</p>
      <p className="rec-when">
        <Tag tone={mark.tone === "adverse" ? "risk" : mark.tone === "favorable" ? "good" : "neutral"}>{KIND_WORD[mark.kind]}</Tag> <time>{mark.date}</time>
      </p>
    </li>
  );
}

function Timeline({ legacy }: { readonly legacy: LegacyReading }) {
  return (
    <section aria-labelledby="legacy-timeline" className="rec-section">
      <h2 id="legacy-timeline" className="rec-section__title">Timeline of decisions</h2>
      <TermLine legacy={legacy} />
      <Collection items={legacy.marks} initial={12} noun="marks on the term, in order" as="ol" className="rec-items" empty="Nothing marks the term." render={(mark) => <MarkItem key={mark.key} mark={mark} />} />
    </section>
  );
}

function Commitments({ legacy }: { readonly legacy: LegacyReading }) {
  const { kept, broken, open } = legacy.promises;
  const total = kept + broken + open;
  const { unauthorizedForce, struckDownOrders, overriddenVetoes, removalSteps } = legacy.record;
  const counts: readonly (readonly [string, number])[] = [
    ["Force used without Congress", unauthorizedForce],
    ["Orders struck down", struckDownOrders],
    ["Vetoes overridden", overriddenVetoes],
    ["Steps toward removal", removalSteps],
  ];
  return (
    <div className="rec-stack">
      <section aria-labelledby="legacy-laws" className="rec-section">
        <h2 id="legacy-laws" className="rec-section__title">Statutes</h2>
        <p className="rec-note">{legacy.laws.line}</p>
        <Collection items={legacy.laws.titles} initial={8} noun="laws" className="rec-items" render={(title) => <li key={title} className="rec-item">{title}</li>} />
      </section>
      <section aria-labelledby="legacy-promises" className="rec-section">
        <h2 id="legacy-promises" className="rec-section__title">Promises</h2>
        <p className="rec-note">{legacy.promises.line}</p>
        {total > 0 ? <Gauge shape="meter" label="Promises kept" value={kept / total} valueText={`${kept} of ${total}`} tone="identity" /> : null}
      </section>
      <section aria-labelledby="legacy-wars" className="rec-section">
        <h2 id="legacy-wars" className="rec-section__title">Wars</h2>
        {legacy.wars.list.length === 0 ? <p className="rec-note">{legacy.wars.line}</p> : null}
        <Collection
          items={legacy.wars.list}
          initial={6}
          noun="wars"
          className="rec-items"
          render={(war) => (
            <li key={war.key} className="rec-item" data-tone={war.tone}>
              <p className="rec-item__title">{war.name}</p>
              <p className="rec-when">{war.outcome}</p>
            </li>
          )}
        />
      </section>
      <section aria-labelledby="legacy-record" className="rec-section">
        <h2 id="legacy-record" className="rec-section__title">What the record holds</h2>
        <ul className="tally">
          {counts.map(([label, count]) => (
            <li key={label} className="tally__item" data-zero={count === 0 ? "true" : undefined}>
              <span className="tally__num">{count}</span>
              <span className="tally__label">{label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const TABS: readonly (TabSpec & { readonly id: LegacyView })[] = [
  { id: "comparison", label: "Baseline and end state" },
  { id: "timeline", label: "Timeline" },
  { id: "record", label: "Statutes, promises and wars" },
];

/** What the administration leaves: the country against what it inherited, the term as a line of decisions, and the commitments and counts a history would print. */
export function Legacy({ campaign, search, onView }: { readonly campaign: Campaign; readonly search: LegacySearch; readonly onView: (view: LegacyView) => void }) {
  const legacy = legacyReading(campaign);
  if (!legacy) {
    return (
      <Screen title="The presidency is in session" icon="record" eyebrow="The legacy" screenClass="workspace" camera="us">
        <div className="rec-ending">
          <section className="rec-section">
            <EmptyState icon="emptyRecord" title="A legacy is written when the term ends">
              Until then, the Record holds what has happened so far. <Door href={place.record()}>Open the Record</Door>
            </EmptyState>
          </section>
        </div>
      </Screen>
    );
  }
  const view = search.view ?? "comparison";
  return (
    <Screen title="Legacy" icon="record" eyebrow={`${legacy.from} to ${legacy.to}`} lede={legacy.timelineLine} screenClass="workspace" camera="us">
      <div className="rec-ending">
        <Tabs compact label="Views of the legacy" tabs={TABS} selected={view} onSelect={(next) => onView(next as LegacyView)}>
          {view === "comparison" ? <Comparison legacy={legacy} /> : null}
          {view === "timeline" ? <Timeline legacy={legacy} /> : null}
          {view === "record" ? <Commitments legacy={legacy} /> : null}
        </Tabs>
        <p className="rec-closing">{legacy.closing}</p>
        <p>
          <Door href={place.ending()}>How it ended</Door> · <Door href={place.record()}>The whole Record</Door>
        </p>
      </div>
    </Screen>
  );
}
