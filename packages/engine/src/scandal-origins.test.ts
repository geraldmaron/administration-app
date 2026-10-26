// What opens a story, who it names, how grave it is, and what the President's answer does to its life.
import { describe, expect, it } from "vitest";
import type { NationId, PersonId, RoleId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { SALIENCE_MULTIPLIERS } from "./opinion.js";
import { opinionTargets } from "./opinion-causes.js";
import { PRESS_OUTLETS } from "./press.js";
import {
  CABINET_LEAK_STORY_SHARE,
  SCANDAL_DEVELOP_TURNS,
  SCANDAL_GRAVITY,
  SCANDAL_INTEGRITY_WEIGHT,
  SCANDAL_LIVE_FLAG,
  SCANDAL_WRONG_ANSWER_LEGS,
  scandalClosedFlag,
  scandalPhase,
  selectLiveScandals,
  selectScandals,
  type Scandal,
  type ScandalResponseVerb,
} from "./press-scandal.js";
import { respondToScandal, scandalResponsePrice } from "./scandal-response.js";
import type { OversightMatter } from "./oversight.js";
import { selectScandalOriginCounts } from "./scandal-counts.js";
import { RIVAL_LEAK_SYSTEM } from "./cabinet-alignment.js";
import type { ActionRecord, Campaign } from "./state.js";

const AG = "role-attorney-general" as RoleId;
const DNI = "role-intelligence-director" as RoleId;

const hostile = (campaign: Campaign): Campaign => ({
  ...campaign,
  press: { ...campaign.press, standing: 0.15, dispositions: Object.fromEntries(PRESS_OUTLETS.map((outlet) => [outlet.id, 0.15])) },
});

const decided = (turn: number, extra: Partial<ActionRecord>, eventId = `ev-${turn}`): ActionRecord => ({
  turn,
  actor: "player",
  description: "The President decides",
  causal: { origin: "decision", eventId, createdDate: { year: 2029, month: 1, day: 1 } },
  ...extra,
});

const onLedger = (campaign: Campaign, entries: readonly ActionRecord[], turn: number): Campaign =>
  hostile({ ...campaign, turn, ledger: [...campaign.ledger, ...entries] });

const cabinet = (): Campaign => foundedForBalance("scandal-origins", "democrat").campaign;

function only(campaign: Campaign): Scandal {
  const [scandal, ...rest] = selectScandals(campaign);
  if (!scandal || rest.length > 0) throw new Error(`expected one story, found ${rest.length + (scandal ? 1 : 0)}`);
  return scandal;
}

describe("the charge row", () => {
  it("opens a story on a decision that put the government's own conduct in question", () => {
    const story = only(onLedger(buildCampaign(), [decided(4, { institutional: ["conduct-in-question"] })], 4));
    expect(story.charge).toBe("conduct-in-question");
    expect(story.origin).toEqual({ kind: "own-act", eventId: "ev-4", charge: "conduct-in-question" });
    expect(story.subject).toMatch(/told the truth/);
    expect(story.gravity).toBe(1);
  });
});

describe("who a story names", () => {
  it("names the chair whose counsel the decision took", () => {
    const campaign = cabinet();
    const person = campaign.player.cabinet[DNI]!;
    const act = decided(4, {
      institutional: ["emergency-powers-invoked"],
      counsel: { role: DNI, person, stance: "for" },
    });
    expect(only(onLedger(campaign, [act], 4)).implicated).toEqual({ person, role: DNI });
  });

  it("names the department's chief when the decision took no counsel", () => {
    const campaign = cabinet();
    const story = only(onLedger(campaign, [decided(4, { institutional: ["emergency-powers-invoked"] })], 4));
    expect(story.implicated).toEqual({ person: campaign.player.cabinet[AG], role: AG });
  });

  it("keeps the ids a save already carries, so closed flags and committee keys still find their story", () => {
    const campaign = onLedger(buildCampaign(), [decided(4, { institutional: ["emergency-powers-invoked"] })], 4);
    expect(only(campaign).id).toBe("scandal:act:ev-4");
    const flagged = { ...buildCampaign(), player: { ...buildCampaign().player, flags: { "scandal:the-donors": true, [flagMarker("scandal:the-donors", 0)]: true } } };
    expect(only(flagged).id).toBe("scandal:flag:scandal:the-donors");
    const closed = { ...campaign, turn: 5, player: { ...campaign.player, flags: { [scandalClosedFlag("scandal:act:ev-4")]: true } } };
    expect(only(closed).stage).toBe("resolved");
  });
});

describe("stories the world opens", () => {
  const leak = (campaign: Campaign, eventId: string, person: PersonId): ActionRecord => ({
    turn: 4,
    actor: "world",
    description: "An officer is traced as the source of a leak.",
    causal: { origin: "world", eventId, createdDate: { year: 2029, month: 1, day: 1 }, systems: ["cabinet", "leak"], entities: [person] },
  });

  it("turns about a third of cabinet leaks into a story that names the officer who talked", () => {
    const campaign = cabinet();
    const person = campaign.player.cabinet[AG]!;
    const entries = Array.from({ length: 60 }, (_, index) => leak(campaign, `ev-4-${index}`, person));
    const stories = selectScandals(onLedger(campaign, entries, 4));
    expect(stories.length / entries.length).toBeGreaterThan(CABINET_LEAK_STORY_SHARE - 0.15);
    expect(stories.length / entries.length).toBeLessThan(CABINET_LEAK_STORY_SHARE + 0.15);
    expect(stories.every((story) => story.origin.kind === "cabinet-leak" && story.implicated?.person === person)).toBe(true);
    expect(stories.every((story) => story.gravity === SCANDAL_GRAVITY["cabinet-leak"])).toBe(true);
  });

  // A leak aimed at a colleague is placed to bring the colleague down, so the
  // story the press runs is about them, and they are the name the President
  // could hand over.
  it("names the colleague an aimed leak was about, and keeps who talked on the origin", () => {
    const campaign = cabinet();
    const leaker = campaign.player.cabinet[AG]!;
    const target = campaign.player.cabinet[DNI]!;
    const entries = Array.from({ length: 30 }, (_, index) => {
      const entry = leak(campaign, `ev-4-${index}`, leaker);
      return { ...entry, causal: { ...entry.causal!, systems: ["cabinet", "leak", RIVAL_LEAK_SYSTEM], entities: [leaker, target] } };
    });
    const stories = selectScandals(onLedger(campaign, entries, 4));
    expect(stories.length).toBeGreaterThan(0);
    const targetName = campaign.people[target]!.base.name;
    const leakerName = campaign.people[leaker]!.base.name;
    for (const story of stories) {
      expect(story.origin).toMatchObject({ kind: "cabinet-leak", person: leaker, target });
      expect(story.implicated).toEqual({ person: target, role: DNI });
      expect(story.subject).toContain(targetName);
      expect(story.subject).toContain(leakerName);
    }
  });

  it("names the leaker on a leak about the government, as before", () => {
    const campaign = cabinet();
    const leaker = campaign.player.cabinet[AG]!;
    const entries = Array.from({ length: 30 }, (_, index) => leak(campaign, `ev-4-${index}`, leaker));
    for (const story of selectScandals(onLedger(campaign, entries, 4))) {
      expect(story.origin).not.toHaveProperty("target");
      expect(story.implicated).toEqual({ person: leaker, role: AG });
    }
  });

  it("opens nothing on a cabinet packet that does not say it was a leak", () => {
    const campaign = cabinet();
    const entries = Array.from({ length: 12 }, (_, index) => {
      const entry = leak(campaign, `ev-4-${index}`, campaign.player.cabinet[AG]!);
      return { ...entry, causal: { ...entry.causal!, systems: ["cabinet"] } };
    });
    expect(selectScandals(onLedger(campaign, entries, 4))).toHaveLength(0);
  });

  it("opens a story the week an inspector general's report goes public", () => {
    const campaign = cabinet();
    const finding = "The inspector general reports on how the department handled its referrals.";
    const matter: OversightMatter = {
      id: "matter:ig:INST-DOJ:2",
      origin: { kind: "inspector-general", institution: "INST-DOJ" },
      direction: "received",
      subject: "how the department handled its referrals",
      openedTurn: 2,
      stage: "reported",
      public: true,
      obstructed: false,
      finding,
      beats: [{ turn: 2, description: "opened" }, { turn: 6, description: finding }],
    };
    const withReport = hostile({ ...campaign, turn: 6, oversight: { ...campaign.oversight, matters: [matter] } });
    const story = only(withReport);
    expect(story.origin.kind).toBe("inspector-general");
    expect(story.brokeTurn).toBe(6);
    expect(story.stage).toBe("breaking");
    expect(story.implicated).toEqual({ person: campaign.player.cabinet[AG], role: AG });
  });

  it("counts stories by what opened them", () => {
    const campaign = onLedger(
      buildCampaign(),
      [decided(4, { institutional: ["emergency-powers-invoked"] }), decided(5, { institutional: ["conduct-in-question"] }, "ev-5")],
      5,
    );
    expect(selectScandalOriginCounts(campaign, 0)).toEqual({ "own-act:emergency-powers": 1, "own-act:conduct-in-question": 1 });
    expect(selectScandalOriginCounts(campaign, 5)).toEqual({ "own-act:conduct-in-question": 1 });
  });
});

describe("gravity", () => {
  it("scales the integrity charge by what the story is about, never above one weight", () => {
    const at = (cost: string) => onLedger(buildCampaign(), [decided(4, { institutional: [cost] })], 4 + SCANDAL_DEVELOP_TURNS);
    const grave = only(at("conduct-in-question"));
    const contested = only(at("emergency-powers-invoked"));
    expect(contested.intensity / grave.intensity).toBeCloseTo(SCANDAL_GRAVITY["emergency-powers"] / SCANDAL_GRAVITY["conduct-in-question"], 2);
    const quiet = opinionTargets(hostile({ ...buildCampaign(), turn: 4 + SCANDAL_DEVELOP_TURNS })).integrity;
    expect(quiet - opinionTargets(at("conduct-in-question")).integrity).toBeCloseTo(grave.intensity * SCANDAL_INTEGRITY_WEIGHT, 3);
    expect(quiet - opinionTargets(at("emergency-powers-invoked")).integrity).toBeCloseTo(contested.intensity * SCANDAL_INTEGRITY_WEIGHT, 3);
    expect(Math.max(...Object.values(SCANDAL_GRAVITY))).toBe(1);
  });

  it("leaves the scandal-live salience multiplier where the doctrine states it", () => {
    expect(SALIENCE_MULTIPLIERS.scandalLive).toEqual({ integrity: 1.6 });
  });
});

describe("what an answer does to a story", () => {
  const act = decided(4, { institutional: ["emergency-powers-invoked"] });
  const running = (seed: string) => onLedger({ ...buildCampaign(), seed: seed as Campaign["seed"] }, [act], 5);

  function answered(seed: string, price: "fading" | "heavy"): { readonly campaign: Campaign; readonly verb: ScandalResponseVerb } {
    const campaign = running(seed);
    const story = only(campaign);
    const verb = (["come-clean", "fight-it"] as const).find((v) => scandalResponsePrice(campaign.seed, story.id, story.charge, v) === price);
    if (!verb) throw new Error(`no ${price} verb without a hand-over on ${seed}`);
    const result = respondToScandal(campaign, story, verb);
    if (!result.ok) throw new Error(result.reason);
    return { campaign: apply(campaign, result.packet), verb };
  }

  function seedWith(price: "fading" | "heavy"): string {
    const seed = Array.from({ length: 50 }, (_, index) => `scandal-life-${index}`).find((candidate) => {
      const campaign = running(candidate);
      const story = only(campaign);
      return (["come-clean", "fight-it"] as const).some((v) => scandalResponsePrice(campaign.seed, story.id, story.charge, v) === price);
    });
    if (!seed) throw new Error(`no seed prices a ${price} answer`);
    return seed;
  }

  const lastLiveTurn = (campaign: Campaign): number => {
    let turn = campaign.turn;
    while (only({ ...campaign, turn: turn + 1 }).stage !== "resolved") turn += 1;
    return turn;
  };

  it("puts the story on its way down the week an answer that fits is given", () => {
    const { campaign } = answered(seedWith("fading"), "fading");
    expect(only({ ...campaign, turn: 6 }).stage).toBe("fading");
    expect(lastLiveTurn(campaign)).toBeLessThan(lastLiveTurn(running(seedWith("fading"))));
  });

  it("gives the story new legs when the answer does not fit the file", () => {
    const seed = seedWith("heavy");
    const { campaign } = answered(seed, "heavy");
    expect(lastLiveTurn(campaign) - lastLiveTurn(running(seed))).toBe(SCANDAL_WRONG_ANSWER_LEGS);
  });

  it("does not bend a week read before the answer was given", () => {
    const { campaign } = answered(seedWith("heavy"), "heavy");
    expect(only({ ...campaign, turn: 4 }).stage).toBe("breaking");
  });
});

describe("the scandal-live flag", () => {
  it("is raised with its week while a story stands and lowered when none does", () => {
    const live = onLedger(buildCampaign(), [decided(4, { institutional: ["emergency-powers-invoked"] })], 4);
    const raised = scandalPhase(live).reduce((state, packet) => apply(state, packet), live);
    expect(raised.player.flags[SCANDAL_LIVE_FLAG]).toBe(true);
    expect(raised.player.flags[flagMarker(SCANDAL_LIVE_FLAG, 4)]).toBe(true);
    expect(scandalPhase(raised).some((packet) => packet.background)).toBe(false);

    const over = { ...raised, turn: 60 };
    const lowered = scandalPhase(over).reduce((state, packet) => apply(state, packet), over);
    expect(lowered.player.flags[SCANDAL_LIVE_FLAG]).toBe(false);
    expect(selectLiveScandals(lowered)).toHaveLength(0);
  });

  it("never opens a story about itself", () => {
    const flagged = { ...buildCampaign(), player: { ...buildCampaign().player, flags: { [SCANDAL_LIVE_FLAG]: true } } };
    expect(selectScandals(flagged)).toHaveLength(0);
  });

  it("is not raised for a covert operation's failure alone when the corps lets it die", () => {
    const blown = decided(4, { commitment: { instrument: "covert", rung: 4, target: "ALP" as NationId, landed: false } });
    const friendly = {
      ...buildCampaign(),
      turn: 6,
      ledger: [blown],
      press: { ...buildCampaign().press, standing: 0.8, dispositions: Object.fromEntries(PRESS_OUTLETS.map((outlet) => [outlet.id, 0.8])) },
    };
    expect(scandalPhase(friendly).some((packet) => packet.effects.some((effect) => effect.kind === "flag" && (effect.set ?? []).includes(SCANDAL_LIVE_FLAG)))).toBe(false);
  });
});
