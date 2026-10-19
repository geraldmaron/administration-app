import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { selectNation } from "./state.js";
import { scandalFeedItems, selectLiveScandals } from "./press-scandal.js";
import { opinionCausesFor, opinionTargets, reliefConditions } from "./opinion-causes.js";
import { atWarAsParty } from "./war-party.js";
import { warOpinionTerms } from "./opinion-war.js";
import { pumpShock } from "./household-prices.js";
import { BLOCS, blocApprovals, blocPartisanship, cappedIssue, erosionOf, headlineOf, orientedShares, partyShares, sharesAtMargin, valenceOf, ZERO_ISSUE, } from "./electorate.js";
import { forceIssueTerms, forceRecord } from "./force-issue.js";
import { ERA_POLARIZATION, weeklyReversion } from "./polarization.js";
export { MAX_TURN_POLARIZE, polarize, revertPolarization } from "./polarization.js";
// How the country reads its own government, and the headline the whole game is
// scored on.
//
// The headline used to be a composite called `mandate`: thirty percent
// approval, and seventy percent stability, standing, readiness and treasury
// health. It is deleted. A number that is twenty percent solvency and ten
// percent force posture is a reading of the state's condition, and presenting
// it to a president as their standing with the country was a lie told in the
// one figure they steer by. An approval rating is what people think of you. The
// state's solvency and its army are among the reasons they think it.
//
// So the four other terms are still in the score — as causes, through
// `opinionTargets` below, at the speed a public actually revises an impression
// (`OPINION_DRIFT`) rather than as arithmetic settled the same week the fact
// moved. `standing` reaches `competence`, `stability` reaches `security` and
// `competence`, `militaryReadiness` reaches `competence`, treasury health gates
// `services`, and the press corps's standing reaches `integrity` and
// `competence` under a hard cap. Nothing that used to be weighed is now
// unweighed; it is weighed once, where it belongs, instead of twice.
//
// Approval is stored on `MetricSet` and written by nobody: `apply()` settles it
// once per packet from the mood and the week's salience, exactly as the
// composite it replaces was settled. A figure an effect can set directly is a
// figure nothing has to explain. What effects move is the six things a public
// actually judges a government on.
/**
 * The six standing judgments. Each is 0..1 and each is a claim about the
 * government rather than about the country: `prosperity` is not GDP, it is
 * whether people believe this administration has made them better off.
 */
export { OPINION_DRIVERS } from "./opinion-drivers.js";
/**
 * What each driver is, in the terms the public holds it in. Written as the
 * complaint rather than the virtue, because that is the form an opinion
 * actually arrives in and the form a surface has to render.
 */
export const OPINION_DRIVER_MEANINGS = {
    security: "Whether people feel safe — from war, from violence, from disorder in their own streets.",
    prosperity: "Whether people believe this government has made them better off.",
    services: "Whether the state shows up: the relief, the hospital, the water, the road.",
    integrity: "Whether the government is believed to be honest.",
    unity: "Whether it governs for the whole country or for one part of it.",
    competence: "Whether it can do the basic work of governing without dropping things.",
};
/**
 * The base weights: what a public weighs when nothing in particular is
 * happening. Exported and named because "why is my approval falling" has to be
 * inspectable rather than opaque, and because they are now the primary balance
 * lever for the whole domestic half of the game — the headline's only weight
 * table, where there used to be two stacked on each other.
 *
 * Prosperity leads because it leads everywhere, in every democracy anyone has
 * measured. Unity is last not because it matters least but because it moves
 * slowest: it is the driver that decides whether a *recoverable* administration
 * is recoverable, and it does that through `polarization` below rather than
 * through its own share.
 */
export const OPINION_WEIGHTS = {
    prosperity: 0.28,
    security: 0.22,
    services: 0.16,
    integrity: 0.14,
    competence: 0.12,
    unity: 0.08,
};
/**
 * How much louder a driver gets when the week is about it.
 *
 * This is the mechanism that makes the model political rather than arithmetic.
 * A public does not weigh six things evenly and permanently; it weighs whatever
 * is on the front page. A war makes security the whole election, a flood makes
 * services it, and a government that was surviving on a strong economy
 * discovers that the economy has stopped counting.
 *
 * Multipliers rather than replacement weights, applied to the base above and
 * then renormalized, so the base ordering survives and salience shifts it
 * instead of overwriting it.
 */
