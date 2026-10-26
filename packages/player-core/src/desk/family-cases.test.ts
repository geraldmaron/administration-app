import { describe, expect, it } from "vitest";
import {
  addDays,
  apply,
  advanceUntilAttention,
  defaultTurnPhases,
  daysBetween,
  hazardLabel,
  openNomination,
  reliefSignature,
  selectDateOfTurn,
  selectSigningWindow,
  selectNominableFor,
  withDueCaseDefaults,
  withRaisedCase,
  answerLowerOrderReview,
  type Bill,
  type Campaign,
  type Conflict,
  type DeclaredEmergency,
  type NationCondition,
  type PendingClaim,
} from "@admin/engine";
import type { NationId, StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { deferMatterPacket } from "../campaign/stop-brief";
import { handOffPlan } from "../campaign/hand-off";
import { attentionItems, deskMatterSource, matterFor, owedItems } from "./attention";
import { caseDetail, caseDetails, leadCase } from "./case-detail";
import { familyDisposition, familyQueue, familyRowIds, seatFamilyCases } from "./family-cases";
import { familySources } from "./family-sources";
import { pendingConversations } from "../conversation/scripts";
import { openScenarioCasts, unansweredScenarioCasts, withScenarioCases, withWithdrawnScenarioCases } from "../conversation/scenario-cases";
import { leaveUnansweredPackets, scenarioDispositionPackets, scenarioDispositions } from "../conversation/scenario-dispositions";
import { silencePrice } from "../conversation/scenario-dispositions";
import { handOff } from "../campaign/hand-off";
import { scenarioMatterSource, seatScenarioCases } from "../conversation/scripts";
import { createCampaignStore } from "../campaign/store";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { scenarioUnansweredFlag } from "@admin/content";

const base = openingCampaign();

describe("an adverse lower order judgment on the Desk", () => {
  const recordId = "order-border-controls:desk-review";
  const proceedingId = `case:${recordId}`;
  const responseId = `case:review:${proceedingId}`;
  const campaign = withRaisedCase({ ...base,
    orders: [{ id: recordId, order: "order-border-controls", turn: base.turn, contested: true,
      challengeChance: 0.5, review: { dueTurn: base.turn + 1, status: "pending" } }],
    pendingRules: [{ id: recordId, order: "order-border-controls", signedTurn: base.turn,
      effectiveTurn: base.turn + 3, status: "stayed" }],
    judiciary: { ...base.judiciary, proceedings: [{ id: proceedingId,
      subject: { kind: "executive-order", recordId, orderId: "order-border-controls" },
      filedTurn: base.turn, stage: "appeal", nextTurn: base.turn,
      history: [{ turn: base.turn, stage: "lower-merits", account: "The lower court set aside the rule." }],
      lower: { holding: "struck-down", ruledTurn: base.turn, ground: "forbidden", enforcement: "in-force" } }] },
  }, { id: responseId, kind: "court-response", title: "Further review of the border rule",
    subject: { kind: "court-proceeding", id: proceedingId }, urgency: "hard",
    clock: { kind: "operational", dueAt: addDays(base.calendar, 7) },
    defaultOutcome: { kind: "legal-default", outcomeId: "accept-lower-judgment" },
    responseRequirement: "president", allowedDispositions: ["act", "defer", "allow-default"] }, "world", undefined);

  it("stops Continue at the Court door and offers acceptance in the tray", () => {
    const run = advanceUntilAttention(campaign, { phases: defaultTurnPhases,
      matterSources: [deskMatterSource], horizonDays: 14 });
    expect(run.stopReason).toBe("attention");
    expect(run.elapsedDays).toBe(0);
    expect(run.stop.presented.some((item) => item.id === responseId)).toBe(true);
    const detail = caseDetails(run.campaign).find((entry) => entry.id === responseId);
    expect(detail?.href).toBe(`/washington/courts/case/${encodeURIComponent(recordId)}#case-response`);
    expect(detail?.options).toEqual([{ kind: "defer", label: "Put off a week" }, { kind: "allow-default", label: "Accept the lower judgment" }]);
  });

  it("settles the rule once through the tray, and silence defaults on its date", () => {
    const answer = familyDisposition(campaign, responseId, "allow-default");
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    const accepted = apply(campaign, answer.packet);
    expect(accepted.pendingRules[0]?.status).toBe("canceled");
    expect(accepted.judiciary.cases).toHaveLength(1);
    expect(familyDisposition(accepted, responseId, "allow-default").ok).toBe(false);
    const defaulted = withDueCaseDefaults({ ...campaign, calendar: addDays(campaign.calendar, 7) });
    expect(defaulted.cases?.[responseId]?.status).toBe("defaulted");
    expect(familyQueue(defaulted).some((entry) => entry.source.raise.id === responseId)).toBe(false);
  });

  it("shares the court deadline with an authored response and shows one Desk choice", () => {
    const source = pendingConversations(campaign)[0]!;
    const cast = { ...source, occurrence: `${source.def.id}@court:${proceedingId}`,
      def: { ...source.def, cast: { pick: "pendingOrderCase" as const },
        conditions: [{ kind: "pendingOrderCase" as const, posture: "adverse-lower" as const, ruleState: "unimplemented" as const }] },
      orderCase: { proceedingId, recordId, orderId: "order-border-controls", filedTurn: base.turn,
        stage: "appeal" as const, orderName: "Tighten border controls", question: "Whether this order is lawful.",
        posture: "adverse-lower" as const, ruleState: "unimplemented" as const } };
    const seated = withScenarioCases(campaign, [cast]);
    const authoredId = `scenario:${cast.occurrence}`;
    expect(seated.cases?.[authoredId]?.clock).toEqual(campaign.cases?.[responseId]?.clock);
    expect(seated.cases?.[authoredId]?.allowedDispositions).toEqual(["act", "defer", "allow-default"]);
    expect(seated.cases?.[authoredId]?.urgency).toBe("hard");
    expect(familySources(seated).some((entry) => entry.raise.id === responseId)).toBe(false);
    expect(pendingConversations(seated)).toHaveLength(1);
    const closing = withDueCaseDefaults({ ...seated, calendar: addDays(seated.calendar, 7) });
    expect(closing.cases?.[responseId]?.status).toBe("defaulted");
    expect(closing.cases?.[authoredId]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(closing)).toEqual([]);
    expect(familySources(closing).some((entry) => entry.raise.id === responseId)).toBe(false);

    expect(scenarioDispositions(seated, cast).map((item) => item.label)).toContain("Accept the lower judgment");
    expect(silencePrice(seated, cast)).toMatchObject({ metrics: {}, judgments: {} });
    const acceptance = scenarioDispositionPackets(seated, cast, "allow-default");
    expect(acceptance.ok).toBe(true);
    if (!acceptance.ok) return;
    const accepted = acceptance.packets.reduce((next, packet) => apply(next, packet), seated);
    expect(accepted.cases?.[responseId]?.status).toBe("acted");
    expect(accepted.cases?.[authoredId]?.status).toBe("acted");
    expect(accepted.pendingRules[0]?.status).toBe("canceled");
    expect(unansweredScenarioCasts(accepted)).toEqual([]);
    expect(accepted.ledger.some((entry) => (entry.causal?.marks ?? []).includes(scenarioUnansweredFlag(cast.occurrence)))).toBe(false);

    const putOff = scenarioDispositionPackets(seated, cast, "defer");
    expect(putOff.ok).toBe(true);
    if (!putOff.ok) return;
    const deferred = putOff.packets.reduce((next, packet) => apply(next, packet), seated);
    expect(deferred.cases?.[authoredId]?.status).toBe("deferred");
    expect(deferred.cases?.[responseId]?.status).toBe("deferred");
    expect(deferred.cases?.[authoredId]?.deferredUntil).toEqual(deferred.cases?.[responseId]?.deferredUntil);
    expect(pendingConversations(deferred)).toEqual([]);
    expect(familySources(deferred).some((entry) => entry.raise.id === responseId)).toBe(false);
    const run = advanceUntilAttention(deferred, { phases: defaultTurnPhases,
      matterSources: [deskMatterSource, scenarioMatterSource], horizonDays: 7 });
    expect(run.elapsedDays).toBeGreaterThan(0);
    expect(run.stop.presented.filter((entry) => entry.id === authoredId || entry.id === responseId)).toHaveLength(0);

    const direct = answerLowerOrderReview(seated, proceedingId, "accept");
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const answered = withWithdrawnScenarioCases(apply(seated, direct.packet));
    expect(answered.cases?.[authoredId]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(answered)).toEqual([]);
    expect(pendingConversations(answered)).toEqual([]);

    expect(handOffPlan(seated).decisions.map((entry) => entry.occurrence)).toContain(cast.occurrence);
    expect(withWithdrawnScenarioCases(seated).cases?.[authoredId]?.status).toBe("raised");
    expect(handOffPlan(seatScenarioCases(seated)).decisions.map((entry) => entry.occurrence)).toContain(cast.occurrence);
    expect(handOffPlan(seatFamilyCases(seatScenarioCases(seated))).decisions.map((entry) => entry.occurrence)).toContain(cast.occurrence);
    const directHandoff = leaveUnansweredPackets(seated, cast, "allow-default", { summary: "Handed off.", onCase: "Handed off." })
      .reduce((next, packet) => apply(next, packet), seated);
    expect(directHandoff.cases?.[authoredId]?.status).toBe("acted");
    const handed = handOff(seated).campaign;
    expect(handed.cases?.[responseId]?.status).toBe("acted");
    expect(handed.cases?.[authoredId]?.status).toBe("acted");
    expect(handed.ledger.some((entry) => (entry.causal?.marks ?? []).includes(scenarioUnansweredFlag(cast.occurrence)))).toBe(false);
  });

  it("lets Continue spend days toward the shared deadline without a second silence charge", async () => {
    const source = pendingConversations(campaign)[0]!;
    const cast = { ...source, occurrence: `${source.def.id}@court:${proceedingId}`,
      def: { ...source.def, cast: { pick: "pendingOrderCase" as const },
        conditions: [{ kind: "pendingOrderCase" as const, posture: "adverse-lower" as const, ruleState: "unimplemented" as const }] },
      orderCase: { proceedingId, recordId, orderId: "order-border-controls", filedTurn: base.turn,
        stage: "appeal" as const, orderName: "Tighten border controls", question: "Whether this order is lawful.",
        posture: "adverse-lower" as const, ruleState: "unimplemented" as const } };
    const seated = withScenarioCases(campaign, [cast]);
    const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()),
      matterSources: [deskMatterSource, scenarioMatterSource] });
    await store.begin(seated);
    await store.continueUntilAttention(7);
    const state = store.getState();
    if (state.status !== "ready") throw new Error("expected ready campaign");
    expect(daysBetween(seated.calendar, state.campaign.calendar)).toBeGreaterThan(0);
    expect(state.campaign.ledger.some((entry) => (entry.causal?.marks ?? []).includes(scenarioUnansweredFlag(cast.occurrence)))).toBe(false);
    expect(state.campaign.cases?.[`scenario:${cast.occurrence}`]?.deferredUntil).toEqual(
      state.campaign.cases?.[responseId]?.deferredUntil);
  });

  it("reads a legacy frozen order case without posture as a pending challenge", () => {
    const source = pendingConversations(campaign)[0]!;
    const cast = { ...source, occurrence: `${source.def.id}@court:${proceedingId}`,
      def: { ...source.def, cast: { pick: "pendingOrderCase" as const } },
      orderCase: { proceedingId, recordId, orderId: "order-border-controls", filedTurn: base.turn,
        stage: "appeal" as const, orderName: "Tighten border controls", question: "Whether this order is lawful.",
        posture: "pending-challenge" as const } };
    const seated = withScenarioCases(campaign, [cast]);
    const id = `scenario:${cast.occurrence}`;
    const item = seated.cases?.[id];
    if (!item) throw new Error("expected frozen order case");
    const snapshot = JSON.parse(item.authoredSnapshot!) as { orderCase: Record<string, unknown> };
    delete snapshot.orderCase.posture;
    const legacy = { ...seated, cases: { ...seated.cases,
      [id]: { ...item, authoredSnapshot: JSON.stringify(snapshot) } } };
    expect(openScenarioCasts(legacy)[0]?.orderCase?.posture).toBe("pending-challenge");
  });
});

