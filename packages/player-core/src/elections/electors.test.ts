import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { closestCalls, electorsReading, finaleChamberParties } from "./electors";
import type { FinaleContest } from "./finale";

const opening = openingCampaign();

function contest(electoralVotes: number, won: boolean): FinaleContest {
  return {
    share: won ? 0.52 : 0.46,
    electoralVotes,
    opponentVotes: 538 - electoralVotes,
    electoralMajority: 270,
    calls: [],
    summary: "",
    won,
  };
}

function anchoredTo(party: "democrat" | "republican"): Campaign {
  return { ...opening, congress: { ...opening.congress, caucusAnchor: party } };
}

describe("the night's electors", () => {
  it("seats Democrats on the left whichever party the administration anchors to", () => {
    expect(electorsReading(anchoredTo("democrat"), contest(300, true)).parties.map((block) => [block.party, block.seats])).toEqual([
      ["democrat", 300],
      ["republican", 238],
    ]);
    expect(electorsReading(anchoredTo("republican"), contest(300, true)).parties.map((block) => [block.party, block.seats])).toEqual([
      ["democrat", 238],
      ["republican", 300],
    ]);
  });

  it("counts all 538 against the majority and says the margin in the right direction", () => {
    const won = electorsReading(anchoredTo("democrat"), contest(300, true));
    expect(won.total).toBe(538);
    expect(won.majority).toBe(270);
    expect(won.verdict).toBe("You won 300 electoral votes, 62 more than the other side.");
    expect(electorsReading(anchoredTo("democrat"), contest(200, false)).verdict).toBe("You won 200 electoral votes, 138 fewer than the other side.");
  });
});

describe("the states the night was counted in", () => {
  const calls = [
    { state: "PA", share: 0.505, electoralVotes: 19, administrationVotes: 19, winner: "administration", allocation: "winner-take-all" },
    { state: "TX", share: 0.53, electoralVotes: 40, administrationVotes: 0, winner: "opposition", allocation: "winner-take-all" },
    { state: "GA", share: 0.5, electoralVotes: 16, administrationVotes: 0, winner: "opposition", allocation: "winner-take-all" },
  ] as unknown as FinaleContest["calls"];

  it("orders every state by margin, names it and says who carried it", () => {
    const rows = closestCalls({ ...contest(300, true), calls });
    expect(rows.map((row) => row.state)).toEqual(["GA", "PA", "TX"]);
    expect(rows[1]).toMatchObject({ name: "Pennsylvania", forYou: true, electoralVotes: 19 });
    expect(rows[1]!.margin).toBe("Carried by 1 point, 51% of the two-way vote");
    expect(rows[0]!.forYou).toBe(false);
  });
});

describe("a chamber the next President meets", () => {
  it("seats the administration's side under its own party", () => {
    const chamber = { chamber: "house", name: "House", composition: { administration: 220, opposition: 214, independent: 1 }, anchor: "republican", other: "democrat" } as never;
    expect(finaleChamberParties(chamber).map((party) => [party.party, party.seats])).toEqual([
      ["democrat", 214],
      ["independent", 1],
      ["republican", 220],
    ]);
  });
});