/**
 * What the week did, in the words the surface prints beside a driver that has
 * been made louder.
 *
 * Keyed on `SALIENCE_MULTIPLIERS` itself, so a new way for a week to make a
 * judgment matter more fails the typecheck unless it also says what it is. The
 * whole point of the multipliers is that a public weighs whatever is on the
 * front page, and a driver marked "louder this week" with no front page named
 * is the mechanism's own claim withheld from the person it is about.
 */
export const SALIENCE_REASONS = {
    atWar: "the country is at war",
    conditionActive: "a disaster is live at home",
    economicPain: "prices or joblessness are biting",
    disorder: "the country is carrying unrest",
    scandalLive: "a scandal is running",
    pumpShock: "gasoline prices are climbing",
};
export const SALIENCE_MULTIPLIERS = {
    /** The player is in a war, at any intensity. */
    atWar: { security: 1.7 },
    /** An emergency, not an economy, is live on the player's own ground (`reliefConditions`). */
    conditionActive: { services: 1.7, competence: 1.25 },
    /** Prices or joblessness are biting: running past where the term began (`ECONOMIC_PAIN`). */
    economicPain: { prosperity: 1.45 },
    /** The country is carrying unrest or an insurgency. */
    disorder: { security: 1.4, competence: 1.2 },
    /** A story about the administration is running, whatever opened it. */
    scandalLive: { integrity: 1.6 },
    /** The pump price has climbed sharply over the last several weeks (`pumpShock`). */
    pumpShock: { prosperity: 1.25 },
};
/**
 * How far past where the term began prices or joblessness have to run before a
 * week is about the economy.
 *
 * Against the term start, not an absolute line and not the country's resting
 * point. An absolute line cannot tell a country that has always lived with ten
 * percent unemployment from one that just arrived there, and the resting point
 * moves with order, so a country coming apart would read its own rising prices
 * as normal exactly when they were not. What a public remembers is where things
 * stood when this government took over. Three points of inflation and two of
 * joblessness: in the United States that is prices rising near 6% a year or
 * unemployment near 6%, the levels at which both have led the news before.
 */
export const ECONOMIC_PAIN = { inflation: 0.03, unemployment: 0.02 };
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
/**
 * The six judgments as an administration inherits them, plus how divided the
 * country already is.
 *
 * Seeded from the dataset the nation actually carries, so a president wakes up
 * to a public rather than to a blank one — and every reading is pulled toward
 * the middle, because what a country thinks of a government on its first day
 * is mostly what it thought of the last one.
 *
 * `competence` alone opens flat at the midpoint. It is the only driver that is
 * purely a judgment of *this* administration, and on turn one there is nothing
 * to judge.
 */
export function openingMood(nation) {
    const { economy, security, politics } = nation.stats;
    const economicStrain = clamp01(economy.unemployment * 2 + Math.max(0, economy.inflation) * 1.5);
    return {
        security: clamp01(1 - (security.crimeIndex * 0.5 + security.insurgencyPressure * 0.5)),
        prosperity: clamp01(0.6 - economicStrain * 0.5),
        // Legitimacy stands in for delivery: it is the dataset's reading of whether
        // the state is accepted as working, which is what a public means when it
        // says the government does or does not show up.
        services: clamp01(0.3 + politics.legitimacy * 0.45),
        integrity: clamp01(1 - security.corruptionIndex),
        unity: clamp01(1 - politics.factionalism),
        competence: 0.5,
        // The era's division, not the nation's factionalism: the bloc constants are
        // fitted with the 2020s public read as exactly this stock.
        polarization: ERA_POLARIZATION,
    };
}
/**
 * What is on the front page this week, by name.
 *
 * The list `salientWeights` walks, lifted out of it so the reason a judgment
 * got louder can be read as well as applied. Before this the multipliers fired
 * and were discarded, and the surface drew "Louder this week" with nothing
 * attached to it — the mechanism's own claim, withheld from the person it is a
 * claim about.
 */
