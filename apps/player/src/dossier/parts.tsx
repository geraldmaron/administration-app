import { useState, type ReactNode } from "react";
import { CardGrid, Column, Text, View, type SpaceToken } from "@admin/ui";

/**
 * How many equal cards fit across the width the grid is actually given. The
 * screen's own width says nothing about a column inside it, so the grid
 * measures itself; until it has, it draws one column, which never bleeds.
 */
export function useFit(count: number, columnsFor: (width: number) => number) {
  const [width, setWidth] = useState(0);
  const most = width === 0 ? 1 : Math.max(1, Math.min(count, columnsFor(width)));
  // Rows as even as the width allows: five cards that fit four across draw as three and two, never four and a stray one.
  const columns = count === 0 ? 1 : Math.ceil(count / Math.ceil(count / most));
  const onLayout = (event: { readonly nativeEvent: { readonly layout: { readonly width: number } } }) => setWidth(Math.round(event.nativeEvent.layout.width));
  return { columns, onLayout };
}

/** Columns for cards at least `min` pixels wide, with the grid's gap between them. */
export const byMinimum = (min: number, gap: number) => (width: number) => Math.floor((width + gap) / (min + gap));

type FittedProps = {
  readonly children: ReactNode;
  readonly count: number;
  readonly columnsFor: (width: number) => number;
  readonly gap?: SpaceToken;
  readonly label: string;
};

/** Equal cards in rows that fill the width they are given: every card in a row the same size, and a short last row stretched to the edge. */
export function Fitted({ children, count, columnsFor, gap = "sm", label }: FittedProps) {
  const { columns, onLayout } = useFit(count, columnsFor);
  return (
    <View width="100%" onLayout={onLayout}>
      <CardGrid columns={{ phone: columns, tablet: columns, desktop: columns, wide: columns }} gap={gap} role="list" aria-label={label}>
        {children}
      </CardGrid>
    </View>
  );
}

/** One part of the file under a single heading, with an optional line on what it holds. */
export function FilePart({ title, note, children }: { readonly title: string; readonly note?: ReactNode; readonly children: ReactNode }) {
  return (
    <Column gap="md" role="region" aria-label={title} width="100%">
      <Column gap="2xs">
        <Text variant="title" role="heading" aria-level={2}>
          {title}
        </Text>
        {note ? (
          <Text variant="body" tone="secondary" maxWidth={760}>
            {note}
          </Text>
        ) : null}
      </Column>
      {children}
    </Column>
  );
}
