import { Children, type ReactNode } from "react";
import { space } from "@admin/design";
import { View, useMedia } from "@tamagui/core";

export type CardGridColumns = { readonly phone?: number; readonly tablet?: number; readonly desktop?: number; readonly wide?: number };

const DEFAULT_COLUMNS = { phone: 1, tablet: 2, desktop: 3, wide: 3 } as const;

/** A step of the 4-point space scale. */
export type SpaceToken = keyof typeof space;

export type CardGridProps = {
  readonly children: ReactNode;
  readonly columns?: CardGridColumns;
  /** Space between cells, a space token; each cell carries half of it as padding so the grid stays flush with its container. */
  readonly gap?: SpaceToken;
  readonly role?: "list" | "group" | "region" | "radiogroup";
  readonly "aria-label"?: string;
};

/**
 * Cards in equal columns for the width: every cell in a row is the same height
 * and a short last row stretches to fill the width instead of leaving a hole.
 * A cell's card must itself grow (`flexGrow={1}`) so its border follows the
 * row's tallest card; its own content can pin a footer to the bottom with a
 * growing spacer so readings line up across the row.
 */
export function CardGrid({ children, columns, gap = "md", role, "aria-label": label }: CardGridProps) {
  const media = useMedia();
  const set = { ...DEFAULT_COLUMNS, ...columns };
  const count = media.wide ? set.wide : media.desktop ? set.desktop : media.tablet ? set.tablet : set.phone;
  const half = space[gap] / 2;
  return (
    <View flexDirection="row" flexWrap="wrap" alignItems="stretch" marginHorizontal={-half} marginVertical={-half} role={role} aria-label={label}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} flexDirection="column" flexGrow={1} flexShrink={1} flexBasis={`${100 / count}%`} minWidth={0} padding={half}>
          {child}
        </View>
      ))}
    </View>
  );
}
