import type { ChoiceCell, ChoiceMove, ChoiceRow, ChoiceTable, ChoiceTone } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import { Column, Row, Text } from "@admin/ui";
import { Diverging, type ChoiceOptionView, type ChoiceRowView, type ChoiceVerdict } from "@admin/ui/nation";

export type ChoiceLook = { readonly icon: IconName };

const TONE_TEXT = { favorable: "success", adverse: "danger", neutral: "primary" } as const;
const TONE_TRACK = { favorable: "good", adverse: "bad", neutral: "neutral" } as const;

/** The glyph for a row the builders share; a row with an id of its own reads by its name alone. */
const ROW_ICONS: Readonly<Record<string, IconName>> = {
  cost: "budget",
  now: "budget",
  enactment: "sign",
  "per-week": "schedule",
  bill: "schedule",
  debt: "domesticLedger",
  resting: "economyGrowth",
  effects: "graph",
  politics: "layerLean",
  alignment: "layerLean",
  objects: "reject",
  bites: "pending",
  lands: "pending",
  lapses: "pending",
  pledges: "flag",
  chair: "building",
  reach: "mapPin",
  states: "mapPin",
  challenge: "court",
  review: "law",
  opens: "open",
};

/** One scale per movement label on a row, so the same bar length means the same amount in every column. */
function scalesOf(row: ChoiceRow): ReadonlyMap<string, number> {
  const byLabel = new Map<string, number>();
  for (const move of row.cells.flatMap((entry) => entry.moves ?? [])) {
    const key = move.label ?? "";
    byLabel.set(key, Math.max(byLabel.get(key) ?? Number.EPSILON, Math.abs(move.value)));
  }
  return byLabel;
}

function Moves({ moves, scales }: { readonly moves: readonly ChoiceMove[]; readonly scales: ReadonlyMap<string, number> }) {
  return (
    <Column gap="2xs">
      {moves.map((move) => (
        <Column key={`${move.label ?? ""}${move.text}`} gap="2xs">
          {move.label ? (
            <Text variant="caption" tone="secondary">
              {move.label}
            </Text>
          ) : null}
          <Row gap="xs">
            <Diverging value={move.value} scale={scales.get(move.label ?? "") ?? 1} tone={TONE_TRACK[move.tone]} />
            <Text variant="caption" weight="strong" tone={TONE_TEXT[move.tone]} minWidth={56} textAlign="right">
              {move.text}
            </Text>
          </Row>
        </Column>
      ))}
    </Column>
  );
}

function Cell({ cell, scales }: { readonly cell: ChoiceCell | undefined; readonly scales: ReadonlyMap<string, number> }) {
  if (!cell) return null;
  if (cell.moves && cell.moves.length > 0) return <Moves moves={cell.moves} scales={scales} />;
  return (
    <Text variant="label" weight="regular" tone={TONE_TEXT[cell.tone]}>
      {cell.text}
    </Text>
  );
}

/** A column's headline: how many of its moves go each way. */
function verdictOf(table: ChoiceTable, index: number): readonly ChoiceVerdict[] {
  const moves = table.rows.flatMap((row) => row.cells[index]?.moves ?? []);
  const count = (tone: ChoiceTone) => moves.filter((move) => move.tone === tone).length;
  const good = count("favorable");
  const bad = count("adverse");
  if (good === 0 && bad === 0) return [{ text: "No changes we can measure", tone: "neutral" }];
  return [...(good > 0 ? [{ text: `${good} in your favor`, tone: "good" as const }] : []), ...(bad > 0 ? [{ text: `${bad} against you`, tone: "bad" as const }] : [])];
}

/** A player-core choice table as the compare-and-authorize pattern's options, rows and waiting line. */
export function choiceView(table: ChoiceTable, looks?: Readonly<Record<string, ChoiceLook>>): { readonly options: readonly ChoiceOptionView[]; readonly rows: readonly ChoiceRowView[]; readonly waiting?: string } {
  const options = table.columns.map((column, index): ChoiceOptionView => ({
    id: column.id,
    label: column.label,
    icon: looks?.[column.id]?.icon ?? "order",
    verdict: verdictOf(table, index),
    ...(column.locked ? { unavailable: column.locked } : {}),
  }));
  const rows = table.rows.map((row): ChoiceRowView => {
    const scales = scalesOf(row);
    const icon = ROW_ICONS[row.id];
    return {
      id: row.id,
      label: row.label,
      ...(row.kind === "lead" ? { lead: true } : {}),
      ...(icon ? { icon } : {}),
      cells: Object.fromEntries(table.columns.map((column, index) => [column.id, <Cell key={column.id} cell={row.cells[index]} scales={scales} />])),
    };
  });
  return { options, rows, ...(table.waiting ? { waiting: table.waiting } : {}) };
}
