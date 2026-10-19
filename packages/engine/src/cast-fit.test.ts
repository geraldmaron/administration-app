import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, US_ID, worldDataset, type Person } from "@admin/world";
import { bandedAgainstList, candidateFit, crossesTheAisle, ideologyCloseness, orderByFit, rankByFit, type FitPresident } from "./cast-fit.js";
import { draftCabinetCandidates, generateFoundingPool } from "./founding.js";
import { makeCampaignSeed } from "./rng.js";

const pool = generateFoundingPool(makeCampaignSeed("cast-fit"), worldDataset).filter(
  (person) => (person.nationality as string) === "USA" && (person.eligibleRoles[0] as string) === "role-defense-minister",
);
const left = { economicLeftRight: -0.4, authLibertarian: -0.2, nationalistGlobalist: -0.3 };
const right = { economicLeftRight: 0.4, authLibertarian: 0.2, nationalistGlobalist: 0.3 };

function withParty(person: Person, party: string): Person {
  return { ...person, party: party as Person["party"] };
}

describe("how well a candidate fits the President", () => {
  it("reads identical politics as full closeness and opposite ends as none", () => {
    expect(ideologyCloseness(left, left)).toBe(1);
    expect(ideologyCloseness({ economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 }, { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 })).toBe(0);
  });

  it("ranks the President's own party first, then closer politics, then competence", () => {
    const ranked = rankByFit(pool, { party: "democrat", ideology: left });
    const own = ranked.filter((candidate) => candidate.coPartisan);
    expect(ranked.slice(0, own.length)).toEqual(own);
    const [a, b] = [pool[0]!, pool[0]!];
    const closer = candidateFit({ ...withParty(a, "party-usa-democrat"), ideology: left }, { party: "democrat", ideology: left });
    const farther = candidateFit({ ...withParty(b, "party-usa-democrat"), ideology: right }, { party: "democrat", ideology: left });
    expect(closer.fit).toBeGreaterThan(farther.fit);
  });

  it("flags a party President's pick of the other party, or of none, as crossing the aisle", () => {
    const person = pool[0]!;
    const democrat = { party: "democrat" as const, ideology: left };
    expect(crossesTheAisle(withParty(person, "party-usa-republican"), democrat)).toBe(true);
    expect(crossesTheAisle(withParty(person, "party-usa-independent"), democrat)).toBe(true);
    expect(crossesTheAisle(withParty(person, "party-usa-democrat"), democrat)).toBe(false);
  });

  it("measures an Independent President's aisle from the caucus their economics sits nearest", () => {
    const person = pool[0]!;
    const leaning = { party: "independent" as const, ideology: { economicLeftRight: 0.5, authLibertarian: 0, nationalistGlobalist: 0 } };
    expect(crossesTheAisle(withParty(person, "party-usa-democrat"), leaning)).toBe(true);
    expect(crossesTheAisle(withParty(person, "party-usa-republican"), leaning)).toBe(false);
    expect(crossesTheAisle(withParty(person, "party-usa-independent"), leaning)).toBe(false);
    // And nobody is their co-partisan: they rank on politics and competence alone.
    expect(rankByFit(pool, leaning).some((candidate) => candidate.coPartisan)).toBe(false);
  });
});

describe("the fit a card prints", () => {
  const democrat: FitPresident = { party: "democrat", ideology: { economicLeftRight: -0.4, authLibertarian: 0, nationalistGlobalist: -0.2 } };

  it("leaves party out, so two people alike in all else fit alike whatever their party", () => {
    const person = { ...pool[0]!, ideology: left };
    const own = candidateFit(withParty(person, "party-usa-democrat"), democrat);
    const other = candidateFit(withParty(person, "party-usa-republican"), democrat);
    expect(own.fit).toBe(other.fit);
    expect(bandedAgainstList([own, other]).map((candidate) => candidate.band)).toEqual(["strong", "strong"]);
  });

  it("bands each name against the best on its own list", () => {
    const person = pool[0]!;
    const at = (fit: number) => ({ ...candidateFit(person, democrat), fit });
    expect(bandedAgainstList([at(0.9), at(0.885), at(0.86), at(0.81), at(0.7)]).map((candidate) => candidate.band)).toEqual([
      "strong",
      "strong",
      "good",
      "fair",
      "poor",
    ]);
  });

  it("tells the President's own party apart on the founding's shortlists", () => {
    // The defect this answers: every co-partisan on every shortlist read
    // "strong", because the party weight alone cleared the band's floor.
    const bands = ["fit-a", "fit-b", "fit-c", "fit-d", "fit-e"].flatMap((seed) => {
      const bench = generateFoundingPool(makeCampaignSeed(seed), worldDataset);
      return Object.values(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, bench, democrat)).map((slate) =>
        rankByFit(slate, democrat).filter((candidate) => candidate.coPartisan).map((candidate) => candidate.band),
      );
    });
    const coPartisans = bands.flat();
    expect(coPartisans.filter((band) => band === "strong").length).toBeLessThan(coPartisans.length * 0.75);
    expect(bands.filter((list) => new Set(list).size === 1).length).toBeLessThan(bands.length / 4);
  });

  it("draws every shortlist in the order the party-weighted score always drew it", () => {
    const drawn = (president: FitPresident) =>
      [...pool]
        .map((person) => {
          const merit = 0.35 * ideologyCloseness(person.ideology, president.ideology) + 0.25 * person.competence;
          const own = candidateFit(person, president).coPartisan;
          const score = Math.round((president.party === "independent" ? merit / 0.6 : (own ? 0.4 : 0) + merit) * 1000) / 1000;
          return { person, own, score };
        })
        .sort((a, b) => Number(b.own) - Number(a.own) || b.score - a.score || b.person.competence - a.person.competence || (a.person.id as string).localeCompare(b.person.id as string))
        .map(({ person }) => person.id);
    for (const president of [democrat, { party: "republican" as const, ideology: right }, { party: "independent" as const, ideology: left }]) {
      expect(orderByFit(pool, president).map((candidate) => candidate.person.id)).toEqual(drawn(president));
    }
  });
});
