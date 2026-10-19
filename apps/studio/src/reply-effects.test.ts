import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { replyEffectsSection } from "../reply-effects-view.mjs";

const board = { index: 0, seed: "preview-trade-0", counterpart: "CAN", counterpartName: "Canada" };
const reply = {
  replyId: "lift", tone: "conciliatory", text: "Lift it.", available: true, quoted: { stability: -0.047 },
  metrics: [{ key: "stability", before: 0.66, after: 0.613 }, { key: "treasury", before: 1000, after: 1200 }],
  opinion: [], relationship: [{ key: "tension", before: 0.18, after: 0.06 }],
  customs: { key: "customs receipts per week ($M)", before: 27.47, after: 3.36 },
  imposed: [], lifted: [{ id: "tariff:CAN:food-processing:5", kind: "tariff", sector: "food-processing", target: "CAN", rate: 0.1, origin: "us", statute: "s338" }],
  flagsSet: [], effects: [{ kind: "trade", detail: "{}" }], beats: ["Both duties came off."],
};
const nations = [{ id: "USA", name: "United States" }, { id: "CAN", name: "Canada" }];

describe("what each reply does", () => {
  it("draws the board before and after, the trade ledger and the money in dollars", () => {
    const html = replyEffectsSection({ boards: [board], board, subject: "Canada offers", opening: [], replies: [reply] }, "/library/x", nations);
    expect(html).toContain("Lifted: U.S. tariff on food-processing (CAN) at 10% under s338");
    expect(html).toContain("+$200M");
    expect(html).toContain("var(--good)");
    expect(html).toContain("customs receipts per week ($M)");
  });

  it("never offers the President's own country as the counterpart", () => {
    const html = replyEffectsSection({ boards: [board], board, opening: [], replies: [reply] }, "/library/x", nations);
    expect(html).not.toContain('value="USA"');
  });

  it("says the engine's refusal and says plainly when no board has the scenario live", () => {
    const refused = { ...reply, available: false, refusal: "No trade law covers this tariff at that rate." };
    expect(replyEffectsSection({ boards: [board], board, opening: [], replies: [refused] }, "/x", nations)).toContain("Refused on this board: No trade law covers");
    expect(replyEffectsSection({ boards: [], opening: [], replies: [] }, "/x", nations)).toContain("No board in the reachability spread");
  });
});
