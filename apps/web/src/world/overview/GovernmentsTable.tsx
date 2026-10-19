import { useMemo } from "react";
import { ALIGNMENT_RANK, ALIGNMENT_WORDS, WORLD_REGIONS, WORLD_REGION_NAMES, type Stance, type WorldGovernment, type WorldRegionId } from "@admin/player-core";
import { Collection, Field, Flag, Gauge, Icon, Sparkline, SortHeader, SortPicker, Tag, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import type { Valence } from "../../shell/valence";

type Column = "name" | "region" | "standing" | "direction" | "ours" | "alignment" | "trade" | "forces";

const OPTIONS: readonly SortOption<Column>[] = [
  { key: "name", label: "Government" },
  { key: "region", label: "Region" },
  { key: "standing", label: "Standing" },
  { key: "direction", label: "Direction" },
  { key: "ours", label: "Your read" },
  { key: "alignment", label: "Alignment" },
  { key: "trade", label: "US trade" },
  { key: "forces", label: "US forces" },
];

const STANCE_RANK: Readonly<Record<Stance, number>> = { adverse: 1, caution: 2, neutral: 3, favorable: 4 };
const VALENCE: Readonly<Record<Stance, Valence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" };
const GAUGE_TONE: Readonly<Record<Stance, "good" | "reading" | "watch" | "bad">> = { favorable: "good", neutral: "reading", caution: "watch", adverse: "bad" };
const TREND_VALENCE = { warming: "good", steady: "neutral", cooling: "bad" } as const;

/** Unread and unrelated governments have no standing to sort by, so they sort last either way. */
const VALUES: Readonly<Record<Column, (row: WorldGovernment) => SortValue>> = {
  name: (row) => row.name,
  region: (row) => row.regionName,
  standing: (row) => row.trust,
  direction: (row) => row.trend?.change,
  ours: (row) => (row.ours ? STANCE_RANK[row.ours.stance] : undefined),
  alignment: (row) => ALIGNMENT_RANK[row.alignment],
  trade: (row) => row.tradeShare,
  forces: (row) => row.forces,
};

function matches(row: WorldGovernment, query: string): boolean {
  const text = query.trim().toLowerCase();
  return text === "" || [row.name, row.capital, row.adjective].some((field) => field.toLowerCase().includes(text));
}

function Standing({ row }: { readonly row: WorldGovernment }) {
  if (row.trust === undefined || row.stance === undefined || row.stance === "unread") return <span className="wd-muted">{row.standingWord}</span>;
  return <Gauge shape="meter" label={`${row.name}, view of the United States`} labelHidden value={row.trust} valueText={row.standingWord} tone={GAUGE_TONE[row.stance]} />;
}

function Direction({ row }: { readonly row: WorldGovernment }) {
  if (!row.trend) return <span className="wd-muted">{row.stance === "unread" ? "Unread" : "No record yet"}</span>;
  return (
    <span className="wd-direction ui-valence-ink" data-valence={TREND_VALENCE[row.trend.direction]}>
      <Sparkline values={row.trend.values} valence={TREND_VALENCE[row.trend.direction]} />
      {row.trend.word}
    </span>
  );
}

function Line({ row }: { readonly row: WorldGovernment }) {
  const src = nationFlagUrl(row.nation);
  return (
    <tr className="wd-table__row ui-row-target">
      <th scope="row" data-label="Government">
        <div className="wd-table__name">
        <Flag name={row.name} {...(src ? { src } : {})} height={22} decorative />
        <span>
          <Door href={row.href} className="ui-row-link">{row.name}</Door>
          <span className="wd-muted">{row.capital}</span>
        </span>
        {row.atWar ? <Tag tone="risk" icon="conflict">At war with the US</Tag> : null}
        </div>
      </th>
      <td data-label="Region">{row.regionName}</td>
      <td data-label="Standing"><Standing row={row} /></td>
      <td data-label="Direction"><Direction row={row} /></td>
      <td data-label="Your read">{row.ours ? <span className="ui-valence-ink" data-valence={VALENCE[row.ours.stance]}>{row.ours.word}</span> : <span className="wd-muted">None</span>}</td>
      <td data-label="Alignment">
        {ALIGNMENT_WORDS[row.alignment]}
        {row.allied ? <Tag tone="good">Treaty ally</Tag> : null}
        {row.treaties > 0 && !row.allied ? <span className="wd-muted">{row.treaties} {row.treaties === 1 ? "treaty" : "treaties"}</span> : null}
      </td>
      <td data-label="US trade" data-align="end">{row.tradeText}</td>
      <td data-label="US forces">{row.forcesText}</td>
    </tr>
  );
}

type TableProps = {
  readonly governments: readonly WorldGovernment[];
  readonly region: WorldRegionId | null;
  readonly onRegion: (region: WorldRegionId | null) => void;
  readonly query: string;
  readonly onQuery: (query: string) => void;
};

function countLine(shown: number, total: number, region: WorldRegionId | null): string {
  const where = region ? ` in ${WORLD_REGION_NAMES[region]}` : "";
  return shown === total ? `${total} governments${where}.` : `${shown} of ${total} governments${where}.`;
}

/** Every government on the columns a President compares them by; sorted by the header, paged, each row a door to the file. */
export function GovernmentsTable({ governments, region, onRegion, query, onQuery }: TableProps) {
  const [sort, onSort, setSort] = useSort<Column>({ key: "standing", direction: "descending" });
  const inRegion = useMemo(() => (region ? governments.filter((row) => row.region === region) : governments), [governments, region]);
  const found = useMemo(() => inRegion.filter((row) => matches(row, query)), [inRegion, query]);
  const rows = useMemo(() => sortRows(found, sort, VALUES, (a, b) => a.name.localeCompare(b.name)), [found, sort]);
  return (
    <section id="wd-governments" aria-labelledby="wd-governments-title" tabIndex={-1} className="wd-panel">
      <h2 id="wd-governments-title" className="wd-panel__title"><Icon name="world" size={20} /> Governments</h2>
      <div className="wd-tools">
        <Field label="Find a government" hint="By name, capital or demonym.">
          {(props) => <input {...props} type="search" className="ui-input" value={query} onChange={(event) => onQuery(event.target.value)} />}
        </Field>
        <Field label="Region">
          {(props) => (
            <select {...props} className="ui-input" value={region ?? "all"} onChange={(event) => onRegion(event.target.value === "all" ? null : (event.target.value as WorldRegionId))}>
              <option value="all">Every region</option>
              {WORLD_REGIONS.map((id) => <option key={id} value={id}>{WORLD_REGION_NAMES[id]}</option>)}
            </select>
          )}
        </Field>
      </div>
      <p className="wd-count-line" role="status">{countLine(found.length, inRegion.length, region)}</p>
      <div className="wd-tablebox">
      <SortPicker options={OPTIONS} sort={sort} onSort={setSort} />
      <table className="wd-table">
        <caption className="ui-visually-hidden">Every government with its standing toward the United States, direction, alignment, trade and forces</caption>
        <thead>
          <tr>
            <SortHeader label="Government" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Region" sortKey="region" sort={sort} onSort={onSort} />
            <SortHeader label="Standing" sortKey="standing" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Direction" detail="four weeks" sortKey="direction" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Your read" sortKey="ours" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Alignment" sortKey="alignment" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="US trade" detail="share" sortKey="trade" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="US forces" sortKey="forces" sort={sort} onSort={onSort} first="descending" />
          </tr>
        </thead>
        {rows.length > 0 ? (
          <Collection
            as="tbody"
            columns={8}
            items={rows}
            initial={20}
            noun="governments"
            resetKey={`${region ?? "all"}:${query}:${sort.key}:${sort.direction}`}
            render={(row) => <Line key={row.nation} row={row} />}
          />
        ) : (
          <tbody>
            <tr>
              <td colSpan={8} className="wd-muted">No government matches. Clear the search or change the region to broaden the list.</td>
            </tr>
          </tbody>
        )}
      </table>
      </div>
    </section>
  );
}
