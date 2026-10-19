import { defaultTurnPhases } from "./turn-loop.js";
import { advanceUntilAttention } from "./advance.js";
import { describe, expect, it } from "vitest";
import { Relationship, type TreatyId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { issueAction, outstandingInstrumentActs, resolveDueInstruments, withdrawInstrumentAct } from "./instrument-issued.js";
import { resolveStrikeHarm, strikeCivilianRisk } from "./strike-outcomes.js";
import { counterpartWillingness } from "./treaty-counterpart.js";
import { engagementPacket, projectReceive } from "./engagement.js";
import { collectionShareRefusal, shareCollectionReport, type CollectionProduct } from "./intelligence.js";
import { relationshipKey, selectRelationship } from "./state.js";
import { projectAction, type ResolutionRequest } from "./resolution.js";
import type { NationId } from "@admin/world";
import { warPowersStanding } from "./congress.js";

const request: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "economic", rung: 1 };
function issued() {
  const before = buildCampaign();
  const result = issueAction(before, request, createRngStreams(before.seed));
  if (!result.ok) throw new Error(result.missingCapability);
  return { before, result, after: apply(before, result.packet) };
}

describe("instrument order lifecycle", () => {
  it("reserves funds without resolving, survives serialization, then reports once", () => {
    const { before, result, after } = issued();
    expect(result.pending).toBe(true);
    expect(after.nations).toEqual(before.nations);
    expect(after.relationships).toEqual(before.relationships);
    expect(after.player.metrics.treasury).toBeLessThan(before.player.metrics.treasury);
    expect(resolveDueInstruments(after).packets).toEqual([]);
    const saved = JSON.parse(JSON.stringify(after)) as typeof after;
    const act = outstandingInstrumentActs(saved)[0]!;
    const resolved = resolveDueInstruments({ ...saved, calendar: act.dueDate });
    expect(resolved.packets).toHaveLength(1);
    expect(resolved.campaign.issuedActs?.[act.id]?.status).toBe("reported");
    expect(resolved.campaign.player.metrics.treasury).toBe(after.player.metrics.treasury);
    expect(resolveDueInstruments(resolved.campaign).packets).toEqual([]);
    expect(resolveDueInstruments({ ...saved, calendar: act.dueDate })).toEqual(resolved);
  });
  it("rejects duplicates and releases reservations on stand-down", () => {
    const { before, after } = issued();
    expect(issueAction(after, request, createRngStreams(after.seed)).ok).toBe(false);
    const act = outstandingInstrumentActs(after)[0]!;
    const stopped = withdrawInstrumentAct(after, act.id);
    if (!stopped.ok) throw new Error(stopped.missingCapability);
    const canceled = apply(after, stopped.packet);
    expect(canceled.player.metrics.treasury).toBe(before.player.metrics.treasury);
    expect(outstandingInstrumentActs(canceled)).toHaveLength(0);
    expect(resolveDueInstruments({ ...canceled, calendar: act.dueDate }).packets).toHaveLength(0);
  });
  it("does not invent deaths before execution and varies harm independently of mission success", () => {
    const campaign = buildCampaign();
    const strike: ResolutionRequest = { ...request, instrument: "military", rung: 4 };
    expect(strikeCivilianRisk(campaign, strike)?.chance).toBeGreaterThan(0);
    const reports = Array.from({ length: 50 }, (_, seed) => resolveStrikeHarm(campaign, strike, createRngStreams(makeCampaignSeed(`harm-${seed}`)))!);
    expect(reports.some((report) => report.casualties)).toBe(true);
    expect(reports.some((report) => !report.casualties)).toBe(true);
    for (const report of reports.filter((report) => report.casualties)) {
      expect(report.effects.some((effect) => effect.kind === "impactEvent")).toBe(true);
      expect(report.effects.some((effect) => effect.kind === "opinion")).toBe(true);
      expect(report.account).toContain("confidence");
      expect(report.account).not.toContain("school");
    }
  });
  it("makes a first strike betray a trusting partner even without civilian deaths", () => {
    const base = buildCampaign();
    const towardThem = base.relationships[relationshipKey(nationA.id, nationB.id)]!;
    const towardUs = Relationship.parse({ ...towardThem, from: nationB.id, to: nationA.id, trust: 0.8 });
    const campaign = { ...base, relationships: {
      ...base.relationships,
      [relationshipKey(nationB.id, nationA.id)]: towardUs,
      [relationshipKey(nationA.id, nationB.id)]: { ...towardThem, trust: 0.8 },
    } };
    const strike: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };
    const before = counterpartWillingness(campaign, nationB.id, "alliance")!;
    const meeting = { actor: nationA.id, target: nationB.id, kind: "visit" as const };
    const receivingBefore = projectReceive(campaign, meeting);
    const report: CollectionProduct = { id: "report:trust-repair", tasking: "task:trust-repair" as never,
      element: "IC-NSA" as never, discipline: "sigint", targetKind: "foreign-nation", target: "THIRD",
      question: "What is changing?", day: 0, date: campaign.calendar, weight: 0.7,
      summary: "A dated warning.", status: "findings", findings: [] };
    const withReport = (state: typeof campaign) => ({ ...state, security: { ...state.security,
      intelligence: { ...state.security.intelligence, archive: [...(state.security.intelligence.archive ?? []), report] } } });
    expect(collectionShareRefusal(withReport(campaign), report.id, nationB.id)).toBeUndefined();
    const seeds = Array.from({ length: 80 }, (_, i) => `betrayal-${i}`).filter((value) =>
      !resolveStrikeHarm(campaign, strike, createRngStreams(makeCampaignSeed(value)))?.casualties).slice(0, 5);
    expect(seeds).toHaveLength(5);
    for (const seed of seeds) {
      const harm = resolveStrikeHarm(campaign, strike, createRngStreams(makeCampaignSeed(seed)))!;
      const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Strike report." }, effects: harm.effects });
      expect(selectRelationship(after, nationB.id, nationA.id)!.trust).toBeLessThan(0.8);
      expect(selectRelationship(after, nationA.id, nationB.id)!.trust).toBe(0.8);
      expect(counterpartWillingness(after, nationB.id, "alliance")!.score).toBeLessThan(before.score);
      expect(projectReceive(after, meeting).score).toBeLessThan(receivingBefore.score);
      // Sharing is the United States' decision and reads the opposite edge.
      // The strike changed the victim's trust, not our trust in the victim.
      expect(collectionShareRefusal(withReport(after), report.id, nationB.id)).toBeUndefined();
      expect(shareCollectionReport(withReport(after), report.id, [nationB.id]).ok).toBe(true);
      expect(selectRelationship(after, nationB.id, nationA.id)!.history.some((entry) => entry.kind === "betrayal")).toBe(true);
      const repeated = resolveStrikeHarm(after, strike, createRngStreams(makeCampaignSeed(seed)))!;
      expect(repeated.effects.some((effect) => effect.kind === "relationship" && effect.addHistory?.kind === "betrayal")).toBe(false);
      const twice = apply(after, { source: "simulate", actor: "world", turn: after.turn,
        narration: { summary: "Second strike report." }, effects: repeated.effects });
      expect(selectRelationship(twice, nationB.id, nationA.id)!.trust).toBe(selectRelationship(after, nationB.id, nationA.id)!.trust);
      const visit = engagementPacket(after, meeting, createRngStreams(makeCampaignSeed("repair-visit")));
      expect(visit.ok && visit.received).toBe(true);
      if (!visit.ok || !visit.received) continue;
      const repaired = apply(after, visit.packet);
      const repairedEdge = selectRelationship(repaired, nationB.id, nationA.id)!;
      expect(repairedEdge.trust).toBeGreaterThan(selectRelationship(after, nationB.id, nationA.id)!.trust);
      expect(repairedEdge.trust).toBeLessThan(0.8);
      expect(repairedEdge.history.some((entry) => entry.kind === "betrayal")).toBe(true);
      expect(counterpartWillingness(repaired, nationB.id, "alliance")!.score)
        .toBeGreaterThan(counterpartWillingness(after, nationB.id, "alliance")!.score);
      expect(projectReceive(repaired, meeting).score).toBeGreaterThan(projectReceive(after, meeting).score);
      expect(collectionShareRefusal(withReport(repaired), report.id, nationB.id)).toBeUndefined();
      expect(shareCollectionReport(withReport(repaired), report.id, [nationB.id]).ok).toBe(true);
    }
  });

  it("charges the same once-only betrayal when a foreign government strikes the player", () => {
    const base = buildCampaign();
    const towardActor = Relationship.parse({ ...base.relationships[relationshipKey(nationA.id, nationB.id)]!, trust: 0.8 });
    const campaign = { ...base, relationships: { ...base.relationships,
      [relationshipKey(nationA.id, nationB.id)]: towardActor,
      [relationshipKey(nationB.id, nationA.id)]: Relationship.parse({ ...towardActor, from: nationB.id, to: nationA.id }),
    } };
    const strike: ResolutionRequest = { actor: nationB.id, target: nationA.id, instrument: "military", rung: 4 };
    const seed = Array.from({ length: 80 }, (_, i) => `npc-betrayal-${i}`).find((value) =>
      !resolveStrikeHarm(campaign, strike, createRngStreams(makeCampaignSeed(value)))?.casualties)!;
    expect(seed).toBeDefined();
    const first = resolveStrikeHarm(campaign, strike, createRngStreams(makeCampaignSeed(seed)))!;
    const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn,
      narration: { summary: "Foreign strike report." }, effects: first.effects });
    expect(first.casualties).toBeUndefined();
    expect(selectRelationship(after, nationA.id, nationB.id)!.trust).toBeCloseTo(0.64);
    expect(selectRelationship(after, nationB.id, nationA.id)!.trust).toBe(selectRelationship(campaign, nationB.id, nationA.id)!.trust);
    expect(selectRelationship(after, nationA.id, nationB.id)!.history.filter((entry) => entry.kind === "betrayal")).toHaveLength(1);
    const repeated = resolveStrikeHarm(after, strike, createRngStreams(makeCampaignSeed(seed)))!;
    const twice = apply(after, { source: "simulate", actor: "world", turn: after.turn,
      narration: { summary: "Another foreign strike report." }, effects: repeated.effects });
    expect(selectRelationship(twice, nationA.id, nationB.id)!.trust).toBeCloseTo(0.64);
    expect(selectRelationship(twice, nationA.id, nationB.id)!.history.filter((entry) => entry.kind === "betrayal")).toHaveLength(1);
  });

  it("records a real defense treaty breach after trust has cooled, unlike a trade agreement", () => {
    const base = buildCampaign();
    const outward = base.relationships[relationshipKey(nationA.id, nationB.id)]!;
    const cooled = Relationship.parse({ ...outward, from: nationB.id, to: nationA.id, trust: 0.1 });
    const treaty = { id: "treaty:alliance:ALP:1", treaty: "treaty-defense-proof" as TreatyId,
      title: "Mutual defense", kind: "alliance" as const, counterpart: nationB.id,
      signedTurn: base.turn, status: "ratified" as const };
    const withTreaty = (kind: "alliance" | "trade") => ({ ...base,
      relationships: { ...base.relationships, [relationshipKey(nationB.id, nationA.id)]: cooled },
      treaties: { ...base.treaties, [treaty.id]: { ...treaty, kind } },
    });
    const strike: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };
    const seed = Array.from({ length: 80 }, (_, i) => `cool-treaty-${i}`).find((value) =>
      !resolveStrikeHarm(withTreaty("alliance"), strike, createRngStreams(makeCampaignSeed(value)))?.casualties)!;
    expect(seed).toBeDefined();
    const alliance = resolveStrikeHarm(withTreaty("alliance"), strike, createRngStreams(makeCampaignSeed(seed)))!;
    const trade = resolveStrikeHarm(withTreaty("trade"), strike, createRngStreams(makeCampaignSeed(seed)))!;
    const breach = alliance.effects.find((effect) => effect.kind === "relationship" && effect.from === nationB.id && effect.to === nationA.id);
    const other = trade.effects.find((effect) => effect.kind === "relationship" && effect.from === nationB.id && effect.to === nationA.id);
    expect(breach?.kind === "relationship" ? breach.deltas?.trust : undefined).toBeCloseTo(-0.02);
    expect(breach?.kind === "relationship" ? breach.addHistory?.description : undefined).toContain("defense partner");
    expect(other?.kind === "relationship" ? other.deltas?.trust : undefined).toBeCloseTo(0);
    expect(other?.kind === "relationship" ? other.addHistory : undefined).toBeUndefined();

    const npcStrike: ResolutionRequest = { ...strike, actor: nationB.id, target: nationA.id };
    const npcCampaign = (kind: "alliance" | "trade") => ({ ...withTreaty(kind), relationships: {
      ...withTreaty(kind).relationships,
      [relationshipKey(nationA.id, nationB.id)]: Relationship.parse({ ...outward, trust: 0.1 }),
    } });
    const npcSeed = Array.from({ length: 80 }, (_, i) => `npc-cool-treaty-${i}`).find((value) =>
      !resolveStrikeHarm(npcCampaign("alliance"), npcStrike, createRngStreams(makeCampaignSeed(value)))?.casualties)!;
    expect(npcSeed).toBeDefined();
    const npcAlliance = resolveStrikeHarm(npcCampaign("alliance"), npcStrike, createRngStreams(makeCampaignSeed(npcSeed)))!;
    const npcTrade = resolveStrikeHarm(npcCampaign("trade"), npcStrike, createRngStreams(makeCampaignSeed(npcSeed)))!;
    const npcBreach = npcAlliance.effects.find((effect) => effect.kind === "relationship" && effect.from === nationA.id && effect.to === nationB.id);
    const npcOther = npcTrade.effects.find((effect) => effect.kind === "relationship" && effect.from === nationA.id && effect.to === nationB.id);
    expect(npcBreach?.kind === "relationship" ? npcBreach.deltas?.trust : undefined).toBeCloseTo(-0.02);
    expect(npcBreach?.kind === "relationship" ? npcBreach.addHistory?.description : undefined).toContain("defense partner");
    expect(npcOther?.kind === "relationship" ? npcOther.deltas?.trust : undefined).toBeCloseTo(0);
    const afterBreach = apply(npcCampaign("alliance"), { source: "simulate", actor: "world", turn: base.turn,
      narration: { summary: "Defense partner strike." }, effects: npcAlliance.effects });
    const repeat = resolveStrikeHarm(afterBreach, npcStrike, createRngStreams(makeCampaignSeed(npcSeed)))!;
    expect(repeat.effects.some((effect) => effect.kind === "relationship" && effect.addHistory?.kind === "betrayal")).toBe(false);
    const repeatedEdge = repeat.effects.find((effect) => effect.kind === "relationship" && effect.from === nationA.id && effect.to === nationB.id);
    expect(repeatedEdge?.kind === "relationship" ? repeatedEdge.deltas?.trust : undefined).toBeCloseTo(0);

    const noTrust = { ...npcCampaign("alliance"), relationships: { ...npcCampaign("alliance").relationships,
      [relationshipKey(nationA.id, nationB.id)]: Relationship.parse({ ...outward, trust: 0 }),
    } };
    const noTrustBreach = resolveStrikeHarm(noTrust, npcStrike, createRngStreams(makeCampaignSeed(npcSeed)))!;
    const noTrustEdge = noTrustBreach.effects.find((effect) => effect.kind === "relationship" && effect.from === nationA.id && effect.to === nationB.id);
    expect(noTrustEdge?.kind === "relationship" ? noTrustEdge.deltas?.trust : undefined).toBeCloseTo(0);
    expect(noTrustEdge?.kind === "relationship" ? noTrustEdge.addHistory?.kind : undefined).toBe("betrayal");
  });
});


