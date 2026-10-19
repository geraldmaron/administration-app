import { describe, expect, it } from "vitest";
import { Charter } from "@admin/world";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import {
  PRESS_HOSTILE_FLAG,
  PRESS_OUTLETS,
  PRESS_PLAYS,
  SILENCE_TOLERANCE_TURNS,
  openingPressCorps,
  pickOutletForFeedItem,
  corpsFrom,
  outletDisposition,
  outletSpreadAt,
  outletStance,
  outletTarget,
  pressDrivers,
  pressPhase,
  pressStandingTarget,
  projectPressAction,
  selectOutlets,
} from "./press.js";
import { issuePressAction, outstandingIssuedPressActs, resolveDuePress, resolveIssuedPress } from "./press-issued.js";
import { takePressAction } from "./__fixtures__/issued-acts.js";
import { outletReading, recentActPull } from "./press-beliefs.js";
import { placementOf } from "./press-placement.js";
import { FORMAT_PARTISANSHIP } from "./press-outlets.js";
import { apply } from "./effects.js";
import { likelihoodFromUnitInterval } from "./assessments.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import { composeArticle } from "./article.js";
import { PRESS_COVERAGE_CAP, opinionTargets } from "./opinion-causes.js";
import { usTicket } from "./party.js";
import { createRngStreams } from "./rng.js";
import type { Campaign, ExecutiveOrderRecord } from "./state.js";

const charter = Charter.parse({
  id: "charter-1",
  name: "The Constitution",
  removalMechanism: "impeachment",
  cabinetRoles: ["role-chancellor"],
  institutions: [{ name: "Congress", role: "Brings impeachment.", kind: "assembly" }],
  decisionConstraint: "Treaties require the Senate.",
  successionRule: "The Vice President serves out the term.",
  roleTitles: { "role-chancellor": "President" },
});

const struckOrder = (turn: number): ExecutiveOrderRecord => ({
  id: `order-emergency-construction:${turn}`,
  order: "order-emergency-construction",
  turn,
  contested: true,
  challengeChance: 0.8,
  review: { dueTurn: turn + 6, status: "struck-down", ruledTurn: turn + 6 },
});

const HOSTILE = "outlet-washington-chronicle";
const FRIENDLY = "outlet-american-review";

/** A corps sitting where a single-figure standing would have put its four desks. */
const corpsAt = (standing: number, base = buildCampaign().press) =>
  corpsFrom(base, outletSpreadAt(standing));

// The seeded "reliable miss" is keyed on the calendar day as well as the
// record, and the oath day happens to land it; two weeks on, it misses.
const onAMissingDay = () => withWeeksElapsed(buildCampaign(), 2);

const dispositionOf = (campaign: Campaign, outletId: string) =>
  selectOutlets(campaign).find((entry) => entry.outlet.id === outletId)!.disposition;

describe("the outlets", () => {
  it("is a spectrum rather than one voice", () => {
    const standings = selectOutlets(buildCampaign());
    expect(standings).toHaveLength(PRESS_OUTLETS.length);
    expect(standings[0]!.disposition).toBeLessThan(standings.at(-1)!.disposition);
    expect(new Set(standings.map((standing) => standing.stance)).size).toBeGreaterThan(1);
  });

  it("moves every outlet when the corps moves, without collapsing the spread", () => {
    const cold = selectOutlets({ ...buildCampaign(), press: corpsAt(0.2) });
    const warm = selectOutlets({ ...buildCampaign(), press: corpsAt(0.8) });
    for (const [index, standing] of cold.entries()) {
      expect(standing.disposition).toBeLessThan(warm[index]!.disposition);
    }
  });

  it("gives an article the same masthead the West Wing shows a disposition for", () => {
    const article = composeArticle({ turn: 4, kind: "press", visibility: "public", headline: "A week." });
    expect(PRESS_OUTLETS.some((outlet) => outlet.id === article.outletId && outlet.name === article.outlet)).toBe(true);
  });

  it("routes public dispatches to mastheads whose coverage includes the feed kind", () => {
    const operator = pickOutletForFeedItem({
      turn: 4,
      kind: "operator",
      visibility: "public",
      headline: "A covert lane opened.",
    });
    expect(operator?.coverage).toContain("operator");
    expect(PRESS_OUTLETS.some((outlet) => outlet.id === operator?.id)).toBe(true);
  });

  it("returns no masthead for intelligence reads", () => {
    expect(
      pickOutletForFeedItem({
        turn: 4,
        kind: "operator",
        visibility: "intelligence",
        headline: "A covert lane opened.",
      }),
    ).toBeUndefined();
  });

  it("names the stances a room can color", () => {
    expect(outletStance(0.1)).toBe("hostile");
    expect(outletStance(0.4)).toBe("skeptical");
    expect(outletStance(0.5)).toBe("neutral");
    expect(outletStance(0.9)).toBe("friendly");
  });
});

