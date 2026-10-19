import { agendaTheme, debtToGdp, worldDataset, } from "@admin/world";
import { BENEFICIAL_DIRECTION, CARETAKER_QUALITY, NO_RESTING_OFFSET, POLICY_DOMAIN_SPECS, POLICY_DOMAINS, RESTING_POINT_PATHS, POLICY_QUALITY_RANGE, POLICY_STANCES, POLICY_STAT_RANGES, executionQuality, inheritedStance, legislableDomains, policyNationEffects, policyRestingOffset, policyStance, policyStatValue, selectPolicyStance, stancesForDomain, } from "./policy.js";
import { governingPartyOf, tableGoverningParty } from "./foreign-leader.js";
import { lawRestingOffset } from "./law-offsets.js";
import { FISCAL_PROGRAM_SHIFTS } from "./fiscal-impulse.js";
import { selectNationalBooks } from "./national-books.js";
import { tierRate } from "./sovereign.js";
import { selectActiveConditions, selectNation, } from "./state.js";
// How often a government revisits its program. A state that re-legislated
// every week would be noise, and one that never did would be scenery; a season
// is long enough that a change means something happened.
export const GOVERNANCE_REVIEW_INTERVAL = 13;
// How far a challenger has to beat the standing program by before a
// government actually moves. Governments are not indifferent between doing
// something and doing nothing — the status quo is free and change is not.
const INERTIA = 0.18;
// What a nation's own aims add to the case for an ambitious program in the
// domain they bear on. A security-minded state finds the argument for
// rearmament easier to make than a prestige-minded one does.
const AMBITION_WEIGHT = 0.5;
// What a week of teeth is worth against a pull on the country's politics. The
// two are commensurable only after both are normalized, and they are weighted
// to be genuinely comparable: a state governs from what it needs *and* from
// what it is, and a model where either term always wins produces fifty
// countries that govern identically.
const NEED_WEIGHT = 0.35;
const CHARACTER_WEIGHT = 2;
// Even a stat that is in good shape is worth something: without a floor, a
// program that wrecks a healthy figure would score as free.
const NEED_FLOOR = 0.3;
// How much an impatient government is moved by what a program pays this
// week. Set so it can decide a domain where the condition of the country
// argues weakly either way, and not otherwise.
const HORIZON_WEIGHT = 0.6;
// What the money weighs when the money is the problem: a program's pull on the
// balance, a share of output, against a government already under strain. A
// share of output is a small figure and every other term is a share of one, so
// the weight is what lets a strained government's books decide its fiscal
// program, while one with room to spare is not governed out of its ledger at
// all (its strain reads zero).
const PURSE_WEIGHT = 75;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clampSigned = (value) => Math.max(-1, Math.min(1, value));
// Which domains each kind of aim actually bears on. A nation pursuing revenue
// has opinions about its budget and its industry; it has no particular view
// about conscription.
const THEME_DOMAINS = {
    security: { defense: 1, security: 0.8, civil: 0.3 },
    economic: { fiscal: 0.9, industry: 1, trade: 0.9 },
    prestige: { defense: 0.5, trade: 0.5, industry: 0.4 },
    autonomy: { trade: 0.9, industry: 0.7, defense: 0.5 },
    internal: { civil: 1, security: 0.7, fiscal: 0.5 },
};
/**
 * How well a government delivers what it decides.
 *
 * The player's figure is their minister's competence (`executionQuality`); a
 * nation with no cabinet in state has to be read from the state itself. A
 * corrupt administration loses part of every program on the way down, and one
 * nobody accepts as legitimate cannot make the country carry it — so the same
 * 0.6..1.4 band the player's ministers are scored on is spanned by the two
 * figures that decide whether an order given is an order carried out.
 */
