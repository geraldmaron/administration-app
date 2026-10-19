// How a name is written when narration has to put it in the possessive.
//
// Every place that composed one did it inline with a literal `'s`, and the
// player's own country is a plural proper noun: the ledger's first line read
// "United States's government", and so did the war narration, the operator
// crises and the risk branches. It is not a spelling anybody has ever printed,
// and it appeared more often than any other name in the game.
//
// Lives on its own, importing nothing from the engine but the stream type, so
// that founding, the resolver, the operators and the cast generator can all
// reach it without reaching each other.

import {
  WHITE_HOUSE_ROLE_TITLES,
  carriesLeaderSurname,
  carriesRealName,
  composeName,
  namesByFather,
  nationNameBank,
  royalName,
  surnameFor,
  type AnyNameCulture,
  type NameBank,
  type NameGroup,
  type PortraitGenderPresentation,
  type RoyalHouse,
} from "@admin/world";
import type { RngStream } from "./rng.js";

/**
 * A name in the possessive, by the rule American style actually uses: a name
 * already ending in s takes the apostrophe alone.
 */
export function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/**
 * What a charter calls the chair it seats.
 *
 * Role ids are the cross-charter contract every rule keys on; the title is
 * presentation, and a charter that authors its own wins over the derived form.
 * The engine needs this as much as a screen does, because narration it writes
 * is player-facing text: a sentence that hardcoded "the President" would be a
 * sentence that lies under every charter but one, and the whole reason role ids
 * and role titles are separate is so that never has to happen.
 */
