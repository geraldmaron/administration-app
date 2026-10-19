import { fnv1a } from "./hashing.js";
import { REAL_NAME_HASHES, REAL_NAME_SALT } from "./nation-leaders.generated.js";
import { LEADER_SURNAME_HASHES, OFFICEHOLDER_NAME_HASHES } from "./officeholders.generated.js";

// The real-name guard: a generated person never carries a real officeholder's
// name, and never the rare family name of anyone who has led their country.
//
// Every list here holds salted hashes, never names. Two lists feed it. The
// leader table's own sources name each government's head; the officeholder
// roster (scripts/vendor-officeholders.mjs) names everyone else in office:
// every foreign cabinet, every member of Congress, every justice, governor
// and federal officer, and every head of state and government since 1945.

/**
 * Words a name is joined with rather than made of. Two real names that share
 * only "bin" or "de" share nothing a reader would recognize.
 */
const NAME_PARTICLES: ReadonlySet<string> = new Set([
  "al", "el", "bin", "bint", "ibn", "abu", "ben", "de", "da", "do", "dos", "das", "del", "della", "di", "du",
  "van", "von", "der", "den", "la", "le", "y", "e", "of", "the", "jr", "sr",
]);

/** Letters NFD does not take apart. */
const FOLDED: Readonly<Record<string, string>> = {
  ø: "o", æ: "ae", œ: "oe", ð: "d", þ: "th", ł: "l", đ: "d", ß: "ss", ı: "i", ə: "e",
};

/**
 * One name, many spellings. A romanization is a spelling of a name, not a
 * different name, so "Mohamed", "Mohammed" and "Muhammad" are the same word to
 * a reader and have to be the same word here, or a real name written one way
 * slips past a list that holds it written another.
 */
const ROMANIZED: Readonly<Record<string, string>> = {
  mohammed: "muhammad", mohammad: "muhammad", mohamed: "muhammad", mohamad: "muhammad", muhammed: "muhammad",
  mouhamed: "muhammad", mohamud: "mahmud", mahmoud: "mahmud", mahmood: "mahmud",
  ahmed: "ahmad", ahmet: "ahmad", ahmat: "ahmad",
  hussein: "husayn", hussain: "husayn", husain: "husayn", hossein: "husayn", husein: "husayn",
  hassan: "hasan", hasane: "hasan",
  abdallah: "abdullah", abdulla: "abdullah", abdalla: "abdullah",
  khaled: "khalid", faysal: "faisal", feisal: "faisal",
  youssef: "yusuf", yousef: "yusuf", yousuf: "yusuf", yusef: "yusuf", youssouf: "yusuf",
  omar: "umar", othman: "uthman", osman: "uthman", usman: "uthman",
  suleiman: "sulayman", sulaiman: "sulayman", suleyman: "sulayman", souleymane: "sulayman",
  mustapha: "mustafa", moustafa: "mustafa", mostafa: "mustafa",
  saeed: "said", sayed: "said", saied: "said", sayyid: "said",
  rached: "rashid", rashed: "rashid", nasser: "nasir", naser: "nasir",
  tarek: "tariq", tarik: "tariq", tareq: "tariq", haytham: "haitham",
  meshal: "mishal", mishaal: "mishal", nawwaf: "nawaf", zayed: "zayid", jaber: "jabir", nuhayyan: "nahyan",
  kamel: "kamal", gamal: "jamal", mohsen: "muhsin", ebrahim: "ibrahim", ismael: "ismail", ismaeel: "ismail",
};

/** "Abd" is half of a name, "servant of" the word after it, and is written joined or apart. */
const ABD = /^abd(oul|ul|el|al|ol|ou|u|e|a)?$/;
const ABD_JOINED = /^abd(?:oul|ul|el|al|ol)(.{3,})$/;
const ALLAH = /^(?:a|u)?l?lah$/;

/** "Abd al-Aziz", "Abdulaziz" and "Abdelaziz" as one word, and "Abdullah" and "Abd Allah" as another. */
function abdOf(rest: string): string {
  return `abd:${ALLAH.test(rest) ? "allah" : rest}`;
}

