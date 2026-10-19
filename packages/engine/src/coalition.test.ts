import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset, type NationId } from "@admin/world";
import { makeCampaignSeed, createRngStreams } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { projectAction, type ResolutionRequest } from "./resolution.js";
import { BACKING_ODDS_LIFT, BACKING_STANDING_RELIEF, coalitionBacking, coalitionFor } from "./coalition.js";
import { issueAction } from "./instrument-issued.js";
import { apply } from "./effects.js";
import { answerSupportRequests } from "./action-support.js";
import { addDays } from "./clock.js";
import type { Campaign } from "./state.js";
import { selectCollectionProducts, selectCollectionShares, shareCollectionReport, type CollectionProduct } from "./intelligence.js";
import { campaignDay } from "./nomination.js";
import { createSave, loadSave } from "./save.js";

const seed = makeCampaignSeed("coalition-seed");

// A founded campaign rather than a fixture: backing is read off the real
// dataset's compacts and opening trust, and a stand-in would test neither.
function foundedCampaign(): Campaign {
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test President" },
  };
  return sealFounding(seed, worldDataset, choices);
}

const campaign = foundedCampaign();
const USA = campaign.founding.nation;
const VEN = "VEN" as NationId;

const sanctions = (rung: 1 | 2 | 3 | 4 | 5): ResolutionRequest => ({ actor: USA, target: VEN, instrument: "economic", rung });

describe("what backers do to an act", () => {
  it("does not grant automatic benefits to drafts or unilateral actions", () => {
    const alone = projectAction(campaign, sanctions(2), createRngStreams(campaign.seed));
    const declined = projectAction(campaign, { ...sanctions(2), support: { mode: "unilateral", partners: [] } }, createRngStreams(campaign.seed));
    if (!alone.ok || !declined.ok) throw new Error("expected projections");
    expect(alone.projection.coalition).toBeUndefined();
    expect(declined.projection.successChance).toBe(alone.projection.successChance);
  });

  it("counts only confirmed requested contributions, inside its ceiling", () => {
    const { state, request } = confirmed(campaign, VEN);
    const backing = coalitionBacking(state, request)!;
    expect(backing.backers).toBeGreaterThan(0);
    expect(backing.strength).toBeLessThanOrEqual(1);
    expect(backing.oddsMultiplier).toBeLessThanOrEqual(1 + BACKING_ODDS_LIFT.economic);
    expect(backing.standingRelief).toBeLessThanOrEqual(BACKING_STANDING_RELIEF);
    const backed = projectAction(state, request, createRngStreams(state.seed));
    const alone = projectAction(state, { ...request, support: { mode: "unilateral", partners: [] } }, createRngStreams(state.seed));
    if (!backed.ok || !alone.ok) throw new Error("expected projections");
    expect(backed.projection.successChance).toBeGreaterThan(alone.projection.successChance);
  });

  it("does nothing for a covert act, or for another capital's move", () => {
    expect(coalitionBacking(campaign, { ...sanctions(2), instrument: "covert" })).toBeUndefined();
    const other = Object.keys(campaign.nations).find((id) => id !== USA && id !== VEN) as NationId;
    expect(coalitionBacking(campaign, { ...sanctions(2), actor: other })).toBeUndefined();
  });

  it("never counts a partner as a backer that the ripple rules count as turning against the move", () => {
    const { backers } = coalitionFor(campaign, USA, VEN);
    const projected = projectAction(campaign, sanctions(2), createRngStreams(campaign.seed));
    if (!projected.ok) throw new Error(projected.reason);
    // A trade partner of the target absorbs some of the cost and may still back
    // the move; the relations that turn against it are the alignment ones.
    const TURNING = new Set(["ally", "bloc-peer", "bloc-partner"]);
    const against = new Set(projected.projection.ripples.filter((ripple) => TURNING.has(ripple.relation)).map((ripple) => ripple.nation));
    for (const backer of backers) expect(against.has(backer.nation)).toBe(false);
  });
});

