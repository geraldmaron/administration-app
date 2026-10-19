// Governor standing: derive from the seated PersonRuntime (state stamp +
// Person.party), open at the state's delegation disposition, and drift toward
// that disposition on the same terms the delegation itself drifts
// (DELEGATION_DRIFT).
//
// No new authored data — governors are seated at founding by
// `seatGovernorsByLean` below. This module is also the standing that makes them
// readable as a political fact rather than an inert person stamp.
import { ELECTION_RULES, GOVERNOR_TERMS, STATE_IDS, worldDataset, } from "@admin/world";
import { usPartyOfPerson } from "./cast-fit.js";
import { CAMPAIGN_OPENING_DATE, addDays, compareDates, daysBetween, federalElectionDay, isMidtermYear, isPresidentialElectionYear, isSameDate, } from "./clock.js";
import { weekOpenDate } from "./feed-cap.js";
import { DELEGATION_DRIFT } from "./delegations.js";
import { administrationAlignment } from "./party.js";
import { DAYS_PER_TURN } from "./turn-loop.js";
import { noiseFrom, projectWillingness, stampOf, weigh, willDraw, } from "./willingness.js";
const GOVERNOR_ROLE = "role-governor";
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/** Map a US charter PartyId onto the chamber UsParty vocabulary. */
export function usPartyFromPersonParty(party) {
    const id = party;
    if (id === "party-usa-republican")
        return "republican";
    if (id === "party-usa-independent")
        return "independent";
    return "democrat";
}
/** The seated governor for a state, if founding (or a later seat) put one there. */
export function governorPersonOf(people, state) {
    if (state === "DC")
        return undefined;
    return Object.values(people).find((runtime) => runtime.currentRole === GOVERNOR_ROLE && runtime.state === state && runtime.alive);
}
// --- The statehouse calendar -------------------------------------------------
/** The state's sourced term row, or nothing for DC, which elects no governor. */
function termRowOf(state) {
    return GOVERNOR_TERMS.find((row) => row.state === state);
}
/** The rule the state decides a contest under, read once per call site. */
function ruleOf(state) {
    return ELECTION_RULES.find((rule) => rule.state === state);
}
function parsedDate(iso) {
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part)))
        return undefined;
    return { year: parts[0], month: parts[1], day: parts[2] };
}
/**
 * The next November this state elects a governor, on or after `from`.
 *
 * Projected off the sourced row rather than read off the federal calendar: the
 * table states one election the state actually holds and how long the term it
 * decides runs, and every later one is that date plus a whole number of terms.
 * That is what puts 36 statehouses on a midterm, eleven on a presidential year,
 * Virginia and New Jersey on the November after a presidential election and
 * Kentucky, Louisiana and Mississippi on the one before — none of which a single
 * "every four years from now" rule can say at once.
 */
export function nextGubernatorialElection(state, from) {
    const row = termRowOf(state);
    const anchor = row ? parsedDate(row.nextElection) : undefined;
    if (!row || !anchor)
        return undefined;
    let year = anchor.year;
    // Step whole terms rather than years, so a two-year statehouse lands on every
    // even November and a four-year one only on its own.
    while (compareDates(federalElectionDay(year), from) < 0)
        year += row.termYears;
    return federalElectionDay(year);
}
/** Every state whose governor is on today's ballot. Empty on all but a handful of days. */
export function governorRacesDueToday(campaign) {
    return STATE_IDS.filter((id) => {
        if (id === "DC")
            return false;
        const due = nextGubernatorialElection(id, campaign.calendar);
        return due !== undefined && isSameDate(due, campaign.calendar);
    });
}
/**
 * Every state whose governor is on this week's ballot, in a year with no federal
 * election in it.
 *
 * The week rather than the day, and only the odd years. A governors' night in an
 * even year is part of the federal result the run stops the player on, and it is
 * settled inside that result on its own date. An odd year has no federal result
 * and no stop, so the night is one of the week's own settlements — and a weekly
 * settlement is the only thing that lands in the same place in the ledger whether
 * the week runs as one list or as seven office days. Filed from the day loop
 * instead, it arrived between two of the following week's phases while carrying
 * the closed week's turn.
 *
 * The window is the seven days from the week's open, which is the same seven days
 * under both layouts even though the phase runs on day 6 of one and day 7 of the
 * other.
 */
