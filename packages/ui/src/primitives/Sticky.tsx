import type { ReactNode } from "react";
import { View } from "@tamagui/core";

export type StickyProps = {
  readonly children: ReactNode;
  readonly top?: number;
  readonly width?: number | `${number}%`;
  /** Height the page keeps for its own fixed bars above and below the scroller, so the panel's foot is never hidden behind them. */
  readonly reserve?: number;
};

/** A side panel that stays beside a long list while it scrolls; the web file pins it, a phone shows it where it sits. */
export function Sticky({ children, width }: StickyProps) {
  return <View width={width}>{children}</View>;
}
