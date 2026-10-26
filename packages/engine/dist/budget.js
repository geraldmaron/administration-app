import { selectNation, } from "./state.js";
import { apply } from "./effects.js";
import { budgetChair } from "./stewardship.js";
import { selectChairRunner } from "./appointments.js";
import { accountDepartments } from "./department-ownership.js";
import { CARETAKER_QUALITY, POLICY_QUALITY_RANGE, POLICY_TURN_SHARE, round3 } from "./policy.js";
import { sentenceCase } from "./naming.js";
import { impoundmentPackets, withheldShare } from "./impoundment.js";
import { ACCOUNT_CAP, DOMESTIC_SUSTAIN_AT_FULL, FUNDED_BUDGET_ADEQUACY, LAPSE_BUDGET_RECOVERY, accountCap, apportionmentShare, branchBudgetAdequacy, inShutdown, settledFromNetShare, } from "./funding.js";
// The appropriation: what the state buys itself.
//
// Every rung of the instrument ladder is gated on a capability figure — the
// diplomatic corps's reach, the reserves an economy can absorb a reply with,
// what the services can actually do, whether there is lift to put a brigade
// anywhere. Until now nothing the player could decide moved any of them at a
// rate a term could feel. A country therefore had exactly the reach it was
// authored with, forever, and a small one opened the game locked out of the top
// of every ladder with no route back in. That is not a small country; that is a
// small country the player cannot govern.
//
// An appropriation is the route. The player sets a standing share of national
// income against each of the five instruments, and the state gets what it pays
// for, week after week, until they change it.
//
// Three properties make it a decision rather than a shop:
//
//   - Capability is bought in *share of GDP*, not in money. Reach, tradecraft
//     and readiness are qualities of an institution, and what buys them is the
//     fraction of a country's income it is willing to commit — which is why a
//     26-million-person state that spends like an intelligence state gets an
//     intelligence service, and why the giant next door has to spend the same
//     share to climb at the same rate. Size still prices everything the ladder
//     gates on absolutely (an embargo needs trade to withhold, and no share of
//     GDP conjures that); what size stops doing is capping ambition.
//   - Holding a capability costs money too. Every account has a sustainment
//     line that rises with what has already been built, so an appropriation
//     below it is a drawdown: the services shrink, the corps loses its posts,
//     the fleet rusts. Spending nothing is a decision with consequences, not
//     the absence of one.
//   - Only the *change* reaches the treasury. The establishment a country
//     already keeps is already paid for out of revenue this game does not
//     model, so holding the line costs nothing and charging for it would bill
//     the player twice for the country they were handed. Building above the
//     line is money out of the treasury, week after week; cutting below it is
//     a peace dividend paid back the same way. A government that votes more
//     than it can fund builds only what it could actually pay for, and settles
//     the arrears in stability.
/**
 * The instruments an appropriation can build an establishment for.
 *
 * Not every instrument is one. Assistance is funded per act out of the
 * treasury, and the capabilities its rungs gate on — reserves, the size of the
 * economy, the readiness the transfer comes out of, the foreign service that
 * delivers it — are all built by the four accounts that already exist. A fifth
 * statecraft account would be a second way to buy the same four things.
 */
// `satisfies` rather than a bare literal: a statecraft account is always an
// instrument, because the minister who runs the ladder is the minister who
// spends the appropriation. Renaming an instrument therefore breaks the build
// here rather than orphaning an account quietly.
export const STATECRAFT_ACCOUNTS = ["diplomatic", "economic", "covert", "military"];
/**
 * Every account on the budget, which is the five instruments and the government
 * itself.
 *
 * The domestic line is not an instrument and never will be — nothing on the
 * escalation ladder gates on it. It is here because a budget of four statecraft
 * accounts is not a budget: a president who could only ever move money between
 * the foreign service and the navy was never making the choice the office
 * actually makes, which is between what the state projects abroad and what it
 * delivers at home. With this line on the same continuous allocation, a carrier
 * is finally paid for out of something.
 */