describe("a coalition split by the target's own ties", () => {
  it("never assumes partners tied to the target have confirmed participation", () => {
    expect(coalitionFor(campaign, USA, "CAN" as NationId).torn).toBeGreaterThan(0);
    expect(coalitionBacking(campaign, { ...sanctions(2), target: "CAN" as NationId })).toBeUndefined();
  });
});

function confirmed(base: Campaign, target: NationId) {
  const partners = coalitionFor(base, USA, target).backers.map((backer) => backer.nation);
  const order = issueAction(base, { ...sanctions(2), target, support: { mode: "seek", partners } }, createRngStreams(base.seed));
  if (!order.ok) throw new Error(order.reason);
  const issued = apply(base, order.packet);
  const act = Object.values(issued.issuedActs!).find((item) => item.kind === "instrument")!;
  if (act.kind !== "instrument") throw new Error("expected instrument");
  const state = { ...issued, calendar: addDays(base.calendar, 3) };
  const answered = { ...act, supportRequests: answerSupportRequests(state, act) };
  return { state: { ...state, issuedActs: { ...state.issuedActs, [act.id]: answered } }, request: answered.request };
}

describe("support solicitation lifecycle", () => {
  const partner = coalitionFor(campaign, USA, VEN).backers[0]!.nation;
  function order(instrument: "economic" | "military" = "economic", protection: "standard" | "additional-assessment" = "standard") {
    const result = issueAction(campaign, { actor: USA, target: VEN, instrument, rung: instrument === "military" ? 4 : 1,
      support: { mode: "seek", partners: [partner] }, civilianProtection: protection }, createRngStreams(campaign.seed));
    if (!result.ok) throw new Error(result.reason);
    return apply(campaign, result.packet);
  }
  it("persists pending requests, answers before execution, and counts confirmed support only", async () => {
    const { resolveDueInstruments, outstandingInstrumentActs } = await import("./instrument-issued.js");
    const before = order();
    const saved = JSON.parse(JSON.stringify(before)) as Campaign;
    const act = outstandingInstrumentActs(saved)[0]!;
    expect(act.supportRequests?.[0]?.status).toBe("pending");
    expect(coalitionBacking(saved, act.request)).toBeUndefined();
    const answered = resolveDueInstruments({ ...saved, calendar: addDays(saved.calendar, 3) });
    const live = outstandingInstrumentActs(answered.campaign)[0]!;
    expect(live.supportRequests?.[0]?.status).toBe("confirmed");
    expect(live.status).toBe("in-progress");
    expect(coalitionBacking(answered.campaign, live.request)).toBeDefined();
    const done = resolveDueInstruments({ ...answered.campaign, calendar: act.dueDate });
    expect(done.campaign.issuedActs?.[act.id]?.status).toBe("reported");
    expect(resolveDueInstruments(done.campaign).packets).toHaveLength(0);
  });
  it("refuses when relationships deteriorate and never counts refused support", async () => {
    const { resolveDueInstruments, outstandingInstrumentActs } = await import("./instrument-issued.js");
    const before = order();
    const relationships = Object.fromEntries(Object.entries(before.relationships).map(([key, relation]) => [key, relation.from === partner && relation.to === USA ? { ...relation, trust: .1 } : relation]));
    const answer = resolveDueInstruments({ ...before, relationships, calendar: addDays(before.calendar, 3) });
    const act = outstandingInstrumentActs(answer.campaign)[0]!;
    expect(act.supportRequests?.[0]?.status).toBe("refused");
    expect(coalitionBacking(answer.campaign, act.request)).toBeUndefined();
  });
  it("imposes actual civilian-protection conditions and permits cancellation after an answer", async () => {
    const { resolveDueInstruments, outstandingInstrumentActs, withdrawInstrumentAct } = await import("./instrument-issued.js");
    const before = order("military");
    const answered = resolveDueInstruments({ ...before, calendar: addDays(before.calendar, 3) }).campaign;
    const act = outstandingInstrumentActs(answered)[0]!;
    expect(act.supportRequests?.[0]?.status).toBe("conditional");
    expect(coalitionBacking(answered, act.request)).toBeUndefined();
    const cancel = withdrawInstrumentAct(answered, act.id);
    if (!cancel.ok) throw new Error(cancel.missingCapability);
    const stopped = apply(answered, cancel.packet);
    expect(stopped.player.metrics.treasury).toBe(campaign.player.metrics.treasury);
    expect(resolveDueInstruments({ ...stopped, calendar: act.dueDate }).packets).toHaveLength(0);
    const protectedOrder = order("military", "additional-assessment");
    const protectedAnswer = resolveDueInstruments({ ...protectedOrder, calendar: addDays(protectedOrder.calendar, 3) }).campaign;
    expect(outstandingInstrumentActs(protectedAnswer)[0]?.supportRequests?.[0]?.status).toBe("confirmed");
  });
});

