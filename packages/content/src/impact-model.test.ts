import {
  advanceTurn,
  apply,
  campaignTurnPhases,
  commitReply,
  createRngStreams,
  MAX_TURN_POLARIZE,
  OPINION_WEIGHTS,
  type OpinionDriver,
  type OpinionEffect,
} from "@admin/engine";
import type { Nation } from "@admin/world";
import { describe, expect, it } from "vitest";
import { ScenarioImpact } from "./impact.js";
import {
  DIVISIVE_POLARIZATION,
  IMPACT_MODEL_VERSION,
  cohortEffects,
  resolveImpact,
  tollBandFor,
} from "./impact-model.js";
import { US_ID, worldDataset } from "@admin/world";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { sealedCampaign } from "./preview-board.js";
import { castScenario } from "./scenario-cast.js";
import { repairLegacyScenarioPrice } from "./scenario-corrections.js";
import type { ScenarioDef } from "./scenario.js";

// A large country and a small one, identical in every way that is not size.
// The whole reason bands exist is that one declaration has to be correct for
// both, so almost every test here is a comparison between the two.
// The real playable nation, resized. Taking the base from the shipped dataset
// rather than hand-building one keeps the test honest about the shape the model
// actually meets in production.
const base = worldDataset.nations.find((nation) => nation.playable)!;

const large: Nation = {
  ...base,
  stats: {
    ...base.stats,
    demography: { ...base.stats.demography, population: 340_000_000 },
    economy: { ...base.stats.economy, gdp: 27_000_000 },
  },
};
const small: Nation = {
  ...base,
  stats: {
    ...base.stats,
    demography: { ...base.stats.demography, population: 4_000_000 },
    economy: { ...base.stats.economy, gdp: 250_000 },
  },
};

const opinionOf = (effects: readonly { kind: string }[]) =>
  effects.find((effect) => effect.kind === "opinion") as OpinionEffect | undefined;
// A financial impact is booked as the President's own borrowing: an amount
// added to the stock, read back as the amount.
const debtCostOf = (effects: readonly { kind: string }[], _nation: Nation) => {
  const borrowed = effects.find((effect) => effect.kind === "choiceBorrowing") as { amount: number } | undefined;
  return borrowed?.amount;
};

describe("the schema's own refusals", () => {
  it("refuses a human toll with no agency", () => {
    const parsed = ScenarioImpact.safeParse({ human: { lives: "hundreds" } });
    expect(parsed.success).toBe(false);
  });

  it("accepts a toll that says whose fault it was", () => {
    expect(ScenarioImpact.safeParse({ human: { lives: "hundreds" }, agency: "our-doing" }).success).toBe(true);
  });

  it("does not demand agency of a decision that killed nobody", () => {
    expect(ScenarioImpact.safeParse({ financial: { scale: "supplemental" } }).success).toBe(true);
  });
});

describe("agency, not arithmetic", () => {
  const toll = { human: { lives: "hundreds" } } as const;

  it("costs more when the government did it than when it merely happened", () => {
    const ours = opinionOf(resolveImpact({ ...toll, agency: "our-doing" }, large))!;
    const watch = opinionOf(resolveImpact({ ...toll, agency: "on-our-watch" }, large))!;
    expect(ours.deltas.security!).toBeLessThan(watch.deltas.security!);
  });

  it("costs least when it was inherited", () => {
    const inherited = opinionOf(resolveImpact({ ...toll, agency: "inherited" }, large))!;
    const watch = opinionOf(resolveImpact({ ...toll, agency: "on-our-watch" }, large))!;
    expect(inherited.deltas.security!).toBeGreaterThan(watch.deltas.security!);
  });

  it("rallies the country when the harm was done to it", () => {
    const attacked = opinionOf(resolveImpact({ ...toll, agency: "acted-upon" }, large))!;
    expect(attacked.deltas.security!).toBeGreaterThan(0);
  });
});

