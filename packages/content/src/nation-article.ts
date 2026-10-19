// Whether a country's name takes "the" in front of it, and how to spell the
// name once it does.
//
// Pasting `identity.name` straight into a sentence reads correctly for
// forty-six of the fifty shipped nations and wrong for the four the player is
// most likely to see: "as long as United States wanted it to hold". Nor can a
// scenario writer solve it in the copy — the same sentence is cast onto every
// nation in the pool, so the writer cannot know whether to type an article.
//
// The authoritative answer is `identity.definiteArticle` in the world dataset.
// It is read structurally rather than through the type, because the field is
// landing separately: until it exists in the built `@admin/world`, the
// heuristic below answers, and the moment the flag ships the dataset wins for
// every nation it is set on.

/**
 * Names that take "the" and do not announce it in their own shape.
 *
 * Deliberately short. Every entry is a country whose ordinary English name is
 * plural or a collective noun; anything containing "United" or "Republic of"
 * is caught by the pattern below instead of being listed twice.
 */
const ARTICLE_NAMES: ReadonlySet<string> = new Set([
  "netherlands",
  "philippines",
  "bahamas",
  "gambia",
  "maldives",
  "seychelles",
  "comoros",
  "sudan",
  "ivory coast",
  "marshall islands",
  "solomon islands",
  "cayman islands",
  "czech republic",
  "vatican",
]);

const ARTICLE_SHAPE = /^united\b|\brepublic of\b|\bislands$/i;

type ArticleIdentity = { readonly name: string; readonly definiteArticle?: boolean };

/**
 * Whether this nation's name is written "the X".
 *
 * The dataset's own flag is final where it exists — including where it is
 * explicitly `false`, which is how a name the heuristic would guess wrong is
 * corrected without changing this file.
 */
export function takesDefiniteArticle(identity: ArticleIdentity | undefined): boolean {
  if (!identity) return false;
  const declared = (identity as { definiteArticle?: unknown }).definiteArticle;
  if (typeof declared === "boolean") return declared;
  const name = identity.name.trim().toLowerCase();
  return ARTICLE_NAMES.has(name) || ARTICLE_SHAPE.test(identity.name.trim());
}

export type NationPhraseOptions = {
  /** The token opened a sentence, so the article is capitalized rather than the name. */
  readonly sentenceStart?: boolean;
  /** The token was written `{{nation}}'s`, so the phrase carries the possessive. */
  readonly possessive?: boolean;
};

/**
 * The name as it belongs in the sentence: article, capitalization, possessive.
 *
 * The possessive is only reshaped for article names. "Belarus's" is what the
 * binder has always produced for a bare name ending in s and is not this
 * change's business; "the United States's" is a phrase no newsroom would print,
 * so an article name ending in s takes the bare apostrophe.
 */
export function nationPhrase(name: string, article: boolean, options: NationPhraseOptions = {}): string {
  const possessive = options.possessive ? (article && /s$/i.test(name) ? "'" : "'s") : "";
  if (!article) return `${name}${possessive}`;
  return `${options.sentenceStart ? "The" : "the"} ${name}${possessive}`;
}

/**
 * Whether the character run before this offset ends a sentence.
 *
 * Start of string, a newline, or a full stop / question mark / exclamation
 * followed by space. A quote or bracket in between still counts as a start: a
 * beat opening on a quoted line is the case that made this necessary.
 */
export function atSentenceStart(text: string, offset: number): boolean {
  const before = text.slice(0, offset).replace(/["'“”‘’(\[]+\s*$/, "");
  // A dotted abbreviation ends in a full stop and not a sentence: "U.S. {{sector}}"
  // read as a new sentence and printed "U.S. Light vehicles".
  if (ABBREVIATION_STOP.test(before)) return false;
  return before.trim().length === 0 || /(?:^|[.!?])\s+$/.test(before) || /\n\s*$/.test(before);
}

const ABBREVIATION_STOP = /\b(?:U\.S|U\.K|U\.N|E\.U|Mr|Mrs|Ms|Dr|St|Gen|Sen|Rep|Gov|Sec)\.\s+$/;