export function salienceLevels(campaign) {
    const nationId = campaign.founding.nation;
    const runtime = selectNation(campaign, nationId);
    const stats = runtime?.stats;
    const levels = {};
    // A war the President joined beside somebody else is on the front page like one the country started.
    if (atWarAsParty(campaign, nationId))
        levels.atWar = 1;
    const relief = reliefConditions(campaign);
    if (relief.length > 0)
        levels.conditionActive = relief.reduce((high, condition) => Math.max(high, condition.severity), 0) || 1;
    // Before the general price pain: when both fire, the story on the front page
    // is the specific one, and the surface names the first key it is given.
    if (pumpShock(campaign))
        levels.pumpShock = 1;
    if (runtime && economyHurts(runtime.stats.economy, runtime.base.stats.economy)) {
        levels.economicPain = economicPainLevel(runtime.stats.economy, runtime.base.stats.economy);
    }
    const insurgency = (stats?.security.insurgencyPressure ?? 0) / 0.25;
    const protest = (stats?.politics.protestPressure ?? 0) / 0.4;
    if (insurgency > 1 || protest > 1)
        levels.disorder = Math.max(insurgency, protest);
    const scandals = selectLiveScandals(campaign);
    if (scandals.length > 0)
        levels.scandalLive = scandals.reduce((sum, scandal) => sum + scandal.intensity, 0) || 1;
    return levels;
}
/** How far past the pain line the economy has run, 1 at the line itself. */
function economicPainLevel(now, termStart) {
    return Math.max((now.inflation - termStart.inflation) / ECONOMIC_PAIN.inflation, (now.unemployment - termStart.unemployment) / ECONOMIC_PAIN.unemployment);
}
/**
 * How long a story stays on the front page once it breaks, in weeks.
 *
 * A public re-reads what is new. A war, a disaster or a scandal makes its
 * judgment louder when it breaks and when it gets worse, and after two months
 * of the same news the country has priced it in: the level still bills its
 * judgment through the targets, but it no longer outweighs everything else.
 */
export const SALIENCE_HOLD_WEEKS = 8;
/** How much worse a story has to get to break again: a quarter worse, and at least a twentieth of its scale. */
export const SALIENCE_ESCALATION = { ratio: 1.25, floor: 0.05 };
function escalated(level, remembered) {
    return level >= remembered * SALIENCE_ESCALATION.ratio && level - remembered >= SALIENCE_ESCALATION.floor;
}
/** Whether a present story is on the front page this week: new, newly worse, or broken inside the hold. */
function holds(campaign, key, level) {
    const remembered = campaign.salienceMemory?.[key];
    if (!remembered)
        return true;
    return escalated(level, remembered.level) || campaign.turn - remembered.since < SALIENCE_HOLD_WEEKS;
}
/** The memory the week leaves: a story that ended is forgotten, one that broke or got worse is stamped now. */
export function nextSalienceMemory(campaign) {
    const levels = salienceLevels(campaign);
    const next = {};
    for (const [key, level] of Object.entries(levels)) {
        const remembered = campaign.salienceMemory?.[key];
        next[key] = !remembered || escalated(level, remembered.level) ? { since: campaign.turn, level } : remembered;
    }
    return next;
}
export function selectSalience(campaign) {
    const levels = salienceLevels(campaign);
    return Object.entries(levels).filter(([key, level]) => holds(campaign, key, level)).map(([key]) => key);
}
/**
 * Whether prices or joblessness have run far enough past where the term began
 * to be what the week is about. The term start is the economy the founding
 * opened on, which is the authored one.
 */
export function economyHurts(now, termStart) {
    return (now.inflation - termStart.inflation >= ECONOMIC_PAIN.inflation ||
        now.unemployment - termStart.unemployment >= ECONOMIC_PAIN.unemployment);
}
/**
 * The weights this week, after the board has had its say. Renormalized to sum
 * to 1 so approval stays a 0..1 reading whatever is happening.
 */
export function salientWeights(campaign) {
    const multipliers = selectSalience(campaign).map((key) => SALIENCE_MULTIPLIERS[key]);
    const raw = { ...OPINION_WEIGHTS };
    for (const set of multipliers) {
        for (const driver of OPINION_DRIVERS) {
            const factor = set[driver];
            if (factor !== undefined)
                raw[driver] *= factor;
        }
    }
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + raw[driver], 0);
    const normalized = {};
    for (const driver of OPINION_DRIVERS)
        normalized[driver] = raw[driver] / total;
    return normalized;
}
/**
 * Approval, before polarization has its say. Separated so a surface can show
 * the raw judgment and the compressed reading as two different facts — the
 * first is what the country thinks, the second is what it will admit to.
 */