describe("who bore it", () => {
  it("routes a toll on the services to competence and one on a group to unity", () => {
    const services = opinionOf(
      resolveImpact({ human: { lives: "hundreds", borneBy: "the-services" }, agency: "our-doing" }, large),
    )!;
    const group = opinionOf(
      resolveImpact({ human: { lives: "hundreds", borneBy: "one-group" }, agency: "our-doing" }, large),
    )!;
    expect(services.deltas.competence!).toBeLessThan(services.deltas.security!);
    expect(group.deltas.unity!).toBeLessThan(group.deltas.security!);
  });

  it("keeps harm abroad off the domestic security judgment", () => {
    const abroad = opinionOf(resolveImpact({ human: { lives: "thousands", borneBy: "abroad" }, agency: "our-doing" }, large))!;
    expect(abroad.deltas.security).toBeUndefined();
    expect(abroad.deltas.integrity!).toBeLessThan(0);
  });
});

describe("tolls saturate", () => {
  it("does not price a mass-casualty week as a hundred times a small one", () => {
    const dozens = opinionOf(resolveImpact({ human: { lives: "dozens" }, agency: "on-our-watch" }, large))!;
    const mass = opinionOf(resolveImpact({ human: { lives: "mass" }, agency: "on-our-watch" }, large))!;
    expect(mass.deltas.security!).toBeLessThan(dozens.deltas.security!);
    // The property is compression, not a cap: the tolls differ by a factor of
    // 1,250 and the judgment they produce differs by far less. A linear model
    // would reproduce the 1,250 and one catastrophic week would end a campaign
    // on its own.
    const tollRatio = 50_000 / 40;
    expect(mass.deltas.security! / dozens.deltas.security!).toBeLessThan(tollRatio / 10);
  });

  it("makes the same toll matter more in a smaller country", () => {
    const declaration = { human: { lives: "hundreds" }, agency: "our-doing" } as const;
    // The band names a count, so the prose is the same in both castings and the
    // country decides what the count is worth. Four hundred dead is a national
    // catastrophe in a country of four million and a bad week in one of three
    // hundred and forty.
    const inSmall = opinionOf(resolveImpact(declaration, small))!.deltas.security!;
    const inLarge = opinionOf(resolveImpact(declaration, large))!.deltas.security!;
    expect(inSmall).toBeLessThan(inLarge);
  });
});

// What a declared toll actually moves the headline approval figure by, in
// points, before polarization damping or compression. This is the reading the
// band system exists to control: an author writes "dozens" and has to be able
// to predict roughly what the country does about it.
function approvalPointsOf(impact: Parameters<typeof resolveImpact>[0], nation: Nation): number {
  const opinion = opinionOf(resolveImpact(impact, nation));
  if (!opinion) return 0;
  let move = 0;
  for (const [driver, delta] of Object.entries(opinion.deltas) as [OpinionDriver, number][]) {
    move += delta * OPINION_WEIGHTS[driver];
  }
  return -move * 100;
}

const TOLL_BANDS = ["isolated", "dozens", "hundreds", "thousands", "mass"] as const;

