import { classification, type ClassificationKey } from "@admin/design";
import { View } from "@tamagui/core";
import { Text } from "../primitives/Text";

export type { ClassificationKey } from "@admin/design";

/** The engine's level names (`ClassificationLevel`) to the banner set. */
export function classificationKey(level: string): ClassificationKey {
  switch (level.toUpperCase()) {
    case "TOP SECRET//SCI":
      return "topSecretSci";
    case "TOP SECRET":
      return "topSecret";
    case "SECRET":
      return "secret";
    case "CONFIDENTIAL":
      return "confidential";
    case "CUI":
      return "cui";
    default:
      return "unclassified";
  }
}

/**
 * The banner line at the top and bottom of a classified document, in the
 * convention U.S. agencies use (DECISIONS §8.11). The color is the
 * convention's; the words are always there, so the level never rests on
 * color alone.
 */
export function ClassificationBanner({
  level,
  caveat,
  decorative = false,
}: {
  readonly level: ClassificationKey;
  readonly caveat?: string;
  /** Set where a wrapper already carries the semantics, so the level is not announced twice. */
  readonly decorative?: boolean;
}) {
  const mark = classification[level];
  const words = caveat ? `${mark.label}//${caveat}` : mark.label;
  const semantics = decorative ? {} : { role: "note" as const, "aria-label": `Classification: ${words}` };
  return (
    <View backgroundColor={mark.fill} paddingVertical="2xs" paddingHorizontal="sm" alignItems="center" {...semantics}>
      <Text variant="caption" weight="strong" caps color={mark.ink} center>
        {words}
      </Text>
    </View>
  );
}

/** A paragraph's own marking where it differs from the banner: "(S)", "(TS)". */
export function PortionMark({ level }: { readonly level: ClassificationKey }) {
  const mark = classification[level];
  return (
    <Text variant="caption" weight="strong" mono color="color" aria-label={`Portion marked ${mark.label}`}>
      ({mark.portion}){" "}
    </Text>
  );
}
