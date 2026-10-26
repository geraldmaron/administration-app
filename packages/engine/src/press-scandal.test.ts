import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { NATIONAL_OUTLETS, PRESS_OUTLETS } from "./press.js";
import { salientWeights } from "./opinion.js";
import { opinionTargets } from "./opinion-causes.js";
import type { Campaign } from "./state.js";
import type { PressEngagement } from "./state-legislature.js";
import {
  SCANDAL_BREAK_INTENSITY,
  SCANDAL_DEVELOP_TURNS,
  SCANDAL_GRAVITY,
  SCANDAL_INTEGRITY_WEIGHT,
  SCANDAL_LEGS_BAR,
  SCANDAL_LIVE_FLAG,
  pressClimate,
  scandalLegsFlag,
  scandalFeedItems,
  scandalPhase,
  selectLiveScandals,
  selectScandalBoard,
  selectScandalForInquiry,
  selectScandalIntegrityCharge,
  selectScandals,
} from "./press-scandal.js";
import { flagMarker } from "./marked-flags.js";
import { apply } from "./effects.js";
import { runPhase } from "./turn-loop.js";
import type { NationId } from "@admin/world";
import type { ActionRecord } from "./state.js";

// All four outlet ids, driven to one uniform disposition so a test can put
// the whole corps on one side of the story rather than reasoning about each
// masthead's authored lean.
const dispositionsAt = (value: number): Readonly<Record<string, number>> =>
  Object.fromEntries(PRESS_OUTLETS.map((outlet) => [outlet.id, value]));

/** A corps that will keep asking about anything: every desk reads hostile. */
const hostileCorps = (base: Campaign) => ({ ...base.press, standing: 0.15, dispositions: dispositionsAt(0.15) });

/** A corps that will never touch a story: every desk reads friendly. */
const friendlyCorps = (base: Campaign) => ({ ...base.press, standing: 0.75, dispositions: dispositionsAt(0.75) });

const withLeak = (campaign: Campaign, turn: number, wentWell: boolean, id = `press:leak:${turn}`): Campaign => {
  const engagement: PressEngagement = { id, kind: "leak", turn, wentWell, summary: "a leak" };
  return { ...campaign, press: { ...campaign.press, engagements: [...campaign.press.engagements, engagement] } };
};

const withFlags = (campaign: Campaign, flags: Readonly<Record<string, boolean>>): Campaign => ({
  ...campaign,
  player: { ...campaign.player, flags: { ...campaign.player.flags, ...flags } },
});

/** A scandal flag as a writer that stamps leaves it: set, with the week it was set. */
const withStampedFlags = (campaign: Campaign, flags: readonly string[]): Campaign =>
  withFlags(campaign, Object.fromEntries(flags.flatMap((flag) => [[flag, true], [flagMarker(flag, campaign.turn), true]])));

const BROKEN_FLAG_CHARGE = round3(SCANDAL_BREAK_INTENSITY * SCANDAL_GRAVITY.flagged * SCANDAL_INTEGRITY_WEIGHT);

describe("legacy flagged scandals", () => {
  it("charges exactly what the old bare-count formula charged", () => {
    const campaign = withStampedFlags(buildCampaign(), ["scandal:missing-funds", "scandal:bribery"]);
    expect(selectScandalIntegrityCharge(campaign)).toBe(2 * BROKEN_FLAG_CHARGE);
    expect(SCANDAL_INTEGRITY_WEIGHT).toBe(0.25);
  });

  it("charges nothing once the flag clears", () => {
    const campaign = withFlags(buildCampaign(), { "scandal:missing-funds": false });
    expect(selectScandalIntegrityCharge(campaign)).toBe(0);
    expect(selectLiveScandals(campaign)).toHaveLength(0);
  });

  it("preserves opinionTargets().integrity exactly against the pre-lifecycle formula", () => {
    const withOne = withStampedFlags(buildCampaign(), ["scandal:leaked-memo"]);
    const withNone = buildCampaign();
    const one = opinionTargets(withOne).integrity;
    const none = opinionTargets(withNone).integrity;
    // The old formula was `0.75 − scandals × 0.25 + coverage`; coverage is
    // identical between the two campaigns (nothing else differs), so the gap
    // between zero and one live scandal must be exactly one story's charge on
    // the week it breaks.
    expect(round3(none - one)).toBe(BROKEN_FLAG_CHARGE);
  });
});

