import { describe, expect, it } from "vitest";
import { Relationship, type NationId, type OrgId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams } from "./rng.js";
import { relationshipKey, type Campaign } from "./state.js";
import { projectAction } from "./resolution.js";
import { tariffCompetence } from "./instrument-gates.js";
import { applyMembership } from "./world-events.js";

// A customs union tariffs as a bloc and never tariffs its own members: a
// member government has no tariff schedule of its own to raise.

const USA = nationA.id as NationId;
const ALP = nationB.id as NationId;

function joined(campaign: Campaign, nation: NationId, org: string): Campaign {
  return applyMembership(campaign, { kind: "membership", nation, org: org as OrgId, change: "accede" });
}

function traded(): Campaign {
  const base = buildCampaign();
  const back = Relationship.parse({
    from: ALP,
    to: USA,
    trust: -0.4,
    alignment: 0,
    tension: 0.6,
    tradeDependence: 0.3,
    militaryThreat: 0.1,
    treaties: [],
    grudges: [],
    history: [],
  });
  return { ...base, relationships: { ...base.relationships, [relationshipKey(ALP, USA)]: back } };
}

describe("the tariff rung under a customs union", () => {
  it("is closed to a customs-union member against anyone", () => {
    const campaign = joined(traded(), ALP, "ORG-EU");
    expect(tariffCompetence(campaign, ALP, USA).ok).toBe(false);
    const projected = projectAction(campaign, { actor: ALP, target: USA, instrument: "economic", rung: 2 }, createRngStreams(campaign.seed));
    expect(projected.ok).toBe(false);
    expect(!projected.ok && projected.missingCapability).toMatch(/European Union/);
  });

  it("is closed to a free-trade-area member against a fellow member, and open against an outsider", () => {
    const campaign = joined(joined(traded(), ALP, "ORG-ASEAN"), USA, "ORG-ASEAN");
    expect(tariffCompetence(campaign, ALP, USA).ok).toBe(false);
    expect(tariffCompetence(joined(traded(), ALP, "ORG-ASEAN"), ALP, USA).ok).toBe(true);
  });

  it("is open to a government in no trade body", () => {
    expect(tariffCompetence(traded(), ALP, USA).ok).toBe(true);
  });
});
