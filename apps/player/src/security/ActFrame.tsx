import { useState, type ReactNode } from "react";
import type { Authority, ChoiceTable } from "@admin/player-core";
import { Button, Column, Text } from "@admin/ui";
import { CompareAuthorize } from "@admin/ui/review";
import { choiceOptions, type Commission, type WorldActs } from "../world/acts";
import { LawChips, Problem } from "../world/parts";

export type ActFrameProps = {
  readonly title: string;
  /** The inputs the table is read from: a target, a reason. They sit above the comparison. */
  readonly children?: ReactNode;
  readonly table: ChoiceTable | undefined;
  readonly acts: WorldActs;
  readonly verb: (selected: string) => string;
  readonly tone?: "commit" | "danger";
  readonly review: (selected: string) => string;
  /** What to commit for the picked column, built on the campaign the table was priced on. */
  readonly commission: (selected: string) => Omit<Commission, "review">;
  /** The presidential review this desk's act gets. */
  readonly tier: "full" | "confirm";
  readonly law: readonly Authority[];
  readonly onClose: () => void;
};

/** One act on the security desk: its law, its inputs, every option as its change from today, the one verb, and the way back. */
export function ActFrame({ title, children, table, acts, verb, tone = "commit", review, commission, tier, law, onClose }: ActFrameProps) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const picked = table?.columns.some((column) => column.id === selected) ? selected : undefined;
  const first = table?.columns[0]?.id;
  const authorize = () => {
    if (!picked) return;
    const built = commission(picked);
    const said = review(picked);
    // The review states the terms this desk showed; the commission's own title is the receipt's.
    void acts.commit({ ...built, review: { tier, title, lines: [{ label: "What happens", value: said }, ...built.lines], verb: verb(picked), danger: tone === "danger" } });
  };
  return (
    <Column gap="lg">
      <LawChips authorities={law} />
      {children ? <Column gap="md">{children}</Column> : null}
      {table ? (
        <CompareAuthorize title={table.columns.length > 1 ? "Compare the options" : "What it would do"} options={choiceOptions(table, tone === "danger", law)} selected={picked} onSelect={setSelected} verb={verb(picked ?? first ?? "")} tone={tone} onAuthorize={authorize} {...(picked ? { review: review(picked) } : {})} {...(table.waiting ? { waiting: table.waiting } : {})} busy={acts.busy} />
      ) : (
        <Text variant="body" tone="secondary">This choice isn't open anymore.</Text>
      )}
      <Problem problem={acts.problem} />
      <Button kind="quiet" size="compact" icon="return" onPress={onClose}>
        Back to Security
      </Button>
    </Column>
  );
}