describe("a leak that comes back with the administration's name on it", () => {
  it("breaks at half heat the week it happens, weighed by a leak's gravity", () => {
    const campaign = withLeak(buildCampaign(), 1, false);
    const [scandal] = selectScandals(campaign);
    expect(scandal!.stage).toBe("breaking");
    expect(scandal!.gravity).toBe(SCANDAL_GRAVITY.leak);
    expect(scandal!.intensity).toBe(round3(SCANDAL_BREAK_INTENSITY * SCANDAL_GRAVITY.leak));
  });

  it("gains legs when the corps is hostile, over several weeks, then decays", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: hostileCorps(campaign) };

    const at = (turn: number) => selectScandals({ ...campaign, turn })[0]!;

    const week2 = at(2);
    expect(week2.stage).toBe("developing");
    expect(week2.intensity).toBeGreaterThan(at(1).intensity);

    const peakTurn = 1 + SCANDAL_DEVELOP_TURNS;
    const peak = at(peakTurn);
    expect(peak.stage).toBe("developing");
    expect(peak.intensity).toBeLessThanOrEqual(1);

    const fading = at(peakTurn + 1);
    expect(fading.stage).toBe("fading");
    expect(fading.intensity).toBeLessThan(peak.intensity);

    // It eventually resolves rather than fading forever.
    const long = at(peakTurn + 20);
    expect(long.stage).toBe("resolved");
    expect(long.intensity).toBe(0);
  });

  it("never exceeds intensity 1, however long the corps stays hostile", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: hostileCorps(campaign) };
    for (let turn = 1; turn <= 1 + SCANDAL_DEVELOP_TURNS + 3; turn += 1) {
      const [scandal] = selectScandals({ ...campaign, turn });
      expect(scandal!.intensity).toBeLessThanOrEqual(1);
      expect(scandal!.intensity).toBeGreaterThanOrEqual(0);
    }
  });

  it("costs a friendly corps exactly one week", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: friendlyCorps(campaign) };

    const breaking = selectScandals({ ...campaign, turn: 1 })[0]!;
    expect(breaking.stage).toBe("breaking");

    const nextWeek = selectScandals({ ...campaign, turn: 2 })[0]!;
    expect(nextWeek.stage).toBe("resolved");
    expect(nextWeek.intensity).toBe(0);
  });

  it("does not count a leak that landed well as a scandal at all", () => {
    const campaign = withLeak(buildCampaign(), 1, true);
    expect(selectScandals(campaign)).toHaveLength(0);
  });
});

describe("the integrity charge, combined", () => {
  it("caps each scandal's contribution at the old flat weight, never above it", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = withStampedFlags(campaign, ["scandal:unrelated-matter"]);
    campaign = { ...campaign, press: hostileCorps(campaign) };
    const atPeak = { ...campaign, turn: 1 + SCANDAL_DEVELOP_TURNS };
    const scandals = selectLiveScandals(atPeak);
    expect(scandals).toHaveLength(2);
    // Two live scandals: the old formula would have charged exactly 0.5 for
    // any two live scandals, flat. The new one must never charge more.
    expect(selectScandalIntegrityCharge(atPeak)).toBeLessThanOrEqual(2 * SCANDAL_INTEGRITY_WEIGHT);
  });

  it("raises integrity salience while a leak-born scandal is live, same as a flagged one used to", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: hostileCorps(campaign) };
    const weights = salientWeights(campaign);
    const baseline = salientWeights(buildCampaign());
    expect(weights.integrity).toBeGreaterThan(baseline.integrity);
  });
});

describe("the committee-inquiry handoff", () => {
  it("names the highest-intensity live scandal", () => {
    let campaign = withLeak(buildCampaign(), 1, false, "press:leak:1");
    campaign = withLeak(campaign, 3, false, "press:leak:3");
    campaign = { ...campaign, press: hostileCorps(campaign) };
    campaign = { ...campaign, turn: 5 };
    const anchor = selectScandalForInquiry(campaign);
    expect(anchor).toBeDefined();
    // The older story has had more weeks of legs, so it is further along.
    expect(anchor!.id).toBe("scandal:press:leak:1");
  });

  it("returns undefined with no live scandal", () => {
    expect(selectScandalForInquiry(buildCampaign())).toBeUndefined();
  });
});