function romanized(tokens: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = ROMANIZED[tokens[i]!] ?? tokens[i]!;
    const next = tokens[i + 1];
    if (ABD.test(token) && next !== undefined) {
      out.push(abdOf(ROMANIZED[next] ?? next));
      i += 1;
      continue;
    }
    const joined = ABD_JOINED.exec(token);
    out.push(joined ? abdOf(joined[1]!) : token);
  }
  return out;
}

const PLAIN_NAME = /^[A-Za-z0-9' .-]+$/;
const keep = (tokens: readonly string[]): readonly string[] =>
  romanized(tokens.filter((token) => token.length > 0 && !NAME_PARTICLES.has(token)));

/**
 * A name as the guard compares it: accents off, case off, particles out, split
 * on anything that is not a letter, each romanization folded to one spelling,
 * so "Şahin", "Sahin" and "ŞAHIN" are one word and "Al-Hashimi" is the
 * same name as "Al Hashimi".
 */
export function realNameTokens(name: string): readonly string[] {
  // Most generated names are plain ASCII, and the full fold costs a Unicode
  // normalization per attempt across seven thousand people at founding.
  if (PLAIN_NAME.test(name)) return keep(name.toLowerCase().split(/[^a-z0-9]+/));
  const folded = [...name.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase()].map((c) => FOLDED[c] ?? c).join("");
  return keep(folded.split(/[^\p{L}\p{N}]+/u));
}

/** One ordered pair of name words, salted and hashed, so the blocklist holds numbers rather than names. */
export function realNameKey(salt: string, first: string, second: string): number {
  return fnv1a(`${salt}|${first}|${second}`);
}

/** A family name as a nation's own leaders have carried it, salted and hashed. */
export function leaderSurnameKey(salt: string, nation: string, word: string): number {
  return fnv1a(`${salt}|surname|${nation}|${word}`);
}

/**
 * A packed list: big-endian unsigned 32-bit hashes, base64, written as a data
 * URI. Tens of thousands of numbers written as decimal literals would be most
 * of a megabyte in every bundle that loads the dataset; packed they are a
 * quarter of that.
 */
export function unpackHashes(packed: string): readonly number[] {
  const payload = packed.replace(/^data:[^,]*,/, "");
  if (payload.length === 0) return [];
  const bytes = atob(payload);
  if (bytes.length % 4 !== 0) throw new Error(`a packed hash list is ${bytes.length} bytes, not a whole number of hashes`);
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    out.push(((bytes.charCodeAt(i) << 24) | (bytes.charCodeAt(i + 1) << 16) | (bytes.charCodeAt(i + 2) << 8) | bytes.charCodeAt(i + 3)) >>> 0);
  }
  return out;
}

const REAL_NAME_KEYS: ReadonlySet<number> = new Set([...REAL_NAME_HASHES, ...unpackHashes(OFFICEHOLDER_NAME_HASHES)]);
const LEADER_SURNAME_KEYS: ReadonlySet<number> = new Set(unpackHashes(LEADER_SURNAME_HASHES));

/**
 * Whether a generated name carries a real officeholder's.
 *
 * Any two of its words in the order they are written count: a head of
 * government drawn with the middle name dropped is still read as them. The
 * blocklist holds the pairs of every officeholder's name in both orders, so a
 * family-name-first culture is caught the same way.
 */
export function carriesRealName(name: string): boolean {
  const tokens = realNameTokens(name);
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j < tokens.length; j += 1) {
      if (REAL_NAME_KEYS.has(realNameKey(REAL_NAME_SALT, tokens[i]!, tokens[j]!))) return true;
    }
  }
  return false;
}

/**
 * Whether a family name belongs to someone who has led this nation's
 * government. A fictional minister who shares a rare family name with the man
 * who ran the country is read as his relative, whatever their given name. The
 * nation's most common family names are left off the list when it is built: a
 * Korean cabinet with no Kim in it would be the stranger fiction.
 */
export function carriesLeaderSurname(nation: string, surname: string): boolean {
  return realNameTokens(surname).some((word) => LEADER_SURNAME_KEYS.has(leaderSurnameKey(REAL_NAME_SALT, nation, word)));
}
