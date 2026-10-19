import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { apply } from "./effects.js";
import { FISCAL_PROGRAM_SHIFTS } from "./fiscal-impulse.js";
import { CARETAKER_QUALITY, POLICY_DOMAINS, domainChair, resolveDomainChair, POLICY_STANCES, executionQuality, inheritedPolicies, inheritedStance, legislableDomains, policyPhase, policyStance, POLICY_QUALITY_RANGE, STABILITY_REVERSION, selectPolicyOutlook, selectPolicyStance, stancesForDomain, } from "./policy.js";
import { PROGRAM_STANDUP_TURNS } from "./policy-teeth.js";
import { enactPolicyDraft, enactPolicy, projectPolicyDraft, projectPolicyStance, } from "./policy-draft.js";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { orderSettling } from "./conditions.js";
import { SHUTDOWN_GRACE_TURNS } from "./funding.js";
import { openingExpectations } from "./opening-position.js";
/**
 * The campaign a month on, with the program past its stand-up.
 *
 * A stance signed this week is not a stance working this week: the phase puts
 * it on the record, and the country feels it four weeks later. A test about
 * what a program is worth walks the clock first, the same way a played campaign
 * does.
 */
function pastStandUp(state) {
    const marked = policyPhase(state).reduce((acc, packet) => apply(acc, packet), state);
    return { ...marked, turn: marked.turn + PROGRAM_STANDUP_TURNS };
}
const TREASURY = "role-treasury-minister";
const DEFENSE = "role-defense-minister";
const FOREIGN = "role-foreign-minister";
const INTERIOR = "role-interior-minister";
const INTELLIGENCE = "role-intelligence-director";
// The shared fixture seats one chair the policy catalogue does not use, so a
// campaign that can actually legislate has to be built here: the seat, a person
// in it, and the charter's own record of the seat existing.
/**
 * The revenue statute already on the books.
 *
 * A change to the tax and spending program is a bill, so `enactPolicyDraft`
 * refuses a fiscal line until one has passed. Everything in this file that
 * enacts a fiscal stance is testing what a *program* does, not who may adopt
 * one, so these campaigns are played after the statute carried. The refusal
 * itself has its own test below.
 */
