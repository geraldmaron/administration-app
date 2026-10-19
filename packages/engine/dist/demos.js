import { COHORT_AXIS, COHORT_AXES, COHORT_IDS, cohortsOfAxis, STATE_IDS } from "@admin/world";
import { DEFAULT_PACE, PACE_LADDER } from "./pace.js";
import { MAX_TURN_POLARIZE, OPINION_WEIGHTS, rawApproval, salientWeights, selectElectorate } from "./opinion.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { COHORT_MOTIVATION } from "./cohort-motivation.js";
import { cohortBlocShares } from "./cohort-blocs.js";
import { blocLogit, BLOCS, valenceOf } from "./electorate.js";
export { COHORT_MOTIVATION } from "./cohort-motivation.js";
// Cohort motivations, strain, derived readings, and demosPhase: the balance
// table that gives each of the sixteen cells its politics, the bounded memory
// each cell carries, the centered support reader that cannot move national
// approval, and the weekly pass that cancels matching causes,
// decays at valence-split rates, and emits a polarization term under the joint
// MAX_TURN_POLARIZE ceiling. Motivations live here, not in world, on the same
// precedent as the retired coalition lenses. A lens is always derived:
// normalize(OPINION_WEIGHTS ⊙ tilt). applyCohort is the only writer of
// Campaign.cohorts.
export const LENS_TILT_FLOOR = 0.55;
export const LENS_TILT_CAP = 1.8;
export const COHORT_MIN_SPREAD = 0.35;
export const LENS_CENTERING_TOLERANCE = 0.02;
/** Floor/ceiling for authored baseTurnout. Magnitude bounds, not fiction-time. */
export const TURNOUT_FLOOR = 0.4;
export const TURNOUT_CEILING = 0.85;
function normalizeWeights(raw) {
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + raw[driver], 0);
    const out = {};
    for (const driver of OPINION_DRIVERS) {
        out[driver] = raw[driver] / total;
    }
    return out;
}
/** The lens, derived. normalize(OPINION_WEIGHTS ⊙ tilt). Never authored directly. */
export function cohortLens(cohort) {
    const { tilt: cohortTilt } = COHORT_MOTIVATION[cohort];
    const raw = {};
    for (const driver of OPINION_DRIVERS) {
        raw[driver] = OPINION_WEIGHTS[driver] * cohortTilt[driver];
    }
    return normalizeWeights(raw);
}
/** Exhaustive coverage check used by tests — every declared id has a row. */
export function motivationIds() {
    return COHORT_IDS;
}
/**
 * Per-turn weight drop by valence. A harm outlives a favor, the one deliberate
 * departure from the single BASE_MARK_DECAY state marks use. The negative rate
 * matches that mark decay, so a harm fades the same whether a state or a people
 * remember it.
 */
export const STRAIN_DECAY = {
    [-1]: 0.06,
    [1]: 0.1,
};
/** An omission fades slower still (~thirty-four weeks). Matches 0009's OMISSION_DECAY. */
export const OMISSION_DECAY = 0.03;
/**
 * Peak polarization demosPhase may emit from cohort dispersion alone. Held
 * under the joint MAX_TURN_POLARIZE ceiling with every other writer — not a
 * separate allowance.
 */
export const COHORT_DISPERSION_POLARIZE = 0.04;
/** Save / glance bound: sixteen cohorts × six strains. Eviction is deterministic. */
export const MAX_COHORT_STRAINS = 6;
/**
 * How far centered strain may pull a cohort's support off its lens reading.
 * Magnitude bound, not fiction-time.
 */
export const STRAIN_SCALE = 0.15;
/** Every cohort opens with no memory — founding and the v26 migration both use this. */
export function openingCohorts() {
    const out = {};
    for (const id of COHORT_IDS) {
        out[id] = [];
    }
    return out;
}
/**
 * Deterministic eviction: over MAX_COHORT_STRAINS, drop lowest weight, ties on
 * lowest createdTurn, ties on cause ascending. Survivors keep append order.
 */
