import { LEADER_TABLE_AS_OF, NATION_LEADER_CONSTRAINTS, calendarRow, preOathSelection, termYears, windowSelection, worldDataset, } from "@admin/world";
import { leadershipArticle } from "./article-leadership.js";
import { addDays, compareDates, daysBetween } from "./clock.js";
import { apply } from "./effects.js";
import { foreignLeaderFor, leadRoleFor, leaderOffset, tableGoverningParty, tableIncumbentId } from "./foreign-leader.js";
import { chooseGovernmentProgram, programOfNewGovernment, worldNorms } from "./governance.js";
import { coverageWeek } from "./press-foreign.js";
import { createRngStreams } from "./rng.js";
import { hasIntelOnNation, selectActiveConditions, selectNation, } from "./state.js";
import { FOREIGN_POLITICS_RECENT_WINDOW } from "./state-world.js";
import { politicalActionPressure, sponsoredCoupTerm } from "./regime-acts.js";
import { noiseFrom, stampOf, weigh } from "./willingness.js";
// Who governs abroad: the election calendar every capital keeps, the seats it
// fills, the governments a parliament brings down and the ones soldiers take,
// and the temperament each new leader brings to the government's decisions for
// as long as they hold office.
//
// A scheduled selection is a dated event, not a decision anybody takes to hold
// it: it happens on the calendar's day, and only its result is drawn. A lost
// confidence vote and a coup are hazards with a rate the country's own state
// sets. Every draw is keyed by the nation and the date, never the week's
// order, so the same seed seats the same winners however the week ran.
export { applyLeadership } from "./world-effects.js";
// --- The calendar ---------------------------------------------------------
const TABLE_DATE = (() => {
    const [year, month, day] = LEADER_TABLE_AS_OF.split("-").map(Number);
    return { year: year, month: month, day: day };
})();
function dateKey(date) {
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
/** One term past a selection, or none where the table names no term. */
function termAfter(nation, date) {
    const years = termYears(nation);
    return years === null ? undefined : { ...date, year: date.year + years };
}
function governedNations(campaign) {
    return Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation).sort();
}
/**
 * The table's next selection, rolled forward a term at a time until it falls
 * on or after `date`. A save written before foreign politics was modeled and
 * loaded mid-term would otherwise find every selection since the oath overdue
 * and hold them all in its first week. None where the table names no term and
 * the one dated selection has passed, because nothing schedules the next.
 */
function selectionOnOrAfter(nation, date) {
    let next = windowSelection(nation)?.date;
    while (next && compareDates(next, date) < 0) {
        const rolled = termAfter(nation, next);
        next = rolled && compareDates(rolled, next) > 0 ? rolled : undefined;
    }
    return next;
}
/**
 * The seat as the leader table leaves it: the table's incumbent, the party
 * the table says governs, no offset, and the first selection the calendar
 * puts on or after the oath, or after today for a campaign already under way.
 * Also the reading of a seat a save written before foreign politics was
 * modeled never stored.
 */