export function rawApproval(mood, weights) {
    return clamp01(OPINION_DRIVERS.reduce((sum, driver) => sum + mood[driver] * weights[driver], 0));
}
/** The most every issue term together may move one bloc, in logits. */
export const ISSUE_BLOC_CAP = 0.3;
function clampIssue(issue) {
    return Object.fromEntries(BLOCS.map((bloc) => [bloc, Math.max(-ISSUE_BLOC_CAP, Math.min(ISSUE_BLOC_CAP, issue[bloc]))]));
}
export function selectElectorate(campaign, mood = campaign.player.opinion) {
    const raw = rawApproval(mood, salientWeights(campaign));
    const polarization = mood.polarization;
    const { caucusAnchor, administrationParty } = campaign.congress;
    const shares = orientedShares(partyShares(campaign), caucusAnchor);
    const partisanship = blocPartisanship(administrationParty === "independent");
    const rally = warOpinionTerms(campaign).rally;
    const base = {
        valence: valenceOf(raw, campaign.turn, rally),
        polarization,
        erosion: erosionOf(campaign, polarization),
        partisanship,
        issue: clampIssue(forceIssueTerms(forceRecord(campaign), shares, caucusAnchor)),
    };
    const issue = cappedIssue(shares, base);
    const approvals = blocApprovals({ ...base, issue });
    return { raw, rally, ...base, shares, issue, approvals, headline: clamp01(headlineOf(shares, approvals)) };
}
/** How far the President's own identifiers still approve: what the caucus reads. */
export function ownIdentifierApproval(campaign) {
    return selectElectorate(campaign).approvals.ownId;
}
/**
 * Approval for a mood read against this campaign's week — the campaign's own
 * mood by default, or a proposed one.
 *
 * The computation. Callers who want the campaign's settled headline read
 * `selectApproval` instead; this is what settles it.
 */
export function approvalFor(campaign, mood = campaign.player.opinion) {
    return Math.round(selectElectorate(campaign, mood).headline * 10_000) / 10_000;
}
/**
 * The campaign's approval rating: the headline, as stored.
 *
 * Reads the settled figure rather than recomputing, so every surface, the
 * removal arc and the ledger's own diff are quoting one number. `apply()` is
 * what puts it there.
 */
export function selectApproval(campaign) {
    return campaign.player.metrics.approval;
}
/**
 * Settle the stored headline against the campaign as it now stands.
 *
 * The one writer of `metrics.approval`, called at the end of every `apply()`
 * and wherever the turn loop moves the public outside a packet. Per packet
 * rather than per effect because approval reads more than the mood: the
 * week's salience, the scandals, the force record and the party shares.
 */
export function recomputeApproval(campaign) {
    const approval = approvalFor(campaign);
    if (approval === campaign.player.metrics.approval)
        return campaign;
    return {
        ...campaign,
        player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval } },
    };
}
/**
 * The opening reading, for a nation nobody is governing yet: at the oath, with
 * nobody's honesty in question and nothing on the record, read on the party
 * shares the campaign drew. Founding then runs `recomputeApproval` against the
 * real board, which lands on the same figure while the opening week is about
 * nothing in particular.
 */
export function openingApproval(nation, electorate = { shares: sharesAtMargin(0), anchor: "democrat" }) {
    const raw = rawApproval(openingMood(nation), OPINION_WEIGHTS);
    const shares = orientedShares(electorate.shares, electorate.anchor);
    const approvals = blocApprovals({
        valence: valenceOf(raw, 1),
        polarization: ERA_POLARIZATION,
        erosion: 0,
        partisanship: blocPartisanship(electorate.independent === true),
        issue: ZERO_ISSUE,
    });
    return Math.round(clamp01(headlineOf(shares, approvals)) * 10_000) / 10_000;
}
/**
 * Approval broken into what is producing it — the reading a player needs to
 * answer "why". Never the arithmetic itself: a surface renders these as
 * language, in the same register every other cost is quoted in.
 */
