import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { selectCabinetSeats, selectConditionsFor, selectNation } from "./state.js";
import { treasuryHealth } from "./metrics.js";
import { selectDeliveryShortfall } from "./institutions.js";
import { selectLiveScandals, SCANDAL_INTEGRITY_WEIGHT } from "./press-scandal.js";
import { crimeBaseline, normalPriceLevel, weeksInOffice } from "./macro-baseline.js";
import { daysBetween } from "./clock.js";
import { weeksFor } from "./pace.js";
import { isStandingCondition } from "./condition-kinds.js";
import { warOpinionTerms, warSecurityContribution, warSecurityDetail } from "./opinion-war.js";
import { openingExpectations } from "./opening-position.js";
import { polarizationDrift } from "./polarization.js";
// Why each of the six judgments is heading where it is heading.
//
// `opinionTargets` is where the board becomes an opinion: it reads stability,
// standing, readiness, the treasury, the wars, the live conditions and their
// worst severity, the scandal board, the delivery shortfall, the empty chairs
// and the papers, and folds all of it into six numbers. Every one of those is a
// sentence a president is owed, and none of them reached a surface — the player
// watched Security fall from "strong" to zero over a term and was given a
// definition and a share of the week's approval, and never a cause.
//
// So the terms are the model now, and the six targets are their sum. That is
// the whole reason this is a module rather than a second reading kept beside
// the first: a decomposition that recomputed what a target "would" be made of
// could disagree with the target actually charged, and the player would be
// shown an accounting that does not add up to their own rating.
//
// Split out of opinion.ts for the size budget, and one-way: nothing here reads
// back into that file.
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * What a hollowed-out executive costs the two judgments it belongs to.
 *
 * Written as a drag from zero rather than as a term in the average, so a
 * government running as it was inherited reads exactly what it read before
 * delivery reached the public at all: this can only mark an administration
 * down, and only for the part of the government it has actually let go.
 */
export const SERVICES_DELIVERY_DRAG = 0.35;
export const COMPETENCE_DELIVERY_DRAG = 0.45;
/**
 * How far the corps's standing can carry the two judgments coverage is made of,
 * and the most it may ever carry them.
 *
 * The press corps had a standing that moved off the administration's real record
 * and reached the headline through nothing, so a government covered for a full term as a scandal polled
 * exactly like one covered as a success — and removal, which reads approval,
 * could not tell the two apart.
 *
 * This is the edge, and its shape is the point. It is one term into two targets,
 * never a write to a metric: coverage moves what the country believes about this
 * government's honesty and about whether it can do the job, at the speed a
 * public revises an impression, and it cannot touch the money, the army or the
 * order at home. The single path into `player.opinion` is still `apply()`, and
 * the single writer of `metrics.approval` is still `recomputeApproval`.
 *
 * Capped because a press corps is not an electorate. At the cap — a corps as
 * hostile as the model allows, held there for long enough that both judgments
 * have drifted the whole way — the two together are worth about four points of
 * raw approval, nearer three once polarization has compressed it. That is a
 * term of hostile coverage costing what a term of hostile coverage costs: real
 * enough to govern around, smaller than a single live scandal (a quarter of
 * `integrity` on its own), and far short of anything that can end a presidency
 * by itself.
 */
export const PRESS_COVERAGE_WEIGHT = 0.5;
export const PRESS_COVERAGE_CAP = 0.15;
/**
 * What crime costs the sense of being safe, per point of it — and only the part
 * this administration is answerable for.
 *
 * Measured against where crime was heading with nobody governing
 * (`crimeBaseline`), not against zero and not against the authored figure. A
 * country that has always carried this much crime is not losing its sense of
 * safety to it every week, and a rise that the economy drove is already charged
 * once, to prosperity, through the unemployment and cost-of-living terms the
 * baseline itself reads. So what is left here is the excess: the crime this
 * government has on its own record.
 *
 * Under the insurgency term's weight, because armed opposition to the state and
 * a worse year for burglary are not the same order of fact.
 */
