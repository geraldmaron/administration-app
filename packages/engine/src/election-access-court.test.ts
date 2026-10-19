import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { selectDateOfTurn, turnOnDate } from "./clock.js";
import { apply } from "./effects.js";
import { holdElection, presidencyElections } from "./elections.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { projectedStateCalls, stateCalls } from "./states.js";
import type { Campaign } from "./state.js";

function beforePresidentialNight(seed: string): Campaign {
  const founded = foundedForBalance(seed).campaign;
  const milestones = presidencyElections(founded.foundingDate ?? founded.calendar);
  const first = milestones[0]!;
  const second = milestones[1]!;
  const midtermTurn = turnOnDate(founded.foundingDate ?? founded.calendar, first.date);
  const electionTurn = turnOnDate(founded.foundingDate ?? founded.calendar, second.date);
  const turn = electionTurn - 18;
  return { ...founded, turn, calendar: selectDateOfTurn(founded, turn),
    termClock: { ...founded.termClock, elections: [{ id: `election:midterm:${midtermTurn}`, kind: "midterm",
      turn: midtermTurn, voteShare: 0.5, summary: "The midterm was held." }] } };
}

function courtWeek(state: Campaign): Campaign {
  const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
  const applied = phase(state).reduce(apply, state);
  const turn = state.turn + 1;
  return { ...applied, turn, calendar: selectDateOfTurn(applied, turn) };
}

describe("autonomous HAVA election-access matter", () => {
  it("opens on a dated state audit, proceeds through federal civil review, and repairs access before the election", () => {
    let state = beforePresidentialNight("hava-autonomous");
    state = courtWeek(state);
    const audit = Object.values(state.states).find((entry) => entry.electionAccess?.electionTurn === state.turn + 17);
    expect(audit?.electionAccess?.response).toBeUndefined();
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "state-election-access")).toBeFalsy();
    state = courtWeek(state);
    expect(state.judiciary.proceedings?.some((entry) => entry.subject.kind === "state-election-access")).toBeFalsy();
    state = courtWeek(state);
    const proceeding = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "state-election-access");
    expect(proceeding?.matter?.parties[0]?.name).toContain("Attorney General");
    expect(proceeding?.matter?.authority).toContain("Help America Vote Act");
    if (!proceeding || proceeding.subject.kind !== "state-election-access") throw new Error("HAVA case did not open");
    const id = proceeding.subject.state;
    const finding = state.states[id]!.electionAccess!;
    expect(finding.actor).toContain("audit");
    expect(finding.response).toContain("contest the audit");
    expect(finding.observedTurn).toBeLessThan(proceeding.filedTurn);
    expect(finding.electionTurn).toBeGreaterThan(finding.observedTurn);
    expect(finding.compliantShare).toBeLessThan(1);
    expect(projectedStateCalls(state, 0.5).find((call) => call.state === id)?.access?.affectedEligibleShare).toBeGreaterThan(0);
    for (let week = 0; week < 9; week += 1) state = courtWeek(state);
    const finished = state.judiciary.cases.find((entry) => entry.id === proceeding.id);
    expect(finished?.subject?.kind).toBe("state-election-access");
    expect(finished?.order).toBeUndefined();
    expect(finished?.procedure?.forum).toBe("lower");
    const repaired = state.states[id]!.electionAccess!;
    expect(repaired.remediedShare).toBe(Math.min(1, Math.round((repaired.compliantShare + repaired.installationCapacity!) * 100) / 100));
    expect(finished?.procedure?.appeal).toBeUndefined();
    expect(state.judiciary.proceedings?.find((entry) => entry.id === proceeding.id)?.lower?.enforcement).toBe("in-force");
    expect(projectedStateCalls(state, 0.5).find((call) => call.state === id)?.access?.affectedEligibleShare).toBeGreaterThanOrEqual(0);
  });

  it("stores the election-night access result so later state changes and save reload do not revise it", () => {
    const start = beforePresidentialNight("hava-snapshot");
    const filed = courtWeek(courtWeek(courtWeek(start)));
    const proceeding = filed.judiciary.proceedings!.find((entry) => entry.subject.kind === "state-election-access")!;
    if (proceeding.subject.kind !== "state-election-access") throw new Error("wrong subject");
    const id = proceeding.subject.state;
    const electionTurn = proceeding.subject.electionTurn;
    const night = { ...filed, turn: electionTurn, calendar: selectDateOfTurn(filed, electionTurn) };
    const result = holdElection(night, CHARTER_PRESIDENTIAL_REPUBLIC, "presidential", electionTurn);
    const historical = result.stateCalls!.find((call) => call.state === id)!;
    expect(historical.access?.affectedEligibleShare).toBeGreaterThan(0);
    const altered = { ...night, turn: electionTurn + 1, calendar: selectDateOfTurn(night, electionTurn + 1),
      termClock: { ...night.termClock, elections: [...night.termClock.elections, result] },
      states: { ...night.states, [id]: { ...night.states[id]!, electionAccess: {
        ...night.states[id]!.electionAccess!, remediedShare: 1 } } } };
    const reloaded = JSON.parse(JSON.stringify(altered)) as Campaign;
    expect(stateCalls(reloaded).find((call) => call.state === id)).toEqual(historical);
    expect(projectedStateCalls(reloaded, result.voteShare).find((call) => call.state === id)?.access).toBeUndefined();
  });

  it("keeps the missed-access share on election night when installation capacity falls short", () => {
    let state = beforePresidentialNight("hava-capacity");
    const electionTurn = state.turn + 18;
    state = courtWeek(state);
    const audited = Object.values(state.states).find((entry) => entry.electionAccess?.electionTurn === electionTurn)!;
    state = { ...state, states: { ...state.states, [audited.base.id]: { ...audited,
      electionAccess: { ...audited.electionAccess!, installationCapacity: 0.12 } } } };
    while (state.turn < electionTurn) state = courtWeek(state);
    const runtime = Object.values(state.states).find((entry) => entry.electionAccess?.electionTurn === electionTurn)!;
    const finding = runtime.electionAccess!;
    expect(finding.remediedShare).toBeLessThan(1);
    const result = holdElection(state, CHARTER_PRESIDENTIAL_REPUBLIC, "presidential", electionTurn);
    const call = result.stateCalls!.find((entry) => entry.state === runtime.base.id)!;
    expect(call.access?.affectedEligibleShare).toBeGreaterThan(0);
    expect(stateCalls({ ...state, termClock: { ...state.termClock, elections: [...state.termClock.elections, result] } })
      .find((entry) => entry.state === runtime.base.id)).toEqual(call);
  });
});
