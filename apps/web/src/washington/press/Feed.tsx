import { useEffect, useMemo, useRef, useState } from "react";
import { COVERAGE_TONES, COVERAGE_TONE_WORD, TOPIC_LABEL, coverageTopics, filterCoverage, place, type CoverageRow, type DeskRow } from "@admin/player-core";
import { Button, Collection, Field, Flag, Icon, NativeSelect, Sheet } from "@admin/ui-web";
import { GenreTag } from "../../record/GenreTag";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import { digestHref } from "../../brief/WeekDigest";
import { filterOf, isFiltered, pressSearch, type PressSearch } from "./press-search";

const VALENCE = { critical: "bad", even: "neutral", friendly: "good" } as const;

type Props = {
  readonly rows: readonly CoverageRow[];
  readonly desks: readonly DeskRow[];
  readonly search: PressSearch;
  readonly onSearch: (next: PressSearch) => void;
};

function Row({ row }: { readonly row: CoverageRow }) {
  return (
    <li className="pr-story ui-row-target ui-valence-bar" data-valence={row.tone ? VALENCE[row.tone] : "neutral"}>
      <p className="pr-story__headline">
        <Door href={place.dispatch(String(row.index))} className="ui-row-link">
          {row.headline}
        </Door>
      </p>
      <p className="pr-story__meta">
        {row.genre === "journalism" ? null : <GenreTag genre={row.genre} />}
        <span>{row.source}</span>
        {row.tone ? <span className="pr-story__tone">{COVERAGE_TONE_WORD[row.tone]}</span> : null}
        <span>{row.topicLabel}</span>
        <time>{row.when}</time>
        {row.nations.map((nation) => (
          <Door key={nation.id} href={nation.href} className="pr-chip">
            <Flag name={nation.name} src={nationFlagUrl(nation.id)} height={16} decorative />{nation.name}
          </Door>
        ))}
      </p>
    </li>
  );
}

function Filters({ rows, desks, search, onSearch }: Props) {
  const topics = useMemo(() => coverageTopics(rows), [rows]);
  const set = (patch: Readonly<Record<string, string | undefined>>) => onSearch(pressSearch({ ...search, ...patch }));
  return (
    <div className="pr-filters">
      <Field label="Topic">
        {(control) => (
          <NativeSelect {...control} className="ui-input" value={search.topic ?? ""} onChange={(event) => set({ topic: event.target.value || undefined })}>
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.label} ({topic.count})
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Desk">
        {(control) => (
          <NativeSelect {...control} className="ui-input" value={search.outlet ?? ""} onChange={(event) => set({ outlet: event.target.value || undefined })}>
            <option value="">All desks</option>
            {desks.map((desk) => (
              <option key={desk.id} value={desk.id}>
                {desk.name} ({desk.filed})
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Lean">
        {(control) => (
          <NativeSelect {...control} className="ui-input" value={search.tone ?? ""} onChange={(event) => set({ tone: event.target.value || undefined })}>
            <option value="">Any lean</option>
            {COVERAGE_TONES.map((tone) => (
              <option key={tone} value={tone}>
                {COVERAGE_TONE_WORD[tone]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
    </div>
  );
}

function describe(search: PressSearch, desks: readonly DeskRow[]): string {
  const parts = [
    ...(search.week !== undefined ? [`week ${search.week}`] : []),
    ...(search.outlet ? [desks.find((desk) => desk.id === search.outlet)?.name ?? "an unknown desk"] : []),
    ...(search.tone ? [COVERAGE_TONE_WORD[search.tone].toLowerCase()] : []),
    ...(search.topic ? [TOPIC_LABEL[search.topic].toLowerCase()] : []),
  ];
  return parts.join(", ");
}

/**
 * Every story filed, newest first, narrowed by topic, desk, lean or week.
 * The address carries the filters, so a desk row, a chart column or a tile
 * lands here already narrowed. A story opens whole; the governments it names
 * open their files.
 */
export function Feed({ rows, desks, search, onSearch }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const shown = useMemo(() => filterCoverage(rows, filterOf(search)), [rows, search]);
  const ref = useRef<HTMLElement>(null);
  const key = JSON.stringify(search);
  useEffect(() => {
    if (window.location.hash === "#press-feed") ref.current?.scrollIntoView({ block: "nearest" });
  }, [key]);
  const narrowed = isFiltered(search);
  return (
    <section id="press-feed" ref={ref} aria-labelledby="press-feed-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-feed-title" className="pr-heading">
          Every story filed
        </h2>
        <p className="pr-note" role="status">
          {narrowed ? `${shown.length.toLocaleString("en-US")} of ${rows.length.toLocaleString("en-US")} stories: ${describe(search, desks)}.` : `${rows.length.toLocaleString("en-US")} stories filed since the term began.`}
        </p>
      </div>
      <div className="pr-feed__tools">
        <Button kind="secondary" size="sm" onClick={() => setFiltersOpen(true)}><Icon name="utilitySettings" size={16} />Filters{narrowed ? ` · ${Object.keys(filterOf(search)).length}` : ""}</Button>
        {search.week !== undefined && search.week >= 1 ? (
          <Door href={digestHref(search.week)} className="pr-chip">
            Week {search.week} briefing history
          </Door>
        ) : null}
        {narrowed ? (
          <Button kind="ghost" size="sm" onClick={() => onSearch({ view: search.view })}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter coverage" placement="side" lead="Narrow the same filed stories by topic, desk and lean. Selections stay in the address.">
        <Filters rows={rows} desks={desks} search={search} onSearch={onSearch} />
        <Button kind="primary" onClick={() => setFiltersOpen(false)}>Show {shown.length.toLocaleString("en-US")} stories</Button>
      </Sheet>
      <Collection
        items={shown}
        initial={15}
        noun="stories"
        className="pr-stories"
        resetKey={key}
        empty="No story matches these filters."
        render={(row: CoverageRow) => <Row key={row.index} row={row} />}
      />
    </section>
  );
}
