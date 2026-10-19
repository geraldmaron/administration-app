import { describe, expect, it } from "vitest";
import { openConflict, type Campaign, type Commitment } from "@admin/engine";
import { MARITIME_ZONES, ringsContain, type NationId, type ZoneId } from "@admin/world";
import { nationOutline, onLand } from "@admin/world/maps";
import { openingCampaign } from "../__fixtures__/opening";
import { bandMidpoint, commandAreas, placeForces, seaCommand, zoneCommand } from "./force-placement";
import { clusterForces } from "./force-clusters";
import { SLOTS_PER_ZONE, zoneSlots } from "./zone-slots";

const opening = openingCampaign({ seedText: "force-placement" });
const US = opening.founding.nation;

function withCommitment(campaign: Campaign, commitment: Commitment): Campaign {
  return { ...campaign, commitments: { ...campaign.commitments, [commitment.id]: commitment } };
}

function deployment(id: string, target: Commitment["target"], actor: NationId = US, location?: Commitment["location"]): Commitment {
  return {
    id,
    kind: "deployment",
    actor,
    target,
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 0 },
    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 2 },
    startedTurn: 0,
    review: "standing",
    status: "active",
    rationale: "test",
    ...(location ? { location } : {}),
  };
}

function withOverride(campaign: Campaign, nation: string, command: string): Campaign {
  const unified = campaign.security.unifiedCommand;
  return { ...campaign, security: { ...campaign.security, unifiedCommand: { ...unified, aorOverrides: { ...unified.aorOverrides, [nation]: command as never } } } };
}

describe("command areas", () => {
  it("draws an area for every geographic command with ground or sea, and none for a functional one", () => {
    const areas = commandAreas(opening);
    const ids = areas.map((area) => area.command);
    expect(ids).toEqual(expect.arrayContaining(["CCMD-EUCOM", "CCMD-INDOPACOM", "CCMD-CENTCOM", "CCMD-AFRICOM", "CCMD-SOUTHCOM", "CCMD-NORTHCOM"]));
    for (const functional of ["CCMD-STRATCOM", "CCMD-SOCOM", "CCMD-TRANSCOM", "CCMD-CYBERCOM", "CCMD-SPACECOM"]) expect(ids).not.toContain(functional);
    const seas = areas.flatMap((area) => area.seas);
    expect([...seas].sort()).toEqual(MARITIME_ZONES.map((zone) => zone.id).sort());
  });

  it("gives each sea to the command that holds most of its coast", () => {
    expect(seaCommand(opening, "SEA-persian-gulf")).toBe("CCMD-CENTCOM");
    expect(seaCommand(opening, "SEA-baltic")).toBe("CCMD-EUCOM");
    expect(seaCommand(opening, "SEA-south-china-sea")).toBe("CCMD-INDOPACOM");
    expect(seaCommand(opening, "SEA-caribbean")).toBe("CCMD-SOUTHCOM");
  });

  it("moves a country, and a sea whose coast it tips, the week the plan is amended", () => {
    const amended = ["JPN", "KOR", "PRK"].reduce((campaign, nation) => withOverride(campaign, nation, "CCMD-NORTHCOM"), opening);
    expect(zoneCommand(amended, "JPN")).toBe("CCMD-NORTHCOM");
    const northcom = commandAreas(amended).find((area) => area.command === "CCMD-NORTHCOM")!;
    expect(northcom.nations).toContain("JPN");
    expect(northcom.seas).toContain("SEA-sea-of-japan");
    expect(commandAreas(amended).find((area) => area.command === "CCMD-INDOPACOM")!.nations).not.toContain("JPN");
  });
});

describe("seeded slots", () => {
  it("puts every slot inside its zone: at sea off every coast, in a country on its land", () => {
    for (const zone of MARITIME_ZONES) {
      const slots = zoneSlots(zone.id);
      expect(slots.length, zone.id).toBeGreaterThan(SLOTS_PER_ZONE / 2);
      for (const slot of slots) {
        expect(ringsContain([zone.ring], slot), zone.id).toBe(true);
        expect(onLand(slot), zone.id).toBe(false);
      }
    }
    for (const slot of zoneSlots("POL")) expect(ringsContain(nationOutline("POL")!, slot)).toBe(true);
  });

  it("draws the same slots every time, and falls back to a recorded point where the map has no outline", () => {
    expect(zoneSlots("SEA-red-sea")).toEqual(zoneSlots("SEA-red-sea"));
    expect(zoneSlots("XKX", [21.17, 42.67])).toEqual([[21.17, 42.67]]);
    expect(zoneSlots("XKX")).toEqual([]);
  });
});