it("Continue stops on the operational report without requiring a second order", () => {
  const { after } = issued();
  const result = advanceUntilAttention(after, { phases: defaultTurnPhases, horizonDays: 10 });
  expect(result.elapsedDays).toBe(1);
  expect(result.stopReason).toBe("attention");
  expect(result.stop.presented[0]?.source).toBe("consequence-return");
});

describe("force orders waiting to execute", () => {
  // The defect this pins: the second front was read only from acts already
  // executed, so a second unilateral strike was shown as lawful at issue and
  // refused weeks later when the first one landed.
  it("counts an issued unilateral strike as an open front before it executes", () => {
    const base = buildCampaign();
    const strike: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };
    expect(projectAction(base, strike, createRngStreams(base.seed)).ok).toBe(true);
    const first = issueAction(base, strike, createRngStreams(base.seed));
    if (!first.ok) throw new Error(first.missingCapability);
    expect(first.pending).toBe(true);
    const ordered = apply(base, first.packet);
    const act = outstandingInstrumentActs(ordered)[0]!;
    const elsewhere = { ...act, id: `${act.id}:elsewhere`, request: { ...act.request, target: "OTH" as NationId } };
    const campaign = { ...base, issuedActs: { [elsewhere.id]: elsewhere } };
    const second = projectAction(campaign, strike, createRngStreams(base.seed));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.missingCapability).toContain("second front");
    expect(warPowersStanding(campaign, nationB.id, 3).kind).toBe("requires-authorization");
    expect(warPowersStanding(campaign, nationB.id, 2).kind).toBe("not-applicable");
  });

  it("lets the pending strike itself execute on the authority it was issued under", () => {
    const base = buildCampaign();
    const strike: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };
    const first = issueAction(base, strike, createRngStreams(base.seed));
    if (!first.ok) throw new Error(first.missingCapability);
    const ordered = apply(base, first.packet);
    const act = outstandingInstrumentActs(ordered)[0]!;
    const resolved = resolveDueInstruments({ ...ordered, calendar: act.dueDate });
    expect(resolved.campaign.issuedActs?.[act.id]?.status).toBe("reported");
    expect(resolved.campaign.congress.unauthorized.some((entry) => entry.target === nationB.id)).toBe(true);
  });
});

