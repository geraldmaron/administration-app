import { glossaryEntry } from "@admin/player-core";
import { HelpTip } from "@admin/ui-web";
import { GlossaryBrowser, hasMoreContext } from "../help";

/**
 * An "i" beside a heading that opens the glossary's own words for a term: what
 * it is, then what the game does with it. The words live once, in the glossary,
 * so a tip and the search card never disagree. Where the entry has more to say
 * (what the game does, a case, related terms), "More context" opens the full
 * card in an inspector. An unknown id draws nothing.
 */
export function GlossaryTip({ id }: { readonly id: string }) {
  const entry = glossaryEntry(id);
  if (!entry) return null;
  return (
    <HelpTip
      label={`About ${entry.term.toLowerCase()}`}
      {...(hasMoreContext(entry) ? { more: { title: entry.term, body: <GlossaryBrowser id={entry.id} /> } } : {})}
    >
      <strong>{entry.term}</strong>
      {entry.definition}
      {entry.inGame ? ` ${entry.inGame}` : ""}
    </HelpTip>
  );
}