function tableSeat(campaign, nation) {
    const lead = leadRoleFor(campaign, nation);
    const incumbent = lead ? tableIncumbentId(nation, lead) : undefined;
    const party = tableGoverningParty(nation);
    const next = selectionOnOrAfter(nation, campaign.calendar);
    return {
        since: TABLE_DATE,
        offset: {},
        provenance: "table",
        ...(party ? { party } : {}),
        ...(next ? { next } : {}),
        ...(incumbent && campaign.people[incumbent] ? { person: incumbent } : {}),
    };
}
/** The seat on the record, or the table's where none has been stored. */
export function selectForeignSeat(campaign, nation) {
    if (nation === campaign.founding.nation || !campaign.nations[nation])
        return undefined;
    return campaign.foreignPolitics?.seats[nation] ?? tableSeat(campaign, nation);
}
// --- A selection's result ---------------------------------------------------
// How likely a sitting government is to come through a selection, before its
// own standing moves it. Contested elections are a coin with the incumbent's
// record on it; a dominant party rarely loses one; where the ballot is not a
// contest, the question is only whether the party keeps its leader. Planning
// values, set against the rate at which incumbents are returned in each kind
// of system rather than measured in play.
const COMPETITIVE_HOLD = 0.5;
const DOMINANT_HOLD = 0.8;
const UNCONTESTED_HOLD = 0.92;
const LEGITIMACY_PULL = 0.3;
const STABILITY_PULL = 0.2;
const HOLD_FLOOR = 0.05;
const HOLD_CEILING = 0.97;
/** A selection that is not a contest between parties: one party, no parties, or no ballot at all. */
function isUncontested(runtime, nation) {
    const contest = runtime.base.partySystem.contest;
    if (contest === "one-party" || contest === "none")
        return true;
    const row = calendarRow(nation);
    return /no_mechanism|party_congress/.test(row?.electionType ?? "") || row?.fixedOrFlexible === "non_competitive_fixed";
}
/** The chance the sitting government comes through a selection: its system, then its legitimacy and stability. */
export function incumbentStanding(runtime, nation) {
    const base = isUncontested(runtime, nation)
        ? UNCONTESTED_HOLD
        : runtime.base.partySystem.contest === "dominant-party"
            ? DOMINANT_HOLD
            : COMPETITIVE_HOLD;
    const { legitimacy, regimeStability } = runtime.stats.politics;
    const standing = base + LEGITIMACY_PULL * (legitimacy - 0.5) + STABILITY_PULL * (regimeStability - 0.5);
    return Math.max(HOLD_FLOOR, Math.min(HOLD_CEILING, standing));
}
const OPPOSITION_ROLE = "role-opposition-leader";
function nationals(campaign, nation, except) {
    return Object.values(campaign.people).filter((runtime) => runtime.alive && runtime.base.nationality === nation && runtime.base.id !== except && runtime.currentRole === undefined);
}
const byStanding = (a, b) => b.base.competence - a.base.competence || a.base.id.localeCompare(b.base.id);
/**
 * Who takes the chair when the sitting government does not keep it. Where
 * parties contest the ballot, the strongest figure of another party: the
 * opposition's own leader first, then anyone drawn for the chair who does not
 * carry the governing ticket. Where they do not, the governing party's next
 * candidate for the chair.
 */
