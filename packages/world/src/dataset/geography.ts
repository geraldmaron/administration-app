import { Chokepoint, NationGeography } from "../schemas/geography.js";
import type { NationId } from "../schemas/ids.js";
import type { Nation } from "../schemas/nation.js";
import { NATION_LAND_BORDERS } from "./nation-borders.generated.js";

// Geography as a mechanic. Adjacency prices land pressure, distance prices
// force projection, and chokepoint dependence prices trade risk — so all three
// are authored here as data the engine reads, not as prose in a nation record.

// Twelve real maritime chokepoints. `closableByOneState` is the important
// flag: a strait a single government can shut is leverage, while the Cape
// route can only ever be a longer, costlier detour.
export const chokepoints: Chokepoint[] = [
  Chokepoint.parse({
    id: "CP-HORMUZ",
    name: "Strait of Hormuz",
    lat: 26.57,
    lon: 56.25,
    connects: ["mena", "south-asia", "east-asia", "europe-south"],
    globalTrafficShare: 0.2,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-MALACCA",
    name: "Strait of Malacca",
    lat: 2.5,
    lon: 101.4,
    connects: ["east-asia", "southeast-asia", "south-asia", "mena"],
    globalTrafficShare: 0.25,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-SUEZ",
    name: "Suez Canal",
    lat: 30,
    lon: 32.35,
    connects: ["europe-south", "mena", "south-asia", "east-asia"],
    globalTrafficShare: 0.12,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-BAB-EL-MANDEB",
    name: "Bab el-Mandeb",
    lat: 12.58,
    lon: 43.33,
    connects: ["mena", "africa-east", "europe-south", "south-asia"],
    globalTrafficShare: 0.09,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-PANAMA",
    name: "Panama Canal",
    lat: 9.08,
    lon: -79.68,
    connects: ["latin-america", "east-asia", "europe-north", "africa-west"],
    globalTrafficShare: 0.05,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-BOSPHORUS",
    name: "Bosphorus",
    lat: 41.12,
    lon: 29.07,
    connects: ["europe-east", "europe-south", "mena", "central-asia"],
    globalTrafficShare: 0.03,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-GIBRALTAR",
    name: "Strait of Gibraltar",
    lat: 35.97,
    lon: -5.5,
    connects: ["europe-south", "mena", "africa-west", "europe-north"],
    globalTrafficShare: 0.1,
    closableByOneState: false,
  }),
  Chokepoint.parse({
    id: "CP-DANISH-STRAITS",
    name: "Danish Straits",
    lat: 55.7,
    lon: 12.6,
    connects: ["europe-north", "europe-east", "europe-south"],
    globalTrafficShare: 0.03,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-TAIWAN-STRAIT",
    name: "Taiwan Strait",
    lat: 24.5,
    lon: 119.5,
    connects: ["east-asia", "southeast-asia", "pacific"],
    globalTrafficShare: 0.2,
    closableByOneState: true,
  }),
  Chokepoint.parse({
    id: "CP-CAPE-OF-GOOD-HOPE",
    name: "Cape of Good Hope",
    lat: -34.36,
    lon: 18.47,
    connects: ["africa-southern", "europe-south", "south-asia", "latin-america"],
    globalTrafficShare: 0.06,
    closableByOneState: false,
  }),
  Chokepoint.parse({
    id: "CP-DOVER",
    name: "Strait of Dover",
    lat: 51.03,
    lon: 1.52,
    connects: ["europe-north", "europe-south", "africa-west"],
    globalTrafficShare: 0.04,
    closableByOneState: false,
  }),
  Chokepoint.parse({
    id: "CP-SUNDA",
    name: "Sunda Strait",
    lat: -5.9,
    lon: 105.9,
    connects: ["southeast-asia", "east-asia", "pacific", "south-asia"],
    globalTrafficShare: 0.02,
    closableByOneState: true,
  }),
];

