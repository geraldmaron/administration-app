import type { CourtDocket, DocketCase } from "@admin/player-core";
import { Collection, Gauge, Icon, SortPicker, Tag, sortRows, useSort, type SortOption } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import type { Valence } from "../../shell/valence";
import { CaseStatus } from "./CaseStatus";

/** How a case's clock reads: weeks left, or that it is due at the next turn. */
export function dueWords(row: DocketCase): string {
  if (row.responseDue) return `Administration response due ${row.responseDue}`;
  const step = { threshold: "Threshold review", interim: "Interim relief", "lower-merits": "District-court merits", "circuit-merits": "Circuit appeal", appeal: "Appeal decision", "supreme-merits": "Supreme Court review", remand: "Remand", final: "Final" }[row.stage ?? "threshold"];
  if (row.calendar?.status === "scheduled") return `Argument ${row.due}; opinion follows in the October ${row.calendar.termYear} term`;
  if (row.calendar?.status === "argued") return `Opinion due ${row.due}`;
  if (row.calendar?.status === "carried") return `Opinion delayed for lack of a quorum; next check ${row.due}`;
  if (row.weeksLeft <= 0) return `${step} is due at the next turn (${row.due})`;
  return `${step} ${row.due}, in ${row.weeksLeft} ${row.weeksLeft === 1 ? "week" : "weeks"}`;
}

/** A challenged order struck down is the President losing it, so a high chance reads bad and a low one good. */
export function strikeVerdict(chance: number): { readonly valence: Valence; readonly word: string } {
  if (chance >= 0.55) return { valence: "bad", word: "\u25BC Likely struck down" };
  if (chance >= 0.4) return { valence: "watch", word: "\u26A0 Toss-up" };
  return { valence: "good", word: "\u2713 Likely upheld" };
}

/** The staff's qualitative reading; the internal decision threshold is not a calibrated public probability. */
export function StrikeMeter({ chance, caption }: { readonly chance: number; readonly caption?: string }) {
  const verdict = strikeVerdict(chance);
  return (
    <div className="projection">
      <Tag icon="pending">Staff projection</Tag>
      <Gauge
        shape="meter"
        label="Chance it is struck down"
        labelHidden
        value={verdict.valence === "bad" ? 0.75 : verdict.valence === "watch" ? 0.5 : 0.25}
        valueText={verdict.word}
        tone={verdict.valence === "neutral" ? "reading" : verdict.valence}
        marks={[{ at: 0.5, label: "Uncertain" }]}
        caption={caption ? `Qualitative assessment. ${caption}` : "Qualitative assessment; not a measured probability"}
      />
      <span className="ui-valence-ink projection__word" data-valence={verdict.valence}>
        {verdict.word}
      </span>
    </div>
  );
}

/** "order" is the order the docket arrives in; it has no header, so nothing is re-sorted until a column is pressed. */
type PendingSort = "order" | "matter" | "status" | "question" | "due" | "projection";

const PENDING_OPTIONS: readonly SortOption<PendingSort>[] = [
  { key: "matter", label: "Matter" },
  { key: "status", label: "Status" },
  { key: "question", label: "Legal question" },
  { key: "due", label: "Ruling due" },
  { key: "projection", label: "Staff projection" },
];

const PENDING_VALUE = {
  order: () => 0,
  matter: (row: DocketCase) => row.orderName,
  status: (row: DocketCase) => row.status,
  question: (row: DocketCase) => row.question,
  due: (row: DocketCase) => row.weeksLeft,
  projection: (row: DocketCase) => row.strikeChance,
} as const;

function PendingTable({ rows }: { readonly rows: readonly DocketCase[] }) {
  const [sort, , setSort] = useSort<PendingSort>({ key: "order", direction: "ascending" });
  const shown = sort.key === "order" ? rows : sortRows(rows, sort, PENDING_VALUE);
  return <><SortPicker alwaysVisible options={PENDING_OPTIONS} sort={sort} onSort={setSort} /><ul className="judicial-ledger" aria-label="Pending cases">{shown.map((row) => <li key={row.id}><Door href={row.href} className="judicial-ledger__case"><span className="judicial-ledger__heading"><Icon name="court" size={20} /><strong>{row.orderName}</strong><CaseStatus status={row.status} dismissedAtThreshold={row.dismissedAtThreshold} subject={row.subject} endReason={row.endReason} /></span><span className="judicial-ledger__question">{row.question}</span><span className="judicial-ledger__facts"><span>{row.lowerForum?.court ?? "Filing forum not yet recorded"}</span><span>{dueWords(row)}</span></span><span className="judicial-ledger__ground">{row.groundWords}</span>{row.strikeChance !== undefined ? <StrikeMeter chance={row.strikeChance} caption="Qualitative staff assessment of the participating bench and recorded legal ground" /> : null}</Door></li>)}</ul></>;
}

type RulingSort = "order" | "matter" | "holding" | "split" | "ruled";

const RULING_OPTIONS: readonly SortOption<RulingSort>[] = [
  { key: "matter", label: "Matter" },
  { key: "holding", label: "Holding" },
  { key: "split", label: "Split" },
  { key: "ruled", label: "Ruled" },
];

/** The winning side's votes from "6 to 3"; a per curiam ruling has no count to rank. */
const winningVotes = (split: string | undefined): number | undefined => {
  const votes = split ? /^(\d+) to \d+$/.exec(split) : null;
  return votes ? Number(votes[1]) : undefined;
};

const RULING_VALUE = {
  order: () => 0,
  matter: (row: DocketCase) => row.orderName,
  holding: (row: DocketCase) => row.status,
  split: (row: DocketCase) => winningVotes(row.split),
  ruled: (row: DocketCase) => row.ruledTurn,
} as const;

function RulingsTable({ rows }: { readonly rows: readonly DocketCase[] }) {
  const [sort, , setSort] = useSort<RulingSort>({ key: "order", direction: "ascending" });
  const shown = sort.key === "order" ? rows : sortRows(rows, sort, RULING_VALUE);
  return <><SortPicker alwaysVisible options={RULING_OPTIONS} sort={sort} onSort={setSort} /><Collection items={shown} initial={8} resetKey={`${sort.key}:${sort.direction}`} noun="rulings" className="judicial-ledger" render={(row) => <li key={row.id}><Door href={row.href} className="judicial-ledger__case"><span className="judicial-ledger__heading"><Icon name="court" size={20} /><strong>{row.orderName}</strong><CaseStatus status={row.status} dismissedAtThreshold={row.dismissedAtThreshold} subject={row.subject} endReason={row.endReason} /></span><span className="judicial-ledger__facts"><span>{row.split ?? "Split not recorded"}</span><span>{row.ruled ?? "Date not recorded"}</span></span><span className="judicial-ledger__question">{row.question}</span></Door></li>} /></>;
}
/** Your orders under challenge with the staff's projection, then every ruling already handed down. */
export function Docket({ docket }: { readonly docket: CourtDocket }) {
  return (
    <section className="nation-section" aria-labelledby="courts-docket">
      <h2 id="courts-docket" className="nation-section__title">
        <Icon name="order" size={20} /> Cases before the courts
      </h2>
      {docket.pending.length === 0 ? (
        <p className="nation-note">No case is pending. A filed challenge moves through threshold review, interim relief and lower-court merits before any Supreme Court review.</p>
      ) : (
        <PendingTable rows={docket.pending} />
      )}
      <h3 className="nation-subtitle">Rulings</h3>
      {docket.ruled.length === 0 ? <p className="nation-note">No ruling has been handed down.</p> : <RulingsTable rows={docket.ruled} />}
    </section>
  );
}
