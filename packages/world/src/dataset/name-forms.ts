import type { NameForm, NameGroup } from "../schemas/people-pool.js";

// How a tradition writes a name once both halves are drawn, and how the chair
// a monarch holds is named.

export type NamePresentation = "masculine" | "feminine" | "androgynous";

/**
 * A name in its tradition's order, with the words that join it. The leader
 * table's surname rule for each nation is what these follow: family name
 * first in China, Korea, Vietnam and Cambodia; "bin" or "binti" and the
 * father's name in Malaysia and Brunei; "Ould" or "Mint" in Mauritania.
 */
export function composeName(form: NameForm | undefined, given: string, second: string, presentation: NamePresentation): string {
  switch (form) {
    case "family-given":
      return `${second} ${given}`;
    case "malay-patronymic":
      return `${given} ${presentation === "feminine" ? "binti" : "bin"} ${second}`;
    case "mauritanian-patronymic":
      return `${given} ${presentation === "feminine" ? "Mint" : "Ould"} ${second}`;
    default:
      return `${given} ${second}`;
  }
}

/** Whether a tradition's second name is a father's given name rather than a family name. */
export function namesByFather(form: NameForm | undefined): boolean {
  return form === "patronymic" || form === "malay-patronymic" || form === "mauritanian-patronymic";
}

/**
 * The reigning house of each monarchy whose lead chair the monarch or the heir
 * holds, and whether its members are named by their fathers before the house.
 * A King of Jordan with a commoner's Levantine surname, or an Emir of Kuwait
 * with no dynasty at all, is not a monarch a reader recognizes. The houses are
 * the states' own constitutional facts, not anyone's personal name, and the
 * people drawn into them are fictional: the real-name guard refuses any
 * pairing that would name a sitting royal.
 */
export type RoyalHouse = { readonly house: string; readonly nasab: boolean };

export const ROYAL_HOUSES: Readonly<Record<string, RoyalHouse>> = {
  SAU: { house: "Al Saud", nasab: true },
  ARE: { house: "Al Nahyan", nasab: true },
  QAT: { house: "Al Thani", nasab: true },
  KWT: { house: "Al-Sabah", nasab: true },
  BHR: { house: "Al Khalifa", nasab: true },
  OMN: { house: "Al Said", nasab: true },
  JOR: { house: "Al-Hashimi", nasab: true },
  MAR: { house: "El Alaoui", nasab: false },
  BRN: { house: "Bolkiah", nasab: false },
  SWZ: { house: "Dlamini", nasab: false },
  MCO: { house: "Grimaldi", nasab: false },
  LIE: { house: "von und zu Liechtenstein", nasab: false },
};

/** A royal's name: given name, father's name and house in the Gulf and Jordan; given name and house elsewhere. */
export function royalName(house: RoyalHouse, given: string, father: string): string {
  return house.nasab ? `${given} bin ${father} ${house.house}` : `${given} ${house.house}`;
}

/** What a name was drawn from, read back: the tradition, the given name, and the second name as the list holds it. */
export type NameReading = { readonly group: NameGroup; readonly given: string; readonly second: string };

/**
 * What is left of a name once its given name and joining words are taken
 * off, as its tradition writes it; undefined when the name does not open (or,
 * family name first, close) with that given name.
 */
function secondOf(name: string, given: string, form: NameForm | undefined, presentation: NamePresentation): string | undefined {
  const after = (prefix: string) => (name.startsWith(prefix) ? name.slice(prefix.length) : undefined);
  switch (form) {
    case "family-given":
      return name.endsWith(` ${given}`) ? name.slice(0, name.length - given.length - 1) : undefined;
    case "malay-patronymic":
      return after(`${given} ${presentation === "feminine" ? "binti" : "bin"} `);
    case "mauritanian-patronymic":
      return after(`${given} ${presentation === "feminine" ? "Mint" : "Ould"} `);
    default:
      return after(`${given} `);
  }
}

function royalSecondOf(name: string, given: string, house: RoyalHouse): string | undefined {
  if (!house.nasab) return name === `${given} ${house.house}` ? house.house : undefined;
  const prefix = `${given} bin `;
  const suffix = ` ${house.house}`;
  return name.startsWith(prefix) && name.endsWith(suffix) ? name.slice(prefix.length, name.length - suffix.length) : undefined;
}

/**
 * Reads a drawn name back into one tradition of the groups it may come from:
 * a given name of the group for this presentation, and a second name the group
 * holds, in the form `secondAs` gives it for this person. Undefined when no one
 * tradition can produce the name. For a gate or a test, not a hot path.
 */
export function readName(
  name: string,
  groups: readonly NameGroup[],
  presentation: NamePresentation,
  secondAs: (group: NameGroup, drawn: string) => string,
  house?: RoyalHouse,
): NameReading | undefined {
  for (const group of groups) {
    const pool = presentation === "feminine" ? group.given.feminine : presentation === "masculine" ? group.given.masculine : group.given.neutral;
    const givens = pool.length > 0 ? pool : group.given.masculine;
    const seconds = new Set(house?.nasab ? group.given.masculine : group.surname.map((drawn) => secondAs(group, drawn)));
    for (const given of givens) {
      const second = house ? royalSecondOf(name, given, house) : secondOf(name, given, group.form, presentation);
      if (second !== undefined && (house?.nasab === false || seconds.has(second))) return { group, given, second };
    }
  }
  return undefined;
}
