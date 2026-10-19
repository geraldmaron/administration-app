import { ELECTION_RULES, STATE_IDS, worldDataset, type State, type StateId } from "@admin/world";
import type { EffectPacket, StateEffect } from "./effects.js";
import type { Campaign, GrievanceMark, PendingClaim, StateRuntime } from "./state.js";
import {
  OMISSION_DECAY,
  grievanceLean,
} from "./state-geography.js";
import {
  INDEPENDENT_STANDING_GAP,
  administrationAlignment,
  towardAdministration,
  type AdministrationStanding,
} from "./party.js";
import { stateOfBirthplace } from "./cast-home.js";
import type { TurnPhase } from "./turn-loop.js";
import { jitterCohortMix, nationalDemographicFactors } from "./demographic-jitter.js";
import type { RngStreams } from "./rng.js";
import { selectCohorts } from "./demos.js";

// Player-nation overlay: 50 states + DC. Dataset rows are the founding
// snapshot; apply() is the only writer of live lean. statePhase decays marks,
// expires unanswered PendingClaims into omission marks, and drifts lean toward
// the live grievance anchor.

/**
 * Fraction of the lean→anchor gap closed each weekly turn.
 *
 * Proportional on purpose. The earlier absolute cap of 0.003/turn could close
 * at most ~0.048 of a gap over a mark's ~16-turn life at BASE_MARK_DECAY, while
 * grievanceLean may open a gap up to 0.25 — live lean could never reach the
 * anchor that justified the drift. At this rate a
 * held mark stack pulls lean most of the way into its anchor inside twenty
 * turns (same half-life shape as OPINION_DRIFT), and once marks decay the
 * anchor slides home and lean follows — a single mark is not permanent.
 */
export const STATE_LEAN_DRIFT = 0.06;
export const STATE_VOTE_LEVERAGE = 0.4;

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;
const clampLean = (value: number): number => Math.max(-1, Math.min(1, value));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * The fifty-one states as a campaign opens them. Given the campaign's streams,
 * each state's cohort mix is sampled around its authored values (see
 * `demographic-jitter.ts`); without them the authored values stand, which is
 * what a test that needs a fixed country asks for.
 */
export function openingStates(streams?: RngStreams): Readonly<Record<StateId, StateRuntime>> {
  const states: Record<string, StateRuntime> = {};
  const national = streams ? nationalDemographicFactors(streams) : undefined;
  for (const authored of worldDataset.states) {
    const state =
      streams && national
        ? { ...authored, character: { ...authored.character, cohorts: jitterCohortMix(authored.character.cohorts, national, streams.stream("founding", "demographics", "state", authored.id)) } }
        : authored;
    // delegation is filled by withApportionedDelegations at founding /
    // recompose; governor by withSeatedGovernors. See
    // state-geography.ts's module comment and governors.ts.
    states[state.id] = { base: state, lean: state.lean, population: state.population, marks: [], claims: [] };
  }
  return states as Readonly<Record<StateId, StateRuntime>>;
}

export function selectState(campaign: Campaign, id: StateId): StateRuntime | undefined {
  return campaign.states[id];
}

function evWeightedLean(states: readonly StateRuntime[], leanOf: (state: StateRuntime) => number): number {
  let mass = 0;
  let weighted = 0;
  for (const state of states) {
    weighted += leanOf(state) * state.base.electoralVotes;
    mass += state.base.electoralVotes;
  }
  return mass === 0 ? 0 : weighted / mass;
}

/**
 * EV-weighted lean change since founding, times leverage, signed toward the
 * administration — and scaled by what an administration with no party can bank
 * of a partisan swing.
 */
export function selectUsStateVoteDriver(campaign: Campaign, standing: AdministrationStanding): number {
  const states = Object.values(campaign.states);
  if (states.length === 0) return 0;
  const signed = (lean: number) => towardAdministration(lean, standing);
  const current = evWeightedLean(states, (state) => signed(state.lean));
  const opening = evWeightedLean(states, (state) => signed(state.base.lean));
  return (current - opening) * STATE_VOTE_LEVERAGE;
}

/**
 * The map, state by state.
 *
 * `nationalShare` is the administration's own share, not a Democratic one, and
 * each state's lean is read as alignment rather than as party identity. For a
 * Democrat or a Republican that is the same arithmetic it has always been. For
 * an independent every lean reaches them at three quarters of its strength, so
 * their map is flatter than a partisan's and still adds up to the country's own
 * count (`mapAlignment`).
 */
export function electoralVotesWon(
  campaign: Campaign,
  nationalShare: number,
  standing: AdministrationStanding,
): number {
  return callMap(campaign, nationalShare, standing).reduce((won, call) => won + call.administrationVotes, 0);
}