export const CRIME_SECURITY_WEIGHT = 0.3;
/**
 * Security's resting reading and how far order's departure from its rest moves
 * it. Security used to start at the order reading itself, so a country whose
 * order sat at its ordinary level billed it in full every week and again in
 * competence; order now bills only its change from where the country's
 * institutions hold it, once, here. Design judgment, labeled.
 */
export const SECURITY_BASE = 0.6;
export const SECURITY_ORDER_WEIGHT = 0.4;
/**
 * Competence's base. It carries what order at its usual level used to give it
 * (0.3 of a resting order near 0.65), because order now bills its change from
 * rest once, in security, rather than its level in two judgments.
 */
export const COMPETENCE_BASE = 0.35;
/**
 * What an empty cabinet costs competence, as a share of the seats: a third of
 * the cabinet empty costs a quarter. Read as a share because the count of
 * seats differs by charter, and a count charged three empty seats as much on a
 * fifteen-seat cabinet as on a five-seat one. Design judgment, labeled.
 */
export const VACANCY_WEIGHT = 0.75;
/**
 * Unity reads what this administration did to the country's division, not the
 * era's level of it, which the blocs already carry. At the stock's ceiling
 * unity falls to about a fifth; at its floor it reaches about 0.84. Design
 * judgment, labeled.
 */
export const UNITY_BASE = 0.6;
export const UNITY_DIVISION_WEIGHT = 1.6;
/**
 * What a settled promise is worth to the country's reading of this
 * administration's honesty, and for how long.
 *
 * The defect this closes: a broken promise reached approval exactly once, as a
 * single week's nudge to the mood, and then the weekly revision walked it
 * straight back — because nothing in the honesty judgment's own target had
 * heard about it. The only lasting record was a cohort strain, and cohort
 * strain is centered by construction and so cannot move the national figure at
 * all. A first-hundred-days promise broken in public therefore cost about a
 * tenth of the point the stakes are written for, and the size could not be
 * fixed on the stakes: their strain weight is already at its documented cap.
 *
 * So the record is a term now, where it belongs. A promise the country was
 * given a date for and did not get is one of the largest things a public's
 * honesty judgment is actually made of, and a term is the only form in which
 * the weekly revision carries it rather than erases it.
 *
 * A broken first-hundred-days promise is about half a live scandal
 * (`SCANDAL_INTEGRITY_WEIGHT`), and the same size as the week's own shock, so
 * the news and the record agree about one broken promise. Kept promises credit
 * far less than broken ones cost: a president who does what they said was
 * supposed to.
 */
export const PROMISE_INTEGRITY = {
    firstHundredDays: { broken: -0.12, kept: 0.04 },
    term: { broken: -0.05, kept: 0.015 },
};
/**
 * How long the country holds a settled promise against, or to the credit of,
 * the administration that made it. A year: long enough that a promise broken in
 * the first hundred days is still being asked about at the anniversary, short
 * enough that it is not the whole term.
 */
export const PROMISE_MEMORY_WEEKS = 52;
/** What each term is called, in the words the surface prints above the sentence. */
export const OPINION_CAUSE_LABELS = {
    base: "Where it sits when nothing is happening",
    stability: "Order at home",
    war: "The war",
    insurgency: "Armed opposition",
    unemployment: "People out of work",
    inflation: "Prices",
    growth: "The economy's direction",
    prices: "What things cost now",
    conditions: "What the country is carrying",
    money: "Money to pay for public services",
    delivery: "Agencies with nobody running them",
    scandal: "A story the administration is answering",
    coverage: "How the papers are covering it",
    polarization: "How divided the country is",
    readiness: "Whether the forces could answer",
    standing: "How other governments treat this one",
    vacancies: "Empty seats at the table",
    crime: "Crime against where it was heading",
    promises: "The promises this administration is held to",
    bounded: "The judgment is already at the end of its scale",
};
const percent = (value) => `${Math.round(value * 100)}%`;
const percentOne = (value) => `${Math.round(value * 1000) / 10}%`;
/**
 * What prices that have already risen cost the public's sense of being better
 * off, per unit of the price level above where the term started them.
 *
 * The inflation term reads how fast prices are rising this year; this one reads
 * where they have got to. A public that lived through a price surge does not
 * feel better the week inflation cools, because the groceries still cost what
 * they cost. One for one against the price level: a surge that leaves prices
 * four percent higher than the term's own inflation would have is worth four
 * points off this judgment until wages or a new term reset the memory.
 */