describe("the week's headline", () => {
  it("reports the week a scandal breaks", () => {
    const campaign = withLeak(buildCampaign(), 3, false);
    const items = scandalFeedItems({ ...campaign, turn: 3 }, 3);
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe("press");
    expect(items[0]!.headline).toMatch(/traced back/);
  });

  it("stays quiet the week nothing about the story's stage changed", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: hostileCorps(campaign) };
    // A middle week of the growth phase: still "developing" the week before
    // and the week of, so there is nothing new to report.
    expect(scandalFeedItems({ ...campaign, turn: 3 }, 3)).toHaveLength(0);
  });

  it("reports a story dying within its first week under a friendly corps", () => {
    let campaign = withLeak(buildCampaign(), 1, false);
    campaign = { ...campaign, press: friendlyCorps(campaign) };
    const items = scandalFeedItems({ ...campaign, turn: 2 }, 2);
    expect(items).toHaveLength(1);
    expect(items[0]!.headline).toMatch(/stopped moving|Nobody is still asking/);
  });
});

const decided = (
  turn: number,
  description: string,
  extra: Partial<Pick<ActionRecord, "commitment" | "institutional">>,
): ActionRecord => ({
  turn,
  actor: "player",
  description,
  causal: {
    origin: "decision",
    eventId: `ev-${turn}`,
    createdDate: { year: 2029, month: 1, day: 1 },
  },
  ...extra,
});

const withLedger = (campaign: Campaign, entries: readonly ActionRecord[], turn: number): Campaign => ({
  ...campaign,
  turn,
  ledger: [...campaign.ledger, ...entries],
  press: hostileCorps(campaign),
});

describe("a scandal the President opened themselves", () => {
  // The finding this closes: the only path to a scandal was the player
  // choosing the one press play the room warns them about and losing a roll.
  const powers = decided(4, "The President signs the emergency declaration", {
    institutional: ["emergency-powers-invoked"],
  });

  it("breaks on the week the act is on the record, with no leak anywhere", () => {
    const campaign = withLedger(buildCampaign(), [powers], 4);
    expect(campaign.press.engagements).toHaveLength(0);
    const live = selectLiveScandals(campaign);
    expect(live).toHaveLength(1);
    expect(live[0]!.stage).toBe("breaking");
    expect(live[0]!.origin.kind).toBe("own-act");
    expect(live[0]!.subject).toMatch(/emergency powers/);
    // The act's own sentence travels with it, so a board can say which week.
    expect(live[0]!.context).toBe("The President signs the emergency declaration");
  });

  it("gets legs, crests and dies like any other story", () => {
    const base = withLedger(buildCampaign(), [powers], 4);
    const at = (turn: number) => selectScandals({ ...base, turn })[0]!;
    expect(at(4).stage).toBe("breaking");
    expect(at(4 + 1).stage).toBe("developing");
    expect(at(4 + SCANDAL_DEVELOP_TURNS).stage).toBe("developing");
    expect(at(4 + SCANDAL_DEVELOP_TURNS).intensity).toBeGreaterThan(at(4 + 1).intensity);
    expect(at(4 + SCANDAL_DEVELOP_TURNS + 1).stage).toBe("fading");
    expect(at(40).stage).toBe("resolved");
    expect(at(40).intensity).toBe(0);
  });

  it("makes honesty the louder question while it runs", () => {
    const quiet = buildCampaign();
    const running = withLedger(quiet, [powers], 5);
    expect(salientWeights(running).integrity).toBeGreaterThan(salientWeights(quiet).integrity);
    expect(opinionTargets(running).integrity).toBeLessThan(opinionTargets(quiet).integrity);
  });

  it("reads a covert operation that did not stay covert", () => {
    const blown = decided(4, "The operation is authorized", {
      commitment: { instrument: "covert", rung: 4, target: "ALP" as NationId, landed: false },
    });
    const live = selectLiveScandals(withLedger(buildCampaign(), [blown], 4));
    expect(live).toHaveLength(1);
    expect(live[0]!.subject).toMatch(/covert operation/);
  });

  it("leaves the ordinary price of governing alone", () => {
    // Legal authority is spent on a fifth of every authored reply, and a
    // charge that fires that often is a permanent condition rather than a
    // story. Same for a strained civil service and a spent majority.
    const priced = decided(4, "The President decides", {
      institutional: ["legal-authority-spent", "civil-service-strained", "legislative-capital-spent"],
    });
    expect(selectLiveScandals(withLedger(buildCampaign(), [priced], 4))).toHaveLength(0);
  });

  it("does not open a story on what the administration did not decide", () => {
    const executed: ActionRecord = {
      turn: 4,
      actor: "world",
      description: "The agency invokes the authority",
      institutional: ["emergency-powers-invoked"],
      causal: { origin: "world", eventId: "ev-4-w", createdDate: { year: 2029, month: 1, day: 1 } },
    };
    expect(selectLiveScandals(withLedger(buildCampaign(), [executed], 4))).toHaveLength(0);
  });

  it("files a headline for every stage the story reaches, the middle one included", () => {
    const base = withLedger(buildCampaign(), [powers], 4);
    const headlineAt = (turn: number) =>
      scandalFeedItems({ ...base, turn }, turn).map((item) => item.headline);
    expect(headlineAt(4)[0]).toMatch(/first story runs/);
    expect(headlineAt(5)[0]).toMatch(/has legs/);
    expect(headlineAt(4 + SCANDAL_DEVELOP_TURNS + 1)[0]).toMatch(/stopped moving/);
    // And nothing on a week whose stage is the week before's.
    expect(headlineAt(6)).toHaveLength(0);
  });
});