describe("a toll reads as a toll at the population the game ships with", () => {
  // The real playable nation at its real size, not the round-numbered `large`
  // above: the whole finding was that the curve was calibrated for a country
  // four million people large and never moved when the dataset did.
  const shipped = TOLL_BANDS.map((lives) => ({
    lives,
    points: approvalPointsOf({ human: { lives }, agency: "our-doing" }, base),
  }));

  it("costs more the more people it killed", () => {
    for (let i = 1; i < shipped.length; i += 1) {
      expect(shipped[i]!.points).toBeGreaterThan(shipped[i - 1]!.points);
    }
  });

  it("has no band that reads as nothing happening", () => {
    // A tenth of a point is inside the rounding of every figure the player is
    // shown. An isolated death by the administration's own doing has to clear
    // it or the prose is describing an event the model did not record.
    expect(shipped[0]!.points).toBeGreaterThan(0.15);
  });

  it("puts no two-order-of-magnitude cliff between neighboring bands", () => {
    for (let i = 1; i < shipped.length; i += 1) {
      const step = shipped[i]!.points / shipped[i - 1]!.points;
      expect(step).toBeGreaterThan(1.2);
      expect(step).toBeLessThan(100);
    }
  });

  // MED-1. The charge arrived declarable and unpriced: the effects table was
  // keyed on `string` and read through `?? {}`, so a cost with no row cost
  // nothing at all.
  it("prices the government's own conduct being in question, hardest on integrity and under emergency powers overall", () => {
    const conduct = approvalPointsOf({ institutional: ["conduct-in-question"] }, base);
    expect(conduct).toBeGreaterThan(0);
    // The heaviest single-driver charge in the table: spending legal authority
    // is what a hard week does, and being asked whether the act itself was
    // lawful is not.
    expect(conduct).toBeGreaterThan(approvalPointsOf({ institutional: ["legal-authority-spent"] }, base));
    expect(conduct).toBeGreaterThan(approvalPointsOf({ institutional: ["intelligence-source-burned"] }, base));
    // And under reaching for emergency powers, which costs unity as well:
    // the country argues about whether that was warranted, while a hearing about
    // conduct is one question about one administration — and the press channel,
    // not this table, carries the weeks that follow from it.
    expect(conduct).toBeLessThan(approvalPointsOf({ institutional: ["emergency-powers-invoked"] }, base));
  });

  it("prices forty dead above straining the civil service and above the credit for emergency money", () => {
    const dozens = shipped.find((band) => band.lives === "dozens")!.points;
    // Both of these are the highest-volume tags in the corpus, and both used to
    // outweigh a toll of forty by an order of magnitude.
    expect(dozens).toBeGreaterThan(-approvalPointsOf({ institutional: ["civil-service-strained"] }, base));
    expect(dozens).toBeGreaterThan(Math.abs(approvalPointsOf({ financial: { scale: "emergency" } }, base)));
  });
});

describe("the same declaration in a country the size of the old one", () => {
  it("saturates rather than exploding", () => {
    const declaration = { human: { lives: "mass" }, agency: "our-doing" } as const;
    const inSmall = approvalPointsOf(declaration, small);
    const inLarge = approvalPointsOf(declaration, large);
    expect(inSmall).toBeGreaterThan(inLarge);
    // The curve is bounded below one by construction, so no band in any country
    // can move approval past what a fully-felt toll moves it.
    const fullyFelt =
      (0.6 * 1.6 * 0.35 * OPINION_WEIGHTS.security + 0.4 * 1.6 * 0.35 * OPINION_WEIGHTS.competence) * 100;
    expect(inSmall).toBeLessThan(fullyFelt);
  });

  it("still reads a handful of deaths in a small country as a national event", () => {
    const declaration = { human: { lives: "isolated" }, agency: "our-doing" } as const;
    expect(approvalPointsOf(declaration, small)).toBeGreaterThan(approvalPointsOf(declaration, base) * 3);
  });
});

