/**
 * The opening board: the world this administration finds at the oath.
 *
 * Two boards. The default is drawn from the campaign seed: zero, one or two
 * interstate wars from a catalog of hostile pairs, each pair's weight a
 * planning value. The other is the world as of 2026, held as a named preset so
 * the real snapshot stays playable. Both carry the civil and non-state wars as
 * insurgencies in their hosts, US forces at their installations, and the
 * sanctions programs in force; the seeded board keeps each of those by how
 * likely the table reads it to last into 2029.
 *
 * The United States is never a belligerent at the oath, no pair that shares a
 * defense body is drawn, and no pair where either side is a US treaty ally is
 * drawn, because a war on an ally at the oath would leave the country owing a
 * war it never chose. The draw is hashed from the seed, never streamed, so a
 * board replays exactly.
 */
import {
  CARRIED_CONFLICTS,
  US_GOODS_TRADE,
  US_ID,
  fnv1a,
  organizations,
  type CarriedConflictRow,
  type NationId,
} from "@admin/world";
import { conflictId } from "./conflicts.js";
import { daysBetween, isSameDate } from "./clock.js";
import { MAX_OPERATORS, operatorId } from "./operators.js";
import { tradeSector } from "./trade-sectors.js";
import { leadingExportOf } from "./trade-volume.js";
import { openingBaseCommitments } from "./basing.js";
import type { Campaign, Commitment, Conflict, ConflictInheritance, GameDate, NationRuntime, OperatorRuntime } from "./state.js";
import type { TradeMeasure } from "./trade.js";
import { HELD_FRONT_INTENSITY, OPENING_WAR_SUPPORT } from "./war-tick.js";

/** A held front opens under the held line, so the tick reads it as held from its first week. */
export const OPENING_HELD_INTENSITY = HELD_FRONT_INTENSITY - 0.05;

// The mapping from the table's status to game state, one rule for every war
// (a planning mapping, stated in each row's provenance): an active war opens
// at a grinding tempo below the decisive line, and every carried war opens
// with the exhaustion of its age, capped well below the exhaustion that ends
// a war, so a war nearly five years old does not end on its first tick.
const CARRIED_ACTIVE_INTENSITY = 0.4;
const EXHAUSTION_PER_YEAR = 0.15;
const CARRIED_EXHAUSTION_CAP = 0.5;
/** A catalog pair with no real war behind it is mapped as a war some years old. A planning value. */
const CATALOG_PLANNING_AGE_YEARS = 4;
const OATH_TURN = 0;

/** The day the carried-conflicts table was read, which is the date the preset claims. */
export const WORLD_2026_AS_OF: GameDate = { year: 2026, month: 9, day: 24 };
const DEFAULT_OATH: GameDate = { year: 2029, month: 1, day: 20 };

type OpeningPosture = "active" | "held";

type Flashpoint = {
  readonly aggressor: NationId;
  readonly defender: NationId;
  readonly posture: OpeningPosture;
  /** When the fighting began, where a real war stands behind the pair. */
  readonly since?: GameDate;
  /** Plausibility weight: the dyad's tension, halved where its sources record no fighting in 2025 or 2026. A planning value. */
  readonly weight: number;
  readonly source: string;
};

function parseSince(since: string): GameDate | undefined {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(since);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2] ?? 1), day: Number(match[3] ?? 1) };
}

function carriedFlashpoint(row: CarriedConflictRow, weight: number): Flashpoint {
  const since = parseSince(row.since);
  return {
    aggressor: row.parties[0] as NationId,
    defender: row.parties[1] as NationId,
    posture: row.mappedState === "held" ? "held" : "active",
    ...(since ? { since } : {}),
    weight,
    source: row.source,
  };
}

function dyad(a: string, b: string, posture: OpeningPosture, weight: number, sources: string): Flashpoint {
  return { aggressor: a as NationId, defender: b as NationId, posture, weight, source: `dyads.tsv ${a}-${b} (${sources}), opened 2026-09-24` };
}

const CARRIED_WARS = CARRIED_CONFLICTS.filter((row) => row.kind === "interstate");

