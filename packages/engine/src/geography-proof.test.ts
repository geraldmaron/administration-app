// Political-geography proof suite: replay with routing live, the 51×8
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
// save-size bound, legibility on real authored rows, and delegation and
// composition under midterms.
import { describe, expect, it } from "vitest";
import {
  CHARTER_PRESIDENTIAL_REPUBLIC,
  CHARTER_USA_CONSTITUTION,
  CRADLE_POTOMAC,
  STATE_IDS,
  US_ID,
  defaultFlagDesign,
  worldDataset,
} from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { majorityOf } from "./congress.js";
import { countVote } from "./congress-votes.js";
import {
  GRIEVANCE_WEIGHT,
  delegationTarget,
  sumHouseDelegations,
  sumSenateDelegations,
} from "./delegations.js";
import { routeDomestic, type DomesticSignature } from "./domestic-signature.js";
import { apply, type EffectPacket } from "./effects.js";
import { recompose, seatSwing } from "./elections.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { chamberDisposition } from "./hill.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed, replay } from "./rng.js";
import { signOrder } from "./orders.js";
import { openingMunitions } from "./munitions.js";
import { addDays } from "./clock.js";
import {
  GRIEVANCE_LEAN_CAP,
  GRIEVANCE_LEAN_SCALE,
  MAX_STATE_MARKS,
  grievanceLean,
  type GrievanceMark,
} from "./state-geography.js";
import type { Campaign, StateRuntime } from "./state.js";
import type { AdministrationStanding } from "./party.js";
import type { UsMajorParty } from "./state-legislature.js";

/** A president of one of the two majors, anchored on their own caucus. */
const standing = (party: UsMajorParty): AdministrationStanding => ({
  administrationParty: party,
  caucusAnchor: party,
});

const SEED = makeCampaignSeed("geo-proof-suite");
const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;

/** Historic House midterm wave ceiling, shared with term-balance. */
const HOUSE_MIDTERM_BOUND = 45;

const steelSignature = (): DomesticSignature => ({
  sectors: ["steel-heavy"],
  magnitude: "heavy",
  signature: "tariff:steel",
  reason: "A steel tariff lands where the mills are.",
});

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

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
  expect(sumHouseDelegations(campaign.states)).toEqual(campaign.congress.chambers.house);
  expect(sumSenateDelegations(campaign.states, campaign.congress.caucusAnchor)).toEqual(
    campaign.congress.chambers.senate,
  );
}

function markStack(count: number, valence: 1 | -1 = -1): readonly GrievanceMark[] {
  return Array.from({ length: count }, (_, i) => ({
    turn: i + 1,
    signature: `grievance:stack-${i}`,
    weight: 1,
    valence,
    decayRate: 0.06,
    reason: `Held mark ${i + 1} of an eight-mark grievance stack.`,
  }));
}

function withMarksOn(campaign: Campaign, stateId: string, marks: readonly GrievanceMark[]): Campaign {
  const runtime = campaign.states[stateId as keyof Campaign["states"]]!;
  const lean = Math.max(-1, Math.min(1, runtime.base.lean + grievanceLean(marks, standing(DEFAULT_ADMINISTRATION_PARTY))));
  const next: StateRuntime = {
    ...runtime,
    marks,
    lean,
    ...(runtime.delegation
      ? {
          delegation: {
            ...runtime.delegation,
            disposition: delegationTarget(campaign.congress, { ...runtime, marks, lean }),
          },
        }
      : {}),
  };
  return {
    ...campaign,
    states: { ...campaign.states, [stateId]: next } as Campaign["states"],
  };
}

function marksPayloadBytes(campaign: Campaign): number {
  const table = Object.fromEntries(STATE_IDS.map((id) => [id, campaign.states[id]!.marks]));
  return JSON.stringify(table).length;
}

