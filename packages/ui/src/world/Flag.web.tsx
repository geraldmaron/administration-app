import { Image } from "react-native";
import { View } from "@tamagui/core";
import type { FlagProps, FlagSource } from "./Flag";

export type { FlagProps, FlagSource } from "./Flag";

/**
 * The web draws the same vendored SVG as an image: the browser's own SVG
 * renderer reads every construct the artwork uses (markers, clip paths), so
 * the flag is exactly the file.
 */
export function Flag({ name, source, height = 20, decorative = false }: FlagProps) {
  const width = Math.round(height * 1.5);
  const label = decorative ? undefined : source ? `Flag of ${name}` : `${name} (no flag available)`;
  return (
    <View
      width={width}
      height={height}
      borderWidth={1}
      borderColor="borderColor"
      borderRadius={2}
      overflow="hidden"
      backgroundColor="backgroundStrong"
      {...(label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true })}
    >
      {source ? <Image source={source as FlagSource as never} style={{ width, height }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}