// The hostile pairs with a sourced dyad row and no war in the carried table.
// Left out on purpose: the two tensions (China and Taiwan, the two Koreas),
// which are dyad rows rather than wars; Greece and Turkey, which share NATO;
// China and the Philippines, a US treaty ally; Serbia and Kosovo, where US
// forces are stationed; and every row sourced only from general knowledge.
const DYAD_FLASHPOINTS: readonly Flashpoint[] = [
  dyad("IND", "PAK", "active", 0.85, "S16, S33"),
  dyad("PAK", "AFG", "active", 0.9, "S25, S56"),
  dyad("THA", "KHM", "held", 0.75, "S26"),
  dyad("ISR", "LBN", "held", 0.8, "S30, S53"),
  dyad("ARM", "AZE", "held", 0.375, "S27, S54"),
  dyad("VEN", "GUY", "held", 0.35, "S34, S55"),
  dyad("SAU", "IRN", "held", 0.35, "S31"),
  dyad("ISR", "SYR", "held", 0.275, "S52"),
  dyad("ETH", "EGY", "held", 0.3, "S28"),
];

/** Every pair the seeded board can draw from: the carried wars first, then the dyad pairs. */
export const FLASHPOINT_CATALOG: readonly Flashpoint[] = [...CARRIED_WARS.map((row) => carriedFlashpoint(row, 0.95)), ...DYAD_FLASHPOINTS];

function yearsBetween(from: GameDate, to: GameDate): number {
  return Math.max(0, daysBetween(from, to) / 365.25);
}

function openingExhaustion(flashpoint: Flashpoint, asOf: GameDate): number {
  const years = flashpoint.since ? yearsBetween(flashpoint.since, asOf) : CATALOG_PLANNING_AGE_YEARS;
  return Math.round(Math.min(CARRIED_EXHAUSTION_CAP, years * EXHAUSTION_PER_YEAR) * 1000) / 1000;
}

function refuseFoundingParty(pair: Flashpoint): Flashpoint {
  if (pair.aggressor === US_ID || pair.defender === US_ID) {
    throw new Error("The United States is never a belligerent at the oath.");
  }
  return pair;
}

function toConflict(pair: Flashpoint, asOf: GameDate, inherited: ConflictInheritance, beats: readonly string[]): Conflict {
  const flashpoint = refuseFoundingParty(pair);
  const held = flashpoint.posture === "held";
  const exhaustion = openingExhaustion(flashpoint, asOf);
  const cause = OPENING_LINES.underWay;
  return {
    id: conflictId(flashpoint.aggressor, flashpoint.defender, OATH_TURN),
    aggressor: flashpoint.aggressor,
    defender: flashpoint.defender,
    joined: { aggressor: [], defender: [] },
    startedTurn: OATH_TURN,
    cause,
    intensity: held ? OPENING_HELD_INTENSITY : CARRIED_ACTIVE_INTENSITY,
    warSupport: { aggressor: OPENING_WAR_SUPPORT.aggressor, defender: OPENING_WAR_SUPPORT.defender },
    exhaustion: { aggressor: exhaustion, defender: exhaustion },
    status: "active",
    beats: [cause, ...beats].map((description) => ({ turn: OATH_TURN, description })),
    inherited,
  };
}

function presetConflict(flashpoint: Flashpoint, asOf: GameDate): Conflict {
  const beats = flashpoint.since ? [OPENING_LINES.since(flashpoint.since), OPENING_LINES.mapped] : [OPENING_LINES.mapped];
  return toConflict(flashpoint, asOf, { asOf: WORLD_2026_AS_OF, source: flashpoint.source }, beats);
}

/** The carried interstate wars as of 2026: Russia against Ukraine active, the Iran front held, the United States absent. */
export function presetWorld2026(asOf: GameDate = DEFAULT_OATH): readonly Conflict[] {
  return CARRIED_WARS.map((row) => presetConflict(carriedFlashpoint(row, 0.95), asOf));
}

// --- The seeded draw ---

function unit(key: string): number {
  return fnv1a(key) / 2 ** 32;
}

// Count is fnv1a("opening-board::<seed>") mod 3, so a third of campaigns open
// on a board with no interstate war at all.
function drawCount(seed: string): 0 | 1 | 2 {
  const count = fnv1a(`opening-board::${seed}`) % 3;
  return count === 1 || count === 2 ? count : 0;
}

