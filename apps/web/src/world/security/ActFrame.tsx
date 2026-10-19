import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChoiceTable } from "@admin/player-core";
import { Button } from "@admin/ui-web";
import type { ReviewTier } from "../../review/review-machine";
import type { Commission, NationCommit } from "../../nation/economy/commit";
import { ChoiceCompare } from "../../nation/policy/ChoiceCompare";

export type ActFrameProps = {
  readonly title: string;
  /** The inputs the table is read from: a target, a reason. They sit above the comparison. */
  readonly children?: ReactNode;
  readonly table: ChoiceTable | undefined;
  readonly acts: NationCommit;
  readonly verb: (selected: string) => string;
  readonly tone?: "commit" | "danger";
  readonly review: (selected: string) => ReactNode;
  /** What happens on its own while nothing is picked, where that has a clock; absent, the table's own waiting line. */
  readonly baselineReview?: string;
  /** What to commit for the picked column, built on the campaign the table was priced on. */
  readonly commission: (selected: string) => Omit<Commission, "review">;
  /** The presidential review this desk's act gets: its title, verb and tone are the frame's own. */
  readonly tier: Exclude<ReviewTier, "none">;
  readonly onClose: () => void;
};

/** One act on the security desk: its inputs, every column read as its change from today, the one verb, and the way back. */
export function ActFrame({ title, children, table, acts, verb, tone = "commit", review, baselineReview, commission, tier, onClose }: ActFrameProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => heading.current?.focus({ preventScroll: false }), []);
  const picked = table?.columns.some((column) => column.id === selected) ? selected : undefined;
  return (
    <section className="security-act" aria-labelledby="security-act-title">
      <h2 id="security-act-title" ref={heading} tabIndex={-1} className="security-act__title">
        {title}
      </h2>
      {children ? <div className="composer">{children}</div> : null}
      {table ? (
        <ChoiceCompare
          title={table.columns.length > 1 ? "Compare the options" : "What it would do"}
          table={table}
          selected={picked}
          onSelect={setSelected}
          verb={verb(picked ?? table.columns[0]?.id ?? "")}
          tone={tone}
          onAuthorize={() => {
            if (picked === undefined) return;
            const built = commission(picked);
            const said = review(picked);
            // The review states the terms this desk showed; the commission's own title is the receipt's.
            const lines = [...(typeof said === "string" ? [{ label: "What it does", value: said }] : []), ...built.lines];
            void acts.commit({ ...built, review: { tier, title, lines, verb: verb(picked), danger: tone === "danger" } });
          }}
          review={picked === undefined ? undefined : review(picked)}
          {...(baselineReview ? { baselineReview } : {})}
          busy={acts.busy}
          docked
        />
      ) : (
        <p className="nation-note">This is no longer open.</p>
      )}
      {acts.problem ? (
        <p className="nation-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
      <Button kind="ghost" size="sm" onClick={onClose}>
        Back to the desk
      </Button>
    </section>
  );
}