function challengerFor(campaign, nation, seat, lead, uncontested) {
    const pool = nationals(campaign, nation, seat.person);
    const eligible = (runtime, role) => runtime.base.eligibleRoles.includes(role);
    const leadCandidates = pool.filter((runtime) => eligible(runtime, lead));
    if (uncontested)
        return [...leadCandidates].sort(byStanding)[0]?.base;
    const otherTicket = (runtime) => runtime.base.party !== undefined && runtime.base.party !== seat.party;
    const opposition = pool.filter((runtime) => eligible(runtime, OPPOSITION_ROLE) && otherTicket(runtime)).sort(byStanding)[0];
    const rival = leadCandidates.filter(otherTicket).sort(byStanding)[0];
    return (opposition ?? rival ?? [...leadCandidates].sort(byStanding)[0])?.base;
}
/** A selection's result: the one draw a scheduled selection takes, keyed to its nation and its day. */
function electionResult(campaign, nation, seat, date, streams) {
    const runtime = selectNation(campaign, nation);
    const lead = leadRoleFor(campaign, nation);
    if (!runtime || !lead)
        return { held: true };
    const draw = streams.stream("foreign-election", nation, dateKey(date)).next();
    if (draw < incumbentStanding(runtime, nation) - politicalActionPressure(campaign, nation).standingPull)
        return { held: true };
    const successor = challengerFor(campaign, nation, seat, lead, isUncontested(runtime, nation));
    return successor ? { held: false, successor } : { held: true };
}
// --- A government falling between elections -------------------------------
// The weekly chance a parliament brings its government down, at full
// illegitimacy and a chamber split to the maximum. A planning value set so a
// typical parliamentary government has about a one-in-four chance of not
// finishing its term, which is the order at which terms end early in
// parliamentary democracies.
const CONFIDENCE_RATE = 0.004;
/** A government is not brought down in the half-year after the country returned it. */
const MANDATE_GRACE_DAYS = 182;
/** Nor in the last quarter before a scheduled election, which is the chamber's answer anyway. */
const ELECTION_NEAR_DAYS = 91;
/** The time between a lost confidence vote and the election it calls. A planning value. */
const SNAP_ELECTION_DAYS = 42;
function answersToParliament(runtime) {
    const charter = worldDataset.charters.find((entry) => entry.id === runtime.base.identity.government);
    return charter?.removalMechanism === "no-confidence" && runtime.base.partySystem.contest === "multiparty";
}
/** The weekly chance of a lost confidence vote: an illegitimate government in a split chamber. */
export function confidenceRate(runtime) {
    if (!answersToParliament(runtime))
        return 0;
    const { legitimacy, factionalism } = runtime.stats.politics;
    return CONFIDENCE_RATE * (1 - legitimacy) * (0.5 + factionalism);
}
function losesConfidence(campaign, nation, seat, runtime, streams) {
    const rate = confidenceRate(runtime) * politicalActionPressure(campaign, nation).confidenceLift;
    if (rate === 0)
        return false;
    if (daysBetween(seat.mandate ?? seat.since, campaign.calendar) < MANDATE_GRACE_DAYS)
        return false;
    if (seat.next && daysBetween(campaign.calendar, seat.next) <= ELECTION_NEAR_DAYS)
        return false;
    return streams.stream("foreign-election", nation, "confidence", dateKey(campaign.calendar)).next() < rate;
}
// --- A coup ------------------------------------------------------------------
/** Above this stability no coup is on the table at all. */
const COUP_STABILITY_CEILING = 0.45;
// The terms of the hazard, each already a weekly rate: at the ceiling a coup
// is nowhere near, and a state at zero stability run by a junta carries about
// one chance in a hundred a week. Planning values, set so the world sees a
// handful of coups a year, which is the recent record.
const COUP_REGIME_WEIGHT = 0.006;
const COUP_RIVAL_WEIGHT = 0.0008;
const COUP_DESTABILIZED_WEIGHT = 0.002;
// A threshold and a noise band of one half make the score the weekly chance
// itself: the draw clears the threshold exactly as often as the terms say.
const COUP_THRESHOLD = 0.5;
const COUP_NOISE_BOUND = 0.5;
/** A government that has just taken power by force is not overthrown the same year. */
const COUP_COOLDOWN_DAYS = 364;
/** How readily each kind of regime's armed forces take the state, relative to an ordinary autocracy. */
const REGIME_PRONENESS = {
    full_democracy: 0.1,
    flawed_democracy: 0.4,
    hybrid_regime: 0.8,
    authoritarian: 1,
    one_party_state: 0.5,
    military_junta: 1.5,
    absolute_monarchy: 0.4,
    constitutional_monarchy_executive: 0.4,
    theocracy: 0.5,
};
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
/** The figure in uniform most able to take the chair: the defense or intelligence chief with the most ambition. */
function armedRival(campaign, nation, seat) {
    const armed = ["role-defense-minister", "role-intelligence-director", "role-junta-chairman"];
    return nationals(campaign, nation, seat.person)
        .filter((runtime) => runtime.base.eligibleRoles.some((role) => armed.includes(role)))
        .sort((a, b) => b.base.ambition - a.base.ambition || a.base.id.localeCompare(b.base.id))[0]?.base;
}
function destabilization(campaign, nation) {
    const atWar = Object.values(campaign.conflicts).some((conflict) => conflict.status === "active" &&
        (conflict.aggressor === nation || conflict.defender === nation || conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation)));
    if (atWar)
        return 1;
    return selectActiveConditions(campaign).some((condition) => condition.nation === nation) ? 0.5 : 0;
}
/** The coup hazard's terms, each a weekly rate the country's own state sets. */
export function coupTerms(campaign, nation, runtime, rival) {
    const fragility = Math.max(0, (COUP_STABILITY_CEILING - runtime.stats.politics.regimeStability) / COUP_STABILITY_CEILING);
    const regime = NATION_LEADER_CONSTRAINTS[nation]?.regime;
    const proneness = regime ? REGIME_PRONENESS[regime] : 1;
    const sponsored = sponsoredCoupTerm(campaign, nation, proneness, rival?.ambition ?? 0);
    // Below the ceiling the country's own terms carry the hazard; above it only a
    // sponsor's does, so a sponsored coup is possible where an unaided one is not.
    const own = fragility > 0;
    return [
        { key: "regime-survival", source: "situation", value: round6(COUP_REGIME_WEIGHT * fragility * proneness) },
        { key: "rivals-ambition", source: "trait", value: own ? round6(COUP_RIVAL_WEIGHT * (rival?.ambition ?? 0)) : 0 },
        { key: "destabilized", source: "situation", value: own ? round6(COUP_DESTABILIZED_WEIGHT * destabilization(campaign, nation)) : 0 },
        ...(sponsored > 0 ? [{ key: "sponsored", source: "situation", value: round6(sponsored) }] : []),
    ];
}
function recentlySeizedPower(campaign, nation) {
    return (campaign.foreignPolitics?.recent ?? []).some((change) => change.nation === nation && change.kind === "coup" && daysBetween(change.date, campaign.calendar) < COUP_COOLDOWN_DAYS);
}
/** This week's coup hazard, weighed; undefined where no coup is on the table. */
function coupHazard(campaign, nation, seat, runtime, streams) {
    if (recentlySeizedPower(campaign, nation))
        return undefined;
    const rival = armedRival(campaign, nation, seat);
    if (!rival)
        return undefined;
    const regime = NATION_LEADER_CONSTRAINTS[nation]?.regime;
    const sponsored = sponsoredCoupTerm(campaign, nation, regime ? REGIME_PRONENESS[regime] : 1, rival.ambition);
    if (runtime.stats.politics.regimeStability >= COUP_STABILITY_CEILING && sponsored <= 0)
        return undefined;
    const draw = streams.stream("coup", nation, dateKey(campaign.calendar)).next();
    const willingness = weigh("coup-hazard", coupTerms(campaign, nation, runtime, rival), {
        threshold: COUP_THRESHOLD,
        noiseBound: COUP_NOISE_BOUND,
        noise: noiseFrom(draw, COUP_NOISE_BOUND),
    });
    return { willingness, rival };
}
// --- Seating --------------------------------------------------------------
/**
 * The one writer of a foreign chair: the successor takes the lead role on the
 * record, and whoever held it on the record lets it go. The table's incumbent
 * never held it on the record, so there is nothing to clear for them.
 */
