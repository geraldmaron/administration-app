import { describe, it, expect } from "vitest";
import { genericCharters } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import type { Campaign } from "./state.js";

// Charters are data, and charter choice must measurably change how the player
// can lose power. The charter catalogue itself lives in packages/world; this
// proves the engine reads that data meaningfully, with no charter-specific
// branching anywhere in the engine.
//
// The companion claim — that charter choice changes which content is eligible
// — is proven in packages/content's scenario-eligibility.test.ts, against
// `selectScenario`, which is the mechanism the player shell actually reaches.
// It cannot live here: the engine must not import @admin/content.

function withCharter(charterId: string): Campaign {
  const state = buildCampaign();
  return { ...state, founding: { ...state.founding, charter: charterId as Campaign["founding"]["charter"] } };
}

describe("charter choice changes how the player can lose power", () => {
  it("each charter carries its own removal mechanism and successor rule, readable straight off the founding charter", () => {
    const byId = new Map(genericCharters.map((c) => [c.id, c]));

    const juntaState = withCharter("charter-military-junta");
    const democracyState = withCharter("charter-electoral-democracy");

    const juntaCharter = byId.get(juntaState.founding.charter)!;
    const democracyCharter = byId.get(democracyState.founding.charter)!;

    expect(juntaCharter.removalMechanism).toBe("coup");
    expect(democracyCharter.removalMechanism).toBe("electoral-defeat");
    expect(juntaCharter.successionRule).not.toBe(democracyCharter.successionRule);
  });

  it("adding a charter requires only data: every generic charter validates identically with no special-casing", () => {
    for (const charter of genericCharters) {
      expect(charter.institutions.length).toBeGreaterThan(0);
      expect(charter.cabinetRoles.length).toBeGreaterThan(0);
    }
  });
});