describe("what the corps reads", () => {
  it("hardens against a government whose orders the courts threw out", () => {
    const campaign = buildCampaign();
    const struck: Campaign = { ...campaign, orders: [struckOrder(2), struckOrder(9)] };
    expect(pressStandingTarget(struck)).toBeLessThan(pressStandingTarget(campaign));
  });

  it("hardens against force used without a vote", () => {
    const campaign = buildCampaign();
    const unilateral: Campaign = {
      ...campaign,
      congress: {
        ...campaign.congress,
        unauthorized: [
          { id: "unauthorized:ALP:3", target: campaign.founding.nation, turn: 3, rung: 5, description: "a strike" },
        ],
      },
    };
    expect(pressStandingTarget(unilateral)).toBeLessThan(pressStandingTarget(campaign));
  });

  it("counts silence, but not before the tolerance runs out", () => {
    const campaign = buildCampaign();
    const quiet = (turn: number): Campaign => ({ ...campaign, turn });
    const reason = "how long it has been since anyone answered a question";
    const driverAt = (turn: number) => pressDrivers(quiet(turn)).find((driver) => driver.reason === reason)!.delta;
    expect(driverAt(1 + SILENCE_TOLERANCE_TURNS)).toBe(0);
    expect(driverAt(1 + SILENCE_TOLERANCE_TURNS * 3)).toBeLessThan(0);
  });
});

describe("the week", () => {
  it("drifts toward the record rather than snapping to it", () => {
    const campaign: Campaign = {
      ...buildCampaign(),
      orders: [struckOrder(2), struckOrder(4), struckOrder(6)],
      press: corpsAt(0.9),
    };
    const after = pressPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
    expect(after.press.standing).toBeLessThan(0.9);
    expect(after.press.standing).toBeGreaterThan(pressStandingTarget(campaign));
  });

  it("names what turned the coverage rather than reporting a mood", () => {
    const campaign: Campaign = {
      ...buildCampaign(),
      orders: [struckOrder(2), struckOrder(4), struckOrder(6)],
      press: corpsAt(0.9),
    };
    const summary = pressPhase(campaign)[0]?.narration.summary ?? "";
    expect(summary).toMatch(/^The papers turned a little harder on the administration this week, mostly over /);
    expect(summary).toContain("orders the courts threw out");
  });

  it("reports the corps turning once rather than every week it stays turned", () => {
    let campaign: Campaign = {
      ...buildCampaign(),
      orders: [struckOrder(2), struckOrder(4)],
      press: corpsAt(0.15),
    };
    campaign = pressPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
    expect(campaign.player.flags[PRESS_HOSTILE_FLAG]).toBe(true);
    // The line the player reads says what it was about, in plain words.
    const coverage = campaign.feed.at(-1);
    expect(coverage?.headline).toContain("stopped giving this administration the benefit of the doubt");
    expect(coverage?.headline).toMatch(/What turned it is .+\./);
    const feedAfterFirst = campaign.feed.length;
    campaign = pressPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
    expect(campaign.feed).toHaveLength(feedAfterFirst);
  });
});