export function governmentQuality(runtime) {
    const capacity = clamp01((1 - runtime.stats.security.corruptionIndex) * 0.6 + runtime.stats.politics.legitimacy * 0.4);
    return CARETAKER_QUALITY + POLICY_QUALITY_RANGE * capacity;
}
// How much of a country's economic position is the party that governs it, and
// how much the chamber it governs through. A government follows its own
// platform first; the rest of the slate is the coalition, the opposition and
// the civil service it cannot legislate past.
const GOVERNING_PARTY_WEIGHT = 0.6;
/**
 * Where this country's politics actually sits on the economy.
 *
 * Read from the country's own tickets, weighted by how tightly each whips its
 * members, rather than from its statistics: a party's platform is authored and
 * a position derived from unemployment would be a number the game made up. A
 * country the dataset says runs no parties states no position, and zero is the
 * honest reading of that rather than a stand-in for the middle — there is no
 * ticket whose platform could be read. Where a party governs, its own platform
 * carries most of the reading, so a change of government changes the program.
 */
function economicPosition(runtime, governing) {
    const parties = runtime.base.partySystem.parties;
    const weight = parties.reduce((sum, party) => sum + party.cohesion, 0);
    if (weight === 0)
        return 0;
    const slate = clampSigned(parties.reduce((sum, party) => sum + party.beliefs.economicLeftRight * party.cohesion, 0) / weight);
    const ruling = governing === undefined ? undefined : parties.find((party) => party.id === governing);
    if (!ruling)
        return slate;
    return clampSigned(ruling.beliefs.economicLeftRight * GOVERNING_PARTY_WEIGHT + slate * (1 - GOVERNING_PARTY_WEIGHT));
}
/**
 * What kind of state this is, on the same three axes the player accumulates by
 * governing. Read from live stats and traits rather than authored, so a country
 * that is drifting shut — press freedom falling, borders closing — starts
 * preferring the programs that suit what it has become.
 */
export function governmentCharacter(runtime, governing) {
    const { traits, stats } = runtime;
    return {
        economicLeftRight: economicPosition(runtime, governing),
        authLibertarian: clampSigned((0.5 - stats.politics.pressFreedom) * 2 * 0.55 +
            (0.5 - traits.transparency) * 2 * 0.25 +
            (0.5 - traits.legalism) * 2 * 0.2),
        nationalistGlobalist: clampSigned((traits.isolationism - 0.5) * 2 * 0.6 + (0.5 - stats.softPower.diplomaticReach) * 2 * 0.4),
    };
}
// --- What kind of government this is, for the rules that have to know ---
//
// The dataset carries real institutional heterogeneity — a charter, a party
// system, a political record — and until these existed the NPC agent read a
// nation as eight traits and a reserves figure, so a parliamentary coalition
// and an absolute monarchy decided identically. Each reading below is one
// authored field turned into a scalar the agent can price, and each is a fact
// about the government rather than about its personality.
/**
 * How much a government has to carry somebody else with it before it can
 * commit the country to something serious.
 *
 * Read off who can remove it, which is the structural fact rather than the
 * prose one: a cabinet that can lose a confidence vote this week cannot open a
 * front without the chamber, an elected government has to answer for it at a
 * date it does not control, and a junta or a throne answers to nobody it has
 * to persuade in advance. Charters are matched by id against the shipped
 * catalogue; a nation governed under a charter this build does not carry reads
 * as no drag, because a constitution nothing describes cannot be said to place
 * a body in the way.
 */
export const RATIFICATION_DRAG = {
    "no-confidence": 1,
    "electoral-defeat": 0.8,
    impeachment: 0.5,
    "clerical-council": 0.3,
    coup: 0,
};
const CHARTER_BY_ID = new Map(worldDataset.charters.map((charter) => [charter.id, charter]));
export function ratificationDrag(runtime) {
    const charter = CHARTER_BY_ID.get(runtime.base.identity.government);
    return charter ? RATIFICATION_DRAG[charter.removalMechanism] : 0;
}
/**
 * How exposed at home a government is when it climbs down.
 *
 * A multiparty government that has already committed cannot cheaply reverse:
 * there is somebody across the chamber whose whole job is to name the reversal.
 * Where one ticket is the state, or there are no tickets at all, a campaign can
 * be dropped on Monday and nobody will ask. Legitimacy is the second half of
 * it and runs the other way — a government the country already accepts can
 * absorb a climb-down that one nobody accepts cannot risk.
 */