describe("placing forces", () => {
  const placements = placeForces(opening);

  it("draws a sourced installation at its own point, labeled as itself", () => {
    const kadena = placements.find((placement) => placement.label.startsWith("Kadena"))!;
    expect(kadena.precision).toBe("installation");
    expect(kadena.point).toEqual([127.7694, 26.3517]);
    expect(kadena.zone).toBe("JPN");
    expect(kadena.command).toBe("CCMD-INDOPACOM");
    expect(kadena.source).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+/);
  });

  it("never names a site for a zone-level row: a rotation is labeled with its zone", () => {
    const poland = placements.find((placement) => placement.zone === "POL")!;
    expect(poland.precision).toBe("zone");
    expect(poland.label).toBe(poland.zoneName);
    expect(ringsContain(nationOutline("POL")!, poland.point)).toBe(true);
  });

  it("sizes a host's installations as shares of its stationed total", () => {
    const japan = placements.filter((placement) => placement.zone === "JPN");
    expect(japan.reduce((sum, placement) => sum + placement.personnel, 0)).toBeCloseTo(bandMidpoint("30,000 to 60,000")!, 6);
  });

  it("places a deployment in its stored sea, and one to a war on the defender's ground", () => {
    const gulf = deployment("commitment:test:gulf", { kind: "nation", id: "BHR" }, US, { theater: "SEA-persian-gulf" as ZoneId });
    const conflict = openConflict("RUS" as NationId, "UKR" as NationId, opening.turn, "test");
    const withWar = { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } };
    const joiner = deployment("commitment:test:joiner", { kind: "conflict", id: conflict.id }, "BLR" as NationId);
    const campaign = withCommitment(withCommitment(withWar, gulf), joiner);
    const placed = placeForces(campaign);
    expect(placed.find((placement) => placement.id === gulf.id)?.zone).toBe("SEA-persian-gulf" as ZoneId);
    const war = placed.find((placement) => placement.id === joiner.id)!;
    expect(war.zone).toBe("UKR");
    expect(war.precision).toBe("zone");
    expect(war.personnel).toBeGreaterThan(0);
  });

  it("is a pure reading: the same campaign places the same way, and a wound-down base leaves", () => {
    expect(placeForces(opening)).toEqual(placements);
    const first = placements[0]!;
    const closed = { ...opening, commitments: { ...opening.commitments, [first.id]: { ...opening.commitments[first.id]!, status: "wound-down" as const } } };
    expect(placeForces(closed).map((placement) => placement.id)).not.toContain(first.id);
  });
});

describe("clusters by zoom", () => {
  const placements = placeForces(opening);

  it("shows one marker per command far out, one per zone at region scale, one per placement up close", () => {
    const world = clusterForces(opening, placements, "world");
    const region = clusterForces(opening, placements, "region");
    const close = clusterForces(opening, placements, "close");
    expect(world.find((cluster) => cluster.key === "world:command:CCMD-INDOPACOM")?.label).toBe("INDOPACOM");
    expect(region.find((cluster) => cluster.key === `region:${US}:JPN`)?.members.length).toBe(placements.filter((p) => p.zone === "JPN").length);
    expect(close).toHaveLength(placements.length);
    expect(world.every((cluster) => cluster.precision === "zone")).toBe(true);
    for (const level of [world, region, close]) expect(level.flatMap((cluster) => cluster.members).sort()).toEqual(placements.map((p) => p.id).sort());
  });
});

describe("band midpoints", () => {
  it("reads ranges and floors, and nothing else", () => {
    expect(bandMidpoint("1,000 to 5,000")).toBe(3000);
    expect(bandMidpoint("about 10,000 to 20,000 above the stationed totals")).toBe(15000);
    expect(bandMidpoint("under 500")).toBe(250);
    expect(bandMidpoint("a naval task group")).toBeUndefined();
  });
});
