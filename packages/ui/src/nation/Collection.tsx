import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../primitives/Button";
import { Column } from "../primitives/Stack";
import { Text } from "../primitives/Text";

export type CollectionProps<T> = {
  readonly items: readonly T[];
  readonly render: (item: T, index: number) => ReactNode;
  /** How many show before "Show all"; every item is always one press away. */
  readonly initial?: number;
  /** The plural the count is said in: "states", "entries". */
  readonly noun: string;
  readonly empty?: string;
  /** Changing it folds the list back to its first page (a new sort, a new filter). */
  readonly resetKey?: string;
  readonly gap?: "2xs" | "xs" | "sm" | "md" | "lg";
  readonly label?: string;
};

/**
 * A full-data list that opens on its first page and says how many more
 * there are. Nothing is ever cut: "Show all" brings in every item, and the
 * count shown is always said.
 */
export function Collection<T>({ items, render, initial = 8, noun, empty, resetKey, gap = "sm", label }: CollectionProps<T>) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [resetKey]);
  if (items.length === 0) {
    return empty ? (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    ) : null;
  }
  const shown = open ? items : items.slice(0, initial);
  return (
    <Column gap={gap} role="list" aria-label={label}>
      {shown.map((item, index) => render(item, index))}
      {items.length > initial ? (
        <Button kind="quiet" size="compact" icon={open ? "chevron" : "expandPanel"} onPress={() => setOpen(!open)}>
          {open ? `Show the first ${initial}` : `Show all ${items.length} ${noun}`}
        </Button>
      ) : null}
    </Column>
  );
}
