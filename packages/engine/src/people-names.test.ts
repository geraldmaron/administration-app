import { describe, expect, it } from "vitest";
import {
  leadNameGroup,
  nameCultureFor,
  nationLeadRole,
  nationNameBank,
  parsePortraitRef,
  personPoolSpecs,
  readName,
  royalHouseFor,
  surnameFor,
  worldDataset,
  type Person,
} from "@admin/world";
import { generateFoundingPool } from "./founding.js";
import { generateNationPool } from "./people.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";

// Names are drawn per person, and a draw made in ignorance of everyone else in
// the same country produces 8.7% of people sharing a first name with a
// colleague, seven pairs sharing a full name outright, and twenty-three people
// called things like "Petr Petrov" and "Bekele Bekele". A cabinet seating two
// ministers both called Yeva is what that looks like on a screen.

const SEEDS = ["names-a", "names-b", "names-c"];

function pools(seed: string) {
  const streams = createRngStreams(makeCampaignSeed(seed));
  return personPoolSpecs.map((spec) => ({
    nation: String(spec.nation),
    people: generateNationPool(spec, String(spec.nation), streams),
  }));
}

/**
 * A person's given name and second name as their tradition wrote them: family
 * name first in China, "bin" before a Malay father's name, a two-word Burmese
 * given name. Splitting at the first space read a Chinese surname as a given
 * name.
 */
function partsOf(person: Person): { readonly given: string; readonly second: string; readonly royal: boolean } {
  const nation = person.nationality as string;
  const role = person.eligibleRoles[0] as string;
  const culture = nameCultureFor(nation);
  const gender = parsePortraitRef(person.portraitRef).gender;
  const lead = nationLeadRole(nation) === role ? leadNameGroup(nation) : undefined;
  const house = royalHouseFor(nation, role);
  const groups = lead ? [lead] : nationNameBank(nation, culture).groups;
  const read = readName(person.name, groups, gender, (_group, drawn) => surnameFor(nation, culture, drawn, gender), house);
  if (!read) throw new Error(`${nation} ${person.name} reads as no tradition of its bank`);
  return { given: read.given.split(" ")[0]!, second: read.second, royal: house !== undefined };
}
const givenOf = (person: Person) => partsOf(person).given;

/**
 * The shallowest pool a person of this nationality can be named out of.
 *
 * A person draws from the bucket their own gender presentation picks, so the
 * bank a collision is possible against is one bucket, not the whole bank. The
 * androgynous bucket is authored shallower than the other two and drawn from
 * far more rarely, so the binding constraint is the smaller of the two common
 * ones. A bank split by heritage names each person from one group only, so
 * there the binding constraint is the smallest group's bucket. The bank is the
 * nation's own share of a bank several traditions use (Pakistan draws from the
 * Muslim run of the south-asian bank only).
 */
function smallestGenderBucket(nation: string): number {
  const bank = nationNameBank(nation, nameCultureFor(nation));
  const bucket = (groups: typeof bank.groups) =>
    Math.min(
      groups.reduce((n, group) => n + group.given.masculine.length, 0),
      groups.reduce((n, group) => n + group.given.feminine.length, 0),
    );
  return nameCultureFor(nation) === "american" ? Math.min(...bank.groups.map((group) => bucket([group]))) : bucket(bank.groups);
}