describe("spending on the press", () => {
  const streams = createRngStreams(buildCampaign().seed);

  it("prices the three plays differently rather than as one lever at three sizes", () => {
    const campaign = buildCampaign();
    const interview = projectPressAction(campaign, "interview", HOSTILE);
    const presser = projectPressAction(campaign, "press-conference");
    const leak = projectPressAction(campaign, "leak", HOSTILE);
    expect(presser.standingIfGood).toBeGreaterThan(interview.standingIfGood);
    expect(leak.standingIfBad).toBeLessThan(interview.standingIfBad);
    expect(interview.successChance).toBeGreaterThan(leak.successChance);
    expect(interview.forecast.likelihood).toBeTruthy();
    expect(["low", "moderate", "high"]).toContain(interview.forecast.confidence);
  });

  it("keeps likelihood and confidence as separate axes on the press forecast", () => {
    const campaign = buildCampaign();
    const projection = projectPressAction(campaign, "press-conference");
    expect(projection.forecast.likelihood).toBe(likelihoodFromUnitInterval(projection.successChance));
    expect(projection.forecast.confidenceBasis.length).toBeGreaterThan(0);
  });

  it("issues a pending engagement and resolves on the due date against the frozen chance", () => {
    const campaign = buildCampaign();
    const issued = issuePressAction(campaign, "press-conference");
    if (!issued.ok) throw new Error(issued.reason);
    const pending = apply(campaign, issued.packet);
    expect(outstandingIssuedPressActs(pending)).toHaveLength(1);
    expect(pending.press.engagements).toHaveLength(0);
    const tooSoon = resolveIssuedPress(pending, issued.act.id);
    expect(tooSoon.ok).toBe(false);
    const resolved = resolveDuePress({ ...pending, calendar: issued.act.dueDate });
    expect(resolved.packets).toHaveLength(1);
    expect(resolved.campaign.press.engagements).toHaveLength(1);
    const closed = resolved.campaign.issuedActs?.[issued.act.id];
    expect(closed?.status).toBe("resolved");
    expect(closed?.chance).toBe(issued.act.chance);
  });

  it("refuses a second authorization while one engagement is outstanding", () => {
    const campaign = buildCampaign();
    const first = issuePressAction(campaign, "interview", HOSTILE);
    if (!first.ok) throw new Error(first.reason);
    const pending = apply(campaign, first.packet);
    expect(issuePressAction(pending, "press-conference").ok).toBe(false);
  });

  it("rolls against exactly the number it showed", () => {
    const campaign = buildCampaign();
    const projection = projectPressAction(campaign, "interview", HOSTILE);
    const result = takePressAction(campaign, charter, "interview", streams, HOSTILE);
    if (!result.ok) throw new Error(result.reason);
    const expected = result.wentWell ? projection.standingIfGood : projection.standingIfBad;
    expect(apply(campaign, result.packet).press.standing).toBe(expected);
  });

  it("stops the silence clock for a podium and not for a leak", () => {
    const campaign: Campaign = { ...buildCampaign(), turn: 20 };
    const spoke = takePressAction(campaign, charter, "press-conference", streams);
    const leaked = takePressAction(campaign, charter, "leak", streams, FRIENDLY);
    if (!spoke.ok || !leaked.ok) throw new Error("both plays should be available");
    expect(apply(campaign, spoke.packet).press.lastSpokeTurn).toBe(20);
    expect(apply(campaign, leaked.packet).press.lastSpokeTurn).toBe(campaign.press.lastSpokeTurn);
  });

  it("refuses a second appearance in the same week", () => {
    const campaign = buildCampaign();
    const first = takePressAction(campaign, charter, "interview", streams, HOSTILE);
    if (!first.ok) throw new Error(first.reason);
    const again = takePressAction(apply(campaign, first.packet), charter, "press-conference", streams);
    expect(again.ok).toBe(false);
  });

  it("titles what it narrates from the charter rather than assuming a president", () => {
    const chancellery = Charter.parse({ ...charter, roleTitles: { "role-chancellor": "Chancellor" } });
    const result = takePressAction(buildCampaign(), chancellery, "interview", streams, HOSTILE);
    if (!result.ok) throw new Error(result.reason);
    expect(result.engagement.summary).toContain("Chancellor");
  });
});

