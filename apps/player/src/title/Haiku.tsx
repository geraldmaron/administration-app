import { haikuLines, type HaikuId } from "@admin/player-core";
import { Column, Text } from "@admin/ui";

/** A haiku from the registry, three lines of ordinary text, so a screen reader reads it like any other words on the page. */
export function Haiku({ id, center = false }: { readonly id: HaikuId; readonly center?: boolean }) {
  return (
    <Column gap="2xs">
      {haikuLines(id).map((line) => (
        <Text key={line} variant="body" serif tone="secondary" center={center}>
          {line}
        </Text>
      ))}
    </Column>
  );
}
