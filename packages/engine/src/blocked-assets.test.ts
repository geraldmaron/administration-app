import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { declareExternalEmergency } from "./external-emergency.js";
import { blockableAccount, blockedAssetPhase } from "./blocked-assets.js";
import { signOrder } from "./orders.js";
import { rescindOrder } from "./order-lifecycle.js";
import { createRngStreams } from "./rng.js";
import { selectLiveMeasures, tradeEdgesWith } from "./trade.js";
import { openedProceeding } from "./court-procedure.js";
import type { Campaign, Pursuit } from "./state.js";

function threat(): { campaign: Campaign; nation: Campaign["founding"]["nation"] } {
  const opened = foundedForBalance("blocked-asset-record").campaign;
  const nation = Object.keys(opened.nations).find((id) => id !== opened.founding.nation
    && tradeEdgesWith(opened, id as Campaign["founding"]["nation"]).some((edge) => edge.imports > 0))! as Campaign["founding"]["nation"];
  const pursuit: Pursuit = { id: `pursuit:block:${nation}`, actor: nation, target: opened.founding.nation,
    aim: "security", openedTurn: opened.turn, commitment: 0.7, progress: 0.2,
    rungReached: 2, overt: true, lastActedTurn: opened.turn, status: "active", beats: [] };
  return { campaign: { ...opened, pursuits: { ...opened.pursuits, [pursuit.id]: pursuit } }, nation };
}

describe("foreign-property blocking", () => {
  it("suspends dealings under an adverse judgment without lifting or recreating the account", () => {
    const { campaign, nation } = threat();
    const declaration = declareExternalEmergency(campaign, `pursuit:block:${nation}`, "national-security");
    if (!declaration.ok) throw new Error(declaration.reason);
    const declared = apply(campaign, declaration.packet);
    const signed = signOrder(declared, CHARTER_USA_CONSTITUTION, "order-asset-seizure",
      createRngStreams(declared.seed), { kind: "foreign", nation });
    if (!signed.ok) throw new Error(signed.reason);
    const blocked = apply(declared, signed.packet);
    const asset = blocked.blockedAssets![0]!;
    const proceeding = openedProceeding(signed.record.id, signed.record.order, blocked.turn, blocked.turn);
    const lower = { ...proceeding, stage: "appeal" as const,
      lower: { holding: "struck-down" as const, ruledTurn: blocked.turn,
        ground: "silent" as const, enforcement: "in-force" as const } };
    const suspended = { ...blocked, judiciary: { ...blocked.judiciary,
      proceedings: [...(blocked.judiciary.proceedings ?? []), lower] } };
    expect(selectLiveMeasures(suspended).some((entry) => entry.id === asset.tradeMeasureId)).toBe(false);
    expect(blockedAssetPhase(suspended)).toEqual([]);
    expect(suspended.blockedAssets![0]).toEqual(asset);
    const granted = { ...suspended, judiciary: { ...suspended.judiciary,
      proceedings: suspended.judiciary.proceedings!.map((entry) => entry.id === lower.id
        ? { ...lower, lower: { ...lower.lower, enforcement: "stayed-pending-appeal" as const } } : entry) } };
    expect(selectLiveMeasures(granted).some((entry) => entry.id === asset.tradeMeasureId)).toBe(true);
    expect(granted.trade.measures[asset.tradeMeasureId]).toEqual(blocked.trade.measures[asset.tradeMeasureId]);
  });
  it("links a bounded modeled account to an operative dealings restriction and releases both", () => {
    const { campaign, nation } = threat();
    expect(blockableAccount(campaign, nation)).toBeDefined();
    const declaration = declareExternalEmergency(campaign, `pursuit:block:${nation}`, "national-security");
    if (!declaration.ok) throw new Error(declaration.reason);
    const declared = apply(campaign, declaration.packet);
    const signed = signOrder(declared, CHARTER_USA_CONSTITUTION, "order-asset-seizure",
      createRngStreams(declared.seed), { kind: "foreign", nation });
    if (!signed.ok) throw new Error(signed.reason);
    const blocked = apply(declared, signed.packet);
    const asset = blocked.blockedAssets?.[0];
    if (!asset) throw new Error("The order did not block an account");
    expect(asset).toMatchObject({ owner: nation, modeled: true, status: "blocked", emergencyId: declaration.record.id });
    expect(blocked.trade.measures[asset.tradeMeasureId]).toMatchObject({ kind: "asset-restriction", target: nation });
    expect(blockableAccount(blocked, nation)).toBeUndefined();
    const rescission = rescindOrder(blocked, signed.record.id);
    if (!rescission.ok) throw new Error(rescission.reason);
    const released = apply(blocked, rescission.packet);
    expect(released.blockedAssets?.[0]?.status).toBe("released");
    expect(released.trade.measures[asset.tradeMeasureId]?.liftedTurn).toBe(blocked.turn);
  });

  it("ends the linked restriction when its specific emergency expires", () => {
    const { campaign, nation } = threat();
    const declaration = declareExternalEmergency(campaign, `pursuit:block:${nation}`, "national-security");
    if (!declaration.ok) throw new Error(declaration.reason);
    const declared = apply(campaign, declaration.packet);
    const signed = signOrder(declared, CHARTER_USA_CONSTITUTION, "order-asset-seizure",
      createRngStreams(declared.seed), { kind: "foreign", nation });
    if (!signed.ok) throw new Error(signed.reason);
    const blocked = apply(declared, signed.packet);
    const due = { ...blocked, turn: declaration.record.expiresTurn };
    const released = blockedAssetPhase(due).reduce(apply, due);
    expect(released.blockedAssets?.[0]).toMatchObject({ status: "released", releaseReason: "emergency-ended" });
    expect(released.trade.measures[blocked.blockedAssets![0]!.tradeMeasureId]?.liftedTurn).toBe(due.turn);
  });
});
