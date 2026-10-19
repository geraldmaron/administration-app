// Sum-equals-composition, disposition drift, and chamberDisposition agreement
// for delegations.

import { describe, expect, it } from "vitest";
import {
  CHARTER_USA_CONSTITUTION,
  CRADLE_POTOMAC,
  US_ID,
  STATE_IDS,
  defaultFlagDesign,
  worldDataset,
} from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { administrationAlignment } from "./party.js";
import { makeCampaignSeed } from "./rng.js";
import {
  CAUCUS_TILT_STATE,
  DELEGATION_DRIFT,
  GRIEVANCE_WEIGHT,
  apportionDelegations,
  delegationTarget,
  driftDelegation,
  grievanceReading,
  sumHouseDelegations,
  sumSenateDelegations,
  withApportionedDelegations,
} from "./delegations.js";
import { chamberDisposition, DELEGATION_LEVERAGE } from "./hill.js";
import { majorityOf } from "./congress.js";
import { countVote } from "./congress-votes.js";
import { openingStates } from "./states.js";
import { recompose } from "./elections.js";
import { apply, type EffectPacket } from "./effects.js";
import type { Campaign, GrievanceMark, StateRuntime } from "./state.js";

const SEED = makeCampaignSeed("delegation-apportion-seed");

function baseChoices(over: Partial<FoundingChoices> = {}): FoundingChoices {
  const pool = generateFoundingPool(SEED, worldDataset);
  const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
  const cabinet = Object.fromEntries(
    Object.entries(candidates).map(([role, list]) => [role, list[0]!.id]),
  ) as FoundingChoices["cabinet"];
  return {
    nationId: US_ID,
    nationName: "United States",
    name: "Test Leader",
    title: "President",
    charterId: CHARTER_USA_CONSTITUTION.id,
    cradleId: CRADLE_POTOMAC,
    compactIds: [],
    cabinet,
    flag: defaultFlagDesign,
    leader: { ...defaultLeaderDraft(), name: "Test Leader" },
    ...over,
  };
}

function assertMatchesChambers(campaign: Campaign): void {
  const house = sumHouseDelegations(campaign.states);
  const senate = sumSenateDelegations(campaign.states, campaign.congress.caucusAnchor);
  expect(house).toEqual(campaign.congress.chambers.house);
  expect(senate).toEqual(campaign.congress.chambers.senate);
  for (const id of STATE_IDS) {
    const runtime = campaign.states[id]!;
    expect(runtime.delegation).toBeDefined();
    expect(runtime.delegation!.house.seats).toBe(runtime.base.houseSeats);
    if (id !== "DC") {
      expect(runtime.delegation!.senate).toHaveLength(2);
    }
  }
}

describe("apportionDelegations", () => {
  it("sums to chamber composition at founding", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    assertMatchesChambers(campaign);
  });

  it("is deterministic across runs", () => {
    const states = openingStates();
    const congress = sealFounding(SEED, worldDataset, baseChoices()).congress;
    const first = apportionDelegations(congress, states);
    const second = apportionDelegations(congress, states);
    expect(first).toEqual(second);
    expect(withApportionedDelegations(congress, states)).toEqual(withApportionedDelegations(congress, states));
  });

  it("sums to chamber composition after recompose", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const swing = { house: -12, senate: -3 };
    const recomposed = recompose(
      campaign.congress,
      swing,
      campaign.people,
      campaign.founding.nation,
      campaign.turn,
      campaign.states,
    );
    const packet: EffectPacket = {
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      narration: { summary: "midterm" },
      effects: [{ kind: "congress", set: recomposed.congress }, ...recomposed.delegationEffects],
    };
    const next = apply(campaign, packet);
    assertMatchesChambers(next);
    expect(next.congress.chambers.house.administration).toBe(
      campaign.congress.chambers.house.administration + swing.house,
    );
  });
});