export const PRICE_LEVEL_WEIGHT = 1;
/**
 * How far prices stand above where the term-start inflation would have put
 * them, as a share, and never below zero.
 *
 * Measured against the inflation the country was already running when the
 * administration took office, compounded over the weeks since, so an economy
 * rising at its ordinary pace leaves no mark and only the excess does. The term
 * start is the authored economy the founding opened on: nothing in the save
 * keeps a second one yet.
 */
export function priceLevelScar(campaign) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return 0;
    return Math.max(0, runtime.stats.economy.costOfLiving / normalPriceLevel(runtime, weeksInOffice(campaign)) - 1);
}
/** What a point of growth is worth to the prosperity judgment, the same weight in a boom and in a slump. */
const GROWTH_WEIGHT = 2;
/** Growth past this either way reads as the same boom or the same collapse; the strain bound handles the rest. */
const GROWTH_READING_LIMIT = 0.1;
const boundedGrowth = (growth) => Math.max(-GROWTH_READING_LIMIT, Math.min(GROWTH_READING_LIMIT, growth));
/**
 * What the economy is doing to the public's sense of being better off.
 *
 * Read from the economy as it is this week, not the one the dataset authored:
 * the elections already judged the live figures, and a headline that judged a
 * frozen economy while the ballot judged the real one was two countries.
 *
 * The strain the four terms add up to is bounded before it reaches the
 * judgment, and the bound is real rather than cosmetic in both directions: a
 * country with runaway prices cannot be more than fully strained, and a
 * booming one cannot bank the surplus as prosperity it has not been given.
 * The bound is stated as its own line for the reason `boundedCause` gives.
 */
function economyTerms(campaign) {
    const economy = selectNation(campaign, campaign.founding.nation)?.stats.economy;
    const base = {
        key: "base",
        contribution: 0.75,
        detail: "A country with no economic strain believes it is doing well.",
    };
    if (!economy) {
        // The reading `opinionTargets` falls back to when there is no nation to
        // read: a middling strain rather than a blank one.
        return [{ ...base, contribution: 0.35, detail: "Nothing about the economy is currently readable." }];
    }
    const terms = [
        base,
        {
            key: "unemployment",
            contribution: -economy.unemployment * 2,
            detail: `${percent(economy.unemployment)} of the workforce is out of a job.`,
        },
        {
            key: "inflation",
            contribution: -Math.max(0, economy.inflation) * 1.5,
            detail: economy.inflation > 0
                ? `Prices are rising ${percent(economy.inflation)} a year.`
                : "Prices are not rising, which costs this judgment nothing.",
        },
        {
            key: "growth",
            contribution: boundedGrowth(economy.growth) * GROWTH_WEIGHT,
            detail: economy.growth > 0
                ? `The economy is growing ${percent(economy.growth)} a year, which offsets some of the rest.`
                : economy.growth < 0
                    ? `The economy is shrinking ${percent(-economy.growth)} a year, which adds to the rest.`
                    : "The economy is not growing, so there is nothing offsetting the rest.",
        },
        pricesCause(priceLevelScar(campaign)),
    ];
    const raw = -terms.slice(1).reduce((sum, term) => sum + term.contribution, 0);
    const strain = clamp01(raw);
    if (strain === raw)
        return terms;
    return [
        ...terms,
        {
            key: "bounded",
            contribution: raw - strain,
            detail: raw > 1
                ? "The strain is already as bad as this judgment can read it; anything worse counts for nothing more."
                : "A country cannot be better than unstrained, so the surplus counts for nothing.",
        },
    ];
}
function pricesCause(scar) {
    return {
        key: "prices",
        contribution: -scar * PRICE_LEVEL_WEIGHT,
        detail: scar > 0.0005
            ? `Prices stand ${percentOne(scar)} above where the inflation this term began with would have put them.`
            : "Prices have risen no faster than they were rising when the term began.",
    };
}
function securityTerms(campaign) {
    const nationId = campaign.founding.nation;
    // Fighting beside an ally is being at war; the homeland powers read homelandInvaded instead.
    const war = warOpinionTerms(campaign);
    const runtime = selectNation(campaign, nationId);
    const insurgency = runtime?.stats.security.insurgencyPressure ?? 0;
    const stability = campaign.player.metrics.stability;
    const rest = runtime ? openingExpectations(runtime.base).find((entry) => entry.metric === "stability").opening : stability;
    return [
        { key: "base", contribution: SECURITY_BASE, detail: "A country at its ordinary level of order feels about as safe as it usually does." },
        {
            key: "stability",
            contribution: (stability - rest) * SECURITY_ORDER_WEIGHT,
            detail: Math.abs(stability - rest) < 0.005
                ? "Order at home is where the country's institutions usually hold it."
                : `Order at home reads ${percent(stability)}, against the ${percent(rest)} its institutions usually hold.`,
        },
        { key: "war", contribution: warSecurityContribution(war), detail: warSecurityDetail(war) },
        {
            key: "insurgency",
            contribution: -insurgency * 0.4,
            detail: insurgency > 0
                ? `Armed opposition inside the country reads ${percent(insurgency)}.`
                : "Nobody is under arms against the government at home.",
        },
        crimeCause(campaign),
    ];
}
/**
 * Crime, against where crime was heading on its own.
 *
 * Signed both ways: a government that has brought crime below the path it was
 * on is owed the credit, on the same line it would be charged for the reverse.
 */