export function governorRacesDueThisWeek(campaign) {
    const open = weekOpenDate(campaign);
    if (isPresidentialElectionYear(open.year) || isMidtermYear(open.year))
        return [];
    const close = addDays(open, DAYS_PER_TURN - 1);
    return STATE_IDS.filter((id) => {
        if (id === "DC")
            return false;
        const due = nextGubernatorialElection(id, open);
        return due !== undefined && compareDates(due, close) <= 0;
    });
}
/**
 * Derive standing from the seated person and the state's live delegation.
 * Opens (and re-seats) at the delegation's disposition so the two start agreed.
 *
 * `termEnds` is the November this seat is next contested, carried on the
 * standing so nothing downstream has to re-derive a date the seating already
 * knew — and so a governor a year from their own voters reads that way on the
 * Desk without the Desk owning the calendar.
 */
export function deriveGovernorStanding(person, delegationDisposition, termEnds) {
    return {
        person: person.base.id,
        party: usPartyFromPersonParty(person.base.party),
        disposition: round3(clamp01(delegationDisposition)),
        ...(termEnds ? { termEnds: isoOf(termEnds) } : {}),
    };
}
function isoOf(date) {
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
/** Read the standing already on the state, or undefined for DC / unseated. */
export function selectGovernor(campaign, id) {
    return campaign.states[id]?.governor;
}
/**
 * Stamp every non-DC state with a GovernorStanding derived from its seated
 * person and its already-apportioned delegation. Called at founding after
 * withApportionedDelegations and withGovernorSeats.
 */
export function withSeatedGovernors(states, people, opened = CAMPAIGN_OPENING_DATE) {
    const next = {};
    for (const id of STATE_IDS) {
        const runtime = states[id];
        if (!runtime)
            continue;
        if (id === "DC") {
            next[id] = runtime;
            continue;
        }
        const person = governorPersonOf(people, id);
        const disposition = runtime.delegation?.disposition ?? 0.5;
        next[id] = person
            ? { ...runtime, governor: deriveGovernorStanding(person, disposition, nextGubernatorialElection(id, opened)) }
            : runtime;
    }
    return next;
}
/**
 * One step toward the delegation's live disposition, same rate and snap rule
 * the chamber uses: within one step, land on the target exactly.
 */
export function driftGovernorStanding(standing, target) {
    const goal = clamp01(target);
    const delta = goal - standing.disposition;
    if (delta === 0)
        return standing;
    const next = Math.abs(delta) <= DELEGATION_DRIFT
        ? goal
        : standing.disposition + Math.sign(delta) * DELEGATION_DRIFT;
    return { ...standing, disposition: round3(clamp01(next)) };
}
/** Weeks for a governor's memory of the administration's answers to halve. A design value; the balance run sizes it. */
export const GOVERNOR_TILT_HALF_LIFE_WEEKS = 26;
/** The remembered tilt one week faded; dropped once it no longer moves anything. */
function withFadedTilt(standing) {
    const tilt = standing.answerTilt;
    if (tilt === undefined)
        return standing;
    const faded = Math.round(tilt * 0.5 ** (1 / GOVERNOR_TILT_HALF_LIFE_WEEKS) * 10_000) / 10_000;
    const { answerTilt: _old, ...rest } = standing;
    return Math.abs(faded) < 0.0005 ? rest : { ...rest, answerTilt: faded };
}
/**
 * Weekly drift: each seated governor moves toward that state's delegation
 * disposition plus what it remembers of the administration's answers in the state
 * disposition. Sibling of `delegationPhase` in turn-phases (ARCHITECTURE slot
 * 17); T21 may compose them into one packet. The slot after congressPhase is
 * intentional so the target is this week's chamber mood.
 */
export const governorPhase = (state) => {
    const turn = state.turn + 1;
    const packets = [];
    // The odd-year night first: a statehouse is decided, and then the statehouses
    // settle. Emitted here rather than from the day loop so the settlement sits in
    // this phase's place in the sequence under both week layouts.
    const night = holdGovernorRacesThisWeek(state, turn);
    if (night.results.length > 0) {
        const summary = describeGovernorNight(night.results, state);
        packets.push({
            source: "simulate",
            actor: "world",
            turn,
            narration: { summary },
            effects: [...night.effects, { kind: "feed", items: [{ turn, kind: "press", visibility: "public", headline: summary }] }],
        });
    }
    // A statehouse decided tonight was seated at its delegation's disposition a
    // moment ago; drifting it in the same week would compute the step from the
    // governor who just lost and write it back over the winner.
    const decided = new Set(night.results.map((race) => race.state));
    const effects = [];
    for (const id of STATE_IDS) {
        if (id === "DC" || decided.has(id))
            continue;
        const runtime = state.states[id];
        const standing = runtime?.governor;
        const delegation = runtime?.delegation?.disposition;
        if (!runtime || !standing || delegation === undefined)
            continue;
        const next = withFadedTilt(driftGovernorStanding(standing, delegation + (standing.answerTilt ?? 0)));
        if (next.disposition === standing.disposition && next.answerTilt === standing.answerTilt)
            continue;
        effects.push({
            kind: "state",
            state: id,
            setGovernor: next,
            reason: `The governor of ${runtime.base.name} settles toward the state's congressional standing.`,
        });
    }
    if (effects.length > 0) {
        packets.push({
            source: "simulate",
            actor: "world",
            turn,
            narration: { summary: "Statehouses settle toward their delegations." },
            effects,
        });
    }
    return packets;
};
// --- What a governor says when the federal government asks -------------------
// A governor asked for the Guard, for consent to a federal response, or for
// anything else that needs the statehouse answers from their own position, and
// the position is mostly structural: the party they belong to, where their state
// sits, whether they have to face its voters soon, whether they can face them at
// all again, and how bad the thing in front of them is. Character is the last and
// smallest of the six, deliberately — the fifty seated governors are nearly
// uniform (loyalty 0.594 ± 0.039), so a character term wide enough to decide
// anything would be a term about the cast's variance rather than about anybody's
// character.
//
// The weights are set so that a governor with nothing else in play answers
// exactly where the old gate answered: `state-lean` opens at the statehouse's own
// disposition and the threshold is the midpoint the gate used, so swapping the
// call moves nothing on its own and every later term is a named, readable
// addition rather than a recalibration.
/** The midpoint the delegation-derived disposition is measured against. */
export const GOVERNOR_CONSENT_THRESHOLD = 0.5;
/**
 * How much of the answer the draw may decide.
 *
 * Small on purpose: structure decides a governor's answer, and a noise band wide
 * enough to overturn the party term would make the same request from the same
 * President to the same statehouse come out differently for no reason anyone
 * could read back.
 */
export const GOVERNOR_NOISE_BOUND = 0.03;
/** How far the state's own politics refine the statehouse's congressional standing. */
const STATE_LEAN_REFINEMENT = 0.06;
/** Belonging to the President's party, or to the other one. Zero for an independent. */
const PARTY_MATCH_WEIGHT = 0.1;
/** How far a governor inside a year of their own voters pulls back from an unwelcome ask. */
const REELECTION_EXPOSURE_WEIGHT = 0.1;
/** What a governor who cannot stand again is freed by. */
const TERM_LIMITED_WEIGHT = 0.05;
/** How far the size of the thing in front of them carries a refusal. */
const DISASTER_WEIGHT = 0.2;
/** The most the seated person's own character may move the answer, either way. */
const CHARACTER_BOUND = 0.05;
/** Days in the year a governor's own contest has to be inside to weigh on them. */
const EXPOSURE_WINDOW_DAYS = 365;
function governorPerson(campaign, state) {
    const id = campaign.states[state]?.governor?.person;
    return id === undefined ? undefined : campaign.people[id];
}
/**
 * Whether the state's own constitution takes the sitting governor off the ballot.
 *
 * Counted from `termsWon`, which only the game's own elections write, so a
 * governor seated at founding is never term-limited: how long they had already
 * served is not on file, and inventing it would bar somebody from a ballot for a
 * term nobody played.
 */
export function governorIsTermLimited(campaign, state) {
    const limit = ruleOf(state)?.consecutiveTermLimit;
    const won = campaign.states[state]?.governor?.termsWon ?? 0;
    return limit !== null && limit !== undefined && won >= limit;
}
/** How exposed the governor is to their own voters: 1 on election day, 0 a year out. */
function reelectionExposure(campaign, state) {
    const due = nextGubernatorialElection(state, campaign.calendar);
    if (!due)
        return 0;
    const away = daysBetween(campaign.calendar, due);
    if (away >= EXPOSURE_WINDOW_DAYS)
        return 0;
    return clamp01((EXPOSURE_WINDOW_DAYS - away) / EXPOSURE_WINDOW_DAYS);
}
/**
 * The six terms a governor's answer is made of.
 *
 * Exported because the forecast and the decision must be built from one list:
 * the whole reason `projectWillingness` exists is that a player is shown the same
 * sum the world is about to take, and two call sites assembling their own terms
 * is how that stops being true.
 */
export function governorConsentTerms(campaign, state, ask) {
    const runtime = campaign.states[state];
    const standing = runtime?.governor;
    const alignment = runtime ? administrationAlignment(runtime.lean, campaign.congress) : 0;
    const party = standing?.party;
    const match = party === undefined || party === "independent" || campaign.congress.administrationParty === "independent"
        ? 0
        : party === campaign.congress.caucusAnchor
            ? PARTY_MATCH_WEIGHT
            : -PARTY_MATCH_WEIGHT;
    // A governor close to their own voters weighs the politics harder, and the
    // politics only pull against the ask where the ask is unwelcome at home. An
    // exposed governor in a state that wants the help is not pulled either way,
    // which is why this is a product rather than a flat penalty.
    const exposure = reelectionExposure(campaign, state) * Math.max(0, -alignment);
    const person = governorPerson(campaign, state);
    const character = person
        ? clampBound(((person.base.integrity ?? 0.5) - 0.5) * 2 * CHARACTER_BOUND, CHARACTER_BOUND)
        : 0;
    // In the order the question declares its vocabulary, so the stamp a player
    // reads back lists them the way the model states them.
    return [
        { key: "party-match", source: "interest", value: match },
        {
            key: "state-lean",
            source: "situation",
            value: round3((standing?.disposition ?? GOVERNOR_CONSENT_THRESHOLD) + STATE_LEAN_REFINEMENT * alignment),
        },
        { key: "reelection-year", source: "interest", value: round3(-REELECTION_EXPOSURE_WEIGHT * exposure) },
        {
            key: "term-limited",
            source: "situation",
            value: governorIsTermLimited(campaign, state) ? TERM_LIMITED_WEIGHT : 0,
        },
        { key: "disaster-size", source: "situation", value: round3(DISASTER_WEIGHT * clamp01(ask.severity)) },
        { key: "character", source: "trait", value: round3(character) },
    ];
}
const clampBound = (value, bound) => Math.max(-bound, Math.min(bound, value));
/** The answer, with the one draw the question is allowed. */
export function governorWillingness(campaign, state, ask, streams) {
    const terms = governorConsentTerms(campaign, state, ask);
    const draw = willDraw(streams, "governor-consent", state, ask.of);
    return weigh("governor-consent", terms, {
        threshold: GOVERNOR_CONSENT_THRESHOLD,
        noiseBound: GOVERNOR_NOISE_BOUND,
        noise: noiseFrom(draw, GOVERNOR_NOISE_BOUND),
    });
}
/** The same sum with no draw in it: what a screen may show before the ask is made. */
export function projectGovernorWillingness(campaign, state, ask) {
    return projectWillingness("governor-consent", governorConsentTerms(campaign, state, ask), {
        threshold: GOVERNOR_CONSENT_THRESHOLD,
        noiseBound: GOVERNOR_NOISE_BOUND,
    });
}
/**
 * A governor's answer and the record it leaves.
 *
 * One producer for both call sites, so a refusal read on the Desk and a refusal
 * that forced a federalization are the same event with the same reasons rather
 * than two sites that each built their own.
 */
export function governorAnswer(campaign, state, ask, streams) {
    const willingness = governorWillingness(campaign, state, ask, streams);
    const name = campaign.states[state]?.base.name ?? state;
    const summary = willingness.acts
        ? `The governor of ${name} agrees to what Washington has asked of the state.`
        : `The governor of ${name} declines what Washington has asked of the state.`;
    return {
        consents: willingness.acts,
        willingness,
        packet: {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary },
            effects: [],
            provenance: {
                origin: "decision",
                locales: [state],
                systems: ["states"],
                visibility: "public",
                decision: stampOf(willingness, state, ask.of, "public"),
            },
        },
    };
}
// --- Seating the statehouses at founding -----------------------------------
/**
 * Below this, a state's lean is a coin flip rather than a party's seat, and
 * its governor is seated after every state that has a clear answer.
 */