export const BUDGET_ACCOUNTS = [...STATECRAFT_ACCOUNTS, "domestic"];
export { ACCOUNT_CAP, accountCap };
/** An appropriation of nothing — the shape, before anything has been voted. */
export function inheritedBudget() {
    return Object.fromEntries(BUDGET_ACCOUNTS.map((account) => [account, 0]));
}
/**
 * What a founding actually opens on: every account funded at exactly what
 * holding it costs.
 *
 * An administration that has voted no budget of its own is not one whose
 * army is dissolving — it is one still paying its predecessor's bills. Opening
 * at zero would have made doing nothing a drawdown, which turns the first
 * decision of every campaign into a mandatory one and makes "hold what I
 * inherited" the one position the player cannot take. It also means the state
 * costs money from turn one, which is the fact the whole account rests on.
 */
export function sustainingBudget(runtime, branchAdequacy = FUNDED_BUDGET_ADEQUACY) {
    return Object.fromEntries(BUDGET_ACCOUNTS.map((account) => [
        account,
        round4(BUDGET_ACCOUNT_SPECS[account].sustainAtFull * accountLevel(runtime, account, branchAdequacy)),
    ]));
}
export const BUDGET_STAT_RANGES = {
    "softPower.diplomaticReach": [0, 1],
    "softPower.culturalReach": [0, 1],
    "security.intelCapability": [0, 1],
    "security.counterIntel": [0, 1],
    "military.readiness": [0, 1],
    "military.doctrineQuality": [0, 1],
    "military.branchStrength.land": [0, 1],
    "military.branchStrength.air": [0, 1],
    "military.branchStrength.naval": [0, 1],
    "military.branchStrength.cyber": [0, 1],
    "military.airliftCapacity": [0, 1],
    "military.sealiftCapacity": [0, 1],
};
export const BUDGET_ACCOUNT_SPECS = {
    diplomatic: {
        name: "Foreign service",
        summary: "Missions, envoys, and the standing to be listened to in rooms you are not in.",
        headline: "softPower.diplomaticReach",
        targets: [
            { path: "softPower.diplomaticReach", weight: 0.7 },
            { path: "softPower.culturalReach", weight: 0.3 },
        ],
        // A foreign service is built out of posts, careers and decades of showing
        // up: the slowest of the four to buy and the slowest to lose.
        gain: 9,
        sustainAtFull: 0.008,
    },
    economic: {
        // The Treasury's own reserve account; a ledger line written before the rename keeps its old name.
        name: "Exchange Stabilization Fund",
        properNoun: true,
        summary: "Reserves held against the day somebody calls the bluff. Nothing else buys the room to absorb a reply.",
        // The economic ladder gates on reserves, which are money rather than a
        // 0..1 capability — so this account is handled on its own terms below and
        // declares no stat targets. `headline` names what it builds all the same,
        // so nothing downstream has to special-case a missing one.
        headline: "softPower.diplomaticReach",
        targets: [],
        gain: 0,
        // Reserves cost their own holding — the yield forgone on money that has to
        // sit there — which is why a fund is not free once it is full.
        sustainAtFull: 0.004,
    },
    covert: {
        name: "Intelligence services",
        summary: "Stations, analysts, tradecraft, and the counter-intelligence to keep any of it from leaking.",
        headline: "security.intelCapability",
        targets: [
            { path: "security.intelCapability", weight: 0.6 },
            { path: "security.counterIntel", weight: 0.4 },
        ],
        // The cheapest capability in the game to build and the cheapest to lose:
        // an intelligence service is people, and people can be hired in a year and
        // gone in one.
        gain: 16,
        sustainAtFull: 0.006,
    },
    military: {
        name: "Defense establishment",
        summary: "Force structure, doctrine, and the lift without which none of it can be anywhere but home.",
        headline: "military.readiness",
        targets: [
            { path: "military.readiness", weight: 0.24 },
            { path: "military.doctrineQuality", weight: 0.14 },
            { path: "military.branchStrength.land", weight: 0.14 },
            { path: "military.branchStrength.air", weight: 0.14 },
            { path: "military.branchStrength.naval", weight: 0.12 },
            { path: "military.branchStrength.cyber", weight: 0.08 },
            { path: "military.airliftCapacity", weight: 0.07 },
            { path: "military.sealiftCapacity", weight: 0.07 },
        ],
        // Capital-intensive and slow: hulls, airframes and trained formations are
        // procured over years, and the same inertia is why a drawdown takes years
        // to show up as an absence.
        gain: 11,
        sustainAtFull: 0.018,
    },
    domestic: {
        name: "Domestic policy",
        summary: "Health, labor, housing, schools and veterans — everything the government delivers to the people who live in it.",
        // Not a nation stat. What the domestic line buys is the executive branch's
        // own capacity to deliver, which lives on the institutions rather than on
        // the country, so this account declares no stat targets and is read on its
        // own terms by `accountLevel` — the same shape the stabilization fund already
        // has. `headline` names a figure nothing downstream reads for this account,
        // for the reason the fund's does: so no consumer has to special-case a
        // missing one.
        headline: "softPower.diplomaticReach",
        targets: [],
        gain: 0,
        sustainAtFull: DOMESTIC_SUSTAIN_AT_FULL,
    },
};
/** An account's name as it reads inside a sentence: lower case, unless it is the name of an institution. */
export const accountNameInSentence = (account) => BUDGET_ACCOUNT_SPECS[account].properNoun ? BUDGET_ACCOUNT_SPECS[account].name : BUDGET_ACCOUNT_SPECS[account].name.toLowerCase();
/**
 * Money into reserves, per unit of net annual GDP share.
 *
 * An appropriation to the fund is a transfer rather than a purchase, so it goes
 * in at par: a percent of GDP moved out of the treasury is a percent of GDP
 * added to reserves. What makes it a real choice is that the treasury is what
 * everything else — orders, enactments, the rest of the appropriation — is paid
 * out of, and reserves are not.
 */
