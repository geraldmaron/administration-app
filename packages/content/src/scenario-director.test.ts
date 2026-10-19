import { describe, expect, it } from "vitest";
import { ScenarioClass, ScenarioDef, classStagedFlag, scenarioFiredFlag, severityStagedFlag } from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import type { Campaign, Conflict, NationCondition } from "@admin/engine";
import {
  CLASS_COOLDOWN,
  CRITICAL_COOLDOWN,
  announcedFuses,
  digestLead,
  leadingFuse,
  MAX_DESK_CAPACITY,
  PRESIDENCY_LIFT,
  SUPPRESSION_WINDOW,
  boardPressure,
  deskCapacity,
  presidencyPressure,
  subjectPressure,
  rankCandidates,
  recencyFactor,
  directorPicks,
  stageScenarios,
  stagedClassFlags,
  turnsSinceStaged,
} from "./scenario-director.js";
import { memoryPool, stageFromResidentPool } from "./corpus/pool.js";
import { selectorOf } from "./corpus/selector.js";

/**
 * A pool spanning every class, deliberately synthetic.
 *
 * The bundled pack authors five scenarios across five classes, so a probe run
 * against it would be measuring how much content exists rather than how the
 * director paces it. The corpus is a separate problem; what
 * is under test here is the staging rule.
 */
const POOL: readonly ScenarioDef[] = ScenarioClass.options.map((scenarioClass) =>
  ScenarioDef.parse({
    id: `probe-${scenarioClass}`,
    class: scenarioClass,
    severity: "serious",
    dilemmaShape: "containment",
    subject: `The week the ${scenarioClass} question reached the desk`,
    cast: { pick: "none" },
    locus: { site: "capital", ground: "home", descriptor: "the room where these things are decided" },
    conditions: [],
    weight: 1,
    boosts: [],
    particulars: [{ label: "Reached the desk at", value: "09:00" }],
    opening: [
      {
        speaker: { kind: "narrator" },
        text: "Something has happened, the building has spent the morning arguing about it, and the argument has now arrived at this desk for an answer.",
      },
    ],
    replies: [
      {
        id: "hold",
        tone: "firm",
        text: "We hold the line on this, and we say so in public before anybody else describes it for us.",
        commitment: {
          kind: "position",
          cost: { standing: -0.01 },
          remembered: "{{leader}} held the line on this one in public, and made a point of doing it first.",
          rejoinder: { speaker: { kind: "narrator" }, text: "The line held all week, and the two offices that had asked for it to move have not written again since." },
        },
      },
      {
        id: "yield",
        tone: "conciliatory",
        text: "We give them this one, and we take the credit for the week staying quiet.",
        commitment: {
          kind: "position",
          cost: { standing: -0.01 },
          remembered: "{{leader}} gave way on this one, and took the credit for the week staying quiet.",
          rejoinder: { speaker: { kind: "cabinet", roleHint: "interior" }, text: "The week did stay quiet, and the people who wanted it to have been telling everybody it was their doing." },
        },
      },
    ],
  }),
);

const PLAYER = sealedCampaign().founding.nation;

function war(campaign: Campaign, intensity: number): Campaign {
  const conflict: Conflict = {
    id: `war:${PLAYER}:X:1`,
    aggressor: PLAYER,
    defender: "ALP" as never,
    joined: { aggressor: [], defender: [] },
    startedTurn: 1,
    cause: "A border seized.",
    intensity,
    warSupport: { aggressor: 0.6, defender: 0.6 },
    exhaustion: { aggressor: 0.1, defender: 0.1 },
    status: "active",
    beats: [],
  };
  return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}