describe("readiness promised to orders that have not executed", () => {
  // Another capital, so the War Powers check (which binds only the President)
  // does not refuse the second order first and hide what readiness says.
  const strike: ResolutionRequest = { actor: nationB.id, target: nationA.id, instrument: "military", rung: 4 };

  function withOrders(count: number) {
    const base = buildCampaign();
    const nation = base.nations[nationB.id]!;
    const towardThem = base.relationships[relationshipKey(nationA.id, nationB.id)]!;
    const towardUs = Relationship.parse({ ...towardThem, from: nationB.id, to: nationA.id });
    const ready = {
      ...base,
      relationships: { ...base.relationships, [relationshipKey(nationB.id, nationA.id)]: towardUs },
      nations: { ...base.nations, [nationB.id]: { ...nation, stats: { ...nation.stats, military: { ...nation.stats.military, readiness: 0.5 } } } },
    };
    const issued = issueAction(buildCampaign(), { ...strike, actor: nationA.id, target: nationB.id }, createRngStreams(base.seed));
    if (!issued.ok) throw new Error(issued.missingCapability);
    const template = outstandingInstrumentActs(apply(buildCampaign(), issued.packet))[0]!;
    const orders = Object.fromEntries(Array.from({ length: count }, (_, index) => {
      const id = `${template.id}:npc:${index}`;
      return [id, { ...template, id, request: { ...template.request, actor: nationB.id, target: nationA.id } }];
    }));
    return { ...ready, issuedActs: orders };
  }

  it("refuses a strike at issue once the strikes already ordered will spend the readiness it needs", () => {
    const none = withOrders(0);
    expect(projectAction(none, strike, createRngStreams(none.seed)).ok).toBe(true);
    const one = withOrders(1);
    const refused = projectAction(one, strike, createRngStreams(one.seed));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.missingCapability).toContain("readiness");
  });

  it("still opens a lighter rung the remaining readiness covers", () => {
    const one = withOrders(1);
    const lighter = projectAction(one, { ...strike, rung: 3 }, createRngStreams(one.seed));
    if (!lighter.ok) expect(lighter.missingCapability).not.toContain("readiness");
    const three = withOrders(3);
    const spent = projectAction(three, { ...strike, rung: 3 }, createRngStreams(three.seed));
    expect(spent.ok).toBe(false);
    if (!spent.ok) expect(spent.missingCapability).toContain("readiness");
  });
});
