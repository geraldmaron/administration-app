/**
 * A nation's name as prose carries it: `displayName(usa, { article: true })`
 * is "the United States"; `displayName(japan, { article: true })` is "Japan".
 * Omitting the option (or passing `{ article: false }`) always returns the
 * bare `identity.name`, for the many places — dossier headers, select lists,
 * a possessive already built elsewhere — that want the name on its own.
 */
export function displayName(nation, options = {}) {
    const { name, definiteArticle } = nation.identity;
    if (!options.article || !definiteArticle)
        return name;
    return `the ${name}`;
}
