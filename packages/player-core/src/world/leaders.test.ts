import { afterEach, describe, expect, it, vi } from "vitest";
import { createSave, foreignLeaderFor, loadSave, type Campaign } from "@admin/engine";
import { NATION_LEADER_CONSTRAINTS, type NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@admin/world");
});

async function lineWithTable(rows: Readonly<Record<string, unknown>>): Promise<string | undefined> {
  vi.doMock("@admin/world", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@admin/world")>()),
    NATION_LEADER_CONSTRAINTS: rows,
  }));
  vi.resetModules();
  const { leaderProvenanceLine } = await import("./leaders.js");
  return leaderProvenanceLine(openingCampaign());
}

/** A campaign as a save founded before the leader table stores it: no stamp on the founding. */
function foundedBeforeTheTable(campaign: Campaign): Campaign {
  const { leaderTable: _drawnAgainst, ...founding } = campaign.founding;
  return { ...campaign, founding };
}

describe("leaderProvenanceLine", () => {
  it("says nothing while no leader is drawn from the constraint table", async () => {
    expect(await lineWithTable({})).toBeUndefined();
  });

  it("dates the table in words once leaders are drawn from it", async () => {
    expect(await lineWithTable({ DEU: {} })).toBe("The leaders are made up, based on each country's government as of September 23, 2026.");
  });
});

describe("the leaders roster", () => {
  it("dates the shipped table on the country file", async () => {
    const { leaderProvenanceLine } = await import("./leaders.js");
    expect(leaderProvenanceLine(openingCampaign())).toBe("The leaders are made up, based on each country's government as of September 23, 2026.");
  });

  it("titles every foreign leader the way their own government does", async () => {
    const { worldLeaderRows } = await import("./leaders.js");
    const rows = worldLeaderRows(openingCampaign());
    expect(rows).toHaveLength(195);
    for (const row of rows) expect(row.title, row.nation as string).toBe(NATION_LEADER_CONSTRAINTS[row.nation as string]!.title);
    expect(rows.find((row) => row.nation === "DEU")?.title).toBe("Federal Chancellor");
  });

  // A save is loaded, never re-dealt: its people are stored in it. A campaign
  // founded before the leader table keeps the leaders it was founded with,
  // who were drawn without the table, so it must not wear the table's titles
  // or claim to be modeled on the governments the table describes.
  it("keeps an earlier save's leaders under the charter's titles, with no provenance claim", async () => {
    const { leaderProvenanceLine, worldLeaderRows } = await import("./leaders.js");
    const founded = openingCampaign();
    const chancellor = foreignLeaderFor(founded, "DEU" as never)!;
    const runtime = founded.people[chancellor.person]!;
    const earlier: Campaign = foundedBeforeTheTable({
      ...founded,
      people: { ...founded.people, [chancellor.person]: { ...runtime, base: { ...runtime.base, name: "Stored Chancellor", age: 58, party: "party-deu-afd" } } },
    });
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(earlier))));
    expect(loaded.founding.leaderTable).toBeUndefined();
    const rows = worldLeaderRows(loaded);
    const row = rows.find((entry) => entry.nation === "DEU")!;
    expect(row.title).toBe("Prime Minister");
    expect(row.person?.name).toBe("Stored Chancellor");
    expect(loaded.people[chancellor.person]!.base.party).toBe("party-deu-afd");
    expect(rows.find((entry) => entry.nation === "SAU")?.title).not.toBe(NATION_LEADER_CONSTRAINTS.SAU!.title);
    expect(leaderProvenanceLine(loaded)).toBeUndefined();
  });

  it("titles a save founded against the table from the table, and dates it", async () => {
    const { leaderProvenanceLine, worldLeaderRows } = await import("./leaders.js");
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(openingCampaign()))));
    expect(worldLeaderRows(loaded).find((entry) => entry.nation === "DEU")?.title).toBe("Federal Chancellor");
    expect(leaderProvenanceLine(loaded)).toBe("The leaders are made up, based on each country's government as of September 23, 2026.");
  });

  it("drops the table's titles and the chip for a save drawn against another edition of the table", async () => {
    const { leaderProvenanceLine, worldLeaderRows } = await import("./leaders.js");
    const founded = openingCampaign();
    const other: Campaign = { ...founded, founding: { ...founded.founding, leaderTable: "2025-01-01" } };
    expect(worldLeaderRows(other).find((entry) => entry.nation === "DEU")?.title).toBe("Prime Minister");
    expect(leaderProvenanceLine(other)).toBeUndefined();
  });
});

describe("the country file's seat line", () => {
  it("prints the one reading the press abroad prints, to the month for a table seat, and reads a save that stored no seats", async () => {
    const { inOfficeSince, nextSelectionWords } = await import("./leaders.js");
    const { foreignLeadershipReading } = await import("../press/foreign-coverage.js");
    const opening = openingCampaign();
    const seats = opening.foreignPolitics!.seats;
    const table = (Object.keys(seats) as NationId[]).find((id) => seats[id]!.provenance === "table")!;
    expect(inOfficeSince(opening, table)).toBe(foreignLeadershipReading(opening, table)!.since);
    expect(inOfficeSince(opening, table)).not.toMatch(/\d{1,2}, \d{4}/);
    const { foreignPolitics: _stored, ...unstored } = opening;
    expect(inOfficeSince(unstored as Campaign, table)).toBe("In office since at least September 2026.");
    expect(nextSelectionWords(opening, "BEL" as NationId)).toBe("Next time a leader is chosen: June 2029");
  });
});
