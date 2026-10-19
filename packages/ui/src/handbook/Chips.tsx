import { Pressable } from "../primitives/Button";
import { Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import type { NamedRef } from "./types";

/**
 * A row of named things the reader can open: related terms, the next
 * explainer. Without `onOpen` they are plain labels, so a chip never promises
 * a door it lacks.
 */
export function ChipRow({ items, onOpen, selected, label }: { readonly items: readonly NamedRef[]; readonly onOpen?: (id: string) => void; readonly selected?: string; readonly label: string }) {
  return (
    <Row gap="xs" wrap role="list" aria-label={label}>
      {items.map((item) => {
        const on = item.id === selected;
        return (
          <Pressable
            key={item.id}
            role={onOpen ? "button" : "listitem"}
            aria-label={onOpen ? `${item.label}${on ? ", open" : ""}` : item.label}
            aria-expanded={selected === undefined ? undefined : on}
            disabled={!onOpen}
            onPress={onOpen ? () => onOpen(item.id) : undefined}
            paddingHorizontal="sm"
            paddingVertical="2xs"
            borderRadius="pill"
            borderWidth={1}
            borderColor={on ? "accent" : "borderColorStrong"}
            backgroundColor={on ? "infoFill" : { default: "surface", hover: "surfaceHover" }}
          >
            <Text variant="caption" weight="strong" tone={onOpen ? "accent" : "secondary"}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
