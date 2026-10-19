/**
 * A name as the guard compares it: accents off, case off, particles out, split
 * on anything that is not a letter, each romanization folded to one spelling,
 * so "Şahin", "Sahin" and "ŞAHIN" are one word and "Al-Hashimi" is the
 * same name as "Al Hashimi".
 */
export declare function realNameTokens(name: string): readonly string[];
/** One ordered pair of name words, salted and hashed, so the blocklist holds numbers rather than names. */
export declare function realNameKey(salt: string, first: string, second: string): number;
/** A family name as a nation's own leaders have carried it, salted and hashed. */
export declare function leaderSurnameKey(salt: string, nation: string, word: string): number;
/**
 * A packed list: big-endian unsigned 32-bit hashes, base64, written as a data
 * URI. Tens of thousands of numbers written as decimal literals would be most
 * of a megabyte in every bundle that loads the dataset; packed they are a
 * quarter of that.
 */
export declare function unpackHashes(packed: string): readonly number[];
/**
 * Whether a generated name carries a real officeholder's.
 *
 * Any two of its words in the order they are written count: a head of
 * government drawn with the middle name dropped is still read as them. The
 * blocklist holds the pairs of every officeholder's name in both orders, so a
 * family-name-first culture is caught the same way.
 */
export declare function carriesRealName(name: string): boolean;
/**
 * Whether a family name belongs to someone who has led this nation's
 * government. A fictional minister who shares a rare family name with the man
 * who ran the country is read as his relative, whatever their given name. The
 * nation's most common family names are left off the list when it is built: a
 * Korean cabinet with no Kim in it would be the stranger fiction.
 */
export declare function carriesLeaderSurname(nation: string, surname: string): boolean;