const CONTEST_EXPOSURE = {
    multiparty: 1,
    "dominant-party": 0.6,
    "one-party": 0.25,
    none: 0.1,
};
export function audienceCost(runtime) {
    return clamp01(CONTEST_EXPOSURE[runtime.base.partySystem.contest] * (1 - runtime.stats.politics.legitimacy * 0.5));
}
/**
 * What a government losing its own hold does about it.
 *
 * Signed, because the two answers are opposite and the dataset says which one
 * this state reaches for: a shaky government whose elite is united reaches
 * outward for something to be seen winning, and a shaky government whose elite
 * is at each other's throats has no attention left to spend abroad. A secure
 * government reads zero either way — survival is not what it is deciding.
 */
export function regimeSurvivalDrive(runtime) {
    const insecurity = clamp01(1 - runtime.stats.politics.regimeStability);
    return clampSigned(insecurity * (1 - runtime.stats.politics.factionalism * 2));
}
/**
 * The figure a government judges its condition on, per path: the stat itself,
 * except the debt, which is judged as a share of output. Read as a stock the
 * world's largest economy was always its most indebted and a small one never
 * was, whatever either carried against what it earns.
 */
function burden(stats, path) {
    return path === "economy.debt" ? debtToGdp(stats) : policyStatValue(stats, path);
}
export function worldNorms(nations) {
    const runtimes = Object.values(nations);
    const entries = Object.keys(POLICY_STAT_RANGES).map((path) => {
        let low = Infinity;
        let high = -Infinity;
        for (const runtime of runtimes) {
            const value = burden(runtime.stats, path);
            if (value < low)
                low = value;
            if (value > high)
                high = value;
        }
        // An empty world, or one where every nation reads the same figure, has no
        // spread to judge against; the schema range is the honest fallback.
        return [path, Number.isFinite(low) && high > low ? [low, high] : POLICY_STAT_RANGES[path]];
    });
    return Object.fromEntries(entries);
}
/**
 * How badly this country needs a given stat to move, 0..1 — its distance from
 * the good end of the world's spread. High corruption is urgent, low corruption
 * is not, and which end is the good one is the same table the teeth already use.
 */
function urgency(runtime, path, norms) {
    const [min, max] = norms[path];
    const normalized = clamp01((burden(runtime.stats, path) - min) / (max - min || 1));
    return BENEFICIAL_DIRECTION[path] > 0 ? 1 - normalized : normalized;
}
/**
 * The largest movement the catalogue makes on each path, which is what a
 * movement on that path is measured against.
 *
 * Not the schema range: the debt ratio spans 0..5 and `politics.legitimacy`
 * spans 0..1, so dividing by the range made a debt program's whole effect a
 * fifth of a legitimacy program's and no indebted state would ever have
 * consolidated. What matters is how big a move this is *for a policy*, and only
 * the catalogue can say. Read on first use, never at load: the policy table
 * and this module sit on one import cycle, and whichever loads second would
 * find the other's table uninitialized.
 */
