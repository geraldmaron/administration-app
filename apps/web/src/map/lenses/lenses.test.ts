import { describe, expect, it } from "vitest";
import { stateApprovals, type StateCall } from "@admin/engine";
import { NAMED_PALETTE, regionTable } from "../__fixtures__/map-fixtures";
import { regionKey } from "../data";
import { openingHarnessCampaign } from "../harness/fixture";
import { planLevels } from "../levels";
import { lensRows, readRegion, refOf, regionOfRef, toRendererLens } from "./contract";
import { LENS_IDS, resolveLens } from "./registry";
import { callReading, leanText } from "./state-lenses";

const table = regionTable();
const campaign = openingHarnessCampaign();
const region = (layer: "world" | "states" | "districts", id: string) => table.byKey.get(regionKey(layer, id))!;

describe("lens resolution", () => {
  it("builds every listed lens, with or without a campaign", () => {
    for (const id of LENS_IDS) {
      expect(resolveLens(id, campaign, NAMED_PALETTE).id).toBe(id);
      expect(resolveLens(id, null, NAMED_PALETTE).id).toBe(id);
    }
  });

  it("falls back to the neutral lens for an unknown or absent id, never an error", () => {
    for (const id of [undefined, "", "not-a-lens", "APPROVAL"]) {
      const lens = resolveLens(id, campaign, NAMED_PALETTE);
      expect(lens.id).toBe("neutral");
      expect(lens.read(region("states", "CA"), "state")).toBeNull();
    }
  });
});

describe("effective level", () => {
  it("is never finer than the zoom supports: a district lens dithers by state at country zoom", () => {
    expect(planLevels("district", 60, false).effective).toBe("state");
    expect(planLevels("district", 10, false).effective).toBe("district");
    expect(planLevels("state", 10, false).effective).toBe("state");
    expect(planLevels("nation", 10, false).effective).toBe("nation");
  });

  it("dithers a state's House delegation at state level and colors a district solid at district level", () => {
    const house = resolveLens("house", campaign, NAMED_PALETTE);
    const ca = house.read(region("states", "CA"), "state");
    expect(ca?.fill.kind).toBe("dither");
    const district = house.read(region("districts", "NY-12"), "district");
    expect(district?.fill.kind).toBe("solid");
  });
});

describe("the Congress lenses read the campaign as it is seated, not the dataset", () => {
  const seats = (fill: { readonly kind: string; readonly weights?: readonly number[] } | undefined) => (fill && "weights" in fill ? fill.weights : undefined);

  it("dithers a state's House seats from its apportioned delegation, and moves when the seats move", () => {
    const house = resolveLens("house", campaign, NAMED_PALETTE);
    const ca = campaign.states.CA!.delegation!;
    const reading = house.read(region("states", "CA"), "state");
    expect(seats(reading?.fill)?.reduce((sum, n) => sum + n, 0)).toBe(ca.house.seats);
    const flipped = { ...campaign, states: { ...campaign.states, CA: { ...campaign.states.CA!, delegation: { ...ca, house: { ...ca.house, administration: ca.house.opposition, opposition: ca.house.administration } } } } };
    const moved = resolveLens("house", flipped, NAMED_PALETTE).read(region("states", "CA"), "state");
    expect(seats(moved?.fill)).toEqual([...(seats(reading?.fill) ?? [])].slice(0, 2).reverse().concat(seats(reading?.fill)?.slice(2) ?? []));
  });

  it("dithers a state's two senators, and gives DC none", () => {
    const senate = resolveLens("senate", campaign, NAMED_PALETTE);
    const reading = senate.read(region("states", "OH"), "state");
    expect(seats(reading?.fill)?.reduce((sum, n) => sum + n, 0)).toBe(2);
    expect(reading?.text).toMatch(/of 2 senators$/);
    expect(senate.read(region("states", "DC"), "state")?.text).toBe("No senators");
    expect(senate.read(region("districts", "OH-01"), "district")).toBeNull();
  });

  it("shows no seats, not the opening roster, before an administration is in office", () => {
    expect(resolveLens("house", null, NAMED_PALETTE).read(region("states", "CA"), "state")?.text).toBe("No administration in office");
  });

  it("keeps future member support unresolved on the delegation map", () => {
    const bill = { id: "bill:act-tax-relief-and-growth:1", act: "act-tax-relief-and-growth", title: "Tax Relief and Growth Act", sponsor: "bipartisan" as const, introducedTurn: 1, status: "in-progress" as const, stage: "floor" as const, passage: [] };
    const withBill = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
    const lens = resolveLens(`whip:house:${bill.id}`, withBill, NAMED_PALETTE);
    expect(lens.id).toBe(`whip:house:${bill.id}`);
    expect(lens.read(region("states", "TX"), "state")?.text).toBe("Support unresolved");
    expect(resolveLens("whip:house:bill:none", withBill, NAMED_PALETTE).read(region("states", "TX"), "state")?.text).toBe("No such bill");
  });

  it("colors each state by where its regional paper stands", () => {
    expect(resolveLens("press-reach", campaign, NAMED_PALETTE).read(region("states", "OH"), "state")?.text).toMatch(/: (Friendly|Even-handed|Skeptical|Hostile)$/);
  });
});