function boundStrains(strains) {
    if (strains.length <= MAX_COHORT_STRAINS)
        return strains;
    const sorted = [...strains].sort((a, b) => {
        if (a.weight !== b.weight)
            return a.weight - b.weight;
        if (a.createdTurn !== b.createdTurn)
            return a.createdTurn - b.createdTurn;
        return a.cause < b.cause ? -1 : a.cause > b.cause ? 1 : 0;
    });
    const drop = new Set(sorted.slice(0, strains.length - MAX_COHORT_STRAINS));
    return strains.filter((strain) => !drop.has(strain));
}
function nextStrains(current, effect) {
    if (effect.replaceStrains)
        return boundStrains(effect.replaceStrains);
    if (effect.addStrain)
        return boundStrains([...current, effect.addStrain]);
    return current;
}
/** Sole writer of Campaign.cohorts. Does not touch PublicMood or any other field. */
export function applyCohort(state, effect) {
    const current = state.cohorts[effect.cohort] ?? [];
    return {
        ...state,
        cohorts: { ...state.cohorts, [effect.cohort]: nextStrains(current, effect) },
    };
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
/** Signed sum of live strain. Positive favors the administration; negative hurts it. */
export function netStrain(strains) {
    return strains.reduce((sum, strain) => sum + strain.weight * strain.valence, 0);
}
/**
 * Salience ⊙ tilt, renormalized. A war makes security louder for everyone, and
 * louder still for public-and-uniformed. Not the standing lens — that is
 * cohortLens (base weights only).
 */
export function cohortWeights(campaign, cohort) {
    const { tilt: cohortTilt } = COHORT_MOTIVATION[cohort];
    const salient = salientWeights(campaign);
    const raw = {};
    for (const driver of OPINION_DRIVERS) {
        raw[driver] = salient[driver] * cohortTilt[driver];
    }
    return normalizeWeights(raw);
}
/**
 * National cohort shares, derived never stored. Each state's authored mix is
 * weighted by its population, summed in STATE_IDS order, rounded to 4 dp per
 * axis. The age axis then drifts with demography.growthRate × elapsed fiction
 * years so a growing country reads younger without a second save field.
 *
 * The weight was `electoralVotes`, and its own comment called that what it was:
 * "the population proxy the dataset already carries". It was the only proxy
 * available while the states held distributions and no quantity, and it is a
 * poor one — every state carries an electoral floor of three, so Wyoming's
 * mix counted at roughly four times its share of the country and California's
 * at about four fifths of its own.
 *
 * It has to move in the same change as `cohortGeography`'s weighting, not
 * after it. The two are numerator and denominator of one ratio: weighting where
 * an act landed by people while still weighting the country it is compared
 * against by electoral votes reads every cohort concentrated in large states as
 * over-represented and every cohort concentrated in small ones as under-, which
 * is a bias in every strain figure the campaign produces rather than a
 * rounding difference.
 */
export function nationalCohortShares(campaign) {
    const weighted = Object.fromEntries(COHORT_IDS.map((id) => [id, 0]));
    let totalWeight = 0;
    for (const stateId of STATE_IDS) {
        const runtime = campaign.states[stateId];
        if (!runtime?.base.character.cohorts)
            continue;
        const weight = runtime.base.population;
        totalWeight += weight;
        const mix = runtime.base.character.cohorts;
        for (const axis of COHORT_AXES) {
            const axisMix = mix[axis];
            for (const cohort of cohortsOfAxis(axis)) {
                weighted[cohort] += weight * (axisMix[cohort] ?? 0);
            }
        }
    }
    const shares = {};
    for (const axis of COHORT_AXES) {
        const cells = cohortsOfAxis(axis);
        const rawSum = cells.reduce((sum, id) => sum + (totalWeight === 0 ? 0 : weighted[id] / totalWeight), 0);
        let assigned = 0;
        for (let i = 0; i < cells.length; i++) {
            const id = cells[i];
            if (i === cells.length - 1) {
                shares[id] = round4(1 - assigned);
            }
            else {
                const share = rawSum === 0 ? 0 : round4(weighted[id] / totalWeight / rawSum);
                shares[id] = share;
                assigned += share;
            }
        }
    }
    return applyAgeDrift(shares, campaign);
}
/** One cohort's national share from the derived table. */
export function nationalShare(campaign, cohort) {
    return nationalCohortShares(campaign)[cohort];
}
function applyAgeDrift(shares, campaign) {
    const nation = campaign.nations[campaign.founding.nation];
    const growthRate = nation?.stats.demography.growthRate ?? 0;
    const years = Math.max(0, campaign.turn - 1) / PACE_LADDER[DEFAULT_PACE].turnsPerYear;
    const drift = clamp(growthRate * years, -0.08, 0.08);
    if (drift === 0)
        return shares;
    let under = shares["age-under-35"];
    const mid = shares["age-35-64"];
    let older = shares["age-65-plus"];
    if (drift > 0) {
        const take = Math.min(older, drift);
        older -= take;
        under += take;
    }
    else {
        const take = Math.min(under, -drift);
        under -= take;
        older += take;
    }
    const sum = under + mid + older;
    if (sum <= 0)
        return shares;
    const out = { ...shares };
    out["age-under-35"] = round4(under / sum);
    out["age-35-64"] = round4(mid / sum);
    out["age-65-plus"] = round4(1 - out["age-under-35"] - out["age-35-64"]);
    return out;
}
/**
 * Net strain minus the axis share-weighted mean. The quantity boundary law 2
 * centers inside the one reader that uses it.
 */
export function centeredStrain(campaign, cohort) {
    const axis = COHORT_AXIS[cohort];
    const shares = nationalCohortShares(campaign);
    const mean = cohortsOfAxis(axis).reduce((sum, id) => sum + shares[id] * netStrain(campaign.cohorts[id] ?? []), 0);
    return netStrain(campaign.cohorts[cohort] ?? []) - mean;
}
const logistic = (value) => 1 / (1 + Math.exp(-value));
// Campaigns are immutable values, so a reading keyed on the object cannot go stale.
const startingPoints = new WeakMap();
/**
 * Where each cohort stands before its memory: the five blocs, each reading the
 * record through this cohort's own lens, mixed in the proportions the cohort is
 * made of (`cohort-blocs.ts`). The cohort's measured partisan baseline is in
 * that mixture (DECISIONS 5.8), so no separate offset or calibration is added.
 * The headline never reads a cohort (DECISIONS 5.9).
 */
export function cohortStartingPoints(campaign) {
    const cached = startingPoints.get(campaign);
    if (cached)
        return cached;
    const reading = selectElectorate(campaign);
    const out = {};
    for (const cohort of COHORT_IDS) {
        const raw = rawApproval(campaign.player.opinion, cohortWeights(campaign, cohort));
        const inputs = { ...reading, valence: valenceOf(raw, campaign.turn, reading.rally) };
        const mix = cohortBlocShares(campaign, cohort);
        out[cohort] = BLOCS.reduce((sum, bloc) => sum + mix[bloc] * logistic(blocLogit(bloc, inputs)), 0);
    }
    startingPoints.set(campaign, out);
    return out;
}
/**
 * Cohort support: where the cohort starts (the blocs it is made of, reading the
 * record through its lens) plus a centered strain displacement. The strain
 * term sums to zero on every axis by construction.
 */
export function cohortSupport(campaign, cohort) {
    return round3(clamp01(cohortStartingPoints(campaign)[cohort] + STRAIN_SCALE * centeredStrain(campaign, cohort)));
}
/**
 * How a cell says what it remembers.
 *
 * Never a figure, never a delta, never a slug: a cohort's memory is a thing
 * that happened to people, and the reason sentence it was written with is the
 * only part of it a player should ever have to read. Undefined when the cell
 * carries no strain at all, which is the honest first-week case rather than a
 * blank line.
 */
export function cohortReading(campaign, cohort) {
    const strains = campaign.cohorts[cohort] ?? [];
    const heaviest = strains.reduce((worst, strain) => (worst === undefined || strain.weight > worst.weight ? strain : worst), undefined);
    if (!heaviest)
        return undefined;
    const { name } = COHORT_MOTIVATION[cohort];
    return heaviest.valence === -1
        ? `${name} have not forgotten. ${heaviest.reason}`
        : `${name} still credit it. ${heaviest.reason}`;
}
/**
 * All sixteen cells, in declaration order.
 *
 * Declaration order rather than sorted, so the axis strips a surface draws stay
 * put week to week: a list that reordered itself as support moved would make
 * every reading a search.
 */
export function selectCohorts(campaign) {
    const shares = nationalCohortShares(campaign);
    return COHORT_IDS.map((cohort) => {
        const reading = cohortReading(campaign, cohort);
        return {
            cohort,
            axis: COHORT_AXIS[cohort],
            name: COHORT_MOTIVATION[cohort].name,
            share: shares[cohort],
            support: cohortSupport(campaign, cohort),
            strain: round3(netStrain(campaign.cohorts[cohort] ?? [])),
            displacement: round3(centeredStrain(campaign, cohort)),
            ...(reading === undefined ? {} : { reading }),
        };
    });
}
/**
 * The cell this administration has cost the most, or nothing when it has cost
 * none of them anything.
 *
 * Read off displacement rather than off support: support carries the national
 * mood, which is the same for every cell and says nothing about who was hurt.
 * What is this administration's doing is the part of a cell's memory that its
 * own axis does not share.
 */
export function weakestCohort(campaign) {
    const standings = selectCohorts(campaign).filter((standing) => standing.displacement < 0);
    return standings.reduce((worst, standing) => (worst === undefined || standing.displacement < worst.displacement ? standing : worst), undefined);
}
/**
 * Cause-matched cancellation: a positive strain whose cause matches a live
 * negative retires that harm up to its own weight before any remainder stays,
 * slug-matched the way PendingClaim is. Positives walk append order;
 * negatives of the same cause are spent oldest-first.
 */
export function cancelMatchingStrains(strains) {
    if (strains.length === 0)
        return strains;
    const working = strains.map((strain) => ({ ...strain }));
    for (let i = 0; i < working.length; i++) {
        const positive = working[i];
        if (positive.valence !== 1 || positive.weight <= 0)
            continue;
        let credit = positive.weight;
        const negatives = working
            .map((strain, index) => ({ strain, index }))
            .filter(({ strain }) => strain.valence === -1 && strain.cause === positive.cause && strain.weight > 0)
            .sort((a, b) => {
            if (a.strain.createdTurn !== b.strain.createdTurn) {
                return a.strain.createdTurn - b.strain.createdTurn;
            }
            if (a.strain.weight !== b.strain.weight)
                return a.strain.weight - b.strain.weight;
            return a.index - b.index;
        });
        for (const { index } of negatives) {
            if (credit <= 0)
                break;
            const negative = working[index];
            const take = Math.min(credit, negative.weight);
            working[index] = { ...negative, weight: round3(negative.weight - take) };
            credit = round3(credit - take);
        }
        working[i] = { ...positive, weight: credit };
    }
    return working.filter((strain) => strain.weight > 0);
}
/** Drop each strain's weight by its own decayRate; zero-weight entries leave. */
export function decayCohortStrains(strains) {
    return strains
        .map((strain) => ({
        ...strain,
        weight: round3(Math.max(0, strain.weight - strain.decayRate)),
    }))
        .filter((strain) => strain.weight > 0);
}
function strainsChanged(before, after) {
    if (before.length !== after.length)
        return true;
    return after.some((strain, index) => strain.weight !== before[index].weight ||
        strain.cause !== before[index].cause ||
        strain.valence !== before[index].valence);
}
/**
 * Cancel matching causes, then decay. Order is load-bearing: an act that
 * retires a grievance retires it in the week it lands, not a week later.
 */
export function reconcileCohortStrains(strains) {
    return decayCohortStrains(cancelMatchingStrains(strains));
}
/**
 * Cross-axis dispersion of centered strain: mean of each axis's share-weighted
 * RMS. Mean of centered strain is zero by construction, so RMS is the spread.
 */
export function cohortStrainDispersion(campaign) {
    const shares = nationalCohortShares(campaign);
    let total = 0;
    for (const axis of COHORT_AXES) {
        let sumSquares = 0;
        for (const cohort of cohortsOfAxis(axis)) {
            const centered = centeredStrain(campaign, cohort);
            sumSquares += shares[cohort] * centered * centered;
        }
        total += Math.sqrt(sumSquares);
    }
    return round3(total / COHORT_AXES.length);
}
/** OpinionEffect.polarize amount from cohort dispersion, capped at MAX_TURN_POLARIZE. */
export function cohortDispersionPolarizeAmount(campaign) {
    const raw = COHORT_DISPERSION_POLARIZE * cohortStrainDispersion(campaign);
    if (raw <= 0)
        return 0;
    return Math.min(MAX_TURN_POLARIZE, Math.round(raw * 10_000) / 10_000 + 0);
}
/**
 * Weekly demos pass: cause-matched cancellation, valence-split decay via
 * replaceStrains, and a polarization term from cross-axis strain dispersion.
 * Runs after opinionPhase and before removalPhase (ARCHITECTURE §3).
 */
export const demosPhase = (state) => {
    const packets = [];
    for (const cohort of COHORT_IDS) {
        const current = state.cohorts[cohort] ?? [];
        if (current.length === 0)
            continue;
        const next = reconcileCohortStrains(current);
        if (!strainsChanged(current, next))
            continue;
        const effect = {
            kind: "cohort",
            cohort,
            replaceStrains: next,
            reason: "cohort strain cancels and fades",
        };
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: {
                summary: `What ${COHORT_MOTIVATION[cohort].name.toLowerCase()} remember of this administration settles.`,
            },
            effects: [effect],
        });
    }
    const polarize = cohortDispersionPolarizeAmount(state);
    if (polarize > 0) {
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: "The country's cells pull further apart." },
            effects: [{ kind: "opinion", deltas: {}, polarize }],
        });
    }
    return packets;
};
