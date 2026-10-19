import type { Nation } from "../schemas/nation.js";

// The one place in the dataset package that turns `identity` into a name a
// sentence can hold. `identity.definiteArticle` is the authoritative answer to
// "does this nation's short name take 'the'?" — set on the dataset for every
// nation in the fifty that needs it (the United States, the United Kingdom,
// the United Arab Emirates, the Democratic Republic of the Congo) and absent
// everywhere else, which this reads as false rather than guessing. Content's
// placeholder resolver (`packages/content/src/nation-article.ts`) and the
// engine's narration helper (`packages/engine/src/naming.ts`) each carry their
// own heuristic fallback for the case this field has not landed in their build
// yet; this function has no such fallback because it is the source the field
// comes from.

export type DisplayNameOptions = {
  /** Prefix the article ("the") when the nation's name takes one. */
  readonly article?: boolean;
};

/**
 * A nation's name as prose carries it: `displayName(usa, { article: true })`
 * is "the United States"; `displayName(japan, { article: true })` is "Japan".
 * Omitting the option (or passing `{ article: false }`) always returns the
 * bare `identity.name`, for the many places — dossier headers, select lists,
 * a possessive already built elsewhere — that want the name on its own.
 */
export function displayName(
  nation: Pick<Nation, "identity">,
  options: DisplayNameOptions = {},
): string {
  const { name, definiteArticle } = nation.identity;
  if (!options.article || !definiteArticle) return name;
  return `the ${name}`;
}
