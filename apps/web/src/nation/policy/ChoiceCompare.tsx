import type { ReactNode } from "react";
import type { ChoiceCell, ChoiceMove, ChoiceRow, ChoiceTable, ChoiceTone } from "@admin/player-core";
import { CompareAuthorize, Movement, movementScale, type ChoiceProjection, type CompareOption, type CompareRow, type CompareVerdict, type IconBadgeTone, type IconName, type MovementValence } from "@admin/ui-web";

export type ChoiceLook = { readonly icon: IconName; readonly accent: IconBadgeTone };

const VALENCE: Readonly<Record<ChoiceTone, MovementValence>> = { favorable: "good", adverse: "bad", neutral: "neutral" };

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

const ACT_LOOK: ChoiceLook = { icon: "order", accent: "blue" };

/** One scale per movement label on a row, so the same bar length means the same amount in every column. */
function scalesOf(row: ChoiceRow): ReadonlyMap<string, number> {
  const byLabel = new Map<string, number[]>();
  for (const move of row.cells.flatMap((entry) => entry.moves ?? [])) byLabel.set(move.label ?? "", [...(byLabel.get(move.label ?? "") ?? []), move.value]);
  return new Map([...byLabel].map(([label, values]) => [label, movementScale(values)]));
}

function MovesView({ moves, scales }: { readonly moves: readonly ChoiceMove[]; readonly scales: ReadonlyMap<string, number> }) {
  return (
    <ul className="choice-moves">
      {moves.map((move) => (
        <li key={`${move.label ?? ""}${move.text}`}>
          <Movement {...(move.label ? { label: move.label } : {})} value={move.value} scale={scales.get(move.label ?? "") ?? 1} text={move.text} valence={VALENCE[move.tone]} />
        </li>
      ))}
    </ul>
  );
}

function CellView({ cell, scales }: { readonly cell: ChoiceCell | undefined; readonly scales: ReadonlyMap<string, number> }) {
  if (!cell) return null;
  if (cell.moves && cell.moves.length > 0) return <MovesView moves={cell.moves} scales={scales} />;
  return (
    <span className="choice-cell" data-tone={cell.tone}>
      {cell.text}
    </span>
  );
}

/** A column's headline: how many of its moves go each way. */
function verdictOf(table: ChoiceTable, index: number): readonly CompareVerdict[] {
  const moves = table.rows.flatMap((row) => row.cells[index]?.moves ?? []);
  const good = moves.filter((move) => move.tone === "favorable").length;
  const bad = moves.filter((move) => move.tone === "adverse").length;
  if (good === 0 && bad === 0) return [{ text: "No measured moves", valence: "neutral", icon: "neutral" }];
  return [
    ...(good > 0 ? [{ text: `${good} in your favor`, valence: "good", icon: "favorable" } as const] : []),
    ...(bad > 0 ? [{ text: `${bad} against you`, valence: "bad", icon: "adverse" } as const] : []),
  ];
}

export type ChoiceCompareProps = {
  readonly title: string;
  readonly table: ChoiceTable;
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  readonly verb: string;
  readonly onAuthorize: () => void;
  readonly review?: ReactNode;
  readonly baselineReview?: ReactNode;
  readonly busy?: boolean;
  readonly tone?: "commit" | "danger";
  /** Docks the verb in the surface's foot, so on a phone it stays in the thumb's reach beside a long comparison. */
  readonly docked?: boolean;
  /** A column's character where the screen knows it (force, accord, statute); absent, an act is blue. */
  readonly looks?: Readonly<Record<string, ChoiceLook>>;
  /** A forward projection of the columns, where the screen can run one. */
  readonly projection?: ChoiceProjection;
};

/** A player-core choice table drawn as the one compare-and-authorize pattern: every column a card on the same rows, the table's waiting line beside them. */
export function ChoiceCompare({ table, looks, baselineReview, ...rest }: ChoiceCompareProps) {
  const options: readonly CompareOption[] = table.columns.map((column, index) => ({
    id: column.id,
    label: column.label,
    ...(looks?.[column.id] ?? ACT_LOOK),
    verdict: verdictOf(table, index),
    ...(column.locked ? { unavailable: column.locked } : {}),
  }));
  const rows: readonly CompareRow[] = table.rows.map((row) => {
    const scales = scalesOf(row);
    const icon = ROW_ICONS[row.id];
    return {
      label: row.label,
      ...(row.kind ? { kind: row.kind } : {}),
      ...(icon ? { icon } : {}),
      cells: Object.fromEntries(table.columns.map((column, index) => [column.id, <CellView key={column.id} cell={row.cells[index]} scales={scales} />])),
    };
  });
  const waiting = baselineReview ?? table.waiting;
  return <CompareAuthorize options={options} rows={rows} {...rest} {...(waiting ? { baselineReview: waiting } : {})} />;
}