function withRevenueStatute(campaign) {
    const rightBill = {
        id: "bill:act-tax-relief-and-growth:0",
        act: "act-tax-relief-and-growth",
        title: "The Tax Relief and Growth Act",
        sponsor: "administration",
        introducedTurn: 0,
        status: "law",
        passage: [],
    };
    const leftBill = {
        id: "bill:act-tax-fairness-and-revenue:0",
        act: "act-tax-fairness-and-revenue",
        title: "The Tax Fairness and Revenue Act",
        sponsor: "administration",
        introducedTurn: 0,
        status: "law",
        passage: [],
    };
    return {
        ...campaign,
        bills: { ...campaign.bills, [rightBill.id]: rightBill, [leftBill.id]: leftBill },
    };
}
function withChair(role, competence, alive = true) {
    const base = buildCampaign();
    const holder = { ...person, id: `PER-${role}`, competence, eligibleRoles: [role] };
    return withRevenueStatute({
        ...base,
        founding: { ...base.founding, cabinet: { ...base.founding.cabinet, [role]: holder.id } },
        people: { ...base.people, [holder.id]: { base: holder, alive, currentRole: role } },
        player: { ...base.player, cabinet: { ...base.player.cabinet, [role]: holder.id } },
    });
}
function withChairs(roles, competence = 0.7) {
    return roles.reduce((campaign, role) => {
        const holder = { ...person, id: `PER-${role}`, competence, eligibleRoles: [role] };
        return {
            ...campaign,
            founding: { ...campaign.founding, cabinet: { ...campaign.founding.cabinet, [role]: holder.id } },
            people: { ...campaign.people, [holder.id]: { base: holder, alive: true, currentRole: role } },
            player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: holder.id } },
        };
    }, withRevenueStatute(buildCampaign()));
}
describe("the policy catalogue", () => {
    it("offers every domain a real choice, exactly one of which is inherited", () => {
        for (const domain of POLICY_DOMAINS) {
            const stances = stancesForDomain(domain);
            expect(stances.length, domain).toBeGreaterThanOrEqual(3);
            expect(stances.filter((s) => s.inherited), domain).toHaveLength(1);
            expect(() => inheritedStance(domain)).not.toThrow();
        }
    });
    it("gives every stance a distinct id and prose a player can choose on", () => {
        expect(new Set(POLICY_STANCES.map((s) => s.id)).size).toBe(POLICY_STANCES.length);
        for (const stance of POLICY_STANCES) {
            expect(stance.summary.length, stance.id).toBeGreaterThan(40);
            expect(stance.name.length, stance.id).toBeGreaterThan(0);
        }
    });
    // The whole point of the system: no stance is simply better than the one
    // beside it. Every stance that gives something has to take something.
    //
    // Read across both channels a program delivers through, because which one
    // carries the benefit is a fact about who the effect has to reach rather than
    // about generosity: anything the ladder's gates or the capacity ceiling read
    // has to land on the nation, since those run for every capital and only the
    // player has metrics at all. A defense program that raised the force through
    // `perTurn` as well would raise it twice.
    it("charges for everything it returns", () => {
        for (const stance of POLICY_STANCES) {
            if (stance.inherited)
                continue;
            const movements = [...Object.values(stance.perTurn), ...Object.values(stance.nationEffects)];
            expect(movements.some((v) => v > 0), `${stance.id} returns nothing`).toBe(true);
            // Borrowing is a charge too: the interest on what a program adds to the
            // debt comes out of the President's own room.
            const shift = FISCAL_PROGRAM_SHIFTS[stance.id];
            const borrows = (shift?.outlays ?? 0) - (shift?.take ?? 0) > 0;
            const takes = borrows || movements.some((v) => v < 0) || Object.values(stance.enactment).some((v) => v < 0);
            expect(takes, `${stance.id} costs nothing`).toBe(true);
        }
    });
    it("opens every founding on continuity in every domain", () => {
        const opening = inheritedPolicies();
        for (const domain of POLICY_DOMAINS) {
            expect(policyStance(opening[domain])?.inherited, domain).toBe(true);
        }
    });
});
describe("what a charter will let a player legislate", () => {
    // Not a rule written about juntas — the charter's own cabinet list, read
    // honestly. A government with no treasury minister has nobody to sign a budget.
    it("offers only the domains whose responsible chair the charter seats", () => {
        const campaign = withChair(TREASURY, 0.5);
        const domains = legislableDomains(campaign);
        expect(domains).toContain("fiscal");
        expect(domains).toContain("industry");
        expect(domains).not.toContain("defense");
    });
    it("refuses a program in a domain the charter seats no minister for", () => {
        const result = enactPolicy(withChair(TREASURY, 0.5), "defense-rearmament");
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("charter seats no");
    });
    it("refuses a program whose chair is standing empty", () => {
        const result = enactPolicy(withChair(TREASURY, 0.5, false), "fiscal-austerity");
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("empty");
    });
    it("refuses a program that is already the standing one", () => {
        const result = enactPolicy(withChair(TREASURY, 0.5), "fiscal-continuity");
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("already");
    });
    it("refuses a program that does not exist", () => {
        expect(enactPolicy(withChair(TREASURY, 0.5), "fiscal-utopia").ok).toBe(false);
    });
});
describe("enacting a program", () => {
    it("replaces the domain's stance rather than accumulating one", () => {
        const campaign = withChair(TREASURY, 0.5);
        const result = enactPolicy(campaign, "fiscal-austerity");
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const next = apply(campaign, result.packet);
        expect(selectPolicyStance(next, "fiscal").id).toBe("fiscal-austerity");
        // And the domains it did not name are untouched.
        expect(selectPolicyStance(next, "industry").inherited).toBe(true);
    });
    it("pulls alignment once, on enactment, rather than every turn", () => {
        const campaign = withChair(TREASURY, 0.5);
        const result = enactPolicy(campaign, "fiscal-redistribution");
        if (!result.ok)
            throw new Error(result.reason);
        const next = apply(campaign, result.packet);
        expect(next.player.alignments.economicLeftRight).toBeLessThan(0);
        // A turn passing must not pull it again — alignment is the sum of
        // decisions, and a standing policy is one decision that keeps working.
        const after = policyPhase(next).reduce((acc, packet) => apply(acc, packet), next);
        expect(after.player.alignments.economicLeftRight).toBe(next.player.alignments.economicLeftRight);
    });
    it("charges the one-off price the turn it is enacted", () => {
        const campaign = withChair(TREASURY, 0.5);
        const result = enactPolicy(campaign, "fiscal-austerity");
        if (!result.ok)
            throw new Error(result.reason);
        const next = apply(campaign, result.packet);
        expect(next.player.metrics.stability).toBeLessThan(campaign.player.metrics.stability);
    });
    it("lands on the player's own record, not the world's", () => {
        const campaign = withChair(TREASURY, 0.5);
        const result = enactPolicy(campaign, "fiscal-austerity");
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.packet.actor).toBe("player");
    });
});
describe("policy draft projection and atomic enactment", () => {
    const allChairs = [TREASURY, FOREIGN, INTERIOR, INTELLIGENCE, DEFENSE];
    it("projects a one-domain candidate and commits through the same normalized candidate", () => {
        const campaign = withChair(TREASURY, 0.7);
        const projected = projectPolicyDraft(campaign, { fiscal: "fiscal-austerity" });
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            throw new Error(projected.reason);
        expect(projected.candidate.changes.map((line) => line.domain)).toEqual(["fiscal"]);
        const committed = enactPolicyDraft(campaign, projected.candidate);
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            throw new Error(committed.reason);
        const next = apply(campaign, committed.packet);
        expect(selectPolicyStance(next, "fiscal").id).toBe("fiscal-austerity");
        expect(selectPolicyOutlook(next).perTurn).toEqual(projected.candidate.perTurn);
        expect(policyPhase(pastStandUp(next))[0]?.effects.find((effect) => effect.kind === "metric")).toMatchObject({
            kind: "metric",
            deltas: projected.candidate.perTurn,
        });
    });
    it("projects and commits a six-domain program as one packet", () => {
        const campaign = withChairs(allChairs, 0.8);
        const projected = projectPolicyDraft(campaign, {
            fiscal: "fiscal-investment",
            industry: "industry-transition",
            trade: "trade-open",
            civil: "civil-open-society",
            security: "security-community",
            defense: "defense-rearmament",
        });
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            throw new Error(projected.reason);
        expect(projected.candidate.changes).toHaveLength(6);
        const committed = enactPolicyDraft(campaign, projected.candidate);
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            throw new Error(committed.reason);
        const next = apply(campaign, committed.packet);
        expect(selectPolicyOutlook(next).perTurn).toEqual(projected.candidate.perTurn);
        expect(policyPhase(pastStandUp(next))[0]?.effects.find((effect) => effect.kind === "metric")).toMatchObject({
            kind: "metric",
            deltas: projected.candidate.perTurn,
        });
        expect(committed.packet.effects.filter((effect) => effect.kind === "policy")).toHaveLength(6);
        expect(committed.packet.effects.filter((effect) => effect.kind === "feed")).toHaveLength(1);
    });
    it("fails invalid and gated candidates before producing any enactment packet", () => {
        const campaign = withChair(TREASURY, 0.7);
        expect(projectPolicyDraft(campaign, { fiscal: "trade-open" }).ok).toBe(false);
        expect(projectPolicyDraft(campaign, { fiscal: "fiscal-utopia" }).ok).toBe(false);
        const gated = projectPolicyDraft(campaign, { defense: "defense-rearmament" });
        expect(gated.ok).toBe(false);
        if (!gated.ok)
            expect(gated.reason).toContain("charter seats no");
        const unchanged = projectPolicyDraft(campaign, { fiscal: "fiscal-continuity" });
        expect(unchanged.ok).toBe(false);
    });
    it("does not partially apply a multi-domain draft when any domain is gated", () => {
        const campaign = withChair(TREASURY, 0.7);
        const projected = projectPolicyDraft(campaign, {
            fiscal: "fiscal-austerity",
            defense: "defense-rearmament",
        });
        expect(projected.ok).toBe(false);
        const stillOriginal = campaign;
        expect(selectPolicyStance(stillOriginal, "fiscal").id).toBe("fiscal-continuity");
        expect(selectPolicyStance(stillOriginal, "defense").id).toBe("defense-continuity");
    });
});
describe("execution quality", () => {
    it("scales with the competence of the minister carrying it", () => {
        expect(executionQuality(withChair(TREASURY, 0.9), "fiscal")).toBeGreaterThan(executionQuality(withChair(TREASURY, 0.2), "fiscal"));
    });
    it("falls to the caretaker minimum when the chair is empty", () => {
        expect(executionQuality(withChair(TREASURY, 0.9, false), "fiscal")).toBe(CARETAKER_QUALITY);
    });
    // A weak treasury minister running a transfer program steadies the country
    // less and is resented abroad exactly as much. Scaling both would make an
    // incompetent appointment a way of buying a cheaper policy.
    //
    // Read on stability against standing rather than on money against stability,
    // because no stance in the catalogue pays the administration any more: what a
    // fiscal program does to receipts is `FISCAL_TAKE`'s, and it reaches the
    // country's books rather than the President's authority.
    it("scales what a program delivers, never what it costs", () => {
        const strong = withChair(TREASURY, 0.95);
        const weak = withChair(TREASURY, 0.05);
        // The energy transition: standing it delivers, money it spends.
        const enact = (c) => {
            const r = enactPolicy(c, "industry-transition");
            if (!r.ok)
                throw new Error(r.reason);
            return apply(c, r.packet);
        };
        const strongOutlook = selectPolicyOutlook(enact(strong)).perTurn;
        const weakOutlook = selectPolicyOutlook(enact(weak)).perTurn;
        expect(strongOutlook.standing).toBeGreaterThan(weakOutlook.standing);
        expect(strongOutlook.treasury).toBe(weakOutlook.treasury);
    });
    it("refuses a fiscal program until the revenue statute has passed", () => {
        // Revenue bills originate in the House and the President proposes rather
        // than enacts. The direct path collapsed both facts into a dial.
        const noStatute = { ...withChair(TREASURY, 0.7), bills: {} };
        const refused = enactPolicy(noStatute, "fiscal-austerity");
        expect(refused.ok).toBe(false);
        if (refused.ok)
            return;
        expect(refused.reason).toContain("The Tax Relief and Growth Act");
        expect(enactPolicy(withChair(TREASURY, 0.7), "fiscal-austerity").ok).toBe(true);
    });
});
describe("the outlook and the turn phase", () => {
    it("says nothing and does nothing while every domain is on continuity", () => {
        const campaign = withChair(TREASURY, 0.5);
        expect(selectPolicyOutlook(campaign).perTurn).toEqual({});
        expect(policyPhase(campaign)).toEqual([]);
    });
    it("covers exactly the domains the charter allows", () => {
        const board = withChair(TREASURY, 0.5);
        const outlook = selectPolicyOutlook(board);
        expect(outlook.lines.map((l) => l.domain).sort()).toEqual(legislableDomains(board).slice().sort());
        for (const line of outlook.lines) {
            // The chair is resolved against the seats this board actually holds, not
            // read off a fixed table — which is the whole point of the hint list.
            expect(line.chair).toBe(domainChair(board, line.domain));
        }
    });
    // The screen shows the outlook and the turn applies it. If they were two
    // computations they could disagree, and the player would be told one thing
    // and charged another.
    it("applies exactly what the outlook promised, once the program is standing", () => {
        const campaign = withChair(TREASURY, 0.7);
        const result = enactPolicy(campaign, "fiscal-austerity");
        if (!result.ok)
            throw new Error(result.reason);
        const enacted = pastStandUp(apply(campaign, result.packet));
        const promised = selectPolicyOutlook(enacted).perTurn;
        const packets = policyPhase(enacted);
        expect(packets).toHaveLength(1);
        const metricEffect = packets[0].effects.find((e) => e.kind === "metric");
        expect(metricEffect).toBeDefined();
        if (metricEffect?.kind === "metric")
            expect(metricEffect.deltas).toEqual(promised);
    });
    it("keeps working every turn without being re-enacted", () => {
        const campaign = withChair(DEFENSE, 0.6);
        const result = enactPolicy(campaign, "defense-rearmament");
        if (!result.ok)
            throw new Error(result.reason);
        let state = pastStandUp(apply(campaign, result.packet));
        const before = state.player.metrics.militaryReadiness;
        for (let turn = 0; turn < 3; turn += 1) {
            state = policyPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        }
        expect(state.player.metrics.militaryReadiness).toBeGreaterThan(before);
    });
    it("narrates the program rather than filing one entry per domain, and agrees in number", () => {
        const campaign = withChair(TREASURY, 0.6);
        const result = enactPolicy(campaign, "fiscal-austerity");
        if (!result.ok)
            throw new Error(result.reason);
        const enacted = apply(campaign, result.packet);
        // The month it spends being written into rules is its own sentence, and it
        // names what the program rests on rather than a magnitude nobody is feeling
        // yet.
        const building = policyPhase(enacted);
        expect(building).toHaveLength(1);
        expect(building[0].narration.summary).toContain("being stood up");
        expect(building[0].effects.find((effect) => effect.kind === "metric")).toBeUndefined();
        // One program continues; it does not "continue". The phrasing is drawn per
        // week so the ledger does not print the same sentence eight weeks running,
        // which is why the agreement is asserted across the whole pool rather than
        // against whichever line this turn happened to draw.
        let working = pastStandUp(enacted);
        for (let week = 0; week < 8; week += 1) {
            const packets = policyPhase(working);
            expect(packets).toHaveLength(1);
            const summary = packets[0].narration.summary;
            // Some of the voices set the program name mid-sentence, so it is matched
            // as a word rather than as a capitalized one.
            expect(summary.toLowerCase()).toContain("consolidation");
            expect(summary).not.toContain("continue to work");
            expect(summary).not.toContain("are still in force");
            working = { ...packets.reduce((acc, packet) => apply(acc, packet), working), turn: working.turn + 1 };
        }
    });
});
// An order projects, a rung projects, a peace table projects. The one act that
// binds every week of the rest of the term did not: the policy room could price
// a whole draft, but nothing could ask what a single stance costs, so the
// standing program was the only decision in the game with no price at the point
// of choosing.
describe("what a standing stance costs before it is adopted", () => {
    // The constitution the game actually runs: it authors American titles.
    const CHARTER = CHARTER_USA_CONSTITUTION;
    function seatedFor(domain) {
        const campaign = buildCampaign();
        const chair = resolveDomainChair(CHARTER.cabinetRoles, domain);
        return {
            ...campaign,
            founding: { ...campaign.founding, cabinet: { [chair]: person.id } },
            player: { ...campaign.player, cabinet: { [chair]: person.id } },
            people: { ...campaign.people, [person.id]: { ...campaign.people[person.id], currentRole: chair } },
        };
    }
    it("prices the one-off and the standing halves of the same stance separately", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id);
        expect(projection.available).toBe(true);
        expect(projection.stance.id).toBe(candidate.id);
        expect(projection.previous.id).toBe(inheritedStance("fiscal").id);
        // The two prices are different questions and are never the same object.
        expect(Object.keys(projection.enactment).length + Object.keys(projection.perTurn).length).toBeGreaterThan(0);
        expect(projection.chair).toBe(resolveDomainChair(CHARTER.cabinetRoles, "fiscal"));
        expect(projection.minister).toBe(person.name);
        expect(projection.approvalNow).toBeGreaterThan(0);
    });
    it("is pure and seed-independent, the contract every projection in the engine holds", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        expect(projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id)).toEqual(projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id));
    });
    it("charges nothing and reads unavailable where the seat that would carry it is empty", () => {
        const campaign = buildCampaign();
        const empty = {
            ...campaign,
            founding: { ...campaign.founding, cabinet: {} },
            player: { ...campaign.player, cabinet: {} },
        };
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(empty, CHARTER, "fiscal", candidate.id);
        expect(projection.available).toBe(false);
        expect(projection.missing).toBeTruthy();
        expect(projection.enactment).toEqual({});
    });
    // The government the player runs is American: it seats Secretaries, not
    // ministers, and the words come from the charter's own title map.
    it("names the seat the way this constitution names it", () => {
        const campaign = seatedFor("fiscal");
        const candidate = stancesForDomain("fiscal").find((stance) => !stance.inherited);
        const projection = projectPolicyStance(campaign, CHARTER, "fiscal", candidate.id);
        expect(CHARTER.roleTitles?.[resolveDomainChair(CHARTER.cabinetRoles, "fiscal")]).toBe("Secretary of the Treasury");
        expect(projection.reasoning).toContain("Secretary of the Treasury");
        expect(projection.reasoning.toLowerCase()).not.toContain("minister");
    });
});
// A standing program's cost to the country's order is a level, not a rate. Held
// against the country's own pull back toward where its institutions hold it,
// a stance's weekly stability settles the country a fixed distance from that
// resting point, however long it is held.
describe("a program's order as a level on a country that settles", () => {
    const { campaign: founded } = foundedForBalance("policy-order-level");
    const rest = openingExpectations(founded.nations[founded.founding.nation].base).find((entry) => entry.metric === "stability").opening;
    const withStability = (campaign, stability) => ({
        ...campaign,
        player: { ...campaign.player, metrics: { ...campaign.player.metrics, stability } },
    });
    const weeks = (campaign, count, withProgram) => {
        let working = campaign;
        // In the week's own order: the condition phase settles the country before
        // the policy phase runs the program.
        for (let week = 0; week < count; week += 1) {
            const settling = orderSettling(working);
            if (settling)
                working = apply(working, settling);
            if (withProgram)
                working = policyPhase(working).reduce((acc, packet) => apply(acc, packet), working);
            working = { ...working, turn: working.turn + 1 };
        }
        return working;
    };
    it("brings an idle country back to where its institutions hold it, from above or below", () => {
        expect(weeks(withStability(founded, 0.05), 80, false).player.metrics.stability).toBeCloseTo(rest, 2);
        expect(weeks(withStability(founded, 0.95), 80, false).player.metrics.stability).toBeCloseTo(rest, 2);
    });
    it("holds a stance's weekly stability as a level one reversion's worth from rest, and no further", () => {
        for (const [domain, stanceId] of [["civil", "civil-emergency-powers"], ["security", "security-disclosure"]]) {
            const holding = pastStandUp({ ...founded, player: { ...founded.player, policies: { ...founded.player.policies, [domain]: stanceId } } });
            const weekly = selectPolicyOutlook(holding).lines.find((line) => line.domain === domain).perTurn.stability;
            const settled = weeks(holding, 120, true).player.metrics.stability;
            expect(settled, stanceId).toBeCloseTo(rest + weekly / STABILITY_REVERSION, 2);
        }
    });
    it("lets no stance on its own pin the country's order at either end", () => {
        const bestQuality = CARETAKER_QUALITY + POLICY_QUALITY_RANGE;
        for (const stance of POLICY_STANCES) {
            const weekly = stance.perTurn.stability ?? 0;
            const level = rest + (weekly > 0 ? weekly * bestQuality : weekly) / STABILITY_REVERSION;
            expect(level, stance.id).toBeLessThan(1);
            expect(level, stance.id).toBeGreaterThan(0);
        }
    });
    it("rests where the country's institutions hold it, not where this week's shocks have left the regime", () => {
        const id = founded.founding.nation;
        const shaken = {
            ...founded,
            nations: {
                ...founded.nations,
                [id]: { ...founded.nations[id], stats: { ...founded.nations[id].stats, politics: { ...founded.nations[id].stats.politics, regimeStability: 0.3 } } },
            },
        };
        expect(weeks(withStability(shaken, 0.05), 80, false).player.metrics.stability).toBeCloseTo(rest, 2);
    });
    it("files the pull as the country's own weather, not as the President's act", () => {
        const settling = orderSettling(withStability(founded, 0.2));
        expect(settling.actor).toBe("world");
        expect(settling.background).toBe(true);
        expect(orderSettling(withStability(founded, rest))).toBeUndefined();
    });
});
// A program's money line is an obligation, and none may be made while the
// appropriation has lapsed; what it does to the country's order is not money.
describe("a program through a shutdown", () => {
    it("stops spending for the weeks the government is closed and keeps moving the country", () => {
        const { campaign: founded } = foundedForBalance("policy-lapse");
        const holding = pastStandUp({ ...founded, player: { ...founded.player, policies: { ...founded.player.policies, security: "security-surveillance" } } });
        const open = policyPhase(holding)[0].effects.find((effect) => effect.kind === "metric");
        const shut = {
            ...holding,
            congress: { ...holding.congress, appropriation: { ...holding.congress.appropriation, throughTurn: holding.turn - SHUTDOWN_GRACE_TURNS - 1 } },
        };
        const closed = policyPhase(shut)[0].effects.find((effect) => effect.kind === "metric");
        expect(open.kind === "metric" && open.deltas.treasury).toBeLessThan(0);
        expect(closed.kind === "metric" && closed.deltas.treasury).toBeUndefined();
        expect(closed.kind === "metric" && closed.deltas.stability).toBe(open.kind === "metric" && open.deltas.stability);
    });
});
