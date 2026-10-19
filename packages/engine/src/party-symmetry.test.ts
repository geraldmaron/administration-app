import { sharesAtMargin } from "./electorate.js";
import { recomputeApproval } from "./opinion.js";
import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, US_ID, worldDataset, type PersonId, type RoleId } from "@admin/world";
import { foundedForBalance, HARNESS_PRESIDENTS } from "./balance-harness.js";
import { usPartyOfPerson } from "./cast-fit.js";
import { recompose } from "./elections.js";
import { openingMandate, openingSeats, type OpeningSeats } from "./founding-congress.js";
import { draftCabinetCandidates, generateFoundingPool } from "./founding.js";
import { majorityCaucus, hillPost } from "./hill.js";
import { partyForCaucus, sealCaucusAnchor } from "./party.js";
import { makeCampaignSeed } from "./rng.js";
import type { Campaign, UsMajorParty } from "./state.js";

// What changes when the President's party changes, and what must not.
//
// The Congress a President inherits is the country's, not a mirror of the
// President: the same year that hands a Republican both chambers can hand a
// Democrat a Republican Senate, because the map leans. What must not move with
// the party label is the rest of the founding's honesty: every leader of a
// caucus belongs to it, every chair is staffed, and the public the President
// meets on the first morning is the same public.

const PARTIES = ["democrat", "republican", "independent"] as const;

type Control = "unified" | "divided";

/** Whether the President's caucus holds both chambers, counting the independents where they caucus. */
function controlOf(seats: OpeningSeats, anchor: UsMajorParty): Control {
  const holds = (chamber: keyof OpeningSeats) => {
    const own = seats[chamber][anchor] + (anchor === "democrat" ? seats[chamber].independent : 0);
    const other = seats[chamber][anchor === "democrat" ? "republican" : "democrat"] + (anchor === "republican" ? seats[chamber].independent : 0);
    return own >= other;
  };
  return holds("house") && holds("senate") ? "unified" : "divided";
}

describe("the Congress a President inherits", () => {
  const seeds = Array.from({ length: 50 }, (_, i) => makeCampaignSeed(`inherited-congress-${i}`));

  for (const party of PARTIES) {
    it(`hands a ${party} President unified government in some years and divided government in others`, () => {
      const anchor = sealCaucusAnchor(party, HARNESS_PRESIDENTS[party]);
      const outcomes = new Set(
        seeds.map((seed) => controlOf(openingSeats(seed, openingMandate(seed, undefined), party, anchor), anchor)),
      );
      expect([...outcomes].sort()).toEqual(["divided", "unified"]);
    });
  }

  it("is not the same Congress for a Democrat and a Republican on the same seed", () => {
    for (const seed of seeds) {
      const mandate = openingMandate(seed, undefined);
      const democrat = openingSeats(seed, mandate, "democrat", "democrat");
      const republican = openingSeats(seed, mandate, "republican", "republican");
      expect(democrat, seed).not.toEqual(republican);
    }
  });

  it("carries more of the President's party in on a bigger mandate", () => {
    const seed = seeds[0]!;
    const landslide = openingSeats(seed, "landslide", "republican", "republican");
    const lost = openingSeats(seed, "popular-vote-loss", "republican", "republican");
    expect(landslide.house.republican).toBeGreaterThan(lost.house.republican);
    expect(landslide.senate.republican).toBeGreaterThan(lost.senate.republican);
  });

  it("seats exactly the counted Congress, with the two Senate independents caucusing with the Democrats", () => {
    for (const party of PARTIES) {
      const { campaign } = foundedForBalance("sealed-congress", party);
      const seed = campaign.seed;
      const anchor = campaign.congress.caucusAnchor;
      const seats = openingSeats(seed, openingMandate(seed, undefined), party, anchor);
      expect(campaign.congress.chambers.house.administration).toBe(seats.house[anchor]);
      expect(campaign.congress.chambers.senate.independent).toBe(2);
      expect(campaign.congress.chambers.house.independent).toBe(0);
    }
  });

  it("counts control by who the members caucus with, and gives a tie to the Vice President's side", () => {
    const tie = { seats: 100, administration: 49, opposition: 49, independent: 2 };
    expect(majorityCaucus(tie, "democrat")).toBe("administration");
    expect(majorityCaucus(tie, "republican")).toBe("opposition");
    expect(majorityCaucus({ seats: 100, administration: 50, opposition: 48, independent: 2 }, "republican")).toBe("administration");
  });
});