/**
 * The administration's share of a two-way vote where the lean is `lean`.
 *
 * One formula for the state and the district, so a split state's at-large pair
 * and its seats are read the same way, and so the map and the total can only
 * ever be the same arithmetic.
 */
function administrationShare(lean: number, nationalShare: number, standing: AdministrationStanding): number {
  return 0.5 + mapAlignment(lean, standing) / 2 + (nationalShare - 0.5);
}

/**
 * A state's lean as the map reads it, centered so the states add up to the
 * national count. An independent's alignment carries the standing a President
 * without a party gives up everywhere, which the Hill's counts read; read here
 * as well it tilted the whole map under the country's own vote, so a 53% popular
 * vote carried no state. The map keeps the independent's flatter reach, which is
 * their road to 270: fewer safe states and fewer lost causes.
 */
function mapAlignment(lean: number, standing: AdministrationStanding): number {
  const aligned = administrationAlignment(lean, standing);
  return standing.administrationParty === "independent" ? aligned + INDEPENDENT_STANDING_GAP : aligned;
}

/**
 * One week's lean step toward `anchor`. Anchor is `base.lean + grievanceLean(marks)`
 * once marks are live; callers share this formula with the
 * reachability proof.
 */
export function leanDriftDelta(current: number, anchor: number): number {
  const distance = anchor - current;
  if (distance === 0) return 0;
  return round3(distance * STATE_LEAN_DRIFT);
}

function decayMarks(marks: readonly GrievanceMark[]): readonly GrievanceMark[] {
  return marks
    .map((mark) => ({ ...mark, weight: round3(Math.max(0, mark.weight - mark.decayRate)) }))
    .filter((mark) => mark.weight > 0);
}

function marksChanged(before: readonly GrievanceMark[], after: readonly GrievanceMark[]): boolean {
  return (
    before.length !== after.length || after.some((mark, index) => mark.weight !== before[index]!.weight)
  );
}

/** Omission weight: claim.weight × (0.5 + federalDependence × 0.5). */
export function omissionMarkWeight(claimWeight: number, federalDependence: number): number {
  return round3(clamp01(claimWeight * (0.5 + federalDependence * 0.5)));
}

function omissionFromClaim(claim: PendingClaim, turn: number, federalDependence: number): GrievanceMark {
  return {
    turn,
    signature: `omitted:${claim.signature}`,
    weight: omissionMarkWeight(claim.weight, federalDependence),
    valence: -1,
    decayRate: OMISSION_DECAY,
    reason: claim.reason,
  };
}

function phaseReason(
  name: string,
  expired: number,
  marksMoved: boolean,
  leanMoved: boolean,
): string {
  if (expired > 0) return `An unanswered claim in ${name} hardens into memory.`;
  if (marksMoved) return `Old grievances in ${name} fade with time.`;
  if (leanMoved) return `Partisan lean in ${name} drifts toward what the state remembers.`;
  return `Partisan lean in ${name} drifts back toward its opening.`;
}

/**
 * Weekly housekeeping for every state, in order: mark decay, claim expiry into
 * omission marks (explicit PendingClaims only; never a live-disaster scan),
 * lean drift toward `base.lean + grievanceLean(marks)`. At most one packet per
 * state that moved.
 */
export const statePhase: TurnPhase = (state) => {
  const packets: EffectPacket[] = [];
  for (const id of STATE_IDS) {
    const runtime = state.states[id];
    if (!runtime) continue;

    const decayed = decayMarks(runtime.marks);
    const decayMoved = marksChanged(runtime.marks, decayed);

    // PendingClaim only: opened by a named act or reply. Derived neglect is
    // the obligation ledger's job; do not scan conditions here.
    const expired = runtime.claims.filter((claim) => claim.expiresTurn <= state.turn);
    const keptClaims = runtime.claims.filter((claim) => claim.expiresTurn > state.turn);
    const omissions = expired.map((claim) =>
      omissionFromClaim(claim, state.turn, runtime.base.character.federalDependence),
    );
    const nextMarks = [...decayed, ...omissions];

    const anchor = clampLean(runtime.base.lean + grievanceLean(nextMarks, state.congress));
    const delta = leanDriftDelta(runtime.lean, anchor);
    if (!decayMoved && expired.length === 0 && delta === 0) continue;

    const effect: StateEffect = {
      kind: "state",
      state: id,
      reason: phaseReason(runtime.base.name, expired.length, decayMoved || omissions.length > 0, delta !== 0),
      ...(decayMoved || omissions.length > 0 ? { replaceMarks: nextMarks } : {}),
      ...(expired.length > 0 ? { replaceClaims: keptClaims } : {}),
      ...(delta !== 0 ? { deltas: { lean: delta } } : {}),
    };
    packets.push({
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: effect.reason },
      effects: [effect],
    });
  }
  return packets;
};