describe("state lenses", () => {
  it("reads approval from the engine's state approval, at state level only", () => {
    const approvals = stateApprovals(campaign) as Readonly<Record<string, number>>;
    const lens = resolveLens("approval", campaign, NAMED_PALETTE);
    const reading = lens.read(region("states", "PA"), "state");
    expect(reading?.rank).toBeCloseTo(approvals["PA"]!);
    expect(reading?.text).toMatch(/^\d+% approve$/);
    expect(lens.read(region("districts", "PA-01"), "district")).toBeNull();
    expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
  });

  it("shows no data, not a guess, before an administration is in office", () => {
    const reading = resolveLens("approval", null, NAMED_PALETTE).read(region("states", "PA"), "state");
    expect(reading?.fill).toEqual({ kind: "solid", color: "nodata" });
  });

  it("says lean the way a reader does", () => {
    expect(leanText(-0.12)).toBe("D+12");
    expect(leanText(0.041)).toBe("R+4");
    expect(leanText(0.002)).toBe("Even");
  });

  it("dithers a state that splits its electoral votes in proportion", () => {
    const split: StateCall = { state: "ME" as StateCall["state"], share: 0.52, electoralVotes: 4, administrationVotes: 3, winner: "administration", allocation: "by-district" };
    const reading = callReading(split, NAMED_PALETTE);
    expect(reading.fill).toEqual({ kind: "dither", colors: ["forLean", "againstLean"], weights: [3, 1] });
    const safe = callReading({ ...split, administrationVotes: 4, share: 0.58, allocation: "winner-take-all" }, NAMED_PALETTE);
    expect(safe.fill).toEqual({ kind: "solid", color: "forStrong" });
    // `share` is the administration's whoever won: a state lost narrowly has it just under half.
    const lost = callReading({ ...split, administrationVotes: 0, winner: "opposition", share: 0.47, allocation: "winner-take-all" }, NAMED_PALETTE);
    expect(lost.fill).toEqual({ kind: "solid", color: "againstLean" });
  });

  it("calls a state safe against you by the opposition's share, not yours", () => {
    const deep: StateCall = { state: "WY" as StateCall["state"], share: 0.28, electoralVotes: 3, administrationVotes: 0, winner: "opposition", allocation: "winner-take-all" };
    const reading = callReading(deep, NAMED_PALETTE);
    expect(reading.fill).toEqual({ kind: "solid", color: "againstStrong" });
    expect(reading.text).toBe("Called against you, 72% to 28%, 3 electoral votes");
    expect(reading.rank).toBeCloseTo(0.28, 9);
  });
});

describe("nation lenses", () => {
  it("paints the United States in its own gold and reads the rest through standing", () => {
    const lens = resolveLens("relations", campaign, NAMED_PALETTE);
    expect(lens.read(region("world", "USA"), "nation")?.fill).toEqual({ kind: "solid", color: "own" });
    const france = lens.read(region("world", "FRA"), "nation");
    expect(france).not.toBeNull();
    expect(["favorable", "steady", "caution", "adverse", "unread"]).toContain((france!.fill as { color: string }).color);
  });

  it("sizes the forces lens by presence, with radius kept in the 0.6× to 1.6× band", () => {
    const lens = resolveLens("forces", campaign, NAMED_PALETTE);
    const hosts = table.regions.filter((r) => r.layer === "world").flatMap((r) => {
      const fill = lens.read(r, "nation")?.fill;
      return fill?.kind === "solid" && fill.scale !== undefined ? [fill.scale] : [];
    });
    expect(hosts.length).toBeGreaterThan(0);
    for (const scale of hosts) {
      expect(scale).toBeGreaterThanOrEqual(0.6);
      expect(scale).toBeLessThanOrEqual(1.6);
    }
  });

  it("reads a US state under a nation lens as the United States, so the country never goes neutral", () => {
    const renderer = toRendererLens(resolveLens("relations", campaign, NAMED_PALETTE), table, NAMED_PALETTE);
    expect(renderer.fill(region("states", "TX"), "state")).toEqual({ kind: "solid", color: "own" });
  });
});

