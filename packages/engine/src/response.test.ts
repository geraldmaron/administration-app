import { describe, expect, it } from "vitest";
import type { StateId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { CONDITION_KINDS, STANDING_CONDITIONS } from "./condition-kinds.js";
import { conditionImpactWrites, STANDING_ONSET_READS, conditionPhase } from "./conditions.js";
import { apply } from "./effects.js";
import {
  EXHAUSTION_DRAG,
  GOVERNOR_CONSENT,
  MORALE_STRAIN_FLOOR,
  RESPONSE_FLOOR,
  RESPONSE_MEMBERS,
  responseEffectiveness,
  responseLoads,
  responseMitigation,
  responseOperations,
  responseOperationsFor,
  responsePosture,
  statesConsent,
  federalResponseMembers,
  isFederallyDeployable,
} from "./response.js";
import type { Campaign, NationCondition } from "./state.js";

const TEXAS = "TX" as StateId;

function flood(overrides: Partial<NationCondition> = {}): NationCondition {
  return {
    id: "condition:flood:USA:1",
    nation: nationA.id,
    kind: "flood",
    scope: "nation",
    severity: 0.6,
    startedTurn: 1,
    status: "active",
    state: TEXAS,
    beats: [{ turn: 1, description: "Flooding." }],
    ...overrides,
  };
}

function withCondition(campaign: Campaign, ...conditions: readonly NationCondition[]): Campaign {
  return {
    ...campaign,
    conditions: {
      ...campaign.conditions,
      ...Object.fromEntries(conditions.map((condition) => [condition.id, condition])),
    },
  };
}

function withGovernor(campaign: Campaign, state: StateId, disposition: number): Campaign {
  const runtime = campaign.states[state]!;
  return {
    ...campaign,
    states: {
      ...campaign.states,
      [state]: {
        ...runtime,
        governor: { person: "person-gov" as never, party: "democrat", disposition },
      },
    },
  };
}

function withNationalEmergency(campaign: Campaign): Campaign {
  return {
    ...campaign,
    emergencies: {
      "emergency:nation:flood:1": {
        id: "emergency:nation:flood:1",
        scope: { kind: "nation" },
        cause: "flood",
        declaredTurn: 1,
        renewedTurn: 1,
        reason: "A state of emergency was declared over the flood in the United States.",
      },
    },
  };
}

describe("the response catalog", () => {
  it("names a member list for every condition kind, so no kind falls through", () => {
    for (const kind of CONDITION_KINDS) {
      expect(RESPONSE_MEMBERS[kind], kind).toBeDefined();
    }
  });

  it("gives the five economic standing kinds no deployable body", () => {
    // The absence is the design: a recession is answered by a program, not by
    // sending an agency somewhere. If this ever gains a member, the posture
    // switch has quietly become a substitute for the appropriation.
    for (const kind of ["recession", "inflation-shock", "unemployment-shock", "fiscal-crisis", "housing-crunch"] as const) {
      expect(RESPONSE_MEMBERS[kind], kind).toHaveLength(0);
    }
  });

  it("names only institutions the catalog actually seats", () => {
    const campaign = buildCampaign();
    for (const kind of CONDITION_KINDS) {
      for (const member of RESPONSE_MEMBERS[kind]) {
        expect(campaign.institutions[member], `${kind} -> ${member}`).toBeDefined();
      }
    }
  });
});

describe("Law 8 holds through the response", () => {
  it("never lets a mitigated kind reach a stat its own onset reads", () => {
    // The response is a multiplier on the IMPACTS row and nothing else, so the
    // set of stats it can move is exactly the set that row already moves. This
    // restates the Law 8 table check against the kinds that gained a response,
    // which is the pairing a reviewer would otherwise have to hold in their head.
    for (const kind of STANDING_CONDITIONS) {
      if (RESPONSE_MEMBERS[kind].length === 0) continue;
      const reads = new Set(STANDING_ONSET_READS[kind]);
      for (const written of conditionImpactWrites(kind)) {
        expect(reads.has(written), `${kind} writes ${written}`).toBe(false);
      }
    }
  });

  it("stays a multiplier inside its own band", () => {
    const campaign = withCondition(buildCampaign(), flood());
    const mitigation = responseMitigation(campaign, flood());
    expect(mitigation).toBeLessThan(1);
    expect(mitigation).toBeGreaterThanOrEqual(RESPONSE_FLOOR);
  });

  it("does not answer a condition abroad or one no agency can be sent to", () => {
    const abroad = flood({ id: "condition:flood:ALP:1", nation: nationB.id, state: undefined });
    const recession = flood({ id: "condition:recession:USA:1", kind: "recession" });
    const campaign = withCondition(buildCampaign(), abroad, recession);
    expect(responseMitigation(campaign, abroad)).toBe(1);
    expect(responseMitigation(campaign, recession)).toBe(1);
  });
});

describe("the states are a member and not a subordinate", () => {
  it("keeps them out when the governor is against it and nothing is declared", () => {
    const campaign = withGovernor(withCondition(buildCampaign(), flood()), TEXAS, GOVERNOR_CONSENT - 0.2);
    expect(statesConsent(campaign, flood())).toBe(false);
    expect(responseOperationsFor(campaign, flood()).map((op) => op.lead)).toEqual(["INST-FEMA"]);
  });

  it("brings them in on a consenting governor", () => {
    const campaign = withGovernor(withCondition(buildCampaign(), flood()), TEXAS, GOVERNOR_CONSENT + 0.2);
    expect(statesConsent(campaign, flood())).toBe(true);
    expect(responseOperationsFor(campaign, flood()).map((op) => op.lead)).toEqual([
      "INST-FEMA",
      "INST-STATES",
    ]);
  });

  it("brings them in over a hostile governor when the emergency is declared", () => {
    const campaign = withNationalEmergency(
      withGovernor(withCondition(buildCampaign(), flood()), TEXAS, 0),
    );
    expect(statesConsent(campaign, flood())).toBe(true);
    expect(responsePosture(campaign, flood())).toBe("surge");
  });

  it("requires a nation-scoped declaration for a condition with no place in it", () => {
    const placeless = flood({ state: undefined });
    const campaign = withCondition(buildCampaign(), placeless);
    expect(statesConsent(campaign, placeless)).toBe(false);
    expect(statesConsent(withNationalEmergency(campaign), placeless)).toBe(true);
  });
});

describe("exhaustion", () => {
  const second = flood({ id: "condition:wildfire:USA:1", kind: "wildfire", state: "CA" as StateId });

  it("takes about half of FEMA's week per sustained nationwide disaster", () => {
    const campaign = withNationalEmergency(withCondition(buildCampaign(), flood()));
    const [fema] = responseOperationsFor(campaign, flood());
    // Surged, so the load is 1.6x the sustained figure the constant is set
    // against: one operation already has the small agency past its own size.
    expect(fema!.lead).toBe("INST-FEMA");
    expect(fema!.load).toBeCloseTo(0.8, 3);
  });

  it("exhausts the small agency on two disasters and barely troubles the large one", () => {
    const campaign = withCondition(buildCampaign(), flood(), second);
    const femaOps = responseOperations(campaign).filter((op) => op.lead === "INST-FEMA");
    expect(femaOps).toHaveLength(2);
    // Standby, the cheapest posture there is, and two disasters already read as
    // 40% of the agency's week.
    expect(femaOps[0]!.exhaustion).toBeCloseTo(0.4, 3);

    const pandemic = flood({ id: "condition:pandemic:USA:1", kind: "pandemic" });
    const hhs = responseOperationsFor(withCondition(buildCampaign(), pandemic), pandemic).find(
      (op) => op.lead === "INST-HHS",
    );
    expect(hhs!.exhaustion).toBeLessThan(0.1);
  });

  it("comes off what the lead delivers", () => {
    const one = withCondition(buildCampaign(), flood());
    const two = withCondition(buildCampaign(), flood(), second);
    const stretched = responseOperationsFor(two, flood())[0]!;
    const rested = responseOperationsFor(one, flood())[0]!;
    expect(stretched.effectiveness).toBeLessThan(rested.effectiveness);
    expect(EXHAUSTION_DRAG).toBeGreaterThan(0);
  });

  it("raises the lead body's backlog and, past the floor, costs it morale", () => {
    const light = withCondition(buildCampaign(), flood());
    const lightLoad = responseLoads(light).find((load) => load.institution === "INST-FEMA")!;
    expect(lightLoad.backlog).toBeGreaterThan(light.institutions["INST-FEMA"]!.backlog);
    // One standby operation sits under the strain floor: work arrives, nobody
    // is worn down by it.
    expect(lightLoad.morale).toBe(light.institutions["INST-FEMA"]!.morale);

    const surged = withNationalEmergency(withCondition(buildCampaign(), flood(), second));
    const heavy = responseLoads(surged).find((load) => load.institution === "INST-FEMA")!;
    expect(heavy.backlog).toBeGreaterThan(lightLoad.backlog);
    expect(heavy.morale).toBeLessThan(surged.institutions["INST-FEMA"]!.morale);
    expect(MORALE_STRAIN_FLOOR).toBeGreaterThan(0);
  });
});

describe("posture is bought with acts that already cost something", () => {
  it("stands by until the President has done anything about it", () => {
    const campaign = withCondition(buildCampaign(), flood());
    expect(responsePosture(campaign, flood())).toBe("standby");
    const declared = withNationalEmergency(campaign);
    expect(responsePosture(declared, flood())).toBe("surge");
    expect(responseEffectiveness(declared, flood())).toBeGreaterThan(
      responseEffectiveness(campaign, flood()),
    );
    expect(responseMitigation(declared, flood())).toBeLessThan(responseMitigation(campaign, flood()));
  });
});

describe("the weekly conversion into the backlog the tick already uses", () => {
  it("bills the lead body through the condition phase", () => {
    const campaign = withCondition(buildCampaign(), flood());
    const before = campaign.institutions["INST-FEMA"]!.backlog;
    const after = conditionPhase(campaign).reduce(
      (state, packet) => apply(state, packet),
      campaign,
    );
    expect(after.institutions["INST-FEMA"]!.backlog).toBeGreaterThan(before);
    // And the number every surface prints is still the derivation, re-run off
    // the moved backlog rather than adjusted beside it.
    expect(after.institutions["INST-FEMA"]!.implementationQuality).toBeLessThan(
      campaign.institutions["INST-FEMA"]!.implementationQuality,
    );
  });

  it("emits nothing at all in a week with no open operation", () => {
    const campaign = buildCampaign();
    expect(responseLoads(campaign)).toHaveLength(0);
  });
});

describe("federal deployability", () => {
  it("treats flood as federally deployable and unrest as the states' file", () => {
    expect(isFederallyDeployable("flood")).toBe(true);
    expect(federalResponseMembers("flood")).toContain("INST-FEMA");
    expect(isFederallyDeployable("unrest")).toBe(false);
    expect(federalResponseMembers("unrest")).toEqual([]);
    expect(isFederallyDeployable("housing-crunch")).toBe(false);
  });
});