describe("four mastheads rather than one number in four hats", () => {
  const streams = createRngStreams(buildCampaign().seed);

  it("moves the desk a play was with further than the desks it was not", () => {
    const campaign = buildCampaign();
    const before = selectOutlets(campaign);
    const result = takePressAction(campaign, charter, "interview", streams, HOSTILE);
    if (!result.ok) throw new Error(result.reason);
    const after = apply(campaign, result.packet);
    const movedBy = (id: string) => dispositionOf(after, id) - before.find((e) => e.outlet.id === id)!.disposition;
    expect(Math.abs(movedBy(HOSTILE))).toBeGreaterThan(Math.abs(movedBy(FRIENDLY)));
    // And the desks it was not with are not simply dragged along by the same
    // amount, which is exactly what the single-figure corps could only do.
    expect(movedBy(HOSTILE)).not.toBe(movedBy(FRIENDLY));
  });

  it("holds a press conference with the whole room and an interview with one desk", () => {
    expect(PRESS_PLAYS["press-conference"].targeting).toBe("corps");
    expect(PRESS_PLAYS.interview.targeting).toBe("outlet");
    expect(PRESS_PLAYS.leak.targeting).toBe("outlet");
    const campaign = buildCampaign();
    const podium = takePressAction(campaign, charter, "press-conference", streams);
    if (!podium.ok) throw new Error(podium.reason);
    const after = apply(campaign, podium.packet);
    const delta = (id: string) => dispositionOf(after, id) - dispositionOf(campaign, id);
    expect(delta(HOSTILE)).toBeCloseTo(delta(FRIENDLY), 6);
  });

  it("refuses an interview that is not with anybody", () => {
    const refused = takePressAction(buildCampaign(), charter, "interview", streams);
    expect(refused.ok).toBe(false);
    if (refused.ok) throw new Error("should have refused");
    expect(refused.reason).toContain("with somebody");
    expect(takePressAction(buildCampaign(), charter, "leak", streams, "outlet-nobody").ok).toBe(false);
  });

  it("lets a hostile desk be won round over a term without buying the other three", () => {
    // A record the corps reads well: a free press and coalitions behind the
    // administration, which is what puts even the adversarial daily's own
    // target above the hostile band.
    let campaign: Campaign = buildCampaign();
    const opening = dispositionOf(campaign, HOSTILE);
    expect(outletStance(opening)).toBe("hostile");
    const gapAtStart = dispositionOf(campaign, FRIENDLY) - opening;
    for (let week = 0; week < 40; week += 1) {
      const result = takePressAction(campaign, charter, "interview", streams, HOSTILE);
      if (result.ok) campaign = apply(campaign, result.packet);
      campaign = pressPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
      campaign = { ...campaign, turn: campaign.turn + 1 };
    }
    expect(dispositionOf(campaign, HOSTILE)).toBeGreaterThan(opening);
    expect(outletStance(dispositionOf(campaign, HOSTILE))).not.toBe("hostile");
    // Won, not bought: the spread narrowed rather than the whole corps sliding.
    expect(dispositionOf(campaign, FRIENDLY) - dispositionOf(campaign, HOSTILE)).toBeLessThan(gapAtStart);
  });

  it("lets the same week read differently at different desks", () => {
    const stances = new Set(selectOutlets(buildCampaign()).map((entry) => entry.stance));
    expect(stances.size).toBeGreaterThan(1);
    // And they are read out of four stored figures, not four offsets from one.
    const campaign = buildCampaign();
    const skewed: Campaign = {
      ...campaign,
      press: { ...campaign.press, dispositions: { ...campaign.press.dispositions, [HOSTILE]: 0.9 } },
    };
    expect(outletStance(dispositionOf(skewed, HOSTILE))).toBe("friendly");
    expect(dispositionOf(skewed, FRIENDLY)).toBe(dispositionOf(campaign, FRIENDLY));
  });

  it("gives every desk its own destination on the same shared record", () => {
    const campaign = buildCampaign();
    const targets = PRESS_OUTLETS.map((outlet) => outletTarget(campaign, outlet));
    expect(new Set(targets).size).toBe(PRESS_OUTLETS.length);
    // The shared drivers sit at the middle of the spread, which is what keeps
    // the aggregate a reading of the record rather than of the leans.
    expect(pressStandingTarget(campaign)).toBeGreaterThan(Math.min(...targets));
    expect(pressStandingTarget(campaign)).toBeLessThan(Math.max(...targets));
  });
});