export const RESERVE_TRANSFER_RATE = 1;
// --- Reading the appropriation. -------------------------------------------
const round4 = (value) => Math.round(value * 10_000) / 10_000 + 0;
/**
 * What the accounts can actually spend: the appropriation less the share a
 * special message is holding back. The standing book is `selectBudget`; this
 * is the figure the outlook and the weekly spend are drawn from, so money
 * withheld under the Impoundment Control Act stops building the account the
 * week it is held and resumes the week it is released.
 */
export function selectSpendableBudget(campaign) {
    const standing = selectBudget(campaign);
    return Object.fromEntries(BUDGET_ACCOUNTS.map((account) => [account, round4(Math.max(0, standing[account] - withheldShare(campaign, account)))]));
}
export function selectBudget(campaign) {
    const held = campaign.player.budget ?? {};
    return Object.fromEntries(BUDGET_ACCOUNTS.map((account) => [account, clampShare(held[account] ?? 0, accountCap(campaign, account))]));
}
// Clamped on read rather than only on the way in, which is what makes an
// authorization's expiry bite: an account funded above the standing cap under
// last year's authorization falls back to it the week that act lapses, with
// nobody having to re-vote anything.
function clampShare(value, cap) {
    return Number.isFinite(value) ? Math.max(0, Math.min(cap, value)) : 0;
}
export function budgetStatValue(stats, path) {
    const parts = path.split(".");
    let node = stats;
    for (const part of parts)
        node = node[part];
    return node;
}
/**
 * How much of an account has actually been built, 0..1 — the figure its
 * sustainment is priced against.
 *
 * Weighted across the account's own targets rather than taken from the headline
 * alone, so a defense establishment that has poured everything into readiness
 * and nothing into lift is correctly read as half-built and costs half as much
 * to hold.
 */
export function accountLevel(runtime, account, branchAdequacy = FUNDED_BUDGET_ADEQUACY) {
    if (account === "domestic")
        return branchAdequacy;
    const spec = BUDGET_ACCOUNT_SPECS[account];
    if (spec.targets.length === 0)
        return economicLevel(runtime);
    return round3(spec.targets.reduce((total, target) => total + target.weight * budgetStatValue(runtime.stats, target.path), 0));
}
/**
 * The stabilization fund's own 0..1 reading: reserves against a full year of
 * imports, the standard measure of whether a country can take a hit and keep
 * paying for what it needs. Capped at 1 — beyond a year of cover, more reserves
 * buy standing rather than survival.
 */
