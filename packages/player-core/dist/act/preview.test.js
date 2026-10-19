import { describe, expect, it } from "vitest";
import { apply, createRngStreams, issueAction, likelihoodFromUnitInterval, projectForceAuthorization, tariffIncidence, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { formatMoney } from "../format/money";
import { engagementReading } from "../world/engagement";
import { ACT_GOALS, actHref, actOption, optionsForGoal } from "./catalogue";
import { engagementPlan, treatyPlan } from "./plan";
import { DEFAULT_TARIFF_RATE, WILLINGNESS_WORDS, instrumentDraft, instrumentProjection, moneyShort, previewOptions, tariffDraft } from "./preview";
// Each card prints the engine's own projection of its act in words, and the
// plan the card opens reads the same projection: one estimator, two sizes.
const campaign = openingCampaign();
const GBR = "GBR";
const PRK = "PRK";
const CHN = "CHN";
describe("the cards an act workspace draws", () => {
    it("prices every option under every goal, and says why wherever one cannot be taken", () => {
        for (const goal of ACT_GOALS) {
            const options = optionsForGoal(goal);
            const previews = previewOptions(campaign, CHN, options);
            expect(previews.size).toBe(options.length);
            for (const preview of previews.values()) {
                expect(preview.cost.length).toBeGreaterThan(0);
                expect(preview.timing.length).toBeGreaterThan(0);
                if (preview.state !== "open")
                    expect(preview.reason?.length ?? 0).toBeGreaterThan(0);
            }
        }
    });
    it("reads an instrument rung's odds off the same projection the order would be priced on", () => {
        const option = actOption("diplomatic-2");
        const preview = previewOptions(campaign, CHN, [option]).get(option.id);
        const projected = instrumentProjection(campaign, instrumentDraft(campaign, CHN, "diplomatic", 2));
        if (!projected.ok)
            throw new Error(projected.reason);
        expect(preview.state).toBe("open");
        expect(preview.odds?.word).toBe(likelihoodFromUnitInterval(projected.projection.successChance));
        expect(preview.scale).toEqual({ label: "Intensity", level: 2, of: 5 });
        // The list's short columns are the same projection, said shorter.
        expect(preview.short.cost).toBe(moneyShort(projected.projection.cost.treasury ?? 0));
        expect(preview.short.timing).toBe((projected.projection.timing?.days ?? 0) > 0 ? `${projected.projection.timing.days} days` : "Now");
    });
    it("prices a military rung at the force the President chose, not only the staff's default", () => {
        const option = actOption("military-2");
        const draft = instrumentDraft(campaign, CHN, "military", 2);
        const min = draft.choice.composed.min;
        expect(draft.choice?.composed.closedReason).toBeUndefined();
        const small = instrumentDraft(campaign, CHN, "military", 2, min);
        expect(small.force?.count).toBe(min);
        const preview = previewOptions(campaign, CHN, [option], { option: option.id, count: min }).get(option.id);
        const projected = instrumentProjection(campaign, small);
        if (!projected.ok)
            throw new Error(projected.reason);
        expect(preview.odds?.word).toBe(likelihoodFromUnitInterval(projected.projection.successChance));
    });
    it("states a force act's price basis with the figure the card charges, and the count the President chose", () => {
        const option = actOption("military-4");
        const target = "MEX";
        const draft = instrumentDraft(campaign, target, "military", 4);
        const projected = instrumentProjection(campaign, draft);
        if (!projected.ok)
            throw new Error(projected.reason);
        const basis = projected.projection.costBasis;
        expect(basis.units).toBe(draft.force.count);
        const preview = previewOptions(campaign, target, [option]).get(option.id);
        expect(preview.cost).toBe(`${formatMoney(basis.upFront)} spent`);
        expect(preview.basis).toContain(`${formatMoney(basis.upFront)} now`);
        expect(preview.basis).toContain(`${basis.units} fighters`);
    });
    it("prices support and civilian assessment on the same request the selected card orders", () => {
        const option = actOption("military-4");
        const config = { option: option.id, support: "seek", partners: [GBR], strikeObjective: "logistics", civilianProtection: "additional-assessment" };
        const draft = instrumentDraft(campaign, "MEX", "military", 4, undefined, config);
        const projected = instrumentProjection(campaign, draft);
        if (!projected.ok)
            throw new Error(projected.reason);
        const preview = previewOptions(campaign, "MEX", [option], config).get(option.id);
        expect(preview.odds?.word).toBe(likelihoodFromUnitInterval(projected.projection.successChance));
        expect(preview.short.timing).toBe(`${projected.projection.timing.days} days`);
        expect(projected.projection.support?.responses[0]?.status).toBe("pending");
        const issued = issueAction(campaign, draft.request, createRngStreams(campaign.seed));
        if (!issued.ok)
            throw new Error(issued.missingCapability);
        const next = apply(campaign, issued.packet);
        const operation = Object.values(next.issuedActs ?? {}).find((act) => act.kind === "instrument");
        expect(operation?.kind === "instrument" && operation.request.support).toEqual({ mode: "seek", partners: [GBR] });
        expect(operation?.kind === "instrument" && operation.request.civilianProtection).toBe("additional-assessment");
        expect(operation?.kind === "instrument" && operation.request.strikeObjective).toBe("logistics");
        const address = new URL(actHref("MEX", config), "https://example.test");
        expect(address.searchParams.get("support")).toBe("seek");
        expect(address.searchParams.get("partners")).toBe(GBR);
        expect(address.searchParams.get("strikeObjective")).toBe("logistics");
        expect(address.searchParams.get("civilianProtection")).toBe("additional-assessment");
    });
    it("requires a partner selection before a support-seeking order becomes available", () => {
        const option = actOption("military-4");
        const preview = previewOptions(campaign, CHN, [option], { option: option.id, support: "seek" }).get(option.id);
        expect(preview.state).toBe("held");
        expect(preview.reason).toMatch(/partner/);
    });
    it("says why a state visit to a capital that distrusts us is off the table, instead of leaving it out", () => {
        const option = actOption("engagement-visit");
        const preview = previewOptions(campaign, PRK, [option]).get(option.id);
        expect(preview.state).toBe("held");
        expect(preview.reason).toMatch(/trusts you/);
    });
    it("forecasts a meeting the way the engagement reading does", () => {
        const option = actOption("engagement-call");
        const preview = previewOptions(campaign, GBR, [option]).get(option.id);
        const call = engagementReading(campaign, GBR).options.find((entry) => entry.kind === "call");
        expect(preview.odds?.word).toBe(WILLINGNESS_WORDS[call.forecast]);
        expect(engagementPlan(campaign, GBR, "call")?.steps.some((step) => step.reading === "trust" && step.direction === "up")).toBe(true);
    });
    it("reads the vote for force off the engine's own count", () => {
        const option = actOption("authorization");
        const preview = previewOptions(campaign, PRK, [option]).get(option.id);
        expect(preview.odds?.word).toBe(projectForceAuthorization(campaign, PRK).forecast.likelihood);
    });
    /** China's practices already found unfair, so a Section 301 tariff can be priced at any rate. */
    function withFinding(base) {
        const finding = { id: "finding:s301:CHN:test", statute: "s301", partner: CHN, openedTurn: base.turn, openedDate: base.calendar, dueDate: base.calendar, outcome: "affirmative", decidedDate: base.calendar };
        return { ...base, trade: { ...base.trade, findings: { [finding.id]: finding } } };
    }
    it("prices a tariff with the incidence the economy room books, at the rate and on the goods chosen", () => {
        const draft = tariffDraft(campaign, CHN);
        expect(draft.rate).toBe(Math.min(DEFAULT_TARIFF_RATE, draft.room));
        const option = actOption("tariff");
        const preview = previewOptions(withFinding(campaign), CHN, [option], { option: "tariff", sector: draft.sector.sector, rate: 20, statute: "s301" }).get("tariff");
        const incidence = tariffIncidence(campaign, CHN, draft.sector.sector, 0.2);
        expect(preview.cost).toBe(`${formatMoney(incidence.revenue)} a year coming in`);
        expect(previewOptions(campaign, CHN, [option], { option: "tariff", rate: 0 }).get("tariff")?.state).toBe("held");
    });
    it("refuses explicit unknown goods and invalid rates instead of substituting a different order", () => {
        expect(tariffDraft(campaign, CHN, "unknown-goods", 10)).toBeUndefined();
        for (const rate of [0, -1, 1.5, 101, Number.NaN, Number.POSITIVE_INFINITY])
            expect(tariffDraft(campaign, CHN, undefined, rate)).toBeUndefined();
        const goods = tariffDraft(campaign, CHN).sector.sector;
        const canonical = previewOptions(withFinding(campaign), CHN, [actOption("tariff")], { option: "economic-2", sector: goods, rate: 20, statute: "s301" }).get("tariff");
        expect(canonical?.note).toContain("20%");
    });
    it("holds a rate above the chosen law's cap and offers the investigation a missing finding needs", () => {
        const option = actOption("tariff");
        const goods = tariffDraft(campaign, CHN).sector.sector;
        expect(tariffDraft(campaign, CHN, goods, 20, "s122")).toBeUndefined();
        const investigation = previewOptions(campaign, CHN, [option], { option: "tariff", sector: goods, statute: "s232" }).get("tariff");
        expect(investigation.state).toBe("open");
        expect(investigation.timing).toContain("weeks");
        expect(investigation.note).toContain("Commerce");
    });
    it("marks a ladder under way once an operation on it is being prepared, so a second cannot be ordered", () => {
        const draft = instrumentDraft(campaign, CHN, "covert", 1);
        const issued = issueAction(campaign, draft.request, createRngStreams(campaign.seed));
        if (!issued.ok)
            throw new Error(issued.reason);
        expect(issued.pending).toBe(true);
        const after = apply(campaign, issued.packet);
        const previews = previewOptions(after, CHN, optionsForGoal("covert"));
        for (const preview of previews.values())
            expect(preview.state).toBe("underway");
    });
    it("plans a treaty only where the other side would sign it, with the Senate's read where it must ratify", () => {
        const plan = treatyPlan(campaign, GBR, "trade");
        expect(treatyPlan(campaign, CHN, "trade")).toBeUndefined();
        expect(plan.binds).toBe("ratification");
        expect(plan.senate?.forecast.likelihood).toBeDefined();
        expect(plan.inForce.length).toBeGreaterThan(0);
    });
});
