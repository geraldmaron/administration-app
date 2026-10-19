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
 * Where a program bites: the largest thing the target sells the United States,
 * the rule the register's own denial uses. An embargo ends the whole flow
 * whatever sector it is filed under, and a long-standing one leaves almost no
 * sector imports to file it by (Cuba's are all "other"), so it falls back to
 * the largest sector the United States still sells there.
 */
function measureSector(target: string, kind: "embargo" | "sanctions"): string | undefined {
  const recorded = US_GOODS_TRADE[target];
  const imports = largestSector(recorded?.imports);
  return kind === "embargo" ? (imports ?? largestSector(recorded?.exports)) : imports;
}

const measureKind = (row: CarriedConflictRow) => (/embargo/.test(row.mappedState) ? "embargo" : "sanctions");

function inheritedMeasure(row: CarriedConflictRow, asOf: GameDate): TradeMeasure | undefined {
  const target = row.parties[0]!;
  const kind = measureKind(row);
  const sector = measureSector(target, kind);
  if (!sector) return undefined;
  return {
    id: `${kind}:${target}:inherited`,
    kind,
    sector,
    target: target as NationId,
    rate: 0,
    imposedTurn: OATH_TURN,
    imposedDate: asOf,
    authority: "INST-OFAC",
    origin: "us",
    actor: US_ID,
    // The recorded opening already carries what the embargo leaves: no
    // imports, and the farm and medical exports the law licenses. Imports are
    // what it stops, so the book opens on the record rather than at zero.
    ...(kind === "embargo" ? { direction: "imports" as const } : {}),
  };
}

function boardMeasures(nations: Readonly<Record<string, NationRuntime>>, asOf: GameDate, seed: string, preset: OpeningPreset): readonly TradeMeasure[] {
  return CARRIED_CONFLICTS.filter((row) => row.kind === "sanctions" && nations[row.parties[0]!] !== undefined && kept(row, seed, preset))
    .map((row) => inheritedMeasure(row, asOf))
    .filter((measure): measure is TradeMeasure => measure !== undefined);
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
    measures: boardMeasures(nations, asOf, seed, preset),
  };
}

/** The carried rows a board left out, and why, for the board's report. */
export function openingBoardOmissions(nations: Readonly<Record<string, NationRuntime>>): readonly string[] {
  return CARRIED_CONFLICTS.flatMap((row) => {
    const host = row.parties[0]!;
    if (row.parties.some((party) => nations[party] === undefined)) return [`${rowKey(row)}: a party is not on the roster`];
    if (row.kind === "sanctions" && !measureSector(host, measureKind(row))) return [`${rowKey(row)}: no recorded trade for the program to bite on`];
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