const SWING_LEAN = 0.05;
/**
 * Which state each governor is seated in.
 *
 * Seats used to be handed out by alphabetical accident, so a Democrat governed
 * Wyoming as often as not. Party is a fact about a person the pool already
 * carries and lean is a fact about a state the dataset already authors, and a
 * seating that ignored both printed a contradiction on the state's own file.
 *
 * Three passes, safest seats first. A state with a clear lean takes a governor
 * of that party; a swing state takes whichever party it tilts toward; only
 * then does anyone left fill a chair, because an unseated statehouse is a
 * worse lie than an off-lean governor. An independent is seated only once both
 * parties' benches are empty, which the bench's own party floor makes rare: the
 * fifty governors the record holds are all Democrats and Republicans. Nothing
 * here is random: the same seed still seats the same people.
 */
export function seatGovernorsByLean(people, nation) {
    const chairs = worldDataset.states
        .filter((state) => state.id !== "DC")
        .map((state) => ({ id: state.id, lean: state.lean }))
        .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean) || a.id.localeCompare(b.id));
    const bench = Object.values(people)
        .filter((runtime) => runtime.base.nationality === nation &&
        runtime.currentRole === undefined &&
        runtime.base.eligibleRoles.some((role) => role === GOVERNOR_ROLE))
        .sort((a, b) => a.base.id.localeCompare(b.base.id));
    const partyFor = (chair) => (chair.lean < 0 ? "democrat" : "republican");
    const clear = chairs.filter((chair) => Math.abs(chair.lean) >= SWING_LEAN);
    const swing = chairs.filter((chair) => Math.abs(chair.lean) < SWING_LEAN);
    const byPerson = new Map();
    const seat = (chair, wanted) => {
        const person = bench.find((runtime) => !byPerson.has(runtime.base.id) && (wanted === undefined || usPartyOfPerson(runtime.base) === wanted));
        if (!person)
            return false;
        byPerson.set(person.base.id, chair.id);
        return true;
    };
    const unmatched = [...clear, ...swing].filter((chair) => !seat(chair, partyFor(chair)));
    const stillOpen = unmatched.filter((chair) => !seat(chair, partyFor(chair) === "democrat" ? "republican" : "democrat"));
    for (const chair of stillOpen)
        seat(chair);
    return Object.fromEntries(Object.entries(people).map(([id, runtime]) => {
        const state = byPerson.get(id);
        return [id, state ? { ...runtime, currentRole: GOVERNOR_ROLE, state } : runtime];
    }));
}
// --- Holding a governor's race ----------------------------------------------
// A statehouse contest is state politics with a national tide over it. Where the
// state's own lean is clear, the state's own lean decides; where it is close, the
// tide does, and the tide runs against whoever holds the White House at a midterm
// and with them where the country is behind them. An incumbent who can stand
// again carries the edge every incumbent governor carries.
//
// Nothing here is drawn. The same country on the same November elects the same
// governors, which is the property every other settled election in this engine
// holds and the reason a player can be shown a forecast at all.
/** How far a state's own lean has to be from even for the tide not to decide it. */
const STATEHOUSE_FLIP_MARGIN = 0.06;
/** What the out-party tide is worth to a statehouse at a midterm. */
const MIDTERM_STATEHOUSE_TIDE = 0.05;
/** How far the country's standing with the President carries their party's governors. */
const STATEHOUSE_APPROVAL_PULL = 0.16;
/** What a sitting governor who may stand again carries for being the sitting governor. */
const STATEHOUSE_INCUMBENCY = 0.08;
/** The widest share a statehouse race is reported at; above it the number stops meaning anything. */
const MAX_STATEHOUSE_SHARE = 0.72;
/** Signed toward the Democrats, like `lean` reversed: positive is a Democratic tide. */
function statehouseTide(campaign) {
    const party = campaign.congress.administrationParty;
    if (party === "independent")
        return 0;
    const towardPresident = party === "democrat" ? 1 : -1;
    const pull = (campaign.player.metrics.approval - 0.5) * STATEHOUSE_APPROVAL_PULL;
    const midterm = isMidtermYear(campaign.calendar.year) ? -MIDTERM_STATEHOUSE_TIDE : 0;
    return towardPresident * (pull + midterm);
}
/** The bench a flip draws from: unseated, eligible, of the winning party, in order. */
function statehouseBench(campaign, party) {
    return Object.values(campaign.people)
        .filter((runtime) => runtime.alive &&
        runtime.currentRole === undefined &&
        runtime.base.nationality === campaign.founding.nation &&
        runtime.base.eligibleRoles.some((role) => role === GOVERNOR_ROLE) &&
        usPartyFromPersonParty(runtime.base.party) === party)
        .sort((a, b) => a.base.id.localeCompare(b.base.id));
}
/**
 * One statehouse, as the night settles it.
 *
 * Returns nothing for a state with no seated governor and for a flip the bench
 * cannot fill: an unfillable flip leaves the sitting governor in place rather
 * than emptying a statehouse, because a state with no governor is a worse answer
 * than a governor who held on.
 */