function suffering(campaign: Campaign, kind: NationCondition["kind"], severity: number): Campaign {
  const condition: NationCondition = {
    id: `condition:${kind}:${PLAYER}:1`,
    nation: PLAYER,
    kind,
    scope: "nation",
    severity,
    startedTurn: 1,
    status: "active",
    beats: [],
  };
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

function seen(campaign: Campaign, scenarioClass: ScenarioClass, turn: number): Campaign {
  return {
    ...campaign,
    player: { ...campaign.player, flags: { ...campaign.player.flags, [classStagedFlag(scenarioClass, turn)]: true } },
  };
}

describe("what the board is carrying", () => {
  it("reads a war the player is in, and ignores one they are not", () => {
    const campaign = { ...sealedCampaign(), turn: 10 };
    expect(subjectPressure(campaign, "war")).toBe(0);
    expect(subjectPressure(war(campaign, 0.7), "war")).toBeCloseTo(0.7);
  });

  it("reads a war the player joined beside somebody else as a war the player is in", () => {
    const campaign = { ...sealedCampaign(), turn: 10 };
    const conflict: Conflict = {
      id: "war:RUS:UKR:1",
      aggressor: "RUS" as never,
      defender: "UKR" as never,
      joined: { aggressor: [], defender: [PLAYER] },
      startedTurn: 1,
      cause: "A border seized.",
      intensity: 0.55,
      warSupport: { aggressor: 0.6, defender: 0.6 },
      exhaustion: { aggressor: 0.1, defender: 0.1 },
      status: "active",
      beats: [],
    };
    const beside = { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
    expect(subjectPressure(beside, "war")).toBeCloseTo(0.55);
    const elsewhere = { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: { ...conflict, joined: { aggressor: [], defender: [] } } } };
    expect(subjectPressure(elsewhere, "war")).toBe(0);
  });

  it("separates a flood from an outbreak rather than calling both a crisis", () => {
    const campaign = { ...sealedCampaign(), turn: 10 };
    const flooded = suffering(campaign, "flood", 0.8);
    expect(subjectPressure(flooded, "disaster")).toBeCloseTo(0.8);
    expect(subjectPressure(flooded, "public-health")).toBe(0);
    expect(subjectPressure(suffering(campaign, "pandemic", 0.8), "public-health")).toBeCloseTo(0.8);
  });

  it("says nothing about a class the board has no subject for", () => {
    // The floor that keeps the director from silently re-weighting the whole
    // corpus on the strength of one war: a class with no subject behind it
    // competes on its authored weight and whatever the presidency is carrying.
    const campaign = war({ ...sealedCampaign(), turn: 10 }, 0.9);
    for (const scenarioClass of ["culture", "scandal", "triumph", "justice"] as ScenarioClass[]) {
      expect(subjectPressure(campaign, scenarioClass), scenarioClass).toBe(0);
    }
  });
});

// A director that reads only wars, floods and outbreaks hands the same desk to
// a presidency one vote from removal and one governing comfortably. These
// tests pin the domestic pressures that keep those two apart.
describe("what the presidency is carrying", () => {
  const calm = { ...sealedCampaign(), turn: 10 };

  /** A government losing the country, the chamber and the arc all at once. */
  function collapsing(campaign: Campaign): Campaign {
    return {
      ...campaign,
      player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: 0.15 } },
      congress: { ...campaign.congress, disposition: 0.18 },
      removal: { ...campaign.removal, pressure: 0.52, pressureHistory: [0.3, 0.36, 0.4] },
    };
  }

  it("tells a collapsing presidency from a calm one", () => {
    expect(presidencyPressure(collapsing(calm))).toBeGreaterThan(presidencyPressure(calm) * 2);
  });

  it("moves the desk's reading of a class whose own subject has not changed", () => {
    // The measured defect: the same quiet class reads identically in the week
    // of a removal and in an ordinary week.
    const quietCalm = boardPressure(calm, "culture");
    const quietCollapsing = boardPressure(collapsing(calm), "culture");
    expect(quietCollapsing).toBeGreaterThan(quietCalm * 2);
  });

  it("reads each of the three facts on its own", () => {
    const only = (patch: (campaign: Campaign) => Campaign) => presidencyPressure(patch(calm));
    const base = presidencyPressure(calm);
    const weaker = only((c) => ({ ...c, player: { ...c.player, metrics: { ...c.player.metrics, approval: 0.2 } } }));
    const hostile = only((c) => ({ ...c, congress: { ...c.congress, disposition: 0.1 } }));
    const climbing = only((c) => ({ ...c, removal: { ...c.removal, pressure: 0.3, pressureHistory: [0.2] } }));
    expect(weaker).toBeGreaterThan(base);
    expect(hostile).toBeGreaterThan(base);
    expect(climbing).toBeGreaterThan(base);
  });

  it("does not bill removal pressure's level, which is mostly the other two terms", () => {
    // A high pressure standing still is already described by the approval and
    // the chamber that put it there; only its direction is new information.
    const steady = { ...calm, removal: { ...calm.removal, pressure: 0.5, pressureHistory: [0.5] } };
    expect(presidencyPressure(steady)).toBeCloseTo(presidencyPressure(calm));
  });

  it("reads a presidency clawing back as not escalating rather than as calmer", () => {
    const easing = { ...calm, removal: { ...calm.removal, pressure: 0.3, pressureHistory: [0.5] } };
    expect(presidencyPressure(easing)).toBeCloseTo(presidencyPressure(calm));
  });

  it("never lets a class the board is already carrying be cooled by the presidency", () => {
    const burning = war(calm, 0.9);
    expect(boardPressure(burning, "war")).toBeGreaterThanOrEqual(subjectPressure(burning, "war"));
    expect(boardPressure(collapsing(burning), "war")).toBeGreaterThan(boardPressure(burning, "war"));
    expect(boardPressure(collapsing(burning), "war")).toBeLessThanOrEqual(1);
  });

  it("still ranks a burning war above a quiet class while the presidency fails", () => {
    const failing = collapsing(war(calm, 0.9));
    expect(boardPressure(failing, "war")).toBeGreaterThan(boardPressure(failing, "culture"));
  });
});

