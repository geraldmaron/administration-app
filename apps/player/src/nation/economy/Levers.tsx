import { useMemo, useState, type ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { leverComparison, marketLeverAct, marketLevers, type LeverColumn, type LeverColumnId, type LeverOutlook } from "@admin/player-core";
import { Column, Icon, Row, Text } from "@admin/ui";
import { CompareChoices, type ChoiceRowView, type ChoiceVerdict } from "@admin/ui/nation";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct } from "../act";

/** A projected price, and how far it sits from where it goes with no lever pulled, in words and an arrow. */
function Outlook({ value, figure, untouched }: { readonly value: number | undefined; readonly figure: string | undefined; readonly untouched: number | undefined }): ReactNode {
  if (value === undefined || figure === undefined) return "Not available";
  if (untouched === undefined || Math.abs(value / untouched - 1) < 0.0005) return figure;
  const lower = value < untouched;
  return (
    <Column>
      <Text variant="label">{figure}</Text>
      <Text variant="caption" tone={lower ? "success" : "danger"}>
        {lower ? "▼ −" : "▲ +"}
        {(Math.abs(value / untouched - 1) * 100).toFixed(1)}% against no lever
      </Text>
    </Column>
  );
}

function Lines({ lines, none }: { readonly lines: readonly string[]; readonly none: string }): ReactNode {
  if (lines.length === 0) return none;
  return (
    <Column gap="2xs">
      {lines.map((line) => (
        <Row key={line} gap="xs" top>
          <Icon name="caution" size={14} tone="warningInk" />
          <Text variant="caption" flex={1}>
            {line}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

function rows(columns: readonly LeverColumn[], weeks: number, untouched: LeverOutlook): readonly ChoiceRowView[] {
  const each = (cell: (column: LeverColumn) => ReactNode) => Object.fromEntries(columns.map((column) => [column.id, cell(column)]));
  return [
    { id: "does", label: "What it does", lead: true, cells: each((column) => column.effect) },
    { id: "cost", label: "What it costs now", icon: "budget", cells: each((column) => (column.cost.length > 0 ? column.cost.join("; ") : "Nothing")) },
    { id: "crude", label: `Crude oil in ${weeks} weeks`, icon: "commodityCrudeOil", cells: each((column) => <Outlook value={column.outlook?.crude} figure={column.outlook?.crudeFigure} untouched={untouched.crude} />) },
    { id: "pump", label: `Gas per gallon in ${weeks} weeks`, icon: "commodityRefinedFuel", cells: each((column) => <Outlook value={column.outlook?.pump} figure={column.outlook?.pumpFigure} untouched={untouched.pump} />) },
    { id: "risks", label: "Risks", icon: "caution", cells: each((column) => <Lines lines={column.risks} none="None expected" />) },
  ];
}

/** A lever's row verdict: the gallon in the outlook's weeks against no lever, the one price a household feels. */
function verdictOf(column: LeverColumn, untouched: LeverOutlook): readonly ChoiceVerdict[] {
  if (!column.outlook) return [];
  const change = column.outlook.pump / untouched.pump - 1;
  if (Math.abs(change) < 0.0005) return [{ text: "Gas about the same", tone: "neutral" }];
  return [{ text: `Gas ${change < 0 ? "−" : "+"}${(Math.abs(change) * 100).toFixed(1)}%`, tone: change < 0 ? "good" : "bad" }];
}

/**
 * The President's market levers (DECISIONS §8.13): every lever priced and
 * projected off the packet its commit applies, a refused lever still read
 * with the law that withholds it, then the receipt.
 */
export function Levers({ campaign }: { readonly campaign: Campaign }) {
  const comparison = useMemo(() => leverComparison(campaign), [campaign]);
  const keys = useMemo(() => marketLevers(campaign).map((lever) => lever.key), [campaign]);
  const [selected, setSelected] = useState<LeverColumnId | undefined>(undefined);
  const acts = useNationAct(campaign);
  const column = comparison.columns.find((entry) => entry.id === selected);
  if (acts.done) return <Column gap="lg">{acts.layer}<ActDone done={acts.done} backLabel="Compare the choices again" onBack={() => { setSelected(undefined); acts.dismiss(); }} /></Column>;
  const authorize = () => {
    const key = keys.find((entry) => entry === selected);
    if (!key || !column) return;
    const lines = [
      { label: "What it does", value: column.effect },
      { label: "What it cost", value: column.cost.length > 0 ? column.cost.join("; ") : "Nothing now" },
    ];
    void acts.run(
      () => {
        const act = marketLeverAct(campaign, key);
        if (!act.ok) throw new Error(act.reason);
        return { packet: act.packet, title: column.label, lines };
      },
      { tier: "confirm", title: column.label, lines, verb: column.verb ?? "Authorize" },
    );
  };
  return (
    <Column gap="sm">
      {acts.layer}
      <CompareChoices
        title="What you can do about prices"
        options={comparison.columns.map((entry) => ({ id: entry.id, label: entry.label, icon: "instrumentEconomic", ...(entry.refusal ? { unavailable: `Not available right now. ${entry.refusal}` } : { verdict: verdictOf(entry, comparison.untouched) }) }))}
        rows={rows(comparison.columns, comparison.horizonWeeks, comparison.untouched)}
        selected={selected}
        onSelect={(id) => setSelected(id as LeverColumnId)}
        verb={column?.verb ?? "Authorize"}
        onAuthorize={authorize}
        {...(column ? { review: `${column.effect} This goes in the Record, and you pay its cost now.` } : {})}
        waiting={comparison.waiting}
        busy={acts.busy}
        footnote={<Text variant="caption" tone="tertiary">These estimates show where prices go if nothing else changes, against where they go with no lever pulled. Gas prices at the pump follow crude oil, usually 2 to 5 weeks later.</Text>}
      />
      <ActProblem problem={acts.problem} />
    </Column>
  );
}