function onTheDesk(campaign: Campaign, over: Partial<Bill> = {}): { readonly campaign: Campaign; readonly bill: Bill } {
  const bill: Bill = {
    id: `bill:act-test:${campaign.turn}`,
    act: "act-test",
    title: "A Bill To Do Something",
    sponsor: "bipartisan",
    introducedTurn: campaign.turn,
    status: "on-the-desk",
    passage: [{ chamber: "house", yeas: 240, nays: 190, required: 218, passed: true }],
    ...over,
  };
  return { campaign: { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } }, bill };
}

function withNomineeInTrouble(campaign: Campaign): { readonly campaign: Campaign; readonly id: string } {
  const office = "OFF-OMB-DIRECTOR";
  const nominee = selectNominableFor(campaign, office)[0];
  if (!nominee) throw new Error("the fixture has nobody nominable for OMB");
  const opened = openNomination(campaign, office, nominee.base.id);
  if (!opened.ok) throw new Error(opened.reason);
  const after = apply(campaign, opened.packet);
  const [id, nomination] = Object.entries(after.nominations).find(([, item]) => item.office === office)!;
  return { campaign: { ...after, nominations: { ...after.nominations, [id]: { ...nomination, controversies: ["An unpaid tax bill"] } } }, id };
}

function fundedThrough(campaign: Campaign, throughTurn: number): Campaign {
  return { ...campaign, congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, throughTurn } } };
}

