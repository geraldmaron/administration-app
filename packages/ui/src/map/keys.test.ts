import { describe, expect, it } from "vitest";
import { mapKeyAction } from "./keys";

const ORDER = ["state:CA", "state:TX", "state:NY"];

describe("the map's keyboard", () => {
  it("enters the ranked order at either end and wraps round it", () => {
    expect(mapKeyAction("ArrowRight", ORDER, undefined)).toEqual({ kind: "focus", regionKey: "state:CA" });
    expect(mapKeyAction("ArrowLeft", ORDER, undefined)).toEqual({ kind: "focus", regionKey: "state:NY" });
    expect(mapKeyAction("ArrowDown", ORDER, "state:NY")).toEqual({ kind: "focus", regionKey: "state:CA" });
    expect(mapKeyAction("ArrowUp", ORDER, "state:TX")).toEqual({ kind: "focus", regionKey: "state:CA" });
    expect(mapKeyAction("End", ORDER, undefined)).toEqual({ kind: "focus", regionKey: "state:NY" });
  });

  it("opens only the region the keyboard is on", () => {
    expect(mapKeyAction("Enter", ORDER, "state:TX")).toEqual({ kind: "open", regionKey: "state:TX" });
    expect(mapKeyAction("Enter", ORDER, undefined)).toBeNull();
    expect(mapKeyAction(" ", ORDER, "state:gone")).toBeNull();
  });

  it("zooms, frames and lets go, and leaves every other key to the page", () => {
    expect(mapKeyAction("+", ORDER, undefined)).toEqual({ kind: "zoom", by: 1 });
    expect(mapKeyAction("-", ORDER, undefined)).toEqual({ kind: "zoom", by: -1 });
    expect(mapKeyAction("0", ORDER, undefined)).toEqual({ kind: "reframe" });
    expect(mapKeyAction("Escape", ORDER, "state:CA")).toEqual({ kind: "clear" });
    expect(mapKeyAction("Tab", ORDER, "state:CA")).toBeNull();
    expect(mapKeyAction("ArrowRight", [], undefined)).toBeNull();
  });
});
