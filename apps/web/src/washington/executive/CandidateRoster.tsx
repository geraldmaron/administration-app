import { useId, useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { chairRead, place, type ModelingAct, type Shortlist, type ShortlistCell, type ShortlistOption } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import { Button, Collection, Portrait, SortHeader, SortPicker, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { ComparisonCellView } from "../../decision/cells";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { faceOf } from "../../media/faces";
import { ChairRead } from "../../shell/dossier/ChairRead";
import { BandMeter } from "./BandMeter";

/**
 * The rows the table reads across; every other row of the shortlist is the
 * price of the picked name, read below it. Competence and loyalty are drawn as
 * one read of the person rather than as two columns of their own.
 */
const COLUMN_ROWS = ["competence", "loyalty"] as const;

/** "fit" is the order the shortlist ranks them in; it has no header, so nothing is re-sorted until a column is pressed. */
type CandidateSort = "fit" | "candidate" | "read";

const READ_RANK = { good: 3, watch: 2, bad: 1 } as const;

/** A candidate's read, the same one the roster draws for the chair's holders; the chair as it stands has none. */
function CandidateRead({ campaign, option }: { readonly campaign: Campaign; readonly option: ShortlistOption }) {
  const person = option.person ? campaign.people[option.person]?.base : undefined;
  if (!option.person || !person) return <span className="cell-none">—</span>;
  return <ChairRead read={chairRead(person)} name={person.name} href={place.person(option.person)} />;
}

function Cell({ campaign, cell }: { readonly campaign: Campaign; readonly cell: ShortlistCell | undefined }) {
  if (!cell) return <span className="cell-none">Not assessed</span>;
  if (cell.kind === "band") return <BandMeter judgment={cell.judgment} labelHidden />;
  return <ComparisonCellView campaign={campaign} cell={cell} />;
}

function Who({ campaign, option }: { readonly campaign: Campaign; readonly option: ShortlistOption }) {
  if (!option.person) return <span>{option.label}</span>;
  const face = faceOf(campaign, option.person, option.label);
  return (
    <span className="cand__who">
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="sm" decorative />
      <span>{option.label}</span>
    </span>
  );
}

export type CandidateRosterProps = {
  readonly campaign: Campaign;
  readonly shortlist: Shortlist;
  readonly title: string;
  readonly noun: string;
  readonly verb: string;
  readonly review: (option: ShortlistOption) => ReactNode;
  readonly onAuthorize: (option: ShortlistOption) => void;
  readonly busy: boolean;
  /** The act a named candidate's commit makes, for projecting the picked name against leaving the chair. */
  readonly projectAs?: (person: PersonId) => ModelingAct;
};

function candidateValues(campaign: Campaign): Readonly<Record<CandidateSort, (option: ShortlistOption) => SortValue>> {
  return {
    fit: () => 0,
    candidate: (option) => option.label,
    read: (option) => {
      const person = option.person ? campaign.people[option.person]?.base : undefined;
      return person ? READ_RANK[chairRead(person).tone] : undefined;
    },
  };
}

/**
 * The picked name projected forward. One name at a
 * time rather than the whole roster: a shortlist can run to dozens, and each
 * name projected is five runs of the full week.
 */
function RosterProjection({ campaign, picked, act }: { readonly campaign: Campaign; readonly picked: ShortlistOption | undefined; readonly act: (person: PersonId) => ModelingAct }) {
  const named = picked?.person !== undefined;
  const spec = named && picked
    ? actsChoice(picked.label, "leaving the chair as it is", "Leaving the chair as it is.", [
        { id: picked.id, label: picked.label, ...(picked.unavailable ? { refused: picked.unavailable } : { act: act(picked.person!) }) },
      ])
    : undefined;
  const projection = useChoiceProjection(named ? campaign : undefined, spec, picked?.id);
  if (!projection || !picked) return <p className="mdl-note">Pick a name to project it forward against leaving the chair as it is.</p>;
  return (
    <div className="mdl-standalone">
      {projection.control}
      {projection.perItem[picked.id] ?? null}
      {projection.detail ?? null}
    </div>
  );
}

/**
 * Every eligible name on the same columns, ranked by fit, with what leaving
 * the chair empty costs said above them. The first few lead and a control shows the rest,
 * with the true total always in view; the price of the picked name is read in
 * full below the table so the table stays comparable.
 */
export function CandidateRoster({ campaign, shortlist, title, noun, verb, review, onAuthorize, busy, projectAs }: CandidateRosterProps) {
  const id = useId();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const options = shortlist.options;
  const picked = options.find((option) => option.id === selected);
  const cellOf = (rowId: string, option: ShortlistOption) => shortlist.rows.find((row) => row.id === rowId)?.cells[options.indexOf(option)];
  const terms = shortlist.rows.filter((row) => !(COLUMN_ROWS as readonly string[]).includes(row.id));
  const [sort, onSort, setSort] = useSort<CandidateSort>({ key: "fit", direction: "ascending" });
  const ranked = sort.key === "fit" ? options : sortRows(options, sort, candidateValues(campaign));
  const sortOptions: readonly SortOption<CandidateSort>[] = [
    { key: "candidate", label: "Candidate" },
    { key: "read", label: "Read" },
  ];
  const reasons = new Set(options.map((option) => option.unavailable));
  const sharedReason = options.length > 1 && reasons.size === 1 ? options[0]?.unavailable : undefined;
  const line = (option: ShortlistOption) => (
    <tr key={option.id} className="cand__row ui-row-target" onClick={() => setSelected(option.id)} data-selected={option.id === picked?.id ? "true" : undefined}>
      <th scope="row" data-label="Candidate">
        <label className="cand__pick">
          <input type="radio" name={`${id}-pick`} checked={option.id === picked?.id} onChange={() => setSelected(option.id)} />
          <Who campaign={campaign} option={option} />
        </label>
        {option.unavailable ? <span className="cand__locked">{sharedReason ? "Not available" : `Not available: ${option.unavailable}`}</span> : null}
      </th>
      <td data-label="Read">
        <CandidateRead campaign={campaign} option={option} />
      </td>
    </tr>
  );
  return (
    <section className="cand" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="cand__title">
        {title}
      </h3>
      <p className="cand__count">
        {options.length} {options.length === 1 ? noun : `${noun}s`} eligible, ranked by fit.
      </p>
      {sharedReason ? (
        <p className="cand__shared" role="note">
          Every name is on hold: {sharedReason}
        </p>
      ) : null}
      <p className="cand__shared" role="note">
        {shortlist.waiting}
      </p>
      <SortPicker options={sortOptions} sort={sort} onSort={setSort} />
      <div className="cand__scroll">
        <table className="cand__table">
          <caption className="ui-visually-hidden">{title}</caption>
          <thead>
            <tr>
              <SortHeader label="Candidate" sortKey="candidate" sort={sort} onSort={onSort} />
              <SortHeader label="Read" sortKey="read" sort={sort} onSort={onSort} first="descending" />
            </tr>
          </thead>
          <Collection items={ranked} initial={6} resetKey={`${sort.key}:${sort.direction}`} noun={`${noun}s`} as="tbody" render={line} />
        </table>
      </div>
      <div className="cand__terms" aria-live="polite">
        <h4>{picked ? `Terms for ${picked.label}` : "Pick a name to read its terms"}</h4>
        <dl>
          {(picked ? terms : []).map((row) => (
            <div key={row.id}>
              <dt>{row.label}</dt>
              <dd>
                <Cell campaign={campaign} cell={cellOf(row.id, picked!)} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="cand__review">{!picked ? "Pick a name to see how they would fill in, then name them." : picked.unavailable ? `Not available: ${picked.unavailable}` : review(picked)}</p>
        <Button kind="primary" disabled={!picked || picked.unavailable !== undefined} busy={busy} onClick={() => picked && onAuthorize(picked)}>
          {verb}
        </Button>
      </div>
      {projectAs ? <RosterProjection campaign={campaign} picked={picked} act={projectAs} /> : null}
    </section>
  );
}
