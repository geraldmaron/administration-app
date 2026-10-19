import { MAX_TURN_POLARIZE, STRAIN_DECAY } from "@admin/engine";
import { financialCost } from "./scenario-cost.js";
// Bands to effects. The one place a declared impact becomes a number.
//
// Versioned on its own and deliberately small: the whole balance of the game's
// human and financial costing is the tables below, which is what makes a
// rebalance a patch rather than a rewrite of the corpus, and what lets a
// country be added without editing a single scenario.
//
// Nothing here reads a scenario. It takes an impact and the nation that bore
// it, and returns effects — so the same declaration prices correctly against a
// country of four million and one of four hundred million, which is the reason
// the bands exist rather than counts.
/**
 * Bumped whenever any table below changes. A pack records the version it was
 * balanced against, so an old pack meeting a rebalanced model is a fact the
 * loader can state rather than a silent re-costing nobody notices.
 */
export const IMPACT_MODEL_VERSION = 5;
/**
 * What each band means as a number of people, matching the words the prose
 * uses.
 *
 * These are absolute counts, not shares, and the distinction is load-bearing.
 * A scenario's beats say "nineteen dead" and go on saying it whichever nation
 * the board casts it onto — the writing is fixed, so the toll is. What varies
 * is what that toll *means*, and it varies by the size of the country it
 * happened to: nineteen dead is a national tragedy in a country of four million
 * and a local story in one of three hundred million.
 *
 * So the band is authored against the prose and normalized against the
 * population at resolve time. An earlier version of this table had it the other
 * way around — bands as population shares — which read plausibly and meant
 * "hundreds" denoted three hundred thousand people in a country the size of the
 * United States. The words have to mean what they say.
 *
 * The steps are order-of-magnitude because political response to a death toll
 * is: one to ten is a story, ten to a hundred a crisis, a hundred to a thousand
 * a different presidency.
 */
const TOLL_DEATHS = {
    none: 0,
    isolated: 3,
    dozens: 40,
    hundreds: 400,
    thousands: 4_000,
    mass: 50_000,
};
/**
 * The rate at which a public has spent half of everything it can feel about a
 * death toll: six per million, which is about two thousand Americans.
 *
 * A half-saturation point rather than a decay length, because the curve below
 * is a ratio rather than an exponential. Read as a sentence: a toll at this
 * rate has stopped being a news story and become the thing the administration
 * is about, and everything past it is the same story getting worse rather than
 * a new one.
 */
const TOLL_HALF_WEIGHT_PER_MILLION = 6;
/**
 * How hard a public feels a toll relative to its size — the square root.
 *
 * Below one on purpose, and this is the whole mechanism. A country does not
 * feel ten thousand deaths ten times as hard as a thousand; it feels them
 * about three times as hard, which is the compression every measured response
 * to a casualty figure shows.
 */
const TOLL_COMPRESSION = 0.5;
/**
 * How far a toll travels into the public's judgment, before agency.
 *
 * `perMillion ** 0.5` over `perMillion ** 0.5 + half ** 0.5`: bounded below one
 * for any toll at any population, so a band applied to a very small country
 * saturates instead of exploding, and compressive rather than linear, so one
 * catastrophic scenario cannot end a campaign on its own.
 *
 * The shape is the recalibration. The previous curve was
 * `1 - exp(-perMillion / 12)`, which is linear in the rate everywhere the rate
 * is small — and at the population the game actually ships with, every band an
 * author reaches for is small. Three dead in a country of three hundred and
 * thirty-five million is 0.009 per million, and that curve priced it at eight
 * thousandths of an approval point: the prose said three people were killed and
 * the model said nothing had happened. It was written against a country of four
 * million, where the same three deaths are 0.75 per million, and it was correct
 * there. Compressing on the rate rather than tracking it linearly is what makes
 * one table honest for both.
 */
function tollWeight(perMillion) {
    if (perMillion <= 0)
        return 0;
    const felt = perMillion ** TOLL_COMPRESSION;
    return felt / (felt + TOLL_HALF_WEIGHT_PER_MILLION ** TOLL_COMPRESSION);
}
/** The band's toll as a rate the weighting curve can read. */
function perMillion(deaths, population) {
    return population > 0 ? (deaths * 1_000_000) / population : deaths;
}
/**
 * The multiplier agency puts on every reputational consequence of a toll.
 *
 * A public forgives a government for what happened to it and does not forgive
 * it for what it did. "acted-upon" is negative in the opposite direction on
 * purpose: a country attacked from outside closes ranks, and an administration
 * that is visibly not at fault gains security standing from the same event that
 * would have cost it everything had it been our doing.
 */