describe("the presidency does not manufacture a cascade week on its own", () => {
  it("keeps an ordinary desk at one decision however badly the government is doing", () => {
    // A cascade is the government being asked about more than one thing at
    // once. A presidency going under with nothing else on the board is one
    // thing, and the lift is held below the cascade threshold so that the worst
    // reading the function can produce still cannot widen an empty desk.
    const base = { ...sealedCampaign(), turn: 10 };
    const failing = {
      ...base,
      player: { ...base.player, metrics: { ...base.player.metrics, approval: 0 } },
      congress: { ...base.congress, disposition: 0 },
      removal: { ...base.removal, pressure: 1, pressureHistory: [0] },
    };
    expect(presidencyPressure(failing)).toBeCloseTo(1);
    expect(boardPressure(failing, "culture")).toBeCloseTo(PRESIDENCY_LIFT);
    expect(deskCapacity(failing)).toBe(1);
  });

  it("lets a failing presidency make a middling subject count as loaded", () => {
    // Two subjects at a level neither calm desk would widen for, under a
    // government that is visibly going under.
    const middling = suffering(war({ ...sealedCampaign(), turn: 10 }, 0.35), "flood", 0.35);
    expect(deskCapacity(middling)).toBe(1);
    const failing = {
      ...middling,
      player: { ...middling.player, metrics: { ...middling.player.metrics, approval: 0.1 } },
      congress: { ...middling.congress, disposition: 0.1 },
      removal: { ...middling.removal, pressure: 0.55, pressureHistory: [0.4] },
    };
    expect(deskCapacity(failing)).toBe(2);
  });
});

describe("what the player has just been shown", () => {
  const base = { ...sealedCampaign(), turn: 20 };

  it("finds nothing for a class that has never reached the desk", () => {
    expect(turnsSinceStaged(base, "war")).toBeUndefined();
    expect(recencyFactor(base, "war")).toBe(1);
  });

  it("shuts a class out entirely for the length of its cooldown", () => {
    for (let back = 1; back < CLASS_COOLDOWN; back += 1) {
      expect(recencyFactor(seen(base, "war", base.turn - back), "war"), `${back} turns ago`).toBe(0);
    }
  });

  it("lets it back in gradually rather than at a cliff", () => {
    const justOut = recencyFactor(seen(base, "war", base.turn - CLASS_COOLDOWN), "war");
    const wellOut = recencyFactor(seen(base, "war", base.turn - CLASS_COOLDOWN - 4), "war");
    expect(justOut).toBe(0);
    expect(wellOut).toBeGreaterThan(0);
    expect(wellOut).toBeLessThan(1);
  });

  it("treats a class last seen beyond the window as one never seen", () => {
    expect(recencyFactor(seen(base, "war", base.turn - SUPPRESSION_WINDOW - 2), "war")).toBe(1);
  });
});

