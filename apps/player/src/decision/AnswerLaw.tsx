import { Column, LegalCitation, Text } from "@admin/ui";
import type { AnswerAuthority } from "./authority";

/** The law an answer rests on or runs into, each citation opening its record (DECISIONS §8.12). */
export function AnswerLaw({ cited, onOpen }: { readonly cited: readonly AnswerAuthority[]; readonly onOpen: (cite: string) => void }) {
  return (
    <Column gap="xs">
      {cited.map((entry) => (
        <Column key={entry.authority.id} gap="2xs">
          <Text variant="caption" tone="secondary">
            {entry.bearing}
          </Text>
          <LegalCitation citation={{ cite: entry.authority.cite, title: entry.authority.shortTitle ?? entry.authority.title }} onPress={() => onOpen(entry.authority.cite)} />
        </Column>
      ))}
    </Column>
  );
}
