import { View } from "@tamagui/core";
import type { StickyProps } from "./Sticky";

export function Sticky({ children, top = 16, width, reserve = 0 }: StickyProps) {
  return (
    <View width={width} alignSelf="flex-start" style={{ position: "sticky", top, maxHeight: `calc(100vh - ${top * 2 + reserve}px)`, overflowY: "auto" }}>
      {children}
    </View>
  );
}
