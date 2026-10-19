import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EffectPacket } from "@admin/engine";
import type { ActColumn, ActComparison } from "@admin/player-core";
import { ActCompare } from "../../washington/congress/ActCompare";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type Commission, type NationCommit } from "../../nation/economy/commit";
import "../../washington/congress/congress.css";
import "../../nation/economy/economy.css";
import "./set.css";

/** The lines a receipt reads: the picked column, row by row, as the matrix priced it. */
function receiptLines(comparison: ActComparison, column: ActColumn): Commission["lines"] {
  return comparison.rows.flatMap((row) => {
    const lines = column.cells[row.key]?.lines ?? [];
    // Lines are sentences already; a second stop between two of them reads as a typo.
    return lines.length > 0 ? [{ label: row.label, value: lines.map((line) => line.replace(/\.$/, "")).join(". ") }] : [];
  });
}

export type SetActProps = {
  readonly title: string;
  readonly comparison: ActComparison;
  readonly acts: NationCommit;
  /** The packet the picked option commits, built at press time; a refusal throws in the engine's words. */
  readonly packet: (option: string) => EffectPacket;
  readonly receiptTitle: (column: ActColumn) => string;
  readonly tone?: "commit" | "danger";
  readonly terms?: ReactNode;
  /** What the picked option still needs from the President before its verb is live. */
  readonly pending?: (option: string) => string | undefined;
};

/**
 * One act on a set, its options read as changes from today. The receipt is not drawn
 * here: the act may remove the very block that offered it (leaving a war
 * ends the war's act), so the screen draws it at the head of the panel.
 */
export function SetAct({ title, comparison, acts, packet, receiptTitle, tone, terms, pending }: SetActProps) {
  // A lone open option starts picked: a press that only picks it would be a step that decides nothing.
  const sole = comparison.columns.length === 1 && !comparison.columns[0]!.refusal ? comparison.columns[0]!.id : undefined;
  const [selected, setSelected] = useState<string | undefined>(sole);
  const column = comparison.columns.find((entry) => entry.id === selected);
  const waiting = selected === undefined ? undefined : pending?.(selected);
  const authorize = () => {
    if (!column || column.refusal || waiting) return;
    setSelected(sole);
    const lines = receiptLines(comparison, column);
    // Treaties and war are never routine: every act on a set gets the full presidential review.
    void acts.commit({ title: receiptTitle(column), lines, packet: () => packet(column.id), review: { tier: "full", title: column.label, lines: [{ label: "What it does", value: column.review }, ...lines], verb: column.verb, danger: tone === "danger" } });
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
      />
      {acts.problem ? (
        <p className="set-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </>
  );
}

/** The receipt of the screen's last act, brought into view at the head of the panel so it is the next thing seen and heard. */
export function ActsReceipt({ acts, again }: { readonly acts: NationCommit; readonly again: string }) {
  const root = useRef<HTMLDivElement | null>(null);
  const committed = acts.committed;
  useEffect(() => {
    if (!committed) return;
    root.current?.scrollIntoView({ block: "start" });
    root.current?.focus({ preventScroll: true });
  }, [committed]);
  if (!committed) return null;
  return (
    <div className="set-receipt" ref={root} tabIndex={-1}>
      <ActReceipt committed={committed} again={again} onAgain={acts.dismiss} />
    </div>
  );
}

export { useNationCommit };