describe("what a masthead makes of what was signed", () => {
  const signed = (order: string, turn: number): ExecutiveOrderRecord => ({
    id: `${order}:${turn}`,
    order,
    turn,
    contested: false,
    challengeChance: 0.1,
  });

  const withOrders = (orders: readonly ExecutiveOrderRecord[], turn = 20): Campaign => ({
    ...buildCampaign(),
    turn,
    orders: [...orders],
  });

  const targetOf = (campaign: Campaign, outletId: string) =>
    outletTarget(campaign, PRESS_OUTLETS.find((outlet) => outlet.id === outletId)!);

  it("delights one masthead and enrages another over the same order", () => {
    // A price and wage freeze says one thing and one thing only: the state sets
    // what a staple costs. The left daily is for that and the business weekly is
    // against it, and neither of them had a way to say so when an outlet's whole
    // worldview was a friendliness slider.
    const quiet = withOrders([]);
    const priced = withOrders([signed("order-price-controls", 18)]);
    expect(targetOf(priced, HOSTILE)).toBeGreaterThan(targetOf(quiet, HOSTILE));
    expect(targetOf(priced, FRIENDLY)).toBeLessThan(targetOf(quiet, FRIENDLY));

    // Signed, and not a rescaling of the lean: the desk that likes this order is
    // the one whose standing posture toward any president is hostile.
    const reads = selectOutlets(priced);
    const herald = reads.find((entry) => entry.outlet.id === HOSTILE)!;
    const review = reads.find((entry) => entry.outlet.id === FRIENDLY)!;
    expect(herald.read.reading).toBeGreaterThan(0);
    expect(review.read.reading).toBeLessThan(0);
    expect(herald.outlet.lean).toBeLessThan(review.outlet.lean);
    expect(herald.read.act?.name).toBe("Freeze prices and wages");
  });

  it("still stings every desk when the courts throw an order out", () => {
    // The belief term rearranges the corps; it does not replace the six drivers.
    // A struck-down order is a struck-down order at all four desks.
    const clean = withOrders([signed("order-price-controls", 18)]);
    const struck: Campaign = { ...clean, orders: [...clean.orders, struckOrder(14)] };
    for (const outlet of PRESS_OUTLETS) {
      expect(outletTarget(struck, outlet)).toBeLessThan(outletTarget(clean, outlet));
    }
  });

  it("leaves the aggregate exactly where the shared record puts it", () => {
    // The authored vectors sum to zero on every axis, so the four readings
    // cancel and the corps's standing — which the coalitions and the six
    // judgments read — is untouched by which desks are delighted.
    for (const axis of ["economicLeftRight", "authLibertarian", "nationalistGlobalist"] as const) {
      expect(PRESS_OUTLETS.reduce((total, outlet) => total + outlet.beliefs[axis], 0)).toBeCloseTo(0, 9);
    }
    const loud = withOrders([
      signed("order-price-controls", 18),
      signed("order-emergency-construction", 19),
      signed("order-border-controls", 20),
    ]);
    const { pull } = recentActPull(loud);
    expect(PRESS_OUTLETS.reduce((total, outlet) => total + outletReading(outlet.beliefs, pull), 0)).toBeCloseTo(0, 9);

    // Which is the same fact one level up: no desk on a rail, so the mean of the
    // four destinations is the destination the shared drivers name.
    const quiet = withOrders([signed("order-price-controls", 18)]);
    const targets = PRESS_OUTLETS.map((outlet) => outletTarget(quiet, outlet));
    expect(targets.every((target) => target > 0 && target < 1)).toBe(true);
    expect(targets.reduce((total, target) => total + target, 0) / targets.length).toBeCloseTo(
      pressStandingTarget(quiet),
      3,
    );
  });

  it("reads nothing at all off an administration that has signed nothing", () => {
    const quiet = withOrders([]);
    for (const entry of selectOutlets(quiet)) {
      expect(entry.read.reading).toBe(0);
      expect(entry.read.act).toBeUndefined();
      // What is left is the record, the paper's institutional lean, and who the
      // President is to its audience: nothing about acts the government never took.
      const partisan = outletReading(entry.outlet.beliefs, placementOf(quiet)) * FORMAT_PARTISANSHIP[entry.outlet.format];
      // Summed in the engine's order (the record around the middle, then each term), so a value on a half-thousandth rounds the same way.
      const total = (pressStandingTarget(quiet) - 0.5) + entry.outlet.lean * 0.35 + partisan;
      expect(entry.target).toBe(round3(Math.max(0, Math.min(1, 0.5 + total))));
    }
    // And an order the catalogue declares no alignment on is alignment-silent
    // rather than an invented pull.
    const older = withOrders([signed("order-price-controls", 1)], 40);
    expect(selectOutlets(older).every((entry) => entry.read.reading === 0)).toBe(true);
  });

  it("keeps the lean a reading of the beliefs rather than a second opinion of them", () => {
    for (const outlet of PRESS_OUTLETS) {
      expect(outlet.lean).toBe(outlet.beliefs.authLibertarian);
    }
  });
});

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