function seatingEffects(campaign, lead, successor, predecessor) {
    const leaving = predecessor && predecessor !== successor && campaign.people[predecessor]?.currentRole === lead
        ? [{ kind: "person", person: predecessor, changes: { currentRole: undefined } }]
        : [];
    return [...leaving, { kind: "person", person: successor, changes: { currentRole: lead } }];
}
/** The seating written straight onto the cast, for the seal, which files no packets. */
function seatedCast(people, effects) {
    return effects.reduce((cast, effect) => {
        const runtime = cast[effect.person];
        if (!runtime)
            return cast;
        const { currentRole: _held, ...rest } = runtime;
        const role = effect.changes.currentRole;
        return { ...cast, [effect.person]: role === undefined ? rest : { ...rest, currentRole: role } };
    }, people);
}
function baselineOf(campaign, nation) {
    const lead = leadRoleFor(campaign, nation);
    return lead ? campaign.people[tableIncumbentId(nation, lead)]?.base : undefined;
}
/** The seat a successor takes: their own party, their own offset against the table's leader, and a fresh mandate. */
function successorSeat(campaign, nation, successor, date, next, options) {
    const party = options.partyless ? undefined : successor.party;
    return {
        since: date,
        offset: leaderOffset(successor, baselineOf(campaign, nation)),
        provenance: options.provenance,
        person: successor.id,
        mandate: date,
        ...(party ? { party } : {}),
        ...(next ? { next } : {}),
    };
}
/** Which story a change is, for the article and the feed. */
export function leadershipStoryOf(campaign, change) {
    if (change.kind === "coup")
        return "coup";
    if (change.kind === "resignation")
        return "confidence";
    if (change.cause === "death")
        return "death";
    if (change.cause === "defeat")
        return "defeat";
    if (change.cause === "removed")
        return "removed";
    if (change.held)
        return "held";
    const before = change.predecessor ? campaign.people[change.predecessor]?.base.party : undefined;
    return change.kind === "election" && before !== change.party ? "opposition" : "handover";
}
/** The article a change is reported in, naming the modeled people on either side of it. */
export function leadershipArticleOf(campaign, change) {
    const nation = selectNation(campaign, change.nation)?.base.identity.name ?? change.nation;
    const leader = (change.person && campaign.people[change.person]?.base.name) || "the new leader";
    const predecessor = (change.predecessor && campaign.people[change.predecessor]?.base.name) || "the outgoing leader";
    return leadershipArticle(leadershipStoryOf(campaign, change), { nation, leader, predecessor }, `${change.nation}:${dateKey(change.date)}:${change.kind}`);
}
function changeFeed(campaign, change, article) {
    return {
        turn: campaign.turn + 1,
        kind: "governance",
        visibility: "public",
        headline: article.headline,
        actor: change.nation,
        date: campaign.calendar,
        facts: { stake: article.standfirst, instrument: "Change of government" },
    };
}
/** The packet a change of seat files: the chair, the seat, a new government's program, and the story. */
function changePacket(campaign, input) {
    const lead = leadRoleFor(campaign, input.nation);
    const successor = input.seat.person;
    const change = {
        nation: input.nation,
        date: campaign.calendar,
        kind: input.kind,
        ...(input.held ? { held: true } : {}),
        ...(input.cause ? { cause: input.cause } : {}),
        ...(successor ? { person: successor } : {}),
        ...(input.previous.person && input.previous.person !== successor ? { predecessor: input.previous.person } : {}),
        ...(input.seat.party ? { party: input.seat.party } : {}),
    };
    const changedHands = successor !== undefined && successor !== input.previous.person;
    const seating = changedHands && lead ? seatingEffects(campaign, lead, successor, input.previous.person) : [];
    const program = input.seat.party !== input.previous.party ? programOfNewGovernment(campaign, input.nation, input.seat.party) : [];
    const article = leadershipArticleOf(campaign, change);
    const effects = [
        ...seating,
        { kind: "leadership", nation: input.nation, seat: input.seat, change },
        ...program,
        { kind: "feed", items: [changeFeed(campaign, change, article)] },
    ];
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: article.headline },
        effects,
        provenance: {
            origin: input.kind === "election" ? "scheduled" : "world",
            // The nation alone when the chair stayed where it was, and the two people
            // either side of it when it moved, so the record says which it was.
            entities: [input.nation, ...(changedHands ? [successor, ...(input.previous.person ? [input.previous.person] : [])] : [])],
            systems: ["foreign-politics"],
            visibility: "public",
            ...(input.willingness ? { decision: stampOf(input.willingness, input.nation, input.previous.person, "intelligence") } : {}),
        },
    };
}
const OUTSIDE_GOVERNMENT = new Set(["role-journalist", OPPOSITION_ROLE]);
/**
 * Who takes a chair whose holder died when the cast drew nobody else for it:
 * the constitution's stand-in, read as the governing party's strongest national
 * in government, else any national in government. A third of the governments
 * have no second candidate for the chair, and without this a death there left
 * a dead leader in office for good.
 */