describe("cascade weeks", () => {
  it("puts one decision on the desk in an ordinary week", () => {
    expect(deskCapacity({ ...sealedCampaign(), turn: 5 })).toBe(1);
  });

  it("does not widen the desk because one thing is very bad", () => {
    // A cascade is the government being asked about more than one thing at
    // once, not about one thing very loudly.
    expect(deskCapacity(war({ ...sealedCampaign(), turn: 5 }, 1))).toBe(1);
  });

  it("widens it when separate subjects are each genuinely loaded", () => {
    const stacked = suffering(suffering(war({ ...sealedCampaign(), turn: 5 }, 0.8), "flood", 0.8), "pandemic", 0.7);
    expect(deskCapacity(stacked)).toBe(3);
  });

  it("never widens past what a week can be read as", () => {
    const everything = ["flood", "pandemic", "unrest", "wildfire"].reduce(
      (campaign, kind) => suffering(campaign, kind as NationCondition["kind"], 0.9),
      war({ ...sealedCampaign(), turn: 5 }, 0.9),
    );
    expect(deskCapacity(everything)).toBeLessThanOrEqual(MAX_DESK_CAPACITY);
  });
});

describe("staging", () => {
  it("ranks a class the board is carrying above one it is not", () => {
    const campaign = war({ ...sealedCampaign(), turn: 5 }, 0.9);
    const ranked = rankCandidates(campaign, POOL);
    expect(ranked[0]!.candidate.selector.class).toBe("war");
  });

  it("cannot stage what the board never made live", () => {
    // The director reorders what the gates allowed; it does not open doors.
    const gated = POOL.map((def) =>
      ScenarioDef.parse({ ...def, conditions: [{ kind: "metric", metric: "stability", atLeast: 2 }] }),
    );
    expect(stageScenarios({ ...sealedCampaign(), turn: 5 }, gated)).toEqual([]);
  });

  it("never stages two of the same class in one week", () => {
    const stacked = suffering(war({ ...sealedCampaign(), turn: 5 }, 0.8), "flood", 0.8);
    const doubled = [...POOL, ...POOL.map((def) => ScenarioDef.parse({ ...def, id: `${def.id}-b` }))];
    const staged = stageScenarios(stacked, doubled);
    const classes = staged.map((cast) => cast.def.class);
    expect(new Set(classes).size).toBe(classes.length);
  });

  it("gives the same campaign the same week on every replay", () => {
    const campaign = war({ ...sealedCampaign(), turn: 7 }, 0.6);
    const once = stageScenarios(campaign, POOL).map((c) => c.def.id);
    const twice = stageScenarios(campaign, POOL).map((c) => c.def.id);
    expect(once).toEqual(twice);
  });
});

