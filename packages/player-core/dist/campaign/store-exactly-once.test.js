import { describe, expect, it } from "vitest";
import { advanceTurn, createRngStreams, legislativeAct, noopPhase, signBill, signOrder } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { charterOf } from "./founding-options";
import { STALE_ACT_MESSAGE, createCampaignStore } from "./store";
function current(store) {
    const state = store.getState();
    if (state.status !== "ready")
        throw new Error("expected a ready campaign");
    return state.campaign;
}
function orderPacket(campaign) {
    const result = signOrder(campaign, charterOf(campaign), "order-border-controls", createRngStreams(campaign.seed));
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
function billOnDesk(campaign) {
    const act = legislativeAct("act-infrastructure-investment");
    if (!act)
        throw new Error("the infrastructure act is missing");
    const bill = {
        id: `bill:${act.id}:${campaign.turn}`,
        act: act.id,
        title: act.title,
        sponsor: act.sponsor,
        introducedTurn: campaign.turn,
        status: "on-the-desk",
        passage: [],
    };
    return { campaign: { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } }, bill };
}
describe("campaign store authorization is exactly once", () => {
    it("refuses a captured-basis order packet before and after restore, then permits a distinct later signature", async () => {
        const storage = createMemoryStorage();
        const store = createCampaignStore({ saves: createSaveStore(storage) });
        await store.begin(openingCampaign());
        const basis = current(store);
        const packet = orderPacket(basis);
        const first = await store.commit(packet, { basis });
        expect(first.persisted).toBe(true);
        const signed = current(store);
        const order = signed.orders.at(-1);
        const rule = signed.pendingRules.at(-1);
        const treasury = signed.player.metrics.treasury;
        const ledgerLength = signed.ledger.length;
        expect(treasury).toBeLessThan(basis.player.metrics.treasury);
        expect(ledgerLength).toBe(basis.ledger.length + 1);
        await expect(store.commit(packet, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        expect(current(store)).toBe(signed);
        const reopened = createCampaignStore({ saves: createSaveStore(storage) });
        await reopened.restore();
        const restored = current(reopened);
        await expect(reopened.commit(packet, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        expect(current(reopened)).toBe(restored);
        expect(restored.orders.filter((entry) => entry.id === order.id)).toHaveLength(1);
        expect(restored.pendingRules.filter((entry) => entry.id === rule.id)).toHaveLength(1);
        expect(restored.player.metrics.treasury).toBe(treasury);
        expect(restored.ledger).toHaveLength(ledgerLength);
        expect(signOrder(restored, charterOf(restored), "order-border-controls", createRngStreams(restored.seed)).ok).toBe(false);
        // Close a week without unrelated world changes; reissue is a new decision on a dated board.
        const laterStore = createCampaignStore({ saves: createSaveStore(createMemoryStorage()) });
        await laterStore.begin(advanceTurn(restored, { simulate: noopPhase, select: noopPhase }));
        const laterBasis = current(laterStore);
        await laterStore.commit(orderPacket(laterBasis), { basis: laterBasis });
        const reissued = current(laterStore);
        expect(reissued.orders.at(-1).id).not.toBe(order.id);
        expect(reissued.orders.filter((entry) => entry.order === "order-border-controls")).toHaveLength(2);
        expect(reissued.pendingRules).toHaveLength(laterBasis.pendingRules.length + 1);
        expect(reissued.player.metrics.treasury).toBeLessThan(laterBasis.player.metrics.treasury);
        expect(reissued.ledger).toHaveLength(laterBasis.ledger.length + 1);
    });
    it("keeps an isolated on-desk bill's one-time charge single across a duplicate press and reload", async () => {
        const storage = createMemoryStorage();
        const store = createCampaignStore({ saves: createSaveStore(storage) });
        const setup = billOnDesk(openingCampaign());
        await store.begin(setup.campaign);
        const basis = current(store);
        const result = signBill(basis, setup.bill.id);
        if (!result.ok)
            throw new Error(result.reason);
        await store.commit(result.packet, { basis });
        const signed = current(store);
        const treasury = signed.player.metrics.treasury;
        const ledgerLength = signed.ledger.length;
        const ruleCount = signed.pendingRules.length;
        expect(treasury).toBeLessThan(basis.player.metrics.treasury);
        expect(ledgerLength).toBe(basis.ledger.length + 1);
        await expect(store.commit(result.packet, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        const reopened = createCampaignStore({ saves: createSaveStore(storage) });
        await reopened.restore();
        const restored = current(reopened);
        await expect(reopened.commit(result.packet, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        expect(restored.bills[setup.bill.id]?.status).toBe("law");
        expect(restored.player.metrics.treasury).toBe(treasury);
        expect(restored.pendingRules).toHaveLength(ruleCount);
        expect(restored.ledger).toHaveLength(ledgerLength);
        expect(signBill(restored, setup.bill.id).ok).toBe(false);
    });
    it("retries a failed order save without replaying its accepted packet", async () => {
        const storage = createMemoryStorage();
        const saves = createSaveStore(storage);
        let failWrite = false;
        const store = createCampaignStore({ saves: {
                ...saves,
                write: async (campaign) => {
                    if (failWrite)
                        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
                    return saves.write(campaign);
                },
            } });
        await store.begin(openingCampaign());
        const basis = current(store);
        const packet = orderPacket(basis);
        failWrite = true;
        const first = await store.commit(packet, { basis });
        expect(first.persisted).toBe(false);
        const accepted = current(store);
        const ledgerLength = accepted.ledger.length;
        const treasury = accepted.player.metrics.treasury;
        await expect(store.commit(packet, { basis })).rejects.toThrow(STALE_ACT_MESSAGE);
        failWrite = false;
        const retry = await store.retrySave();
        expect(retry.persisted).toBe(true);
        expect(retry.eventIds).toEqual([]);
        expect(current(store)).toBe(accepted);
        const reopened = createCampaignStore({ saves: createSaveStore(storage) });
        await reopened.restore();
        const restored = current(reopened);
        expect(restored.orders.filter((entry) => entry.id === accepted.orders.at(-1).id)).toHaveLength(1);
        expect(restored.pendingRules.filter((entry) => entry.id === accepted.pendingRules.at(-1).id)).toHaveLength(1);
        expect(restored.player.metrics.treasury).toBe(treasury);
        expect(restored.ledger).toHaveLength(ledgerLength);
    });
});
