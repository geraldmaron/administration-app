import { districtHolder, type Campaign, type StateDelegation, type UsMajorParty } from "@admin/engine";
import type { DistrictId } from "@admin/world";
import { whipByState, whipCount } from "../../congress/whip-count.js";
import { noData, solid, type LensReading, type MapLens, type RegionRef } from "../contract.js";
import type { MapPalette } from "../palette.js";

// Congress on the map, as the campaign seats it today: the House by state
// delegation (dithered in proportion) and by district at close zoom, an
// equal-area hex view so urban seats are not erased by their size, the
// Senate's two seats per state, and a bill's whip count by delegation.
// Nothing here reads the dataset's opening roster; a midterm that moves a seat
// moves its dots.

const NO_ADMINISTRATION = "No game in progress";

type PartyCounts = { readonly democrat: number; readonly republican: number; readonly independent: number };

function houseCounts(delegation: StateDelegation, anchor: UsMajorParty): PartyCounts {
  const { administration, opposition, independent } = delegation.house;
  return anchor === "democrat" ? { democrat: administration, republican: opposition, independent } : { democrat: opposition, republican: administration, independent };
}

function senateCounts(delegation: StateDelegation): PartyCounts {
  const count = (party: string) => delegation.senate.filter((seat) => seat.party === party).length;
  return { democrat: count("democrat"), republican: count("republican"), independent: count("independent") };
}

function partyDither(counts: PartyCounts, palette: MapPalette, of: string): LensReading {
  const seats = counts.democrat + counts.republican + counts.independent;
  const parts = [
    counts.democrat > 0 ? `${counts.democrat} Democratic` : "",
    counts.republican > 0 ? `${counts.republican} Republican` : "",
    counts.independent > 0 ? `${counts.independent} Independent` : "",
  ].filter(Boolean);
  return {
    text: `${parts.join(", ")} of ${seats} ${of}`,
    rank: (counts.democrat - counts.republican) / seats,
    fill: { kind: "dither", colors: [palette.democrat, palette.republican, palette.independent], weights: [counts.democrat, counts.republican, counts.independent] },
  };
}

function delegationOf(campaign: Campaign, id: string): StateDelegation | undefined {
  return campaign.states[id as keyof Campaign["states"]]?.delegation;
}

function districtReading(campaign: Campaign, id: string, palette: MapPalette): LensReading {
  const party = districtHolder(campaign, id as DistrictId);
  if (party === "democrat") return solid("Held by a Democrat", 1, palette.democrat);
  if (party === "republican") return solid("Held by a Republican", -1, palette.republican);
  return noData(palette, "No voting member");
}

function houseRead(campaign: Campaign | null, palette: MapPalette): MapLens["read"] {
  return (region: RegionRef) => {
    if (region.layer === "world") return null;
    if (!campaign) return noData(palette, NO_ADMINISTRATION);
    if (region.layer === "districts") return districtReading(campaign, region.id, palette);
    const delegation = delegationOf(campaign, region.id);
    if (!delegation) return noData(palette);
    if (delegation.house.seats === 0) return noData(palette, "No voting member");
    return partyDither(houseCounts(delegation, campaign.congress.caucusAnchor), palette, "House seats");
  };
}

function partyLegend(palette: MapPalette): MapLens["legend"] {
  return [
    { label: "Democratic", color: palette.democrat },
    { label: "Republican", color: palette.republican },
    { label: "Independent", color: palette.independent },
  ];
}

export function houseLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return { id: "house", name: "House seats", level: "district", scale: "categorical", encoding: "dither", legend: partyLegend(palette), read: houseRead(campaign, palette) };
}

/** The same seats, every district one equal hex. */
export function houseHexLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return { id: "house-hex", name: "House seats, equal area", level: "district", scale: "categorical", encoding: "color", cartogram: "hex", legend: partyLegend(palette), read: houseRead(campaign, palette) };
}

/** Each state's two senators, dithered half and half when the pair is split. */
export function senateLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return {
    id: "senate",
    name: "Senate seats",
    level: "state",
    scale: "categorical",
    encoding: "dither",
    legend: partyLegend(palette),
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!campaign) return noData(palette, NO_ADMINISTRATION);
      if (region.id === "DC") return noData(palette, "No senators");
      const delegation = delegationOf(campaign, region.id);
      return delegation ? partyDither(senateCounts(delegation), palette, "senators") : noData(palette);
    },
  };
}

/** The lens id a bill's whip count takes: `whip:<chamber>:<bill id>`. */
export function whipLensId(chamber: "house" | "senate", billId: string): string {
  return `whip:${chamber}:${billId}`;
}

function parseWhip(id: string): { readonly chamber: "house" | "senate"; readonly billId: string } | undefined {
  const match = /^whip:(house|senate):(.+)$/.exec(id);
  return match ? { chamber: match[1] as "house" | "senate", billId: match[2]! } : undefined;
}

/** Actual recorded delegation votes; future member support remains unresolved. */
export function whipLens(id: string, campaign: Campaign | null, palette: MapPalette): MapLens | undefined {
  const parsed = parseWhip(id);
  if (!parsed) return undefined;
  const bill = campaign?.bills[parsed.billId];
  const count = campaign && bill ? whipCount(campaign, bill) : null;
  const rows = count ? whipByState(count, parsed.chamber) : null;
  const chamberWord = parsed.chamber === "house" ? "House" : "Senate";
  return {
    id,
    name: `${chamberWord} count, by delegation`,
    level: "state",
    scale: "categorical",
    encoding: "dither",
    legend: [
      { label: "With you", color: palette.forLean },
      { label: "Against you", color: palette.againstLean },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!rows) return noData(palette, campaign ? "No such bill" : NO_ADMINISTRATION);
      const row = rows.get(region.id);
      if (!row) return noData(palette, parsed.chamber === "senate" && region.id === "DC" ? "No senators" : count?.question === "recorded" ? "No recorded vote" : "Support unclear");
      return {
        text: `${row.withYou} of ${row.seats} with you`,
        rank: row.withYou / row.seats,
        fill: { kind: "dither", colors: [palette.forLean, palette.againstLean], weights: [row.withYou, row.seats - row.withYou] },
      };
    },
  };
}