let pathScaleCache;
function pathScale() {
    if (pathScaleCache)
        return pathScaleCache;
    const scale = Object.fromEntries(Object.keys(POLICY_STAT_RANGES).map((path) => [path, 0]));
    for (const stance of POLICY_STANCES) {
        for (const [path, delta] of Object.entries(stance.nationEffects)) {
            scale[path] = Math.max(scale[path], Math.abs(delta));
        }
    }
    pathScaleCache = scale;
    return scale;
}
/** What a week of this program is worth to this country's actual condition. */
function needFit(runtime, stance, norms) {
    let total = 0;
    for (const [path, delta] of Object.entries(stance.nationEffects)) {
        const emphasis = NEED_FLOOR + (1 - NEED_FLOOR) * urgency(runtime, path, norms);
        total += ((BENEFICIAL_DIRECTION[path] * delta) / (pathScale()[path] || 1)) * emphasis;
    }
    return total * NEED_WEIGHT;
}
const NO_PURSE_CONTEXT = { inCrisis: false };
/**
 * How much a rating alone says a government has to watch its borrowing, 0 at
 * investment grade to 1 in default.
 *
 * Nothing above junk. What an investment-grade letter costs is already in the
 * rate its debt is carried at, which the burden term reads; charging the letter
 * again at every notch below AAA put two thirds of the world's comfortable
 * governments on austerity whose books held their ratio at founding rates. The
 * letter starts to bind by itself where the buyers who may only hold
 * investment grade have to sell.
 */
const RATING_STRAIN = {
    AAA: 0,
    AA: 0,
    A: 0,
    BBB: 0,
    BB: 0.3,
    B: 0.6,
    CCC: 0.85,
    D: 1,
};
const ramp = (value, lo, hi) => clamp01((value - lo) / (hi - lo));
/**
 * How far this government's finance ministry is refusing things, 0..1: from
 * its debt as a share of output, its rating, and what its interest costs it
 * as a share of output. Strain starts where the trouble starts — measured from
 * zero, every state carries enough debt to register some and the accounts
 * decide every domain for everybody. A government already in a debt crisis is
 * at full strain, which is what makes it consolidate.
 */
export function purseStrain(runtime, context = NO_PURSE_CONTEXT) {
    if (context.inCrisis)
        return 1;
    const ratio = debtToGdp(runtime.stats);
    const letter = runtime.stats.economy.sovereignRating;
    const rate = context.books?.rates.effective ?? tierRate(letter);
    return clamp01(0.5 * ramp(ratio, 0.7, 1.5) + 0.25 * RATING_STRAIN[letter] + 0.25 * ramp(rate * ratio, 0.02, 0.06));
}
/** What a program does to the balance each year, as a share of output: its receipts less its outlays. */
function balanceShift(stance) {
    const shift = FISCAL_PROGRAM_SHIFTS[stance.id];
    return (stance.perTurn.treasuryOfGdp ?? 0) + (shift ? (shift.take ?? 0) - (shift.outlays ?? 0) : 0);
}
/**
 * What the program does to the books, weighed by how much this state can
 * currently afford an opinion about anything else.
 *
 * A government with no debt and a good rating treats a spending program as a
 * choice; one carrying twice its output in debt at a junk rating treats the
 * same program as unaffordable and the consolidation as the only one on the
 * table. Without this every state in the world funds a transition, a
 * redistribution and a rearmament in the same week, and every one of them
 * borrows for public investment forever.
 */
function purseFit(stance, strain) {
    const share = balanceShift(stance);
    if (share === 0 || strain === 0)
        return 0;
    return share * strain * PURSE_WEIGHT;
}
/** How far a program pulls the way this state already leans. */
function characterFit(stance, character) {
    const dot = (stance.alignment.economicLeftRight ?? 0) * character.economicLeftRight +
        (stance.alignment.authLibertarian ?? 0) * character.authLibertarian +
        (stance.alignment.nationalistGlobalist ?? 0) * character.nationalistGlobalist;
    return dot * CHARACTER_WEIGHT;
}
/**
 * What the program pays *this week*, and how much this government cares that
 * it does.
 *
 * `perTurn` is the immediate political return on a program — money in the
 * accounts, order in the streets, standing abroad — where `nationEffects` is
 * what it does to the country over time. Every government wants both; which one
 * it buys when they conflict is a question about its horizon, and the dataset
 * answers it: an opportunistic, risk-tolerant state takes the receipts now and
 * lets the corruption and the resentment arrive on somebody else's term, and a
 * patient one does the opposite. Without this the two industrial programs are
 * decided by arithmetic alone and every capital in the world drills.
 */