/** What the draw needs to know of the roster: who is on it, and which bodies each belongs to. */
type Roster = {
  readonly has: (id: string) => boolean;
  readonly memberships: (id: string) => readonly string[];
};

function rosterOf(nations: Readonly<Record<string, NationRuntime>>): Roster {
  return {
    has: (id) => nations[id] !== undefined,
    memberships: (id) => (nations[id]?.memberships ?? nations[id]?.base.memberships ?? []) as readonly string[],
  };
}

// With no roster to check against, every catalog party counts as present and
// nobody shares a body: the draw a test or a script sees without a campaign.
const CATALOG_ROSTER: Roster = { has: () => true, memberships: () => [] };

const DEFENSE_BODIES: ReadonlySet<string> = new Set(organizations.filter((org) => org.kind === "defense").map((org) => org.id as string));

function sharesDefenseBody(roster: Roster, a: string, b: string): boolean {
  const theirs = new Set(roster.memberships(b));
  return roster.memberships(a).some((org) => DEFENSE_BODIES.has(org) && theirs.has(org));
}

/** The owner's controls on a drawn pair: both on the roster, neither the United States or its treaty ally, and not allies of each other. */
function drawable(roster: Roster, pair: Flashpoint): boolean {
  const parties = [pair.aggressor as string, pair.defender as string];
  if (parties.some((id) => id === US_ID || !roster.has(id))) return false;
  if (parties.some((id) => sharesDefenseBody(roster, id, US_ID))) return false;
  return !sharesDefenseBody(roster, pair.aggressor, pair.defender);
}

function overlaps(a: Flashpoint, b: Flashpoint): boolean {
  return [a.aggressor, a.defender].some((id) => id === b.aggressor || id === b.defender);
}

function pickWeighted(pool: readonly Flashpoint[], key: string): Flashpoint | undefined {
  const total = pool.reduce((sum, pair) => sum + pair.weight, 0);
  let point = unit(key) * total;
  for (const pair of pool) {
    point -= pair.weight;
    if (point < 0) return pair;
  }
  return pool.at(-1);
}

/** Zero, one or two catalog wars, weighted, never sharing a belligerent. The same seed returns the same board. */
function drawnFlashpoints(seed: string, roster: Roster): readonly Flashpoint[] {
  const picks: Flashpoint[] = [];
  let pool = FLASHPOINT_CATALOG.filter((pair) => drawable(roster, pair));
  for (let index = 0; index < drawCount(seed); index += 1) {
    const pick = pickWeighted(pool, `opening-board::pick::${index}::${seed}`);
    if (!pick) break;
    picks.push(pick);
    pool = pool.filter((pair) => !overlaps(pair, pick));
  }
  return picks;
}

/**
 * The seeded board's wars, marked inherited with no real date claimed. Without
 * a roster every catalog pair counts as drawable, which is the draw a script
 * sees before a campaign exists.
 */
export function openingBoard(seed: string, nations?: Readonly<Record<string, NationRuntime>>, asOf: GameDate = DEFAULT_OATH): readonly Conflict[] {
  const pairs = drawnFlashpoints(seed, nations ? rosterOf(nations) : CATALOG_ROSTER);
  return pairs.map((pair) => toConflict(pair, asOf, { asOf, source: `the opening board's flashpoint catalog: ${pair.source}` }, [OPENING_LINES.mapped]));
}

// --- What else the board carries ---

/**
 * How likely the table reads each carried row to last into 2029, as a keep
 * weight for the seeded board (HIGH 0.9, MODERATE-HIGH 0.7, MODERATE 0.6,
 * UNCERTAIN 0.4). The reads are the table's; the numbers are planning values.
 */
const PERSISTENCE: Readonly<Record<string, number>> = {
  "civil:SDN": 0.9,
  "civil:MMR": 0.9,
  "non-state:MLI": 0.9,
  "civil:COD": 0.7,
  "non-state:LBN": 0.6,
  "sanctions:SYR": 0.6,
  "sanctions:VEN": 0.4,
  "sanctions:COD": 0.6,
  "sanctions:NIC": 0.6,
  "sanctions:LBN": 0.6,
};
const DEFAULT_PERSISTENCE = 0.9;

