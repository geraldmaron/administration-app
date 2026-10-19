import { useMemo, useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { leverComparison, marketLeverAct, marketLevers, type LeverColumn, type LeverColumnId, type LeverOutlook } from "@admin/player-core";
import { CompareAuthorize, Icon, type CompareRow } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { ActReceipt } from "./ActReceipt";
import type { NationCommit } from "./commit";

/** A projected price: the figure, and how far it sits from where it goes with no lever pulled, in words and an arrow. */
function OutlookCell({ value, figure, untouched }: { readonly value: number | undefined; readonly figure: string | undefined; readonly untouched: number }) {
  if (value === undefined || figure === undefined) return <span className="cell-none">Not available</span>;
  if (Math.abs(value / untouched - 1) < 0.0005) return <span className="lever-outlook">{figure}</span>;
  const lower = value < untouched;
  const change = `${lower ? "−" : "+"}${(Math.abs(value / untouched - 1) * 100).toFixed(1)}% against no lever`;
  return (
    <span className="lever-outlook" data-favorable={lower ? "true" : "false"}>
      <strong>{figure}</strong>
      <span className="lever-outlook__move">
        <span aria-hidden="true">{lower ? "▼" : "▲"}</span> {change}
      </span>
    </span>
  );
}

function linesCell(lines: readonly string[], none: string) {
  if (lines.length === 0) return <span className="cell-none">{none}</span>;
  return (
    <ul className="cell-lines">
      {lines.map((line) => (
        <li key={line}>
          <Icon name="caution" size={14} />
          {line}
        </li>
      ))}
    </ul>
  );
}

function rows(columns: readonly LeverColumn[], weeks: number, untouched: LeverOutlook): readonly CompareRow[] {
  const each = (cell: (column: LeverColumn) => ReactNode) => Object.fromEntries(columns.map((column) => [column.id, cell(column)]));
  return [
    { label: "What it does", kind: "lead", cells: each((column) => <span>{column.effect}</span>) },
    { label: "What it costs now", icon: "budget", cells: each((column) => (column.cost.length > 0 ? <strong className="cell-money" data-stance="adverse">{column.cost.join("; ")}</strong> : <span className="cell-none">Nothing</span>)) },
    { label: `Crude in ${weeks} weeks`, icon: "commodityCrudeOil", cells: each((column) => <OutlookCell value={column.outlook?.crude} figure={column.outlook?.crudeFigure} untouched={untouched.crude} />) },
    { label: `The gallon in ${weeks} weeks`, icon: "commodityRefinedFuel", cells: each((column) => <OutlookCell value={column.outlook?.pump} figure={column.outlook?.pumpFigure} untouched={untouched.pump} />) },
    { label: "Risks", icon: "caution", cells: each((column) => linesCell(column.risks, "None foreseen")) },
  ];
}

/**
 * The President's market levers: one matrix, every lever
 * priced and projected off the packet its commit applies, a refused lever
 * still read with the law that withholds it, then the receipt.
 */
export function Levers({ campaign, acts }: { readonly campaign: Campaign; readonly acts: NationCommit }) {
  const comparison = useMemo(() => leverComparison(campaign), [campaign]);
  const keys = useMemo(() => marketLevers(campaign).map((lever) => lever.key), [campaign]);
  const [selected, setSelected] = useState<LeverColumnId | undefined>(undefined);
  const column = comparison.columns.find((entry) => entry.id === selected);
  const projection = useChoiceProjection(
    campaign,
    actsChoice("The market levers", "waiting", "Waiting: the markets and the Fed move on their own.", comparison.columns.map((entry) => {
      const key = keys.find((lever) => lever === entry.id);
      if (entry.refusal) return { id: entry.id, label: entry.label, refused: entry.refusal };
      return { id: entry.id, label: entry.label, ...(key ? { act: { act: "lever" as const, key } } : {}) };
    })),
    selected,
  );
  if (acts.committed) {
    return <ActReceipt committed={acts.committed} again="Compare the levers again" onAgain={() => { setSelected(undefined); acts.dismiss(); }} mapNote={null} />;
  }
  const options = comparison.columns.map((entry) => ({ id: entry.id, label: entry.label, ...(entry.refusal ? { unavailable: `Not available: ${entry.refusal}` } : {}) }));
  const authorize = () => {
    const key = keys.find((entry) => entry === selected);
    if (!key || !column) return;
    void acts.commit({
      review: { tier: "confirm" },
      title: column.label,
      lines: [
        { label: "What it does", value: column.effect },
        { label: "What it cost", value: column.cost.length > 0 ? column.cost.join("; ") : "Nothing now" },
      ],
      packet: () => {
        const act = marketLeverAct(campaign, key);
        if (!act.ok) throw new Error(act.reason);
        return act.packet;
      },
    });
  };
  return (
    <>
      <CompareAuthorize
        title="Authorization"
        options={options}
        rows={rows(comparison.columns, comparison.horizonWeeks, comparison.untouched)}
        selected={selected}
        onSelect={(id) => setSelected(id as LeverColumnId)}
        verb={column?.verb ?? "Authorize"}
        onAuthorize={authorize}
        review={column ? `${column.effect} It goes on the Record, and its cost is charged now.` : undefined}
        baselineReview={comparison.waiting}
        busy={acts.busy}
        {...(projection ? { projection } : {})}
      />
      <p className="nation-note">Crude and the gallon are the world's markets run forward alone, other things held where they are today. The pump follows crude two to five weeks behind.</p>
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </>
  );
}