export function houseSeatsInPlay(states: readonly State[]): number {
  return states.reduce((sum, entry) => sum + entry.houseSeats, 0);
}

/**
 * One state as an election night called it.
 *
 * `electoralVotes` is carried on the call rather than looked up afterward,
 * because the number a night awarded is a fact about that night: apportionment
 * moves between censuses, and a record that re-derived it would rewrite an old
 * result.
 */
export type StateCall = {
  readonly state: StateId;
  /** The administration's share of the two-way vote, 0..1, whoever won: the opposition's is one minus it. */
  readonly share: number;
  readonly electoralVotes: number;
  /**
   * How many of them the administration took. Equal to `electoralVotes` where
   * the administration carried a winner-take-all state and zero where it did
   * not, and anything between in the two states that split them.
   */
  readonly administrationVotes: number;
  readonly winner: "administration" | "opposition";
  /** The rule the state appoints its electors under, as the dataset records it. */
  readonly allocation: "winner-take-all" | "by-district";
  /** Participation lost to inaccessible equipment, recorded only for a documented finding. */
  readonly access?: { readonly compliantShare: number; readonly affectedEligibleShare: number; readonly voteShareMovement: number };
};

/**
 * What the ticket's own states are worth to it on the night.
 *
 * The record is unambiguous that a home state is worth something and modest
 * about how much: only four presidents have ever been elected while losing the
 * state they lived in, and losing candidates routinely carry theirs anyway
 * (Wikipedia, "Home state advantage", opened 2026-09-27). The asymmetry between
 * the two halves is sourced too — a running mate's home-state effect is
 * conditional on how much of their career was spent in that state's politics
 * rather than automatic, and it is the smaller of the two (Devine and Kopko,
 * "The Vice Presidential Home State Advantage Reconsidered", Presidential
 * Studies Quarterly, 2011; abstract opened via Crossref 2026-09-27).
 *
 * The two magnitudes below are a bounded design choice consistent with that
 * record, not a coefficient either source states. They are deliberately small
 * enough that a home state tilts a close state and never carries a hostile one:
 * three points and one point of a two-way share, against state leans that run to
 * a quarter of it.
 */
export const HOME_STATE_PRESIDENT = 0.03;
export const HOME_STATE_RUNNING_MATE = 0.01;

/** The states the ticket calls home: the President's, and the running mate's where there is one. */
function ticketHomeStates(campaign: Campaign): Readonly<Record<string, number>> {
  const home: Record<string, number> = {};
  const president = campaign.founding.leader.homeState;
  if (president) home[president] = (home[president] ?? 0) + HOME_STATE_PRESIDENT;
  const mate = campaign.vicePresident;
  // A running mate's home state is where they are from, the same reading the
  // ticket was balanced on; `PersonRuntime.state` is the governor overlay and
  // says nothing about anybody who is not sitting in a statehouse.
  const mateState = mate === undefined ? undefined : stateOfBirthplace(campaign.people[mate]?.base.birthplace);
  if (mateState) home[mateState] = (home[mateState] ?? 0) + HOME_STATE_RUNNING_MATE;
  return home;
}

/** The rule a state appoints electors under; winner-take-all where nothing is on file. */
function allocationOf(state: StateId): "winner-take-all" | "by-district" {
  return ELECTION_RULES.find((rule) => rule.state === state)?.allocation ?? "winner-take-all";
}

/** The two at-large electors plus one per district carried, for the two split states. */
function districtVotes(
  state: StateRuntime,
  nationalShare: number,
  standing: AdministrationStanding,
  share: number,
  home: number,
): number {
  const atLarge = share > 0.5 ? AT_LARGE_ELECTORS : 0;
  const carried = districtLeans(state)
    .filter((lean) => administrationShare(lean, nationalShare, standing) + home > 0.5).length;
  return Math.min(state.base.electoralVotes, atLarge + carried);
}

/** Every state appoints two electors for its senators; only the district seats can split. */
const AT_LARGE_ELECTORS = 2;

/**
 * The authored spread of a state's districts around their own mean.
 *
 * A district's authored lean is the politics of the year the table was written;
 * the state's `lean` is what moves every week. What a district carries forward
 * from the table is its *position inside its state* — the urban seat furthest
 * Democratic, the rural one furthest Republican — so the live reading is the
 * state's own lean with that spread laid over it. Read raw, a split state's
 * seats would still be voting a fixed year while the rest of the map moved; read
 * as an offset from the state's authored average, they move with it.
 *
 * Built once at module load: 436 rows is a scan, and this is read inside an
 * electoral count over every state.
 */