function horizonFit(runtime, stance) {
    const impatience = clamp01(runtime.traits.opportunism * 0.6 + runtime.traits.riskTolerance * 0.4);
    const now = (stance.perTurn.treasuryOfGdp ?? 0) * 40 +
        (stance.perTurn.stability ?? 0) * 10 +
        (stance.perTurn.standing ?? 0) * 10;
    return now * impatience * HORIZON_WEIGHT;
}
/** How much this nation's own aims care about this domain at all. */
function ambition(runtime, domain) {
    const agendas = runtime.traits.agendas;
    const totalWeight = agendas.reduce((sum, agenda) => sum + agenda.weight, 0);
    if (totalWeight === 0)
        return 0;
    const weighted = agendas.reduce((sum, agenda) => {
        const theme = agendaTheme(agenda.id);
        return sum + (theme ? (THEME_DOMAINS[theme][domain] ?? 0) : 0) * agenda.weight;
    }, 0);
    return weighted / totalWeight;
}
/**
 * Every stance in a domain, priced for this nation, best first. Exposed whole
 * rather than only its winner: the same read that lets an NPC's choice be
 * explained is the one a dossier or god mode needs to show why a country is
 * governed the way it is.
 */
export function scoreDomain(runtime, domain, norms, purse = NO_PURSE_CONTEXT, governing) {
    const character = governmentCharacter(runtime, governing);
    const pull = ambition(runtime, domain);
    const strain = purseStrain(runtime, purse);
    const scored = stancesForDomain(domain).map((stance) => {
        const need = needFit(runtime, stance, norms);
        const fit = characterFit(stance, character);
        const purseTerm = purseFit(stance, strain);
        const horizon = horizonFit(runtime, stance);
        const ambitionTerm = stance.inherited ? 0 : AMBITION_WEIGHT * pull;
        return {
            stance,
            needFit: need,
            characterFit: fit,
            purseFit: purseTerm,
            horizonFit: horizon,
            ambition: ambitionTerm,
            score: need + fit + purseTerm + horizon + ambitionTerm + (stance.inherited ? INERTIA : 0),
        };
    });
    // Ties break on stance id, never on catalogue order, so a reordering of the
    // catalogue cannot silently re-govern the world.
    return [...scored].sort((a, b) => b.score - a.score || a.stance.id.localeCompare(b.stance.id));
}
/**
 * The program this nation would hold if it decided today. Pure in the
 * runtime: no rng, so two campaigns from one seed govern the world identically
 * and a replay cannot drift.
 */
