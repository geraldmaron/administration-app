import { describe, expect, it } from "vitest";
import { tieKeyEntries } from "../dossier/keys";
import { rollKeyEntries, ridgeKeyEntries, seatKeyEntries } from "../legislature/keys";
import { fanKeyEntries } from "../review/fan-keys";
import { MARK_STYLE, markKeyEntries, pathDirection, sparklineKeyEntries, swatchEntries } from "./key-entries";

describe("markKeyEntries", () => {
  it("lists each kind a track draws once, in a fixed order, drawn as the track draws it", () => {
    const entries = markKeyEntries([
      { kind: "gate" },
      { kind: "historical" },
      { kind: "gate" },
      { kind: "record" },
    ]);
    expect(entries.map((entry) => entry.id)).toEqual(["mark:record", "mark:historical", "mark:gate"]);
    expect(entries.every((entry) => entry.kind === "tick")).toBe(true);
    expect(entries[2]).toMatchObject({ ink: "danger", dash: MARK_STYLE.gate.dash, weight: MARK_STYLE.gate.tick });
  });

  it("keys nothing when there are no marks", () => {
    expect(markKeyEntries([])).toEqual([]);
  });

  it("tells a gate from a danger level by dash, not only by ink", () => {
    expect(MARK_STYLE.gate.ink).toBe(MARK_STYLE.danger.ink);
    expect(MARK_STYLE.gate.dash).not.toBe(MARK_STYLE.danger.dash);
  });

  it("draws the same kinds as lines along a chart", () => {
    expect(markKeyEntries([{ kind: "target" }], "line")[0]).toMatchObject({ kind: "line", weight: MARK_STYLE.target.width });
  });
});

describe("swatchEntries", () => {
  it("keeps each part's count beside its words", () => {
    expect(swatchEntries([{ key: "a", label: "Critical", ink: "danger", figure: 3 }])).toEqual([{ id: "a", kind: "swatch", label: "Critical", ink: "danger", figure: 3 }]);
  });
});

describe("pathDirection", () => {
  it("reads the administration's own stretch, not what came before", () => {
    expect(pathDirection([10, 2, 3, 4], 2)).toBe("up");
    expect(pathDirection([1, 9, 8, 7], 2)).toBe("down");
  });

  it("calls a move too small to see on the drawn scale flat", () => {
    expect(pathDirection([50, 60, 50.1], 0)).toBe("flat");
    expect(pathDirection([5], 0)).toBe("flat");
  });
});

describe("sparklineKeyEntries", () => {
  it("keys the inherited stretch only when one is drawn", () => {
    expect(sparklineKeyEntries({ ink: "successInk", inherited: false }).map((entry) => entry.id)).toEqual(["own", "arrow"]);
    expect(sparklineKeyEntries({ ink: "successInk", inherited: true }).map((entry) => entry.id)).toEqual(["own", "before", "arrow"]);
  });
});

describe("seatKeyEntries", () => {
  it("prints every party's seats and only the markings the chart draws", () => {
    const entries = seatKeyEntries(
      [
        { party: "democrat", seats: 213, label: "Democrats" },
        { party: "republican", seats: 222, label: "Republicans" },
      ],
      { votes: true, majority: 218 },
    );
    expect(entries.map((entry) => entry.id)).toEqual(["party:democrat", "party:republican", "yea", "nay", "none", "majority"]);
    expect(entries[0]).toMatchObject({ figure: 213, ink: "partyDem" });
    expect(entries.at(-1)?.label).toBe("218 needed for a majority");
  });
});

describe("rollKeyEntries", () => {
  it("keys the parties only when a roll is split by party, and a pale column only when one is drawn", () => {
    const totals = rollKeyEntries([{}]).map((entry) => entry.id);
    expect(totals).not.toContain("party:democrat");
    expect(totals).toContain("total");
    const split = rollKeyEntries([{ byParty: { democrat: {}, republican: {}, independent: {} } }]).map((entry) => entry.id);
    expect(split).toContain("party:democrat");
    expect(split).not.toContain("total");
  });
});

describe("ridgeKeyEntries", () => {
  it("lists the parties drawn and the band only when one is shaded", () => {
    expect(ridgeKeyEntries(["republican", "democrat"], false).map((entry) => entry.id)).toEqual(["party:democrat", "party:republican", "median", "you"]);
    expect(ridgeKeyEntries(["democrat"], true).at(-1)?.id).toBe("band");
  });
});

describe("tieKeyEntries", () => {
  it("keys the tones and evidence the map draws, and the hub only when it is formal", () => {
    const entries = tieKeyEntries({ nodes: [{ tone: "good" }], links: [{ tone: "bad", evidence: "inferred" }] });
    expect(entries.map((entry) => entry.id)).toEqual(["tone:good", "tone:bad", "inferred"]);
    expect(tieKeyEntries({ nodes: [], links: [], formalHub: true }).map((entry) => entry.id)).toEqual(["hub"]);
  });
});

describe("fanKeyEntries", () => {
  it("dashes the comparison and colors each option, then keys the spread", () => {
    const entries = fanKeyEntries([
      { id: "base", label: "Today's course", baseline: true, index: 0 },
      { id: "a", label: "Option A", baseline: false, index: 0 },
    ]);
    expect(entries[0]).toMatchObject({ kind: "dash", ink: "colorSecondary" });
    expect(entries[1]).toMatchObject({ kind: "line", label: "Option A" });
    expect(typeof (entries[1]!.ink as { color: string }).color).toBe("string");
    expect(entries[2]).toMatchObject({ id: "spread", band: true });
  });
});
