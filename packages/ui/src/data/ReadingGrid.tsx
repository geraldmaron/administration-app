import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { CardGrid } from "../primitives/CardGrid";
import { Row } from "../primitives/Stack";

/**
 * Readings in equal columns. Each sits in its own row so a reading that grows
 * with its row never collapses inside a grid cell's column.
 */
export function ReadingGrid({ children, max = 3 }: { readonly children: ReactNode; readonly max?: number }) {
  const items = Children.toArray(children);
  const count = Math.min(Math.max(1, items.length), max);
  return (
    <CardGrid columns={{ phone: Math.min(count, 2), tablet: count, desktop: count, wide: count }} gap="lg">
      {items.map((item, index) => (
        <Row key={index} flexGrow={1} alignItems="flex-start">
          {isValidElement(item) ? cloneElement(item as ReactElement<{ minWidth?: number }>, { minWidth: 0 }) : item}
        </Row>
      ))}
    </CardGrid>
  );
}
