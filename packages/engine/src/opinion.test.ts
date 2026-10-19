import { ERA_POLARIZATION, weeklyReversion } from "./polarization.js";
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { TREASURY_REFERENCE } from "./metrics.js";
import { apply } from "./effects.js";
import { selectDeliveryShortfall } from "./institutions.js";
import {
  approvalFor,
  applyMoodDeltas,
  heaviestCause,
  OPINION_DRIFT,
  OPINION_DRIVERS,
  OPINION_HALF_LIFE_TURNS,
  OPINION_WEIGHTS,
  SALIENCE_REASONS,
  opinionPhase,
  rawApproval,
  salientWeights,
  selectApproval,
  selectOpinionCauses,
  selectOpinionReading,
  selectSalience,
  economyHurts,
  ECONOMIC_PAIN,
  MATERIAL_DRAG,
  OPINION_WEEK_SUMMARY,
  type OpinionDriver,
} from "./opinion.js";
import { approvalMovement } from "./opinion-movement.js";
import { OPINION_CAUSE_LABELS, PRESS_COVERAGE_CAP, PRESS_COVERAGE_WEIGHT, opinionTargets, priceLevelScar, PRICE_LEVEL_WEIGHT } from "./opinion-causes.js";
import { foundedForBalance } from "./balance-harness.js";
import type { NationId } from "@admin/world";
import type { ActionRecord, Campaign, NationCondition, PublicMood } from "./state.js";

const evenMood: PublicMood = {
  security: 0.5,
  prosperity: 0.5,
  services: 0.5,
  integrity: 0.5,
  unity: 0.5,
  competence: 0.5,
  polarization: 0,
};