describe("money is priced against the economy that pays it", () => {
  it("charges another government the American anchor scaled by its output", () => {
    const declaration = { financial: { scale: "emergency" } } as const;
    const other = worldDataset.nations.find((nation) => nation.id !== US_ID && nation.stats.economy.gdp > 0)!;
    const us = worldDataset.nations.find((nation) => nation.id === US_ID)!;
    const ratio = debtCostOf(resolveImpact(declaration, other), other)! / debtCostOf(resolveImpact(declaration, us), us)!;
    expect(ratio).toBeCloseTo((other.stats.economy.gdp * other.stats.economy.costOfLiving) / (us.stats.economy.gdp * us.stats.economy.costOfLiving), 6);
  });

  it("reads a band's size from the sourced anchor for the week's severity, not a share of output", () => {
    const us = worldDataset.nations.find((nation) => nation.id === US_ID)!;
    const at = (severity: "routine" | "serious" | "critical") =>
      debtCostOf(resolveImpact({ financial: { scale: "supplemental" } }, us, undefined, undefined, undefined, { severity }), us)! / us.stats.economy.costOfLiving;
    // Flint's lead response, Zika and Harvey's first supplemental, in 2026 dollars.
    expect(at("routine")).toBeCloseTo(234.9, 0);
    expect(at("serious")).toBeCloseTo(1531.2, 0);
    expect(at("critical")).toBeCloseTo(20634, -1);
  });

  it("prices the debt in today's dollars, as the stock it lands on is kept", () => {
    // Output is kept at the founding's prices and the debt at today's; after
    // prices have risen a fifth, the same share of output is a fifth more
    // dollars on the stock.
    const declaration = { financial: { scale: "emergency" } } as const;
    const later: Nation = { ...large, stats: { ...large.stats, economy: { ...large.stats.economy, costOfLiving: 1.2 } } };
    expect(debtCostOf(resolveImpact(declaration, later), later)!).toBeCloseTo(debtCostOf(resolveImpact(declaration, large), large)! * 1.2, 3);
  });

  it("books the borrowing as an amount, never as a level of the stock", () => {
    const effects = resolveImpact({ financial: { scale: "emergency" } }, large);
    expect(effects.some((effect) => effect.kind === "nationStat" && effect.setStats?.economy?.debt !== undefined)).toBe(false);
    const heavier: Nation = { ...large, stats: { ...large.stats, economy: { ...large.stats.economy, debt: large.stats.economy.debt * 2 } } };
    expect(debtCostOf(resolveImpact({ financial: { scale: "emergency" } }, heavier), heavier)).toBe(debtCostOf(effects, large));
  });

  it("makes a permanent commitment cost more than a one-off", () => {
    const once = debtCostOf(resolveImpact({ financial: { scale: "structural", horizon: "one-off" } }, large), large)!;
    const forever = debtCostOf(resolveImpact({ financial: { scale: "structural", horizon: "permanent" } }, large), large)!;
    expect(forever).toBeGreaterThan(once);
  });

  it("reads relief the public can see as delivery", () => {
    expect(opinionOf(resolveImpact({ financial: { scale: "emergency" } }, large))!.deltas.services!).toBeGreaterThan(0);
  });
});

describe("divisiveness", () => {
  it("only ever polarizes", () => {
    const divisive = opinionOf(resolveImpact({ divisive: true, financial: { scale: "discretionary" } }, large))!;
    expect(divisive.polarize!).toBeGreaterThan(0);
    expect(opinionOf(resolveImpact({ financial: { scale: "discretionary" } }, large) ?? [])?.polarize).toBeUndefined();
  });

  // A scenario decision resolves through `apply()` before `advanceTurn` runs,
  // so it never actually passes through the engine's joint per-turn
  // polarization ceiling — it is the highest-volume writer in the game and
  // structurally outside that cap's reach rather than governed by it. This
  // pins the two together so a future rebalance of either constant cannot
  // silently reopen the gap.
  it("never exceeds the engine's joint per-turn polarization ceiling", () => {
    expect(DIVISIVE_POLARIZATION).toBeLessThanOrEqual(MAX_TURN_POLARIZE);
  });
});

describe("the band an auditor would read out of the prose", () => {
  it("reads the words the way a writer used them", () => {
    expect(tollBandFor(2)).toBe("isolated");
    expect(tollBandFor(19)).toBe("dozens");
    expect(tollBandFor(310)).toBe("hundreds");
    expect(tollBandFor(6_000)).toBe("thousands");
    expect(tollBandFor(90_000)).toBe("mass");
  });

  it("says nothing happened when nothing did", () => {
    expect(tollBandFor(0)).toBe("none");
  });
});