describe("severity pacing", () => {
  const critical = (def: ScenarioDef, id: string) => ScenarioDef.parse({ ...def, id, severity: "critical" });

  function criticalSeen(campaign: Campaign, turn: number): Campaign {
    return {
      ...campaign,
      player: { ...campaign.player, flags: { ...campaign.player.flags, [severityStagedFlag("critical", turn)]: true } },
    };
  }

  it("damps a critical inside the cooldown of the last one, without zeroing it", () => {
    const base = { ...sealedCampaign(), turn: 20 };
    const pool = [critical(POOL[0]!, "probe-critical"), ...POOL.slice(1)];
    const factorOf = (campaign: Campaign) =>
      rankCandidates(campaign, pool).find((entry) => entry.candidate.selector.id === "probe-critical")!.severity;
    expect(factorOf(base)).toBe(1);
    const cooled = criticalSeen(base, base.turn - 2);
    expect(factorOf(cooled)).toBeGreaterThan(0);
    // Not the bare floor: a sealed founding is a functioning but not beloved
    // presidency, and the damping scales away with what the board — including
    // the presidency itself — is carrying. What matters is that a critical
    // arriving this soon is unlikely rather than banned.
    expect(factorOf(cooled)).toBeLessThan(0.3);
  });

  it("forgets a critical staged beyond the cooldown", () => {
    const base = { ...sealedCampaign(), turn: 20 };
    const pool = [critical(POOL[0]!, "probe-critical"), ...POOL.slice(1)];
    const cooled = criticalSeen(base, base.turn - CRITICAL_COOLDOWN - 1);
    expect(rankCandidates(cooled, pool).find((entry) => entry.candidate.selector.id === "probe-critical")!.severity).toBe(1);
  });

  it("leaves a routine and serious pool entirely unpaced", () => {
    const base = criticalSeen({ ...sealedCampaign(), turn: 20 }, 18);
    for (const entry of rankCandidates(base, POOL)) expect(entry.severity).toBe(1);
  });

  it("lets a hot war force a critical through the damping", () => {
    // The damping scales away as the class's own board pressure rises: a war
    // actually burning is never told to wait its turn behind the pacing dial.
    const base = criticalSeen({ ...sealedCampaign(), turn: 20 }, 18);
    const warDef = POOL.find((def) => def.class === "war")!;
    const pool = [ScenarioDef.parse({ ...warDef, severity: "critical" }), ...POOL.filter((def) => def.class !== "war")];
    const burning = war(base, 1);
    const entry = rankCandidates(burning, pool).find((candidate) => candidate.candidate.selector.class === "war")!;
    expect(entry.severity).toBeCloseTo(1);
    expect(rankCandidates(burning, pool)[0]!.candidate.selector.class).toBe("war");
  });

  it("stops holding a critical back from a presidency that is visibly failing", () => {
    // The measured defect this dial produced: in the week of a removal the desk
    // was still mostly routine, because the only thing that could relax the
    // damping was a subject burning on the board. A government losing the
    // country and the chamber is itself the loaded board.
    const base = criticalSeen({ ...sealedCampaign(), turn: 20 }, 18);
    const pool = [critical(POOL[0]!, "probe-critical"), ...POOL.slice(1)];
    const factorOf = (campaign: Campaign) =>
      rankCandidates(campaign, pool).find((entry) => entry.candidate.selector.id === "probe-critical")!.severity;
    const failing: Campaign = {
      ...base,
      player: { ...base.player, metrics: { ...base.player.metrics, approval: 0.15 } },
      congress: { ...base.congress, disposition: 0.18 },
      removal: { ...base.removal, pressure: 0.52, pressureHistory: [0.4] },
    };
    expect(factorOf(failing)).toBeGreaterThan(factorOf(base) * 1.5);
  });

  it("stages at most one critical a week, however loaded the board", () => {
    const stacked = suffering(war({ ...sealedCampaign(), turn: 5 }, 0.9), "flood", 0.9);
    const pool = POOL.map((def) => ScenarioDef.parse({ ...def, severity: "critical" }));
    const staged = stageScenarios(stacked, pool);
    expect(staged.length).toBeGreaterThan(0);
    expect(staged.filter((cast) => cast.def.severity === "critical")).toHaveLength(1);
  });
});