function rowKey(row: CarriedConflictRow): string {
  return `${row.kind}:${row.parties.join(" ")}`;
}

function kept(row: CarriedConflictRow, seed: string, preset: OpeningPreset): boolean {
  if (preset === "world-2026") return true;
  return unit(`opening-board::keep::${rowKey(row)}::${seed}`) < (PERSISTENCE[rowKey(row)] ?? DEFAULT_PERSISTENCE);
}

/** The civil and non-state wars as insurgencies in their hosts, inside the operator caps. */
function boardOperators(
  nations: Readonly<Record<string, NationRuntime>>,
  asOf: GameDate,
  seed: string,
  preset: OpeningPreset,
): readonly OperatorRuntime[] {
  const rows = CARRIED_CONFLICTS.filter((row) => (row.kind === "civil" || row.kind === "non-state") && kept(row, seed, preset)).filter(
    (row) => nations[row.parties[0]!] !== undefined,
  );
  // One insurgency a host keeps every host inside its own cap of
  // MAX_OPERATORS_PER_HOST, and the world's cap bounds them all.
  const byHost = new Map(rows.map((row) => [row.parties[0]!, row] as const).reverse());
  const unique = [...new Set(rows.map((row) => row.parties[0]!))].slice(0, MAX_OPERATORS);
  return unique.map((host) => ({
    id: operatorId("insurgency", host as NationId, OATH_TURN),
    kind: "insurgency",
    nationality: host as NationId,
    inherited: { asOf: preset === "world-2026" ? WORLD_2026_AS_OF : asOf, source: byHost.get(host)!.source },
  }));
}