function standIn(campaign, nation, seat) {
    const sameParty = (runtime) => Number(seat.party !== undefined && runtime.base.party === seat.party);
    return Object.values(campaign.people)
        .filter((runtime) => runtime.alive && runtime.base.nationality === nation && runtime.base.id !== seat.person &&
        runtime.base.eligibleRoles.some((role) => !OUTSIDE_GOVERNMENT.has(role)))
        .sort((a, b) => sameParty(b) - sameParty(a) || byStanding(a, b))[0]?.base;
}
function deathInOffice(campaign, nation, seat) {
    if (!seat.person || campaign.people[seat.person]?.alive !== false)
        return undefined;
    const heir = foreignLeaderFor(campaign, nation);
    const person = heir && heir.person !== seat.person ? campaign.people[heir.person]?.base : standIn(campaign, nation, seat);
    if (!person)
        return undefined;
    const next = seat.next;
    const newSeat = successorSeat(campaign, nation, person, campaign.calendar, next, { provenance: "played" });
    return changePacket(campaign, { nation, kind: "succession", cause: "death", seat: newSeat, previous: seat });
}
function scheduledSelection(campaign, nation, seat, streams) {
    if (!seat.next || compareDates(seat.next, campaign.calendar) > 0)
        return undefined;
    const outcome = electionResult(campaign, nation, seat, seat.next, streams);
    const next = termAfter(nation, seat.next);
    const { next: _due, ...rest } = seat;
    if (outcome.held) {
        const heldSeat = { ...rest, mandate: campaign.calendar, ...(next ? { next } : {}) };
        return changePacket(campaign, { nation, kind: "election", held: true, seat: heldSeat, previous: seat });
    }
    const newSeat = successorSeat(campaign, nation, outcome.successor, campaign.calendar, next, { provenance: "played" });
    return changePacket(campaign, { nation, kind: "election", seat: newSeat, previous: seat });
}
function lostConfidence(campaign, nation, seat, runtime, streams) {
    if (!losesConfidence(campaign, nation, seat, runtime, streams))
        return undefined;
    const caretaker = { ...seat, next: addDays(campaign.calendar, SNAP_ELECTION_DAYS) };
    return changePacket(campaign, { nation, kind: "resignation", cause: "confidence", seat: caretaker, previous: seat });
}
function seizedPower(campaign, nation, seat, runtime, streams) {
    const hazard = coupHazard(campaign, nation, seat, runtime, streams);
    if (!hazard?.willingness.acts)
        return undefined;
    const junta = successorSeat(campaign, nation, hazard.rival, campaign.calendar, undefined, { partyless: true, provenance: "played" });
    return changePacket(campaign, { nation, kind: "coup", seat: junta, previous: seat, willingness: hazard.willingness });
}
/** One nation's week abroad: at most one change of government, checked in the order the world forces them. */
function nationWeek(campaign, nation, streams) {
    const runtime = selectNation(campaign, nation);
    const seat = selectForeignSeat(campaign, nation);
    if (!runtime || !seat)
        return undefined;
    return (deathInOffice(campaign, nation, seat) ??
        scheduledSelection(campaign, nation, seat, streams) ??
        lostConfidence(campaign, nation, seat, runtime, streams) ??
        seizedPower(campaign, nation, seat, runtime, streams));
}
/** The week's selections, falls and successions abroad, and the week of the press abroad. */
export const foreignPoliticsPhase = (state) => {
    const streams = createRngStreams(state.seed);
    const changes = governedNations(state).flatMap((nation) => {
        const packet = nationWeek(state, nation, streams);
        return packet ? [packet] : [];
    });
    const coverage = coverageWeek(state);
    if (coverage.length === 0)
        return changes;
    const press = {
        source: "simulate",
        actor: "world",
        turn: state.turn,
        narration: { summary: "The press abroad files its week on the administration." },
        effects: coverage,
        background: true,
    };
    return [...changes, press];
};
function sealNation(campaign, state, nation, streams, norms) {
    const base = tableSeat(campaign, nation);
    const pre = preOathSelection(nation);
    if (!pre)
        return { ...state, seats: { ...state.seats, [nation]: base } };
    const working = { ...campaign, people: state.people };
    const outcome = electionResult(working, nation, base, pre.date, streams);
    const next = windowSelection(nation)?.date ?? termAfter(nation, pre.date);
    const { next: _table, ...rest } = base;
    if (outcome.held)
        return { ...state, seats: { ...state.seats, [nation]: { ...rest, mandate: pre.date, ...(next ? { next } : {}) } } };
    const lead = leadRoleFor(campaign, nation);
    const seat = successorSeat(working, nation, outcome.successor, pre.date, next, { provenance: "projected" });
    const people = lead ? seatedCast(state.people, seatingEffects(working, lead, outcome.successor.id, base.person)) : state.people;
    const change = {
        nation,
        date: pre.date,
        kind: "election",
        person: outcome.successor.id,
        projected: true,
        ...(base.person ? { predecessor: base.person } : {}),
        ...(seat.party ? { party: seat.party } : {}),
    };
    const runtime = selectNation(campaign, nation);
    const governments = runtime && seat.party !== base.party
        ? { ...state.governments, [nation]: chooseGovernmentProgram(runtime, norms, undefined, seat.party) }
        : state.governments;
    return { people, governments, seats: { ...state.seats, [nation]: seat }, recent: [...state.recent, change] };
}
/**
 * The selections the table schedules between its own date and the oath,
 * resolved at the seal by the same rule the calendar runs by afterwards, and
 * seeded, so the 2029 world has had the elections 2026 to 2028 were due to
 * hold. Only the seats are resolved: nothing else about those two years is
 * simulated. Every change carries "projected" as its provenance, and every
 * other capital opens on its table incumbent with no offset.
 */