// The property this whole layer exists to make testable, rather than to hope
// for: play a campaign out and check that nothing repeats inside its cooldown
// and that the classes staged track what the board was actually carrying.
describe("the anti-repetition probe", () => {
  const HORIZON = 52;

  /**
   * The seeds the shape comparisons are averaged over. One campaign stages
   * three or four wars in fifty-two weeks, so a single run compares counts
   * small enough that any change to the draw can flip the sign by luck.
   */
  const SEEDS = ["content-tests", "probe-b", "probe-c", "probe-d", "probe-e", "probe-f"] as const;

  function play(
    shape: (campaign: Campaign, turn: number) => Campaign,
    seedLabel = "content-tests",
  ): { classes: (string | undefined)[] } {
    let campaign = sealedCampaign(seedLabel);
    const classes: (string | undefined)[] = [];
    for (let turn = 1; turn <= HORIZON; turn += 1) {
      campaign = shape({ ...campaign, turn }, turn);
      const staged = stageScenarios(campaign, POOL);
      const first = staged[0];
      classes.push(first?.def.class);
      if (staged.length > 0) {
        const flags = Object.fromEntries(stagedClassFlags(staged, turn).map((flag) => [flag, true]));
        campaign = { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, ...flags } } };
      }
    }
    return { classes };
  }

  it("never repeats a class inside its cooldown across a full campaign", () => {
    const { classes } = play((campaign) => campaign);
    const lastSeen = new Map<string, number>();
    for (const [index, scenarioClass] of classes.entries()) {
      if (!scenarioClass) continue;
      const previous = lastSeen.get(scenarioClass);
      if (previous !== undefined) {
        expect(index - previous, `${scenarioClass} repeated after ${index - previous} turns`).toBeGreaterThanOrEqual(
          CLASS_COOLDOWN,
        );
      }
      lastSeen.set(scenarioClass, index);
    }
  });

  it("stages something almost every week rather than starving the desk", () => {
    // Suppression must not be so aggressive that the game stops raising
    // anything. Cooling every class at once is the failure mode.
    const { classes } = play((campaign) => campaign);
    expect(classes.filter(Boolean).length).toBeGreaterThan(HORIZON * 0.8);
  });

  it("spreads across the corpus instead of cycling a handful of classes", () => {
    const { classes } = play((campaign) => campaign);
    expect(new Set(classes.filter(Boolean)).size).toBeGreaterThanOrEqual(10);
  });

  /** The share of a campaign's weeks led by `scenarioClass`, averaged over the seeds. */
  function meanShare(shape: (campaign: Campaign, turn: number) => Campaign, scenarioClass: string): number {
    const shares = SEEDS.map(
      (seed) => play(shape, seed).classes.filter((staged) => staged === scenarioClass).length / HORIZON,
    );
    return shares.reduce((sum, share) => sum + share, 0) / shares.length;
  }

  it("leans toward what the board is carrying, without collapsing onto it", () => {
    // Both halves matter. A campaign spent at war should raise the war more
    // than a peaceful one does — and still not be only about the war, because
    // a government at war is also asked about everything else.
    //
    // This is also the constraint that sets PRESIDENCY_LIFT's ceiling. The
    // presidency's lift is a floor under every class at once, so a high enough
    // one narrows the war's advantage until this margin closes.
    const atWar = meanShare((campaign) => war(campaign, 0.9), "war");
    const atPeace = meanShare((campaign) => campaign, "war");
    expect(atWar).toBeGreaterThan(atPeace * 1.3);
    expect(atWar).toBeLessThan(0.5);
  });

  it("still leans toward the war when the presidency is also going under", () => {
    // A collapsing presidency raises every class, so the danger is that it
    // flattens the board back into the undirected draw this file replaced.
    const collapsing = (campaign: Campaign): Campaign => ({
      ...campaign,
      player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: 0.15 } },
      congress: { ...campaign.congress, disposition: 0.18 },
      removal: { ...campaign.removal, pressure: 0.52, pressureHistory: [0.4] },
    });
    const atWar = meanShare((campaign) => collapsing(war(campaign, 0.9)), "war");
    const atPeace = meanShare(collapsing, "war");
    expect(atWar).toBeGreaterThan(atPeace);
  });
});

// The defect this repo keeps producing is a system that is exported, tested and
// called by nobody. The desk's own path is the pool, not a list of defs, so the
// director has to be reachable from there or none of the above runs in the game.
describe("the path the desk actually takes", () => {
  it("ranks over selectors, so a pool is never rendered to be discarded", () => {
    const campaign = war({ ...sealedCampaign(), turn: 5 }, 0.9);
    const selectors = POOL.map((def) => selectorOf(def));
    // Ranking is what reads the board; the pick is still a weighted draw over
    // it, which is why this asserts on the ranking rather than on the winner.
    expect(rankCandidates(campaign, selectors)[0]!.candidate.selector.class).toBe("war");
    expect(directorPicks(campaign, selectors).length).toBeGreaterThan(0);
  });

  it("stages the same week whether it is handed selectors or whole defs", () => {
    const campaign = war({ ...sealedCampaign(), turn: 9 }, 0.5);
    const fromDefs = stageScenarios(campaign, POOL).map((cast) => cast.def.id);
    const fromSelectors = directorPicks(campaign, POOL.map((def) => selectorOf(def))).map((p) => p.selector.id);
    expect(fromSelectors).toEqual(fromDefs);
  });

  it("goes through a resident pool the way the player app's desk does", () => {
    const campaign = war({ ...sealedCampaign(), turn: 9 }, 0.5);
    const staged = stageFromResidentPool(campaign, memoryPool(POOL));
    expect(staged.map((cast) => cast.def.id)).toEqual(stageScenarios(campaign, POOL).map((cast) => cast.def.id));
  });
});

