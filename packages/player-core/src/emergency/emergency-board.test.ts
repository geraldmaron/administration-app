import { describe, expect, it } from "vitest";
import {
  EMERGENCY_NOTICE_TURNS,
  EMERGENCY_RENEWAL_TURNS,
  EMERGENCY_WEEKLY_STANDING_COST,
  apply,
  declareEmergency,
  executiveOrder,
  type Campaign,
  type NationCondition,
} from "@admin/engine";
import type { StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { emergencyBoard, stateConditions } from "./emergency-board";
import { declarationChoices, endChoices, guardChoices, renewChoices, scopeOfChoice } from "./emergency-choices";

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

function declared(campaign: Campaign, scope: "nation" | "state"): Campaign {
  const result = declareEmergency(campaign, scope === "nation" ? { kind: "nation" } : { kind: "state", state: "OH" as StateId }, "flood");
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

describe("emergencyBoard", () => {
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
    expect(row.weeksToLapse).toBe(EMERGENCY_RENEWAL_TURNS);
    expect(row.renewalOpen).toBe(false);
    expect(row.renewalOpensIn).toBe(EMERGENCY_RENEWAL_TURNS - EMERGENCY_NOTICE_TURNS);
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
    const late = { ...standing, turn: standing.turn + EMERGENCY_RENEWAL_TURNS - EMERGENCY_NOTICE_TURNS };
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
