import { selectNation } from "./state.js";
import { MILITARY_READINESS_GATES } from "./capacity.js";
import { round3 } from "./policy.js";
import { BUDGET_ACCOUNT_SPECS, budgetLine, budgetStatValue, movement, selectSpendableBudget, } from "./budget.js";
/**
 * How long the standing appropriation needs to reach a capability figure.
 *
 * The whole point of the account is that a player can see the answer before
 * they commit a term to it: "sixty-one weeks" is a plan, and "unreachable" was
 * the bug.
 */
export function turnsToReach(campaign, account, path, required, allocation = selectSpendableBudget(campaign)) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return { account, path, current: 0, required };
    const current = budgetStatValue(runtime.stats, path);
    if (current >= required)
        return { account, path, current: round3(current), required, turns: 0 };
    const spec = BUDGET_ACCOUNT_SPECS[account];
    const weight = spec.targets.find((target) => target.path === path)?.weight ?? 0;
    const gdp = runtime.stats.economy.gdp;
    const line = budgetLine(campaign, account, allocation, runtime, gdp);
    const perTurn = movement(line.netShare, spec.gain, line.quality) * weight;
    if (perTurn <= 0)
        return { account, path, current: round3(current), required };
    return {
        account,
        path,
        current: round3(current),
        required,
        turns: Math.ceil((required - current) / perTurn),
    };
}
/**
 * The capability figure each rung of the ladder is gated on, declared so a
 * screen can say what an appropriation is *for*.
 *
 * The gates themselves live in `instruments.ts` as closures over live state,
 * which is right for resolving an attempt and useless for planning one: a
 * player cannot read a closure. This is the same requirement in a form the
 * budget can be steered by, and `budget.test.ts` proves the two agree by
 * building a campaign to each threshold and asserting the rung it names opens.
 *
 * Only the rungs gated on something an appropriation can move are listed. A
 * blockade needs a coastal target and an embargo needs trade to withhold;
 * neither is a thing money buys, and pretending otherwise on the budget screen
 * would be a promise the ladder does not keep.
 */
export const CAPABILITY_MILESTONES = [
    { account: "diplomatic", rung: 2, name: "Public Statement", path: "softPower.diplomaticReach", required: 0.2 },
    { account: "diplomatic", rung: 3, name: "Recall Ambassador", path: "softPower.diplomaticReach", required: 0.35 },
    { account: "diplomatic", rung: 4, name: "Coalition Pressure", path: "softPower.diplomaticReach", required: 0.5 },
    { account: "diplomatic", rung: 5, name: "Sever Relations", path: "softPower.diplomaticReach", required: 0.65 },
    { account: "covert", rung: 2, name: "Influence Operation", path: "security.intelCapability", required: 0.25 },
    { account: "covert", rung: 3, name: "Sabotage", path: "security.intelCapability", required: 0.4 },
    { account: "covert", rung: 4, name: "Proxy Support", path: "security.intelCapability", required: 0.5 },
    { account: "covert", rung: 5, name: "Covert Regime Action", path: "security.intelCapability", required: 0.65 },
    { account: "military", rung: 3, name: "Blockade", path: "military.branchStrength.naval", required: 0.3 },
    { account: "military", rung: 4, name: "Limited Strike", path: "military.branchStrength.air", required: 0.4 },
    { account: "military", rung: 5, name: "Expeditionary Invasion", path: "military.branchStrength.land", required: 0.5 },
    // The military rungs are gated twice, and the second gate is the one that
    // moves. Branch strength says what the services *are* and is the same figure
    // after a year of fighting as before it; readiness says what is available
    // now, is spent by every rung that reads it, and comes back at the rate
    // `forces.ts` regenerates it. A defense establishment therefore buys tempo
    // rather than a permanent license, which is the fact the budget screen has
    // to be able to state — an appropriation that cannot say "this is what pays
    // for the next strike" is an appropriation nobody can steer by.
    { account: "military", rung: 3, name: "Blockade", path: "military.readiness", required: MILITARY_READINESS_GATES[3] },
    { account: "military", rung: 4, name: "Limited Strike", path: "military.readiness", required: MILITARY_READINESS_GATES[4] },
    { account: "military", rung: 5, name: "Expeditionary Invasion", path: "military.readiness", required: MILITARY_READINESS_GATES[5] },
];
/**
 * What each capability is called in the words a player is choosing in.
 *
 * A rung is gated on one specific figure inside an account, which is not
 * always the account's headline: a limited strike wants air strength, and
 * quoting the defense establishment's readiness beside it names a number that
 * has nothing to do with the requirement.
 */
export const CAPABILITY_LABELS = {
    "softPower.diplomaticReach": "diplomatic reach",
    "softPower.culturalReach": "cultural reach",
    "security.intelCapability": "intelligence capability",
    "security.counterIntel": "counter-intelligence",
    "military.readiness": "readiness",
    "military.doctrineQuality": "doctrine",
    "military.branchStrength.land": "land strength",
    "military.branchStrength.air": "air strength",
    "military.branchStrength.naval": "naval strength",
    "military.branchStrength.cyber": "cyber strength",
    "military.airliftCapacity": "airlift",
    "military.sealiftCapacity": "sealift",
};
/**
 * The next rung this account is climbing toward, with how long the standing
 * appropriation needs to open it — the reading that turns a share of GDP into
 * a plan a small country can hold a term against.
 */
export function nextMilestone(campaign, account, allocation = selectSpendableBudget(campaign)) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return undefined;
    const pending = CAPABILITY_MILESTONES.filter((milestone) => milestone.account === account && budgetStatValue(runtime.stats, milestone.path) < milestone.required).sort((a, b) => a.rung - b.rung)[0];
    if (!pending)
        return undefined;
    return {
        ...turnsToReach(campaign, account, pending.path, pending.required, allocation),
        rung: pending.rung,
        name: pending.name,
    };
}
