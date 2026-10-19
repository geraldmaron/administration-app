import type { ReactNode } from "react";
import type { Campaign, MetricSet } from "@admin/engine";
import { COST_FREE, METRIC_SHORT, bandEffect, moneyCost, type ChoiceEffect, type PricedOption, type ShortlistCell, type ShortlistRow } from "@admin/player-core";
import { CompareAuthorize, Portrait, type ButtonKind, type ChoiceOutcomeView, type ChoiceProjection, type CompareOption, type IconName } from "@admin/ui-web";
import { ComparisonCellView } from "../../decision/cells";
import { faceOf } from "../../media/faces";
import { valenceOf } from "../../shell/valence";

const ROW_ICONS: Readonly<Record<string, IconName>> = { competence: "review", loyalty: "approve" };

/** A reading that is not a price, an odds or a move, said the way the opened row lists it. */
function lineOf(campaign: Campaign, cell: ShortlistCell): ReactNode {
  switch (cell.kind) {
    case "band":
      return (
        <span className="ui-valence-ink" data-valence={valenceOf(cell.judgment.stance)}>
          {cell.judgment.word}
        </span>
      );
    default:
      return <ComparisonCellView campaign={campaign} cell={cell} />;
  }
}

function effectOf(row: ShortlistRow, cell: ShortlistCell): ChoiceEffect | undefined {
  if (cell.kind !== "impact") return undefined;
  const domain = row.id.slice("effect:".length);
  return bandEffect(row.id, domain in METRIC_SHORT ? METRIC_SHORT[domain as keyof MetricSet] : row.label, cell.impact, cell.favorable);
}

const wordsOf = (cell: ShortlistCell | undefined): string | undefined => (cell?.kind === "lines" ? cell.lines.join("; ") : cell?.kind === "none" || cell?.kind === "text" ? cell.text : undefined);

/**
 * One option as a results row, read off the engine's priced rows: its money
 * is the cost, its banded moves the effects, what follows the worst case, and
 * the person's readings (competence, loyalty) the opened detail.
 */
function outcomeOf(campaign: Campaign, rows: readonly ShortlistRow[], index: number): ChoiceOutcomeView {
  const money = rows.map((row) => row.cells[index]!).find((cell) => cell.kind === "money");
  const chance = rows.map((row) => row.cells[index]!).find((cell) => cell.kind === "chance");
  const effects = rows.flatMap((row) => effectOf(row, row.cells[index]!) ?? []);
  const follows = wordsOf(rows.find((row) => row.id === "follows")?.cells[index]);
  const details = rows
    .filter((row) => row.id !== "follows" && !row.id.startsWith("effect:"))
    .map((row) => ({ label: row.label, text: lineOf(campaign, row.cells[index]!), ...(ROW_ICONS[row.id] ? { icon: ROW_ICONS[row.id]! } : {}) }));
  return {
    cost: money?.kind === "money" ? moneyCost(money.amount) : COST_FREE,
    ...(chance?.kind === "chance" ? { odds: { share: chance.chance, word: chance.text } } : {}),
    effects,
    ...(follows && follows !== "Nothing further" ? { worstCase: follows } : {}),
    details,
  };
}

export type PricedCompareProps = {
  readonly campaign: Campaign;
  readonly title: string;
  readonly options: readonly (PricedOption & { readonly person?: string })[];
  readonly rows: readonly ShortlistRow[];
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
  readonly verb: string;
  readonly onAuthorize: () => void;
  readonly review: (option: PricedOption) => ReactNode;
  /** What happens on its own while nothing is picked, where that has a clock. */
  readonly baselineReview?: string;
  readonly busy: boolean;
  readonly tone?: Extract<ButtonKind, "commit" | "danger">;
  readonly projection?: ChoiceProjection;
};

/** Every act on a chair: the options as a results list on the same priced readings, one named verb. */
export function PricedCompare({ campaign, title, options, rows, selected, onSelect, verb, onAuthorize, review, baselineReview, busy, tone, projection }: PricedCompareProps) {
  const picked = options.find((option) => option.id === selected);
  const specs: readonly CompareOption[] = options.map((option, index) => {
    const face = option.person ? faceOf(campaign, option.person, option.label) : undefined;
    return {
      id: option.id,
      label: option.label,
      ...(face ? { mark: <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="sm" decorative /> } : {}),
      ...(option.unavailable ? { unavailable: `Not available: ${option.unavailable}` } : {}),
      outcome: outcomeOf(campaign, rows, index),
    };
  });
  return (
    <CompareAuthorize
      title={title}
      options={specs}
      rows={[]}
      selected={selected}
      onSelect={onSelect}
      verb={verb}
      onAuthorize={onAuthorize}
      review={picked ? review(picked) : undefined}
      {...(baselineReview ? { baselineReview } : {})}
      busy={busy}
      {...(tone ? { tone } : {})}
      {...(projection ? { projection } : {})}
    />
  );
}