describe("the standing as an aggregate", () => {
  it("is the mean of the four desks, never a figure of its own", () => {
    const campaign = buildCampaign();
    const mean =
      PRESS_OUTLETS.reduce((total, outlet) => total + outletDisposition(campaign.press, outlet), 0) /
      PRESS_OUTLETS.length;
    expect(campaign.press.standing).toBeCloseTo(mean, 3);
  });

  it("stays the mean through a play and through a week", () => {
    const streams = createRngStreams(onAMissingDay().seed);
    const played = takePressAction(onAMissingDay(), charter, "leak", streams, FRIENDLY);
    if (!played.ok) throw new Error(played.reason);
    const states = [
      apply(onAMissingDay(), played.packet),
      pressPhase(onAMissingDay()).reduce((state, packet) => apply(state, packet), onAMissingDay()),
    ];
    for (const state of states) {
      const mean =
        PRESS_OUTLETS.reduce((total, outlet) => total + state.press.dispositions[outlet.id]!, 0) / PRESS_OUTLETS.length;
      expect(state.press.standing).toBeCloseTo(mean, 3);
    }
  });

  it("keeps the capped press term in the six judgments reading the same way", () => {
    const campaign = buildCampaign();
    const hostile = { ...campaign, press: corpsAt(0.05, campaign.press) };
    const warm = { ...campaign, press: corpsAt(0.95, campaign.press) };
    expect(opinionTargets(hostile).integrity).toBeLessThan(opinionTargets(campaign).integrity);
    expect(opinionTargets(warm).integrity).toBeGreaterThan(opinionTargets(campaign).integrity);
    // The cap is what keeps a press corps from being a second electorate, and
    // it is still reached from a standing rather than from any single desk.
    const worst = { ...campaign, press: corpsFromAll(0) };
    const best = { ...campaign, press: corpsFromAll(1) };
    const span = opinionTargets(best).integrity - opinionTargets(worst).integrity;
    expect(span).toBeCloseTo(PRESS_COVERAGE_CAP * 2, 6);
    // A corps that is unanimous at a rail is the widest the term can ever be,
    // and it is no wider than it was when the standing was authored directly.
    expect(opinionTargets(worst).integrity).toBe(opinionTargets({ ...campaign, press: corpsFromAll(0.2) }).integrity);
  });

  function corpsFromAll(value: number) {
    return {
      ...buildCampaign().press,
      standing: value,
      dispositions: Object.fromEntries(PRESS_OUTLETS.map((outlet) => [outlet.id, value])),
    };
  }
});

describe("the v41 save", () => {
  it("round-trips a corps that already has four minds", () => {
    const campaign = buildCampaign();
    const save = createSave(campaign);
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(67);
    expect(loadSave(JSON.parse(JSON.stringify(save))).press.dispositions).toEqual(campaign.press.dispositions);
  });
});