function economicLevel(runtime) {
    const imports = Math.max(1, runtime.stats.trade.imports);
    return round3(Math.min(1, runtime.stats.economy.reserves / imports));
}
/**
 * What the minister responsible delivers, on the same band policy execution
 * runs on: an appropriation is carried out by a ministry, and a ministry is
 * only as good as whoever is sitting in the chair.
 *
 * Statecraft accounts are instruments, so the chair is the one `stewardship.ts`
 * already matches an instrument to — including the charters that fold
 * intelligence into the interior portfolio rather than seating a director of
 * its own. The domestic line's chair is matched there too, against the
 * secretaries who actually run it; where the ownership table splits a line,
 * each secretary prices only the share their department spends.
 */
export function appropriationQuality(campaign, account) {
    const departments = accountDepartments(campaign.founding.charter, account);
    if (!departments)
        return round3(holderQuality(budgetChair(campaign, account)));
    return round3(departments.reduce((sum, line) => sum + line.share * holderQuality(selectChairRunner(campaign, line.role)), 0));
}
function holderQuality(holder) {
    return holder && holder.alive ? CARETAKER_QUALITY + POLICY_QUALITY_RANGE * holder.base.competence : CARETAKER_QUALITY;
}
function playerRuntime(campaign) {
    return selectNation(campaign, campaign.founding.nation);
}
/**
 * A movement is delivered by a ministry and paid for by a government, so
 * competence scales what is built and never what a drawdown costs — the same
 * asymmetry policy execution applies. A weak defense minister buys fewer ships
 * and scraps exactly as many.
 */
export function movement(netShare, gain, quality) {
    const raw = netShare * gain * POLICY_TURN_SHARE;
    return raw > 0 ? raw * quality : raw;
}
/**
 * A week of the domestic line, as movement in the figure the account is read
 * by: the executive branch walks toward the level this appropriation settles it
 * at, at the rate `institutionTick` actually moves a body. Quoted rather than
 * derived from a gain, because the domestic line does not buy a stat — it sets
 * a level, and the branch takes weeks to get there.
 */
function domesticHeadlineDelta(campaign, level, netShare) {
    // Through the apportionment, so the figure the budget room quotes for the
    // domestic line is the level the branch will actually settle at rather than
    // the one the vote would buy if OMB were perfect.
    const settled = settledFromNetShare(netShare, apportionmentShare(campaign));
    const step = Math.min(LAPSE_BUDGET_RECOVERY, Math.abs(settled - level));
    return round4(settled >= level ? step : -step);
}
/** One line of the appropriation, priced and projected against live stats. */
export function budgetLine(campaign, account, allocation, runtime, gdp) {
    const spec = BUDGET_ACCOUNT_SPECS[account];
    const share = clampShare(allocation[account], accountCap(campaign, account));
    const level = accountLevel(runtime, account, branchBudgetAdequacy(campaign));
    const sustainShare = round4(spec.sustainAtFull * level);
    const netShare = round4(share - sustainShare);
    const quality = appropriationQuality(campaign, account);
    const minister = budgetChair(campaign, account)?.base.name;
    const headlineValue = account === "economic" || account === "domestic" ? level : budgetStatValue(runtime.stats, spec.headline);
    const headlineDelta = account === "domestic"
        ? domesticHeadlineDelta(campaign, level, netShare)
        : account === "economic"
            ? 0
            : round4(movement(netShare, spec.gain, quality) *
                (spec.targets.find((t) => t.path === spec.headline)?.weight ?? 1));
    return {
        account,
        spec,
        share,
        sustainShare,
        netShare,
        turnCost: Math.round(netShare * gdp * POLICY_TURN_SHARE),
        level,
        headlineValue: round3(headlineValue),
        quality,
        ...(minister ? { minister } : {}),
        headlineDelta,
        direction: netShare > 0.0001 ? "building" : netShare < -0.0001 ? "drawing down" : "holding",
    };
}
/**
 * The standing appropriation, account by account, with what each is worth per
 * turn — computed once here so the budget screen previews exactly the figures
 * the turn phase then applies, rather than a second calculation that could
 * disagree with it.
 */
