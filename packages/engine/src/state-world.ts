import type { NationId, NationTraits, PartyId, PersonId, ZoneId } from "@admin/world";
import type { GameDate } from "./state-campaign.js";
import type { ConflictSide } from "./state-conflict.js";
import type { MunitionClassId } from "./munitions.js";
import type { CommodityId } from "./commodities.js";

// The stored halves of a world that moves on its own: prices, stocks of
// munitions, who governs abroad, and how the contest at home is shaping up.
//
// Every field these shapes hang off is optional on the campaign, because
// absence is the correct reading of a save written before any of them
// existed: no market has moved from its founding level, no stock has been
// drawn, every capital is still led by its table incumbent with no offset, and
// the contest has not named an opponent. `normalizeCampaign` leaves them
// absent for that reason rather than filling an empty shape that would claim a
// reading nobody took.

/** One commodity's price as an index on its founding anchor, with the cause of its last move. */
export type CommodityQuote = {
  readonly index: number;
  readonly anchorUsd: number;
  readonly cause?: string;
  /** Weekly indexes, oldest first, at most `EQUITY_SERIES_WINDOW` long: the pass-through lags and the charts read it. */
  readonly series?: readonly number[];
  /** Where buyers have come to expect the price: a slow average of the index, which a price change is measured against. */
  readonly norm?: number;
  /** Stocks against their normal cover, 1 at normal: what a supply gap draws down before the price has to move. */
  readonly inventory?: number;
};

/** One Federal Reserve meeting: the rate the rule called for and the rate the meeting left. */
export type FedMeeting = {
  readonly date: GameDate;
  readonly target: number;
  readonly rate: number;
};

/** How many meetings the Fed's record keeps: three years of the eight-a-year calendar. */
export const FED_MEETINGS_WINDOW = 24;

/** The Federal Reserve's reading: its rate, the chair's tilt, and any standing public pressure on it. */
export type FedState = {
  readonly rate: number;
  readonly chairTilt: number;
  readonly pressure?: { readonly since: GameDate; readonly bound: number };
  /** The recent meetings, oldest first, at most `FED_MEETINGS_WINDOW` long. */
  readonly meetings?: readonly FedMeeting[];
};

/** The Strategic Petroleum Reserve as a share of its opening fill, and a release in progress. */
export type ReserveState = {
  readonly fill: number;
  /** A drawdown flowing; `share` is the share of world crude supply it adds, absent on a full drawdown recorded before it was stored. */
  readonly release?: { readonly from: GameDate; readonly until: GameDate; readonly share?: number };
  /** The supply losses standing when the last limited drawdown was ordered: the shortage it answered. */
  readonly limitedFor?: readonly string[];
};

/** A government abroad that stopped paying: the haircut its creditors took and the week it defaulted. */
export type SovereignDefaultRecord = {
  readonly nation: NationId;
  readonly turn: number;
  readonly haircut: number;
};

/** How many defaults abroad the markets record keeps. */
export const DEFAULTS_WINDOW = 24;

/** How many weekly equity readings the ring keeps; older ones fall off. */
export const EQUITY_SERIES_WINDOW = 104;

export type EquityState = {
  readonly level: number;
  /** Oldest first, at most `EQUITY_SERIES_WINDOW` long. */
  readonly series: readonly number[];
};

export type MarketsState = {
  readonly commodities: Readonly<Partial<Record<CommodityId, CommodityQuote>>>;
  readonly fed?: FedState;
  readonly equity: EquityState;
  readonly reserve?: ReserveState;
  /** An emergency fuel waiver standing until this date. */
  readonly fuelWaiver?: { readonly until: GameDate };
  /** Defaults abroad, newest last, at most `DEFAULTS_WINDOW` long. */
  readonly defaults?: readonly SovereignDefaultRecord[];
};

export type MunitionStock = {
  readonly count: number;
  readonly onOrder: readonly { readonly arrives: GameDate; readonly count: number; readonly priorityContractId?: string }[];
};

export type MunitionsState = {
  readonly us: Readonly<Partial<Record<MunitionClassId, MunitionStock>>>;
  /** Every other nation's stocks as one index, 1 at founding. */
  readonly index: Readonly<Record<NationId, number>>;
  /** Prevents a saved or replayed weekly phase from producing twice. */
  readonly lastProcessedTurn?: number;
};

/** A war that was already under way when this administration took office, and where the board read it from. */
export type ConflictInheritance = {
  readonly asOf: GameDate;
  readonly source: string;
};

/** A cumulative casualty figure shown as a band, never a count, with how sure the estimate is. */
export type CasualtyBand = {
  readonly low: number;
  readonly high: number;
  readonly confidence: "low" | "medium" | "high";
};

/**
 * Where a commitment's forces stand: an installation on the basing table, by
 * its label, or a zone (a government's territory or a maritime zone). A save
 * written before v56 could carry a free-text theater; the loader maps it.
 */
export type CommitmentLocation = {
  readonly base?: string;
  readonly theater?: ZoneId;
};