describe("delegation disposition", () => {
  it("targets room disposition displaced by lean and marks", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const oh = campaign.states.OH!;
    const marks: readonly GrievanceMark[] = [
      {
        turn: 1,
        signature: "aid-withheld",
        weight: 0.8,
        valence: -1,
        decayRate: 0.06,
        reason: "Aid never arrived.",
      },
    ];
    const withMarks: StateRuntime = { ...oh, marks };
    const target = delegationTarget(campaign.congress, withMarks);
    const leanTerm = CAUCUS_TILT_STATE * administrationAlignment(oh.lean, campaign.congress);
    const expected = Math.max(
      0,
      Math.min(1, campaign.congress.disposition + leanTerm + GRIEVANCE_WEIGHT * grievanceReading(marks)),
    );
    expect(target).toBeCloseTo(Math.round(expected * 1000) / 1000, 5);
    expect(target).toBeLessThan(delegationTarget(campaign.congress, oh));
  });

  it("drifts one DELEGATION_DRIFT step and snaps within a step", () => {
    const bloc = {
      house: { seats: 10, administration: 6, opposition: 4, independent: 0 },
      senate: [
        { party: "democrat" as const, seatClass: 1 as const, disposition: 0.5 },
        { party: "republican" as const, seatClass: 2 as const, disposition: 0.5 },
      ] as const,
      disposition: 0.4,
    };
    expect(driftDelegation(bloc, 0.7).disposition).toBeCloseTo(0.4 + DELEGATION_DRIFT, 5);
    expect(driftDelegation({ ...bloc, disposition: 0.69 }, 0.7).disposition).toBe(0.7);
    expect(driftDelegation({ ...bloc, disposition: 0.7 }, 0.7)).toEqual({ ...bloc, disposition: 0.7 });
  });

  it("counts every vote identically with an empty or absent delegation table", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const congress = campaign.congress;
    const empty: Campaign["states"] = Object.fromEntries(
      STATE_IDS.map((id) => {
        const runtime = campaign.states[id]!;
        const { delegation: _drop, ...rest } = runtime;
        return [id, rest];
      }),
    ) as Campaign["states"];

    for (const chamber of ["house", "senate"] as const) {
      const without = chamberDisposition(congress, chamber, undefined, campaign.people);
      const absent = chamberDisposition(congress, chamber, undefined, campaign.people);
      const emptyTable = chamberDisposition(congress, chamber, empty, campaign.people);
      expect(absent).toBe(without);
      expect(emptyTable).toBe(without);

      const required = majorityOf(congress.chambers[chamber].seats);
      const voteBare = countVote(congress, chamber, 0, required);
      const voteAbsent = countVote(congress, chamber, 0, required, undefined);
      const voteEmpty = countVote(congress, chamber, 0, required, empty);
      expect(voteAbsent).toEqual(voteBare);
      expect(voteEmpty).toEqual(voteBare);
    }
  });

  it("moves the chamber reading when blocs diverge from the room", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const room = campaign.congress.disposition;
    const leadershipOnly = chamberDisposition(campaign.congress, "house", undefined, campaign.people);
    const hostile = Object.fromEntries(
      STATE_IDS.map((id) => {
        const runtime = campaign.states[id]!;
        const delegation = runtime.delegation!;
        return [id, { ...runtime, delegation: { ...delegation, disposition: 0 } }];
      }),
    ) as Campaign["states"];
    const warm = Object.fromEntries(
      STATE_IDS.map((id) => {
        const runtime = campaign.states[id]!;
        const delegation = runtime.delegation!;
        return [id, { ...runtime, delegation: { ...delegation, disposition: 1 } }];
      }),
    ) as Campaign["states"];

    const cold = chamberDisposition(campaign.congress, "house", hostile, campaign.people);
    const hot = chamberDisposition(campaign.congress, "house", warm, campaign.people);
    expect(cold).toBeLessThan(leadershipOnly);
    expect(hot).toBeGreaterThan(leadershipOnly);
    // Third term is a displacement on the room, scaled by DELEGATION_LEVERAGE.
    expect(cold).toBeCloseTo(
      Math.max(0, Math.min(1, leadershipOnly + DELEGATION_LEVERAGE * (0 - room))),
      2,
    );
    expect(hot).toBeCloseTo(
      Math.max(0, Math.min(1, leadershipOnly + DELEGATION_LEVERAGE * (1 - room))),
      2,
    );
  });
});