function crimeCause(campaign) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return { key: "crime", contribution: 0, detail: "Crime is not currently readable." };
    const heading = crimeBaseline(runtime, normalPriceLevel(runtime, weeksInOffice(campaign)));
    const excess = runtime.stats.security.crimeIndex - heading;
    return {
        key: "crime",
        contribution: -excess * CRIME_SECURITY_WEIGHT,
        detail: Math.abs(excess) < 0.005
            ? "Crime is where the country was already heading, which costs this judgment nothing."
            : excess > 0
                ? `Crime reads ${percentOne(excess)} above where the country was heading without this administration.`
                : `Crime reads ${percentOne(-excess)} below where the country was heading without this administration.`,
    };
}
/**
 * The live conditions at home that are emergencies rather than an economy: the
 * disasters, the epidemic and unrest.
 *
 * The economic standing kinds (a recession, a price or jobs shock, a debt
 * crisis, an energy shortage, a housing crunch) are judged on prosperity or
 * competence through their own bills and through the live economy itself, so
 * counting them here as well charged one crisis to two judgments and printed
 * "a disaster is live at home" beside a price shock.
 */
export function reliefConditions(campaign) {
    return selectConditionsFor(campaign, campaign.founding.nation).filter((condition) => condition.kind === "unrest" || !isStandingCondition(condition.kind));
}
function servicesTerms(campaign) {
    const conditions = reliefConditions(campaign);
    const worst = conditions.reduce((high, condition) => Math.max(high, condition.severity), 0);
    const carrying = clamp01(0.7 - worst * 0.6);
    const money = 0.4 + treasuryHealth(campaign.player.metrics.treasury) * 0.6;
    const shortfall = selectDeliveryShortfall(campaign);
    return [
        { key: "base", contribution: 0.7, detail: "A state that is coping shows up for about seven people in ten." },
        {
            key: "conditions",
            contribution: carrying - 0.7,
            detail: conditions.length === 0
                ? "Nothing is currently on the country that the state has to answer."
                : `${conditions.length} live ${conditions.length === 1 ? "emergency is" : "emergencies are"} on the country, the worst of them at ${percent(worst)}.`,
        },
        {
            key: "money",
            contribution: carrying * money - carrying,
            detail: `The treasury holds ${percent(treasuryHealth(campaign.player.metrics.treasury))} of what a government this size needs, which is what the response can be paid for out of.`,
        },
        {
            key: "delivery",
            contribution: -shortfall * SERVICES_DELIVERY_DRAG,
            detail: shortfall > 0
                ? `${percent(shortfall)} of the executive branch is running without the people who are supposed to run it.`
                : "The agencies that deliver are staffed.",
        },
    ];
}
function coverageTerm(campaign) {
    const signed = (campaign.press.standing - 0.5) * PRESS_COVERAGE_WEIGHT;
    return Math.max(-PRESS_COVERAGE_CAP, Math.min(PRESS_COVERAGE_CAP, signed));
}
function coverageCause(campaign) {
    const coverage = coverageTerm(campaign);
    return {
        key: "coverage",
        contribution: coverage,
        detail: coverage < 0
            ? `The press corps stands at ${percent(campaign.press.standing)} with this administration, and hostile coverage is what a public hears.`
            : `The press corps stands at ${percent(campaign.press.standing)} with this administration, which is worth something on its own.`,
    };
}
function integrityTerms(campaign) {
    const live = selectLiveScandals(campaign);
    return [
        { key: "base", contribution: 0.75, detail: "A government nobody is asking about is believed by three people in four." },
        ...live.map((scandal) => ({
            key: "scandal",
            contribution: -scandal.intensity * SCANDAL_INTEGRITY_WEIGHT,
            detail: `A story about ${scandal.subject} is ${scandal.stage === "fading" ? "still being asked about" : "running"}.`,
        })),
        ...(live.length === 0
            ? [{ key: "scandal", contribution: 0, detail: "No story is running about this administration's honesty." }]
            : []),
        promisesCause(campaign),
        coverageCause(campaign),
    ];
}
/** How much of a settled promise the country still holds against this administration: all of it the week it settles, none of it a year later. */
function promiseMemory(campaign, pledge) {
    if (!pledge.settledDate)
        return 0;
    // Whole weeks, through the engine's one days-to-weeks converter: a promise
    // settled six days ago is nought weeks old, not four fifths of one, and the
    // fade is a weekly reading rather than a daily slope.
    const weeks = weeksFor(daysBetween(pledge.settledDate, campaign.calendar), "floor");
    return clamp01(1 - Math.max(0, weeks) / PROMISE_MEMORY_WEEKS);
}
/**
 * The promises this administration has been held to, kept and broken, as one
 * standing term.
 *
 * One line rather than one per pledge: what a public carries is a reading of
 * whether this government does what it said, not a docket. The sentence names
 * the count, which is what the reading is.
 */