export function selectBudgetOutlook(campaign, allocation = selectSpendableBudget(campaign)) {
    const runtime = playerRuntime(campaign);
    const gdp = runtime?.stats.economy.gdp ?? 0;
    const lines = runtime
        ? BUDGET_ACCOUNTS.map((account) => budgetLine(campaign, account, allocation, runtime, gdp))
        : [];
    const turnCost = lines.reduce((total, line) => total + line.turnCost, 0);
    return {
        lines,
        totalShare: round4(lines.reduce((total, line) => total + line.share, 0)),
        // How long the stock carries the draft is `selectSolvency`'s reading, net of
        // the week's own apportionment; a gross figure here read every funded
        // government as running dry.
        turnCost,
        gdp,
    };
}
// --- The turn phase: a week of the budget. -----------------------------
// One nested literal per path, so the compiler checks each patch against the
// stats and the type of every write names the field it moves.
const BUDGET_STAT_PATCH = {
    "softPower.diplomaticReach": (value) => ({ softPower: { diplomaticReach: value } }),
    "softPower.culturalReach": (value) => ({ softPower: { culturalReach: value } }),
    "security.intelCapability": (value) => ({ security: { intelCapability: value } }),
    "security.counterIntel": (value) => ({ security: { counterIntel: value } }),
    "military.readiness": (value) => ({ military: { readiness: value } }),
    "military.doctrineQuality": (value) => ({ military: { doctrineQuality: value } }),
    "military.branchStrength.land": (value) => ({ military: { branchStrength: { land: value } } }),
    "military.branchStrength.air": (value) => ({ military: { branchStrength: { air: value } } }),
    "military.branchStrength.naval": (value) => ({ military: { branchStrength: { naval: value } } }),
    "military.branchStrength.cyber": (value) => ({ military: { branchStrength: { cyber: value } } }),
    "military.airliftCapacity": (value) => ({ military: { airliftCapacity: value } }),
    "military.sealiftCapacity": (value) => ({ military: { sealiftCapacity: value } }),
};
function statEffect(nation, path, current, delta) {
    const [min, max] = BUDGET_STAT_RANGES[path];
    const next = Math.max(min, Math.min(max, current + delta));
    return { kind: "nationStat", nation, setStats: BUDGET_STAT_PATCH[path](next) };
}
/**
 * How much of a stability point an unfunded week of budget costs, per unit
 * of the shortfall as a share of GDP.
 *
 * A government that cannot pay its own establishment is not merely poorer; it
 * is a government whose soldiers and stations find out. This is the only place
 * insolvency reaches the player as something other than a number that stopped
 * moving.
 */
export const ARREARS_STABILITY_COST = 1.2;
/**
 * One week of the standing appropriation.
 *
 * Runs after the policy phase, because a program and an appropriation both
 * touch the treasury and the order has to be fixed: the country is governed
 * first, and what is left over is what the budget is actually drawn on.
 */
