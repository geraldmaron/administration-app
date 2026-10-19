import type { InstitutionalCost } from "@admin/content";

/**
 * The government capacity an act drew on, in words a player reads.
 *
 * The content layer declares these as tags and the engine stamps them on the
 * ledger as they are declared; the Record printed the tags. A tag is a fact for
 * an audit rule, not a sentence for a president.
 */
const WORDS: Readonly<Record<InstitutionalCost, string>> = {
  "forces-committed": "forces committed",
  "intelligence-source-burned": "an intelligence source exposed",
  "legal-authority-spent": "legal power used",
  "alliance-credit-spent": "goodwill with allies used up",
  "alliance-credit-earned": "goodwill with allies gained",
  "legislative-capital-spent": "goodwill in Congress used up",
  "civil-service-strained": "government workers stretched thin",
  "emergency-powers-invoked": "emergency powers used",
  "conduct-in-question": "questions about the government's own conduct",
};

function wordsFor(tag: string): string {
  return WORDS[tag as InstitutionalCost] ?? tag.replace(/-/g, " ");
}

/** "forces committed", "legal power used and goodwill with allies gained". */
export function institutionalCapacityWords(tags: readonly string[]): string {
  const words = [...new Set(tags)].map(wordsFor);
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")}${words.length > 2 ? "," : ""} and ${words[words.length - 1]}`;
}