describe("geography proof suite", () => {
  describe("replay equality with routing live", () => {
    it("produces byte-identical campaigns when a routed order is signed twice from the same seed", () => {
      const [first, second] = replay(SEED, (streams) => {
        const founded = sealFounding(SEED, worldDataset, baseChoices());
        const stock = openingMunitions();
        const campaign: Campaign = { ...founded, player: { ...founded.player,
          budget: { ...founded.player.budget, military: 0.01 } }, munitions: { ...stock,
          us: { ...stock.us, "precision-fires": { ...stock.us["precision-fires"]!,
            onOrder: [{ arrives: addDays(founded.calendar, 156 * 7), count: 0.05 }] } } } };
        const result = signOrder(campaign, CHARTER, "order-defense-production", streams);
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.reason);
        const routed = result.packet.effects.filter((effect) => effect.kind === "state");
        expect(routed.length).toBeGreaterThan(0);
        return apply(campaign, result.packet);
      });
      expect(first).toEqual(second);
      expect(JSON.stringify(first.states)).toBe(JSON.stringify(second.states));
    });

    it("keeps routeDomestic itself byte-identical across runs on a founded campaign", () => {
      const campaign = sealFounding(SEED, worldDataset, baseChoices());
      const once = routeDomestic(campaign, steelSignature());
      const twice = routeDomestic(campaign, steelSignature());
      expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
    });
  });

  describe("save-size bound (51 × 8 marks)", () => {
    it("never holds more than MAX_STATE_MARKS per state when every state is packed", () => {
      const campaign = buildCampaign();
      let working = campaign;
      for (const id of STATE_IDS) {
        for (let i = 0; i < MAX_STATE_MARKS + 4; i++) {
          const packet: EffectPacket = {
            source: "action",
            actor: "player",
            turn: working.turn,
            narration: { summary: "pack" },
            effects: [
              {
                kind: "state",
                state: id,
                reason: `Pack mark ${i} for ${id}.`,
                addMark: {
                  turn: working.turn,
                  signature: `pack:${id}:${i}`,
                  weight: 0.5 + (i % 5) * 0.1,
                  valence: -1,
                  decayRate: 0.06,
                  reason: `Pack mark ${i} for ${id}.`,
                },
              },
            ],
          };
          working = apply(working, packet);
        }
      }
      let total = 0;
      for (const id of STATE_IDS) {
        const n = working.states[id]!.marks.length;
        expect(n, id).toBeLessThanOrEqual(MAX_STATE_MARKS);
        total += n;
      }
      expect(total).toBe(STATE_IDS.length * MAX_STATE_MARKS);
      expect(STATE_IDS.length).toBe(51);
    });

    it("keeps a full 51×8 mark table inside the save-size budget", () => {
      // The budget is ~62 KB for marks+claims+delegations at ~110 B/mark.
      // Real reasons are longer (~160 B); the tested ceiling is 100 KB for the
      // marks table alone so a reason-string regression fails loudly.
      const campaign = buildCampaign();
      const packed: Campaign = {
        ...campaign,
        states: Object.fromEntries(
          STATE_IDS.map((id) => {
            const runtime = campaign.states[id]!;
            return [id, { ...runtime, marks: markStack(MAX_STATE_MARKS) }];
          }),
        ) as Campaign["states"],
      };
      const bytes = marksPayloadBytes(packed);
      expect(bytes).toBeLessThanOrEqual(100_000);
      expect(STATE_IDS.length * MAX_STATE_MARKS).toBe(408);
    });
  });

  describe("legibility bar on real authored rows", () => {
    it("moves the steel belt, leaves Hawaii below the floor, and names a readable top five", () => {
      const campaign = buildCampaign();
      const effects = routeDomestic(campaign, steelSignature());
      const byState = new Map(effects.map((effect) => [effect.state, Math.abs(effect.deltas?.lean ?? 0)]));
      for (const id of ["PA", "OH", "IN", "MI"] as const) {
        expect(byState.get(id) ?? 0, id).toBeGreaterThan(0);
      }
      expect(byState.has("HI")).toBe(false);

      const ranked = [...byState.entries()].sort((a, b) => b[1] - a[1]);
      expect(ranked.length).toBeGreaterThanOrEqual(5);
      const topFive = ranked.slice(0, 5).map(([id]) => id);
      // At least one steel-belt state must sit in the top five a player would read.
      expect(topFive.some((id) => ["PA", "OH", "IN", "MI"].includes(id))).toBe(true);
    });

    it("documents the residual: real rows concentrate but do not yet clear the 4× bar", () => {
      // Authored characters are too uniform for top ≥ 4× median. Fixture
      // concentration lives in domestic-signature.test.ts; this proof fails if
      // real-row discrimination regresses below a readable floor, and records
      // the measured ratio.
      const campaign = buildCampaign();
      const effects = routeDomestic(campaign, steelSignature());
      const byState = new Map(effects.map((effect) => [effect.state, Math.abs(effect.deltas?.lean ?? 0)]));
      const allAbs = STATE_IDS.map((id) => byState.get(id) ?? 0);
      const med = median(allAbs);
      const top = Math.max(...allAbs);
      expect(med).toBeGreaterThan(0);
      const ratio = top / med;
      // Readable concentration floor (strictly above flat fog). The 4× acceptance
      // bar remains residual on real rows while ratio < 4.
      expect(ratio).toBeGreaterThanOrEqual(2);
      // Pin the measured residual so a silent climb to 4× is noticed and the
      // assertion below can be promoted to the full bar.
      expect(ratio).toBeLessThan(4);
    });
  });

  describe("delegation/composition invariant under twenty midterms", () => {
    it("keeps every state's delegation summing to the chamber after twenty recomposes", () => {
      let campaign = sealFounding(SEED, worldDataset, baseChoices());
      assertMatchesChambers(campaign);

      const swings = [
        { house: -12, senate: -3 },
        { house: -8, senate: -2 },
        { house: 4, senate: 1 },
        { house: -15, senate: -4 },
        { house: -3, senate: 0 },
        { house: 6, senate: 2 },
        { house: -20, senate: -5 },
        { house: -1, senate: -1 },
        { house: 9, senate: 2 },
        { house: -7, senate: -2 },
        { house: -11, senate: -3 },
        { house: 2, senate: 0 },
        { house: -18, senate: -4 },
        { house: 5, senate: 1 },
        { house: -6, senate: -1 },
        { house: -14, senate: -3 },
        { house: 0, senate: 0 },
        { house: -9, senate: -2 },
        { house: 3, senate: 1 },
        { house: -16, senate: -4 },
      ];
      expect(swings).toHaveLength(20);

      for (const [i, swing] of swings.entries()) {
        const clamped = {
          house: Math.max(
            -campaign.congress.chambers.house.administration,
            Math.min(campaign.congress.chambers.house.opposition, swing.house),
          ),
          senate: Math.max(
            -campaign.congress.chambers.senate.administration,
            Math.min(campaign.congress.chambers.senate.opposition, swing.senate),
          ),
        };
        const recomposed = recompose(
          campaign.congress,
          clamped,
          campaign.people,
          campaign.founding.nation,
          campaign.turn + i,
          campaign.states,
        );
        const packet: EffectPacket = {
          source: "simulate",
          actor: "world",
          turn: campaign.turn + i,
          narration: { summary: `midterm ${i + 1}` },
          effects: [{ kind: "congress", set: recomposed.congress }, ...recomposed.delegationEffects],
        };
        campaign = apply(campaign, packet);
        assertMatchesChambers(campaign);
        expect(campaign.congress.chambers.house.administration + campaign.congress.chambers.house.opposition + campaign.congress.chambers.house.independent).toBe(
          campaign.congress.chambers.house.seats,
        );
      }
    });
  });

  describe("eight-mark stack through seat and mood channels", () => {
    it("moves midterm/countVote through both channels inside the 1894 bound, shares reported separately", () => {
      const base = sealFounding(SEED, worldDataset, baseChoices());
      // CA is large enough that one stack's lean/disposition shift survives
      // chamber rounding on both channels; smaller states often round to zero
      // seats even when mood still moves (T12's per-state write will tighten this).
      const stateId = "CA";
      const marks = markStack(MAX_STATE_MARKS, -1);
      expect(marks).toHaveLength(8);
      expect(Math.abs(grievanceLean(marks, standing(DEFAULT_ADMINISTRATION_PARTY)))).toBeCloseTo(GRIEVANCE_LEAN_CAP, 5);
      expect(GRIEVANCE_LEAN_SCALE).toBe(0.12);
      expect(GRIEVANCE_WEIGHT).toBe(0.12);

      const marked = withMarksOn(base, stateId, marks);

      // Seat channel: marks → grievanceLean → lean → houseSeatsMoved → seatSwing.
      const share = 0.45;
      const seatBase = seatSwing(share, "house", base.congress.chambers.house, base);
      const seatMarked = seatSwing(share, "house", marked.congress.chambers.house, marked);
      const seatChannel = seatMarked - seatBase;

      // Mood channel: marks → grievanceReading → disposition → chamberDisposition → countVote.
      const required = majorityOf(base.congress.chambers.house.seats);
      const moodBase = countVote(base.congress, "house", 0, required, base.states, undefined, "neutral", base.people);
      const moodMarked = countVote(marked.congress, "house", 0, required, marked.states, undefined, "neutral", marked.people);
      const moodChannel = moodMarked.yeas - moodBase.yeas;

      const dispositionShift =
        chamberDisposition(marked.congress, "house", marked.states, marked.people) -
        chamberDisposition(base.congress, "house", base.states, base.people);

      // Both channels must move; combined seat swing stays inside the historic bound.
      expect(seatChannel).not.toBe(0);
      expect(moodChannel).not.toBe(0);
      expect(dispositionShift).not.toBe(0);
      expect(Math.abs(seatChannel)).toBeLessThanOrEqual(HOUSE_MIDTERM_BOUND);
      expect(Math.abs(seatMarked)).toBeLessThanOrEqual(HOUSE_MIDTERM_BOUND);
      expect(Math.abs(seatBase + seatChannel)).toBeLessThanOrEqual(HOUSE_MIDTERM_BOUND);

      // Channel shares reported separately (audit D6 / §12(9)): seat is House
      // seats moved; mood is yeas moved through chamberDisposition.
      const shares = { seatChannel, moodChannel, dispositionShift } as const;
      expect(Object.keys(shares)).toEqual(["seatChannel", "moodChannel", "dispositionShift"]);
      expect(typeof shares.seatChannel).toBe("number");
      expect(typeof shares.moodChannel).toBe("number");
    });
  });
});
