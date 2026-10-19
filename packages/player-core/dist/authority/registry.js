import { CONSTITUTION_AUTHORITIES } from "./records-constitution.js";
import { DOMESTIC_AUTHORITIES } from "./records-domestic.js";
import { OFFICE_AUTHORITIES } from "./records-offices.js";
import { SECURITY_AUTHORITIES } from "./records-security.js";
// Every legal authority the game cites, and the one way a citation written
// anywhere in the engine or the help text is turned into a record (DECISIONS
// §8.12). Lookups are by the law, not by the wording: "50 U.S.C. §1702(a)(1)(B)"
// and "50 USC 1701" both reach the IEEPA record, because a pinpoint cite is
// still a cite to the statute it sits in.
export const AUTHORITIES = [
    ...CONSTITUTION_AUTHORITIES,
    ...SECURITY_AUTHORITIES,
    ...DOMESTIC_AUTHORITIES,
    ...OFFICE_AUTHORITIES,
];
/**
 * The hosts a record may link to: the official publishers of the Code, the
 * Constitution, the Federal Register and the regulations, the National
 * Archives, a free reporter of the Supreme Court's opinions, and the
 * depositaries of the two treaties cited.
 */
export const AUTHORITY_SOURCE_HOSTS = [
    "uscode.house.gov",
    "www.govinfo.gov",
    "constitution.congress.gov",
    "www.ecfr.gov",
    "www.federalregister.gov",
    "www.archives.gov",
    "supreme.justia.com",
    "www.nato.int",
    "www.un.org",
];
/**
 * Directive authority text that names no single law and so cannot resolve.
 * The independent-body memorandum is generated per commission from the
 * institution catalog, which records that a body is independent but not the
 * statute that made it so; naming one per commission is catalog work.
 */
export const DIRECTIVE_AUTHORITY_EXEMPTIONS = [
    {
        pattern: /^the organic statute of the /,
        reason: "Generated per independent body; the institution catalog does not record which statute created each one.",
    },
];
/**
 * One spelling for every way a citation is written: case, dashes, "U.S.C."
 * against "USC", "§§" against "Sec.", "Exec. Order No." against "EO", and the
 * "U.S. Const." prefix, which is dropped so "Article II, Section 3" and
 * "U.S. Const. art. II, §3" meet.
 */
export function normalizeCite(text) {
    return text
        .toLowerCase()
        .replace(/[‐-―]/g, "-")
        .replace(/\bu\.?\s?s\.?\s?const(itution)?\b\.?/g, " ")
        .replace(/\bu\.?\s?s\.?\s?c\b\.?/g, "usc")
        .replace(/\bc\.?\s?f\.?\s?r\b\.?/g, "cfr")
        .replace(/\bpub(lic)?\.?\s?l(aw)?\.?(?=\s|\d)/g, "pub l")
        .replace(/\b(exec(utive)?\.?\s+order|e\.?\s?o\.?)(\s+no\.?)?(?=\s*\d)/g, "eo")
        .replace(/\b(article|art)\b\.?/g, "art")
        .replace(/\b(clause|cl)\b\.?/g, "cl")
        .replace(/\b(amendment|amend)\b\.?/g, "amend")
        .replace(/§§|§|\bsecs?\b\.?|\bsections?\b/g, " § ")
        .replace(/[,;]/g, " ")
        .replace(/\s*§\s*/g, " §")
        .replace(/\s+/g, " ")
        .replace(/\b(usc|cfr) (?!§)/g, "$1 §")
        .trim()
        .replace(/^the /, "")
        .replace(/[.:]+$/, "");
}
const BY_ID = new Map(AUTHORITIES.map((authority) => [authority.id, authority]));
function namesOf(authority) {
    return [authority.cite, authority.title, ...(authority.shortTitle ? [authority.shortTitle] : []), ...(authority.aliases ?? [])];
}
/** Every normalized name and cite, mapped to its record. The first record to claim a key keeps it. */
const BY_KEY = new Map([...AUTHORITIES]
    .reverse()
    .flatMap((authority) => namesOf(authority).map((name) => [normalizeCite(name), authority])));
