import { describe, expect, it } from "vitest";
import {
  COHORT_AXES,
  COHORT_IDS,
  cohortsOfAxis,
  STATE_ECONOMY_AXES,
} from "@admin/world";
import { MAX_TURN_POLARIZE, OPINION_DRIVERS, OPINION_WEIGHTS } from "./opinion.js";
import { apply } from "./effects.js";
import { advanceTurn, type TurnPhases } from "./turn-loop.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignPhaseSequence } from "./turn-phases.js";
import {
  COHORT_DISPERSION_POLARIZE,
  COHORT_MIN_SPREAD,
  COHORT_MOTIVATION,
  LENS_CENTERING_TOLERANCE,
  LENS_TILT_CAP,
  LENS_TILT_FLOOR,
  MAX_COHORT_STRAINS,
  OMISSION_DECAY,
  STRAIN_DECAY,
  STRAIN_SCALE,
  TURNOUT_CEILING,
  TURNOUT_FLOOR,
  cancelMatchingStrains,
  centeredStrain,
  cohortReading,
  cohortDispersionPolarizeAmount,
  cohortLens,
  cohortStrainDispersion,
  cohortSupport,
  cohortWeights,
  decayCohortStrains,
  demosPhase,
  motivationIds,
  nationalCohortShares,
  nationalShare,
  netStrain,
  openingCohorts,
  selectCohorts,
  reconcileCohortStrains,
  type CohortStrain,
  weakestCohort,
} from "./demos.js";

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