export function selectOpinionReading(campaign) {
    const weights = salientWeights(campaign);
    const mood = campaign.player.opinion;
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + mood[driver] * weights[driver], 0) || 1;
    return OPINION_DRIVERS.map((driver) => ({
        driver,
        value: mood[driver],
        weight: weights[driver],
        share: (mood[driver] * weights[driver]) / total,
        // Compared against the resting weight rather than against the other
        // drivers: "the week has made this matter more" is the fact, and a driver
        // that is merely large at rest has not been made anything by the week.
        salient: weights[driver] > OPINION_WEIGHTS[driver] + 0.005,
    }));
}
/**
 * Move the public's judgment.
 *
 * The one writer of mood. Deltas arrive from the impact model (what a decision
 * did to people and to money) and from the turn phases (what the world did);
 * nothing sets a driver absolutely, because a government does not get to
 * declare what the country thinks of it. Nothing damps them either:
 * polarization acts once, inside the blocs, on how far the record moves each
 * of them.
 */
export function applyMoodDeltas(mood, deltas) {
    const next = { ...mood };
    for (const driver of OPINION_DRIVERS) {
        const delta = deltas[driver];
        if (delta === undefined || delta === 0)
            continue;
        next[driver] = clamp01(mood[driver] + delta);
    }
    return next;
}
/**
 * How much polarization the live turn has already added, net of anything it
 * has already given back.
 *
 * Read off the ledger rather than kept as a field of its own: every packet
 * that moves the mood already leaves its diff on the ledger entry that records
 * it, tagged with the turn it belongs to. Walked from the tail, because the
 * ledger is append-only and turn-ordered. This is what lets a joint ceiling see
 * a scenario decision, which commits through `apply()` mid-week, entirely
 * outside `advanceTurn`.
 */
export function polarizationRiseThisTurn(campaign) {
    const { ledger, turn } = campaign;
    let sum = 0;
    for (let i = ledger.length - 1; i >= 0; i -= 1) {
        const entry = ledger[i];
        if (entry.turn !== turn)
            break;
        sum += entry.mood?.polarization ?? 0;
    }
    return sum;
}
/**
 * How fast a judgment moves toward what the country can actually see.
 *
 * Slow, and slow is the point. A public does not re-rate a government weekly
 * from first principles — it carries an impression and revises it. At this rate
 * a driver closes roughly half the distance to its target in eleven turns,
 * which makes a sustained condition worth far more than a dramatic week and is
 * the correct relationship between the two.
 */
export const OPINION_DRIFT = 0.06;
/**
 * How fast a judgment moves while the week is about it: a story on the front
 * page is re-read, not carried. This is where steep moves come from — a
 * disaster or a scandal sends its judgment most of the way to where the
 * country can see it in a couple of months — without any writer having to set
 * a judgment directly.
 */
export const SALIENT_OPINION_DRIFT = 0.2;
/** The judgments some story on the front page is making louder this week. */
export function salientDrivers(campaign) {
    const loud = new Set();
    for (const key of selectSalience(campaign)) {
        for (const driver of Object.keys(SALIENCE_MULTIPLIERS[key]))
            loud.add(driver);
    }
    return loud;
}
/**
 * How many weeks `OPINION_DRIFT` needs to close half the gap between where a
 * judgment is and where the country's own board says it is heading.
 *
 * Derived rather than stated, so it cannot go stale against the rate. It is a
 * property of the rate alone and not of the size of the gap, which is the
 * honest thing to tell a president: a judgment twenty points off target and one
 * two points off both close half of it in the same eleven weeks.
 */
export const OPINION_HALF_LIFE_TURNS = Math.round(Math.log(0.5) / Math.log(1 - OPINION_DRIFT));
/**
 * Why each of the six judgments is where it is.
 *
 * The reading `selectOpinionReading` could never give: that one says how much a
 * driver counts and what share of the week's approval it is, and says nothing
 * at all about why the level is the level. A president watching Security fall
 * from strong to zero over a term was given a definition and a percentage and
 * never a cause — while the actual cause, a cabinet quietly defecting and
 * taking `standing` to the floor, sat in `opinionTargets` unread by any screen.
 *
 * Causes are ordered by how much they are moving the judgment rather than by
 * the order the arithmetic reads them, because the question this answers is
 * "what is doing this to me" and the answer to that is a ranking.
 */
