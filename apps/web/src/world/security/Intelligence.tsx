import { Card } from "@admin/ui-web";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import { EvidencePanel } from "@admin/ui-web";
import type { CollectionReading, PdbReading, SecurityAssessmentRow, TaskingRow } from "@admin/player-core";
import { URGENCY_WORDS } from "@admin/player-core";
import { Button, Collection, Gauge, Icon, SortHeader, SortPicker, sortRows, useSort, type IconName, type SortOption, type SortValue } from "@admin/ui-web";
import { asSentence, NameLink, PanelHeading, ConfidenceMeter, Segments } from "./parts";
import type { SecurityAct } from "./security-act";
import "../../washington/congress/tables.css";

type Open = (act: SecurityAct) => void;

const URGENCY_GLYPHS = { hard: "escalate", soft: "caution", ambient: "info" } as const satisfies Readonly<Record<PdbReading["items"][number]["urgency"], IconName>>;
const URGENCY_SEGMENT = { hard: "bad", soft: "watch", ambient: "neutral" } as const;

/** The morning's security items, the ones that need the President first, with how the night splits by urgency. */
export function Daily({ pdb }: { readonly pdb: PdbReading }) {
  const parts = (["hard", "soft", "ambient"] as const).map((urgency) => ({ key: URGENCY_SEGMENT[urgency], count: pdb.items.filter((item) => item.urgency === urgency).length, word: URGENCY_WORDS[urgency].toLowerCase() }));
  return (
    <Card role="region" className="sec-panel" aria-labelledby="security-daily">
      <PanelHeading id="security-daily" icon="intel">
        Today's intelligence
      </PanelHeading>
      {pdb.items.length > 0 ? <Segments label="Overnight items by urgency" parts={parts} /> : null}
      <Collection
        items={pdb.items}
        initial={6}
        noun="items"
        className="sec-daily"
        render={(item) => (
          <li key={item.id} className="sec-daily__item" data-urgency={item.urgency}>
            <span className="sec-daily__urgency">
              <Icon name={URGENCY_GLYPHS[item.urgency]} size={14} /> {URGENCY_WORDS[item.urgency]}
            </span>
            <span>{item.headline}</span>
          </li>
        )}
        empty="A quiet night. Nothing in the services' overnight reading needs you."
      />
    </Card>
  );
}

type TaskingKey = "element" | "target" | "weeks" | "confidence";

const TASKING_OPTIONS: readonly SortOption<TaskingKey>[] = [
  { key: "weeks", label: "Weeks standing" },
  { key: "element", label: "Element" },
  { key: "target", label: "Target" },
  { key: "confidence", label: "Confidence" },
];

const CONFIDENCE_RANK: Readonly<Record<string, number>> = { low: 1, moderate: 2, high: 3 };

const TASKING_VALUE: Readonly<Record<TaskingKey, (row: TaskingRow) => SortValue>> = {
  element: (row) => row.element,
  target: (row) => row.target,
  weeks: (row) => row.weeks,
  confidence: (row) => (row.product?.confidence ? CONFIDENCE_RANK[row.product.confidence] : undefined),
};

function filedWords(row: TaskingRow): string {
  if (!row.product) return "Nothing filed yet.";
  if (row.product.status === "findings") return `Filed ${row.product.filed}. Source confidence: ${row.product.confidence ?? "unstated"}.`;
  return row.product.status === "no-result" ? `Filed ${row.product.filed}: no usable findings.` : `Filed ${row.product.filed}: an older note.`;
}

function TaskingLine({ row, onOpen }: { readonly row: TaskingRow; readonly onOpen: Open }) {
  return (
    <tr className="ui-row-target">
      <th scope="row" data-label="Element">
        <strong className="sec-tasking__element" title={row.elementName}>
          {row.element}
        </strong>
        <span className="data-table__sub">{row.discipline}</span>
      </th>
      <td data-label="Target">
        <strong>
          <NameLink href={row.href}>{row.target}</NameLink>
        </strong>
        <span className="data-table__sub sec-clamp">{row.question}</span>
        {row.focus ? <span className="data-table__sub">Focus: {row.focus}.</span> : null}
        {row.note ? <span className="data-table__sub">Recorded note: {asSentence(row.note)}</span> : null}
      </td>
      <td data-label="Weeks standing" className="data-table__num">
        {row.weeks}
      </td>
      <td data-label="Last filed">
        <ConfidenceMeter confidence={row.product?.status === "findings" ? row.product.confidence : undefined} />
        <span className="data-table__sub">{filedWords(row)}</span>
      </td>
      <td data-label="Change" className="sec-ops__act">
        <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "close-tasking", id: row.id })}>
          Take it off
        </Button>
      </td>
    </tr>
  );
}