describe("COHORT_MOTIVATION", () => {
  it("covers every declared cohort exactly once", () => {
    expect(motivationIds()).toEqual([...COHORT_IDS]);
    expect(Object.keys(COHORT_MOTIVATION).sort()).toEqual([...COHORT_IDS].sort());
  });

  it("keeps every tilt entry inside Law 3 bounds", () => {
    for (const id of COHORT_IDS) {
      const { tilt } = COHORT_MOTIVATION[id];
      for (const driver of OPINION_DRIVERS) {
        expect(tilt[driver], `${id}.${driver}`).toBeGreaterThanOrEqual(LENS_TILT_FLOOR);
        expect(tilt[driver], `${id}.${driver}`).toBeLessThanOrEqual(LENS_TILT_CAP);
      }
    }
  });

  it("floors every spread at COHORT_MIN_SPREAD", () => {
    for (const id of COHORT_IDS) {
      expect(COHORT_MOTIVATION[id].spread, id).toBeGreaterThanOrEqual(COHORT_MIN_SPREAD);
      expect(COHORT_MOTIVATION[id].spread, id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps exposure a partition, programReliance/attention in range, turnout in bounds", () => {
    for (const id of COHORT_IDS) {
      const row = COHORT_MOTIVATION[id];
      const exposureSum = STATE_ECONOMY_AXES.reduce((sum, axis) => sum + row.exposure[axis], 0);
      expect(exposureSum, `${id}.exposure`).toBeCloseTo(1, 3);
      expect(row.programReliance).toBeGreaterThanOrEqual(0);
      expect(row.programReliance).toBeLessThanOrEqual(1);
      expect(row.attention).toBeGreaterThanOrEqual(0);
      expect(row.attention).toBeLessThanOrEqual(1);
      expect(row.baseTurnout).toBeGreaterThanOrEqual(TURNOUT_FLOOR);
      expect(row.baseTurnout).toBeLessThanOrEqual(TURNOUT_CEILING);
      expect(row.name.length).toBeGreaterThan(0);
    }
  });

  it("derives a normalized lens from OPINION_WEIGHTS ⊙ tilt", () => {
    for (const id of COHORT_IDS) {
      const lens = cohortLens(id);
      const total = OPINION_DRIVERS.reduce((sum, driver) => sum + lens[driver], 0);
      expect(total, id).toBeCloseTo(1, 10);
    }
  });

  it("holds cohort-lens-centered: share-weighted mean lens within tolerance of OPINION_WEIGHTS", () => {
    const campaign = buildCampaign();
    for (const axis of COHORT_AXES) {
      const mean = {} as Record<(typeof OPINION_DRIVERS)[number], number>;
      for (const driver of OPINION_DRIVERS) mean[driver] = 0;
      for (const cohort of cohortsOfAxis(axis)) {
        const share = nationalShare(campaign, cohort);
        const lens = cohortLens(cohort);
        for (const driver of OPINION_DRIVERS) {
          mean[driver] += share * lens[driver];
        }
      }
      for (const driver of OPINION_DRIVERS) {
        expect(Math.abs(mean[driver] - OPINION_WEIGHTS[driver]), `${axis}.${driver}`).toBeLessThanOrEqual(
          LENS_CENTERING_TOLERANCE,
        );
      }
    }
  });
});

describe("nationalCohortShares / netStrain / cohortSupport", () => {
  it("derives per-axis shares that sum to 1 and cover every cohort", () => {
    const shares = nationalCohortShares(buildCampaign());
    expect(Object.keys(shares).sort()).toEqual([...COHORT_IDS].sort());
    for (const axis of COHORT_AXES) {
      const sum = cohortsOfAxis(axis).reduce((acc, id) => acc + shares[id], 0);
      expect(sum, axis).toBeCloseTo(1, 4);
    }
  });

  it("drifts the age axis younger under positive growthRate as turns elapse", () => {
    const open = buildCampaign();
    const early = nationalCohortShares(open)["age-under-35"];
    const later = nationalCohortShares({ ...open, turn: 209 })["age-under-35"];
    expect(later).toBeGreaterThan(early);
  });

  it("sums weight × valence for netStrain", () => {
    expect(netStrain([])).toBe(0);
    expect(
      netStrain([
        { createdTurn: 1, cause: "a", weight: 0.4, valence: -1, decayRate: 0.06, reason: "hurt" },
        { createdTurn: 2, cause: "b", weight: 0.25, valence: 1, decayRate: 0.1, reason: "help" },
      ]),
    ).toBeCloseTo(-0.15, 10);
  });

  it("renormalizes salientWeights ⊙ tilt into cohortWeights", () => {
    const weights = cohortWeights(buildCampaign(), "public-and-uniformed");
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + weights[driver], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("holds boundary law 2: share-weighted strain term is exactly zero on every axis", () => {
    const base = buildCampaign();
    const packed = apply(
      base,
      {
        source: "action",
        actor: "player",
        turn: 1,
        narration: { summary: "uneven strain" },
        effects: [
          {
            kind: "cohort",
            cohort: "goods-producing",
            addStrain: {
              createdTurn: 1,
              cause: "plant-closed",
              weight: 0.8,
              valence: -1,
              decayRate: 0.06,
              reason: "the plant closed",
            },
            reason: "hurt goods",
          },
          {
            kind: "cohort",
            cohort: "professional-technical",
            addStrain: {
              createdTurn: 1,
              cause: "bonus",
              weight: 0.5,
              valence: 1,
              decayRate: 0.1,
              reason: "a grant landed",
            },
            reason: "help professionals",
          },
          {
            kind: "cohort",
            cohort: "age-under-35",
            addStrain: {
              createdTurn: 2,
              cause: "debt",
              weight: 0.6,
              valence: -1,
              decayRate: 0.06,
              reason: "loan costs",
            },
            reason: "hurt young",
          },
        ],
      },
    );
    const shares = nationalCohortShares(packed);
    for (const axis of COHORT_AXES) {
      const weighted = cohortsOfAxis(axis).reduce(
        (sum, cohort) => sum + shares[cohort] * STRAIN_SCALE * centeredStrain(packed, cohort),
        0,
      );
      expect(Math.abs(weighted), axis).toBeLessThan(1e-12);
    }
  });

  it("keeps empty strain at the lens reading for cohortSupport", () => {
    const campaign = buildCampaign();
    for (const id of COHORT_IDS) {
      expect(centeredStrain(campaign, id)).toBe(0);
      expect(cohortSupport(campaign, id)).toBeGreaterThanOrEqual(0);
      expect(cohortSupport(campaign, id)).toBeLessThanOrEqual(1);
    }
  });
});

describe("Campaign.cohorts / applyCohort", () => {
  const COHORT = "goods-producing" as const;

  const strain = (
    cause: string,
    weight: number,
    createdTurn: number,
    valence: 1 | -1 = -1,
  ): CohortStrain => ({
    createdTurn,
    cause,
    weight,
    valence,
    decayRate: 0.06,
    reason: `strain ${cause}`,
  });

  const packet = (effects: Parameters<typeof apply>[1]["effects"]) => ({
    source: "action" as const,
    actor: "player" as const,
    turn: 1,
    narration: { summary: "a cohort remembers" },
    effects,
  });

  it("seeds every cohort with an empty strain list at opening", () => {
    const opened = openingCohorts();
    expect(Object.keys(opened).sort()).toEqual([...COHORT_IDS].sort());
    for (const id of COHORT_IDS) {
      expect(opened[id]).toEqual([]);
    }
    expect(buildCampaign().cohorts).toEqual(opened);
  });

  it("appends a strain through a cohort effect", () => {
    const next = apply(
      buildCampaign(),
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("plant-closed", 0.5, 2), reason: "the plant closed" }]),
    );
    expect(next.cohorts[COHORT]).toEqual([strain("plant-closed", 0.5, 2)]);
  });

  it("evicts the lowest-weight strain once over MAX_COHORT_STRAINS", () => {
    const packed = Array.from({ length: MAX_COHORT_STRAINS }, (_, i) => strain(`keep-${i}`, 0.5, i));
    const seeded = apply(
      buildCampaign(),
      packet([{ kind: "cohort", cohort: COHORT, replaceStrains: packed, reason: "seed" }]),
    );
    const next = apply(
      seeded,
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("drop-me", 0.1, 9), reason: "a seventh" }]),
    );
    expect(next.cohorts[COHORT]).toHaveLength(MAX_COHORT_STRAINS);
    expect(next.cohorts[COHORT]!.map((s) => s.cause)).not.toContain("drop-me");
    expect(next.cohorts[COHORT]!.map((s) => s.cause)).toContain("keep-0");
  });

  it("breaks equal weight on lowest createdTurn", () => {
    const packed = [
      strain("early", 0.4, 1),
      strain("mid-a", 0.5, 2),
      strain("mid-b", 0.5, 3),
      strain("mid-c", 0.5, 4),
      strain("mid-d", 0.5, 5),
      strain("mid-e", 0.5, 6),
    ];
    const seeded = apply(
      buildCampaign(),
      packet([{ kind: "cohort", cohort: COHORT, replaceStrains: packed, reason: "seed" }]),
    );
    const next = apply(
      seeded,
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("new", 0.5, 7), reason: "a seventh" }]),
    );
    expect(next.cohorts[COHORT]!.map((s) => s.cause)).toEqual([
      "mid-a",
      "mid-b",
      "mid-c",
      "mid-d",
      "mid-e",
      "new",
    ]);
  });

  it("breaks equal weight and createdTurn on cause ascending", () => {
    const packed = [
      strain("alpha", 0.4, 3),
      strain("bravo", 0.4, 3),
      strain("keep-1", 0.5, 1),
      strain("keep-2", 0.5, 2),
      strain("keep-3", 0.5, 4),
      strain("keep-4", 0.5, 5),
    ];
    const seeded = apply(
      buildCampaign(),
      packet([{ kind: "cohort", cohort: COHORT, replaceStrains: packed, reason: "seed" }]),
    );
    const next = apply(
      seeded,
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("keep-5", 0.5, 6), reason: "a seventh" }]),
    );
    // alpha < bravo at equal weight and turn — alpha is dropped first.
    expect(next.cohorts[COHORT]!.map((s) => s.cause)).toEqual([
      "bravo",
      "keep-1",
      "keep-2",
      "keep-3",
      "keep-4",
      "keep-5",
    ]);
  });

  it("keeps append order after eviction, not resorted by priority", () => {
    const packed = Array.from({ length: MAX_COHORT_STRAINS }, (_, i) => strain(`keep-${i}`, i + 1, i));
    const seeded = apply(
      buildCampaign(),
      packet([{ kind: "cohort", cohort: COHORT, replaceStrains: packed, reason: "seed" }]),
    );
    const next = apply(
      seeded,
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("new", 5, 9), reason: "a seventh" }]),
    );
    expect(next.cohorts[COHORT]!.map((s) => s.cause)).toEqual([
      "keep-1",
      "keep-2",
      "keep-3",
      "keep-4",
      "keep-5",
      "new",
    ]);
  });

  it("evicts identically across two runs from the same writes", () => {
    const writes = Array.from({ length: 15 }, (_, i) => strain(`cause-${i}`, (i * 37) % 11, i));
    const run = (): readonly string[] =>
      writes
        .reduce(
          (acc, s) =>
            apply(acc, packet([{ kind: "cohort", cohort: COHORT, addStrain: s, reason: "a write" }])),
          buildCampaign(),
        )
        .cohorts[COHORT]!.map((s) => s.cause);
    expect(run()).toEqual(run());
  });

  it("does not touch PublicMood when writing cohort strain", () => {
    const before = buildCampaign();
    const next = apply(
      before,
      packet([{ kind: "cohort", cohort: COHORT, addStrain: strain("plant-closed", 0.8, 1), reason: "hurt" }]),
    );
    expect(next.player.opinion).toEqual(before.player.opinion);
    expect(next.player.metrics).toEqual(before.player.metrics);
  });
});