export function chooseGovernmentProgram(runtime, norms, purse, governing) {
    return Object.fromEntries(POLICY_DOMAINS.map((domain) => [domain, scoreDomain(runtime, domain, norms, purse, governing)[0].stance.id]));
}
/** The books and the crisis a government reviewing its program this week is looking at. */
export function purseContext(campaign, nation) {
    const books = selectNationalBooks(campaign, nation);
    const inCrisis = selectActiveConditions(campaign).some((condition) => condition.nation === nation && condition.kind === "fiscal-crisis");
    return books ? { books, inCrisis } : { inCrisis };
}
/** Every nation's opening program. The world is already governed at founding. */
export function openingGovernments(nations, player) {
    const norms = worldNorms(nations);
    return Object.fromEntries(Object.entries(nations)
        .filter(([id]) => id !== player)
        .map(([id, runtime]) => [id, chooseGovernmentProgram(runtime, norms, undefined, tableGoverningParty(id))]));
}
/** What a nation is running, whoever governs it. */
export function selectGovernment(campaign, nation) {
    if (nation === campaign.founding.nation)
        return campaign.player.policies;
    return campaign.governments[nation] ?? inheritedProgram();
}
export function selectGovernmentStance(campaign, nation, domain) {
    const held = selectGovernment(campaign, nation)[domain];
    return (held ? policyStance(held) : undefined) ?? inheritedStance(domain);
}
function inheritedProgram() {
    return Object.fromEntries(POLICY_DOMAINS.map((domain) => [domain, inheritedStance(domain).id]));
}
// Reviews are staggered by nation rather than synchronized, so the world does
// not re-legislate in unison every thirteenth week — which would read as a
// scheduled event rather than as fifty governments on their own clocks.
function reviewOffset(nation) {
    let hash = 0;
    for (const character of nation)
        hash = (hash * 31 + character.charCodeAt(0)) % GOVERNANCE_REVIEW_INTERVAL;
    return hash;
}
export function reviewsProgramThisTurn(nation, turn) {
    return (turn + reviewOffset(nation)) % GOVERNANCE_REVIEW_INTERVAL === 0;
}
function governedNations(campaign) {
    return Object.keys(campaign.nations)
        .filter((id) => id !== campaign.founding.nation)
        .sort((a, b) => a.localeCompare(b));
}
// Every domain, not the charter-legislable subset: that gate is the player's
// charter deciding which chairs it seats, and a foreign government is not
// seated under the player's charter.
function foreignLines(runtime, program) {
    const quality = governmentQuality(runtime);
    return POLICY_DOMAINS.map((domain) => ({
        stance: policyStance(program[domain]) ?? inheritedStance(domain),
        quality,
    }));
}
/** The stat effects of one nation's week of governing. */
function weekOfGoverning(campaign, nation, program) {
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return [];
    return policyNationEffects(runtime, foreignLines(runtime, program));
}
/**
 * Where any nation's standing program puts the five rates `macro.ts` reverts.
 *
 * One reader for both halves of the world, because `macroDriftPhase` runs over
 * every nation on earth and must not have to know which of them has a cabinet
 * in state: the player's program is charter-gated and delivered by a named
 * minister, everyone else's is delivered by the state they have.
 */
export function programRestingOffset(campaign, nation, override) {
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return NO_RESTING_OFFSET;
    if (nation === campaign.founding.nation) {
        const program = policyRestingOffset(legislableDomains(campaign).map((domain) => ({
            stance: overriddenStance(override, domain) ?? selectPolicyStance(campaign, domain),
            quality: executionQuality(campaign, domain),
        })));
        // The program is what the administration stands for; the laws it got through
        // are a second, separate claim on the same rates, so they add path by path
        // rather than replacing. Only the player's own country has enacted law on
        // the board to read.
        const laws = lawRestingOffset(campaign);
        return Object.fromEntries(RESTING_POINT_PATHS.map((path) => [path, program[path] + laws[path]]));
    }
    const held = selectGovernment(campaign, nation);
    return policyRestingOffset(foreignLines(runtime, override ? withOverride(held, override) : held));
}
// Each nation's standing program, read once per campaign snapshot: the drift
// phase reads every nation's for its own rates, and the United States' partner
// exposure reads its partners' again in the same week.
const programsBySnapshot = new WeakMap();
/** `programRestingOffset` with no override, memoized on the campaign object it was read from. */
export function restingProgram(campaign, nation) {
    let programs = programsBySnapshot.get(campaign);
    if (!programs) {
        programs = new Map();
        programsBySnapshot.set(campaign, programs);
    }
    const known = programs.get(nation);
    if (known)
        return known;
    const program = programRestingOffset(campaign, nation);
    programs.set(nation, program);
    return program;
}
// A preview asks where a program nobody has adopted would rest the rates,
// without adopting it: the override stands in for the held stance, domain by
// domain, and anything it leaves unnamed reads as held.
function overriddenStance(override, domain) {
    const id = override?.[domain];
    return id === undefined ? undefined : policyStance(id);
}
function withOverride(held, override) {
    return Object.fromEntries(POLICY_DOMAINS.map((domain) => [domain, override[domain] ?? held[domain]]));
}
// `incoming` names the party a government about to be seated will govern as,
// before the seat that records it has been written; absent reads the seat.
function reviewProgram(campaign, nation, norms, incoming) {
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return [];
    const held = selectGovernment(campaign, nation);
    const governing = incoming ? incoming.party : governingPartyOf(campaign, nation);
    const chosen = chooseGovernmentProgram(runtime, norms, purseContext(campaign, nation), governing);
    return POLICY_DOMAINS.filter((domain) => chosen[domain] !== held[domain]).map((domain) => ({
        nation,
        domain,
        stance: policyStance(chosen[domain]),
    }));
}
// A government changing its program is a public act — it is legislated,
// announced and reported. Nothing about it needs to be spied on, so it reaches
// the player at "public" like any other move between capitals.
function changeFeedItem(campaign, change, turn) {
    const name = selectNation(campaign, change.nation)?.base.identity.name ?? change.nation;
    const domain = POLICY_DOMAIN_SPECS[change.domain].name.toLowerCase();
    return {
        turn,
        kind: "governance",
        visibility: "public",
        headline: `${name} adopts ${change.stance.name.toLowerCase()} as its ${domain} program.`,
        actor: change.nation,
        facts: {
            instrument: `${POLICY_DOMAIN_SPECS[change.domain].name} program`,
            stake: change.stance.summary,
        },
    };
}
/**
 * The program a new government brings in, the week it is seated.
 *
 * A change of party does not wait for the season's review: the incoming
 * government reads its own platform against the country it has inherited and
 * adopts what that reading chooses, reported the way any change of program is.
 * Nothing is returned where the new government would keep what it found.
 */