describe("districts inside a detached state", () => {
  it("carry their state's approval, said as statewide, because no district figure would be honest", () => {
    const lens = resolveLens("approval", campaign, NAMED_PALETTE);
    const state = lens.read(region("states", "PA"), "state")!;
    const district = readRegion(lens, table, region("districts", "PA-03"), "district")!;
    expect(district.fill).toEqual(state.fill);
    expect(district.text).toBe(`${state.text}, statewide`);
    expect(toRendererLens(lens, table, NAMED_PALETTE).fill(region("districts", "PA-03"), "district")).toEqual(state.fill);
  });

  it("are drawn by their own lean under the lean lens", () => {
    const lens = resolveLens("lean", campaign, NAMED_PALETTE);
    const urban = readRegion(lens, table, region("districts", "PA-03"), "district")!;
    expect(urban.text).not.toMatch(/statewide/);
    expect(urban.text).toMatch(/^(D\+\d+|R\+\d+|Even)$/);
  });

  it("still rank by state in the list, so a state lens never lists 435 copies of 51 values", () => {
    const rows = lensRows(resolveLens("approval", campaign, NAMED_PALETTE), table, "district");
    expect(rows).toHaveLength(51);
  });
});

describe("population by state", () => {
  it("ranks the largest state first and keeps radius in the magnitude band", () => {
    const lens = resolveLens("state-population", campaign, NAMED_PALETTE);
    const rows = lensRows(lens, table, "state");
    expect(rows[0]!.ref).toBe("state:CA");
    expect(rows[0]!.value).toMatch(/million people$/);
    const fill = lens.read(region("states", "WY"), "state")?.fill;
    expect(fill?.kind === "solid" ? fill.scale : undefined).toBeGreaterThanOrEqual(0.6);
  });
});

describe("the accessible list", () => {
  it("ranks every state for a state lens, highest first, with the value in words", () => {
    const rows = lensRows(resolveLens("approval", campaign, NAMED_PALETTE), table, "state");
    expect(rows).toHaveLength(51);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.rank).toBeGreaterThanOrEqual(rows[i]!.rank);
    expect(rows[0]!.ref).toMatch(/^state:[A-Z]{2}$/);
    expect(rows.every((row) => row.value.endsWith("approve"))).toBe(true);
  });

  it("lists the House by delegation at state level and by seat at district level", () => {
    const house = resolveLens("house", campaign, NAMED_PALETTE);
    const byState = lensRows(house, table, "state");
    expect(byState.find((row) => row.ref === "state:CA")?.value).toMatch(/Democratic.*Republican.*of 52 House seats/);
    const bySeat = lensRows(house, table, "district");
    expect(bySeat.length).toBeGreaterThan(430);
    expect(bySeat.find((row) => row.ref === "district:NY-12")?.name).toBe("District NY-12");
  });

  it("lists governments by name for a nation lens, and nothing for the neutral lens", () => {
    const rows = lensRows(resolveLens("relations", campaign, NAMED_PALETTE), table, "nation");
    expect(rows.find((row) => row.ref === "nation:FRA")?.name).toBe("France");
    expect(lensRows(resolveLens("neutral", campaign, NAMED_PALETTE), table, "state")).toEqual([]);
  });

  it("round-trips a ref", () => {
    for (const ref of ["nation:FRA", "state:CA", "district:NY-12"]) expect(refOf(regionOfRef(table, ref)!)).toBe(ref);
    expect(regionOfRef(table, "county:X")).toBeUndefined();
  });
});

describe("the delta lens", () => {
  it("recolors each state by its approval move since the last change, and says both ends", () => {
    const moved = { ...campaign, player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: Math.min(1, campaign.player.metrics.approval + 0.04) } } };
    const before = stateApprovals(campaign) as Readonly<Record<string, number>>;
    const after = stateApprovals(moved) as Readonly<Record<string, number>>;
    const lens = resolveLens("delta", moved, NAMED_PALETTE, campaign);
    const reading = lens.read(region("states", "OH"), "state");
    expect(reading?.rank).toBeCloseTo(after["OH"]! - before["OH"]!, 12);
    expect(reading?.rank).toBeGreaterThan(0);
    expect(reading?.text).toMatch(/^\+[\d.]+ points, \d+% to \d+%$/);
    expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
  });

  it("shows no data rather than a change when nothing has changed yet", () => {
    const reading = resolveLens("delta", campaign, NAMED_PALETTE, null).read(region("states", "OH"), "state");
    expect(reading?.text).toBe("Nothing has changed yet");
  });

  it("replays a closed week from the weekly state series, and the latest week up to the open week's figures", () => {
    const { week, ...closed } = campaign;
    void week;
    const now = stateApprovals({ ...closed, turn: 5 }) as Readonly<Record<string, number>>;
    const opened = Object.fromEntries(Object.entries(now).map(([id, value]) => [id, value - 0.01]));
    const kept = { ...closed, turn: 5, stateApprovalHistory: [{ turn: 4, approval: opened }] };
    const reading = resolveLens("week:4", kept, NAMED_PALETTE).read(region("states", "OH"), "state");
    expect(reading?.rank).toBeCloseTo(0.01, 12);
    const lost = resolveLens("week:2", kept, NAMED_PALETTE).read(region("states", "OH"), "state");
    expect(lost?.text).toBe("This week is older than the record of state figures");
  });
});
