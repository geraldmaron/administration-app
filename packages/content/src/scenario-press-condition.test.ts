// A scenario can gate on what the press is doing: the corps's standing, how long
// the administration has gone without answering a question, how many desks have
// turned, and where one named desk stands.
import { describe, expect, it } from "vitest";
import { corpsFrom, outletSpreadAt, pressReading, type Campaign } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import type { ScenarioCondition } from "./scenario-conditions.js";
import { scenarioLive, type ScenarioSelectorLike } from "./scenario-cast.js";
import { ScenarioCondition as ConditionSchema } from "./scenario-conditions.js";

function selector(conditions: readonly ScenarioCondition[]): ScenarioSelectorLike {
  return { id: "probe", class: "unrest", severity: "serious", cast: { pick: "none" }, conditions, weight: 1 } as ScenarioSelectorLike;
}

describe("the press condition", () => {
  const base = sealedCampaign();
  const counterpart = base.founding.nation;
  const hostile: Campaign = { ...base, press: corpsFrom(base.press, outletSpreadAt(0.05)) };

  it("parses, and asks for a hostile corps honestly", () => {
    const condition = ConditionSchema.parse({ kind: "press", measure: "hostileShare", atLeast: 0.5 });
    expect(scenarioLive(hostile, selector([condition]), counterpart)).toBe(true);
    expect(scenarioLive(base, selector([condition]), counterpart)).toBe(false);
  });

  it("reads silence in weeks and one named desk", () => {
    const quiet: Campaign = { ...base, turn: base.press.lastSpokeTurn + 8 };
    const silence = ConditionSchema.parse({ kind: "press", measure: "silenceWeeks", atLeast: 6 });
    expect(scenarioLive(quiet, selector([silence]), counterpart)).toBe(true);
    const desk = ConditionSchema.parse({ kind: "press", measure: "outlet", outlet: "outlet-frontier-channel", atMost: 0.3 });
    expect(scenarioLive(hostile, selector([desk]), counterpart)).toBe(pressReading(hostile, "outlet", "outlet-frontier-channel")! <= 0.3);
  });

  it("never satisfies a desk that is not on the roster", () => {
    const unknown = ConditionSchema.parse({ kind: "press", measure: "outlet", outlet: "outlet-nobody", atLeast: 0 });
    expect(scenarioLive(base, selector([unknown]), counterpart)).toBe(false);
  });
});