function promisesCause(campaign) {
    const settled = (campaign.pledges ?? []).filter((pledge) => pledge.status !== "open");
    let contribution = 0;
    let broken = 0;
    let kept = 0;
    for (const pledge of settled) {
        const memory = promiseMemory(campaign, pledge);
        if (memory === 0)
            continue;
        const stakes = PROMISE_INTEGRITY[pledge.firstHundredDays ? "firstHundredDays" : "term"];
        contribution += memory * (pledge.status === "broken" ? stakes.broken : stakes.kept);
        if (pledge.status === "broken")
            broken += 1;
        else
            kept += 1;
    }
    return {
        key: "promises",
        contribution,
        detail: broken === 0 && kept === 0
            ? "No promise of this administration's has fallen due yet."
            : broken === 0
                ? `${countWord(kept)} it ran on ${kept === 1 ? "has" : "have"} been kept.`
                : `${countWord(broken)} it ran on ${broken === 1 ? "has" : "have"} been broken.`,
    };
}
function countWord(count) {
    return count === 1 ? "One promise" : `${count} promises`;
}
function competenceTerms(campaign) {
    const metrics = campaign.player.metrics;
    const seats = selectCabinetSeats(campaign);
    const vacancies = seats.filter((role) => campaign.player.cabinet[role] === undefined).length;
    const vacantShare = seats.length > 0 ? vacancies / seats.length : 0;
    const shortfall = selectDeliveryShortfall(campaign);
    return [
        { key: "base", contribution: COMPETENCE_BASE, detail: "A government that does nothing else right still gets credit for existing." },
        {
            key: "readiness",
            contribution: metrics.militaryReadiness * 0.3,
            detail: `The forces read ${percent(metrics.militaryReadiness)} ready to answer if they are called.`,
        },
        {
            key: "standing",
            contribution: metrics.standing * 0.25,
            detail: `Other governments deal with this one at ${percent(metrics.standing)} — the verdict abroad on whether it is any good.`,
        },
        {
            key: "vacancies",
            contribution: -vacantShare * VACANCY_WEIGHT,
            detail: vacancies > 0
                ? `${vacancies} cabinet ${vacancies === 1 ? "seat is" : "seats are"} empty.`
                : "Every cabinet seat is filled.",
        },
        {
            key: "delivery",
            contribution: -shortfall * COMPETENCE_DELIVERY_DRAG,
            detail: shortfall > 0
                ? `${percent(shortfall)} of the executive branch is running without the people who are supposed to run it.`
                : "The agencies that execute are staffed.",
        },
        coverageCause(campaign),
    ];
}
const DRIVER_TERMS = {
    security: securityTerms,
    prosperity: economyTerms,
    services: servicesTerms,
    integrity: integrityTerms,
    unity: (campaign) => {
        const drift = polarizationDrift(campaign.player.opinion.polarization);
        return [
            { key: "base", contribution: UNITY_BASE, detail: "A country as divided as its era sees a government that governs for most of it." },
            {
                key: "polarization",
                contribution: -drift * UNITY_DIVISION_WEIGHT,
                detail: Math.abs(drift) < 0.005
                    ? "This administration has neither divided the country further nor brought it together."
                    : drift > 0
                        ? "This administration has divided the country further than its era already was."
                        : "This administration has brought the country closer together than its era usually is.",
            },
        ];
    },
    competence: competenceTerms,
};
/**
 * How far the strain the public actually feels is from the strain the terms
 * add up to, when the arithmetic runs off the end of its own scale.
 *
 * Reported by name rather than folded in silently, on the same principle
 * `PressureComposition` reports its fragility multiplier: a player told their
 * judgment is lower than its causes account for must be able to see why. Two
 * places in the model clamp before the driver does — the economic strain and
 * the condition load — and both are visible here as one honest line.
 */