export function programOfNewGovernment(campaign, nation, party) {
    const changes = reviewProgram(campaign, nation, worldNorms(campaign.nations), { party });
    if (changes.length === 0)
        return [];
    return [
        ...changes.map((change) => ({ kind: "policy", nation, domain: change.domain, stance: change.stance.id })),
        { kind: "feed", items: changes.map((change) => changeFeedItem(campaign, change, campaign.turn + 1)) },
    ];
}
/**
 * The world's week of governing, as one packet.
 *
 * One rather than fifty: a ledger that carried a line per country per week
 * would be unreadable, and the player's own record — the thing `actor` exists
 * to separate out — would be buried under it. What is worth naming individually
 * is a change of program, and that goes to the feed, where the player reads
 * about a world deciding things without them.
 */
export const governancePhase = (state) => {
    const turn = state.turn + 1;
    const effects = [];
    const changes = [];
    // One reading of the world per turn, shared by every government reviewing in
    // it: they are all judging themselves against the same board.
    const norms = worldNorms(state.nations);
    for (const nation of governedNations(state)) {
        if (reviewsProgramThisTurn(nation, state.turn)) {
            for (const change of reviewProgram(state, nation, norms)) {
                changes.push(change);
                effects.push({ kind: "policy", nation, domain: change.domain, stance: change.stance.id });
            }
        }
        // The program that runs this week is the one the review just settled: a
        // government that changed its mind on Monday does not spend the week
        // carrying out the thing it dropped.
        const program = { ...selectGovernment(state, nation) };
        for (const change of changes.filter((c) => c.nation === nation))
            program[change.domain] = change.stance.id;
        effects.push(...weekOfGoverning(state, nation, program));
    }
    if (effects.length === 0)
        return [];
    const feed = changes.map((change) => changeFeedItem(state, change, turn));
    if (feed.length > 0)
        effects.push({ kind: "feed", items: feed });
    const packet = {
        source: "simulate",
        actor: "world",
        turn,
        narration: { summary: summarize(state, changes) },
        effects,
    };
    return [packet];
};
function summarize(campaign, changes) {
    if (changes.length === 0) {
        return `${governedNations(campaign).length} governments spend another week on the programs they already had.`;
    }
    const named = [...new Set(changes.map((change) => selectNation(campaign, change.nation)?.base.identity.name ?? change.nation))];
    const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
    return `${list} ${named.length === 1 ? "changes course" : "change course"} at home.`;
}