describe("an authored scandal flag that carries its own week", () => {
  const marked = (campaign: Campaign, flag: string, turn: number) =>
    withFlags(campaign, { [flag]: true, [flagMarker(flag, turn)]: true });

  it("lifecycles from the week the flag was set", () => {
    const base = { ...marked(buildCampaign(), "scandal:the-donors", 4), press: hostileCorps(buildCampaign()) };
    expect(selectScandals({ ...base, turn: 4 })[0]!.stage).toBe("breaking");
    expect(selectScandals({ ...base, turn: 5 })[0]!.stage).toBe("developing");
    expect(selectScandals({ ...base, turn: 40 })[0]!.stage).toBe("resolved");
  });

  it("is not a story until the engine has dated it", () => {
    const undated = withFlags(buildCampaign(), { "scandal:the-donors": true });
    expect(selectScandals(undated)).toHaveLength(0);
    expect(selectScandalIntegrityCharge(undated)).toBe(0);
  });

  it("is dated once, the first week the engine sees it, keeping its identity", () => {
    const undated = withFlags({ ...buildCampaign(), turn: 12 }, { "scandal:the-donors": true });
    const stamped = runPhase(undated, scandalPhase, undated.turn);
    expect(stamped.player.flags[flagMarker("scandal:the-donors", 12)]).toBe(true);
    expect(selectScandals(stamped)[0]).toMatchObject({ id: "scandal:flag:scandal:the-donors", brokeTurn: 12, stage: "breaking" });
    const later = runPhase({ ...stamped, turn: 20 }, scandalPhase, 20);
    expect(Object.keys(later.player.flags).filter((key) => key.startsWith("flagset:scandal:the-donors:"))).toEqual([
      flagMarker("scandal:the-donors", 12),
    ]);
  });

  it("raises the live flag the same week it dates a story", () => {
    const undated = withFlags({ ...buildCampaign(), turn: 12 }, { "scandal:the-donors": true });
    const stamped = runPhase(undated, scandalPhase, 12);
    expect(selectLiveScandals(stamped)).toHaveLength(1);
    expect(stamped.player.flags[SCANDAL_LIVE_FLAG]).toBe(true);
  });

  it("stops costing integrity once its dated story has run its course", () => {
    const undated = withFlags({ ...buildCampaign(), turn: 12 }, { "scandal:the-donors": true });
    let campaign = runPhase(undated, scandalPhase, 12);
    campaign = { ...campaign, turn: 12 + 104 };
    expect(selectLiveScandals(campaign)).toHaveLength(0);
    expect(selectScandalIntegrityCharge(campaign)).toBe(0);
  });

  it("carries an answer or a closing filed against the story across the dating", () => {
    const id = "scandal:flag:scandal:the-donors";
    const undated = withFlags({ ...buildCampaign(), turn: 12 }, { "scandal:the-donors": true, [scandalLegsFlag(id)]: true });
    const stamped = runPhase(undated, scandalPhase, undated.turn);
    expect(selectScandals(stamped)[0]!.id).toBe(id);
    expect(selectScandals({ ...stamped, turn: 14 })[0]!.stage).toBe("developing");
  });
});