export const budgetPhase = (state) => {
    // The week's spend is drawn on the book as the releases leave it, so the
    // impoundment changes are applied to a working snapshot before it is read.
    const releases = impoundmentPackets(state);
    const working = releases.reduce((acc, packet) => apply(acc, packet), state);
    return [...releases, ...spendingPackets(working)];
};
function spendingPackets(state) {
    const runtime = playerRuntime(state);
    if (!runtime)
        return [];
    const outlook = selectBudgetOutlook(state);
    const moving = outlook.lines.some((line) => line.netShare !== 0);
    if (!moving)
        return [];
    // What the treasury can actually carry this week. Building above the
    // inherited line is a claim on money that may not be there, and the shortfall
    // is not silently forgiven: the funded fraction is what gets built, and the
    // arrears are paid in stability instead. A drawdown is never rationed — a
    // government that cuts is not short of the money it is no longer spending.
    const treasury = state.player.metrics.treasury;
    // A lapsed appropriation obligates nothing, so no line builds and nothing is owed: the shutdown bills the lapse.
    const lapsed = inShutdown(state);
    const funded = lapsed ? 0 : outlook.turnCost > 0 ? Math.max(0, Math.min(1, treasury / outlook.turnCost)) : 1;
    const spent = Math.round(outlook.turnCost * funded);
    const shortfall = lapsed ? 0 : Math.max(0, outlook.turnCost - spent);
    const totals = new Map();
    let reserveDelta = 0;
    for (const line of outlook.lines) {
        const netShare = line.netShare > 0 ? line.netShare * funded : line.netShare;
        if (line.account === "economic") {
            // A transfer, not a purchase: money out of the treasury is money into
            // the fund at par, and no minister's competence changes what a wire
            // transfer is worth.
            reserveDelta += netShare * RESERVE_TRANSFER_RATE * POLICY_TURN_SHARE * outlook.gdp;
            continue;
        }
        for (const target of line.spec.targets) {
            const delta = movement(netShare, line.spec.gain, line.quality) * target.weight;
            totals.set(target.path, (totals.get(target.path) ?? 0) + delta);
        }
    }
    const effects = [];
    for (const [path, delta] of totals) {
        if (Math.abs(delta) < 1e-9)
            continue;
        effects.push(statEffect(runtime.base.id, path, budgetStatValue(runtime.stats, path), delta));
    }
    if (Math.abs(reserveDelta) >= 1) {
        effects.push({
            kind: "nationStat",
            nation: runtime.base.id,
            setStats: { economy: { reserves: Math.max(0, Math.round(runtime.stats.economy.reserves + reserveDelta)) } },
        });
    }
    const metricDeltas = {};
    if (spent !== 0)
        metricDeltas.treasury = -spent;
    if (shortfall > 0) {
        // Annualized before it is read as a share of national income: a week's
        // arrears is a small number against a year's GDP, and the thing the
        // country is actually living through is the rate, not the week.
        const annualShortfall = shortfall / POLICY_TURN_SHARE;
        metricDeltas.stability = -round3((annualShortfall / Math.max(1, outlook.gdp)) * ARREARS_STABILITY_COST);
    }
    if (Object.keys(metricDeltas).length > 0)
        effects.push({ kind: "metric", deltas: metricDeltas });
    if (shortfall > 0) {
        effects.push({
            kind: "feed",
            items: [
                {
                    turn: state.turn + 1,
                    kind: "press",
                    visibility: "public",
                    headline: "The budget goes unpaid: departments are told the money voted to them is not there.",
                },
            ],
        });
    }
    if (effects.length === 0)
        return [];
    return [
        {
            source: "simulate",
            actor: "player",
            turn: state.turn + 1,
            background: true, // the appropriation spending itself is the government's machinery, not the President's act
            narration: { summary: phaseSummary(outlook, shortfall > 0) },
            effects,
        },
    ];
}
function phaseSummary(outlook, unfunded) {
    if (unfunded)
        return "The budget outruns the treasury, and the establishment is told to wait for its money.";
    const building = outlook.lines.filter((line) => line.direction === "building");
    const falling = outlook.lines.filter((line) => line.direction === "drawing down");
    if (building.length === 0 && falling.length === 0)
        return "The budget holds the establishment exactly where it stands.";
    if (building.length === 0) {
        return `${sentenceCase(sentenceList(falling.map((line) => accountNameInSentence(line.account))))} ${falling.length === 1 ? "loses" : "lose"} another week to the drawdown.`;
    }
    const built = sentenceList(building.map((line) => accountNameInSentence(line.account)));
    return falling.length === 0
        ? `Another week of building: ${built}.`
        : `Another week of building ${built}, paid for out of ${sentenceList(falling.map((line) => accountNameInSentence(line.account)))}.`;
}
function sentenceList(items) {
    if (items.length === 0)
        return "";
    if (items.length === 1)
        return items[0];
    return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
