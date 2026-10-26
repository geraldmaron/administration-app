import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases, campaignPhaseSequence } from "./turn-phases.js";
import { foundedForBalance } from "./balance-harness.js";
import { apportionmentPhase, authorityCeiling, borrowingCeiling, discretionaryAppropriation, fiscalPhase, selectFiscalStatement, selectOutlay, selectRevenue, sovereignRatingFor, weeklyApportionment, } from "./fiscal.js";
import { obligationAvailability, openingBudgetAuthority } from "./funding.js";
import { openingPosition } from "./opening-position.js";
import { EXECUTIVE_ORDERS, executiveOrder, orderAvailability, orderCost, projectOrder, reliefOrderSubjects, signOrder } from "./orders.js";
import { declareStaffordDisaster } from "./stafford.js";
import { signBill } from "./legislation.js";
import { LOCALE_ACTS, localeActCost } from "./locale-acts.js";
import { takeLocaleAct } from "./locale-act-effects.js";
import { bundleOrder, materialDecisionGate } from "./projection.js";
import { landRung } from "./__fixtures__/ladder.js";
import { selectCustomsReceipts } from "./trade.js";
import { tradePhase } from "./trade-phase.js";
import { createRngStreams } from "./rng.js";
import { STANDING_PRESSURE, standingPressure } from "./conditions.js";
import { obligationPhase } from "./obligations.js";
// The Appropriations Clause, as arithmetic.
//
// Every assertion here is about one sentence: no money is drawn from the
// Treasury but in consequence of appropriations made by law. What the engine
// used to model instead was a $2.47T unappropriated wallet, 1.73 times the
// entire discretionary budget of the United States, credited by tariffs,
// seizures and debt-limit bills and overdrawable into deficit. These are the
// properties that say it is gone and cannot come back quietly.
const { campaign: FOUNDED, charter: CHARTER } = foundedForBalance("fiscal-authority");
const streams = createRngStreams(FOUNDED.seed);
function withAuthority(campaign, treasury) {
    return { ...campaign, player: { ...campaign.player, metrics: { ...campaign.player.metrics, treasury } } };
}
function withReliefRequest(campaign) {
    const condition = { id: "condition:flood:MI", nation: campaign.founding.nation, kind: "flood",
        scope: "region", severity: 0.7, startedTurn: campaign.turn, status: "active",
        beats: [], state: "MI" };
    const running = { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
    return obligationPhase(running).reduce(apply, running);
}
/** A government whose appropriation lapsed long enough ago to have closed. */
function inLapse(campaign) {
    return {
        ...campaign,
        congress: {
            ...campaign.congress,
            appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.turn - 6 },
        },
    };
}
describe("the stock is the appropriation, not a wallet", () => {
    it("founds on a carry share of the discretionary line rather than on the size of the economy", () => {
        const nation = FOUNDED.nations[FOUNDED.founding.nation];
        const gdp = nation.stats.economy.gdp;
        // Before anyone is seated, the stock is the carry share and nothing else.
        const unseated = openingPosition(nation.base, {}, FOUNDED.founding.leadRole).metrics.treasury;
        expect(unseated).toBe(openingBudgetAuthority(gdp));
        expect(unseated).toBeCloseTo(357_485, -3);
        // The seated Treasury and Commerce secretaries' opening pushes stop at the
        // carry share: the old founding was 1.73x the discretionary line.
        expect(FOUNDED.player.metrics.treasury).toBeLessThanOrEqual(unseated);
        expect(FOUNDED.player.metrics.treasury).toBeLessThan(selectOutlay(FOUNDED).discretionary);
    });
    it("is replenished by the appropriation and by nothing else", () => {
        expect(weeklyApportionment(FOUNDED)).toBe(Math.round(discretionaryAppropriation(FOUNDED) / 52));
        const spent = withAuthority(FOUNDED, 100_000);
        const credited = apportionmentPhase(spent).reduce(apply, spent);
        expect(credited.player.metrics.treasury).toBe(100_000 + weeklyApportionment(spent));
    });
    it("releases nothing while appropriations have lapsed", () => {
        expect(apportionmentPhase(inLapse(withAuthority(FOUNDED, 0)))).toHaveLength(0);
    });
    it("does not bank what was never obligated — a year of doing nothing ends where it started", () => {
        // The ceiling is the whole of this: without it the week's release compounds
        // into 1.4 million a year of authority answerable to nobody, which is the
        // wallet under another name.
        let state = FOUNDED;
        for (let week = 0; week < 52; week += 1) {
            state = apportionmentPhase(state).reduce(apply, state);
        }
        expect(state.player.metrics.treasury).toBe(FOUNDED.player.metrics.treasury);
        expect(FOUNDED.player.metrics.treasury).toBe(authorityCeiling(FOUNDED));
    });
    it("founds on exactly the carry share", () => {
        expect(FOUNDED.player.metrics.treasury).toBe(openingBudgetAuthority(FOUNDED.nations[FOUNDED.founding.nation].stats.economy.gdp));
    });
    it("founds exactly at its ceiling", () => {
        expect(FOUNDED.player.metrics.treasury).toBe(authorityCeiling(FOUNDED));
    });
    // The ceiling the week's release respects is the same ceiling the founding
    // opens under, for every party and across seeds: no slate can hand a
    // President authority Congress never appropriated.
    it("opens every founding inside its own ceiling, for every party", () => {
        for (const party of ["democrat", "republican", "independent"]) {
            for (let seed = 0; seed < 50; seed += 1) {
                const { campaign } = foundedForBalance(`authority-${seed}`, party);
                expect(campaign.player.metrics.treasury, `${party} ${seed}`).toBeLessThanOrEqual(authorityCeiling(campaign));
            }
        }
    });
    it("is floored at zero: a cost larger than the authority is refused, never borrowed", () => {
        const drained = apply(withAuthority(FOUNDED, 10_000), {
            source: "action",
            actor: "player",
            turn: FOUNDED.turn,
            narration: { summary: "An obligation larger than the appropriation" },
            effects: [{ kind: "metric", deltas: { treasury: -1_000_000 } }],
        });
        expect(drained.player.metrics.treasury).toBe(0);
    });
    it("runs a founded campaign for a season without any turn ending below zero", () => {
        let state = FOUNDED;
        const phases = campaignTurnPhases(CHARTER);
        for (let week = 0; week < 13; week += 1) {
            state = advanceTurn(state, phases);
            expect(state.player.metrics.treasury).toBeGreaterThanOrEqual(0);
        }
    });
    it("puts the apportionment before the accounts draw, and the country's books after the promises", () => {
        const ids = campaignPhaseSequence(CHARTER).map((phase) => phase.id);
        expect(ids.indexOf("apportionmentPhase")).toBe(ids.indexOf("budgetPhase") - 1);
        // Strictly after rather than immediately after: vitalsPhase now sits
        // between them so the country's books read this week's
        // population, not last week's — a real phase, not a stray insertion this
        // assertion should be fragile to.
        expect(ids.indexOf("fiscalPhase")).toBeGreaterThan(ids.indexOf("commitmentPhase"));
    });
});
describe("nothing obligates money that is not there", () => {
    const RELIEF = "order-relief-program";
    it("requires enacted relief money, then allocates it without a second Treasury debit", () => {
        const requested = withReliefRequest(FOUNDED);
        expect(reliefOrderSubjects(requested)).toHaveLength(0);
        const declaration = declareStaffordDisaster(requested, "MI");
        if (!declaration.ok)
            throw new Error(declaration.reason);
        const declared = apply(requested, declaration.packet);
        expect(reliefOrderSubjects(declared)).toHaveLength(0);
        const bill = { id: "bill:recovery", act: "act-disaster-recovery", title: "Recovery",
            sponsor: "administration", introducedTurn: FOUNDED.turn, status: "on-the-desk", passage: [] };
        const pending = { ...declared, bills: { ...declared.bills, [bill.id]: bill } };
        const enactment = signBill(pending, bill.id);
        if (!enactment.ok)
            throw new Error(enactment.reason);
        const funded = withAuthority(apply(pending, enactment.packet), 8_752);
        const subject = reliefOrderSubjects(funded)[0];
        const signed = signOrder(funded, CHARTER, RELIEF, streams, subject);
        expect(signed.ok).toBe(true);
        if (!signed.ok)
            return;
        expect(apply(funded, signed.packet).player.metrics.treasury).toBe(8_752);
    });
    it("refuses spending orders during a lapse while the exception remains available to qualifying work", () => {
        const closed = inLapse(withReliefRequest(FOUNDED));
        const controls = executiveOrder("order-border-controls");
        const relief = executiveOrder(RELIEF);
        expect(controls.excepted).toBeUndefined();
        expect(relief.excepted).toBeUndefined();
        const refused = orderAvailability(closed, controls);
        expect(refused.ok).toBe(false);
        if (refused.ok)
            return;
        expect(refused.missing).toContain("lapsed");
        expect(orderAvailability(closed, relief).ok).toBe(false);
        expect(obligationAvailability(closed, 1_000, { excepted: true }).ok).toBe(true);
    });
    it("names the shortfall in figures rather than refusing without saying why", () => {
        const refusal = obligationAvailability(withAuthority(FOUNDED, 100), 5_000, {});
        expect(refusal.ok).toBe(false);
        if (refusal.ok)
            return;
        expect(refusal.missing).toContain("5,000");
        expect(refusal.missing).toContain("100");
    });
});
describe("no positive authority outside an appropriation", () => {
    it("leaves the treasury and the debt alone when a tariff is signed, and collects the duty on the trade week", () => {
        let state = FOUNDED;
        const target = Object.keys(state.nations).find((id) => id !== state.founding.nation);
        let landed = 0;
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const result = landRung(state, state.founding.nation, target, "economic", 2, streams);
            if (!result.ok)
                break;
            state = apply({ ...state, turn: state.turn + 1 }, result.packet);
            landed += 1;
        }
        expect(landed).toBeGreaterThan(0);
        const home = state.founding.nation;
        expect(state.player.metrics.treasury).toBeLessThanOrEqual(FOUNDED.player.metrics.treasury);
        expect(state.nations[home].stats.economy.debt).toBe(FOUNDED.nations[home].stats.economy.debt);
        // The duty reaches the national take through the tariff line, never as a
        // second write to the debt on the trade week.
        expect(tradePhase(state).some((packet) => packet.effects.some((effect) => effect.kind === "nationStat"))).toBe(false);
        expect(selectRevenue(state).tariff).toBeGreaterThanOrEqual(selectRevenue(FOUNDED).tariff);
        if (selectCustomsReceipts(state) > 0)
            expect(selectRevenue(state).tariff).toBeGreaterThan(selectRevenue(FOUNDED).tariff);
    });
    it("does not charge new Treasury or debt for priority on an existing defense contract", () => {
        const priority = executiveOrder("order-defense-production");
        expect(priority.treasuryOfGdp).toBeUndefined();
        expect(priority.nationEffects["economy.debt"]).toBeUndefined();
    });
    it("buys headroom rather than money with a debt-limit bill", () => {
        const enacted = {
            ...FOUNDED,
            bills: {
                ...FOUNDED.bills,
                "bill:act-debt-limit-increase:0": {
                    id: "bill:act-debt-limit-increase:0",
                    act: "act-debt-limit-increase",
                    title: "The Debt Limit Increase Act",
                    sponsor: "administration",
                    introducedTurn: 0,
                    status: "law",
                    passage: [],
                },
            },
        };
        expect(borrowingCeiling(enacted)).toBeGreaterThan(borrowingCeiling(FOUNDED));
        expect(enacted.player.metrics.treasury).toBe(FOUNDED.player.metrics.treasury);
    });
    it("bills a breached limit on the date it binds, never as a premium on the stock", () => {
        // Past the ceiling the Treasury runs its measures and then withholds
        // payments (debt-limit.test.ts); what it pays on the debt it already owes
        // is the rate that debt was issued at, whatever the ceiling says.
        const overrun = {
            ...FOUNDED,
            nations: {
                ...FOUNDED.nations,
                [FOUNDED.founding.nation]: {
                    ...FOUNDED.nations[FOUNDED.founding.nation],
                    stats: {
                        ...FOUNDED.nations[FOUNDED.founding.nation].stats,
                        economy: {
                            ...FOUNDED.nations[FOUNDED.founding.nation].stats.economy,
                            debt: borrowingCeiling(FOUNDED) * 1.1,
                        },
                    },
                },
            },
        };
        const ordinary = selectOutlay(FOUNDED).debtService / FOUNDED.nations[FOUNDED.founding.nation].stats.economy.debt;
        const breached = selectOutlay(overrun).debtService / overrun.nations[overrun.founding.nation].stats.economy.debt;
        expect(breached).toBeCloseTo(ordinary, 6);
    });
});
describe("the country's own books take the week", () => {
    it("accumulates the deficit into the debt at the rate the projection draws", () => {
        const statement = selectFiscalStatement(FOUNDED);
        const after = fiscalPhase(FOUNDED).reduce(apply, FOUNDED);
        const before = FOUNDED.nations[FOUNDED.founding.nation].stats.economy.debt;
        const moved = after.nations[after.founding.nation].stats.economy.debt - before;
        expect(moved).toBeCloseTo(-statement.balance / 52, 0);
        // And the output under it compounds, which is the whole reason a country
        // can carry a debt it never repays.
        expect(after.nations[after.founding.nation].stats.economy.gdp).toBeGreaterThan(FOUNDED.nations[FOUNDED.founding.nation].stats.economy.gdp);
    });
    it("derives a rating that opens where the dataset authors it and falls as the strain rises", () => {
        const statement = selectFiscalStatement(FOUNDED);
        expect(sovereignRatingFor(statement.debtToGdp, statement.balance / statement.gdp)).toBe(FOUNDED.nations[FOUNDED.founding.nation].stats.economy.sovereignRating);
        expect(sovereignRatingFor(2.4, -0.09)).toBe("BB");
        expect(sovereignRatingFor(0.4, 0.01)).toBe("AAA");
    });
    it("makes a debt crisis reachable for a government the markets doubt, and not for one at rest", () => {
        // Market access, not the level: a weak letter and a history of stress open
        // it, whatever the ratio (condition-onset.test.ts has the full reading).
        const runtime = FOUNDED.nations[FOUNDED.founding.nation];
        const doubted = {
            ...runtime,
            stats: { ...runtime.stats, economy: { ...runtime.stats.economy, sovereignRating: "CCC" } },
        };
        const books = FOUNDED.books[FOUNDED.founding.nation];
        const stressed = {
            ...FOUNDED,
            nations: { ...FOUNDED.nations, [FOUNDED.founding.nation]: doubted },
            books: { ...FOUNDED.books, [FOUNDED.founding.nation]: { ...books, stress: 1 } },
        };
        expect(STANDING_PRESSURE["fiscal-crisis"](runtime)).toBeLessThan(0.05);
        expect(standingPressure(runtime, "fiscal-crisis", false, FOUNDED)).toBeLessThan(0.05);
        expect(standingPressure(doubted, "fiscal-crisis", false, stressed)).toBeGreaterThan(0.2);
    });
});
describe("the prices bite against the authority the President actually holds", () => {
    // A Stafford allocation draws on an enacted law, so it is not a new
    // unilateral fiscal commitment in the President's workbench.
    it("does not price statutory relief as a new Treasury obligation", () => {
        const authority = FOUNDED.player.metrics.treasury;
        const bundles = EXECUTIVE_ORDERS.map((order) => ({ id: order.id, bundle: bundleOrder(FOUNDED, projectOrder(FOUNDED, CHARTER, order)) }));
        const major = bundles.filter(({ bundle }) => bundle.impacts.some((impact) => impact.domain === "treasury" && impact.band === "major"));
        const material = bundles.filter(({ bundle }) => materialDecisionGate(bundle, authority).reasons.some((reason) => reason.includes("material share")));
        expect(major.map(({ id }) => id)).not.toContain("order-relief-program");
        expect(material.map(({ id }) => id)).not.toContain("order-relief-program");
        expect(material.map(({ id }) => id)).toEqual(major.map(({ id }) => id));
    });
    it("prices a locale act as a share of output like every other act in the engine", () => {
        // Acts that spend through another channel (a proclamation, a memorandum, collection a court order already authorizes) carry no up-front price.
        const unpriced = new Set(["proclaim", "priority", "surveil", "surveil-under-order"]);
        for (const act of LOCALE_ACTS.filter((entry) => !unpriced.has(entry.id))) {
            expect(act.treasuryOfGdp, act.id).toBeLessThan(0);
            expect(localeActCost(FOUNDED, act), act.id).toBeGreaterThan(0);
        }
        // Local relief is an enacted program expense at the state level; a
        // presidential allocation of that program carries no second cash price.
        for (const id of unpriced)
            expect(LOCALE_ACTS.find((act) => act.id === id).treasuryOfGdp, id).toBe(0);
        const relief = LOCALE_ACTS.find((act) => act.id === "relief");
        expect(localeActCost(FOUNDED, relief)).toBeGreaterThan(0);
        expect(orderCost(FOUNDED, executiveOrder("order-relief-program")).treasury).toBeUndefined();
    });
});
describe("relief follows the request", () => {
    it("charges standing for reaching into a state that never asked, and nothing where it did", () => {
        const stateId = Object.keys(FOUNDED.states)[0];
        const runtime = FOUNDED.states[stateId];
        const unasked = takeLocaleAct(FOUNDED, stateId, "relief", "flood");
        expect(unasked.ok).toBe(true);
        if (!unasked.ok)
            return;
        const metric = unasked.packet.effects.find((effect) => effect.kind === "metric");
        if (metric?.kind !== "metric")
            throw new Error("relief bills the authority");
        expect(metric.deltas.standing).toBeLessThan(0);
        expect(unasked.packet.narration.summary).toContain("did not ask");
        const asked = takeLocaleAct({
            ...FOUNDED,
            states: {
                ...FOUNDED.states,
                [stateId]: {
                    ...runtime,
                    claims: [
                        {
                            id: "claim:relief:1",
                            signature: "relief:flood",
                            openedTurn: FOUNDED.turn,
                            expiresTurn: FOUNDED.turn + 6,
                            description: "The governor asks for a declaration.",
                        },
                    ],
                },
            },
        }, stateId, "relief", "flood");
        expect(asked.ok).toBe(true);
        if (!asked.ok)
            return;
        const answered = asked.packet.effects.find((effect) => effect.kind === "metric");
        if (answered?.kind !== "metric")
            throw new Error("relief bills the authority");
        expect(answered.deltas.standing).toBeUndefined();
    });
});