const DISTRICT_SPREAD: ReadonlyMap<string, readonly number[]> = (() => {
  // Keyed on the state's apportionment rather than the district's number: a
  // single-district state's at-large seat is numbered 0 and is one of the 435,
  // while DC's delegate is numbered 0 and is not.
  const apportioned = new Set(worldDataset.states.filter((state) => state.houseSeats > 0).map((state) => state.id as string));
  const byState = new Map<string, number[]>();
  for (const district of worldDataset.districts) {
    if (!apportioned.has(district.state as string)) continue;
    byState.set(district.state as string, [...(byState.get(district.state as string) ?? []), district.lean]);
  }
  const spread = new Map<string, readonly number[]>();
  for (const [state, leans] of byState) {
    const mean = leans.reduce((sum, lean) => sum + lean, 0) / leans.length;
    spread.set(state, leans.map((lean) => lean - mean));
  }
  return spread;
})();

/** This week's lean for each of a state's districts, in the table's own order. */
function districtLeans(state: StateRuntime): readonly number[] {
  return (DISTRICT_SPREAD.get(state.base.id as string) ?? []).map((offset) => clampLean(state.lean + offset));
}

/**
 * How far the map puts each state from the country, in points of two-way share:
 * the alignment `administrationShare` reads plus the ticket's home-state tilt,
 * before any clamp. A state's call is the national share plus exactly this, so
 * a reading built on it cannot disagree with the map about which side of the
 * country a state sits on.
 */
export function stateShareShifts(campaign: Campaign): Readonly<Partial<Record<StateId, number>>> {
  const home = ticketHomeStates(campaign);
  return Object.fromEntries(
    STATE_IDS.flatMap((id) => {
      const state = campaign.states[id];
      if (!state) return [];
      return [[id, administrationShare(state.lean, 0.5, campaign.congress) - 0.5 + (home[id] ?? 0)]];
    }),
  ) as Partial<Record<StateId, number>>;
}

/**
 * The map as it would fall if the country voted `nationalShare` this week. A
 * projection, not a record: `stateCalls` is the night that was actually held.
 */
export function projectedStateCalls(campaign: Campaign, nationalShare: number): readonly StateCall[] {
  return callMap(campaign, nationalShare, campaign.congress);
}

function callMap(
  campaign: Campaign,
  nationalShare: number,
  standing: AdministrationStanding,
): readonly StateCall[] {
  const calls: StateCall[] = [];
  const home = ticketHomeStates(campaign);
  const disabilitySupport = selectCohorts(campaign).find((cohort) => cohort.cohort === "with-disability")?.support ?? 0.5;
  for (const id of STATE_IDS) {
    const state = campaign.states[id];
    if (!state) continue;
    const ordinaryShare = administrationShare(state.lean, nationalShare, standing) + (home[id] ?? 0);
    const finding = state.electionAccess && campaign.turn <= state.electionAccess.electionTurn
      ? state.electionAccess : undefined;
    const compliantShare = finding?.remediedShare ?? finding?.compliantShare ?? 1;
    const affectedEligibleShare = finding ? Math.min(0.03, Math.max(0, (state.base.character.cohorts.disability["with-disability"] ?? 0) * (1 - compliantShare) * 0.55)) : 0;
    const share = affectedEligibleShare > 0
      ? (ordinaryShare - affectedEligibleShare * disabilitySupport) / (1 - affectedEligibleShare)
      : ordinaryShare;
    const allocation = allocationOf(id);
    const administrationVotes =
      allocation === "by-district"
        ? districtVotes(state, nationalShare, standing, share, home[id] ?? 0)
        : share > 0.5
          ? state.base.electoralVotes
          : 0;
    calls.push({
      state: id,
      share: round3(clamp01(share)),
      electoralVotes: state.base.electoralVotes,
      administrationVotes,
      winner: share > 0.5 ? "administration" : "opposition",
      allocation,
      ...(finding ? { access: { compliantShare, affectedEligibleShare: round3(affectedEligibleShare),
        voteShareMovement: round3(share - ordinaryShare) } } : {}),
    });
  }
  return calls;
}

/**
 * How the map fell, state by state, on the last presidential night.
 *
 * Derived from the share the result itself stored rather than from a fresh
 * projection: the country keeps moving after a November, and a map recomputed
 * from this week's leans would redraw a settled election. Empty until a
 * presidential contest has actually been held, because before one there is no
 * night to report.
 *
 * `electoralVotesWon` is the sum of `administrationVotes` over exactly this
 * list, which is what makes the map and the total one statement instead of two
 * that agree by inspection.
 */
export function stateCalls(campaign: Campaign): readonly StateCall[] {
  const decided = [...campaign.termClock.elections]
    .reverse()
    .find((election) => election.kind === "presidential" && election.won !== undefined);
  if (!decided) return [];
  return decided.stateCalls ?? callMap(campaign, decided.voteShare, campaign.congress);
}
