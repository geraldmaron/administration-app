import type { ReactNode } from "react";
import { View } from "@tamagui/core";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** The ramp step that fills a disc of this diameter with initials, so a monogram scales by the type ramp rather than a size of its own. */
export function initialsVariant(size: number): "caption" | "label" | "title" | "heading" {
  return size >= 60 ? "heading" : size >= 48 ? "title" : size >= 32 ? "label" : "caption";
}

/**
 * A person as their initials on a disc: the redacted portrait a briefing
 * carries where a face is not drawn. Decorative; the name is always beside it.
 */
export function Monogram({ letters, size = 44, tone = "neutral" }: { readonly letters: string; readonly size?: number; readonly tone?: "neutral" | "accent" | "danger" | "gold" }) {
  const ring = tone === "accent" ? "accent" : tone === "danger" ? "danger" : tone === "gold" ? "goldRule" : "borderColorStrong";
  return (
    <View width={size} height={size} borderRadius="pill" borderWidth={2} borderColor={ring} backgroundColor="surfaceRaised" alignItems="center" justifyContent="center" aria-hidden>
      <Text variant={initialsVariant(size)} weight="strong" tone="secondary">
        {letters.slice(0, 3)}
      </Text>
    </View>
  );
}

/** One speaker's line: who, in what seat, and what they said, with an optional stance badge or link under the name and an optional drawn face in place of the initials. */
export function Voice({ letters, name, role, line, tag, tone, nameSlot, face }: { readonly letters: string; readonly name: string; readonly role?: string; readonly line: string; readonly tag?: ReactNode; readonly tone?: "neutral" | "accent" | "danger" | "gold"; readonly nameSlot?: ReactNode; readonly face?: ReactNode }) {
  return (
    <Row gap="md" top>
      {face ?? <Monogram letters={letters} tone={tone} />}
      <Column flex={1} gap="2xs" minWidth={0}>
        <Row gap="sm" wrap>
          {nameSlot ?? <Text variant="label">{name}</Text>}
          {role ? (
            <Text variant="caption" tone="secondary">
              {role}
            </Text>
          ) : null}
          {tag}
        </Row>
        <Text variant="body" serif>
          {line}
        </Text>
      </Column>
    </Row>
  );
}