describe("the board a room draws", () => {
  const running = (turn: number) =>
    withLedger(
      buildCampaign(),
      [decided(4, "The President signs the emergency declaration", { institutional: ["emergency-powers-invoked"] })],
      turn,
    );

  it("says what the story is, how long it has run, who is asking and what it costs", () => {
    const board = selectScandalBoard(running(7));
    expect(board).toHaveLength(1);
    const [row] = board;
    expect(row!.scandal.stage).toBe("developing");
    expect(row!.weeksRunning).toBe(3);
    expect(row!.keptAliveBy.name.length).toBeGreaterThan(0);
    expect(row!.keptAliveBy.hostility).toBeGreaterThan(0);
    expect(row!.integrityCharge).toBe(round3(row!.scandal.intensity * SCANDAL_INTEGRITY_WEIGHT));
  });

  it("empties once the story is closed for good", () => {
    const dead = running(40);
    const packets = scandalPhase(dead);
    expect(packets).toHaveLength(1);
    const closed = withFlags(dead, Object.fromEntries(
      (packets[0]!.effects[0] as { readonly set: readonly string[] }).set.map((flag) => [flag, true]),
    ));
    expect(selectScandalBoard(closed)).toHaveLength(0);
  });
});

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

describe("the desk that keeps a story alive", () => {
  it("is a national desk, however hostile a regional paper turns", () => {
    const base = withStampedFlags(buildCampaign(), ["scandal:missing-funds"]);
    const regional = PRESS_OUTLETS.find((outlet) => outlet.region !== undefined)!;
    const dispositions = { ...dispositionsAt(0.45), [regional.id]: 0 };
    const campaign: Campaign = { ...base, press: { ...base.press, standing: 0.4, dispositions } };
    const row = selectScandalBoard(campaign)[0];
    expect(row).toBeDefined();
    expect(row!.keptAliveBy.id).not.toBe(regional.id);
    expect(NATIONAL_OUTLETS.map((outlet) => outlet.id)).toContain(row!.keptAliveBy.id);
  });
});

describe("whether a story has legs", () => {
  const leakIn = (dispositions: Readonly<Record<string, number>>) => {
    const base = withLeak(buildCampaign(), 1, false);
    return { ...base, press: { ...base.press, standing: 0.5, dispositions } };
  };
  const stageAt = (campaign: Campaign) => selectScandals({ ...campaign, turn: 2 })[0]!.stage;

  it("does not run on one partisan desk while the rest of the corps is friendly", () => {
    const [one] = NATIONAL_OUTLETS;
    const campaign = leakIn({ ...dispositionsAt(0.75), [one!.id]: 0 });
    expect(stageAt(campaign)).toBe("resolved");
  });

  it("runs a charge when the room is against the administration, and lets it fizzle when only part of it is", () => {
    expect(stageAt(leakIn(dispositionsAt(0.15)))).toBe("developing");
    expect(stageAt(leakIn(dispositionsAt(0.3)))).toBe("resolved");
  });

  it("keeps a story running once it has legs, however the room turns after", () => {
    const hostile = { ...leakIn(dispositionsAt(0.15)), turn: 2 };
    const kept = scandalPhase(hostile).reduce(apply, hostile);
    const friendly = { ...kept, turn: 3, press: { ...kept.press, dispositions: dispositionsAt(0.75) } };
    expect(selectScandals(friendly)[0]!.stage).toBe("developing");
    const never = { ...hostile, turn: 3, press: { ...hostile.press, dispositions: dispositionsAt(0.75) } };
    expect(selectScandals(never)[0]!.stage).toBe("resolved");
  });

  it("gives a grave charge legs in a press climate a thinner one does not clear", () => {
    const campaign = leakIn(dispositionsAt(0.2));
    const climate = pressClimate(campaign);
    expect(SCANDAL_GRAVITY["covert-failure"] * climate).toBeGreaterThan(SCANDAL_LEGS_BAR);
    expect(SCANDAL_GRAVITY["cabinet-leak"] * climate).toBeLessThanOrEqual(SCANDAL_LEGS_BAR);
  });
});
