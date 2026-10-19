// Load repair, deadline status, and automation confirmation. A damaged entry
// is dropped. A deadline does not apply the family's legal sentence.
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { CASE_FAMILIES, familyCanEnd, raiseForFamily } from "./case-families.js";
import { confirmedAutomationEffects, automationPreview } from "./case-automation.js";
import { dueDefaultEffects } from "./case-defaults.js";
import { advanceUntilAttention } from "./advance.js";
import { apply } from "./effects.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import { noopPhase } from "./turn-loop.js";
const bill = {
    id: "bill-1",
    kind: "bill",
    title: "A bill is on the desk",
    subject: { kind: "bill", id: "bill-1" },
    clock: { kind: "statutory", dueAt: { year: 2029, month: 2, day: 1 } },
    defaultOutcome: { kind: "legal-default", outcomeId: "constitutional result" },
    urgency: "hard",
    responseRequirement: "president",
    allowedDispositions: ["act", "defer", "allow-default"],
};
const press = {
    id: "press-1",
    kind: "press-response",
    title: "A question",
    subject: { kind: "press", id: "press-1" },
    clock: { kind: "none" },
    defaultOutcome: { kind: "none" },
    urgency: "soft",
    responseRequirement: "delegable",
    allowedDispositions: ["act", "decline"],
};
function packet(effects) {
    return { source: "conversation", actor: "player", turn: 1, narration: { summary: "The case moved." }, effects };
}
describe("case save and deadline", () => {
    it("round-trips a case on schema v52 and leaves a campaign with no registry untouched", () => {
        const raised = apply(buildCampaign(), packet([{ kind: "case", actor: "player", raise: bill }]));
        const save = createSave(raised);
        expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        const loaded = loadSave(JSON.parse(JSON.stringify(save)));
        expect(loaded.cases?.["bill-1"]?.id).toBe("bill-1");
        expect(loaded.cases?.["bill-1"]?.status).toBe("raised");
        expect(loaded.cases?.["bill-1"]?.history).toHaveLength(1);
        const plain = loadSave(JSON.parse(JSON.stringify(createSave(buildCampaign()))));
        expect(plain.cases).toBeUndefined();
    });
    it("round-trips a deferral and a named delegation", () => {
        const campaign = buildCampaign();
        const emergency = {
            ...bill,
            id: "em-1",
            kind: "emergency",
            clock: { kind: "none" },
            defaultOutcome: { kind: "none" },
            allowedDispositions: ["act", "defer", "delegate"],
        };
        const raised = apply(campaign, packet([
            { kind: "case", actor: "player", raise: bill },
            { kind: "case", actor: "player", raise: emergency },
        ]));
        const moved = apply(raised, packet([
            {
                kind: "case",
                actor: "player",
                transition: {
                    id: "bill-1",
                    disposition: { kind: "defer", until: { year: 2029, month: 1, day: 20 } },
                    narration: "Put off.",
                },
            },
            {
                kind: "case",
                actor: "player",
                transition: {
                    id: "em-1",
                    disposition: { kind: "delegate", institution: "relief-desk" },
                    narration: "Sent on.",
                },
            },
        ]));
        const loaded = loadSave(JSON.parse(JSON.stringify(createSave(moved))));
        expect(loaded.cases?.["bill-1"]?.status).toBe("deferred");
        expect(loaded.cases?.["bill-1"]?.deferredUntil).toEqual({ year: 2029, month: 1, day: 20 });
        expect(loaded.cases?.["bill-1"]?.history).toHaveLength(2);
        expect(loaded.cases?.["em-1"]?.status).toBe("delegated");
        expect(loaded.cases?.["em-1"]?.history[1]?.disposition).toEqual({ kind: "delegate", institution: "relief-desk" });
        const plain = JSON.stringify(createSave(buildCampaign())).length;
        const withCases = JSON.stringify(createSave(moved)).length;
        expect(withCases - plain).toBeGreaterThan(0);
    });
    it("drops a damaged entry and does not record that drop as a decline", () => {
        const raised = apply(buildCampaign(), packet([{ kind: "case", actor: "player", raise: bill }]));
        const raw = JSON.parse(JSON.stringify(createSave(raised)));
        raw.campaign.cases["ghost"] = { id: "other", status: "declined", history: [] };
        const loaded = loadSave(raw);
        expect(loaded.cases?.["bill-1"]?.status).toBe("raised");
        expect(loaded.cases?.["ghost"]).toBeUndefined();
        expect(Object.values(loaded.cases ?? {}).some((item) => item.status === "declined")).toBe(false);
    });
    it("changes a due case to defaulted and leaves the stored legal sentence unapplied", () => {
        const campaign = buildCampaign();
        const due = { ...bill, clock: { kind: "statutory", dueAt: campaign.calendar } };
        const raised = apply(campaign, packet([{ kind: "case", actor: "player", raise: due }]));
        const effects = dueDefaultEffects(raised);
        expect(effects).toHaveLength(1);
        expect(effects[0]?.transition?.disposition).toEqual({ kind: "allow-default" });
        const after = apply(raised, packet(effects));
        expect(after.cases?.["bill-1"]?.status).toBe("defaulted");
        expect(after.cases?.["bill-1"]?.defaultOutcome).toEqual(due.defaultOutcome);
        expect(after.player.metrics).toEqual(raised.player.metrics);
    });
    it("defaults a due case when the day runs and keeps the case on the record", () => {
        const campaign = buildCampaign();
        const due = { ...bill, clock: { kind: "statutory", dueAt: campaign.calendar } };
        const raised = apply(campaign, packet([{ kind: "case", actor: "player", raise: due }]));
        const result = advanceUntilAttention(raised, {
            phases: { simulate: noopPhase, select: noopPhase },
            horizonDays: 1,
        });
        expect(result.campaign.cases?.["bill-1"]?.status).toBe("defaulted");
        expect(result.campaign.cases?.["bill-1"]?.defaultOutcome).toEqual(due.defaultOutcome);
        expect(result.elapsedDays).toBeGreaterThan(0);
    });
    it("refuses a blank delegate and does not close the case", () => {
        const emergency = {
            ...bill,
            id: "em-1",
            kind: "emergency",
            clock: { kind: "none" },
            defaultOutcome: { kind: "none" },
            allowedDispositions: ["act", "delegate"],
        };
        const raised = apply(buildCampaign(), packet([{ kind: "case", actor: "player", raise: emergency }]));
        expect(() => apply(raised, packet([
            {
                kind: "case",
                actor: "player",
                transition: {
                    id: "em-1",
                    disposition: { kind: "delegate", institution: "  " },
                    narration: "Nobody.",
                },
            },
        ]))).toThrow(/nobody/);
        expect(raised.cases?.["em-1"]?.status).toBe("raised");
    });
    it("confirms only soft cases the preview already named", () => {
        const campaign = apply(buildCampaign(), packet([
            { kind: "case", actor: "player", raise: bill },
            { kind: "case", actor: "player", raise: press },
        ]));
        const rule = {
            id: "rule-1",
            name: "Decline soft press",
            kinds: ["press-response"],
            maxUrgency: "soft",
            disposition: { kind: "decline" },
            enabled: true,
        };
        expect(automationPreview(campaign, rule)).toEqual(["press-1"]);
        expect(automationPreview(campaign, { ...rule, enabled: false })).toEqual([]);
        const effects = confirmedAutomationEffects(campaign, rule, ["press-1", "bill-1", "missing"]);
        expect(effects.map((effect) => effect.transition?.id)).toEqual(["press-1"]);
    });
    it("keeps a statutory clock, and does not auto-decline a nomination", () => {
        const dueAt = { year: 2029, month: 2, day: 1 };
        expect(CASE_FAMILIES.every((row) => familyCanEnd(row))).toBe(true);
        const raised = raiseForFamily({
            kind: "bill",
            id: "b",
            title: "A bill",
            subject: { kind: "bill", id: "b" },
            dueAt,
        });
        expect(raised.clock).toEqual({ kind: "statutory", dueAt });
        expect(raised.defaultOutcome).toEqual({ kind: "legal-default", outcomeId: "constitutional result" });
        expect(() => raiseForFamily({ kind: "bill", id: "b", title: "A bill", subject: { kind: "bill", id: "b" } })).toThrow(/due date/);
        const nomination = raiseForFamily({
            kind: "nomination",
            id: "n",
            title: "A nomination",
            subject: { kind: "nomination", id: "n" },
        });
        expect(nomination.clock).toEqual({ kind: "none" });
        expect(nomination.defaultOutcome).toEqual({ kind: "none" });
    });
});