describe("opinion weights", () => {
  it("rests at a normalized set", () => {
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + OPINION_WEIGHTS[driver], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("stays normalized once the week has had its say", () => {
    const campaign = buildCampaign();
    const weights = salientWeights(campaign);
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + weights[driver], 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("makes services louder while a condition is live, and takes it from the others", () => {
    const campaign = buildCampaign();
    const before = salientWeights(campaign);
    const during = salientWeights({
      ...campaign,
      conditions: {
        live: {
          id: "live",
          nation: campaign.founding.nation,
          kind: "flood",
          severity: 0.6,
          startedTurn: 1,
          status: "active",
        },
      } as never,
    });
    expect(during.services).toBeGreaterThan(before.services);
    // Salience redistributes rather than inflates: something has to give, or
    // approval would climb whenever the country had a disaster.
    expect(during.prosperity).toBeLessThan(before.prosperity);
  });
});

describe("approval", () => {
  it("rises with the weighted judgment and stays a share", () => {
    const campaign = buildCampaign();
    const loved = { ...evenMood, security: 0.9, prosperity: 0.9, services: 0.9, integrity: 0.9, unity: 0.9, competence: 0.9, polarization: 1 };
    const hated = { ...evenMood, security: 0.1, prosperity: 0.1, services: 0.1, integrity: 0.1, unity: 0.1, competence: 0.1, polarization: 1 };
    expect(approvalFor(campaign, loved)).toBeGreaterThan(approvalFor(campaign, hated));
    expect(approvalFor(campaign, loved)).toBeLessThan(1);
    expect(approvalFor(campaign, hated)).toBeGreaterThan(0);
  });

  it("is held off both ends by a polarized country: the identifiers will not follow the record all the way", () => {
    const campaign = buildCampaign();
    const hated = { ...evenMood, security: 0.05, prosperity: 0.05, services: 0.05, integrity: 0.6, unity: 0.05, competence: 0.05 };
    expect(approvalFor(campaign, { ...hated, polarization: 1.2 })).toBeGreaterThan(approvalFor(campaign, { ...hated, polarization: 0.85 }));
  });

  it("reports raw judgment separately from what the polls would say", () => {
    const mood = { ...evenMood, prosperity: 0.9, polarization: 1 };
    expect(rawApproval(mood, OPINION_WEIGHTS)).not.toBeCloseTo(approvalFor(buildCampaign(), mood), 3);
  });
});

describe("mood movement", () => {
  it("moves a driver by the delta when nobody is locked in", () => {
    const moved = applyMoodDeltas(evenMood, { services: -0.1 });
    expect(moved.services).toBeCloseTo(0.4, 6);
  });

  it("moves a driver by the full delta however divided the country is", () => {
    expect(applyMoodDeltas({ ...evenMood, polarization: 1.2 }, { services: -0.1 }).services).toBeCloseTo(0.4, 6);
  });


  it("never leaves the 0..1 range", () => {
    expect(applyMoodDeltas(evenMood, { unity: -5 }).unity).toBe(0);
    expect(applyMoodDeltas(evenMood, { unity: 5 }).unity).toBe(1);
  });
});

describe("polarization", () => {
  it("reverts toward the era's anchor on a week that did not divide anybody", () => {
    const campaign = buildCampaign();
    const divided = { ...campaign, player: { ...campaign.player, opinion: { ...campaign.player.opinion, polarization: 1.2 } } };
    const after = opinionPhase(divided).reduce((state, packet) => apply(state, packet), divided);
    expect(after.player.opinion.polarization).toBeCloseTo(1.2 - weeklyReversion(1.2), 6);
  });

  it("reverts from below as well as from above", () => {
    const campaign = buildCampaign();
    const united = { ...campaign, player: { ...campaign.player, opinion: { ...opinionTargets(campaign), polarization: 0.9 } } };
    const after = opinionPhase(united).reduce((state, packet) => apply(state, packet), united);
    expect(after.player.opinion.polarization).toBeGreaterThan(0.9);
    expect(after.player.opinion.polarization).toBeLessThan(ERA_POLARIZATION);
  });

  it("does not let a divisive decision undo itself", () => {
    const campaign = buildCampaign();
    const after = apply(campaign, {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "a decision half the country would not forgive" },
      effects: [{ kind: "opinion", deltas: {}, polarize: -0.2 }],
    });
    expect(after.player.opinion.polarization).toBeGreaterThanOrEqual(campaign.player.opinion.polarization);
  });

  it("opens every founding at the era's anchor, whatever the nation's factionalism", () => {
    expect(buildCampaign().player.opinion.polarization).toBe(ERA_POLARIZATION);
  });
});

describe("what the country can currently see", () => {
  it("counts a chair nobody is sitting in against competence", () => {
    const campaign = buildCampaign();
    const staffed = opinionTargets(campaign).competence;
    const vacant = { ...campaign, player: { ...campaign.player, cabinet: {} } };
    expect(opinionTargets(vacant).competence).toBeLessThan(staffed);
  });

  it("still reads the treasury at the scale a real government holds one", () => {
    const campaign = buildCampaign();
    const at = (treasury: number) =>
      opinionTargets({ ...campaign, player: { ...campaign.player, metrics: { ...campaign.player.metrics, treasury } } })
        .services;
    // An opening federal reserve against the reference the term is already
    // calibrated on: if the term saturates below this, every government in the
    // game is judged as though money were no object.
    expect(at(TREASURY_REFERENCE)).toBeGreaterThan(at(0.7 * TREASURY_REFERENCE));
    expect(at(0.7 * TREASURY_REFERENCE)).toBeGreaterThan(at(0.2 * TREASURY_REFERENCE));
  });
});

describe("what the coverage is worth to the country", () => {
  const withStanding = (campaign: ReturnType<typeof buildCampaign>, standing: number) => ({
    ...campaign,
    press: { ...campaign.press, standing },
  });

  it("reaches integrity and competence, and only those two", () => {
    const campaign = buildCampaign();
    const friendly = opinionTargets(withStanding(campaign, 1));
    const hostile = opinionTargets(withStanding(campaign, 0));
    expect(hostile.integrity).toBeLessThan(friendly.integrity);
    expect(hostile.competence).toBeLessThan(friendly.competence);
    // Coverage is not a general penalty on the government: it cannot touch the
    // money, the army or the order at home.
    for (const driver of ["security", "prosperity", "services", "unity"] as const) {
      expect(hostile[driver]).toBeCloseTo(friendly[driver], 10);
    }
  });

  it("is neutral at a corps that has not made up its mind", () => {
    const campaign = buildCampaign();
    const neutral = opinionTargets(withStanding(campaign, 0.5));
    // The cap is signed both ways around 0.5, so a corps sitting exactly there
    // has to leave both judgments where the rest of the board put them.
    const scandals = 0;
    expect(neutral.integrity).toBeCloseTo(0.75 - scandals * 0.25, 10);
  });

  it("is capped in both directions, so no amount of coverage can carry a judgment on its own", () => {
    const campaign = buildCampaign();
    const neutral = opinionTargets(withStanding(campaign, 0.5));
    for (const standing of [0, 0.05, 0.2]) {
      const drop = neutral.integrity - opinionTargets(withStanding(campaign, standing)).integrity;
      expect(drop).toBeLessThanOrEqual(PRESS_COVERAGE_CAP + 1e-9);
    }
    // And the cap actually binds: the weight would carry a fully hostile corps
    // past it if nothing stopped it.
    expect(0.5 * PRESS_COVERAGE_WEIGHT).toBeGreaterThan(PRESS_COVERAGE_CAP);
    expect(neutral.integrity - opinionTargets(withStanding(campaign, 0)).integrity).toBeCloseTo(
      PRESS_COVERAGE_CAP,
      10,
    );
  });

  it("costs a term of hostile coverage single-digit approval points and no more", () => {
    const campaign = buildCampaign();
    const settled = (standing: number) => {
      const targets = opinionTargets(withStanding(campaign, standing));
      // What the country arrives at once the drift has run its course: the
      // judgments sit on their targets, which is the worst case the cap has to
      // hold.
      const mood = { ...campaign.player.opinion, ...targets };
      return approvalFor(campaign, mood);
    };
    const cost = settled(0.5) - settled(0);
    expect(cost).toBeGreaterThan(0.005);
    expect(cost).toBeLessThan(0.09);
  });

  it("is deterministic: the same standing always reads the same", () => {
    const campaign = buildCampaign();
    expect(opinionTargets(withStanding(campaign, 0.31))).toEqual(opinionTargets(withStanding(campaign, 0.31)));
  });
});

describe("the reading a surface renders", () => {
  it("names what the week has made louder", () => {
    const campaign = buildCampaign();
    const reading = selectOpinionReading(campaign);
    expect(reading).toHaveLength(OPINION_DRIVERS.length);
    expect(reading.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 6);
  });
});

describe("the wire into the headline", () => {
  it("moves approval when only the public has moved", () => {
    const campaign = buildCampaign();
    const before = campaign.player.metrics.approval;
    const after = apply(campaign, {
      source: "conversation",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "a week the country did not forgive" },
      effects: [{ kind: "opinion", deltas: { services: -0.3, competence: -0.3 } }],
    });
    expect(after.player.metrics.approval).toBeLessThan(before);
    expect(selectApproval(after)).toBeLessThan(selectApproval(campaign));
  });

});

describe("what a government that never staffs itself is judged on", () => {
  it("marks the administration down for delivery it has let go, and not at all for delivery it has kept", () => {
    const campaign = buildCampaign();
    const whole = {
      ...campaign,
      institutions: Object.fromEntries(
        Object.entries(campaign.institutions).map(([id, runtime]) => [id, { ...runtime, vacancy: false, vacantDays: 0 }]),
      ),
    };
    const hollow = {
      ...campaign,
      institutions: Object.fromEntries(
        Object.entries(campaign.institutions).map(([id, runtime]) => [
          id,
          { ...runtime, vacancy: true, vacantDays: 400 },
        ]),
      ),
    };

    const kept = opinionTargets(whole);
    const gone = opinionTargets(hollow);
    // A branch running as it was inherited owes nothing: this can only ever be
    // a drag, never a bonus, so the two drivers it touches are untouched here.
    expect(selectDeliveryShortfall(whole)).toBe(0);
    expect(gone.services).toBeLessThan(kept.services);
    expect(gone.competence).toBeLessThan(kept.competence);
    // And only those two. Delivery is not a general penalty on the government.
    expect(gone.security).toBeCloseTo(kept.security, 6);
    expect(gone.integrity).toBeCloseTo(kept.integrity, 6);
    expect(gone.prosperity).toBeCloseTo(kept.prosperity, 6);
    expect(gone.unity).toBeCloseTo(kept.unity, 6);
  });
});


describe("why a judgment is where it is", () => {
  // The finding this closes: every term of opinionTargets was invisible. The
  // player watched a judgment fall for a term and was given a definition and a
  // share of the week's approval, never a cause.
  const causesFor = (campaign: Campaign, driver: OpinionDriver) =>
    selectOpinionCauses(campaign).find((reading) => reading.driver === driver)!;

  it("adds up to the target it is explaining, for every judgment", () => {
    // The whole reason the terms are the model rather than a second reading
    // beside it: an accounting that did not close would show the player a
    // breakdown of a number they were never charged.
    const campaign = buildCampaign();
    const targets = opinionTargets(campaign);
    for (const driver of OPINION_DRIVERS) {
      const reading = causesFor(campaign, driver);
      const sum = reading.causes.reduce((total, cause) => total + cause.contribution, 0);
      expect(Math.max(0, Math.min(1, sum))).toBeCloseTo(targets[driver], 2);
      expect(reading.target).toBe(targets[driver]);
    }
  });

  it("names every term it reports", () => {
    // OPINION_CAUSE_LABELS is keyed on OpinionCauseKey, so a term added to the
    // model with no name for the player fails the typecheck. This holds the
    // runtime half: nothing is reported under a key with no copy.
    for (const reading of selectOpinionCauses(buildCampaign())) {
      for (const cause of reading.causes) {
        expect(OPINION_CAUSE_LABELS[cause.key]).toBeTruthy();
        expect(cause.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("names the cabinet's verdict abroad as a cause of competence", () => {
    // The measured failure: a cabinet defecting takes `standing` to the floor,
    // `competence` follows it down, and no surface mentioned either.
    const reading = causesFor(buildCampaign(), "competence");
    const standing = reading.causes.find((cause) => cause.key === "standing")!;
    expect(standing.contribution).toBeGreaterThan(0);
    expect(standing.detail).toMatch(/Other governments/);
  });

  it("states the gap to the target and how long the public takes to close it", () => {
    const campaign = buildCampaign();
    for (const reading of selectOpinionCauses(campaign)) {
      expect(reading.distance).toBeCloseTo(reading.target - reading.level, 9);
    }
    // Eleven weeks at the shipped drift rate, derived rather than stated.
    expect(OPINION_HALF_LIFE_TURNS).toBe(Math.round(Math.log(0.5) / Math.log(1 - OPINION_DRIFT)));
    expect(OPINION_HALF_LIFE_TURNS).toBeGreaterThan(1);
  });

  it("says what made a judgment loud, rather than only that it is", () => {
    const quiet = buildCampaign();
    expect(selectSalience(quiet)).not.toContain("scandalLive");
    const scandal = {
      ...quiet,
      player: { ...quiet.player, flags: { ...quiet.player.flags, "scandal:the-donors": true } },
    };
    expect(selectSalience(scandal)).toContain("scandalLive");
    expect(causesFor(scandal, "integrity").salience).toEqual(["scandalLive"]);
    expect(SALIENCE_REASONS.scandalLive).toBe("a scandal is running");
    // And a judgment the week is not about names nothing.
    expect(causesFor(scandal, "prosperity").salience).toEqual([]);
  });

  it("accounts for the end of the scale by name rather than silently", () => {
    const campaign = buildCampaign();
    const floored: Campaign = {
      ...campaign,
      player: {
        ...campaign.player,
        metrics: { ...campaign.player.metrics, militaryReadiness: 0, stability: 0, standing: 0 },
        cabinet: {},
      },
    };
    const reading = causesFor(floored, "competence");
    expect(reading.target).toBe(0);
    const bounded = reading.causes.find((cause) => cause.key === "bounded");
    expect(bounded).toBeDefined();
    expect(bounded!.contribution).toBeGreaterThan(0);
  });

  it("ranks the causes by size, and owes each judgment the one moving it rather than where it starts", () => {
    for (const reading of selectOpinionCauses(buildCampaign())) {
      const sizes = reading.causes.map((cause) => Math.abs(cause.contribution));
      expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
      const owed = heaviestCause(reading);
      if (owed) expect(reading.causes).toContain(owed);
    }
  });
});

describe("the public judges the economy it is living in", () => {
  const { campaign: FOUNDED } = foundedForBalance("opinion-live-economy");
  const USA = FOUNDED.founding.nation;
  const us = FOUNDED.nations[USA]!;

  const withEconomy = (campaign: Campaign, economy: Partial<typeof us.stats.economy>, politics = {}): Campaign => {
    const runtime = campaign.nations[USA]!;
    return {
      ...campaign,
      nations: {
        ...campaign.nations,
        [USA]: {
          ...runtime,
          stats: {
            ...runtime.stats,
            economy: { ...runtime.stats.economy, ...economy },
            politics: { ...runtime.stats.politics, ...politics },
          },
        },
      },
    };
  };

  /** A price shock, injected the way a crisis arrives: a condition opens and prices jump with it. */
  function shocked(points: number): Campaign {
    const condition: NationCondition = {
      id: `condition:inflation-shock:${USA}:${FOUNDED.turn}`,
      nation: USA,
      kind: "inflation-shock",
      scope: "nation",
      severity: 0.6,
      startedTurn: FOUNDED.turn,
      status: "active",
      beats: [{ turn: FOUNDED.turn, description: "Prices jump." }],
    };
    return apply(FOUNDED, {
      source: "simulate",
      actor: "world",
      turn: FOUNDED.turn,
      narration: { summary: "Prices jump." },
      effects: [
        { kind: "condition", set: condition },
        { kind: "nationStat", nation: USA, setStats: { economy: { inflation: us.stats.economy.inflation + points } } },
      ],
    });
  }

  it("lowers the prosperity target and makes the week about prices when inflation runs four points past the oath", () => {
    const shock = shocked(0.04);
    expect(opinionTargets(shock).prosperity).toBeLessThan(opinionTargets(FOUNDED).prosperity - 0.05);
    expect(selectSalience(FOUNDED)).not.toContain("economicPain");
    expect(selectSalience(shock)).toContain("economicPain");
    const prosperity = selectOpinionCauses(shock).find((reading) => reading.driver === "prosperity")!;
    expect(heaviestCause(prosperity)?.key).toBe("inflation");
    expect(OPINION_CAUSE_LABELS[heaviestCause(prosperity)!.key]).toBe("Prices");
  });

  it("does not make the week about prices for a rise the public has not yet felt as one", () => {
    expect(selectSalience(shocked(ECONOMIC_PAIN.inflation - 0.005))).not.toContain("economicPain");
  });

  // A country coming apart has a higher resting inflation, so a pain line
  // measured against the resting point would go quiet exactly as prices rose.
  it("measures the pain against where the term began, not against a resting point that moves with order", () => {
    const unravelling = withEconomy(
      FOUNDED,
      { inflation: us.stats.economy.inflation + ECONOMIC_PAIN.inflation + 0.002 },
      { regimeStability: us.stats.politics.regimeStability - 0.5 },
    );
    expect(selectSalience(unravelling)).toContain("economicPain");
  });

  it("never reads a country's own normal as pain, however hot it runs", () => {
    const argentina = FOUNDED.nations["ARG" as NationId]!.base.stats.economy;
    expect(argentina.inflation).toBeGreaterThan(1);
    expect(economyHurts(argentina, argentina)).toBe(false);
  });

  it("keeps charging prices that have already risen after inflation cools", () => {
    const scarred = withEconomy(FOUNDED, { costOfLiving: us.stats.economy.costOfLiving * 1.04 });
    expect(priceLevelScar(FOUNDED)).toBe(0);
    expect(priceLevelScar(scarred)).toBeCloseTo(0.04, 3);
    const prices = selectOpinionCauses(scarred)
      .find((reading) => reading.driver === "prosperity")!
      .causes.find((cause) => cause.key === "prices")!;
    expect(prices.contribution).toBeCloseTo(-0.04 * PRICE_LEVEL_WEIGHT, 3);
    expect(opinionTargets(scarred).prosperity).toBeLessThan(opinionTargets(FOUNDED).prosperity);
  });

  it("reads the insurgency the country is living with, not the one it was authored with", () => {
    const armed = {
      ...FOUNDED,
      nations: {
        ...FOUNDED.nations,
        [USA]: { ...us, stats: { ...us.stats, security: { ...us.stats.security, insurgencyPressure: 0.5 } } },
      },
    };
    expect(opinionTargets(armed).security).toBeLessThan(opinionTargets(FOUNDED).security - 0.1);
  });
});

describe("the one cause a judgment is owed", () => {
  const { campaign: FOUNDED } = foundedForBalance("opinion-heaviest");

  it("never names the resting base or the bounding line, and names nothing when nothing moves a judgment", () => {
    for (const reading of selectOpinionCauses(FOUNDED)) {
      const cause = heaviestCause(reading);
      expect(cause?.key, reading.driver).not.toBe("base");
      expect(cause?.key, reading.driver).not.toBe("bounded");
    }
    const still = selectOpinionCauses(FOUNDED).find((reading) => reading.driver === "integrity")!;
    expect(heaviestCause({ ...still, causes: still.causes.filter((cause) => cause.key === "base") })).toBeUndefined();
  });

  it("names the heaviest material drag, and what holds the judgment up when nothing drags it", () => {
    const wedged = { ...FOUNDED, player: { ...FOUNDED.player, opinion: { ...FOUNDED.player.opinion, polarization: 1.2 } } };
    const unity = selectOpinionCauses(wedged).find((reading) => reading.driver === "unity")!;
    expect(heaviestCause(unity)?.key).toBe("polarization");
    const calm = { ...unity, causes: unity.causes.map((cause) => (cause.key === "polarization" ? { ...cause, contribution: -MATERIAL_DRAG / 2 } : cause)) };
    expect(heaviestCause(calm)?.key).toBe("polarization");
  });
});

describe("what moved approval, and by which road", () => {
  const entry = (patch: Partial<ActionRecord>): ActionRecord => ({ turn: 3, actor: "world", description: "A week.", ...patch });

  it("shares the weighted movement among the judgments and the roads it came by", () => {
    const ledger: readonly ActionRecord[] = [
      entry({ turn: 1, description: OPINION_WEEK_SUMMARY, mood: { prosperity: -0.5 } }),
      entry({ description: OPINION_WEEK_SUMMARY, mood: { prosperity: -0.01, security: 0.01 } }),
      entry({ actor: "player", mood: { integrity: -0.02 } }),
      entry({ causal: { origin: "decision", eventId: "e:3:9", createdDate: { year: 2029, month: 2, day: 1 }, systems: ["platform"] }, mood: { integrity: 0.02 } }),
      entry({ mood: { services: -0.01, polarization: 0.3 } }),
    ];
    const moved = approvalMovement(ledger, 2);
    const weighted = 0.01 * OPINION_WEIGHTS.prosperity + 0.01 * OPINION_WEIGHTS.security + 0.04 * OPINION_WEIGHTS.integrity + 0.01 * OPINION_WEIGHTS.services;
    expect(moved.total).toBeCloseTo(weighted, 4);
    expect(moved.byDriver.integrity).toBeCloseTo((0.04 * OPINION_WEIGHTS.integrity) / weighted, 2);
    expect(moved.byPath.pledges).toBeCloseTo(moved.byPath.decisions, 3);
    expect(moved.byPath.drift + moved.byPath.decisions + moved.byPath.pledges + moved.byPath.world).toBeCloseTo(1, 2);
    expect(approvalMovement([], 1).total).toBe(0);
  });
});

describe("the public's weekly revision is marked as the world's bookkeeping", () => {
  it("marks the packet background, and applies to the same campaign, byte for byte, as the unmarked packet", () => {
    const base = buildCampaign();
    const divided = { ...base, player: { ...base.player, opinion: { ...base.player.opinion, polarization: 1.1 } } };
    const [packet] = opinionPhase(divided);
    expect(packet?.background).toBe(true);
    if (!packet) return;
    const { background: _mark, ...unmarked } = packet;
    const marked = apply(divided, packet);
    const plain = apply(divided, unmarked);
    const withoutMarks = (campaign: typeof marked) => ({ ...campaign, ledger: campaign.ledger.map(({ background: _b, ...entry }) => entry) });
    expect(JSON.stringify(withoutMarks(marked))).toBe(JSON.stringify(withoutMarks(plain)));
    expect(marked.ledger.map((entry) => entry.causal?.eventId)).toEqual(plain.ledger.map((entry) => entry.causal?.eventId));
  });
});