function withClaims(campaign: Campaign, states: readonly StateId[], claim: PendingClaim): Campaign {
  const next = { ...campaign.states };
  for (const id of states) next[id] = { ...next[id]!, claims: [claim] };
  return { ...campaign, states: next };
}

function withFlood(campaign: Campaign, state: StateId): Campaign {
  const condition: NationCondition = {
    id: `condition:flood:${campaign.founding.nation}:${state}:${campaign.turn}`,
    nation: campaign.founding.nation,
    kind: "flood",
    scope: "region",
    severity: 0.7,
    startedTurn: campaign.turn,
    status: "active",
    beats: [],
    state,
  };
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

function allyAttacked(campaign: Campaign): Campaign {
  const conflict: Conflict = {
    id: `war:RUS:POL:${campaign.turn}`,
    aggressor: "RUS" as NationId,
    defender: "POL" as NationId,
    joined: { aggressor: [], defender: [] },
    startedTurn: campaign.turn,
    cause: "A border the two of them read differently.",
    intensity: 0.6,
    warSupport: { aggressor: 0.6, defender: 0.7 },
    exhaustion: { aggressor: 0.1, defender: 0.1 },
    status: "active",
    beats: [{ turn: campaign.turn, description: "The border is crossed." }],
  };
  return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}

function sourcesOf(campaign: Campaign, kind: string) {
  return familySources(campaign).filter((source) => source.raise.kind === kind);
}

describe("a bill awaiting signature raises a bill case on its real signing window", () => {
  const { campaign, bill } = onTheDesk(base, { presentedOn: base.calendar });

  it("dates the statutory clock on the last of the ten days after presentment, Sundays excepted", () => {
    const [source] = sourcesOf(campaign, "bill");
    expect(source!.raise.id).toBe(`case:${bill.id}`);
    // Presented Saturday, January 20, 2029; the Sundays of the 21st and 28th do not count.
    expect(bill.presentedOn).toEqual({ year: 2029, month: 1, day: 20 });
    expect(source!.raise.clock).toEqual({ kind: "statutory", dueAt: { year: 2029, month: 2, day: 1 } });
    expect(source!.raise.clock).toEqual({ kind: "statutory", dueAt: selectSigningWindow(campaign, bill).deadline });
    expect(source!.row).toMatchObject({ id: source!.raise.id, source: "bill-signature", urgency: "hard", subject: `bill:${bill.id}` });
    expect(source!.row.clock?.kind).toBe("statutory");
  });

  it("is raised once, and closed as signed once the bill is law by signature", () => {
    const seated = seatFamilyCases(campaign);
    expect(seated.cases?.[`case:${bill.id}`]?.status).toBe("raised");
    expect(seatFamilyCases(seated)).toBe(seated);
    const signed = { ...seated, bills: { ...seated.bills, [bill.id]: { ...bill, status: "law" as const, enactedBy: "signed" as const } } };
    const settled = seatFamilyCases(signed).cases?.[`case:${bill.id}`];
    expect(settled?.status).toBe("acted");
    expect(settled?.history.at(-1)?.disposition).toEqual({ kind: "act", actionId: "signed" });
  });

  it("records a bill that became law unsigned as the default, not as an act", () => {
    const seated = seatFamilyCases(campaign);
    const lapsed = { ...seated, bills: { ...seated.bills, [bill.id]: { ...bill, status: "law" as const, enactedBy: "unsigned" as const } } };
    expect(seatFamilyCases(lapsed).cases?.[`case:${bill.id}`]?.status).toBe("defaulted");
  });
});

describe("a nomination awaiting a decision raises a nomination case", () => {
  const { campaign, id } = withNomineeInTrouble(base);

  it("raises one standing case, with no clock, for a nominee with findings", () => {
    const [source] = sourcesOf(campaign, "nomination");
    expect(source!.raise.id).toBe(`case:nomination:${id}`);
    expect(source!.raise.clock).toEqual({ kind: "none" });
    expect(source!.row.subject).toBe(`nomination:${id}`);
  });

  it("withdraws the nomination itself when the tray declines it", () => {
    const answer = familyDisposition(campaign, `case:nomination:${id}`, "decline");
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    const after = apply(campaign, answer.packet);
    expect(after.nominations[id]?.stage).toBe("withdrawn");
    expect(after.cases?.[`case:nomination:${id}`]?.status).toBe("declined");
    expect(familyQueue(after).some((entry) => entry.source.raise.id === `case:nomination:${id}`)).toBe(false);
  });
});

describe("the budget raises a case for the deadline and another for the lapse", () => {
  it("raises nothing while the deadline is still months out", () => {
    expect(sourcesOf(base, "budget")).toHaveLength(0);
  });

  it("raises the appropriations deadline on its statutory clock once it is this season's business", () => {
    const closing = fundedThrough(base, base.turn + 1);
    const [source] = sourcesOf(closing, "budget");
    expect(source!.raise.clock.kind).toBe("statutory");
    expect(source!.row).toMatchObject({ source: "appropriations-deadline", subject: "appropriation", summons: "appropriation" });
  });

  it("raises the lapse as its own case once the government has closed", () => {
    const closed = { ...fundedThrough(base, 3), turn: 8 };
    const [source] = sourcesOf(closed, "budget");
    expect(source!.raise.id).toMatch(/^case:budget:lapse:/);
    expect(source!.raise.clock).toEqual({ kind: "none" });
    expect(source!.row.urgency).toBe("hard");
  });
});

describe("an emergency raises a case for a condition request and for a declaration's continuation", () => {
  const signature = reliefSignature("flood");
  const claim: PendingClaim = { signature, openedTurn: base.turn, expiresTurn: base.turn + 4, weight: 0.3, reason: "Michigan asked for federal help with the flooding." };

  it("bundles one emergency's requests into one case on the claim's operational clock", () => {
    const campaign = withClaims(base, ["MI", "OH"] as StateId[], claim);
    const sources = sourcesOf(campaign, "emergency");
    expect(sources).toHaveLength(1);
    expect(sources[0]!.raise.clock).toEqual({ kind: "operational", dueAt: selectDateOfTurn(campaign, claim.expiresTurn) });
    expect(sources[0]!.row.title).toBe("2 governors are waiting to hear if you'll send federal help");
  });

  it("carries the Guard ask for a waiting state as the case's own act", () => {
    const campaign = withFlood(withClaims(base, ["MI"] as StateId[], claim), "MI" as StateId);
    const [source] = sourcesOf(campaign, "emergency");
    expect(source!.guardStates).toEqual(["MI"]);
  });

  it("folds the condition a request is about into the case, so the emergency appears once", () => {
    const campaign = withFlood(withClaims(base, ["MI"] as StateId[], claim), "MI" as StateId);
    const conditionId = Object.keys(campaign.conditions).find((id) => id.startsWith("condition:flood"))!;
    const items = attentionItems(campaign);
    expect(items.some((item) => item.subject === `condition:${conditionId}`)).toBe(false);
    const [source] = sourcesOf(campaign, "emergency");
    const row = items.find((item) => item.id === source!.raise.id)!;
    // The week it arrives, the case is the disaster's arrival and stops the run as one.
    expect(row).toMatchObject({ source: "disaster", urgency: "soft" });
    // Both the context and the door open the board with this flood selected, where its declaration is drawn.
    const selected = `/nation/emergency?incident=${encodeURIComponent(conditionId)}#emergency-incidents`;
    expect(source!.context).toMatchObject({ title: hazardLabel("flood"), href: selected });
    expect(source!.door.href).toBe(selected);
    expect(source!.row.reason).toContain(hazardLabel("flood"));
    expect(source!.row.reason).toContain(claim.reason);
    const lead = caseDetails(campaign).find((detail) => detail.id === source!.raise.id);
    expect(lead?.subject).toBe(`The states · ${hazardLabel("flood")}`);
    expect(caseDetail(campaign, familyQueue(campaign).find((entry) => entry.source.raise.id === source!.raise.id)!).context?.title).toBe(hazardLabel("flood"));
  });

  it("waits as a request once the emergency is no longer news", () => {
    const opened = withFlood(withClaims(base, ["MI"] as StateId[], claim), "MI" as StateId);
    const later = { ...opened, turn: opened.turn + 2, calendar: addDays(opened.calendar, 14) };
    const [source] = sourcesOf(later, "emergency");
    expect(source!.row.source).toBe("governor-request");
    expect(attentionItems(later).some((item) => item.subject.startsWith("condition:condition:flood"))).toBe(false);
  });

  it("leaves a condition nobody has asked Washington about on its own row", () => {
    const campaign = withFlood(base, "MI" as StateId);
    const conditionId = Object.keys(campaign.conditions).find((id) => id.startsWith("condition:flood"))!;
    expect(attentionItems(campaign).some((item) => item.subject === `condition:${conditionId}`)).toBe(true);
  });

  it("raises a declaration inside its continuation window", () => {
    const emergency: DeclaredEmergency = {
      id: "emergency:nation:flood:1",
      scope: { kind: "nation" },
      cause: "flood",
      declaredTurn: base.turn - 45,
      renewedTurn: base.turn - 45,
      reason: "Flooding across the Midwest.",
    } as DeclaredEmergency;
    const campaign = { ...base, emergencies: { [emergency.id]: emergency } };
    const [source] = sourcesOf(campaign, "emergency");
    expect(source!.raise.id).toBe(`case:emergency:${emergency.id}:2029-03-10`);
    expect(source!.row.source).toBe("treaty-deadline");
  });
});

describe("a foreign government's request raises a world-request case", () => {
  const campaign = allyAttacked(base);

  it("clocks the compact's grace as the window an answer is still an answer", () => {
    const [source] = sourcesOf(campaign, "foreign-request");
    expect(source!.raise.clock.kind).toBe("opportunity");
    if (source!.raise.clock.kind === "none") return;
    expect(daysBetween(campaign.calendar, source!.raise.clock.dueAt)).toBe(28);
    // A diplomatic request is a kind a player may log; the deadline lives on the case, never on the row.
    expect(source!.row.dueDate).toBeUndefined();
  });
});

describe("each family's matter appears once", () => {
  const everything = (() => {
    const withBill = onTheDesk(base).campaign;
    const withNominee = withNomineeInTrouble(withBill).campaign;
    const funded = fundedThrough(withNominee, withNominee.turn + 1);
    const flooded = withClaims(funded, ["MI"] as StateId[], {
      signature: reliefSignature("flood"),
      openedTurn: base.turn,
      expiresTurn: base.turn + 4,
      weight: 0.3,
      reason: "Michigan asked for federal help with the flooding.",
    });
    return allyAttacked(flooded);
  })();

  it("draws one queue entry per family and one attention row per matter", () => {
    const rows = caseDetails(everything);
    expect(new Set(rows.map((row) => row.kindLabel))).toEqual(new Set(["Bill", "Nomination", "Budget", "Emergency", "World request"]));
    expect(rows).toHaveLength(5);
    const family = familyRowIds(everything);
    const items = attentionItems(everything);
    for (const id of family) expect(items.filter((item) => item.id === id).length).toBeLessThanOrEqual(1);
    const subjects = items.map((item) => item.subject);
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it("names a lead case with the door to its own document", () => {
    const lead = leadCase(everything);
    expect(lead).toBeDefined();
    expect(caseDetail(everything, lead!).href).toBeDefined();
  });
});

describe("a put-off and a hand-off are said to the case as well", () => {
  const { campaign, bill } = onTheDesk(base);

  it("defers the bill's case with the Desk's own put-off, short of its deadline", () => {
    const row = attentionItems(campaign).find((item) => item.id === `case:${bill.id}`)!;
    const after = apply(campaign, deferMatterPacket(campaign, matterFor(row, campaign.calendar)));
    const record = after.cases?.[`case:${bill.id}`];
    expect(record?.status).toBe("deferred");
    if (record?.clock.kind === "none" || record?.deferredUntil === undefined) throw new Error("expected a clocked deferral");
    expect(daysBetween(record.deferredUntil, record.clock.dueAt)).toBeGreaterThan(0);
  });

  it("keeps a bill's signature with the President when the Chief of Staff takes the rest", () => {
    const plan = handOffPlan(campaign);
    expect(plan.kept.some((item) => item.id === `case:${bill.id}`)).toBe(true);
    expect(owedItems(campaign).some((item) => item.id === `case:${bill.id}`)).toBe(true);
  });

  it("stops asking once the President lets the bill become law unsigned", () => {
    const answer = familyDisposition(campaign, `case:${bill.id}`, "allow-default");
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    const after = apply(campaign, answer.packet);
    expect(attentionItems(after).find((item) => item.id === `case:${bill.id}`)?.urgency).toBe("ambient");
    expect(caseDetails(after)).toHaveLength(0);
  });
});