export function authorityById(id) {
    return BY_ID.get(id);
}
/** Every normalized key the registry answers to, with the records that claim it; the tests hold this to one record per key. */
export function authorityKeys() {
    return AUTHORITIES.reduce((keys, authority) => {
        const next = new Map(keys);
        for (const key of new Set(namesOf(authority).map(normalizeCite)))
            next.set(key, [...(next.get(key) ?? []), authority.id]);
        return next;
    }, new Map());
}
function sectionKey(code, section) {
    if (code === "cfr")
        return section.split(".").map((part) => Number.parseInt(part, 10) || 0);
    const match = /^(\d+)([a-z]*)/.exec(section);
    return match ? [Number.parseInt(match[1] ?? "0", 10), match[2] ?? ""] : [0, section];
}
function compareSections(left, right) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const a = left[index] ?? 0;
        const b = right[index] ?? 0;
        if (a === b)
            continue;
        if (typeof a === "number" && typeof b === "number")
            return a - b;
        return String(a) < String(b) ? -1 : 1;
    }
    return 0;
}
function spanSize(span) {
    return span.to ? Number.parseFloat(span.to) - Number.parseFloat(span.from) : 0;
}
/** The narrowest record whose code sections include this one. */
function resolveCode(code, title, section) {
    const wanted = sectionKey(code, section);
    const holders = AUTHORITIES.flatMap((authority) => (authority.covers ?? [])
        .filter((span) => span.code === code && span.title === title)
        .filter((span) => compareSections(sectionKey(code, span.from), wanted) <= 0 && compareSections(wanted, sectionKey(code, span.to ?? span.from)) <= 0)
        .map((span) => ({ authority, size: spanSize(span) })));
    return [...holders].sort((a, b) => a.size - b.size)[0]?.authority;
}
const ROMAN = { i: "I", ii: "II", iii: "III" };
/**
 * A clause is found exactly; a section without a clause is found only when one
 * record answers for it, because "Article II, Section 2" alone could mean the
 * command of the forces or the treaty power. Article II alone is the Vesting
 * Clause, the grant every other power of the office reads under.
 */
function resolveProvision(article, section, clause) {
    const art = ROMAN[article];
    if (!art)
        return undefined;
    if (section === undefined)
        return art === "II" ? BY_ID.get("const-art2-s1") : undefined;
    const inSection = AUTHORITIES.filter((authority) => authority.provision?.article === art && authority.provision.section === section);
    const exact = clause === undefined ? undefined : inSection.find((authority) => authority.provision?.clause === clause);
    const whole = inSection.find((authority) => authority.provision?.clause === undefined);
    if (exact ?? whole)
        return exact ?? whole;
    return clause === undefined && inSection.length === 1 ? inSection[0] : undefined;
}
const CODE_CITE = /(\d+) (usc|cfr) §([0-9](?:[0-9a-z.]*[0-9a-z])?)/g;
const PROVISION_CITE = /\bart (i{1,3}|iv|vi{0,3})\b(?: §(\d+))?(?: cl (\d+))?/g;
function codeMatches(text) {
    return [...text.matchAll(CODE_CITE)].flatMap((match) => {
        const authority = resolveCode(match[2] === "cfr" ? "cfr" : "usc", Number.parseInt(match[1] ?? "0", 10), match[3] ?? "");
        return authority ? [{ index: match.index ?? 0, length: match[0].length, authority }] : [];
    });
}
function provisionMatches(text) {
    return [...text.matchAll(PROVISION_CITE)].flatMap((match) => {
        const section = match[2] === undefined ? undefined : Number.parseInt(match[2], 10);
        const clause = match[3] === undefined ? undefined : Number.parseInt(match[3], 10);
        const authority = resolveProvision(match[1] ?? "", section, clause);
        return authority ? [{ index: match.index ?? 0, length: match[0].length, authority }] : [];
    });
}
const isWordChar = (char) => char !== undefined && /[a-z0-9]/.test(char);
/** Where `key` first stands as whole words in `text`, or -1. */
function wordIndex(text, key, from = 0) {
    const index = text.indexOf(key, from);
    if (index < 0)
        return -1;
    if (!isWordChar(text[index - 1]) && !isWordChar(text[index + key.length]))
        return index;
    return wordIndex(text, key, index + 1);
}
function nameMatches(text) {
    return [...BY_KEY].flatMap(([key, authority]) => {
        const index = key.length < 3 ? -1 : wordIndex(text, key);
        return index < 0 ? [] : [{ index, length: key.length, authority }];
    });
}
/**
 * The record for a citation or a name, written any of the ways the registry
 * normalizes. A pinpoint cite inside a record's sections finds that record.
 */
export function authorityByCite(text) {
    const key = normalizeCite(text);
    const exact = BY_KEY.get(key);
    if (exact)
        return exact;
    const first = [...codeMatches(key), ...provisionMatches(key)].find((found) => found.index === 0);
    return first?.authority;
}
/**
 * The first authority a sentence names, by citation or by name: "Authority:
 * 28 U.S.C. § 509 and the Department's standing policy" reaches the Attorney
 * General's functions. Earliest wins, and the longer of two at the same place.
 */
export function resolveAuthorityText(freeText) {
    const text = normalizeCite(freeText);
    const found = [...codeMatches(text), ...provisionMatches(text), ...nameMatches(text)];
    return [...found].sort((a, b) => a.index - b.index || b.length - a.length)[0]?.authority;
}
export function authoritiesForGlossaryTerm(id) {
    return AUTHORITIES.filter((authority) => authority.glossaryTerms?.includes(id));
}
/** The registry record for the law an executive order's card cites. */
export function orderAuthorityRecord(authority) {
    return authorityByCite(authority.cite) ?? resolveAuthorityText(authority.cite) ?? authorityByCite(authority.name);
}
