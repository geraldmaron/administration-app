import type { ReactNode } from "react";
import type { ActCell, ActComparison } from "@admin/player-core";
import { CompareAuthorize, type ChoiceProjection, type CompareOption, type CompareRow, type IconName } from "@admin/ui-web";
import { valenceOf } from "../../shell/valence";

const ROW_ICONS: Readonly<Record<string, IconName>> = {
  does: "dossier", tradeoff: "law", funding: "departmentTreasury", effects: "economyGrowth",
  hill: "subjectCapitol", count: "subjectChamber",
};

/** A Washington reading is lines with the model's stance; the engine ships it as words, so it is said as words in the stance's color. */
function cellOf(cell: ActCell | undefined): ReactNode {
  if (!cell || cell.lines.length === 0) return <span className="ui-compare__none">Does not apply</span>;
  const valence = cell.stance ? valenceOf(cell.stance) : "neutral";
  return (
    <span className="ui-valence-ink" data-valence={valence}>
      {cell.lines.join(". ")}
    </span>
  );
}

export type ActCompareProps = {
  readonly title: string;
  readonly comparison: ActComparison;
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  readonly onAuthorize: () => void;
  readonly busy: boolean;
  readonly tone?: "commit" | "danger";
  /** What the picked option still needs from the President before the verb is live, said in place of its review. */
  readonly pending?: string;
  /** Terms an option takes, drawn over the list: a desk, a message. */
  readonly terms?: ReactNode;
  readonly projection?: ChoiceProjection;
};

/**
 * A Washington act: the player-core comparison as a
 * results list (each column's outcome drawn where the producer filled one,
 * its rows otherwise), the picked option's review above its one named verb,
 * the comparison's waiting line while nothing is picked, and the engine's own
 * refusal in place of the verb where the act is not open.
 */
export function ActCompare({ title, comparison, selected, onSelect, onAuthorize, busy, tone = "commit", pending, terms, projection }: ActCompareProps) {
  const column = comparison.columns.find((entry) => entry.id === selected);
  const options: readonly CompareOption[] = comparison.columns.map((entry) => ({
    id: entry.id,
    label: entry.label,
    ...(entry.outcome ? { outcome: entry.outcome } : {}),
    ...(entry.refusal ? { unavailable: `Not available: ${entry.refusal}` } : pending && entry.id === selected ? { unavailable: pending } : {}),
  }));
  const rows: readonly CompareRow[] = comparison.rows.map((row) => ({
    label: row.label,
    ...(ROW_ICONS[row.key] ? { icon: ROW_ICONS[row.key]! } : {}),
    cells: Object.fromEntries(comparison.columns.map((entry) => [entry.id, cellOf(entry.cells[row.key])])),
  }));
  return (
    <div className="act-terms">
      {terms}
      <CompareAuthorize
        title={title}
        options={options}
        rows={rows}
        selected={column?.id}
        onSelect={onSelect}
        verb={(column ?? comparison.columns[0])?.verb ?? "Authorize"}
        onAuthorize={onAuthorize}
        tone={tone}
        review={column?.review}
        {...(comparison.waiting ? { baselineReview: comparison.waiting } : {})}
        busy={busy}
        {...(projection ? { projection } : {})}
      />
    </div>
  );
}