describe("demosPhase — cancellation, valence-split decay, polarization", () => {
  const COHORT = "goods-producing" as const;

  const strain = (
    cause: string,
    weight: number,
    createdTurn: number,
    valence: 1 | -1,
    decayRate: number,
  ): CohortStrain => ({
    createdTurn,
    cause,
    weight,
    valence,
    decayRate,
    reason: `strain ${cause}`,
  });

  const seed = (strains: readonly CohortStrain[]) =>
    apply(buildCampaign(), {
      source: "action",
      actor: "player",
      turn: 1,
      narration: { summary: "seed" },
      effects: [{ kind: "cohort", cohort: COHORT, replaceStrains: strains, reason: "seed" }],
    });

  it("decays harms slower than favors (asymmetric STRAIN_DECAY)", () => {
    expect(STRAIN_DECAY[-1]).toBe(0.06);
    expect(STRAIN_DECAY[1]).toBe(0.1);
    expect(OMISSION_DECAY).toBe(0.03);

    const harm = strain("plant-closed", 0.6, 1, -1, STRAIN_DECAY[-1]);
    const favor = strain("plant-reopened", 0.6, 1, 1, STRAIN_DECAY[1]);
    expect(decayCohortStrains([harm])[0]!.weight).toBeCloseTo(0.54, 6);
    expect(decayCohortStrains([favor])[0]!.weight).toBeCloseTo(0.5, 6);

    let harmWeight = 0.6;
    let favorWeight = 0.6;
    let harmTurns = 0;
    let favorTurns = 0;
    while (harmWeight > 0) {
      harmWeight = Math.max(0, round3(harmWeight - STRAIN_DECAY[-1]));
      harmTurns += 1;
    }
    while (favorWeight > 0) {
      favorWeight = Math.max(0, round3(favorWeight - STRAIN_DECAY[1]));
      favorTurns += 1;
    }
    expect(harmTurns).toBeGreaterThan(favorTurns);
  });

  it("cancels matching opposite causes before decay in the same pass", () => {
    const harm = strain("plant-closed", 0.4, 1, -1, STRAIN_DECAY[-1]);
    const remedy = strain("plant-closed", 0.25, 2, 1, STRAIN_DECAY[1]);
    const canceled = cancelMatchingStrains([harm, remedy]);
    expect(canceled).toHaveLength(1);
    expect(canceled[0]).toMatchObject({ cause: "plant-closed", valence: -1, weight: 0.15 });

    // After cancel (0.15 left) then decay at 0.06 → 0.09. Decay-first would
    // leave harm at 0.34 and favor at 0.15, then cancel to 0.19 — different.
    const reconciled = reconcileCohortStrains([harm, remedy]);
    expect(reconciled).toEqual([
      { ...harm, weight: round3(0.15 - STRAIN_DECAY[-1]) },
    ]);
    const decayFirstThenCancel = cancelMatchingStrains(decayCohortStrains([harm, remedy]));
    expect(decayFirstThenCancel[0]!.weight).not.toBe(reconciled[0]!.weight);
  });

  it("demosPhase writes replaceStrains after cancel-then-decay", () => {
    const seeded = seed([
      strain("plant-closed", 0.5, 1, -1, STRAIN_DECAY[-1]),
      strain("plant-closed", 0.2, 2, 1, STRAIN_DECAY[1]),
    ]);
    const packets = demosPhase(seeded);
    const cohortPacket = packets.find((packet) =>
      packet.effects.some((effect) => effect.kind === "cohort"),
    );
    expect(cohortPacket).toBeDefined();
    const effect = cohortPacket!.effects.find((entry) => entry.kind === "cohort");
    expect(effect).toMatchObject({
      kind: "cohort",
      cohort: COHORT,
      replaceStrains: [{ cause: "plant-closed", valence: -1, weight: round3(0.3 - STRAIN_DECAY[-1]) }],
    });
  });

  it("emits a polarize term from dispersion under MAX_TURN_POLARIZE", () => {
    const packed = seed([strain("plant-closed", 0.8, 1, -1, STRAIN_DECAY[-1])]);
    // Push opposite strain onto another work-axis cohort so centered terms diverge.
    const split = apply(packed, {
      source: "action",
      actor: "player",
      turn: 1,
      narration: { summary: "favor elsewhere" },
      effects: [
        {
          kind: "cohort",
          cohort: "professional-technical",
          addStrain: strain("tech-grant", 0.8, 1, 1, STRAIN_DECAY[1]),
          reason: "favor",
        },
      ],
    });
    expect(cohortStrainDispersion(split)).toBeGreaterThan(0);
    const amount = cohortDispersionPolarizeAmount(split);
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThanOrEqual(MAX_TURN_POLARIZE);
    expect(COHORT_DISPERSION_POLARIZE).toBeGreaterThan(0);

    const packets = demosPhase(split);
    const polarizePacket = packets.find((packet) =>
      packet.effects.some((effect) => effect.kind === "opinion" && "polarize" in effect && effect.polarize),
    );
    expect(polarizePacket?.effects[0]).toEqual({
      kind: "opinion",
      deltas: {},
      polarize: amount,
    });
  });

  it("advances through demosPhase alone and harms outlast favors", () => {
    const phases: TurnPhases = { simulate: demosPhase, select: () => [] };
    let harmState = seed([strain("hurt", 0.5, 1, -1, STRAIN_DECAY[-1])]);
    let favorState = seed([strain("helped", 0.5, 1, 1, STRAIN_DECAY[1])]);
    for (let i = 0; i < 6; i++) {
      harmState = advanceTurn(harmState, phases);
      favorState = advanceTurn(favorState, phases);
    }
    expect(harmState.cohorts[COHORT]!.length).toBe(1);
    expect(favorState.cohorts[COHORT]!.length).toBe(0);
  });
});