function boundedCause(raw) {
    const bounded = clamp01(raw);
    if (bounded === raw)
        return undefined;
    return {
        key: "bounded",
        contribution: bounded - raw,
        detail: raw > 1
            ? "Everything above counts for more than this judgment can hold; it is already as high as it goes."
            : "Everything above counts for more than this judgment can lose; it is already at the floor.",
    };
}
/**
 * The named terms behind one judgment's target, in the order the model reads
 * them, with the bounding line last where the scale bit.
 */
export function opinionCausesFor(campaign, driver) {
    const terms = DRIVER_TERMS[driver](campaign);
    const raw = terms.reduce((sum, term) => sum + term.contribution, 0);
    const bounded = boundedCause(raw);
    const all = bounded ? [...terms, bounded] : terms;
    return all.map((term) => ({ ...term, contribution: round3(term.contribution) }));
}
/**
 * What the country would think if it judged only on what it can currently see.
 *
 * Every target reads state that already exists and is already moved by the rest
 * of the simulation, which is what makes opinion a *consequence* of the board
 * rather than a second scoreboard kept alongside it. Nothing here is authored
 * and nothing here can be set by content.
 *
 * The sum of the named terms, deliberately: the arithmetic and the explanation
 * are the same object, so the explanation cannot go stale against the charge.
 */
export function opinionTargets(campaign) {
    const targets = {};
    for (const driver of OPINION_DRIVERS) {
        targets[driver] = clamp01(DRIVER_TERMS[driver](campaign).reduce((sum, term) => sum + term.contribution, 0));
    }
    return targets;
}
