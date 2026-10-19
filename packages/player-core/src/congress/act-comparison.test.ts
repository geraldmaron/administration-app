import { describe, expect, it } from "vitest";
import { actCell, dispositionMove } from "./act-comparison";

describe("an act's cell figure", () => {
  it("carries the disposition before and after when the room warms", () => {
    const cell = dispositionMove(0.56, 0.59);
    expect(cell.lines).toEqual(["Warms from 56% to 59%"]);
    expect(cell.figure).toEqual({ kind: "share", value: 0.59, from: 0.56, stance: "favorable" });
  });

  it("carries a cooling with the caution stance", () => {
    expect(dispositionMove(0.6, 0.5).figure).toEqual({ kind: "share", value: 0.5, from: 0.6, stance: "caution" });
  });

  it("holds the current disposition when nothing moves", () => {
    expect(dispositionMove(0.4, undefined).figure).toEqual({ kind: "share", value: 0.4, from: 0.4 });
    expect(dispositionMove(0.4, 0.401).lines).toEqual(["No change"]);
  });

  it("leaves a text-only cell without a figure", () => {
    expect(actCell("Nothing is spent").figure).toBeUndefined();
  });
});