/** Standing taskings, each with the confidence of what it last filed, and the way to point the community at something else. */
export function CollectionLedger({ reading, onOpen }: { readonly reading: CollectionReading; readonly onOpen: Open }) {
  const [sort, onSort, setSort] = useSort<TaskingKey>({ key: "weeks", direction: "descending" });
  const order = new Map(reading.taskings.map((row, index) => [row.id, index] as const));
  const rows = sortRows(reading.taskings, sort, TASKING_VALUE, (a, b) => order.get(a.id)! - order.get(b.id)!);
  return (
    <Card role="region" className="sec-panel" aria-labelledby="security-collection">
      <PanelHeading id="security-collection" icon="instrumentCovert">
        Collection
      </PanelHeading>
      <AuthorityHelp topic="intelligence-collection" compact />
      {reading.taskings.length === 0 ? <p className="sec__note">Nothing is being collected on your instruction.</p> : null}
      {reading.taskings.length > 0 ? (
        <div className="sec-table">
          <SortPicker options={TASKING_OPTIONS} sort={sort} onSort={setSort} />
          <table className="data-table ui-table--stack">
            <caption className="ui-visually-hidden">Standing taskings. Select a column heading to sort.</caption>
            <thead>
              <tr>
                <SortHeader label="Element" sortKey="element" sort={sort} onSort={onSort} />
                <SortHeader label="Target" sortKey="target" sort={sort} onSort={onSort} />
                <SortHeader label="Weeks" detail="standing" sortKey="weeks" sort={sort} onSort={onSort} first="descending" align="end" />
                <SortHeader label="Last filed" detail="confidence" sortKey="confidence" sort={sort} onSort={onSort} first="descending" />
                <th scope="col">
                  <span className="ui-visually-hidden">Change</span>
                </th>
              </tr>
            </thead>
            <Collection as="tbody" columns={5} items={rows} initial={8} noun="taskings" resetKey={`${sort.key}:${sort.direction}`} render={(row) => <TaskingLine key={row.id} row={row} onOpen={onOpen} />} />
          </table>
        </div>
      ) : null}
      {reading.declined > 0 ? (
        <p className="sec__note">
          {reading.declined} {reading.declined === 1 ? "request has" : "requests have"} been declined by the community&rsquo;s counsel{reading.referred > 0 ? `, and ${reading.referred} ${reading.referred === 1 ? "is" : "are"} with an inspector general` : ""}. They stay on the record.
        </p>
      ) : null}
      <div>
        <Button kind="secondary" size="sm" icon={<Icon name="intel" size={16} />} onClick={() => onOpen({ kind: "task" })}>
          Task the community
        </Button>
      </div>
    </Card>
  );
}

function Judgment({ row, onOpen }: { readonly row: SecurityAssessmentRow; readonly onOpen: Open }) {
  return (
    <li className="sec-judgment ui-row-target ui-valence-bar" data-valence={row.changes.length > 0 ? "watch" : "neutral"}>
      <p className="sec-judgment__head">
        <span className="sec-judgment__title">
          <strong>
            <NameLink href={row.href}>{row.targetName}</NameLink>
          </strong>
          <span className="sec-judgment__question">{row.questionLabel}</span>
        </span>
        <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "press", id: row.id })}>
          Press the wording
        </Button>
      </p>
      <p className="sec-judgment__text">{row.judgment}</p>
      <div className="sec-judgment__reading">
        <Gauge shape="meter" label="How likely, in the community's words" value={row.rung} valueText={row.likelihood} marks={[{ at: 0.5, label: "even" }]} />
        <ConfidenceMeter confidence={row.confidence} />
      </div>
      <p className="sec__note">{row.confidenceBasis}</p>
      <EvidencePanel title={`${row.targetName}: assessment evidence`} label="Sources, gaps and dissent">
        <ul className="ledger__plain">
          {row.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
          {row.gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
          {row.dissents.map((dissent) => (
            <li key={dissent}>{dissent}</li>
          ))}
          <li>{row.alternative}</li>
        </ul>
      </EvidencePanel>
      {row.changes.map((change) => (
        <p key={change} className="sec__note ui-valence-ink" data-valence="watch">
          ⚠ {change}
        </p>
      ))}
      <p className="sec__note">Written {row.issued}.</p>
    </li>
  );
}

/** The community's judgments, newest first, and the way to ask for another. */
export function Assessments({ rows, onOpen }: { readonly rows: readonly SecurityAssessmentRow[]; readonly onOpen: Open }) {
  return (
    <Card role="region" className="sec-panel" aria-labelledby="security-assessments">
      <PanelHeading id="security-assessments" icon="intel">
        Assessments
      </PanelHeading>
      <Collection
        items={rows}
        initial={6}
        noun="assessments"
        className="sec-judgments"
        empty="The community has written nothing for you yet. Commission a judgment on intent, capability or stability."
        render={(row) => <Judgment key={row.id} row={row} onOpen={onOpen} />}
      />
      <div>
        <Button kind="secondary" size="sm" icon={<Icon name="review" size={16} />} onClick={() => onOpen({ kind: "commission" })}>
          Commission an assessment
        </Button>
      </div>
    </Card>
  );
}