// The announced fuse: a reckoning the player was told was coming, burning in
// turns and in nothing else. The rule under test is the lead — a return opens
// on the fuse's status when one is live — and the two halves that make a
// scenario a fuse reader at all.
describe("the fuse a return leads with", () => {
  const DEED = "signed-the-deniable-order";
  const reader = (id: string, conditions: ScenarioDef["conditions"], boosts: ScenarioDef["boosts"]): ScenarioDef =>
    ScenarioDef.parse({ ...POOL[0]!, id, conditions, boosts });

  const FUSE = reader(
    "the-order-comes-back",
    [{ kind: "flag", flag: DEED, is: true, agedAtLeast: 6 }],
    [{ source: "flagAge", factor: 1 }],
  );

  const lit = (campaign: Campaign, flag: string, turn: number): Campaign => ({
    ...campaign,
    player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: true, [flagSetFlag(flag, turn)]: true } },
  });

  const at = (turn: number, flag = DEED, deedTurn = 4): Campaign => lit({ ...sealedCampaign(), turn }, flag, deedTurn);

  it("burns in turns, from lit through burning to due", () => {
    expect(leadingFuse(at(4), [FUSE])).toMatchObject({ status: "lit", turnsBurning: 0, turnsRemaining: 6 });
    expect(leadingFuse(at(5), [FUSE])).toMatchObject({ status: "burning", turnsBurning: 1, turnsRemaining: 5 });
    expect(leadingFuse(at(9), [FUSE])).toMatchObject({ status: "burning", turnsRemaining: 1 });
    expect(leadingFuse(at(10), [FUSE])).toMatchObject({ status: "due", turnsRemaining: 0 });
    // A deed older than its own wait is due, not more due: the measure
    // saturates rather than climbing for the rest of the campaign.
    expect(leadingFuse(at(30), [FUSE])).toMatchObject({ status: "due", turnsBurning: 6, turnsRemaining: 0 });
  });

  it("is not lit by a deed this government never did", () => {
    expect(announcedFuses({ ...sealedCampaign(), turn: 8 }, [FUSE])).toEqual([]);
  });

  it("goes out once the scenario that answers it has been answered", () => {
    const answered: Campaign = {
      ...at(10),
      player: {
        ...at(10).player,
        flags: { ...at(10).player.flags, [scenarioFiredFlag(FUSE.id)]: true },
      },
    };
    expect(announcedFuses(answered, [FUSE])).toEqual([]);
  });

  it("needs both halves: a wait that is authored and a weight that ripens", () => {
    const noWait = reader("no-wait", [{ kind: "flag", flag: DEED, is: true }], [{ source: "flagAge", factor: 1 }]);
    const noRipen = reader("no-ripen", [{ kind: "flag", flag: DEED, is: true, agedAtLeast: 6 }], []);
    expect(announcedFuses(at(8), [noWait, noRipen])).toEqual([]);
    expect(announcedFuses(at(8), [noWait, noRipen, FUSE]).map((fuse) => fuse.reader)).toEqual([FUSE.id]);
  });

  it("leads with the fuse closest to answering itself, and orders totally", () => {
    const OTHER = "left-the-convoy-unescorted";
    const slower = reader(
      "the-convoy-comes-back",
      [{ kind: "flag", flag: OTHER, is: true, agedAtLeast: 9 }],
      [{ source: "flagAge", factor: 1 }],
    );
    const both = lit(at(8), OTHER, 7);
    const order = announcedFuses(both, [slower, FUSE]).map((fuse) => fuse.reader);
    expect(order).toEqual([FUSE.id, slower.id]);
    // Pool order must not be able to re-order what the player is told about.
    expect(announcedFuses(both, [FUSE, slower]).map((fuse) => fuse.reader)).toEqual(order);
  });

  it("puts the reckoning above the account of what moved, and stays silent without one", () => {
    const summary = "Four turns passed while you were away, and six moves reached you.";
    const led = digestLead(at(5), [FUSE], summary);
    expect(led).toHaveLength(2);
    expect(led[1]).toBe(summary);
    expect(led[0]).not.toContain(DEED);
    expect(led[0]).not.toContain(FUSE.id);
    // No fuse, no lead: the rule adds a line when there is a reckoning owed
    // and never invents one to fill the space.
    expect(digestLead({ ...sealedCampaign(), turn: 8 }, [FUSE], summary)).toEqual([summary]);
  });

  it("says nothing about hours, so an absence can never be worth more than a turn", () => {
    const summary = "Nothing moved while you were away.";
    for (const turn of [4, 6, 10, 30]) {
      const [lead] = digestLead(at(turn), [FUSE], summary);
      expect(lead).toBeDefined();
      expect(lead!.toLowerCase()).not.toMatch(/hour|day|today|tonight|minute|streak/);
    }
  });
});