export function roleTitle(roleId: string, titles?: Readonly<Record<string, string>>): string {
  const authored = titles?.[roleId];
  if (authored) return authored;
  const american = AMERICAN_FALLBACK_TITLES[roleId];
  if (american) return american;
  return roleId
    .replace(/^role-/, "")
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// The only playable seat is the US presidency, so a caller with no charter
// titles in hand (a nomination headline composed before the charter is read)
// must still say "Secretary of the Treasury" and never "Treasury Minister":
// the role ids are the dataset's charter-neutral vocabulary, not a reader's.
const AMERICAN_FALLBACK_TITLES: Readonly<Record<string, string>> = {
  ...WHITE_HOUSE_ROLE_TITLES,
  "role-foreign-minister": "Secretary of State",
  "role-treasury-minister": "Secretary of the Treasury",
  "role-defense-minister": "Secretary of Defense",
  "role-interior-minister": "Secretary of the Interior",
  "role-intelligence-director": "Director of National Intelligence",
  "role-attorney-general": "Attorney General",
  "role-president": "President",
};

/**
 * What the charter calls the person the player is playing, with the article a
 * sentence needs in front of it — "the President", "the Chancellor".
 */
export function headOfGovernmentTitle(
  leadRole: string,
  titles?: Readonly<Record<string, string>>,
): string {
  return `the ${roleTitle(leadRole, titles)}`;
}

// --- Country names as a sentence has to carry them ---------------------------

// The handful of display names that take a definite article in running prose.
// A wire sentence that says "United States raised tariffs" is a sentence no
// desk would file, and the dataset does not yet carry the fact: the world
// schema is gaining an `identity.definiteArticle` field, and `nationName()`
// below reads it wherever it is present and falls back to this list until every
// record has one. The list is short because the rule is: a name built out of a
// common noun ("kingdom", "republic", "emirates", "states") takes the article,
// and a bare proper noun does not.
const ARTICLED_NAMES: ReadonlySet<string> = new Set([
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Democratic Republic of the Congo",
  "Netherlands",
  "Philippines",
  "Bahamas",
  "Gambia",
  "Maldives",
  "Czech Republic",
  "Central African Republic",
  "Dominican Republic",
  "Ivory Coast",
]);

/** Whether a display name needs "the" in front of it in running prose. */
export function takesDefiniteArticle(name: string): boolean {
  if (ARTICLED_NAMES.has(name)) return true;
  return /\b(Republic|Kingdom|Emirates|Federation|Union|Isles|Islands)\b/.test(name);
}

/**
 * A country as a sentence carries it: "the United States", "Germany".
 *
 * `identity` is passed rather than a bare string so the dataset can settle the
 * question itself the moment it carries the field; nothing here overrides an
 * authored answer.
 */
export function nationName(
  identity: { readonly name: string; readonly definiteArticle?: boolean } | string,
): string {
  const name = typeof identity === "string" ? identity : identity.name;
  const authored = typeof identity === "string" ? undefined : identity.definiteArticle;
  const articled = authored ?? takesDefiniteArticle(name);
  return articled ? `the ${name}` : name;
}

/** The same name at the head of a sentence, where the article is capitalized. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// --- Naming a generated person ----------------------------------------------

/**
 * The names a pool has already used.
 *
 * Drawing every person in complete ignorance of everyone else is fine for
 * attributes and wrong for names: in a nation's own cast it puts 8.7% of people
 * on a first name they share with a colleague, gives seven pairs the same full
 * name outright, and can seat two ministers both called Yeva in one cabinet.
 */
export type NameLedger = { readonly given: Set<string>; readonly full: Set<string> };

export function newNameLedger(): NameLedger {
  return { given: new Set(), full: new Set() };
}

/**
 * True when a given name and a surname share a stem — "Soren Sorensen",
 * "Petr Petrov", "Bekele Bekele".
 *
 * Real people are named this way and patronymic surnames are exactly this, but
 * a randomly assembled one reads as a bug rather than as heritage, and it turned
 * up 23 times in nine thousand people.
 */
function sharesStem(given: string, surname: string): boolean {
  const a = given.toLowerCase();
  const b = surname.toLowerCase();
  const stem = 4;
  return (a.length >= stem && b.startsWith(a.slice(0, stem))) || (b.length >= stem && a.startsWith(b.slice(0, stem)));
}

/**
 * How hard to try before a name is allowed to be less than ideal. Enough that
 * a shallow bank, less the names the guards refuse, still finds a first name
 * no colleague carries.
 */
const NAME_ATTEMPTS = 24;

/** Who is being named: where they are from, and what their face presents as. */
export type NameSubject = {
  readonly nation: string;
  readonly culture: AnyNameCulture;
  readonly gender: PortraitGenderPresentation;
  /**
   * The one group to name this person from: a bank split by heritage names the
   * person from the group their face was drawn from, and a nation of several
   * traditions names its lead chair from the one that holds it.
   */
  readonly heritageGroup?: NameGroup;
  /** The reigning house, for a monarch or heir in the chair their house holds. */
  readonly royalHouse?: RoyalHouse;
};

function givenPool(group: NameGroup, gender: PortraitGenderPresentation): readonly string[] {
  const pool =
    gender === "masculine" ? group.given.masculine : gender === "feminine" ? group.given.feminine : group.given.neutral;
  return pool.length > 0 ? pool : group.given.masculine;
}

/** One weighted pick among a bank's traditions, from a single roll. */
function pickGroup(stream: RngStream, bank: NameBank): NameGroup {
  const total = bank.groups.reduce((sum, group) => sum + group.weight, 0);
  let target = stream.next() * total;
  for (const group of bank.groups) {
    target -= group.weight;
    if (target <= 0) return group;
  }
  return bank.groups[bank.groups.length - 1]!;
}

/**
 * The first name a reader sees. Some banks hold two-word given names ("Nanda
 * Ayu"), and a colleague called plain "Nanda" is the same first name to anyone
 * reading a cabinet list.
 */
const firstNameOf = (name: string): string => {
  const space = name.indexOf(" ");
  return space < 0 ? name : name.slice(0, space);
};

type Drawn = { readonly first: string; readonly full: string; readonly stem: boolean; readonly surname: string };

/**
 * Both halves from one tradition, written the way it writes a name, the
 * second in the form this person carries it. A royal is named for the house,
 * in the Gulf after a father drawn from the house's own given names.
 */
function written(subject: NameSubject, group: NameGroup, given: string, drawn: string): Drawn {
  if (subject.royalHouse) {
    return { first: firstNameOf(given), full: royalName(subject.royalHouse, given, drawn), stem: false, surname: subject.royalHouse.house };
  }
  const second = surnameFor(subject.nation, subject.culture, drawn, subject.gender);
  return { first: firstNameOf(given), full: composeName(group.form, given, second, subject.gender), stem: sharesStem(given, drawn), surname: second };
}

function secondNames(subject: NameSubject, group: NameGroup): readonly string[] {
  return subject.royalHouse?.nasab ? group.given.masculine : group.surname;
}

function assemble(stream: RngStream, subject: NameSubject, group: NameGroup): Drawn {
  const given = stream.pick(givenPool(group, subject.gender));
  return written(subject, group, given, stream.pick(secondNames(subject, group)));
}

/**
 * Whether a drawn name is one the game may not hand out: a real officeholder's,
 * or, outside a royal house and where the tradition has family names, the
 * rare family name of anyone who has led this nation.
 */
function refused(subject: NameSubject, group: NameGroup, name: Drawn): boolean {
  if (carriesRealName(name.full)) return true;
  // A father's given name is not a family name: two men whose fathers were
  // both called Ahmed are not related to each other or to a President Ahmed.
  return !subject.royalHouse && !namesByFather(group.form) && carriesLeaderSurname(subject.nation, name.surname);
}

/**
 * The answer of last resort once every attempt has collided: a walk through
 * the group from a drawn given name and a drawn second name, so the result is
 * still the seed's, and never a refused name however shallow the bank.
 */
function lastResort(stream: RngStream, subject: NameSubject, group: NameGroup): string {
  const givens = givenPool(group, subject.gender);
  const seconds = secondNames(subject, group);
  const givenStart = stream.nextInt(0, givens.length);
  const secondStart = stream.nextInt(0, seconds.length);
  for (let g = 0; g < givens.length; g += 1) {
    for (let step = 0; step < seconds.length; step += 1) {
      const name = written(subject, group, givens[(givenStart + g) % givens.length]!, seconds[(secondStart + step) % seconds.length]!);
      if (!refused(subject, group, name)) return name.full;
    }
  }
  throw new Error(`every name in the ${subject.culture} bank is refused`);
}

/**
 * A name nobody in this pool is already using, and nobody in office is.
 *
 * The constraints are relaxed in the order they matter least: a repeated first
 * name is a blemish, two people with the identical full name is a defect, and
 * both are better than looping forever against a shallow bank. A refused name
 * is never relaxed into: the leaders are fictional, and a head of government
 * drawn under a sitting officeholder's name, or the family name of the man who
 * ran the country, is not. Every attempt draws from the same stream, so the
 * result stays deterministic in the seed.
 */
export function drawName(stream: RngStream, subject: NameSubject, taken: NameLedger): string {
  const bank = nationNameBank(subject.nation, subject.culture);
  let fallback: string | undefined;

  for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt += 1) {
    const group = subject.heritageGroup ?? pickGroup(stream, bank);
    const name = assemble(stream, subject, group);
    if (name.stem || refused(subject, group, name)) continue;
    // Held as the answer of last resort: a distinct full name whose first name
    // is a repeat still beats two people called the same thing.
    if (!taken.full.has(name.full)) fallback ??= name.full;
    if (taken.given.has(name.first) || taken.full.has(name.full)) continue;

    taken.given.add(name.first);
    taken.full.add(name.full);
    return name.full;
  }

  const chosen = fallback ?? lastResort(stream, subject, subject.heritageGroup ?? bank.groups[0]!);
  taken.given.add(firstNameOf(chosen));
  taken.full.add(chosen);
  return chosen;
}
