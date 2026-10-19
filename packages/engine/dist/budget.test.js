import { withStandingFinding } from "./finding-testing.js";
import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { ACCOUNT_CAP, CAPABILITY_MILESTONES, nextMilestone, BUDGET_ACCOUNTS, BUDGET_ACCOUNT_SPECS, STATECRAFT_ACCOUNTS, BUDGET_STAT_RANGES, budgetPhase, budgetStatValue, inheritedBudget, selectBudget, selectBudgetOutlook, turnsToReach } from "./budget.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { enactBudget, projectBudgetDraft } from "./budget-draft.js";
import { landRung } from "./__fixtures__/ladder.js";
import { createRngStreams } from "./rng.js";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { SHUTDOWN_GRACE_TURNS, branchBudgetAdequacy, inShutdown } from "./funding.js";
import { institutionPhase } from "./institutions.js";
const FOREIGN = "role-foreign-minister";
const TREASURY = "role-treasury-minister";
const DEFENSE = "role-defense-minister";
const INTELLIGENCE = "role-intelligence-director";
const ALL_CHAIRS = [FOREIGN, TREASURY, DEFENSE, INTELLIGENCE];
function withChairs(roles = ALL_CHAIRS, competence = 0.5) {
    return roles.reduce((campaign, role) => {
        const holder = { ...person, id: `PER-${role}`, competence, eligibleRoles: [role] };
        return {
            ...campaign,
            founding: { ...campaign.founding, cabinet: { ...campaign.founding.cabinet, [role]: holder.id } },
            people: { ...campaign.people, [holder.id]: { base: holder, alive: true, currentRole: role } },
            player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: holder.id } },
        };
    }, buildCampaign());
}
function withBudget(campaign, draft) {
    const projected = projectBudgetDraft(campaign, draft);
    if (!projected.ok)
        throw new Error(projected.reason);
    const enacted = enactBudget(campaign, projected.candidate);
    if (!enacted.ok)
        throw new Error(enacted.reason);
    return apply(campaign, enacted.packet);
}
/** Run `turns` weeks of nothing but the budget. */
function runWeeks(campaign, turns) {
    let state = campaign;
    for (let i = 0; i < turns; i += 1) {
        state = budgetPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        state = { ...state, turn: state.turn + 1 };
    }
    return state;
}
function stat(campaign, path) {
    return budgetStatValue(campaign.nations[campaign.founding.nation].stats, path);
}
describe("the appropriation's shape", () => {
    it("runs one account per instrument, plus the one line that is not an instrument", () => {
        expect([...STATECRAFT_ACCOUNTS].sort()).toEqual(["covert", "diplomatic", "economic", "military"]);
        expect([...BUDGET_ACCOUNTS].sort()).toEqual(["covert", "diplomatic", "domestic", "economic", "military"]);
    });
    it("distributes a fixed quantity of institution across each account's own parts", () => {
        for (const account of BUDGET_ACCOUNTS) {
            const spec = BUDGET_ACCOUNT_SPECS[account];
            if (spec.targets.length === 0)
                continue;
            const total = spec.targets.reduce((sum, target) => sum + target.weight, 0);
            expect(total, account).toBeCloseTo(1, 6);
            for (const target of spec.targets) {
                expect(BUDGET_STAT_RANGES[target.path], `${account} -> ${target.path}`).toBeDefined();
            }
        }
    });
    it("opens a founding on nothing appropriated of its own", () => {
        const campaign = buildCampaign();
        // Statecraft only. The domestic line opens at its own sustainment, because
        // an unfunded domestic line is not "nothing appropriated yet" — it is a
        // government that has abolished its own departments.
        for (const account of STATECRAFT_ACCOUNTS)
            expect(selectBudget(campaign)[account]).toBe(0);
        expect(inheritedBudget().domestic).toBe(0);
    });
    it("refuses an account larger than the cap, and a negative one", () => {
        const campaign = withChairs();
        expect(projectBudgetDraft(campaign, { covert: ACCOUNT_CAP + 0.01 }).ok).toBe(false);
        expect(projectBudgetDraft(campaign, { covert: -0.01 }).ok).toBe(false);
        expect(projectBudgetDraft(campaign, { covert: ACCOUNT_CAP }).ok).toBe(true);
    });
    it("refuses an appropriation that changes nothing", () => {
        const campaign = withChairs();
        const projected = projectBudgetDraft(campaign, { covert: 0 });
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            return;
        expect(enactBudget(campaign, projected.candidate).ok).toBe(false);
    });
});
describe("what an appropriation buys", () => {
    it("builds the capability it funds, week after week", () => {
        const campaign = withBudget(withChairs(), { covert: 0.02 });
        const before = stat(campaign, "security.intelCapability");
        const after = runWeeks(campaign, TURNS_PER_YEAR);
        expect(stat(after, "security.intelCapability")).toBeGreaterThan(before);
        expect(stat(after, "security.counterIntel")).toBeGreaterThan(0.4);
    });
    it("draws it down when the appropriation falls below what holding it costs", () => {
        const campaign = withChairs();
        const after = runWeeks(campaign, TURNS_PER_YEAR * 2);
        // Nothing voted, so every account runs below its own sustainment line and
        // the establishment shrinks. This is the "make things worse" direction the
        // player can choose on purpose.
        expect(stat(after, "security.intelCapability")).toBeLessThan(0.4);
        expect(stat(after, "military.readiness")).toBeLessThan(stat(campaign, "military.readiness"));
    });
    it("holds an account exactly steady at its sustainment line", () => {
        const campaign = withChairs();
        const outlook = selectBudgetOutlook(campaign);
        const covert = outlook.lines.find((line) => line.account === "covert");
        const held = withBudget(campaign, { covert: covert.sustainShare });
        const after = runWeeks(held, TURNS_PER_YEAR);
        expect(stat(after, "security.intelCapability")).toBeCloseTo(0.4, 2);
    });
    it("charges the treasury every week it is in force", () => {
        const campaign = withBudget(withChairs(), { military: 0.03 });
        const outlook = selectBudgetOutlook(campaign);
        expect(outlook.turnCost).toBeGreaterThan(0);
        const after = runWeeks(campaign, 1);
        expect(after.player.metrics.treasury).toBe(campaign.player.metrics.treasury - outlook.turnCost);
    });
    it("moves money into the stabilization fund at par rather than buying a rating", () => {
        const campaign = withBudget(withChairs(), { economic: 0.02 });
        const before = campaign.nations[campaign.founding.nation].stats.economy.reserves;
        const after = runWeeks(campaign, TURNS_PER_YEAR);
        expect(after.nations[after.founding.nation].stats.economy.reserves).toBeGreaterThan(before);
    });
});
// The economic account is the Treasury's Exchange Stabilization Fund, which is
// where the United States actually holds its reserves. Every surface reads the
// spec's name, so the ledger's weekly line and the budget room's row are what
// has to say it, capitals and all.
describe("the Exchange Stabilization Fund", () => {
    it("is the name the budget room's row and the week's ledger line both read", () => {
        const building = withBudget(withChairs(), { economic: 0.02 });
        const line = selectBudgetOutlook(building).lines.find((entry) => entry.account === "economic");
        expect(line.spec.name).toBe("Exchange Stabilization Fund");
        const [packet] = budgetPhase(building);
        expect(packet.narration.summary).toContain("Exchange Stabilization Fund");
        expect(packet.narration.summary).not.toMatch(/sovereign fund/i);
    });
    it("files the standing appropriation as the government's machinery, not the President's act", () => {
        const [packet] = budgetPhase(withBudget(withChairs(), { economic: 0.02 }));
        expect(packet.background).toBe(true);
    });
});
// A shutdown is a lapse of the appropriation itself. The building a budget
// line does is an obligation, and the statute the engine enforces on every
// other spending path says none may be made: a hawk whose acts had run the
// forces down kept drawing down authority to rebuild them through twelve weeks
// with nothing apportioned, and ended the year with none left.
describe("a lapsed appropriation", () => {
    const closed = (campaign) => ({
        ...campaign,
        congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.turn - SHUTDOWN_GRACE_TURNS - 1 } },
    });
    it("builds nothing, spends nothing and owes nothing, because the shutdown bills the lapse", () => {
        const building = withBudget(withChairs(), { military: ACCOUNT_CAP });
        expect(inShutdown(closed(building))).toBe(true);
        const [open] = budgetPhase(building);
        const [shut] = budgetPhase(closed(building));
        const metricsOf = (packet) => packet?.effects.find((effect) => effect.kind === "metric");
        expect(metricsOf(open)).toBeDefined();
        expect(metricsOf(shut)).toBeUndefined();
        const readiness = (campaign) => stat(campaign, "military.readiness");
        expect(readiness(apply(building, open))).toBeGreaterThan(readiness(building));
        expect(readiness(shut ? apply(closed(building), shut) : closed(building))).toBeLessThanOrEqual(readiness(building));
    });
});
describe("paying for it", () => {
    it("buys only what it can fund, and pays the arrears in stability", () => {
        const broke = (() => {
            const base = withBudget(withChairs(), { military: ACCOUNT_CAP, covert: ACCOUNT_CAP });
            return { ...base, player: { ...base.player, metrics: { ...base.player.metrics, treasury: 5 } } };
        })();
        const after = runWeeks(broke, 1);
        expect(after.player.metrics.treasury).toBeLessThanOrEqual(5);
        expect(after.player.metrics.stability).toBeLessThan(broke.player.metrics.stability);
        // Money it did not have buys nothing: the week the budget goes unpaid is
        // a week the establishment does not grow, however large the vote was.
        expect(stat(after, "military.readiness")).toBeCloseTo(stat(broke, "military.readiness"), 3);
        const solvent = runWeeks(withBudget(withChairs(), { military: ACCOUNT_CAP, covert: ACCOUNT_CAP }), 1);
        expect(stat(solvent, "military.readiness")).toBeGreaterThan(stat(after, "military.readiness"));
    });
    it("leaves how long the authority carries the budget to the solvency reading", () => {
        const campaign = withBudget(withChairs(), { military: 0.02 });
        const outlook = selectBudgetOutlook(campaign);
        expect(outlook.turnCost).toBeGreaterThan(0);
        expect("turnsFunded" in outlook).toBe(false);
    });
});
describe("the ministry carrying it", () => {
    it("builds faster under a competent minister and draws down at the same rate regardless", () => {
        const able = withBudget(withChairs(ALL_CHAIRS, 1), { covert: 0.02 });
        const weak = withBudget(withChairs(ALL_CHAIRS, 0), { covert: 0.02 });
        expect(stat(runWeeks(able, TURNS_PER_YEAR), "security.intelCapability")).toBeGreaterThan(stat(runWeeks(weak, TURNS_PER_YEAR), "security.intelCapability"));
        const ableCut = withChairs(ALL_CHAIRS, 1);
        const weakCut = withChairs(ALL_CHAIRS, 0);
        expect(stat(runWeeks(ableCut, TURNS_PER_YEAR), "security.intelCapability")).toBeCloseTo(stat(runWeeks(weakCut, TURNS_PER_YEAR), "security.intelCapability"), 6);
    });
});
describe("the horizon a small country can actually plan against", () => {
    it("answers how many weeks the standing appropriation needs to open a rung", () => {
        const campaign = withBudget(withChairs(), { covert: 0.025 });
        const horizon = turnsToReach(campaign, "covert", "security.intelCapability", 0.65);
        expect(horizon.turns).toBeDefined();
        expect(horizon.turns).toBeGreaterThan(0);
        // A term is roughly four years of weeks. A capability two rungs above where
        // the country starts has to be reachable inside one, or the appropriation
        // is a number rather than a plan.
        expect(horizon.turns).toBeLessThan(TURNS_PER_YEAR * 4);
    });
    it("says a requirement is not being approached rather than quoting a number for it", () => {
        const campaign = withChairs();
        expect(turnsToReach(campaign, "covert", "security.intelCapability", 0.65).turns).toBeUndefined();
    });
    it("actually opens a rung the country began the campaign locked out of", () => {
        const funded = withChairs(ALL_CHAIRS, 0.8);
        const campaign = withBudget({ ...funded, player: { ...funded.player, metrics: { ...funded.player.metrics, treasury: 20_000 } } }, { covert: ACCOUNT_CAP });
        const streams = createRngStreams(campaign.seed);
        const target = "ALP";
        const before = landRung(withStandingFinding(campaign, target), campaign.founding.nation, target, "covert", 5, streams);
        expect(before.ok).toBe(false);
        const grown = runWeeks(campaign, TURNS_PER_YEAR * 3);
        const after = landRung(withStandingFinding(grown, target), grown.founding.nation, target, "covert", 5, streams);
        expect(after.ok).toBe(true);
    });
});
describe("the milestones a budget screen steers by", () => {
    // A declared threshold that has drifted from the gate it claims to describe
    // is worse than no threshold at all: the screen would promise a rung the
    // ladder still refuses. Each one is proved against the real gate.
    // Only the refusal is asserted, not the opening: several of these rungs
    // carry a second gate money cannot move (a coastal target, lift, tradecraft),
    // so "at the threshold it opens" is not true of the ladder and must not be
    // claimed here. What has to hold is that the figure is genuinely binding.
    it("names a real gate: one point below the declared figure, the rung refuses", () => {
        for (const milestone of CAPABILITY_MILESTONES) {
            const base = withChairs(ALL_CHAIRS, 0.5);
            const streams = createRngStreams(base.seed);
            const target = "ALP";
            const at = (value) => {
                const runtime = base.nations[base.founding.nation];
                const parts = milestone.path.split(".");
                const stats = structuredClone(runtime.stats);
                let node = stats;
                for (const key of parts.slice(0, -1))
                    node = node[key];
                node[parts.at(-1)] = value;
                return {
                    ...base,
                    nations: { ...base.nations, [base.founding.nation]: { ...runtime, stats: stats } },
                };
            };
            const below = landRung(at(milestone.required - 0.01), base.founding.nation, target, milestone.account, milestone.rung, streams);
            expect(below.ok, `${milestone.account} rung ${milestone.rung} below threshold`).toBe(false);
        }
    });
    it("points an account at the next rung it has not opened yet", () => {
        const campaign = withBudget(withChairs(), { covert: 0.03 });
        const next = nextMilestone(campaign, "covert");
        // The fixture opens at intel 0.4, so sabotage is already open and the next
        // thing money buys is proxy support.
        expect(next?.name).toBe("Proxy Support");
        expect(next?.turns).toBeGreaterThan(0);
    });
    it("has nothing left to point at once every rung is open", () => {
        const base = withChairs();
        const runtime = base.nations[base.founding.nation];
        const maxed = {
            ...base,
            nations: {
                ...base.nations,
                [base.founding.nation]: {
                    ...runtime,
                    stats: { ...runtime.stats, security: { ...runtime.stats.security, intelCapability: 1, counterIntel: 1 } },
                },
            },
        };
        expect(nextMilestone(maxed, "covert")).toBeUndefined();
    });
});
describe("the phase's record", () => {
    it("says nothing at all when there is nothing appropriated and nothing to lose", () => {
        // Every account already at zero capability: no sustainment owed, nothing
        // bought, so the week has no entry to write.
        const base = withChairs();
        const flattened = {
            ...base,
            nations: {
                ...base.nations,
                [base.founding.nation]: {
                    ...base.nations[base.founding.nation],
                    stats: {
                        ...base.nations[base.founding.nation].stats,
                        economy: { ...base.nations[base.founding.nation].stats.economy, reserves: 0 },
                        security: { ...base.nations[base.founding.nation].stats.security, intelCapability: 0, counterIntel: 0 },
                        softPower: { ...base.nations[base.founding.nation].stats.softPower, diplomaticReach: 0, culturalReach: 0 },
                        military: {
                            ...base.nations[base.founding.nation].stats.military,
                            readiness: 0,
                            doctrineQuality: 0,
                            branchStrength: { land: 0, air: 0, naval: 0, cyber: 0, space: 0 },
                            airliftCapacity: 0,
                            sealiftCapacity: 0,
                        },
                    },
                },
            },
        };
        expect(budgetPhase(flattened)).toHaveLength(0);
    });
    it("narrates a week of building as a week of building", () => {
        const campaign = withBudget(withChairs(), { covert: 0.03 });
        const [packet] = budgetPhase(campaign);
        expect(packet.narration.summary).toContain("building");
    });
});
describe("the domestic line", () => {
    /** Where the executive branch's money actually stands, as the account reads it. */
    const adequacy = (campaign) => branchBudgetAdequacy(campaign);
    /** Run `turns` weeks of the executive branch's own life and nothing else. */
    function runBranch(campaign, turns) {
        let state = campaign;
        for (let i = 0; i < turns; i += 1) {
            state = institutionPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        }
        return state;
    }
    it("is an account and not an instrument", () => {
        expect(BUDGET_ACCOUNTS).toContain("domestic");
        expect(STATECRAFT_ACCOUNTS).not.toContain("domestic");
        // Nothing on any ladder gates on it, so it must never claim a milestone.
        // `CAPABILITY_MILESTONES` is typed to `StatecraftAccount`, which makes that
        // a build error rather than a runtime one; what is left to check here is
        // that every milestone really does name an account the four still contain.
        for (const milestone of CAPABILITY_MILESTONES) {
            expect(STATECRAFT_ACCOUNTS).toContain(milestone.account);
        }
        expect(nextMilestone(withChairs(), "domestic")).toBeUndefined();
    });
    it("reads the executive branch's own money rather than a nation stat", () => {
        const campaign = withChairs();
        const line = selectBudgetOutlook(campaign).lines.find((entry) => entry.account === "domestic");
        expect(line.headlineValue).toBeCloseTo(adequacy(campaign), 3);
    });
    it("costs nothing and changes nothing at the share that holds the branch where it is", () => {
        const campaign = withChairs();
        const line = selectBudgetOutlook(campaign).lines.find((entry) => entry.account === "domestic");
        expect(line.netShare).toBeCloseTo(0, 4);
        expect(line.turnCost).toBe(0);
        expect(line.direction).toBe("holding");
        const after = runBranch(campaign, TURNS_PER_YEAR);
        expect(adequacy(after)).toBeCloseTo(adequacy(campaign), 2);
    });
    it("starves the branch's delivery when the money is taken away, and pays a dividend for it", () => {
        const campaign = withChairs();
        const cut = withBudget(campaign, { domestic: 0 });
        const line = selectBudgetOutlook(cut).lines.find((entry) => entry.account === "domestic");
        // Money the state stops spending comes back to the treasury weekly.
        expect(line.turnCost).toBeLessThan(0);
        const after = runBranch(cut, TURNS_PER_YEAR);
        expect(adequacy(after)).toBeLessThan(adequacy(campaign));
        // And delivery is what actually got worse, not a number on a screen.
        const before = Object.values(campaign.institutions)[0];
        expect(Object.values(after.institutions)[0].implementationQuality).toBeLessThan(before.implementationQuality);
    });
    it("builds delivery when the money is there, and charges the treasury for it", () => {
        const campaign = withChairs();
        const funded = withBudget(campaign, { domestic: ACCOUNT_CAP });
        expect(selectBudgetOutlook(funded).lines.find((entry) => entry.account === "domestic").turnCost).toBeGreaterThan(0);
        const after = runBranch(funded, TURNS_PER_YEAR);
        expect(adequacy(after)).toBeGreaterThan(adequacy(campaign));
    });
    it("settles rather than running away, because a cheaper establishment is cheaper to hold", () => {
        const cut = withBudget(withChairs(), { domestic: 0 });
        const year = runBranch(cut, TURNS_PER_YEAR);
        const decade = runBranch(cut, TURNS_PER_YEAR * 10);
        // The loop converges: ten years is not ten times worse than one.
        expect(adequacy(decade)).toBeCloseTo(adequacy(year), 2);
        expect(adequacy(decade)).toBeGreaterThan(0);
    });
    it("buys no capability, because it is not on any ladder", () => {
        // Against a control that differs in the domestic line and nothing else, so
        // what is measured is this account rather than the drawdown the fixture's
        // unfunded statecraft accounts are already running.
        const held = withChairs();
        const funded = withBudget(held, { domestic: ACCOUNT_CAP });
        const control = runWeeks(held, TURNS_PER_YEAR);
        const after = runWeeks(funded, TURNS_PER_YEAR);
        for (const path of Object.keys(BUDGET_STAT_RANGES)) {
            expect(stat(after, path), path).toBeCloseTo(stat(control, path), 6);
        }
    });
});
