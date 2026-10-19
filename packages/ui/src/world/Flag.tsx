import { Image } from "react-native";
import { SvgUri } from "react-native-svg";
import { View } from "@tamagui/core";

export type FlagSource = number | { readonly uri: string };

export type FlagProps = {
  /** The place the flag belongs to: "Japan". */
  readonly name: string;
  /** The vendored artwork, as a bundled asset or a URL. Absent, a plain field stands in and says so. */
  readonly source?: FlagSource;
  /** Height in pixels; the box is always 3:2 so rows keep their rhythm. */
  readonly height?: number;
  /** A flag beside the place's own name adds nothing for a screen reader. */
  readonly decorative?: boolean;
};

function uriOf(source: FlagSource): string | undefined {
  return typeof source === "number" ? Image.resolveAssetSource(source)?.uri : source.uri;
}

/**
 * A real flag in a 3:2 box with a hairline, so a white field still reads as a
 * flag on white. On a device the vendored SVG is drawn by react-native-svg.
 */
export function Flag({ name, source, height = 20, decorative = false }: FlagProps) {
  const width = Math.round(height * 1.5);
  const uri = source === undefined ? undefined : uriOf(source);
  const label = decorative ? undefined : uri ? `Flag of ${name}` : `${name} (no flag available)`;
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
      {uri ? <SvgUri uri={uri} width={width} height={height} preserveAspectRatio="xMidYMid slice" /> : null}
    </View>
  );
}
