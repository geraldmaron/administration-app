import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { signOrder } from "./orders.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { servicePhase } from "./services.js";
import { intelligencePhase } from "./intelligence.js";
import { inspectorGeneralPhase } from "./inspectors-general.js";
import { oversightRipeningPhase } from "./oversight.js";
import type { Campaign, Pursuit } from "./state.js";
import type { RngStreams } from "./rng.js";

const forced: RngStreams = { stream: () => ({ key: "court-breadth", next: () => 0,
  nextInt: (min: number) => min, pick: <T>(items: readonly T[]) => items[0]! }) };
const court = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
const service = (state: Campaign): Campaign => servicePhase(state).reduce(apply, state);
const advance = (state: Campaign): Campaign => court(state).reduce(apply, state);

describe("fact-backed immigration and civil-rights matters", () => {
  it("files an entry case only after a visa decision and ends proclamation refusals after a strike-down", () => {
    const opened = foundedForBalance("entry-application-case").campaign;
    const nation = Object.keys(opened.nations).find((id) => id !== opened.founding.nation)! as Campaign["founding"]["nation"];
    const pursuit: Pursuit = { id: `pursuit:entry:${nation}`, actor: nation, target: opened.founding.nation,
      aim: "security", openedTurn: opened.turn, commitment: 0.7, progress: 0.2,
      rungReached: 2, overt: true, lastActedTurn: opened.turn, status: "active", beats: [] };
    const initial = { ...opened, pursuits: { ...opened.pursuits, [pursuit.id]: pursuit } };
    const signed = signOrder(initial, CHARTER_PRESIDENTIAL_REPUBLIC, "order-entry-suspension", forced,
      { kind: "entry-class", nation, pursuitId: pursuit.id });
    if (!signed.ok) throw new Error(signed.reason);
    let state = apply(initial, signed.packet);
    const record = signed.record;
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "executive-order"
      && entry.subject.recordId === record.id)).toBeFalsy();
    state = advance(state);
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "executive-order"
      && entry.subject.recordId === record.id)).toBeFalsy();
    state = service(state);
    const refusal = state.services?.["consular-visas"]?.entryRefusals?.find((entry) => entry.orderRecordId === record.id);
    expect(refusal?.ground).toBe("entry-suspension");
    expect(refusal?.nation).toBe(nation);
    expect(state.services?.["consular-visas"]?.last?.refused).toBeGreaterThan(0);
    state = advance(state);
    const proceeding = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
      && entry.subject.recordId === record.id);
    expect(proceeding?.matter?.kind).toBe("entry-suspension");
    expect(proceeding?.matter?.evidence).toContain(`Visa application record: ${refusal?.id}.`);
    expect(proceeding?.matter?.jurisdiction).toContain("Reviewability is contested");
    expect(proceeding?.matter?.authority).toContain("Muñoz");
    for (let i = 0; i < 10 && state.orders.find((entry) => entry.id === record.id)?.review?.status === "pending"; i += 1) {
      state = { ...state, turn: state.turn + 1 };
      state = advance(state);
    }
    const result = state.orders.find((entry) => entry.id === record.id)!;
    expect(result.review?.status).not.toBe("pending");
    if (result.review?.status === "struck-down") {
      const later = service({ ...state, turn: state.turn + 1 });
      expect(later.services?.["consular-visas"]?.last?.refused).toBe(0);
    }
    expect(JSON.parse(JSON.stringify(state.judiciary.proceedings)) as unknown).toEqual(state.judiciary.proceedings);
  });

  it("opens a private housing case from a dated HUD complaint and makes its narrow remedy operate", () => {
    let state = foundedForBalance("housing-complaint-case").campaign;
    for (let i = 0; i < 180 && !state.services?.["fair-housing-complaints"]?.housingComplaint; i += 1) {
      state = service(state);
      state = { ...state, turn: state.turn + 1 };
    }
    const complaint = state.services?.["fair-housing-complaints"]?.housingComplaint;
    expect(complaint).toBeDefined();
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "fair-housing-enforcement")).toBeFalsy();
    state = advance(state);
    const filed = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "fair-housing-enforcement");
    expect(filed?.matter?.kind).toBe("fair-housing-enforcement");
    expect(filed?.matter?.evidence).toContain(`HUD complaint: ${complaint?.id}.`);
    expect(filed?.matter?.jurisdiction).toContain("§3613");
    expect(filed?.matter?.evidence).toContain(`Respondent's written criterion: ${complaint?.writtenCriterion}.`);
    const originalDeadline = complaint!.applicationDeadlineTurn;
    state = { ...state, turn: state.turn + 1 };
    state = advance(state);
    state = { ...state, turn: state.turn + 1 };
    state = advance(state);
    expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.status).toBe("interim-protected");
    state = service({ ...state, turn: state.turn + 1 });
    expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.applicationDeadlineTurn)
      .toBe(originalDeadline + 1);
    state = { ...state, turn: state.turn + 1 };
    state = advance(state);
    const lower = state.judiciary.proceedings?.find((entry) => entry.id === filed?.id);
    expect(lower?.lower?.enforcement).toBe("stayed-pending-appeal");
    expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.status).toBe("interim-protected");
    expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.applicationDeadlineTurn)
      .toBeGreaterThan(state.turn);
    for (let i = 0; i < 6 && !state.judiciary.cases.some((entry) => entry.id === filed?.id); i += 1) {
      state = { ...state, turn: state.turn + 1 };
      state = advance(state);
    }
    const decided = state.judiciary.cases.find((entry) => entry.id === filed?.id);
    expect(decided?.procedure?.forum).toBe("lower");
    expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.status).toBe(
      decided?.holding === "struck-down" ? "reconsideration-ordered" : "unprotected");
    expect(decided?.holding).toBe(complaint?.writtenCriterion === "race" ? "struck-down" : "upheld");
    if (decided?.holding === "struck-down") {
      const reworkBefore = state.services!["fair-housing-complaints"]!.returning[0]!;
      state = service({ ...state, turn: state.turn + 1 });
      expect(state.services?.["fair-housing-complaints"]?.last?.rework).toBeGreaterThan(reworkBefore);
      expect(state.services?.["fair-housing-complaints"]?.housingComplaint?.status).toBe("reconsidered");
    }
    expect(JSON.parse(JSON.stringify(state.services?.["fair-housing-complaints"]?.housingComplaint)) as unknown)
      .toEqual(state.services?.["fair-housing-complaints"]?.housingComplaint);
  });

  it("files Labor's §216(c) claim after a recorded payroll shortfall and employer refusal", () => {
    let state = foundedForBalance("wage-complaint-case").campaign;
    for (let i = 0; i < 240 && !state.services?.["wage-complaints"]?.wageComplaint; i += 1) {
      state = service(state);
      state = { ...state, turn: state.turn + 1 };
    }
    const complaint = state.services?.["wage-complaints"]?.wageComplaint;
    expect(complaint).toBeDefined();
    expect(complaint?.requiredPay).toBe(980);
    expect(complaint?.paid).toBe(920);
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "wage-hour-enforcement")).toBeFalsy();
    state = service({ ...state, turn: state.turn + 1 });
    expect(state.services?.["wage-complaints"]?.wageComplaint?.employerResponse).toBe("refused");
    state = advance(state);
    const filed = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "wage-hour-enforcement");
    expect(filed?.matter?.jurisdiction).toContain("§216(c)");
    expect(filed?.matter?.evidence).toContain(`Employer refused supervised payment on turn ${state.turn}.`);
    for (let i = 0; i < 2; i += 1) {
      state = { ...state, turn: state.turn + 1 };
      state = advance(state);
    }
    expect(state.judiciary.proceedings?.find((entry) => entry.id === filed?.id)?.lower?.enforcement)
      .toBe("stayed-pending-appeal");
    expect(state.services?.["wage-complaints"]?.wageComplaint?.status).toBe("litigating");
    for (let i = 0; i < 2; i += 1) {
      state = { ...state, turn: state.turn + 1 };
      state = advance(state);
    }
    expect(state.judiciary.cases.find((entry) => entry.id === filed?.id)?.opinion.majority).toContain("$60 in liquidated damages");
    expect(state.services?.["wage-complaints"]?.wageComplaint?.status).toBe("recovery-ordered");
    const before = state.services!["wage-complaints"]!.returning[0]!;
    state = service({ ...state, turn: state.turn + 1 });
    expect(state.services?.["wage-complaints"]?.last?.rework).toBeGreaterThan(before);
    expect(state.services?.["wage-complaints"]?.wageComplaint?.status).toBe("recovered");
  });

  it("waits for an actual NSA interception and IG exposure before an aggrieved person sues", () => {
    let state = foundedForBalance("nsa-interception-case").campaign;
    state = { ...state, institutions: { ...state.institutions,
      "INST-NSA": { ...state.institutions["INST-NSA"]!, integrity: 0.3 } } };
    const intelligence = (campaign: Campaign): Campaign => intelligencePhase(campaign).reduce(apply, campaign);
    const inspector = (campaign: Campaign): Campaign => inspectorGeneralPhase(campaign).reduce(apply, campaign);
    const oversight = (campaign: Campaign): Campaign => oversightRipeningPhase(campaign).reduce(apply, campaign);
    for (let i = 0; i < 100 && !state.security.intelligence.surveillanceIncident; i += 1) {
      state = intelligence(state);
      state = { ...state, turn: state.turn + 1 };
    }
    const incident = state.security.intelligence.surveillanceIncident;
    expect(incident?.auditLog).toContain("without consent, a FISA order, or another statutory exception");
    expect(incident?.status).toBe("recorded");
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "unlawful-surveillance")).toBeFalsy();
    for (let i = 0; i < 30 && state.security.intelligence.surveillanceIncident?.status !== "exposed"; i += 1) {
      state = inspector(state);
      state = oversight(state);
      state = { ...state, turn: state.turn + 1 };
    }
    expect(state.security.intelligence.surveillanceIncident?.status).toBe("exposed");
    state = advance(state);
    const filed = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "unlawful-surveillance");
    expect(filed?.matter?.authority).toContain("§§1801(f), 1809 and 1810");
    expect(filed?.matter?.evidence?.[0]).toContain(incident?.id);
    for (let i = 0; i < 4; i += 1) {
      state = { ...state, turn: state.turn + 1 };
      state = advance(state);
    }
    expect(state.judiciary.cases.find((entry) => entry.id === filed?.id)?.opinion.majority).toContain("$1000");
    expect(state.security.intelligence.surveillanceIncident?.status).toBe("damages-ordered");
    state = intelligence({ ...state, turn: state.turn + 1 });
    expect(state.security.intelligence.surveillanceIncident?.status).toBe("complied");
    expect(JSON.parse(JSON.stringify(state.security.intelligence.surveillanceIncident)) as unknown)
      .toEqual(state.security.intelligence.surveillanceIncident);
  });
});