describe("the names a nation's cast is given", () => {
  it("never gives two people the same full name", () => {
    for (const seed of SEEDS) {
      for (const { nation, people } of pools(seed)) {
        const names = people.map((p) => p.name);
        expect(new Set(names).size, `${seed} ${nation}`).toBe(names.length);
      }
    }
  });

  it("never welds a first name to its own surname", () => {
    for (const seed of SEEDS) {
      for (const { nation, people } of pools(seed)) {
        for (const person of people) {
          const parts = partsOf(person);
          if (parts.royal) continue;
          const given = parts.given.toLowerCase();
          const surname = parts.second.toLowerCase();
          const shares =
            (given.length >= 4 && surname.startsWith(given.slice(0, 4))) ||
            (surname.length >= 4 && given.startsWith(surname.slice(0, 4)));
          expect(shares, `${seed} ${nation}: ${person.name}`).toBe(false);
        }
      }
    }
  });

  // Two rules rather than one ratio. The share of repeated first names across
  // the whole world was measuring the size of the cast as much as the quality
  // of the draw: it loosened twice as the American bench grew, and it moved
  // again — with no change to the draw at all — when sixty foreign capitals
  // stopped staffing thirteen American seats, because the clean 60 nations left
  // the denominator and the crowded one stayed. What the rule means is that a
  // repeat happens only where the arithmetic forces it, and that is testable
  // directly.
  it("repeats no first name at all in a country whose bench fits inside its own name bank", () => {
    for (const seed of SEEDS) {
      for (const { nation, people } of pools(seed)) {
        if (people.length >= smallestGenderBucket(nation)) continue;
        const counts = new Map<string, number>();
        for (const person of people) {
          const given = givenOf(person);
          counts.set(given, (counts.get(given) ?? 0) + 1);
        }
        const doubled = [...counts.entries()].filter(([, count]) => count > 1);
        expect(doubled, `${seed} ${nation}: ${doubled.map(([name]) => name).join(", ")}`).toEqual([]);
      }
    }
  });

  // The seat nation is the only country this can bind on: it seats a cabinet,
  // the executive branch below it, the Hill, the Senate's panels and fifty
  // statehouses out of one bench, which is more Americans than there are
  // American given names of one gender in the bank. Some collision is then
  // pigeonhole rather than a defect — but a draw that had stopped retrying
  // would pile a name up far past three, and that is what this catches.
  it("never leans on one name where the bank has run out", () => {
    for (const seed of SEEDS) {
      for (const { nation, people } of pools(seed)) {
        const counts = new Map<string, number>();
        for (const person of people) {
          const given = givenOf(person);
          counts.set(given, (counts.get(given) ?? 0) + 1);
        }
        const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
        expect(worst[1], `${seed} ${nation}: ${worst[0]} used ${worst[1]} times`).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("the cast a seed produces", () => {
  it("is the same cast every time that seed is played", () => {
    const once = pools("repeatable").flatMap((p) => p.people.map((x) => x.name));
    const again = pools("repeatable").flatMap((p) => p.people.map((x) => x.name));
    expect(once).toEqual(again);
  });

  it("is a different cast in a different campaign", () => {
    const a = pools("campaign-one")[0]!.people.map((p) => p.name);
    const b = pools("campaign-two")[0]!.people.map((p) => p.name);
    expect(a).not.toEqual(b);
  });

  it("leaves a person's attributes and face untouched by what they are called", () => {
    // Names draw from their own stream precisely so that resolving a collision
    // cannot reach sideways into competence, age or portrait.
    const [first] = pools("stability");
    const person = first!.people[0]!;
    const [firstAgain] = pools("stability");
    const same = firstAgain!.people[0]!;
    expect(same.age).toBe(person.age);
    expect(same.portraitRef).toBe(person.portraitRef);
    expect(same.competence).toBe(person.competence);
  });
});

// The American bench, pinned. Names are drawn per person from the seed, so a
// change to the draw, the banks or the order the bench is generated in moves
// these, and is supposed to: the new names are recorded here deliberately, with
// the change that earned them, instead of arriving as a silent redraw of every
// campaign ever founded on these seeds.
//
// Pinned 2026-09-23, when the United States stopped drawing from the Anglo bank
// it shared with Britain and began drawing each person from the Census and SSA
// group their face was drawn from, with the bench's sex and heritage read off
// the office and the party they carry. One name moved the same day, when the
// draw began refusing every name on a roster of people in office and not only
// the ones the leader table's sources cite.
const AMERICAN_PINS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "pin-a": {
    "role-treasury-minister": ["Patrick McLaughlin", "Byron Bates", "Hector Amaya"],
    "role-governor": ["Trevor Knight", "Stephen Reese", "Wesley Stewart"],
    "role-committee-chair": ["Lawrence Stanley", "Harry Richards", "Rosie Saucedo"],
  },
  "pin-b": {
    "role-treasury-minister": ["Andy Khuu", "Gary Schwartz", "George Owen"],
    "role-governor": ["Adam Tyler", "Constance Stanley", "Wendy Bell"],
    "role-committee-chair": ["Clinton Farrell", "Linda Morrow", "Tim Holland"],
  },
  "pin-c": {
    "role-treasury-minister": ["Dwight Hicks", "James Manning", "Debbie Spencer"],
    "role-governor": ["Courtney Rich", "Bernard Rhodes", "Bonnie Hartman"],
    "role-committee-chair": ["Darlene Osborne", "Ernest Malone", "Clyde Sullivan"],
  },
};

describe("the American bench a seed produces", () => {
  for (const [seed, roles] of Object.entries(AMERICAN_PINS)) {
    it(`is the pinned bench under "${seed}"`, () => {
      const pool = generateFoundingPool(makeCampaignSeed(seed), worldDataset).filter((person) => person.nationality === "USA");
      for (const [role, names] of Object.entries(roles)) {
        const bench = pool.filter((person) => (person.eligibleRoles[0] as string) === role).slice(0, names.length);
        expect(bench.map((person) => person.name), `${seed} ${role}`).toEqual(names);
      }
    });
  }
});

// A few foreign lead benches, pinned the same way, incumbent first.
//
// Pinned 2026-09-23, when every government abroad began drawing against the
// leader table: a lead chair's presentation, the incumbent's age and every
// lead candidate's party are the table's, cabinets draw women at the
// government's recorded share, a woman's surname takes her language's feminine
// form, Iceland names people for a parent, and Pakistan, India, Bangladesh,
// Mauritius and the Nordic countries draw from their own tradition of a shared
// bank. Every one of those moves a foreign name; none moves an American one.
// Russia and Saudi Arabia moved again the same day: Russia now draws from
// Russian names alone, a Saudi Crown Prince is named for his father and the
// house, and no one abroad carries a name on the roster of people in office
// or the rare family name of anyone who has led their country.
const FOREIGN_LEAD_PINS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "pin-a": {
    RUS: ["Oleg Petrov", "Leonid Kondratyev", "Savva Faddeev"],
    SAU: ["Saleh bin Thamer Al Saud", "Abdulrahman bin Saad Al Saud", "Majid bin Saeed Al Saud"],
    ISL: ["Snædís Ægisdóttir", "Linda Magnúsdóttir", "Sigrún Jóhannsdóttir"],
    POL: ["Antoni Zieliński", "Władysław Pietrzak", "Norman Sowa"],
    PAK: ["Tariq Talukder", "Hamid Sikder", "Naveed Kazmi"],
    MEX: ["Ángela Ruiz", "Olivia Orozco", "Marta Rojas"],
  },
  "pin-b": {
    RUS: ["Konstantin Nesterov", "Kirill Makarov", "Leontiy Grekov"],
    SAU: ["Jaber bin Thamer Al Saud", "Saleh bin Saleh Al Saud", "Jamal bin Fawaz Al Saud"],
    ISL: ["Snædís Davíðsdóttir", "Rósa Egilsdóttir", "Helga Ásgeirsdóttir"],
    POL: ["Franciszek Wróbel", "Wacław Czarnecki", "Norman Kwiatkowski"],
    PAK: ["Atif Zaidi", "Haroon Sheikh", "Rashid Bukhari"],
    MEX: ["Marcela Flores", "Inés Gómez", "Olivia Mendoza"],
  },
  "pin-c": {
    RUS: ["Oleg Osipov", "Innokenti Frolov", "Casimir Efremov"],
    SAU: ["Ziyad bin Saad Al Saud", "Hamdan bin Muhanna Al Saud", "Saud bin Obaid Al Saud"],
    ISL: ["Elísabet Logadóttir", "Kolbrún Karlsdóttir", "Erla Hannesdóttir"],
    POL: ["Gustaw Kucharski", "Bartłomiej Czerwiński", "Adrian Witkowski"],
    PAK: ["Tanveer Sheikh", "Yasir Hashmi", "Iqbal Ali"],
    MEX: ["Bibiana Espinoza", "Amalia Trujillo", "Patricia Salas"],
  },
};

describe("the foreign lead benches a seed produces", () => {
  for (const [seed, nations] of Object.entries(FOREIGN_LEAD_PINS)) {
    it(`are the pinned benches under "${seed}"`, () => {
      const pool = generateFoundingPool(makeCampaignSeed(seed), worldDataset);
      for (const [nation, names] of Object.entries(nations)) {
        const lead = nationLeadRole(nation)!;
        const bench = pool.filter((person) => person.nationality === nation && (person.eligibleRoles[0] as string) === lead);
        expect(bench.map((person) => person.name), `${seed} ${nation}`).toEqual(names);
      }
    });
  }
});
