import { describe, expect, it } from "vitest";
import { actCost, advanceTurn, apply, createSave, fiscalPhase, lawShift, legislativeAct, legislationPhase, loadSave, noopPhase, selectCurrentLaws, selectFiscalStatement, selectHillMember, selectLaws, signBill, transmit } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { fiscalBooks, fiscalPreview } from "../economy/fiscal-books";
import { billFundingLines, billInstrument, billRestingLines, billStatusLine, enactmentEffects, lawBindings, lawOffsetYears, shortfallCounterparty, tieBreakLine } from "./bill-reading";
import { recordEntry } from "../record/record-entry";
const base = openingCampaign();
function infrastructureBillOnDesk() {
    const opening = openingCampaign({ seedText: "bill-concordance" });
    const ready = { ...opening, congress: { ...opening.congress, disposition: 0.9 } };
    const proposal = transmit(ready, "act-infrastructure-investment");
    if (!proposal.ok)
        throw new Error(proposal.reason);
    let campaign = apply(ready, proposal.packet);
    const proposalId = campaign.ledger.at(-1)?.causal?.eventId;
    if (!proposalId)
        throw new Error("The proposal left no Record event");
    const id = `bill:act-infrastructure-investment:${ready.turn}`;
    for (let week = 0; week < 30 && campaign.bills[id]?.status === "in-progress"; week += 1) {
        campaign = advanceTurn(campaign, { simulate: legislationPhase, select: noopPhase });
    }
    const bill = campaign.bills[id];
    if (!bill || bill.status !== "on-the-desk")
        throw new Error(`The seeded infrastructure bill did not reach the President: ${bill?.status}`);
    return { campaign, bill, proposalId };
}
function reviewInfrastructureBill(before, bill) {
    const act = legislativeAct(bill.act);
    const document = billInstrument(bill, act, before.congress.caucusAnchor);
    const funding = billFundingLines(before, act, bill);
    const preview = fiscalPreview(before, {}, enactmentEffects(before, bill));
    expect(bill.passage).toHaveLength(2);
    expect(bill.passage.every((vote) => vote.passed && vote.recordedTurn !== undefined)).toBe(true);
    expect(billStatusLine(bill)).toContain("Waiting for your signature");
    expect(document).toContain(act.summary);
    expect(funding).toContain("The yearly change lasts 5 years");
    expect(funding[0]).toMatch(/a year in new spending/);
    expect(funding).toContainEqual(expect.stringMatching(/taken from the money available to spend once it becomes law/));
    expect(preview?.cost.deficit).toBeGreaterThan(0);
    if (!preview)
        throw new Error("The fiscal review omitted the bill's annual cost");
    return { act, funding, preview, priorStatement: selectFiscalStatement(before), priorLawOutlays: lawShift(before).outlays };
}
function enactHousing(campaign, actId) {
    const proposed = transmit(campaign, actId);
    if (!proposed.ok)
        throw new Error(proposed.reason);
    let working = apply(campaign, proposed.packet);
    const id = `bill:${actId}:${campaign.turn}`;
    const proposalId = working.ledger.at(-1)?.causal?.eventId;
    if (!proposalId)
        throw new Error(`${actId} left no proposal Record event`);
    for (let week = 0; week < 40 && working.bills[id]?.status === "in-progress"; week += 1) {
        working = advanceTurn(working, { simulate: legislationPhase, select: noopPhase });
    }
    if (working.bills[id]?.status !== "on-the-desk")
        throw new Error(`${actId} did not reach the desk: ${working.bills[id]?.status}`);
    const signature = signBill(working, id);
    if (!signature.ok)
        throw new Error(signature.reason);
    working = apply(working, signature.packet);
    const signatureId = working.ledger.at(-1)?.causal?.eventId;
    if (!signatureId)
        throw new Error(`${actId} left no signature Record event`);
    return { campaign: working, bill: working.bills[id], proposalId, signatureId };
}
const taxCut = {
    id: "bill:act-tax-relief-and-growth:1",
    act: "act-tax-relief-and-growth",
    title: "Tax Relief and Growth Act",
    sponsor: "bipartisan",
    introducedTurn: base.turn,
    status: "on-the-desk",
    passage: [],
};
// The tax cut forgoes about $220 billion a year for the four years it is
// written for, and its preview showed nothing: the act carries no effects of
// its own, and its price lives in the statute's offset to the books.
describe("a bill's price on the books, before it is signed", () => {
    it("prices the receipts a tax cut forgoes, for the years the statute runs", () => {
        const preview = fiscalPreview(base, {}, enactmentEffects(base, taxCut));
        const gdp = selectFiscalStatement(base).gdp;
        expect(preview?.cost.deficit).toBeGreaterThan(0.007 * gdp);
        expect(preview?.cost.deficit).toBeLessThan(0.009 * gdp);
        expect(lawOffsetYears(taxCut.act)).toBe(4);
    });
    it("prices nothing for an act the books do not read", () => {
        expect(fiscalPreview(base, {}, enactmentEffects(base, { ...taxCut, id: "bill:act-none:1", act: "act-none" }))).toBeUndefined();
        expect(lawOffsetYears("act-none")).toBeUndefined();
    });
    it("separates annual forgone revenue from any enactment charge", () => {
        const act = legislativeAct(taxCut.act);
        const lines = billFundingLines(base, act);
        expect(lines).toEqual([expect.stringMatching(/a year in lost revenue/), "The yearly change lasts 4 years"]);
        expect(lines.every((line) => !line.includes("on enactment"))).toBe(true);
    });
    it("reads a statute's supply effect even when it has no direct fiscal flow", () => {
        const act = legislativeAct("act-immigration-reform");
        expect(billFundingLines(base, act)).toEqual([]);
        expect(billRestingLines(act)).toEqual([expect.stringMatching(/basic rate while the program runs/)]);
    });
    it("keeps an appropriation at enactment distinct from its annual outlays", () => {
        const lines = billFundingLines(base, legislativeAct("act-infrastructure-investment"));
        expect(lines).toEqual([
            expect.stringMatching(/a year in new spending/),
            "The yearly change lasts 5 years",
            expect.stringMatching(/taken from the money available to spend once it becomes law/),
        ]);
    });
});
it("keeps one real bill's document, review, annual cost, implementation and Record in agreement", () => {
    const { campaign: before, bill, proposalId } = infrastructureBillOnDesk();
    const { act, funding, preview, priorStatement, priorLawOutlays } = reviewInfrastructureBill(before, bill);
    const review = signBill(before, bill.id);
    if (!review.ok)
        throw new Error(review.reason);
    const signed = apply(before, review.packet);
    const law = signed.bills[bill.id];
    const signatureId = signed.ledger.at(-1)?.causal?.eventId;
    if (!signatureId)
        throw new Error("The signature left no Record event");
    const annual = selectFiscalStatement(signed);
    expect(law.status).toBe("law");
    expect(law.enactedBy).toBe("signed");
    expect(billStatusLine(law)).toContain("Signed into law");
    expect(billStatusLine({ ...law, enactedBy: "unsigned" })).toContain("Became law without your signature");
    expect(billStatusLine({ ...law, enactedBy: "veto-overridden" })).toContain("Became law over your veto");
    expect(billInstrument(law, act, signed.congress.caucusAnchor)).toContain(act.summary);
    expect(billFundingLines(signed, act, law)).toEqual(funding);
    expect(lawShift(signed).outlays - priorLawOutlays).toBeCloseTo(0.004);
    expect(signed.player.metrics.treasury - before.player.metrics.treasury).toBeCloseTo(actCost(before, act).treasury ?? 0, 0);
    expect(annual.outlayTotal - priorStatement.outlayTotal).toBeCloseTo(preview.cost.deficit, 0);
    expect(fiscalBooks(signed)?.balance).toBe(annual.balance);
    expect(signed.cohorts).not.toEqual(before.cohorts);
    expect(signed.nations[signed.founding.nation].stats.politics.protestPressure)
        .toBeLessThan(before.nations[before.founding.nation].stats.politics.protestPressure);
    expect(signBill(signed, bill.id).ok).toBe(false);
    const proposalRow = recordEntry(signed, proposalId);
    const signatureRow = recordEntry(signed, signatureId);
    expect(proposalRow?.description).toContain(act.title);
    expect(signatureRow?.description).toContain(act.title);
    expect(signatureRow?.actorWord).toBe("Your administration");
    const booked = fiscalPhase(signed).reduce((state, packet) => apply(state, packet), signed);
    const control = fiscalPhase(before).reduce((state, packet) => apply(state, packet), before);
    const nation = signed.founding.nation;
    const extraDebt = booked.nations[nation].stats.economy.debt - control.nations[nation].stats.economy.debt;
    expect(extraDebt).toBeCloseTo((annual.outlayTotal - priorStatement.outlayTotal) / 52, 0);
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(booked))));
    expect(restored.bills[bill.id]).toEqual(law);
    expect(signBill(restored, bill.id).ok).toBe(false);
    expect(recordEntry(restored, signatureId)?.description).toBe(signatureRow?.description);
    expect(selectFiscalStatement(restored).outlayTotal).toBe(selectFiscalStatement(booked).outlayTotal);
});
it("keeps the first housing law's Record when a replacement becomes current and the save reloads", () => {
    let opening = openingCampaign({ seedText: "record-housing-lifecycle" });
    for (let week = 0; week < 15; week += 1) {
        opening = advanceTurn(opening, { simulate: noopPhase, select: noopPhase });
    }
    const ready = { ...opening, congress: { ...opening.congress, disposition: 0.9 } };
    const first = enactHousing(ready, "act-housing-supply");
    const firstRecord = recordEntry(first.campaign, first.signatureId);
    expect(firstRecord?.description).toContain("Housing Supply Partnership Act");
    expect(firstRecord?.actorWord).toBe("Your administration");
    expect(firstRecord?.causes).toEqual([]);
    const second = enactHousing(first.campaign, "act-housing-replacement");
    expect(second.bill.revises).toEqual({ billId: first.bill.id, kind: "replacement" });
    expect(selectCurrentLaws(second.campaign).map((bill) => bill.id)).toEqual([second.bill.id]);
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(second.campaign))));
    expect(selectLaws(restored).map((bill) => bill.id)).toContain(first.bill.id);
    expect(restored.bills[first.bill.id]).toEqual(first.bill);
    expect(billStatusLine(restored.bills[first.bill.id])).toContain("Signed into law");
    expect(selectCurrentLaws(restored).map((bill) => bill.id)).toEqual([second.bill.id]);
    expect(lawBindings(restored).map((reading) => reading.bill.id)).toEqual([second.bill.id]);
    expect(recordEntry(restored, first.signatureId)?.description).toBe(firstRecord?.description);
    expect(recordEntry(restored, first.signatureId)?.actorWord).toBe(firstRecord?.actorWord);
    expect(recordEntry(restored, first.signatureId)?.causes).toEqual(firstRecord?.causes);
    expect(restored.ledger.find((entry) => entry.causal?.eventId === first.signatureId)?.causal)
        .toEqual(first.campaign.ledger.find((entry) => entry.causal?.eventId === first.signatureId)?.causal);
    expect(recordEntry(restored, second.signatureId)?.description).toContain("Targeted Housing Partnership Act");
    expect(recordEntry(restored, second.signatureId)?.actorWord).toBe("Your administration");
});
describe("tieBreakLine", () => {
    const senateVote = { chamber: "senate", yeas: 51, nays: 49, required: 51, passed: true };
    it("names nobody when the count was never tied", () => {
        expect(tieBreakLine(base, senateVote)).toBeUndefined();
    });
    it("names the person a vote's tieBrokenBy records", () => {
        const [officerId, officer] = Object.entries(base.people)[0];
        const broken = { ...senateVote, tieBrokenBy: officerId };
        const line = tieBreakLine(base, broken);
        expect(line).toContain("President of the Senate");
        expect(line).toContain(officer.base.name);
    });
});
describe("shortfallCounterparty", () => {
    it("names nobody when the count carries", () => {
        const carried = { chamber: "senate", yeas: 60, nays: 40, required: 60, passed: true };
        expect(shortfallCounterparty(base, carried)).toBeUndefined();
    });
    it("names the chamber's own minority leader on a short count", () => {
        const short = { chamber: "senate", yeas: 55, nays: 45, required: 60, passed: false };
        const minority = selectHillMember(base, "post-senate-minority-leader");
        expect(shortfallCounterparty(base, short)).toBe(minority?.name);
    });
});
