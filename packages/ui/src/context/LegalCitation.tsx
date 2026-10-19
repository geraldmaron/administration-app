import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Pressable } from "../primitives/Button";
import { Text } from "../primitives/Text";

export type CitationView = {
  /** "50 U.S.C. §§1541–1548". */
  readonly cite: string;
  /** "War Powers Resolution". */
  readonly title: string;
};

/**
 * The law an act rests on, as a chip that opens its authority sheet
 * (DECISIONS §8.12). The citation is set in full and allowed to wrap, so the
 * player can look it up themselves; it is a reference read as prose, so it
 * takes the interface face rather than the copy-string monospace.
 */
export function LegalCitation({ citation, onPress, compact }: { readonly citation: CitationView; readonly onPress?: () => void; readonly compact?: boolean }) {
  const chip = { flexDirection: "row", alignItems: "center", gap: "xs", alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: "sm", paddingVertical: "2xs", borderWidth: 1, borderColor: "goldRule", borderRadius: "chip" } as const;
  const words = (pressable: boolean) => (
    <>
      <Icon name="law" size={14} tone="gold" weight="fill" />
      <View flexShrink={1}>
        <Text variant="caption" weight="strong" tabular>
          {citation.cite}
        </Text>
        {compact ? null : (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {citation.title}
          </Text>
        )}
      </View>
      {pressable ? <Icon name="chevron" size={14} tone="colorTertiary" /> : null}
    </>
  );
  if (!onPress) {
    // Set inside a card that is itself the door to the law, or where no sheet exists: a label, not a second control.
    return (
      <View {...chip} backgroundColor="surface" role="note" aria-label={`Law: ${citation.title}, ${citation.cite}`}>
        {words(false)}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} aria-label={`Law: ${citation.title}, ${citation.cite}. Open the law`} {...chip} backgroundColor={{ default: "surface", hover: "surfaceHover" }}>
      {words(true)}
    </Pressable>
  );
}