describe("what press standing is worth", () => {
  it("never writes the headline directly, and reaches it only through the public", () => {
    const campaign = buildCampaign();
    const hostile = { ...campaign, press: corpsAt(0.05, campaign.press) };
    // Swapping the coverage moves no metric on its own. The headline has one
    // writer, and coverage is not it.
    expect(hostile.player.metrics.approval).toBe(campaign.player.metrics.approval);
    // But it does move what the country is drifting toward, which is how a
    // term of hostile coverage eventually reaches removal's reading.
    expect(opinionTargets(hostile).integrity).toBeLessThan(opinionTargets(campaign).integrity);
    expect(opinionTargets(hostile).competence).toBeLessThan(opinionTargets(campaign).competence);
  });
});

describe("what a bad week with the press costs", () => {
  const streams = createRngStreams(buildCampaign().seed);

  it("bills the state a token and the country the rest", () => {
    // The whole defect: a botched leak took eight points of the world's reading
    // of the United States and three of order at home — more than a month of
    // war — for an hour of bad coverage.
    for (const play of Object.values(PRESS_PLAYS)) {
      for (const [, delta] of Object.entries(play.backfire)) {
        expect(Math.abs(delta)).toBeLessThanOrEqual(0.03);
      }
    }
    // And the weight that was taken off the state landed on the six judgments.
    expect(PRESS_PLAYS.leak.moodBackfire?.integrity).toBeLessThan(0);
    expect(PRESS_PLAYS["press-conference"].moodBackfire?.competence).toBeLessThan(0);
    // An interview is too small to reach the country at all.
    expect(PRESS_PLAYS.interview.moodBackfire).toBeUndefined();
  });

  it("emits the mood cost only when the play actually misses", () => {
    const campaign = onAMissingDay();
    const moodEffects = (c: Campaign) => {
      const result = takePressAction(c, charter, "leak", streams, FRIENDLY);
      if (!result.ok) throw new Error(result.reason);
      return {
        wentWell: result.wentWell,
        opinion: result.packet.effects.filter((effect) => effect.kind === "opinion"),
      };
    };
    // A hostile record and an incapable podium is the reliable miss; a friendly
    // one the reliable landing. Both are seeded, so both replay identically.
    const missed = moodEffects({ ...campaign, press: corpsAt(0, campaign.press) });
    expect(missed.wentWell).toBe(false);
    expect(missed.opinion).toHaveLength(1);

    const landed = moodEffects(campaign);
    if (landed.wentWell) expect(landed.opinion).toHaveLength(0);
  });

  it("moves the public through apply(), not around it", () => {
    const campaign: Campaign = { ...onAMissingDay(), press: corpsAt(0) };
    const result = takePressAction(campaign, charter, "leak", streams, FRIENDLY);
    if (!result.ok) throw new Error(result.reason);
    expect(result.wentWell).toBe(false);
    const after = apply(campaign, result.packet);
    expect(after.player.opinion.integrity).toBeLessThan(campaign.player.opinion.integrity);
    // A single bad leak is a nudge, not a scandal: well under one live
    // scandal's quarter of the judgment.
    expect(campaign.player.opinion.integrity - after.player.opinion.integrity).toBeLessThan(0.05);
  });
});

describe("the corps a party opens with", () => {
  const friendly = (party: "democrat" | "republican" | "independent") => {
    const corps = openingPressCorps(1, usTicket(party).beliefs);
    return PRESS_OUTLETS.filter((outlet) => outletStance(corps.dispositions[outlet.id]!) === "friendly")
      .map((outlet) => outlet.id)
      .sort();
  };

  it("gives a Democrat and a Republican different friendly desks, and leaves the corps where it was", () => {
    expect(friendly("democrat")).not.toEqual(friendly("republican"));
    for (const party of ["democrat", "republican", "independent"] as const) {
      const corps = openingPressCorps(1, usTicket(party).beliefs);
      expect(corps.standing).toBeCloseTo(0.5, 3);
    }
  });

  it("leaves a corps with no party on the institutional lean alone", () => {
    expect(openingPressCorps(1).dispositions).toEqual(outletSpreadAt(0.5));
  });
});