export function interregnum(campaign) {
    const streams = createRngStreams(campaign.seed);
    const norms = worldNorms(campaign.nations);
    const opening = { people: campaign.people, governments: campaign.governments, seats: {}, recent: [] };
    const sealed = governedNations(campaign).reduce((state, nation) => sealNation(campaign, state, nation, streams, norms), opening);
    const recent = [...sealed.recent].sort((a, b) => compareDates(a.date, b.date)).slice(-FOREIGN_POLITICS_RECENT_WINDOW);
    return {
        ...campaign,
        people: sealed.people,
        governments: sealed.governments,
        foreignPolitics: { seats: sealed.seats, recent },
    };
}
// --- Succession outside the calendar ----------------------------------------
/**
 * The packet that replaces a government's leader outside an election, through
 * the same seat path and with a fresh offset: the next candidate of another
 * party where parties contest power, the governing party's next where they do
 * not. None where the charter seats nobody.
 */
export function successionPacket(campaign, nation, cause) {
    const runtime = selectNation(campaign, nation);
    const seat = selectForeignSeat(campaign, nation);
    const lead = leadRoleFor(campaign, nation);
    if (!runtime || !seat || !lead)
        return undefined;
    const successor = challengerFor(campaign, nation, seat, lead, isUncontested(runtime, nation));
    if (!successor)
        return undefined;
    const newSeat = successorSeat(campaign, nation, successor, campaign.calendar, seat.next, { provenance: "played" });
    return changePacket(campaign, { nation, kind: "succession", cause, seat: newSeat, previous: seat });
}
/** A government's leader replaced outside an election, applied. */
export function succeedLeader(campaign, nation, cause) {
    const packet = successionPacket(campaign, nation, cause);
    return packet ? apply(campaign, packet) : campaign;
}
/**
 * Every effect a succession after a lost war files: the chair, the seat, the
 * new government's program and the story, so the leader the record names and
 * the temperament the seat carries never part.
 */