describe("demosPhase wiring order", () => {
  it("pins demosPhase strictly after opinionPhase and before removalPhase", () => {
    // Asserted on the sequence the runner actually walks rather than on the
    // text of turn-phases.ts, so the pin survives any rewriting of how that
    // list is spelled and still fails if the slot moves.
    const ids = campaignPhaseSequence(foundedForBalance("demos-order-seed").charter).map((phase) => phase.id);
    const opinion = ids.indexOf("opinionPhase");
    const demos = ids.indexOf("demosPhase");
    const removal = ids.indexOf("removalPhase");
    expect(opinion).toBeGreaterThan(-1);
    expect(demos).toBeGreaterThan(opinion);
    expect(removal).toBeGreaterThan(demos);
  });
});

describe("the read side: what a president can be told about who they hurt", () => {
  const cause = "order:price-controls";
  const reason = "Staple ceilings land hardest where the farms are.";

  function withStrain(): ReturnType<typeof buildCampaign> {
    const base = buildCampaign();
    return apply(base, {
      source: "action",
      actor: "player",
      turn: base.turn,
      narration: { summary: "Price controls are signed." },
      effects: [
        {
          kind: "cohort",
          cohort: "income-struggling",
          addStrain: {
            createdTurn: base.turn,
            cause,
            weight: 0.4,
            valence: -1,
            decayRate: STRAIN_DECAY[-1],
            reason,
          },
          reason,
        },
      ],
    });
  }

  it("gives every cell a standing, in declaration order, whatever has happened", () => {
    const standings = selectCohorts(buildCampaign());
    expect(standings.map((standing) => standing.cohort)).toEqual([...COHORT_IDS]);
    for (const standing of standings) {
      expect(standing.support).toBeGreaterThanOrEqual(0);
      expect(standing.support).toBeLessThanOrEqual(1);
      expect(standing.name.length).toBeGreaterThan(0);
    }
  });

  it("carries the same figures the derived readings produce, never a second copy", () => {
    const campaign = withStrain();
    const standing = selectCohorts(campaign).find((entry) => entry.cohort === "income-struggling")!;
    expect(standing.support).toBe(cohortSupport(campaign, "income-struggling"));
    expect(standing.displacement).toBeCloseTo(centeredStrain(campaign, "income-struggling"), 3);
    expect(standing.share).toBe(nationalShare(campaign, "income-struggling"));
  });

  it("says what a cell remembers in the sentence it was written with, never a slug or a figure", () => {
    const campaign = withStrain();
    const line = cohortReading(campaign, "income-struggling")!;
    expect(line).toContain("Struggling households");
    expect(line).toContain(reason);
    expect(line).not.toContain(cause);
    expect(line).not.toMatch(/[0-9]/);
  });

  it("has nothing to say about a cell that remembers nothing", () => {
    expect(cohortReading(buildCampaign(), "income-struggling")).toBeUndefined();
    expect(selectCohorts(buildCampaign()).every((standing) => standing.reading === undefined)).toBe(true);
  });

  it("names the cell this administration cost the most, and none before it has cost one anything", () => {
    expect(weakestCohort(buildCampaign())).toBeUndefined();
    expect(weakestCohort(withStrain())?.cohort).toBe("income-struggling");
  });

  it("separates two cells on the same axis once one of them has been hurt", () => {
    const campaign = withStrain();
    const hurt = cohortSupport(campaign, "income-struggling");
    const untouched = cohortSupport(campaign, "income-comfortable");
    expect(hurt).toBeLessThan(untouched);
  });
});
