import { View } from "@tamagui/core";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { Seal } from "./Seal";
import type { SealSpec } from "./types";

export type MastheadProps = {
  /** The outlet's emblem; its nameplate decides the face, the case and the rules. */
  readonly spec: SealSpec;
  readonly name: string;
  /** A plain-words reading of where the outlet stands, set small under the rule. */
  readonly lean?: string;
  /** `compact` for a feed row; `full` heads an article or the outlet's page. */
  readonly size?: "compact" | "full";
};

const RULE = { double: 3, single: 1, thick: 4 } as const;

/**
 * An outlet's nameplate: a small device, the name set in the house face
 * between rules, and its tagline. Ink comes from the theme so a masthead
 * reads on light and dark ground; the device keeps the outlet's colors.
 */
export function Masthead({ spec, name, lean, size = "full" }: MastheadProps) {
  const plate = spec.nameplate ?? { face: "serif" as const, caps: false, rule: "single" as const };
  const full = size === "full";
  const rule = RULE[plate.rule];
  const tagline = spec.accents?.motto;
  return (
    <Column gap="xs" role="heading" aria-level={2} aria-label={name}>
      <View height={rule} borderTopWidth={plate.rule === "double" ? 1 : rule} borderBottomWidth={plate.rule === "double" ? 1 : 0} borderColor="color" />
      <Row gap="sm">
        <Seal spec={spec} size={full ? 44 : 28} />
        <Text
          variant={full ? "display" : "title"}
          serif={plate.face === "serif"}
          weight="strong"
          caps={plate.caps}
          numberOfLines={1}
          flexShrink={1}
        >
          {name}
        </Text>
      </Row>
      <View height={1} backgroundColor="color" />
      {full && (tagline || lean) ? (
        <Row between gap="sm">
          {tagline ? (
            <Text variant="caption" tone="secondary" serif={plate.face === "serif"} fontStyle="italic">
              {tagline}
            </Text>
          ) : null}
          {lean ? (
            <Text variant="eyebrow" tone="tertiary">
              {lean}
            </Text>
          ) : null}
        </Row>
      ) : null}
    </Column>
  );
}