const AGENCY_MULTIPLIER = {
    "our-doing": 1.6,
    "on-our-watch": 1,
    inherited: 0.4,
    "acted-upon": -0.5,
};
/**
 * Who a toll is borne by, as a redistribution of its reputational weight.
 *
 * The same deaths reach different judgments depending on whom they happened to:
 * a region carries unity as well as services, the services themselves carry
 * competence hardest because that is what sending people badly means, and harm
 * abroad barely touches domestic security at all while costing standing.
 */
const BORNE_BY_ROUTING = {
    diffuse: { security: 0.6, competence: 0.4 },
    "one-region": { security: 0.4, services: 0.4, unity: 0.2 },
    "one-group": { security: 0.3, unity: 0.5, integrity: 0.2 },
    "the-services": { competence: 0.6, security: 0.2, integrity: 0.2 },
    abroad: { competence: 0.4, integrity: 0.6 },
};
/**
 * What each institutional cost does. Small, mostly reputational, and none of
 * them touches a derived quantity — these are the costs that shape what the
 * government can do next rather than what it is worth now.
 */
// Keyed on the union rather than on `string`, so the next cost added to
// `InstitutionalCost` cannot ship priced at nothing: a missing key was read
// through `?? {}` and cost exactly zero, silently, which is how
// `conduct-in-question` arrived declarable and free.
const INSTITUTIONAL_EFFECTS = {
    "forces-committed": { security: -0.02 },
    "intelligence-source-burned": { competence: -0.02 },
    "legal-authority-spent": { integrity: -0.03 },
    "alliance-credit-spent": {},
    "alliance-credit-earned": {},
    "legislative-capital-spent": {},
    "civil-service-strained": { services: -0.04, competence: -0.02 },
    "emergency-powers-invoked": { integrity: -0.05, unity: -0.04 },
    // The heaviest of the nine on integrity alone, and on nothing else. Reaching
    // for emergency powers costs unity too because the country argues about
    // whether it was warranted; a hearing about the government's own conduct is
    // not an argument the country is split over, it is a question about whether
    // this administration can be believed. It is also the one cost the press can
    // carry as a story of its own, so the weekly charge stays smaller than the
    // scandal channel that follows from it.
    "conduct-in-question": { integrity: -0.06 },
};
/**
 * How much a decision that split the country adds to polarization.
 *
 * Small on purpose and one-directional. Polarization is the slowest-moving
 * quantity in the model and the only one a government cannot buy back, so a
 * single divisive week should be a nudge and a term of them should be a
 * different country.
 *
 * Pinned to the engine's `MAX_TURN_POLARIZE` rather than a number of its own.
 * A scenario decision resolves through `apply()` before `advanceTurn` runs, so
 * it lands the instant it applies rather than passing through the turn-loop
 * ceiling live — that ceiling only catches it when the week closes, by
 * reconstructing what the week opened at from the ledger. This is the
 * highest-volume polarization writer in the game, one for every scenario
 * flagged divisive, and a single decision reading as more divisive than the
 * worst uncapped turn of world drift would be is not a number this model can
 * defend. Importing the constant rather than copying it means the two cannot
 * quietly drift apart again the way they already had once.
 */
export const DIVISIVE_POLARIZATION = MAX_TURN_POLARIZE;
/**
 * How hard a named human toll lands as cohort strain, before agency and split.
 *
 * Kept beside the opinion scale (0.35 in opinionDeltas) so a rebalance that
 * moves one half of a toll cannot silently leave the other half at an old
 * magnitude. The opinion half still costs the country what it costs the
 * country; this half only records who bore it and cannot add approval mass.
 */
export const COHORT_TOLL_SCALE = 0.35;
/**
 * Strain weight when human.cohorts names who an act lands on without a death
 * toll (e.g. a shut catchment, a plant holiday). Split across the named list
 * the same way a toll is. Direct naming, not a second opinion channel.
 */
export const COHORT_NAMED_STRAIN = 0.5;
function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
/**
 * Compile human.cohorts into one CohortEffect per named cohort.
 *
 * Opinion routing is unchanged — call resolveImpact for that. This is the
 * record half: valence always −1 (who bore harm), cause and reason supplied by
 * the cast (scenario class, or a domestic signature slug when one is present).
 * Without cohorts, returns nothing so one-group scenarios keep today's
 * behavior until they are backfilled.
 */
