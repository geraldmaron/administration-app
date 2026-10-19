import { describe, expect, it } from "vitest";
import { apply, selectFamilyRun, type Effect } from "@admin/engine";
import { CORE_SCENARIOS } from "./packs/core.js";
import { sealedCampaign } from "./preview-board.js";
import { castScenario } from "./scenario-cast.js";
import { familyEffects, inactionPacket } from "./scenario-memory.js";
import { withFamiliesOpened } from "./scenario-reachability.js";

const byId = (id: string) => CORE_SCENARIOS.find((scenario) => scenario.id === id)!;
const LEASE = "the-ground-they-lease-to-us";

function closeCast() {
  const board = withFamiliesOpened(sealedCampaign(), CORE_SCENARIOS);
  const cast = castScenario(board, byId("the-terms-they-finally-signed"));
  if (!cast) throw new Error("the lease close did not cast on a board where its family is open");
  return { board, cast };
}

const closes = (effects: readonly Effect[]) =>
  effects.flatMap((effect) => (effect.kind === "scenarioFamily" && effect.close ? [effect.close] : []));

describe("an arc's ending, as the campaign records it", () => {
  it("closes the family the way the chosen reply says it ended", () => {
    const { cast } = closeCast();
    expect(closes(familyEffects(cast, 9, "sign-for-the-ground"))).toEqual([{ family: LEASE, turn: 9, disposition: "held" }]);
    expect(closes(familyEffects(cast, 9, "take-the-schedule"))).toEqual([{ family: LEASE, turn: 9, disposition: "lost" }]);
  });

  it("names the arc from the opener's subject when it opens", () => {
    const board = sealedCampaign();
    const cast = castScenario(board, byId("the-notice-on-the-lease"))!;
    const [open] = familyEffects(cast, 1, cast.def.replies[0]!.id);
    expect(open).toMatchObject({ kind: "scenarioFamily", open: { family: LEASE, title: cast.script.subject } });
  });

  it("ends the arc as lapsed when its close is left on the desk", () => {
    const { board, cast } = closeCast();
    const after = apply(board, inactionPacket(board, cast));
    expect(selectFamilyRun(after, LEASE)?.disposition).toBe("lapsed");
  });
});