// Land borders among the authored nations, and the chokepoints each one's
// seaborne trade actually runs through. Adjacency is symmetric by
// construction and a test enforces it — a one-way border would let pressure
// flow in only one direction.
export const nationGeographies: NationGeography[] = [
  NationGeography.parse({
    nation: "AFG",
    neighbors: ["CHN", "IRN", "PAK"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "ARE",
    neighbors: ["SAU"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.7 }],
  }),
  NationGeography.parse({
    nation: "ARG",
    neighbors: ["BRA", "CHL"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.15 }, { chokepoint: "CP-CAPE-OF-GOOD-HOPE", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "AUS",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.3 }, { chokepoint: "CP-SUNDA", weight: 0.2 }, { chokepoint: "CP-CAPE-OF-GOOD-HOPE", weight: 0.1 }],
  }),
  NationGeography.parse({
    nation: "BEL",
    neighbors: ["DEU", "FRA", "NLD"],
    chokepointDependence: [{ chokepoint: "CP-SUEZ", weight: 0.5 }, { chokepoint: "CP-DOVER", weight: 0.35 }],
  }),
  NationGeography.parse({
    nation: "BGD",
    neighbors: ["IND"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.3 }, { chokepoint: "CP-SUEZ", weight: 0.35 }, { chokepoint: "CP-HORMUZ", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "BLR",
    neighbors: ["POL", "RUS", "UKR"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "BRA",
    neighbors: ["ARG", "COL", "VEN"],
    chokepointDependence: [{ chokepoint: "CP-CAPE-OF-GOOD-HOPE", weight: 0.2 }, { chokepoint: "CP-PANAMA", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "CAN",
    neighbors: ["USA"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "CHE",
    neighbors: ["DEU", "FRA", "ITA"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "CHL",
    neighbors: ["ARG"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.4 }],
  }),
  NationGeography.parse({
    nation: "CHN",
    neighbors: ["AFG", "IND", "KAZ", "PAK", "PRK", "RUS", "VNM"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.9 }, { chokepoint: "CP-HORMUZ", weight: 0.5 }, { chokepoint: "CP-SUEZ", weight: 0.35 }, { chokepoint: "CP-TAIWAN-STRAIT", weight: 0.25 }, { chokepoint: "CP-SUNDA", weight: 0.1 }],
  }),
  NationGeography.parse({
    nation: "COD",
    neighbors: ["RWA"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "COL",
    neighbors: ["BRA", "VEN"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "CUB",
    neighbors: [],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "DEU",
    neighbors: ["BEL", "CHE", "DNK", "FRA", "NLD", "POL"],
    chokepointDependence: [{ chokepoint: "CP-DANISH-STRAITS", weight: 0.4 }, { chokepoint: "CP-SUEZ", weight: 0.5 }, { chokepoint: "CP-GIBRALTAR", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "DNK",
    neighbors: ["DEU"],
    chokepointDependence: [{ chokepoint: "CP-DANISH-STRAITS", weight: 0.9 }, { chokepoint: "CP-SUEZ", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "DZA",
    neighbors: ["MAR"],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.3 }, { chokepoint: "CP-SUEZ", weight: 0.1 }],
  }),
  NationGeography.parse({
    nation: "EGY",
    neighbors: ["ISR"],
    chokepointDependence: [{ chokepoint: "CP-SUEZ", weight: 1 }, { chokepoint: "CP-BAB-EL-MANDEB", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "ESP",
    neighbors: ["FRA", "MAR"],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.7 }, { chokepoint: "CP-SUEZ", weight: 0.35 }],
  }),
  NationGeography.parse({
    nation: "ETH",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-BAB-EL-MANDEB", weight: 0.55 }],
  }),
  NationGeography.parse({
    nation: "FRA",
    neighbors: ["BEL", "CHE", "DEU", "ESP", "ITA"],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.4 }, { chokepoint: "CP-SUEZ", weight: 0.4 }, { chokepoint: "CP-DOVER", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "GBR",
    neighbors: ["IRL"],
    chokepointDependence: [{ chokepoint: "CP-DOVER", weight: 0.6 }, { chokepoint: "CP-GIBRALTAR", weight: 0.3 }, { chokepoint: "CP-SUEZ", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "HUN",
    neighbors: ["UKR"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "IDN",
    neighbors: ["MYS"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.9 }, { chokepoint: "CP-SUNDA", weight: 0.8 }],
  }),
  NationGeography.parse({
    nation: "IND",
    neighbors: ["BGD", "CHN", "PAK"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.5 }, { chokepoint: "CP-MALACCA", weight: 0.4 }, { chokepoint: "CP-SUEZ", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "IRL",
    neighbors: ["GBR"],
    chokepointDependence: [{ chokepoint: "CP-DOVER", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "IRN",
    neighbors: ["AFG", "IRQ", "PAK", "TUR"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.9 }],
  }),
  NationGeography.parse({
    nation: "IRQ",
    neighbors: ["IRN", "SAU", "SYR", "TUR"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.8 }],
  }),
  NationGeography.parse({
    nation: "ISL",
    neighbors: [],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "ISR",
    neighbors: ["EGY", "SYR"],
    chokepointDependence: [{ chokepoint: "CP-SUEZ", weight: 0.3 }, { chokepoint: "CP-BAB-EL-MANDEB", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "ITA",
    neighbors: ["CHE", "FRA"],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.5 }, { chokepoint: "CP-SUEZ", weight: 0.6 }],
  }),
  NationGeography.parse({
    nation: "JPN",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.7 }, { chokepoint: "CP-HORMUZ", weight: 0.5 }, { chokepoint: "CP-TAIWAN-STRAIT", weight: 0.3 }, { chokepoint: "CP-SUNDA", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "KAZ",
    neighbors: ["CHN", "RUS"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "KOR",
    neighbors: ["PRK"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.6 }, { chokepoint: "CP-HORMUZ", weight: 0.45 }, { chokepoint: "CP-TAIWAN-STRAIT", weight: 0.2 }],
  }),
  NationGeography.parse({
    nation: "MAR",
    neighbors: ["DZA", "ESP"],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.65 }, { chokepoint: "CP-SUEZ", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "MEX",
    neighbors: ["USA"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.35 }],
  }),
  NationGeography.parse({
    nation: "MYS",
    neighbors: ["IDN", "SGP", "THA"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 1 }, { chokepoint: "CP-SUNDA", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "NGA",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-GIBRALTAR", weight: 0.15 }, { chokepoint: "CP-CAPE-OF-GOOD-HOPE", weight: 0.1 }],
  }),
  NationGeography.parse({
    nation: "NLD",
    neighbors: ["BEL", "DEU"],
    chokepointDependence: [{ chokepoint: "CP-SUEZ", weight: 0.7 }, { chokepoint: "CP-DOVER", weight: 0.4 }, { chokepoint: "CP-GIBRALTAR", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "NOR",
    neighbors: ["RUS", "SWE"],
    chokepointDependence: [{ chokepoint: "CP-DANISH-STRAITS", weight: 0.15 }, { chokepoint: "CP-SUEZ", weight: 0.2 }],
  }),
  NationGeography.parse({
    nation: "PAK",
    neighbors: ["AFG", "CHN", "IND", "IRN"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.55 }, { chokepoint: "CP-MALACCA", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "PHL",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.4 }],
  }),
  NationGeography.parse({
    nation: "POL",
    neighbors: ["BLR", "DEU", "RUS", "UKR"],
    chokepointDependence: [{ chokepoint: "CP-DANISH-STRAITS", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "PRK",
    neighbors: ["CHN", "KOR", "RUS"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "QAT",
    neighbors: ["SAU"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.9 }],
  }),
  NationGeography.parse({
    nation: "RUS",
    neighbors: ["BLR", "CHN", "KAZ", "NOR", "POL", "PRK", "UKR"],
    chokepointDependence: [{ chokepoint: "CP-BOSPHORUS", weight: 0.5 }, { chokepoint: "CP-DANISH-STRAITS", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "RWA",
    neighbors: ["COD"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "SAU",
    neighbors: ["ARE", "IRQ", "QAT", "YEM"],
    chokepointDependence: [{ chokepoint: "CP-HORMUZ", weight: 0.7 }, { chokepoint: "CP-SUEZ", weight: 0.3 }, { chokepoint: "CP-BAB-EL-MANDEB", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "SGP",
    neighbors: ["MYS"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 1 }, { chokepoint: "CP-SUNDA", weight: 0.6 }],
  }),
  NationGeography.parse({
    nation: "SWE",
    neighbors: ["NOR"],
    chokepointDependence: [{ chokepoint: "CP-DANISH-STRAITS", weight: 0.7 }],
  }),
  NationGeography.parse({
    nation: "SYR",
    neighbors: ["IRQ", "ISR", "TUR"],
    chokepointDependence: [],
  }),
  NationGeography.parse({
    nation: "THA",
    neighbors: ["MYS"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "TUR",
    neighbors: ["IRN", "IRQ", "SYR"],
    chokepointDependence: [{ chokepoint: "CP-BOSPHORUS", weight: 0.9 }],
  }),
  NationGeography.parse({
    nation: "TWN",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-TAIWAN-STRAIT", weight: 1 }, { chokepoint: "CP-MALACCA", weight: 0.7 }, { chokepoint: "CP-HORMUZ", weight: 0.3 }, { chokepoint: "CP-SUNDA", weight: 0.1 }],
  }),
  NationGeography.parse({
    nation: "UKR",
    neighbors: ["BLR", "HUN", "POL", "RUS"],
    chokepointDependence: [{ chokepoint: "CP-BOSPHORUS", weight: 0.8 }],
  }),
  NationGeography.parse({
    nation: "USA",
    neighbors: ["CAN", "MEX"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "VEN",
    neighbors: ["BRA", "COL"],
    chokepointDependence: [{ chokepoint: "CP-PANAMA", weight: 0.3 }],
  }),
  NationGeography.parse({
    nation: "VNM",
    neighbors: ["CHN"],
    chokepointDependence: [{ chokepoint: "CP-MALACCA", weight: 0.5 }],
  }),
  NationGeography.parse({
    nation: "YEM",
    neighbors: ["SAU"],
    chokepointDependence: [{ chokepoint: "CP-BAB-EL-MANDEB", weight: 0.85 }, { chokepoint: "CP-SUEZ", weight: 0.15 }],
  }),
  NationGeography.parse({
    nation: "ZAF",
    neighbors: [],
    chokepointDependence: [{ chokepoint: "CP-CAPE-OF-GOOD-HOPE", weight: 0.6 }, { chokepoint: "CP-GIBRALTAR", weight: 0.15 }],
  }),
];

export const chokepointById: ReadonlyMap<string, Chokepoint> = new Map(chokepoints.map((c) => [c.id, c]));
export const geographyByNation: ReadonlyMap<string, NationGeography> = new Map(
  nationGeographies.map((g) => [g.nation as string, g]),
);

/**
 * The straits a coastal country's trade leans on when nobody has authored its
 * own dependence, by region, with the countries whose coast faces another way
 * than their neighbors'. A prior for thin records: a landlocked country
 * depends on none, and an authored row always wins.
 */
type Dependence = NationGeography["chokepointDependence"];
const lane = (chokepoint: string, weight: number) => ({ chokepoint, weight }) as Dependence[number];

const REGION_CHOKEPOINTS: Readonly<Record<string, Dependence>> = {
  "region-caribbean": [lane("CP-PANAMA", 0.3)],
  "region-central-america": [lane("CP-PANAMA", 0.4)],
  "region-south-america": [lane("CP-PANAMA", 0.25)],
  "region-west-africa": [lane("CP-CAPE-OF-GOOD-HOPE", 0.25)],
  "region-central-africa": [lane("CP-CAPE-OF-GOOD-HOPE", 0.25)],
  "region-east-africa": [lane("CP-BAB-EL-MANDEB", 0.3), lane("CP-SUEZ", 0.25)],
  "region-southern-africa": [lane("CP-CAPE-OF-GOOD-HOPE", 0.3)],
  "region-north-africa": [lane("CP-SUEZ", 0.3), lane("CP-GIBRALTAR", 0.3)],
  "region-middle-east": [lane("CP-HORMUZ", 0.6), lane("CP-SUEZ", 0.2)],
  "region-northern-europe": [lane("CP-DANISH-STRAITS", 0.7)],
  "region-western-europe": [lane("CP-GIBRALTAR", 0.2), lane("CP-SUEZ", 0.2)],
  "region-central-europe": [lane("CP-SUEZ", 0.3)],
  "region-southern-europe": [lane("CP-SUEZ", 0.35), lane("CP-GIBRALTAR", 0.25)],
  "region-eastern-europe": [lane("CP-BOSPHORUS", 0.8)],
  "region-caucasus": [lane("CP-BOSPHORUS", 0.7)],
  "region-south-asia": [lane("CP-HORMUZ", 0.3), lane("CP-MALACCA", 0.2), lane("CP-SUEZ", 0.2)],
  "region-southeast-asia": [lane("CP-MALACCA", 0.5)],
  "region-oceania": [],
};

const COUNTRY_CHOKEPOINTS: Readonly<Record<string, Dependence>> = {
  JOR: [lane("CP-BAB-EL-MANDEB", 0.5), lane("CP-SUEZ", 0.3)],
  LBN: [lane("CP-SUEZ", 0.3), lane("CP-GIBRALTAR", 0.2)],
  PSE: [lane("CP-SUEZ", 0.2)],
  OMN: [lane("CP-HORMUZ", 0.4)],
  SDN: [lane("CP-BAB-EL-MANDEB", 0.5), lane("CP-SUEZ", 0.3)],
  MRT: [lane("CP-GIBRALTAR", 0.2)],
  DJI: [lane("CP-BAB-EL-MANDEB", 0.8), lane("CP-SUEZ", 0.3)],
  ERI: [lane("CP-BAB-EL-MANDEB", 0.7), lane("CP-SUEZ", 0.3)],
  PRT: [lane("CP-GIBRALTAR", 0.2)],
  NZL: [lane("CP-MALACCA", 0.2)],
};

function defaultDependence(nation: Pick<Nation, "id" | "geo">): Dependence {
  if (!nation.geo.coastline) return [];
  return COUNTRY_CHOKEPOINTS[nation.id as string] ?? REGION_CHOKEPOINTS[nation.geo.region as string] ?? [];
}

/**
 * Every land border, both ways, between nations the dataset carries: the
 * authored lists, any neighbor a record states itself, and GeoNames' land
 * borders, united. An authored list only ever adds (a maritime neighbor the
 * dataset treats as one); a border that runs one way is a defect, so none can.
 */
function borders(nations: readonly Pick<Nation, "id" | "geo">[]): ReadonlyMap<string, ReadonlySet<string>> {
  const present = new Set(nations.map((nation) => nation.id as string));
  const edges = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (a === b || !present.has(a) || !present.has(b)) return;
    edges.set(a, (edges.get(a) ?? new Set()).add(b));
    edges.set(b, (edges.get(b) ?? new Set()).add(a));
  };
  for (const geo of nationGeographies) for (const neighbor of geo.neighbors) link(geo.nation as string, neighbor as string);
  for (const nation of nations) for (const neighbor of nation.geo.neighbors) link(nation.id as string, neighbor as string);
  for (const [nation, neighbors] of Object.entries(NATION_LAND_BORDERS)) for (const neighbor of neighbors) link(nation, neighbor);
  return edges;
}

// Geography is applied to the nation records at dataset-assembly time rather
// than typed into each of them, so there is exactly one place a border or a
// lane dependence is stated. A nation with no authored lane dependence takes
// its region's.
export function applyGeography<T extends Pick<Nation, "id" | "geo">>(nations: readonly T[]): T[] {
  const edges = borders(nations);
  return nations.map((nation) => {
    const authored = geographyByNation.get(nation.id as string);
    const dependence = authored?.chokepointDependence ?? defaultDependence(nation);
    return {
      ...nation,
      geo: {
        ...nation.geo,
        neighbors: [...(edges.get(nation.id as string) ?? [])].sort() as NationId[],
        chokepoints: dependence.map((d) => d.chokepoint),
        chokepointDependence: dependence,
      },
    };
  });
}