export function selectOpinionCauses(campaign) {
    const targets = opinionTargets(campaign);
    const mood = campaign.player.opinion;
    const firing = selectSalience(campaign);
    return OPINION_DRIVERS.map((driver) => ({
        driver,
        level: mood[driver],
        target: targets[driver],
        distance: targets[driver] - mood[driver],
        causes: [...opinionCausesFor(campaign, driver)].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
        salience: firing.filter((key) => SALIENCE_MULTIPLIERS[key][driver] !== undefined),
    }));
}
/**
 * How much a term has to take off a judgment before it is the one weighing on
 * it: two and a half points of the judgment. Smaller drags are real and are
 * listed, but naming one as the reason would send a player after a rounding
 * error.
 */
export const MATERIAL_DRAG = 0.025;
/**
 * The heaviest term behind a judgment, which is the one sentence it is owed:
 * what pulls it down hardest, or, when nothing pulls it down by much, what
 * holds it up most.
 *
 * Never the resting base or the bounding line. The base is where every
 * judgment starts and the bound is arithmetic, so naming either as the reason
 * a judgment is where it is would answer a question nobody asked; a judgment
 * nothing moves is owed no sentence at all.
 */
export function heaviestCause(reading) {
    const moving = reading.causes.filter((cause) => cause.key !== "base" && cause.key !== "bounded" && cause.contribution !== 0);
    const drag = moving
        .filter((cause) => cause.contribution <= -MATERIAL_DRAG)
        .reduce((worst, cause) => (!worst || cause.contribution < worst.contribution ? cause : worst), undefined);
    return drag ?? moving[0];
}
/**
 * The week's drift toward what the country can see.
 *
 * Emitted as an effect like everything else rather than mutating state, so the
 * one path into `player.opinion` stays `apply()` and a week's movement in
 * public opinion is as replayable and diffable as every other change.
 */
export function driftOpinion(campaign) {
    const targets = opinionTargets(campaign);
    const mood = campaign.player.opinion;
    const next = { ...mood };
    const loud = salientDrivers(campaign);
    for (const driver of OPINION_DRIVERS) {
        const rate = loud.has(driver) ? SALIENT_OPINION_DRIFT : OPINION_DRIFT;
        next[driver] = clamp01(mood[driver] + (targets[driver] - mood[driver]) * rate);
    }
    // Drivers only. The week's reversion of the stock is emitted by the phase as
    // a relative move, so folding it in here would spend it twice.
    return next;
}
/** What the weekly revision packet says, so a reader of the ledger can tell it from everything else. */
export const OPINION_WEEK_SUMMARY = "The country revises its reading of the administration.";
/**
 * The week the public has, expressed as a packet.
 *
 * Runs late in the turn — after the world has acted, the wars and conditions
 * have taken their week, the cabinet has answered and the press has hardened
 * around it — because what the country is judging is the week that just
 * happened rather than the one before it. Before removal, so the arc reads an
 * approval rating that already includes the public's revision of it.
 */
export const opinionPhase = (state) => {
    const drifted = driftOpinion(state);
    const deltas = {};
    for (const driver of OPINION_DRIVERS) {
        const delta = drifted[driver] - state.player.opinion[driver];
        if (delta !== 0)
            deltas[driver] = delta;
    }
    // The week's reversion of the polarization stock toward the era's anchor,
    // carried as a relative move rather than as the settled figure: other writers
    // push it earlier in the same turn and a whole-value write here would
    // silently discard them. Emitted even on a week where no judgment moved,
    // because the reversion is the thing that happened.
    const heal = weeklyReversion(state.player.opinion.polarization);
    // A scandal's stage is read fresh every week rather than stored (see
    // `press-scandal.ts`), so its breaking, its legs and its death are reported
    // from here — the one phase already downstream of the week the press had —
    // rather than from a stored transition nothing else in the turn keeps.
    const scandalItems = scandalFeedItems(state, state.turn);
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            // The public's weekly revision is the world's bookkeeping, not an act: the Record leaves it out.
            background: true,
            narration: { summary: OPINION_WEEK_SUMMARY },
            effects: [
                { kind: "opinion", deltas, ...(heal > 0 ? { heal } : {}), salience: nextSalienceMemory(state) },
                ...(scandalItems.length > 0 ? [{ kind: "feed", items: scandalItems }] : []),
            ],
        },
    ];
};
