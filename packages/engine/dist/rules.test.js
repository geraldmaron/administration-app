import { beforeEach, describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { RULES, RULE_IDS, campaignStatus, challengeReading, clearRuleReports, omniscientRead, ruleChangeDate, ruleReports, ruleValue, } from "./rules.js";
import { applyRules, rulesAreSuspended, setRuleChanges } from "./rules-effects.js";
const DAY = { year: 2029, month: 3, day: 4 };
function withRules(rules, base = buildCampaign()) {
    return { ...base, rules };
}
/** Both paid entries on, the way entering the editor leaves a campaign. */
function bothOn() {
    return withRules({
        values: { "information.omniscient": true, "removal.immune": true },
        log: [
            { kind: "set", rule: "information.omniscient", value: true, date: DAY },
            { kind: "set", rule: "removal.immune", value: true, date: DAY },
        ],
    });
}
beforeEach(() => {
    clearRuleReports();
});
describe("the registry is the whole description of what is sold", () => {
    it("holds exactly the two entries the re-key needs, and no third", () => {
        expect([...RULE_IDS].sort()).toEqual(["information.omniscient", "removal.immune"]);
        expect(RULES["information.omniscient"].kind).toBe("view");
        expect(RULES["removal.immune"].kind).toBe("rule");
    });
    it("every paid entry names the one key and says what a build without it shows", () => {
        for (const id of RULE_IDS) {
            const def = RULES[id];
            expect(def.tier, id).toBe("paid");
            expect(def.entitlement, id).toBe("god-mode");
            expect(def.copy.locked, id).toBeTruthy();
            expect(def.copy.locked?.length ?? 0, id).toBeGreaterThan(0);
            expect(def.copy.holds, id).toBeTruthy();
            expect(def.copy.costs, id).toBeTruthy();
        }
    });
    it("declares one status and one difficulty flag per value, and a normal value at [0]", () => {
        for (const id of RULE_IDS) {
            const def = RULES[id];
            expect(def.values.length, id).toBeGreaterThan(1);
            expect(def.statuses.length, id).toBe(def.values.length);
            expect(def.harder.length, id).toBe(def.values.length);
            expect(def.statuses[0], id).toBe("standard");
            expect(def.id, id).toBe(id);
        }
    });
    it("names one seam per rule, and lists every declaration allowed to reach it", () => {
        for (const id of RULE_IDS) {
            expect(RULES[id].seam, id).toMatch(/^[\w-]+\.ts#\w+$/);
            for (const reader of RULES[id].readers)
                expect(reader, id).toMatch(/^[\w-]+\.ts#\w+$/);
        }
        // The intel gate is reached from three places, which is the whole reason it
        // is a gate; immunity is read at its seam and nowhere else.
        expect(RULES["information.omniscient"].readers).toHaveLength(3);
        expect(RULES["removal.immune"].readers).toHaveLength(0);
    });
});
describe("a value is only ever read through ruleValue", () => {
    it("reads the normal value on a campaign that has set nothing", () => {
        const plain = buildCampaign();
        expect(ruleValue(plain, "information.omniscient")).toBe(false);
        expect(ruleValue(plain, "removal.immune")).toBe(false);
        expect(omniscientRead(plain)).toBe(false);
        expect(ruleReports()).toEqual([]);
    });
    it("one paid rule does not make a campaign omniscient", () => {
        const immuneOnly = withRules({
            values: { "removal.immune": true },
            log: [{ kind: "set", rule: "removal.immune", value: true, date: DAY }],
        });
        expect(ruleValue(immuneOnly, "removal.immune")).toBe(true);
        expect(ruleValue(immuneOnly, "information.omniscient")).toBe(false);
        expect(omniscientRead(immuneOnly)).toBe(false);
    });
    it("falls back to the normal value for a value this build does not offer, and says so once", () => {
        const strange = withRules({
            values: { "removal.immune": "yes" },
            log: [],
        });
        expect(ruleValue(strange, "removal.immune")).toBe(false);
        expect(ruleValue(strange, "removal.immune")).toBe(false);
        expect(ruleReports()).toHaveLength(1);
        expect(ruleReports()[0]).toContain("removal.immune");
    });
    it("keeps a stored id it does not know, ignores it, and reports it once", () => {
        const later = withRules({
            values: { "congress.compliant": true },
            log: [],
        });
        expect(ruleValue(later, "removal.immune")).toBe(false);
        expect(ruleValue(later, "information.omniscient")).toBe(false);
        expect(ruleReports()).toHaveLength(1);
        expect(ruleReports()[0]).toContain("congress.compliant");
        // Kept, not dropped: the build that wrote it may be opened again.
        expect(later.rules?.values).toHaveProperty(["congress.compliant"]);
    });
});
describe("suspension holds a paid rule back without forgetting it", () => {
    it("makes both paid rules read normal, logs once, and keeps the stored values", () => {
        const suspended = applyRules(bothOn(), {
            kind: "rules",
            change: { kind: "suspend", since: DAY, reason: "the God mode DLC was not found on this device" },
        });
        expect(rulesAreSuspended(suspended)).toBe(true);
        expect(ruleValue(suspended, "information.omniscient")).toBe(false);
        expect(ruleValue(suspended, "removal.immune")).toBe(false);
        expect(suspended.rules?.values).toEqual({ "information.omniscient": true, "removal.immune": true });
        expect(suspended.rules?.log).toHaveLength(3);
        expect(ruleChangeDate(suspended.rules.log.at(-1))).toEqual(DAY);
        // The status it reached is a high-water mark, so holding the rules back does
        // not hand the campaign its ranking back.
        expect(campaignStatus(suspended).status).toBe("sandbox");
    });
    it("adds nothing on a second suspend, and nothing on a resume that resumes nothing", () => {
        const once = applyRules(bothOn(), {
            kind: "rules",
            change: { kind: "suspend", since: DAY, reason: "no entitlement on this device" },
        });
        const twice = applyRules(once, {
            kind: "rules",
            change: { kind: "suspend", since: { ...DAY, day: 5 }, reason: "no entitlement on this device" },
        });
        expect(twice).toBe(once);
        expect(twice.rules?.log).toHaveLength(3);
        const never = applyRules(bothOn(), { kind: "rules", change: { kind: "resume", date: DAY } });
        expect(never.rules?.log).toHaveLength(2);
    });
    it("restores both values on resume and logs it once", () => {
        const suspended = applyRules(bothOn(), {
            kind: "rules",
            change: { kind: "suspend", since: DAY, reason: "no entitlement on this device" },
        });
        const resumed = applyRules(suspended, { kind: "rules", change: { kind: "resume", date: { ...DAY, day: 11 } } });
        expect(rulesAreSuspended(resumed)).toBe(false);
        expect(ruleValue(resumed, "information.omniscient")).toBe(true);
        expect(ruleValue(resumed, "removal.immune")).toBe(true);
        expect(resumed.rules?.log).toHaveLength(4);
        expect(campaignStatus(resumed).status).toBe("sandbox");
    });
    it("has no free entry to hold back, which is why suspension is checked per tier", () => {
        // The letter of the rule is "paid entries read their normal value while
        // suspended, free entries are unaffected". W4 registers no free entry, so
        // this states the premise the reading rests on rather than pretending to
        // exercise a case that has no subject yet.
        expect(RULE_IDS.every((id) => RULES[id].tier === "paid")).toBe(true);
    });
});
describe("status is a lattice that never falls, and Challenge is only a label", () => {
    it("reads standard until a paid option is used, then sandbox for good", () => {
        expect(campaignStatus(buildCampaign())).toEqual({ status: "standard", challenge: false });
        expect(campaignStatus(bothOn()).status).toBe("sandbox");
    });
    it("reads sandbox from the old flag alone, so a campaign an editor touched still counts", () => {
        const legacy = {
            ...buildCampaign(),
            godMode: { enabled: true, enabledTurn: 1, actions: 1, branchPoints: [] },
        };
        expect(campaignStatus(legacy).status).toBe("sandbox");
    });
    it("stays sandbox after a paid value is set back to its default", () => {
        const off = applyRules(bothOn(), {
            kind: "rules",
            change: { kind: "set", rule: "removal.immune", value: false, date: DAY },
        });
        expect(ruleValue(off, "removal.immune")).toBe(false);
        expect(campaignStatus(off).status).toBe("sandbox");
    });
    it("a harder free option reads as Challenge and loses the label at its default", () => {
        const hostile = {
            id: "world.posture",
            kind: "setup",
            tier: "free",
            values: ["normal", "hostile"],
            statuses: ["standard", "standard"],
            harder: [false, true],
            seam: "relationship-graph.ts#buildInitialRelationships",
            readers: [],
            seamClass: "founding-edge",
            influence: "input",
            readiness: "WR",
            changes: "founding-only",
            switchesOff: [],
            enables: [],
            demotes: [],
            copy: { name: "Hostile world", holds: "Capitals open colder toward Washington.", costs: "Nothing." },
        };
        expect(challengeReading([hostile], { "world.posture": "hostile" })).toBe(true);
        expect(challengeReading([hostile], { "world.posture": "normal" })).toBe(false);
        expect(challengeReading([hostile], {})).toBe(false);
        // A paid option is Sandbox, never Challenge, however hard it reads.
        expect(challengeReading([{ ...hostile, tier: "paid" }], { "world.posture": "hostile" })).toBe(false);
    });
    it("no registered entry can raise the Challenge label in W4, because none is free", () => {
        expect(campaignStatus(bothOn()).challenge).toBe(false);
    });
});
describe("one writer, and every packet re-anchors the debt clamp", () => {
    it("sets a value, appends the change, and marks nothing else", () => {
        const base = buildCampaign();
        const next = applyRules(base, {
            kind: "rules",
            change: { kind: "set", rule: "information.omniscient", value: true, date: DAY },
        });
        expect(next.rules?.values).toEqual({ "information.omniscient": true });
        expect(next.rules?.log).toHaveLength(1);
        // The handler is not the flag's writer: a rules packet on its own leaves the
        // Sandbox marker alone, and `apply()` is what marks a god-sourced packet.
        expect("godMode" in next).toBe(false);
    });
    it("re-anchors lastBooked on a set, a suspend and a resume alike", () => {
        const base = buildCampaign();
        const debt = base.nations[base.founding.nation]?.stats.economy.debt;
        expect(debt).toBeTypeOf("number");
        let state = applyRules(base, {
            kind: "rules",
            change: { kind: "set", rule: "removal.immune", value: true, date: DAY },
        });
        expect(state.rules?.state?.debtRule?.lastBooked).toBe(debt);
        state = applyRules(state, { kind: "rules", change: { kind: "suspend", since: DAY, reason: "no entitlement" } });
        expect(state.rules?.state?.debtRule?.lastBooked).toBe(debt);
        state = applyRules(state, { kind: "rules", change: { kind: "resume", date: DAY } });
        expect(state.rules?.state?.debtRule?.lastBooked).toBe(debt);
    });
    it("dates every change off the campaign's own calendar when it builds the set", () => {
        const base = buildCampaign();
        const changes = setRuleChanges(base, { "information.omniscient": true, "removal.immune": true });
        expect(changes).toHaveLength(2);
        for (const change of changes)
            expect(ruleChangeDate(change)).toEqual(base.calendar);
    });
    it("round-trips through JSON unchanged, which is what storing it in a save is", () => {
        const state = applyRules(bothOn(), { kind: "rules", change: { kind: "suspend", since: DAY, reason: "no entitlement" } });
        expect(JSON.parse(JSON.stringify(state.rules))).toEqual(state.rules);
    });
});