/** Every Hill post and panel seat whose holder does not belong to the caucus that holds it. */
function misplacedMembers(campaign: Campaign, congress: Campaign["congress"]): readonly string[] {
  const party = (id: string) => usPartyOfPerson(campaign.people[id as PersonId]!.base);
  const sitsWith = (id: string, caucusParty: UsMajorParty) =>
    party(id) === caucusParty || (caucusParty === "democrat" && party(id) === "independent");
  const posts = congress.leadership.flatMap((figure) => {
    const caucusParty = partyForCaucus(figure.caucus, congress.caucusAnchor);
    return sitsWith(figure.person as string, caucusParty) ? [] : [`${hillPost(figure.post)?.title}: ${party(figure.person as string)}`];
  });
  const gavel = majorityCaucus(congress.chambers.senate, congress.caucusAnchor);
  const minority = gavel === "administration" ? "opposition" : "administration";
  const panels = Object.values(congress.committees).flatMap((seat) => [
    ...(seat.chair && !sitsWith(seat.chair as string, partyForCaucus(gavel, congress.caucusAnchor)) ? [`${seat.committee} chair`] : []),
    ...(seat.ranking && !sitsWith(seat.ranking as string, partyForCaucus(minority, congress.caucusAnchor)) ? [`${seat.committee} ranking`] : []),
  ]);
  return [...posts, ...panels];
}

/** Twenty midterms' worth of swings, big enough to flip each chamber back and forth. */
const SWINGS: readonly { readonly house: number; readonly senate: number }[] = Array.from({ length: 20 }, (_, i) => ({
  house: (i % 2 === 0 ? -1 : 1) * (35 + (i % 3) * 10),
  senate: (i % 2 === 0 ? -1 : 1) * (6 + (i % 4)),
}));

describe("who leads each caucus", () => {
  for (const party of PARTIES) {
    for (const seedText of ["recompose-a", "recompose-b"]) {
      it(`is always the caucus's own party, across twenty recomposes (${party}, ${seedText})`, () => {
        const { campaign } = foundedForBalance(seedText, party);
        expect(misplacedMembers(campaign, campaign.congress)).toEqual([]);
        let congress = campaign.congress;
        for (const [index, swing] of SWINGS.entries()) {
          const bounded = {
            house: Math.max(-congress.chambers.house.administration, Math.min(congress.chambers.house.opposition, swing.house)),
            senate: Math.max(-congress.chambers.senate.administration, Math.min(congress.chambers.senate.opposition, swing.senate)),
          };
          congress = recompose(congress, bounded, campaign.people, campaign.founding.nation, 2 + index, campaign.states).congress;
          expect(misplacedMembers(campaign, congress), `recompose ${index + 1}`).toEqual([]);
          expect(congress.leadership.length).toBe(7);
        }
      });
    }
  }
});

describe("the rest of the founding, whoever is President", () => {
  it("seats no more than two independent governors, and every statehouse", () => {
    for (const party of PARTIES) {
      for (const seedText of ["governors-a", "governors-b", "governors-c"]) {
        const { campaign } = foundedForBalance(seedText, party);
        const governors = Object.values(campaign.people).filter((person) => person.currentRole === "role-governor");
        expect(governors.length).toBe(50);
        expect(governors.filter((person) => usPartyOfPerson(person.base) === "independent").length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("offers at least two of the President's own party on every cabinet shortlist", () => {
    for (const seedText of ["shortlist-a", "shortlist-b", "shortlist-c", "shortlist-d", "shortlist-e"]) {
      const pool = generateFoundingPool(makeCampaignSeed(seedText), worldDataset);
      for (const party of ["democrat", "republican"] as const) {
        const slate = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, { party, ideology: HARNESS_PRESIDENTS[party] });
        for (const [role, shortlist] of Object.entries(slate)) {
          const own = shortlist.filter((person) => usPartyOfPerson(person) === party).length;
          expect(own, `${seedText} ${party} ${role as RoleId}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("opens both party Presidents on the same public when the country is even", () => {
    // A campaign draws its party shares inside a symmetric range, so on one seed
    // either party may start a point or two ahead; across seeds neither does.
    // On an even country the formula reads side, never party.
    const even = (party: (typeof PARTIES)[number]) => {
      const { campaign } = foundedForBalance("same-public", party);
      return recomputeApproval({ ...campaign, electorateShares: sharesAtMargin(0) }).player.metrics.approval;
    };
    expect(even("democrat")).toBe(even("republican"));
  });
});