export function cohortEffects(impact, nation, ctx) {
    const cohorts = impact.human?.cohorts;
    if (!cohorts || cohorts.length === 0)
        return [];
    const lives = impact.human?.lives;
    const agencyMult = AGENCY_MULTIPLIER[impact.agency ?? "on-our-watch"];
    let mass;
    if (lives && lives !== "none") {
        const severity = tollWeight(perMillion(TOLL_DEATHS[lives], nation.stats.demography.population));
        mass = severity * Math.abs(agencyMult) * COHORT_TOLL_SCALE;
    }
    else {
        // Named without a body count: still record who the act fell on.
        mass = COHORT_NAMED_STRAIN * Math.abs(agencyMult);
    }
    const perCohort = clamp01(mass / cohorts.length);
    if (perCohort <= 0)
        return [];
    return cohorts.map((cohort) => ({
        kind: "cohort",
        cohort,
        addStrain: {
            createdTurn: ctx.turn,
            cause: ctx.cause,
            weight: perCohort,
            valence: -1,
            decayRate: STRAIN_DECAY[-1],
            reason: ctx.reason,
        },
        reason: ctx.reason,
    }));
}
/** Signed net strain weight (−1..1), optionally filtered by cause slug. */
export function cohortStrainReading(strains, cause) {
    const matched = cause === undefined ? strains : strains.filter((strain) => strain.cause === cause);
    const net = matched.reduce((sum, strain) => sum + strain.weight * strain.valence, 0);
    return Math.max(-1, Math.min(1, net));
}
function opinionDeltas(impact, nation) {
    const deltas = {};
    const add = (driver, amount) => {
        if (amount === 0)
            return;
        deltas[driver] = (deltas[driver] ?? 0) + amount;
    };
    const lives = impact.human?.lives;
    if (lives && lives !== "none") {
        // The band names a count; the country decides what that count is worth.
        const severity = tollWeight(perMillion(TOLL_DEATHS[lives], nation.stats.demography.population));
        const agency = AGENCY_MULTIPLIER[impact.agency ?? "on-our-watch"];
        const routing = BORNE_BY_ROUTING[impact.human?.borneBy ?? "diffuse"];
        for (const [driver, share] of Object.entries(routing)) {
            add(driver, -severity * share * agency * 0.35);
        }
    }
    // Displacement is a services judgment above all: a public reads a government
    // by whether the people who lost their homes were housed.
    const displaced = impact.human?.displaced;
    if (displaced && displaced !== "none") {
        const scale = displaced === "local" ? 0.02 : displaced === "regional" ? 0.05 : 0.1;
        add("services", -scale);
        add("competence", -scale * 0.5);
    }
    for (const cost of impact.institutional ?? []) {
        for (const [driver, amount] of Object.entries(INSTITUTIONAL_EFFECTS[cost])) {
            add(driver, amount);
        }
    }
    // Money the public can see being spent on them reads as delivery, and money
    // it cannot reads as nothing. Only the two authorized-under-a-clock bands
    // carry a services reading, because those are the ones that arrive as relief.
    const scale = impact.financial?.scale;
    if (scale === "emergency" || scale === "supplemental") {
        add("services", 0.03);
    }
    if (scale === "structural") {
        add("prosperity", -0.02);
    }
    return deltas;
}
/**
 * What committing forces costs the force.
 *
 * Small and real. A deployment is not free and its price is readiness — the
 * one metric that means "could you do this again next week" — so a government
 * that commits forces three weeks running finds it cannot back the fourth
 * threat. Before this, `forces-committed` moved a public judgment by two
 * hundredths and touched the actual military not at all, which made shipping
 * troops a reputational event rather than a material one.
 */
export const FORCES_COMMITTED_READINESS = -0.05;
/**
 * Who the dead were counted among.
 *
 * A toll borne abroad reduces the population of the nation it was borne in, and
 * a toll borne at home reduces the player's own. Getting this wrong is not a
 * rounding error — it is the difference between a strike that killed foreign
 * civilians and one that killed your own.
 */