describe("a selected partner receiving a sourced covert warning", () => {
  const partner = coalitionFor(campaign, USA, VEN).backers[0]!.nation;
  const warning: CollectionProduct = {
    id: "report:covert-warning", tasking: "tasking:covert-warning", element: "IC-CIA", discipline: "humint",
    targetKind: "foreign-nation", target: VEN, question: "Who is being pressed?", day: campaignDay(campaign), date: campaign.calendar,
    weight: 0.6, summary: "Reporting points to a covert pursuit.", status: "findings", confidence: "moderate",
    findings: [{ topic: "external-intent", observation: "Concealed pressure is assessed against a partner.", source: "current pursuit activity record", asOfDay: campaignDay(campaign),
      basis: { kind: "pursuit", id: "pursuit:warning", target: partner, overt: false, lastActedTurn: campaign.turn } }],
    gaps: ["The next move is unknown."],
  };

  function nearPartner(base: Campaign): Campaign {
    const relationships = Object.fromEntries(Object.entries(base.relationships).map(([key, relation]) => [key,
      relation.from === partner && relation.to === USA ? { ...relation, trust: 0.45 } :
        relation.from === USA && relation.to === partner ? { ...relation, trust: 0.5 } : relation]));
    return { ...base, relationships };
  }

  function received(base: Campaign, report: CollectionProduct = warning, findings?: readonly number[]): Campaign {
    const withReport = { ...base, security: { ...base.security, intelligence: {
      ...base.security.intelligence, archive: [...(base.security.intelligence.archive ?? []), report],
    } } };
    const share = shareCollectionReport(withReport, report.id, [partner], findings);
    if (!share.ok) throw new Error(share.reason);
    return apply(withReport, share.packet);
  }

  function partnerAnswer(base: Campaign, instrument: "economic" | "military" = "economic") {
    const request: ResolutionRequest = { actor: USA, target: VEN, instrument, rung: instrument === "economic" ? 1 : 4,
      support: { mode: "seek", partners: [partner] }, ...(instrument === "military" ? { civilianProtection: "additional-assessment" as const } : {}) };
    const issued = issueAction(base, request, createRngStreams(base.seed));
    if (!issued.ok) throw new Error(issued.reason);
    const stored = apply(base, issued.packet);
    const act = Object.values(stored.issuedActs!).find((item) => item.kind === "instrument")!;
    if (act.kind !== "instrument") throw new Error("expected instrument");
    const due = { ...stored, calendar: addDays(stored.calendar, 3) };
    return answerSupportRequests(due, act)[0]!;
  }

  it("changes only a near partner's requested economic answer and explains why", () => {
    const near = nearPartner(campaign);
    expect(partnerAnswer(near).status).toBe("refused");
    const answer = partnerAnswer(received(near));
    expect(answer.status).toBe("confirmed");
    expect(answer.reason).toContain("shared report");
    expect(partnerAnswer(received(near), "military").status).toBe("refused");
    const shared = received(near);
    const request: ResolutionRequest = { ...sanctions(1), support: { mode: "seek", partners: [partner] } };
    const order = issueAction(shared, request, createRngStreams(shared.seed));
    if (!order.ok) throw new Error(order.reason);
    const issued = apply(shared, order.packet);
    const act = Object.values(issued.issuedActs!).find((item) => item.kind === "instrument")!;
    if (act.kind !== "instrument") throw new Error("expected instrument");
    const due = { ...issued, calendar: addDays(issued.calendar, 3) };
    const answered = { ...act, supportRequests: answerSupportRequests(due, act) };
    const ready = { ...due, issuedActs: { ...due.issuedActs, [act.id]: answered } };
    expect(coalitionBacking(ready, answered.request)?.backers).toBe(1);
  });

  it("does not credit uncertain, public, stale or irrelevant reporting", () => {
    const near = nearPartner(campaign);
    const finding = warning.findings![0]!;
    const basis = finding.basis;
    if (basis?.kind !== "pursuit") throw new Error("warning fixture needs a pursuit finding");
    const variants: readonly CollectionProduct[] = [
      { ...warning, status: "no-result", findings: [] },
      { ...warning, confidence: "low" },
      { ...warning, target: "CAN" },
      { ...warning, findings: [{ ...finding, topic: "stability" }] },
      { ...warning, findings: [{ ...finding, basis: { ...basis, overt: true } }] },
      { ...warning, findings: [{ ...finding, basis: { ...basis, target: USA } }] },
    ];
    for (const report of variants) expect(partnerAnswer(received(near, report)).status).toBe("refused");
    const stale = { ...near, calendar: addDays(near.calendar, 29) };
    expect(partnerAnswer(received(stale)).status).toBe("refused");
  });

  it("does not let an undisclosed finding change a recipient's answer", () => {
    const near = nearPartner(campaign);
    const unrelated = { topic: "stability" as const, observation: "Unrelated dated evidence.", source: "a dated assessment", asOfDay: warning.day };
    const mixed = { ...warning, findings: [unrelated, warning.findings![0]!] };
    expect(partnerAnswer(received(near, mixed, [0])).status).toBe("refused");
    expect(partnerAnswer(received(near, mixed, [1])).status).toBe("confirmed");
  });

  it("keeps compact and target-tie limits, and never reopens a settled answer", () => {
    const near = nearPartner(campaign);
    const tooDistant = { ...near, relationships: Object.fromEntries(Object.entries(near.relationships).map(([key, relation]) => [key,
      relation.from === partner && relation.to === USA ? { ...relation, trust: 0.35 } : relation])) };
    expect(partnerAnswer(received(tooDistant)).status).toBe("refused");
    const noCompact = { ...near, nations: { ...near.nations, [partner]: { ...near.nations[partner]!, base: { ...near.nations[partner]!.base, memberships: [] } } } };
    expect(partnerAnswer(received(noCompact)).status).toBe("refused");
    const edge = near.relationships[`${partner}:${USA}`]!;
    const relationships = { ...near.relationships, [`${partner}:${VEN}`]: { ...edge, from: partner, to: VEN, trust: 0.5 } };
    expect(partnerAnswer(received({ ...near, relationships })).status).toBe("refused");
    const refused = partnerAnswer(near);
    expect(refused.status).toBe("refused");
    const request: ResolutionRequest = { ...sanctions(1), support: { mode: "seek", partners: [partner] } };
    const issued = issueAction(near, request, createRngStreams(near.seed));
    if (!issued.ok) throw new Error(issued.reason);
    const stored = apply(near, issued.packet);
    const act = Object.values(stored.issuedActs!).find((item) => item.kind === "instrument")!;
    if (act.kind !== "instrument") throw new Error("expected instrument");
    const due = { ...stored, calendar: addDays(stored.calendar, 3) };
    const answered = { ...act, supportRequests: answerSupportRequests(due, act) };
    expect(answered.supportRequests[0]?.status).toBe("refused");
    expect(answerSupportRequests(received(due), answered)[0]?.status).toBe("refused");
  });
});