describe("the model is versioned", () => {
  it("declares a version a pack can be balanced against", () => {
    expect(IMPACT_MODEL_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("broader scenario shapes", () => {
  it("stacks human toll, financial cost, and institutional strain without double-counting the debt into opinion", () => {
    const stacked = resolveImpact(
      {
        human: { lives: "hundreds", borneBy: "the-services" },
        agency: "our-doing",
        financial: { scale: "supplemental", horizon: "multi-year" },
        institutional: ["legislative-capital-spent", "legal-authority-spent"],
        divisive: true,
      },
      large,
    );
    const opinion = opinionOf(stacked)!;
    const debt = debtCostOf(stacked, large);
    expect(opinion.deltas.security!).toBeLessThan(0);
    expect(opinion.deltas.competence!).toBeLessThan(0);
    expect(opinion.polarize!).toBeGreaterThan(0);
    expect(debt).toBeGreaterThan(0);
    expect(stacked.some((effect) => effect.kind === "metric" && "treasury" in ((effect as { deltas?: object }).deltas ?? {}))).toBe(false);
  });

  it("keeps acted-upon tolls lighter than our-doing tolls across nation sizes", () => {
    const shape = { human: { lives: "thousands" }, agency: "acted-upon" } as const;
    const ours = opinionOf(resolveImpact({ ...shape, agency: "our-doing" }, large))!;
    const attackedLarge = opinionOf(resolveImpact(shape, large))!;
    const attackedSmall = opinionOf(resolveImpact(shape, small))!;
    expect(attackedLarge.deltas.security!).toBeGreaterThan(ours.deltas.security!);
    expect(attackedSmall.deltas.security!).toBeGreaterThan(0);
  });

  it("scales financial relief and structural cost in opposite directions by horizon", () => {
    const relief = opinionOf(resolveImpact({ financial: { scale: "emergency" } }, small))!;
    const structuralOnce = debtCostOf(resolveImpact({ financial: { scale: "structural", horizon: "one-off" } }, small), small)!;
    const structuralPermanent = debtCostOf(
      resolveImpact({ financial: { scale: "structural", horizon: "permanent" } }, small),
      small,
    )!;
    expect(relief.deltas.services!).toBeGreaterThan(0);
    expect(structuralPermanent!).toBeGreaterThan(structuralOnce!);
  });
});

describe("human.cohorts → CohortEffect", () => {
  it("accepts cohorts as an additive-optional field", () => {
    expect(
      ScenarioImpact.safeParse({
        human: { lives: "hundreds", borneBy: "one-group", cohorts: ["rural", "goods-producing"] },
        agency: "our-doing",
      }).success,
    ).toBe(true);
  });

  it("writes one CohortEffect per named cohort beside unchanged opinion routing", () => {
    const impact = {
      human: {
        lives: "hundreds" as const,
        borneBy: "one-group" as const,
        cohorts: ["rural" as const, "goods-producing" as const],
      },
      agency: "our-doing" as const,
    };
    const opinion = opinionOf(resolveImpact(impact, large))!;
    const cohorts = cohortEffects(impact, large, {
      turn: 4,
      cause: "hostage",
      reason: "The group that was named bore it.",
    });
    expect(opinion.deltas.unity!).toBeLessThan(0);
    expect(cohorts).toHaveLength(2);
    expect(cohorts.map((effect) => (effect.kind === "cohort" ? effect.cohort : "")).sort()).toEqual([
      "goods-producing",
      "rural",
    ]);
    for (const effect of cohorts) {
      if (effect.kind !== "cohort") throw new Error("expected cohort");
      expect(effect.addStrain?.valence).toBe(-1);
      expect(effect.addStrain?.cause).toBe("hostage");
      expect(effect.addStrain?.createdTurn).toBe(4);
      expect(effect.addStrain!.weight).toBeGreaterThan(0);
      expect(effect.addStrain!.weight).toBeLessThanOrEqual(1);
    }
  });

  it("emits nothing when cohorts are omitted so one-group keeps today's behavior", () => {
    const impact = {
      human: { lives: "hundreds" as const, borneBy: "one-group" as const },
      agency: "our-doing" as const,
    };
    expect(cohortEffects(impact, large, { turn: 1, cause: "hostage", reason: "unnamed" })).toEqual([]);
  });

  it("names a group without a death toll for direct strain", () => {
    const cohorts = cohortEffects(
      { human: { cohorts: ["goods-producing", "rural"] } },
      large,
      { turn: 5, cause: "water-scare:fresno", reason: "The catchment was shut." },
    );
    expect(cohorts).toHaveLength(2);
    expect(cohorts.every((effect) => effect.kind === "cohort" && effect.addStrain?.cause === "water-scare:fresno")).toBe(
      true,
    );
  });
});

describe("a reply that borrows, answered weeks after it was staged", () => {
  // The border fixture with a supplemental-sized impact on its first position
  // reply, so the reply borrows; everything else about it is the fixture's.
  const borrowing = (): ScenarioDef => {
    const def = FIXTURE_SCENARIOS.find((candidate) => candidate.id === "fixture-the-border-reading")!;
    const index = def.replies.findIndex((reply) => reply.commitment.kind === "position");
    const reply = def.replies[index]!;
    const commitment = { ...reply.commitment, impact: { financial: { scale: "emergency" as const } } };
    return { ...def, replies: def.replies.map((entry, at) => (at === index ? ({ ...reply, commitment } as typeof reply) : entry)) };
  };

  it("adds its borrowing to the stock as it stands when answered, never the stock it was staged on", () => {
    const def = borrowing();
    const replyId = def.replies.find((reply) => reply.commitment.kind === "position")!.id;
    const staged = sealedCampaign("reply-borrowing");
    const us = staged.founding.nation;
    const cast = castScenario(staged, def)!;
    const option = cast.script.options.find((candidate) => candidate.id === replyId)!;
    const answer = (campaign: typeof staged) => {
      const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
      if (!result.ok) throw new Error(`the reply was refused: ${result.missingCapability}`);
      return apply(campaign, result.packet);
    };
    // What the reply borrows, read as the stock it moves when answered the week it is staged.
    const amount = answer(staged).nations[us]!.stats.economy.debt - staged.nations[us]!.stats.economy.debt;
    expect(amount).toBeGreaterThan(0);

    const charter = worldDataset.charters.find((entry) => entry.id === staged.founding.charter)!;
    const phases = campaignTurnPhases(charter);
    let later = staged;
    for (let week = 0; week < 4; week += 1) later = advanceTurn(later, phases);
    const live = later.nations[us]!.stats.economy.debt;
    expect(live).not.toBe(staged.nations[us]!.stats.economy.debt);

    const answered = answer(later);
    expect(answered.nations[us]!.stats.economy.debt).toBe(live + amount);
    expect(answered.books![us]!.choiceDebt! - later.books![us]!.choiceDebt!).toBe(amount);
  });
});

describe("geographic financial scope", () => {
  it("prices a week confined to one city a severity down, since the anchors are national events", () => {
    const impact = { financial: { scale: "emergency" as const, horizon: "one-off" as const } };
    const cityCritical = resolveImpact({ financial: { ...impact.financial, scope: "city" } }, large, undefined, 1_000_000, undefined, { severity: "critical" })
      .find((effect) => effect.kind === "choiceBorrowing");
    const nationalSerious = resolveImpact(impact, large, undefined, undefined, undefined, { severity: "serious" }).find((effect) => effect.kind === "choiceBorrowing");
    expect(cityCritical?.kind === "choiceBorrowing" && nationalSerious?.kind === "choiceBorrowing").toBe(true);
    if (cityCritical?.kind === "choiceBorrowing" && nationalSerious?.kind === "choiceBorrowing") expect(cityCritical.amount).toBeCloseTo(nationalSerious.amount, 6);
  });
});


it("requires geography for city pricing and does not subtract an already reported toll again", () => {
  expect(() => resolveImpact({ financial: { scale: "emergency", scope: "city" } }, large)).toThrow("positive local population");
  const effects = resolveImpact({ human: { lives: "isolated", accounting: "already-reported" }, agency: "on-our-watch" }, large);
  expect(effects.some((effect) => effect.kind === "opinion")).toBe(true);
  expect(effects.some((effect) => effect.kind === "populationToll")).toBe(false);
});

it("charges a domestic authored toll to states as well as the nation through the next vital tick", () => {
  const campaign = sealedCampaign("authored-state-toll");
  const home = campaign.founding.nation;
  const runtime = campaign.nations[home]!;
  const nation = { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
  const total = (state: typeof campaign) => Object.values(state.states).reduce((sum, entry) => sum + entry.population, 0);
  const effects = resolveImpact({ human: { lives: "dozens" }, agency: "on-our-watch" }, nation);
  expect(effects.some((effect) => effect.kind === "populationToll")).toBe(true);
  const charged = apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A domestic toll is reported." }, effects });
  expect(total(charged)).toBeCloseTo(total(campaign) - 40, 5);
  expect(charged.nations[home]!.stats.demography.population).toBeCloseTo(total(charged), 5);
  const charter = worldDataset.charters.find((entry) => entry.id === campaign.founding.charter)!;
  const next = advanceTurn(charged, campaignTurnPhases(charter));
  expect(next.nations[home]!.stats.demography.population).toBeCloseTo(total(next), 5);

  // The same staged effects may be answered weeks later; the toll is charged
  // against that later stock rather than resetting it to the staging figure.
  let later = campaign;
  for (let week = 0; week < 4; week += 1) later = advanceTurn(later, campaignTurnPhases(charter));
  const lateAnswer = apply(later, { source: "action", actor: "player", turn: later.turn, narration: { summary: "The held toll is reported." }, effects });
  expect(total(lateAnswer)).toBeCloseTo(total(later) - 40, 5);
  expect(lateAnswer.nations[home]!.stats.demography.population).toBeCloseTo(total(lateAnswer), 5);

  const reported = resolveImpact({ human: { lives: "dozens", accounting: "already-reported" }, agency: "on-our-watch" }, nation);
  expect(reported.some((effect) => effect.kind === "populationToll")).toBe(false);
});

it("charges a known domestic location before spreading any overflow", () => {
  const campaign = sealedCampaign("authored-local-toll");
  const home = campaign.founding.nation;
  const runtime = campaign.nations[home]!;
  const nation = { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
  const place = Object.keys(campaign.states)[0] as keyof typeof campaign.states;
  const effects = resolveImpact({ human: { lives: "dozens" }, agency: "on-our-watch" }, nation, undefined, undefined, place);
  expect(effects.find((effect) => effect.kind === "populationToll")).toMatchObject({ nation: home, deaths: 40, place });
  const charged = apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A local toll is reported." }, effects });
  expect(charged.states[place]!.population).toBe(campaign.states[place]!.population - 40);
  expect(Object.keys(campaign.states).filter((id) => id !== place).every((id) => charged.states[id as keyof typeof campaign.states]!.population === campaign.states[id as keyof typeof campaign.states]!.population)).toBe(true);
});

it("removes a precompiled toll when repairing an already-reported legacy case", () => {
  const campaign = sealedCampaign("legacy-port-fire-toll");
  const fixture = FIXTURE_SCENARIOS.find((candidate) => candidate.id === "fixture-the-border-reading")!;
  const def: ScenarioDef = { ...fixture, id: "the-cargo-fire-at-dawn", locus: { ...fixture.locus, city: worldDataset.cities[0]!.id },
    replies: fixture.replies.map((reply) => reply.commitment.kind === "position"
      ? { ...reply, commitment: { ...reply.commitment,
        impact: { financial: { scale: "emergency" as const }, human: { lives: "dozens" as const }, agency: "on-our-watch" as const },
      } } : reply) };
  const cast = castScenario(campaign, def)!;
  expect(cast.script.options.some((option) => option.commitment.kind === "position" && option.commitment.resolved?.some((effect) => effect.kind === "populationToll"))).toBe(true);
  const repaired = repairLegacyScenarioPrice(campaign, cast);
  expect(repaired.script.options.every((option) => option.commitment.kind !== "position" || !option.commitment.resolved?.some((effect) => effect.kind === "populationToll"))).toBe(true);
});
