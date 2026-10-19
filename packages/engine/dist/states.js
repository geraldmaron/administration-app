import { ELECTION_RULES, STATE_IDS, worldDataset } from "@admin/world";
import { OMISSION_DECAY, grievanceLean, } from "./state-geography.js";
import { INDEPENDENT_STANDING_GAP, administrationAlignment, towardAdministration, } from "./party.js";
import { stateOfBirthplace } from "./cast-home.js";
import { jitterCohortMix, nationalDemographicFactors } from "./demographic-jitter.js";
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
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clampLean = (value) => Math.max(-1, Math.min(1, value));
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * The fifty-one states as a campaign opens them. Given the campaign's streams,
 * each state's cohort mix is sampled around its authored values (see
 * `demographic-jitter.ts`); without them the authored values stand, which is
 * what a test that needs a fixed country asks for.
 */
export function openingStates(streams) {
    const states = {};
    const national = streams ? nationalDemographicFactors(streams) : undefined;
    for (const authored of worldDataset.states) {
        const state = streams && national
            ? { ...authored, character: { ...authored.character, cohorts: jitterCohortMix(authored.character.cohorts, national, streams.stream("founding", "demographics", "state", authored.id)) } }
            : authored;
        // delegation is filled by withApportionedDelegations at founding /
        // recompose; governor by withSeatedGovernors. See
        // state-geography.ts's module comment and governors.ts.
        states[state.id] = { base: state, lean: state.lean, population: state.population, marks: [], claims: [] };
    }
    return states;
}
export function selectState(campaign, id) {
    return campaign.states[id];
}
function evWeightedLean(states, leanOf) {
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
export function selectUsStateVoteDriver(campaign, standing) {
    const states = Object.values(campaign.states);
    if (states.length === 0)
        return 0;
    const signed = (lean) => towardAdministration(lean, standing);
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
export function electoralVotesWon(campaign, nationalShare, standing) {
    return callMap(campaign, nationalShare, standing).reduce((won, call) => won + call.administrationVotes, 0);
}
/**
 * The administration's share of a two-way vote where the lean is `lean`.
 *
 * One formula for the state and the district, so a split state's at-large pair
 * and its seats are read the same way, and so the map and the total can only
 * ever be the same arithmetic.
 */
function administrationShare(lean, nationalShare, standing) {
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
function mapAlignment(lean, standing) {
    const aligned = administrationAlignment(lean, standing);
    return standing.administrationParty === "independent" ? aligned + INDEPENDENT_STANDING_GAP : aligned;
}
/**
 * One week's lean step toward `anchor`. Anchor is `base.lean + grievanceLean(marks)`
 * once marks are live; callers share this formula with the
 * reachability proof.
 */
export function leanDriftDelta(current, anchor) {
    const distance = anchor - current;
    if (distance === 0)
        return 0;
    return round3(distance * STATE_LEAN_DRIFT);
}
function decayMarks(marks) {
    return marks
        .map((mark) => ({ ...mark, weight: round3(Math.max(0, mark.weight - mark.decayRate)) }))
        .filter((mark) => mark.weight > 0);
}
function marksChanged(before, after) {
    return (before.length !== after.length || after.some((mark, index) => mark.weight !== before[index].weight));
}
/** Omission weight: claim.weight × (0.5 + federalDependence × 0.5). */
export function omissionMarkWeight(claimWeight, federalDependence) {
    return round3(clamp01(claimWeight * (0.5 + federalDependence * 0.5)));
}
function omissionFromClaim(claim, turn, federalDependence) {
    return {
        turn,
        signature: `omitted:${claim.signature}`,
        weight: omissionMarkWeight(claim.weight, federalDependence),
        valence: -1,
        decayRate: OMISSION_DECAY,
        reason: claim.reason,
    };
}
function phaseReason(name, expired, marksMoved, leanMoved) {
    if (expired > 0)
        return `An unanswered claim in ${name} hardens into memory.`;
    if (marksMoved)
        return `Old grievances in ${name} fade with time.`;
    if (leanMoved)
        return `Partisan lean in ${name} drifts toward what the state remembers.`;
    return `Partisan lean in ${name} drifts back toward its opening.`;
}
/**
 * Weekly housekeeping for every state, in order: mark decay, claim expiry into
 * omission marks (explicit PendingClaims only; never a live-disaster scan),
 * lean drift toward `base.lean + grievanceLean(marks)`. At most one packet per
 * state that moved.
 */
export const statePhase = (state) => {
    const packets = [];
    for (const id of STATE_IDS) {
        const runtime = state.states[id];
        if (!runtime)
            continue;
        const decayed = decayMarks(runtime.marks);
        const decayMoved = marksChanged(runtime.marks, decayed);
        // PendingClaim only: opened by a named act or reply. Derived neglect is
        // the obligation ledger's job; do not scan conditions here.
        const expired = runtime.claims.filter((claim) => claim.expiresTurn <= state.turn);
        const keptClaims = runtime.claims.filter((claim) => claim.expiresTurn > state.turn);
        const omissions = expired.map((claim) => omissionFromClaim(claim, state.turn, runtime.base.character.federalDependence));
        const nextMarks = [...decayed, ...omissions];
        const anchor = clampLean(runtime.base.lean + grievanceLean(nextMarks, state.congress));
        const delta = leanDriftDelta(runtime.lean, anchor);
        if (!decayMoved && expired.length === 0 && delta === 0)
            continue;
        const effect = {
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
export function houseSeatsInPlay(states) {
    return states.reduce((sum, entry) => sum + entry.houseSeats, 0);
}
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
function ticketHomeStates(campaign) {
    const home = {};
    const president = campaign.founding.leader.homeState;
    if (president)
        home[president] = (home[president] ?? 0) + HOME_STATE_PRESIDENT;
    const mate = campaign.vicePresident;
    // A running mate's home state is where they are from, the same reading the
    // ticket was balanced on; `PersonRuntime.state` is the governor overlay and
    // says nothing about anybody who is not sitting in a statehouse.
    const mateState = mate === undefined ? undefined : stateOfBirthplace(campaign.people[mate]?.base.birthplace);
    if (mateState)
        home[mateState] = (home[mateState] ?? 0) + HOME_STATE_RUNNING_MATE;
    return home;
}
/** The rule a state appoints electors under; winner-take-all where nothing is on file. */
function allocationOf(state) {
    return ELECTION_RULES.find((rule) => rule.state === state)?.allocation ?? "winner-take-all";
}
/** The two at-large electors plus one per district carried, for the two split states. */
function districtVotes(state, nationalShare, standing, share, home) {
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
const DISTRICT_SPREAD = (() => {
    // Keyed on the state's apportionment rather than the district's number: a
    // single-district state's at-large seat is numbered 0 and is one of the 435,
    // while DC's delegate is numbered 0 and is not.
    const apportioned = new Set(worldDataset.states.filter((state) => state.houseSeats > 0).map((state) => state.id));
    const byState = new Map();
    for (const district of worldDataset.districts) {
        if (!apportioned.has(district.state))
            continue;
        byState.set(district.state, [...(byState.get(district.state) ?? []), district.lean]);
    }
    const spread = new Map();
    for (const [state, leans] of byState) {
        const mean = leans.reduce((sum, lean) => sum + lean, 0) / leans.length;
        spread.set(state, leans.map((lean) => lean - mean));
    }
    return spread;
})();
/** This week's lean for each of a state's districts, in the table's own order. */
function districtLeans(state) {
    return (DISTRICT_SPREAD.get(state.base.id) ?? []).map((offset) => clampLean(state.lean + offset));
}
/**
 * How far the map puts each state from the country, in points of two-way share:
 * the alignment `administrationShare` reads plus the ticket's home-state tilt,
 * before any clamp. A state's call is the national share plus exactly this, so
 * a reading built on it cannot disagree with the map about which side of the
 * country a state sits on.
 */
export function stateShareShifts(campaign) {
    const home = ticketHomeStates(campaign);
    return Object.fromEntries(STATE_IDS.flatMap((id) => {
        const state = campaign.states[id];
        if (!state)
            return [];
        return [[id, administrationShare(state.lean, 0.5, campaign.congress) - 0.5 + (home[id] ?? 0)]];
    }));
}
/**
 * The map as it would fall if the country voted `nationalShare` this week. A
 * projection, not a record: `stateCalls` is the night that was actually held.
 */
export function projectedStateCalls(campaign, nationalShare) {
    return callMap(campaign, nationalShare, campaign.congress);
}
function callMap(campaign, nationalShare, standing) {
    const calls = [];
    const home = ticketHomeStates(campaign);
    const disabilitySupport = selectCohorts(campaign).find((cohort) => cohort.cohort === "with-disability")?.support ?? 0.5;
    for (const id of STATE_IDS) {
        const state = campaign.states[id];
        if (!state)
            continue;
        const ordinaryShare = administrationShare(state.lean, nationalShare, standing) + (home[id] ?? 0);
        const finding = state.electionAccess && campaign.turn <= state.electionAccess.electionTurn
            ? state.electionAccess : undefined;
        const compliantShare = finding?.remediedShare ?? finding?.compliantShare ?? 1;
        const affectedEligibleShare = finding ? Math.min(0.03, Math.max(0, (state.base.character.cohorts.disability["with-disability"] ?? 0) * (1 - compliantShare) * 0.55)) : 0;
        const share = affectedEligibleShare > 0
            ? (ordinaryShare - affectedEligibleShare * disabilitySupport) / (1 - affectedEligibleShare)
            : ordinaryShare;
        const allocation = allocationOf(id);
        const administrationVotes = allocation === "by-district"
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
export function stateCalls(campaign) {
    const decided = [...campaign.termClock.elections]
        .reverse()
        .find((election) => election.kind === "presidential" && election.won !== undefined);
    if (!decided)
        return [];
    return decided.stateCalls ?? callMap(campaign, decided.voteShare, campaign.congress);
}