export function defeatSuccessionEffects(campaign, nation) {
    return successionPacket(campaign, nation, "defeat")?.effects ?? [];
}
/** A government's leader after it loses a war. */
export function succeedAfterDefeat(campaign, nation) {
    return succeedLeader(campaign, nation, "defeat");
}
// --- Readings -----------------------------------------------------------------
/** The changes of government on the record, newest first, for one nation or for the world. */
export function selectLeadershipChanges(campaign, nation) {
    const recent = campaign.foreignPolitics?.recent ?? [];
    return [...recent].filter((change) => nation === undefined || change.nation === nation).reverse();
}
/**
 * Coups as the Desk reads them: a coup in a government the President's
 * services read is an intelligence matter on the desk the week it happens, and
 * one in a government they cannot read is logged. Soft, not hard: pausing on
 * arrival is the attention policy's default for a coup, which the player may
 * change, and a hard matter would override that setting.
 */
export function coupMatters(campaign, date) {
    return selectLeadershipChanges(campaign)
        .filter((change) => change.kind === "coup" && daysBetween(change.date, date) >= 0 && daysBetween(change.date, date) < 7)
        .map((change) => {
        const article = leadershipArticleOf(campaign, change);
        return {
            id: `coup:${change.nation}:${dateKey(change.date)}`,
            source: "coup",
            urgency: hasIntelOnNation(campaign, change.nation) ? "soft" : "ambient",
            title: article.headline,
            reason: article.standfirst,
            subject: `coup:${change.nation}`,
            date: change.date,
            actor: change.nation,
        };
    });
}
