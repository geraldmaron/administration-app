export type MatchPart = { readonly text: string; readonly match: boolean };

/** Splits text at the first place the query appears, ignoring case, so the matched part can be marked. */
export function matchParts(text: string, query: string): readonly MatchPart[] {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return [{ text, match: false }];
  return [
    ...(at > 0 ? [{ text: text.slice(0, at), match: false }] : []),
    { text: text.slice(at, at + needle.length), match: true },
    ...(at + needle.length < text.length ? [{ text: text.slice(at + needle.length), match: false }] : []),
  ];
}
