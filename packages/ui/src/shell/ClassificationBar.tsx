import { classification } from "@admin/design";
import { View } from "@tamagui/core";
import { ClassificationBanner, type ClassificationKey } from "../document/Classification";
import { Text } from "../primitives/Text";

export type ClassificationBarProps = {
  readonly level: ClassificationKey;
  /**
   * The top bar is the announced one; the bottom repeats the same words for
   * the eye and stays silent for assistive technology, as the printed page's
   * footer banner is a repeat rather than a second statement.
   */
  readonly edge: "top" | "bottom";
};

/**
 * The marking line across the top or bottom of every working screen. It
 * carries the engine's level for the most restrictive thing on the screen;
 * the words are always printed, so the color is never the only cue. An
 * unclassified screen gets one slim marking at the top, since a bottom repeat
 * would only take room from the work; anything above it keeps both banners.
 */
export function ClassificationBar({ level, edge }: ClassificationBarProps) {
  const unclassified = level === "unclassified";
  if (edge === "bottom") {
    if (unclassified) return null;
    return (
      <View aria-hidden>
        <ClassificationBanner level={level} decorative />
      </View>
    );
  }
  return (
    <View role="region" aria-label="Secrecy level of this screen" aria-live="polite">
      {unclassified ? <SlimMarking /> : <ClassificationBanner level={level} decorative />}
    </View>
  );
}

function SlimMarking() {
  const mark = classification.unclassified;
  return (
    <View height={18} backgroundColor={mark.fill} alignItems="center" justifyContent="center">
      <Text variant="code" caps color={mark.ink} center numberOfLines={1}>
        {mark.label}
      </Text>
    </View>
  );
}