it("preserves separate disclosures to two allies and helps only those allies after reload", () => {
  const partners = coalitionFor(campaign, USA, VEN).backers.slice(0, 3).map((backer) => backer.nation);
  expect(partners).toHaveLength(3);
  const [first, second, unselected] = partners as [NationId, NationId, NationId];
  const day = campaignDay(campaign);
  const findings = [first, second].map((recipient, index) => ({
    topic: "external-intent" as const, observation: `Concealed pressure against ally ${index + 1}.`,
    source: "current pursuit activity record", asOfDay: day,
    basis: { kind: "pursuit" as const, id: `pursuit:ally-${index + 1}`, target: recipient, overt: false, lastActedTurn: campaign.turn },
  }));
  const report: CollectionProduct = {
    id: "report:two-allies", tasking: "tasking:two-allies", element: "IC-CIA", discipline: "humint",
    targetKind: "foreign-nation", target: VEN, question: "Who is under pressure?", day, date: campaign.calendar,
    weight: 0.6, summary: "Two allies face separate concealed pressure.", status: "findings", confidence: "moderate",
    findings, gaps: ["The next moves are unknown."],
  };
  const relationships = Object.fromEntries(Object.entries(campaign.relationships).map(([key, relation]) => [key,
    partners.includes(relation.from) && relation.to === USA ? { ...relation, trust: 0.45 } :
      relation.from === USA && partners.includes(relation.to) ? { ...relation, trust: 0.5 } : relation]));
  const withReport = { ...campaign, relationships, security: { ...campaign.security, intelligence: {
    ...campaign.security.intelligence, archive: [...(campaign.security.intelligence.archive ?? []), report],
  } } };
  const shareFirst = shareCollectionReport(withReport, report.id, [first], [0]);
  if (!shareFirst.ok) throw new Error(shareFirst.reason);
  const afterFirst = apply(withReport, shareFirst.packet);
  const shareSecond = shareCollectionReport(afterFirst, report.id, [second], [1]);
  if (!shareSecond.ok) throw new Error(shareSecond.reason);
  const restored = loadSave(createSave(apply(afterFirst, shareSecond.packet)));
  expect(selectCollectionProducts(restored).find((product) => product.id === report.id)).toEqual(report);
  const receipts = selectCollectionShares(restored).filter((share) => share.reportId === report.id);
  expect(receipts.map((share) => [share.recipient, share.disclosedFindingIndexes, share.report.findings]))
    .toEqual([[first, [0], [findings[0]]], [second, [1], [findings[1]]]]);
  expect(shareCollectionReport(restored, report.id, [first], [0])).toMatchObject({ ok: true, packet: { effects: [] } });

  const request: ResolutionRequest = { actor: USA, target: VEN, instrument: "economic", rung: 1,
    support: { mode: "seek", partners } };
  const issued = issueAction(restored, request, createRngStreams(restored.seed));
  if (!issued.ok) throw new Error(issued.reason);
  const stored = apply(restored, issued.packet);
  const act = Object.values(stored.issuedActs!).find((item) => item.kind === "instrument")!;
  if (act.kind !== "instrument") throw new Error("expected instrument");
  const due = { ...stored, calendar: addDays(stored.calendar, 3) };
  expect(answerSupportRequests(due, act).map((answer) => [answer.nation, answer.status]))
    .toEqual([[first, "confirmed"], [second, "confirmed"], [unselected, "refused"]]);
});


it("Continue returns partner answers before execution so the President can stand down", async () => {
  const { advanceUntilAttention } = await import("./advance.js");
  const { defaultTurnPhases } = await import("./turn-loop.js");
  const partner = coalitionFor(campaign, USA, VEN).backers[0]!.nation;
  const issued = issueAction(campaign, { ...sanctions(1), support: { mode: "seek", partners: [partner] } }, createRngStreams(campaign.seed));
  if (!issued.ok) throw new Error(issued.reason);
  const state = apply(campaign, issued.packet);
  const result = advanceUntilAttention(state, { phases: defaultTurnPhases, horizonDays: 10 });
  expect(result.elapsedDays).toBe(3);
  expect(result.stop.presented[0]?.source).toBe("consequence-return");
  expect(result.stop.presented[0]?.title).toContain("Partner responses");
  expect(Object.values(result.campaign.issuedActs!).some((act) => act.kind === "instrument" && act.outcome)).toBe(false);
});