function bearerFor(impact, home, abroad) {
    if (impact.human?.borneBy === "abroad")
        return abroad;
    return home;
}
/**
 * The effects a declared impact resolves to, against the nation that bore it.
 *
 * Opinion, treasury, the population that is actually smaller afterwards, and
 * the readiness a deployment spends. It does not touch stability or standing —
 * those are consequences of the *act*, priced where the act is, and an impact
 * that moved them too would bill the same decision twice.
 *
 * `abroad` is the nation a scenario was cast onto, and is only read when the
 * toll was declared as borne there. Omitted, a toll borne abroad moves no
 * population at all rather than silently killing the player's own citizens.
 */
export function resolveImpact(impact, nation, abroad, localPopulation, homeState, pricing = {}) {
    if (impact.financial?.scope === "city" && (!localPopulation || !Number.isFinite(localPopulation) || localPopulation <= 0))
        throw new Error("City-scoped impact requires a positive local population");
    const effects = [];
    const deltas = opinionDeltas(impact, nation);
    const divisive = impact.divisive ? DIVISIVE_POLARIZATION : undefined;
    if (Object.keys(deltas).length > 0 || divisive !== undefined) {
        effects.push({ kind: "opinion", deltas, ...(divisive !== undefined ? { polarize: divisive } : {}) });
    }
    // A scenario's financial scale is money the country ends up owing — a
    // disaster supplemental, a relief program, a bailout — which Congress votes
    // and the general fund borrows. It lands on the national debt, not on the
    // administration's own budget authority: a supplemental-sized impact is a
    // sixth of the authority a presidency opens holding, and an emergency-sized
    // one exceeds it, so charging the President's account would have refused
    // every executive order for the rest of the term after two bad weeks. The
    // reply's own `cost.treasury` is the part the administration obligates, and
    // it is priced where the reply is.
    //
    // It is booked as the President's own borrowing, an amount added to the
    // stock when the reply is answered, so its interest comes out of the
    // President's authority the way a program's does. A level written when the
    // scenario was cast would have rewound the debt to that week for a reply
    // answered later.
    // What it costs is read from what the federal government has spent on weeks
    // of the same kind and size (`scenario-cost.ts`), drawn around that from the
    // campaign's seed.
    const amount = financialCost(impact, nation, pricing);
    if (amount !== undefined)
        effects.push({ kind: "choiceBorrowing", amount });
    // The people are actually gone. A death toll that moved only a public's
    // opinion of the government was a game where the dead were a reputational
    // instrument and nothing else — the population went on growing, the labor
    // force was unchanged, and a campaign that killed a hundred thousand of its
    // own citizens ended with the same country it started with.
    //
    // The packet can sit on a case for weeks. The toll must be relative to the
    // population when the reply lands, so the engine's live writer charges its
    // nation and (for the player) states together at application time.
    const lives = impact.human?.lives;
    const bearer = bearerFor(impact, nation, abroad);
    if (lives && lives !== "none" && bearer && impact.human?.accounting !== "already-reported") {
        const dead = TOLL_DEATHS[lives];
        effects.push({
            kind: "populationToll",
            nation: bearer.id,
            deaths: dead,
            ...(bearer.id === nation.id && homeState ? { place: homeState } : {}),
        });
    }
    if ((impact.institutional ?? []).includes("forces-committed")) {
        effects.push({ kind: "metric", deltas: { militaryReadiness: FORCES_COMMITTED_READINESS } });
    }
    return effects;
}
/**
 * The band a written toll belongs in, for the audit that checks a scenario's
 * prose against its declaration. Exported so the gate and the model cannot
 * drift: the rule that reads "nineteen dead" out of a beat and the table that
 * prices it are the same numbers.
 *
 * Population-free, unlike the pricing above, and deliberately: the audit is
 * checking the author's arithmetic against their own sentence, which is a claim
 * about the writing rather than about any nation the board may cast it onto.
 */
export function tollBandFor(deaths) {
    if (deaths <= 0)
        return "none";
    const bands = Object.entries(TOLL_DEATHS)
        .filter(([band]) => band !== "none")
        .sort((a, b) => a[1] - b[1]);
    let chosen = bands[0][0];
    for (let i = 1; i < bands.length; i += 1) {
        // The boundary between two bands is their geometric mean, not their
        // midpoint. The scale is order-of-magnitude, so the arithmetic midpoint
        // sits far too high: between 3 and 40 it would be 21, which files
        // nineteen dead under "isolated" — a word no writer would have used for
        // it. The geometric boundary is 11, and nineteen reads as dozens.
        const boundary = Math.sqrt(bands[i - 1][1] * bands[i][1]);
        if (deaths >= boundary)
            chosen = bands[i][0];
    }
    return chosen;
}