function holdGovernorRace(campaign, state, turn, taken) {
    const runtime = campaign.states[state];
    const standing = runtime?.governor;
    if (!runtime || !standing)
        return undefined;
    const limited = governorIsTermLimited(campaign, state);
    const incumbentEdge = limited ? 0 : standing.party === "democrat" ? STATEHOUSE_INCUMBENCY : standing.party === "republican" ? -STATEHOUSE_INCUMBENCY : 0;
    // `lean` is Dem ← → Rep, so the Democratic margin is its negation.
    const partisan = -runtime.lean;
    const contested = Math.abs(partisan) < STATEHOUSE_FLIP_MARGIN;
    const margin = partisan + incumbentEdge + (contested ? statehouseTide(campaign) : statehouseTide(campaign) / 2);
    const party = margin >= 0 ? "democrat" : "republican";
    const share = Math.min(MAX_STATEHOUSE_SHARE, 0.5 + Math.abs(margin) / 2);
    const termEnds = nextGubernatorialElection(state, addDays(campaign.calendar, 1));
    if (party === standing.party && !limited) {
        const held = {
            ...standing,
            termsWon: (standing.termsWon ?? 0) + 1,
            ...(termEnds ? { termEnds: isoOf(termEnds) } : {}),
        };
        return {
            result: { state, party, winner: standing.person, share: round3(share) },
            effects: [
                {
                    kind: "state",
                    state,
                    setGovernor: held,
                    reason: `${runtime.base.name} returns its governor for another term.`,
                },
            ],
        };
    }
    const successor = statehouseBench(campaign, party).find((person) => !taken.has(person.base.id));
    if (!successor) {
        // Nobody of the winning party is left to seat. The sitting governor holds,
        // and the result says so rather than reporting a seat nobody took.
        return {
            result: { state, party: standing.party, winner: standing.person, share: round3(0.5) },
            effects: [],
        };
    }
    const seated = {
        person: successor.base.id,
        party,
        disposition: round3(clamp01(runtime.delegation?.disposition ?? 0.5)),
        since: turn,
        termsWon: 1,
        ...(termEnds ? { termEnds: isoOf(termEnds) } : {}),
    };
    return {
        result: { state, party, winner: successor.base.id, share: round3(share) },
        effects: [
            { kind: "person", person: standing.person, changes: { currentRole: undefined } },
            { kind: "person", person: successor.base.id, changes: { currentRole: GOVERNOR_ROLE, state } },
            {
                kind: "state",
                state,
                setGovernor: seated,
                reason: `${runtime.base.name} elects a new governor, and the statehouse changes hands.`,
            },
        ],
    };
}
/** The named statehouses, settled in STATE_IDS order so a replay is identical. */
function holdGovernorRaces(campaign, states, turn) {
    const results = [];
    const effects = [];
    const taken = new Set();
    for (const state of states) {
        const outcome = holdGovernorRace(campaign, state, turn, taken);
        if (!outcome)
            continue;
        taken.add(outcome.result.winner);
        results.push(outcome.result);
        effects.push(...outcome.effects);
    }
    return { results, effects };
}
/** Every statehouse on today's ballot: the even-year night, inside the federal result. */
export function holdGovernorRacesDueToday(campaign, turn) {
    return holdGovernorRaces(campaign, governorRacesDueToday(campaign), turn);
}
/** Every statehouse on this week's ballot: the odd-year night, one of the week's settlements. */
export function holdGovernorRacesThisWeek(campaign, turn) {
    return holdGovernorRaces(campaign, governorRacesDueThisWeek(campaign), turn);
}
/** How a governors' night reads in one line, for the feed and the result's own summary. */
export function describeGovernorNight(results, campaign) {
    if (results.length === 0)
        return "";
    const flips = results.filter((race) => campaign.states[race.state]?.governor?.party !== race.party).length;
    const count = `${results.length} ${results.length === 1 ? "governorship" : "governorships"}`;
    if (flips === 0)
        return `${count} are decided and every statehouse holds the party that held it.`;
    return `${count} are decided, and ${flips} ${flips === 1 ? "statehouse changes" : "statehouses change"} hands.`;
}
