import { describe, expect, it } from "vitest";
import {
  EMERGENCY_WEEKLY_STANDING_COST,
  apply,
  addDays,
  signBill,
  renewEmergency,
  declareEmergency,
  executiveOrder,
  type Campaign,
  type NationCondition,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { emergencyBoard, stateConditions } from "./emergency-board";
import { declarationChoices, endChoices, guardChoices, renewChoices, scopeOfChoice } from "./emergency-choices";
import { emergencyCalendar } from "../calendar/sources-security";
import { emergencySources } from "../desk/family-emergency";
import { formatDate } from "../format/figures";

const base = openingCampaign();
const SEIZURE = executiveOrder("order-asset-seizure")!.name;

function withFlood(campaign: Campaign, state: StateId, severity: number): Campaign {
  const condition: NationCondition = {
    id: `condition:flood:${campaign.founding.nation}:${state}:${campaign.turn}`,
    nation: campaign.founding.nation,
    kind: "flood",
    scope: "region",
    severity,
    startedTurn: campaign.turn,
    status: "active",
    beats: [],
    state,
  };
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

const flooded = withFlood(base, "OH", 0.7);
const floodId = Object.values(flooded.conditions).find((condition) => condition.state === "OH")!.id;

function limited(campaign: Campaign): Campaign {
  const bill = { id: "bill:limit", act: "act-emergency-powers-limitation", title: "Emergency Powers Limitation Act",
    sponsor: "opposition" as const, status: "on-the-desk" as const, introducedTurn: campaign.turn,
    presentedOn: campaign.calendar, passage: [] };
  const desk = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
  const result = signBill(desk, bill.id);
  if (!result.ok) throw new Error(result.reason);
  return apply(desk, result.packet);
}

function declared(campaign: Campaign, scope: "nation" | "state"): Campaign {
  const result = declareEmergency(campaign, scope === "nation" ? { kind: "nation" } : { kind: "state", state: "OH" as StateId }, "flood");
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

describe("emergencyBoard", () => {
  it("shows the enacted deadline on the board and calendar without a presidential renewal offer", () => {
    const standing = declared(flooded, "nation");
    const bill = { id: "bill:limit", act: "act-emergency-powers-limitation", title: "Emergency Powers Limitation Act",
      sponsor: "bipartisan" as const, status: "on-the-desk" as const, introducedTurn: standing.turn, presentedOn: standing.calendar, passage: [] };
    const desk = { ...standing, bills: { ...standing.bills, [bill.id]: bill } };
    const signed = signBill(desk, bill.id);
    if (!signed.ok) throw new Error(signed.reason);
    const limited = apply(desk, signed.packet);
    const due = addDays(standing.calendar, 90);
    const window = { from: standing.calendar, to: addDays(standing.calendar, 400) };
    expect(emergencyBoard(limited).declarations[0]).toMatchObject({ lapses: due, weeksToLapse: 90 / 7, renewalOpen: false });
    expect(emergencyCalendar(limited, window)[0]).toMatchObject({ date: due, detail: expect.stringContaining("Congress") });
    expect(emergencySources(limited)).toEqual([]);
    const expired = { ...limited, calendar: due };
    expect(emergencyBoard(expired).declarations).toEqual([]);
    expect(emergencyCalendar(expired, window)).toEqual([]);
  });

  it("gives renewal cases the civil anniversary, including after early continuation", () => {
    const standing = declared(flooded, "nation");
    const due = { ...standing.calendar, year: standing.calendar.year + 1 };
    const notice = { ...standing, calendar: addDays(due, -90) };
    const id = Object.keys(standing.emergencies)[0]!;
    expect(emergencySources(notice)[0]?.row.dueDate).toEqual(due);
    const result = renewEmergency(notice, id);
    if (!result.ok) throw new Error(result.reason);
    const renewed = apply(notice, result.packet);
    const nextDue = { ...due, year: due.year + 1 };
    const nextNotice = { ...renewed, calendar: addDays(nextDue, -90) };
    expect(emergencySources(nextNotice)[0]?.row.dueDate).toEqual(nextDue);
    expect(emergencySources(nextNotice)[0]?.raise.id).not.toBe(emergencySources(notice)[0]?.raise.id);
    expect(emergencyBoard(nextNotice).declarations[0]?.lapses).toEqual(nextDue);
  });
  it("is empty on a quiet map", () => {
    const board = emergencyBoard(base);
    expect(board.declarations).toEqual([]);
    expect(board.conditions).toEqual([]);
    expect(board.weeklyCost).toBe(0);
  });

  it("offers a running condition at the state and the nation, until a declaration covers it", () => {
    const row = emergencyBoard(flooded).conditions.find((entry) => entry.id === floodId)!;
    expect(row.declarable.map((entry) => entry.scope.kind)).toEqual(["state", "nation"]);
    expect(row.covered).toBe(false);
    const after = emergencyBoard(declared(flooded, "state")).conditions.find((entry) => entry.id === floodId)!;
    expect(after.declarable.map((entry) => entry.scope.kind)).toEqual(["nation"]);
    expect(after.covered).toBe(true);
  });

  it("reads a fresh declaration's clock and its weekly charge", () => {
    const board = emergencyBoard(declared(flooded, "nation"));
    expect(board.declarations).toHaveLength(1);
    const row = board.declarations[0]!;
    expect(row.weeksToLapse).toBe(365 / 7);
    expect(row.renewalOpen).toBe(false);
    expect(row.renewalOpensIn).toBe(275 / 7);
    expect(row.weeklyCost).toBe(EMERGENCY_WEEKLY_STANDING_COST);
    expect(row.causeRunning).toBe(true);
    expect(board.weeklyCost).toBe(row.weeklyCost);
  });

  it("lists the state a Guard federalization could be asked of", () => {
    expect(emergencyBoard(flooded).guard.map((row) => row.state)).toEqual(["OH"]);
  });
});

describe("stateConditions", () => {
  it("reads each state's worst condition and whether a declaration reaches it", () => {
    const before = stateConditions(flooded);
    expect(before.get("OH" as StateId)).toMatchObject({ severity: 0.7, declared: false });
    expect(before.get("CA" as StateId)!.severity).toBe(0);
    expect(stateConditions(declared(flooded, "state")).get("OH" as StateId)!.declared).toBe(true);
  });
});

describe("declarationChoices", () => {
  it("compares state and national declarations without claiming they open a foreign seizure", () => {
    const table = declarationChoices(flooded, floodId)!;
    expect(table.columns.map((column) => column.id)).toEqual(["state:OH", "nation"]);
    expect(scopeOfChoice("state:OH")).toEqual({ kind: "state", state: "OH" });
    const opens = table.rows.find((row) => row.id === "opens")!;
    expect(opens.cells[1]!.text).toBe("None you don't already have");
    expect(opens.cells[0]!.text).not.toContain(SEIZURE);
  });

  it("locks a scope already under a declaration", () => {
    const table = declarationChoices(declared(flooded, "state"), floodId)!;
    expect(table.columns[0]!.locked).toMatch(/already declared/);
    expect(table.columns[1]!.locked).toBeUndefined();
  });

  it("is undefined for a condition that is not running", () => {
    expect(declarationChoices(base, "condition:nothing")).toBeUndefined();
  });
});

describe("endChoices and renewChoices", () => {
  const standing = declared(flooded, "nation");
  const id = Object.keys(standing.emergencies)[0]!;

  it("does not claim ending a flood declaration closes a foreign seizure", () => {
    expect(endChoices(standing, id)!.rows.find((row) => row.id === "closes")!.cells[0]!.text).toBe("None that another emergency or a war doesn't still give you");
  });

  it("holds the continuation until its notice window opens", () => {
    expect(renewChoices(standing, id)!.columns[0]!.locked).toMatch(/^Not yet\./);
    const late = { ...standing, calendar: addDays(standing.calendar, 275) };
    expect(renewChoices(late, id)!.columns[0]!.locked).toBeUndefined();
    expect(renewChoices(standing, id)!.waiting).toMatch(/^If you don't renew it, it ends on /);
  });

  it("is undefined for a declaration that is not in force", () => {
    expect(endChoices(base, id)).toBeUndefined();
    expect(renewChoices(base, id)).toBeUndefined();
  });
});

describe("guardChoices", () => {
  it("offers asking, with no column for not asking, only where an emergency calls for it", () => {
    const table = guardChoices(flooded, "OH" as StateId)!;
    expect(table.columns.map((column) => column.id)).toEqual(["ask"]);
    expect(guardChoices(flooded, "CA" as StateId)).toBeUndefined();
  });
});

describe("one emergency authority deadline across the player", () => {
  const constrained = limited(flooded);
  const standing = declared(constrained, "nation");
  const id = Object.keys(standing.emergencies)[0]!;
  const deadline = { year: 2029, month: 4, day: 20 };

  it("uses the enacted deadline in the board, calendar and declaration/end/renew previews", () => {
    expect(emergencyBoard(standing).declarations[0]?.lapses).toEqual(deadline);
    const preview = declarationChoices(constrained, floodId)!;
    expect(preview.rows.find((row) => row.id === "lapses")!.cells.every((cell) => cell.text.includes(formatDate(deadline)))).toBe(true);
    expect(endChoices(standing, id)!.waiting).toContain(formatDate(deadline));
    const renewal = renewChoices(standing, id)!;
    expect(renewal.waiting).toContain(formatDate(deadline));
    expect(renewal.columns[0]!.locked).toContain("congressional renewal");
    expect(renewal.rows.find((row) => row.id === "until")!.cells[0]!.text).not.toContain("2030");
    const events = emergencyCalendar(standing, { from: standing.calendar, to: addDays(standing.calendar, 400) });
    expect(events[0]?.date).toEqual(deadline);
    expect(events[0]?.detail).toContain("Congress");
    expect(events[0]?.detail).not.toContain("publish the renewal notice");
  });

  it("removes expired declarations even before the daily expiry packet is applied", () => {
    const expired = { ...standing, calendar: deadline };
    expect(emergencyBoard(expired).declarations).toEqual([]);
    expect(emergencyCalendar(expired, { from: deadline, to: addDays(deadline, 400) })).toEqual([]);
    expect(emergencySources(expired).filter((source) => source.raise.subject.id === id)).toEqual([]);
    expect(renewChoices(expired, id)).toBeUndefined();
    expect(endChoices(expired, id)).toBeUndefined();
  });

  it("previews the next anniversary and gives the renewal case the same exact date", () => {
    const annual = declared(flooded, "nation");
    const annualId = Object.keys(annual.emergencies)[0]!;
    const timely = { ...annual, calendar: addDays(annual.calendar, 300) };
    const result = renewEmergency(timely, annualId);
    if (!result.ok) throw new Error(result.reason);
    const renewed = apply(timely, result.packet);
    const afterDate = emergencyBoard(renewed).declarations[0]!.lapses;
    expect(afterDate).toEqual({ year: 2031, month: 1, day: 20 });
    expect(renewChoices(timely, annualId)!.rows.find((row) => row.id === "until")!.cells[0]!.text).toContain(formatDate(afterDate));
    const source = emergencySources(timely).find((entry) => entry.row.subject === `emergency:${annualId}`)!;
    expect(source.row.dueDate).toEqual({ year: 2030, month: 1, day: 20 });
    expect(source.raise.clock.kind !== "none" && source.raise.clock.dueAt).toEqual(source.row.dueDate);
    expect(source.raise.id).toContain("2030-01-20");
  });
});