/** The temperament axes a seated leader can move, each as a signed offset on the government's own. */
export type TemperamentAxisKey = Exclude<keyof NationTraits, "agendas">;
export type TemperamentOffset = Readonly<Partial<Record<TemperamentAxisKey, number>>>;

export type ForeignSeatProvenance = "table" | "projected" | "played";

export type ForeignSeat = {
  readonly since: GameDate;
  readonly offset: TemperamentOffset;
  readonly party?: PartyId;
  readonly next?: GameDate;
  readonly provenance: ForeignSeatProvenance;
  /** Who holds the chair, so a death in office is noticed the week it happens. Absent reads as the table's incumbent. */
  readonly person?: PersonId;
  /** The last selection the government came through, won or held. A government is not brought down the week it was returned. */
  readonly mandate?: GameDate;
};

/** How many recent leadership changes are kept for the feed and the country file. */
export const FOREIGN_POLITICS_RECENT_WINDOW = 24;

/** Why a chair changed outside an election: a lost confidence vote, a death, a lost war, a leader taken by a foreign power. */
export type LeadershipCause = "confidence" | "death" | "defeat" | "removed";

/** What one government's operation against another's hold on power does (`regime-acts.ts`). */
export type RegimeAct = "political-action" | "coup-support" | "capture" | "kill" | "indict";

/**
 * A federal indictment of a foreign government's leader, filed by the Justice
 * Department. Capture needs one standing and unserved on the target; serving it
 * is the capture. Absent `servedTurn` reads as open.
 */
export type Indictment = {
  readonly id: string;
  readonly target: NationId;
  readonly filedTurn: number;
  readonly servedTurn?: number;
};

/**
 * One regime operation, from the week it landed. A standing operation runs
 * until the government falls, the operation is exposed, or it lapses; a
 * decapitation is done the week it lands. `installed` is the lean toward the
 * sponsor a successor took office with, which decays back from that week.
 */
export type RegimeOperation = {
  readonly id: string;
  readonly act: RegimeAct;
  readonly sponsor: NationId;
  readonly target: NationId;
  readonly startedTurn: number;
  readonly status: "running" | "fell" | "exposed" | "lapsed" | "done";
  readonly endedTurn?: number;
  readonly exposedTurn?: number;
  readonly installed?: { readonly turn: number; readonly alignment: number; readonly trust: number; readonly person?: PersonId };
};

/** Every regime operation still running or ended within the bookkeeping window. Absent reads as none. */
export type RegimeOperationsState = { readonly operations: readonly RegimeOperation[]; readonly indictments?: readonly Indictment[] };

export type LeadershipChange = {
  readonly nation: NationId;
  readonly date: GameDate;
  readonly kind: "election" | "succession" | "coup" | "resignation";
  /** An election the sitting government came through. Absent reads as a chair that changed hands. */
  readonly held?: boolean;
  readonly cause?: LeadershipCause;
  /** Who holds the chair after it, and who held it before. */
  readonly person?: PersonId;
  readonly predecessor?: PersonId;
  readonly party?: PartyId;
  /** Resolved at the seal from the 2026 table's schedule, not played. */
  readonly projected?: boolean;
};

export type ForeignPoliticsState = {
  readonly seats: Readonly<Record<NationId, ForeignSeat>>;
  /** Newest last, at most `FOREIGN_POLITICS_RECENT_WINDOW` long. */
  readonly recent: readonly LeadershipChange[];
};

/** The capped state of a foreign press's reading of the President, per nation. */
export type ForeignCoverageState = Readonly<Record<NationId, { readonly affinity: number }>>;

/** When each relationship edge was last engaged, keyed `from:to`, so an edge is not worked twice a week. */
export type EngagementState = {
  readonly last: Readonly<Record<string, GameDate>>;
};

export type OpponentState = {
  readonly person: PersonId;
  readonly party: PartyId;
  readonly seededMargin: number;
};

export type ReleaseKind = "jobs" | "cpi" | "gdp" | "fomc";

/**
 * One release as it was printed on its day. Stored at issuance so a later look
 * at an old release shows what was known then, not today's economy. A
 * revision is a new observation with a higher `vintage` and `supersedes` set;
 * it never rewrites the original.
 */
export type ReleaseObservation = {
  readonly id: string;
  readonly kind: ReleaseKind;
  readonly date: GameDate;
  readonly value: number;
  readonly vintage: number;
  readonly supersedes?: string;
  readonly evidence: "simulated";
};

export type ReleasesState = {
  readonly last: Readonly<Partial<Record<ReleaseKind, GameDate>>>;
  /** Oldest first, kept for the whole presidency: a release is a durable record, not a chart window. */
  readonly issued?: readonly ReleaseObservation[];
};

/** A cumulative figure as a band: the low and high edges of what anyone could honestly say. */
export type LossRange = { readonly low: number; readonly high: number };

/** One side's cumulative war losses: the dead and the wounded kept apart, with how sure the count is. */
export type WarLossBand = {
  readonly killed: LossRange;
  readonly wounded: LossRange;
  readonly confidence: CasualtyBand["confidence"];
};

export type CasualtiesBySide = Readonly<Partial<Record<ConflictSide, WarLossBand>>>;
