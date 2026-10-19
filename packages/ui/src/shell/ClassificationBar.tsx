import { View } from "@tamagui/core";
import { ClassificationBanner, type ClassificationKey } from "../document/Classification";

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
 * the words are always printed, so the color is never the only cue.
 */
export function ClassificationBar({ level, edge }: ClassificationBarProps) {
  if (edge === "bottom") {
    return (
      <View aria-hidden>
        <ClassificationBanner level={level} decorative />
      </View>
    );
  }
  return (
    <View role="region" aria-label="Secrecy level of this screen" aria-live="polite">
      <ClassificationBanner level={level} decorative />
    </View>
  );
}
