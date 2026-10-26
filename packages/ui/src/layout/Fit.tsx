import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "@tamagui/core";

// React Native has no container queries, and a component's shape should follow
// the room it is given, not the window: a reading in a narrow inspector is a
// row, the same reading on a wide stage is a tile with its history. So a
// component measures the box it sits in and picks its shape from that width.
// The viewport media still decide the frame (dock, rail, sheet).

/** The measured width, or undefined until the first layout. */
export function useMeasuredWidth(): readonly [number | undefined, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    // Whole pixels, so a subpixel reflow does not re-render every child.
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);
  return [width, onLayout] as const;
}

export type FitBreaks = { readonly regular: number; readonly wide: number };
export type FitSize = "compact" | "regular" | "wide";

/** The shape a width affords: under `regular` is compact, from `wide` up is wide. Before the first layout, regular. */
export function fitOf(width: number | undefined, breaks: FitBreaks): FitSize {
  if (width === undefined) return "regular";
  if (width < breaks.regular) return "compact";
  return width >= breaks.wide ? "wide" : "regular";
}

const FitContext = createContext<number | undefined>(undefined);

/** The width of the nearest `Fit` above, for a child that adapts to its container rather than measuring itself. */
export function useFitWidth(): number | undefined {
  return useContext(FitContext);
}

/** A box that measures itself and hands its width to everything inside. */
export function Fit({ children, ...props }: { readonly children: ReactNode } & React.ComponentProps<typeof View>) {
  const [width, onLayout] = useMeasuredWidth();
  return (
    <View {...props} onLayout={onLayout}>
      <FitContext.Provider value={width}>{children}</FitContext.Provider>
    </View>
  );
}