/** The largest trade sector in one direction of the target's recorded flow with the United States. */
function largestSector(flow: Readonly<Record<string, number>> | undefined): string | undefined {
  return Object.entries(flow ?? {})
    .filter(([sector, value]) => sector !== "other" && value > 0 && tradeSector(sector) !== undefined)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

/**
 * One measure an inherited program files: what kind it is, the trade sector a
 * sectoral program reaches (a list-based program designates named persons and
 * reaches none), the day the authority it rests on took effect, so evasion
 * reads a program the world has lived with for years as mature, and the
 * primary text the scope and date were read from.
 */
export type InheritedProgram = {
  readonly kind: "embargo" | "sanctions" | "asset-restriction";
  readonly sector?: string;
  readonly listed?: true;
  /** An import ban at our border, which designates nobody abroad. */
  readonly direction?: "imports";
  /** 0..1 of the sector's sales the designated companies carry, where the program names companies. */
  readonly covered?: number;
  readonly since: GameDate;
  /** The source's own words for the day the authority took effect, which `since` must match. */
  readonly effective: string;
  readonly source: string;
};

const FR = "https://www.federalregister.gov/documents";
const listed = (since: GameDate, effective: string, source: string): InheritedProgram => ({ kind: "sanctions", listed: true, since, effective, source });
const NO_CLAUSE = "no effective-date clause; effective on signature, THE WHITE HOUSE,";

/**
 * What each carried program actually reaches, read 2026-10-25, dated at the
 * day its authority took effect. A comprehensive embargo stops what the target
 * sells the United States; a sectoral designation reaches the sector's sales
 * (or the designated companies' share of them) to everyone the dollar
 * touches; an import ban stops only what crosses our border; a list-based
 * program designates people and cuts no trade.
 */
export const INHERITED_PROGRAMS: Readonly<Record<string, readonly InheritedProgram[]>> = {
  CUB: [{ kind: "embargo", since: { year: 1963, month: 7, day: 9 }, effective: "28 FR 6974, July 9, 1963", source: "Cuban Assets Control Regulations, 31 CFR part 515, source note, https://www.ecfr.gov/current/title-31/part-515" }],
  IRN: [
    { kind: "embargo", since: { year: 1995, month: 5, day: 7 }, effective: "Sec. 8. (a) This order is effective at 12:01 a.m., eastern daylight time, on May 7, 1995", source: `E.O. 12959, ${FR}/1995/05/09/95-11694` },
    { kind: "sanctions", sector: "energy-crude", since: { year: 2018, month: 11, day: 5 }, effective: "sec. 2(a)(iv): on or after November 5, 2018, for the purchase, acquisition, sale, transport, or marketing of petroleum or petroleum products from Iran", source: `E.O. 13846, ${FR}/2018/08/07/2018-17068` },
    { kind: "sanctions", sector: "chemicals", since: { year: 2018, month: 11, day: 5 }, effective: "sec. 2(a)(v): on or after November 5, 2018, for the purchase, acquisition, sale, transport, or marketing of petrochemical products from Iran", source: `E.O. 13846, ${FR}/2018/08/07/2018-17068` },
  ],
  PRK: [
    { kind: "embargo", since: { year: 2011, month: 4, day: 19 }, effective: "Sec. 7. This order is effective at 12:01 a.m. eastern daylight time on April 19, 2011", source: `E.O. 13570, prohibiting the importation of any goods from North Korea, ${FR}/2011/04/20/2011-9739` },
    { kind: "asset-restriction", since: { year: 2016, month: 3, day: 16 }, effective: "Sec. 13. This order is effective at 12:01 a.m. eastern daylight time on March 16, 2016", source: `E.O. 13722, blocking the property of the Government of North Korea, ${FR}/2016/03/18/2016-06355` },
  ],
  SYR: [listed({ year: 2025, month: 7, day: 1 }, "Sec. 3. (a) Effective July 1, 2025, I hereby terminate the national emergency declared in Executive Order 13338", `E.O. 14312, revoking the Syria program and keeping designations of the former regime and of terrorist, chemical-weapons and human-rights targets, ${FR}/2025/07/03/2025-12506`)],
  RUS: [
    // Rosneft reports "~35% share in Russian oil production" (rosneft.com, Rosneft at a glance); Lukoil "over 2% of crude production" in the world
    // (lukoil.com, Upstream), about 0.18 of Russia's at the dataset's 0.11 world share. Both opened 2026-10-25.
    { kind: "sanctions", sector: "energy-crude", covered: 0.53, since: { year: 2025, month: 10, day: 22 }, effective: "Treasury Sanctions Major Russian Oil Companies ... October 22, 2025", source: "OFAC designation of Rosneft and Lukoil under E.O. 14024, with secondary-sanctions risk to foreign financial institutions, https://home.treasury.gov/news/press-releases/sb0290" },
    // An import ban and a ban on exchange services (OFAC FAQ 1168); the exchange part reaches further than our border, which the record cannot yet hold.
    { kind: "sanctions", sector: "bulk-mining", direction: "imports", since: { year: 2024, month: 4, day: 13 }, effective: "Covered metals acquisition services April 12, 2024 April 13, 2024", source: "OFAC FAQ 1128 (issued and effective dates) and FAQ 1168, https://ofac.treasury.gov/faqs/1128" },
    { kind: "sanctions", sector: "aluminum", direction: "imports", since: { year: 2024, month: 4, day: 13 }, effective: "Covered metals acquisition services April 12, 2024 April 13, 2024", source: "OFAC FAQ 1128 and FAQ 1168, https://ofac.treasury.gov/faqs/1168" },
  ],
  VEN: [{ kind: "sanctions", sector: "energy-crude", since: { year: 2019, month: 1, day: 28 }, effective: "Treasury Sanctions Venezuela's State-Owned Oil Company ... January 28, 2019", source: "OFAC designation of Petroleos de Venezuela, S.A. under E.O. 13850, https://home.treasury.gov/news/press-releases/sm594" }],
  // Belaruskali, the potash designation, was removed from the SDN List on 03/26/2026 (https://ofac.treasury.gov/recent-actions/20260326), before the preset's date.
  BLR: [listed({ year: 2006, month: 6, day: 19 }, "This order is effective at 12:01 a.m. eastern daylight time on June 19, 2006", `E.O. 13405, ${FR}/2006/06/20/06-5592`)],
  SDN: [listed({ year: 2023, month: 5, day: 4 }, `${NO_CLAUSE} May 4, 2023`, `E.O. 14098, ${FR}/2023/05/05/2023-09826`)],
  MLI: [listed({ year: 2019, month: 7, day: 26 }, `${NO_CLAUSE} July 26, 2019`, `E.O. 13882, ${FR}/2019/07/30/2019-16383`)],
  MMR: [
    listed({ year: 2021, month: 2, day: 10 }, `${NO_CLAUSE} February 10, 2021`, `E.O. 14014, ${FR}/2021/02/12/2021-03139`),
    // MOGE's share of the gas projects' sales was not opened, so the whole sector is read as covered: an overstatement.
    { kind: "sanctions", sector: "energy-gas-lng", since: { year: 2023, month: 12, day: 15 }, effective: "Effective Date (EO 14014 Directive 1): 15 Dec 2023", source: "OFAC Directive 1 under E.O. 14014, prohibiting financial services to Myanma Oil and Gas Enterprise, https://ofac.treasury.gov/recent-actions/20231031" },
  ],
  COD: [listed({ year: 2006, month: 10, day: 30 }, "Sec. 9. This order is effective at 12:01 a.m. eastern standard time on October 30, 2006", `E.O. 13413, ${FR}/2006/10/31/06-9020`)],
  YEM: [listed({ year: 2012, month: 5, day: 16 }, `${NO_CLAUSE} May 16, 2012`, `E.O. 13611, ${FR}/2012/05/18/2012-12225`)],
  NIC: [listed({ year: 2018, month: 11, day: 27 }, `${NO_CLAUSE} November 27, 2018`, `E.O. 13851, ${FR}/2018/11/29/2018-26156`)],
  LBN: [listed({ year: 2007, month: 8, day: 1 }, `${NO_CLAUSE} August 1, 2007`, `E.O. 13441, ${FR}/2007/08/03/07-3835`)],
};

/**
 * Where a program is filed. A sectoral program names its sector. Otherwise
 * the largest thing the target sells the United States, the register's own
 * rule; an embargo, which ends the whole flow whatever it is filed under,
 * falls back to the largest thing the United States still sells there (Cuba's
 * imports are all "other"), and then to the target's leading export to the
 * world (Iran's recorded trade has no sector at all).
 */
function programSector(target: string, program: InheritedProgram, nations: Readonly<Record<string, NationRuntime>>): string | undefined {
  if (program.sector) return program.sector;
  const recorded = US_GOODS_TRADE[target];
  const imports = largestSector(recorded?.imports);
  if (program.kind === "sanctions" && !program.listed) return imports;
  return imports ?? largestSector(recorded?.exports) ?? leadingExportOf(nations[target]?.base.stats.trade.topExports ?? [], recorded?.imports ?? {});
}

function programId(target: string, program: InheritedProgram): string {
  return program.sector ? `${program.kind}:${target}:${program.sector}:inherited` : `${program.kind}:${target}:inherited`;
}

function inheritedMeasures(row: CarriedConflictRow, nations: Readonly<Record<string, NationRuntime>>): readonly TradeMeasure[] {
  const target = row.parties[0]!;
  return (INHERITED_PROGRAMS[target] ?? []).flatMap((program) => {
    const sector = programSector(target, program, nations);
    if (!sector) return [];
    return [{
      id: programId(target, program),
      kind: program.kind,
      sector,
      target: target as NationId,
      rate: 0,
      imposedTurn: OATH_TURN,
      imposedDate: program.since,
      authority: "INST-OFAC",
      origin: "us" as const,
      actor: US_ID,
      // The recorded opening already carries what an embargo leaves: no
      // imports, and the farm and medical exports the law licenses. Imports are
      // what it stops, so the book opens on the record rather than at zero.
      ...(program.kind === "embargo" || program.direction === "imports" ? { direction: "imports" as const } : {}),
      ...(program.listed ? { scope: "listed" as const } : {}),
      ...(program.covered !== undefined ? { covered: program.covered } : {}),
    }];
  });
}

function boardMeasures(nations: Readonly<Record<string, NationRuntime>>, seed: string, preset: OpeningPreset): readonly TradeMeasure[] {
  return CARRIED_CONFLICTS.filter((row) => row.kind === "sanctions" && nations[row.parties[0]!] !== undefined && kept(row, seed, preset))
    .flatMap((row) => inheritedMeasures(row, nations));
}

/**
 * Which world a campaign opens on: a board drawn from the campaign seed, or
 * the world as of 2026 held as a named preset. The seeded board is the
 * default; the preset exists so the real snapshot stays playable.
 */
export type OpeningPreset = "seeded" | "world-2026";

/** Everything the board carries into the oath, each keyed the way the campaign stores it. */
export type OpeningWorld = {
  readonly conflicts: readonly Conflict[];
  readonly operators: readonly OperatorRuntime[];
  readonly commitments: readonly Commitment[];
  readonly measures: readonly TradeMeasure[];
};

function carriesGulfFront(conflicts: readonly Conflict[]): boolean {
  return conflicts.some((war) => (war.aggressor as string) === "ISR" && (war.defender as string) === "IRN");
}

/**
 * The world this administration finds at the oath: the wars, the insurgencies
 * in their hosts, US forces at their installations (and the Gulf posture where
 * the board carries the Iran front), and the sanctions programs in force.
 */
export function openingWorld(
  nations: Readonly<Record<string, NationRuntime>>,
  asOf: GameDate,
  seed: string,
  preset: OpeningPreset = "seeded",
): OpeningWorld {
  const conflicts = preset === "world-2026" ? presetWorld2026(asOf) : openingBoard(seed, nations, asOf);
  return {
    conflicts,
    operators: boardOperators(nations, asOf, seed, preset),
    commitments: openingBaseCommitments(nations, carriesGulfFront(conflicts)),
    measures: boardMeasures(nations, seed, preset),
  };
}

/** The carried rows a board left out, and why, for the board's report. */
export function openingBoardOmissions(nations: Readonly<Record<string, NationRuntime>>): readonly string[] {
  return CARRIED_CONFLICTS.flatMap((row) => {
    const host = row.parties[0]!;
    if (row.parties.some((party) => nations[party] === undefined)) return [`${rowKey(row)}: a party is not on the roster`];
    if (row.kind === "sanctions" && !INHERITED_PROGRAMS[host]) return [`${rowKey(row)}: no program scope on file`];
    if (row.kind === "sanctions" && inheritedMeasures(row, nations).length === 0) return [`${rowKey(row)}: no recorded trade for the program to bite on`];
    return [];
  });
}

export type InheritedWorldReading = {
  readonly banner: string;
  readonly mapped: string;
  readonly wars: readonly { readonly id: string; readonly asOf: GameDate; readonly source: string }[];
  readonly insurgencies: readonly NationId[];
};

/**
 * The banner over the world the administration found: the wars it inherited
 * with where each was read from, and the insurgencies it found in their hosts.
 * Undefined on a board that carried no war.
 */
export function selectInheritedWorld(campaign: Campaign): InheritedWorldReading | undefined {
  const wars = Object.values(campaign.conflicts).filter((war) => war.inherited !== undefined);
  if (wars.length === 0) return undefined;
  const real = wars.some((war) => isSameDate(war.inherited!.asOf, WORLD_2026_AS_OF));
  const insurgencies = campaign.operators
    .filter((op) => op.inherited !== undefined && op.nationality !== undefined)
    .map((op) => op.nationality as NationId);
  return {
    banner: real ? OPENING_LINES.bannerAsOf(WORLD_2026_AS_OF) : OPENING_LINES.banner,
    mapped: OPENING_LINES.mapped,
    wars: wars.map((war) => ({ id: war.id, asOf: war.inherited!.asOf, source: war.inherited!.source })),
    insurgencies,
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The board's lines. None claims a date the board did not read, and each says what the game set rather than reported. */
export const OPENING_LINES = {
  underWay: "The war was already under way when this administration took office.",
  mapped: "Its opening state was set by the game from the transition's picture, not reported.",
  since: (date: GameDate) => `The fighting began in ${MONTHS[date.month - 1]} ${date.year}.`,
  banner: "The world as this administration found it.",
  bannerAsOf: (date: GameDate) => `The world as the transition found it, as of ${MONTHS[date.month - 1]} ${date.day}, ${date.year}.`,
  posture: "The Gulf posture is the game's planning estimate; the buildup's direction is reported, its size is not.",
} as const;
