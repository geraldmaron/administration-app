import { describe, expect, it } from "vitest";
import { Charter, ORG_CSTO, ORG_NATO } from "@admin/world";
import { submitForRatification } from "./__fixtures__/issued-acts.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { TREATY_TERMS, compactTreatyId, issueRatification, outstandingIssuedTreatyActs, projectRatification, resolveDueTreaties, signTreaty, treatyTitle, withdrawTreaty, } from "./treaties.js";
import { apply } from "./effects.js";
import { majorityOf, supermajorityOf } from "./congress.js";
import { selectBindingTreaties, selectTreatiesAwaitingRatification, sharesCompact } from "./state.js";
import { likelihoodFromUnitInterval } from "./assessments.js";
const COUNTERPART = "ALP";
const charter = Charter.parse({
    id: "charter-1",
    name: "The Constitution",
    removalMechanism: "impeachment",
    cabinetRoles: ["role-chancellor"],
    institutions: [{ name: "Congress", role: "Advises and consents.", kind: "assembly" }],
    decisionConstraint: "Treaties require the Senate.",
    successionRule: "The Vice President serves out the term.",
    roleTitles: { "role-chancellor": "President" },
});
const withDisposition = (disposition) => {
    const campaign = buildCampaign();
    return { ...campaign, congress: { ...campaign.congress, disposition } };
};
function signed(campaign, kind = "trade") {
    const result = signTreaty(campaign, charter, kind, COUNTERPART);
    if (!result.ok)
        throw new Error(result.reason);
    return { state: apply(campaign, result.packet), id: result.record.id };
}
describe("signing abroad", () => {
    it("puts a document on the record and binds nobody with it", () => {
        const { state, id } = signed(buildCampaign());
        expect(selectTreatiesAwaitingRatification(state).map((record) => record.id)).toEqual([id]);
        expect(selectBindingTreaties(state)).toHaveLength(0);
        const relationship = state.relationships[`${state.founding.nation}:${COUNTERPART}`];
        expect(relationship.treaties).toHaveLength(0);
    });
    it("lets a president sign what the Senate will not ratify", () => {
        const hostile = withDisposition(0);
        const { state, id } = signed(hostile);
        expect(projectRatification(state, state.treaties[id]).wouldRatify).toBe(false);
        expect(state.treaties[id].status).toBe("signed");
    });
    it("refuses a counterpart that will not sit down at all", () => {
        const campaign = buildCampaign();
        const cold = {
            ...campaign,
            relationships: {
                ...campaign.relationships,
                [`${campaign.founding.nation}:${COUNTERPART}`]: {
                    ...campaign.relationships[`${campaign.founding.nation}:${COUNTERPART}`],
                    trust: -0.9,
                },
            },
        };
        expect(signTreaty(cold, charter, "alliance", COUNTERPART).ok).toBe(false);
    });
    it("refuses a second copy of an instrument already on the table", () => {
        const { state } = signed(buildCampaign());
        expect(signTreaty(state, charter, "trade", COUNTERPART).ok).toBe(false);
    });
    it("names the instrument and the government it is with", () => {
        expect(treatyTitle(buildCampaign(), "arms-control", COUNTERPART)).toContain("Alpland");
    });
});
describe("the Senate's two thirds", () => {
    it("is a harder bar than the one that confirms a Secretary", () => {
        expect(supermajorityOf(100)).toBe(67);
        expect(majorityOf(100)).toBe(51);
        const { state, id } = signed(buildCampaign());
        expect(projectRatification(state, state.treaties[id]).vote.required).toBe(67);
    });
    it("refuses a treaty a simple majority would have carried", () => {
        // The whole point of the arithmetic: a chamber that would confirm this
        // administration's nominees will still not put sixty-seven names on a treaty.
        const { state, id } = signed(withDisposition(0.55));
        const projection = projectRatification(state, state.treaties[id]);
        expect(projection.vote.yeas).toBeGreaterThan(majorityOf(100));
        expect(projection.wouldRatify).toBe(false);
    });
    it("carries one for an administration the Senate is genuinely behind", () => {
        const { state, id } = signed(withDisposition(1));
        expect(projectRatification(state, state.treaties[id]).wouldRatify).toBe(true);
    });
    it("holds arms control to a higher bar than trade, with the same Senate", () => {
        const campaign = withDisposition(0.85);
        const trade = signed(campaign, "trade");
        const arms = signed(campaign, "arms-control");
        expect(projectRatification(arms.state, arms.state.treaties[arms.id]).vote.yeas).toBeLessThan(projectRatification(trade.state, trade.state.treaties[trade.id]).vote.yeas);
    });
});
describe("ratification", () => {
    it("writes the instrument into the relationship both ways once it is in force", () => {
        const { state, id } = signed(withDisposition(1));
        const result = submitForRatification(state, charter, id);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(state, result.packet);
        expect(after.treaties[id].status).toBe("ratified");
        expect(after.relationships[`${after.founding.nation}:${COUNTERPART}`].treaties).toHaveLength(1);
        expect(selectBindingTreaties(after)).toHaveLength(1);
    });
    it("costs a president standing when the Senate refuses, and keeps the refusal on the record", () => {
        const { state, id } = signed(withDisposition(0));
        const result = submitForRatification(state, charter, id);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(state, result.packet);
        expect(after.treaties[id].status).toBe("rejected");
        expect(after.treaties[id].vote).toBeDefined();
        expect(after.player.metrics.standing).toBeLessThan(state.player.metrics.standing);
        expect(after.relationships[`${after.founding.nation}:${COUNTERPART}`].treaties).toHaveLength(0);
    });
    it("refuses to send up what is not awaiting a vote", () => {
        const { state, id } = signed(withDisposition(1));
        const first = submitForRatification(state, charter, id);
        if (!first.ok)
            throw new Error(first.reason);
        expect(submitForRatification(apply(state, first.packet), charter, id).ok).toBe(false);
        expect(submitForRatification(state, charter, "treaty:trade:NOPE:1").ok).toBe(false);
    });
    it("lets a president pull it back rather than lose it", () => {
        const { state, id } = signed(withDisposition(0));
        const result = withdrawTreaty(state, id);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(state, result.packet);
        expect(after.treaties[id].status).toBe("withdrawn");
        expect(withdrawTreaty(after, id).ok).toBe(false);
    });
    it("titles what it narrates from the charter rather than assuming a president", () => {
        const chancellery = Charter.parse({ ...charter, roleTitles: { "role-chancellor": "Chancellor" } });
        const result = signTreaty(buildCampaign(), chancellery, "trade", COUNTERPART);
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.packet.narration.summary).toContain("Chancellor");
    });
    it("issues a pending act with a frozen forecast, then resolves on the due date", () => {
        const { state, id } = signed(withDisposition(1));
        const issued = issueRatification(state, id);
        if (!issued.ok)
            throw new Error(issued.reason);
        expect(issued.act.status).toBe("awaiting-response");
        expect(issued.act.forecast.likelihood).toBe(likelihoodFromUnitInterval(issued.act.chance));
        expect(issued.projection.forecast.likelihood).not.toEqual(issued.projection.forecast.confidence);
        const pending = apply(state, issued.packet);
        expect(outstandingIssuedTreatyActs(pending)).toHaveLength(1);
        expect(pending.treaties[id].status).toBe("signed");
        expect(issueRatification(pending, id).ok).toBe(false);
        const resolved = resolveDueTreaties({ ...pending, calendar: issued.act.dueDate });
        expect(resolved.campaign.treaties[id].status).toBe("ratified");
        expect(resolved.campaign.issuedActs?.[issued.act.id]?.status).toBe("resolved");
        expect(outstandingIssuedTreatyActs(resolved.campaign)).toHaveLength(0);
    });
    it("keeps exact yeas off the ordinary forecast and softens the shortfall copy", () => {
        const { state, id } = signed(withDisposition(0.55));
        const projection = projectRatification(state, state.treaties[id]);
        expect(projection.reasoning).not.toMatch(/\d+\s+short/);
        expect(projection.reasoning).not.toMatch(/\d+\s+in\s+100/);
        expect(projection.forecast.likelihood).toBe(likelihoodFromUnitInterval(projection.successChance));
    });
    it("expires a pending floor act when the signature is withdrawn", () => {
        const { state, id } = signed(withDisposition(0));
        const issued = issueRatification(state, id);
        if (!issued.ok)
            throw new Error(issued.reason);
        const pending = apply(state, issued.packet);
        const withdrawn = withdrawTreaty(pending, id);
        if (!withdrawn.ok)
            throw new Error(withdrawn.reason);
        const after = apply(pending, withdrawn.packet);
        expect(after.treaties[id].status).toBe("withdrawn");
        expect(after.issuedActs?.[issued.act.id]?.status).toBe("withdrawn");
        expect(outstandingIssuedTreatyActs(after)).toHaveLength(0);
    });
});
describe("executive agreements", () => {
    it("concludes without any Senate count and is in force the moment it is signed", () => {
        const campaign = buildCampaign();
        const result = signTreaty(campaign, charter, "executive-agreement", COUNTERPART);
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.record.status).toBe("in-force-by-signature");
        const after = apply(campaign, result.packet);
        expect(after.treaties[result.record.id].status).toBe("in-force-by-signature");
        expect(selectTreatiesAwaitingRatification(after)).toHaveLength(0);
        // In force the moment it is signed is the whole point of the kind — it
        // belongs in the same count a ratified treaty does.
        expect(selectBindingTreaties(after)).toHaveLength(1);
        expect(after.relationships[`${after.founding.nation}:${COUNTERPART}`].treaties).toHaveLength(1);
    });
    it("moves the relationship by strictly less than a ratified treaty would", () => {
        // Every axis, not just one — a discounted promise is discounted all the
        // way through, not just on the axis a spot check happens to read.
        expect(TREATY_TERMS["executive-agreement"].effect.trust).toBeLessThan(TREATY_TERMS.alliance.effect.trust);
        expect(TREATY_TERMS["executive-agreement"].effect.alignment).toBeLessThan(TREATY_TERMS.alliance.effect.alignment);
        expect(Math.abs(TREATY_TERMS["executive-agreement"].effect.tension)).toBeLessThan(Math.abs(TREATY_TERMS.alliance.effect.tension));
    });
    it("earns less standing than ratification and costs the chamber it went around", () => {
        const campaign = buildCampaign();
        const result = signTreaty(campaign, charter, "executive-agreement", COUNTERPART);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(campaign, result.packet);
        expect(after.player.metrics.standing).toBeGreaterThan(campaign.player.metrics.standing);
        expect(after.player.metrics.standing - campaign.player.metrics.standing).toBeLessThan(0.06);
        expect(after.congress.disposition).toBeLessThan(campaign.congress.disposition);
    });
    it("refuses to send an executive agreement to a Senate it never goes to", () => {
        const campaign = buildCampaign();
        const result = signTreaty(campaign, charter, "executive-agreement", COUNTERPART);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(campaign, result.packet);
        expect(submitForRatification(after, charter, result.record.id).ok).toBe(false);
    });
    it("lets a government too cold for a treaty still take an executive agreement", () => {
        const campaign = buildCampaign();
        const key = `${campaign.founding.nation}:${COUNTERPART}`;
        const cold = {
            ...campaign,
            relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], trust: -0.35 } },
        };
        expect(signTreaty(cold, charter, "alliance", COUNTERPART).ok).toBe(false);
        expect(signTreaty(cold, charter, "executive-agreement", COUNTERPART).ok).toBe(true);
    });
    it("lets a president revoke one already in force, unwinding what it did and costing more than pulling back a signature", () => {
        const campaign = buildCampaign();
        const signResult = signTreaty(campaign, charter, "executive-agreement", COUNTERPART);
        if (!signResult.ok)
            throw new Error(signResult.reason);
        const signed = apply(campaign, signResult.packet);
        const key = `${signed.founding.nation}:${COUNTERPART}`;
        const trustInForce = signed.relationships[key].trust;
        const withdrawal = withdrawTreaty(signed, signResult.record.id);
        if (!withdrawal.ok)
            throw new Error(withdrawal.reason);
        const after = apply(signed, withdrawal.packet);
        expect(after.treaties[signResult.record.id].status).toBe("withdrawn");
        expect(after.relationships[key].trust).toBeLessThan(trustInForce);
        // The withdrawal's own cost, isolated from the standing the signature
        // already earned — pulling back a live commitment costs more than pulling
        // back a mere signature ever did (-0.02).
        expect(signed.player.metrics.standing - after.player.metrics.standing).toBeGreaterThan(0.02);
    });
});
describe("the compacts already in force when a president takes office", () => {
    it("names one instrument per compact, so both members hold the same document", () => {
        expect(compactTreatyId(ORG_NATO)).toBe(compactTreatyId(ORG_NATO));
        expect(compactTreatyId(ORG_NATO)).not.toBe(compactTreatyId(ORG_CSTO));
    });
    it("cannot be confused with something this administration signed", () => {
        const { state, id } = signed(withDisposition(1));
        expect(id).not.toBe(compactTreatyId(ORG_NATO));
        expect(state.treaties[id].treaty).not.toBe(compactTreatyId(ORG_NATO));
    });
});
// `sharesCompact` moved onto the read path so the treaty floor and the intel gate
// read one function rather than two. One test, on the selector, rather than a
// second copy of the question per caller.
describe("sharesCompact", () => {
    function withMemberships(a, b) {
        const base = buildCampaign();
        const us = base.nations[base.founding.nation];
        const them = base.nations[COUNTERPART];
        return {
            ...base,
            nations: {
                ...base.nations,
                [base.founding.nation]: { ...us, base: { ...us.base, memberships: a } },
                [COUNTERPART]: { ...them, base: { ...them.base, memberships: b } },
            },
        };
    }
    it("is true when the two governments sit in the same standing body", () => {
        expect(sharesCompact(withMemberships([ORG_NATO], [ORG_NATO]), COUNTERPART)).toBe(true);
    });
    it("is false when each sits in a body the other does not", () => {
        expect(sharesCompact(withMemberships([ORG_NATO], [ORG_CSTO]), COUNTERPART)).toBe(false);
    });
    it("is false for a government with no memberships at all, and for one the board does not hold", () => {
        expect(sharesCompact(withMemberships([ORG_NATO], []), COUNTERPART)).toBe(false);
        expect(sharesCompact(withMemberships([ORG_NATO], [ORG_NATO]), "ZZZ")).toBe(false);
    });
});
