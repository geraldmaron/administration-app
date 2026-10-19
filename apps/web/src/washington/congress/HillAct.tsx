import { useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import type { ActColumn, ActComparison, ModelingAct } from "@admin/player-core";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type Commission } from "../../nation/economy/commit";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { ActCompare } from "./ActCompare";
import type { ReviewTier } from "../../review/review-machine";
import "../../nation/economy/economy.css";

/**
 * One commit path for every act in the Washington rooms: the act committed
 * against the campaign the screen priced it on, and the receipt drawn in the
 * block that authorized it while the screen plays the delta lens.
 */
export function useHillCommit(campaign: Campaign) {
  const commit = useNationCommit(campaign);
  const [by, setBy] = useState<string | undefined>();
  return {
    ...commit,
    by,
    commitFrom: (block: string, commission: Commission) => {
      setBy(block);
      return commit.commit(commission);
    },
  };
}

export type HillCommit = ReturnType<typeof useHillCommit>;

/** The lines a receipt reads: the picked column, row by row, as the matrix priced it. */
function receiptLines(comparison: ActComparison, column: ActColumn): Commission["lines"] {
  return comparison.rows.flatMap((row) => {
    const lines = column.cells[row.key]?.lines ?? [];
    return lines.length > 0 ? [{ label: row.label, value: lines.join(". ") }] : [];
  });
}

/** The comparison's columns as a choice to project: an open column with the act it commits, a refused one with nothing to build. */
function hillChoice(title: string, comparison: ActComparison, act: (option: string) => ModelingAct | undefined) {
  return actsChoice(title, "doing nothing", "Doing nothing.", comparison.columns.map((column) => {
    if (column.refusal) return { id: column.id, label: column.label, refused: column.refusal };
    const built = act(column.id);
    return { id: column.id, label: column.label, ...(built ? { act: built } : {}) };
  }));
}

export type HillActProps = {
  /** Which block this is, so the receipt comes back to it. */
  readonly id: string;
  readonly title: string;
  readonly comparison: ActComparison;
  readonly acts: HillCommit;
  /** The packet the picked option commits, built at press time; a refusal throws in the engine's words. */
  readonly packet: (option: string) => EffectPacket;
  readonly again: string;
  readonly onAgain?: () => void;
  readonly tone?: "commit" | "danger";
  readonly pending?: (option: string) => string | undefined;
  readonly terms?: ReactNode;
  /** The receipt's headline; the picked option's label when absent. */
  readonly receiptTitle?: (column: ActColumn) => string;
  /** Each option's act as the projection builds it, the same call `packet` makes; absent, the list has no projection. */
  readonly projectAs?: { readonly campaign: Campaign; readonly act: (option: string) => ModelingAct | undefined };
  /** The presidential review this block's act gets; title, verb and terms are the picked column's own. */
  readonly tier: Exclude<ReviewTier, "none">;
};

export function HillAct({ id, title, comparison, acts, packet, again, onAgain, tone, pending, terms, receiptTitle, projectAs, tier }: HillActProps) {
  // A lone open option starts picked: a press that only picks it would be a step that decides nothing.
  const sole = comparison.columns.length === 1 && !comparison.columns[0]!.refusal ? comparison.columns[0]!.id : undefined;
  const [selected, setSelected] = useState<string | undefined>(sole);
  const projection = useChoiceProjection(projectAs?.campaign, projectAs ? hillChoice(title, comparison, projectAs.act) : undefined, selected);
  if (acts.committed && acts.by === id) {
    return (
      <ActReceipt
        committed={acts.committed}
        again={again}
        onAgain={() => {
          setSelected(sole);
          acts.dismiss();
          onAgain?.();
        }}
      />
    );
  }
  const column = comparison.columns.find((entry) => entry.id === selected);
  const waiting = selected === undefined ? undefined : pending?.(selected);
  const authorize = () => {
    if (!column || column.refusal || waiting) return;
    const lines = receiptLines(comparison, column);
    void acts.commitFrom(id, { title: receiptTitle?.(column) ?? column.label, lines, packet: () => packet(column.id), review: { tier, title: column.label, lines: [{ label: "What it does", value: column.review }, ...lines], verb: column.verb, danger: tone === "danger" } });
  };
  return (
    <>
      <ActCompare
        title={title}
        comparison={comparison}
        selected={selected}
        onSelect={setSelected}
        onAuthorize={authorize}
        busy={acts.busy}
        {...(tone ? { tone } : {})}
        {...(waiting ? { pending: waiting } : {})}
        terms={terms}
        {...(projection ? { projection } : {})}
      />
      {acts.problem && acts.by === id ? (
        <p className="hill-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </>
  );
}
