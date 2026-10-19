import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId, type OrgId } from "@admin/world";
import { buildCampaign, nationA, relationship } from "./__fixtures__/campaign.js";
import { alarmAt, alarmedBy, blocPhase, blocsInPlay, coalitionCap, coalitionFlag, fracturesIn } from "./blocs.js";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { openPursuit } from "./pursuits.js";
import { openConflict } from "./conflicts.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import type { InstrumentId, RungLevel } from "./instruments.js";
import { selectRelationship, type Campaign, type Conflict } from "./state.js";

const PACT = "org-pact" as OrgId;
const USA = nationA.id;
const [ALP, COD, DUN] = ["ALP", "COD", "DUN"] as NationId[] as [NationId, NationId, NationId];

function member(id: NationId, orgs: readonly OrgId[]): Nation {
  return Nation.parse({
    ...nationA,
    id,
    identity: { ...nationA.identity, name: `Nation ${id}` },
    memberships: orgs,
  });
}

/**
 * Four nations, three of them in one compact. Three is the smallest bloc that
 * can fracture at all: with two, a member coercing the other leaves nobody
 * standing outside it to lose faith.
 */
function withPact(over: { readonly threat?: number; readonly trust?: number } = {}): Campaign {
  const base = buildCampaign();
  const nations = [
    member(USA, [PACT]),
    member(ALP, [PACT]),
    member(COD, [PACT]),
    member(DUN, []),
  ];
  const ids = nations.map((n) => n.id);
  const relationships: Record<string, Relationship> = {};
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      relationships[`${from}:${to}`] = Relationship.parse({
        ...relationship,
        from,
        to,
        trust: over.trust ?? 0.4,
        militaryThreat: over.threat ?? 0.1,
      });
    }
  }
  return {
    ...base,
    nations: Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }])),
    relationships,
  };
}

function pressing(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  rung: RungLevel = 3,
  instrument: InstrumentId = "economic",
): Campaign {
  const p = openPursuit(actor, target, "security", campaign.turn, instrument, rung, "Pressure applied.");
  return { ...campaign, pursuits: { ...campaign.pursuits, [p.id]: p } };
}

/** A board big enough to ask what share of it one coalition can be. */
function withRoster(size: number): Campaign {
  const base = withPact({ threat: 0.8, trust: -0.5 });
  const extra = Array.from({ length: size - 4 }, (_, i) => `N${String(i).padStart(2, "0")}` as NationId);
  const nations = [USA, ALP, COD, DUN, ...extra].map((id) => member(id, []));
  const relationships: Record<string, Relationship> = {};
  for (const from of nations) {
    for (const to of nations) {
      if (from.id === to.id) continue;
      relationships[`${from.id}:${to.id}`] = Relationship.parse({
        ...relationship,
        from: from.id,
        to: to.id,
        trust: -0.5,
        militaryThreat: 0.8,
      });
    }
  }
  return {
    ...base,
    nations: Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }])),
    relationships,
  };
}

function closed(campaign: Campaign, at: number): Campaign {
  const pursuits = Object.fromEntries(
    Object.entries(campaign.pursuits).map(([id, p]) => [id, { ...p, status: "abandoned" as const, closedTurn: at }]),
  );
  return { ...campaign, pursuits };
}

function atWar(campaign: Campaign, aggressor: NationId, defender: NationId): Campaign {
  const war: Conflict = openConflict(aggressor, defender, campaign.turn, "A border seized.");
  return { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
}

describe("who has signed what", () => {
  it("reads the blocs off the nations rather than needing a second list", () => {
    const blocs = blocsInPlay(withPact());
    expect([...blocs.keys()]).toEqual([PACT]);
    expect(blocs.get(PACT)).toEqual([ALP, COD, USA]);
  });

  it("counts a war and a standing campaign inside a compact as the same kind of breach", () => {
    const members = [USA, ALP, COD];
    expect(fracturesIn(pressing(withPact(), ALP, COD), members)).toHaveLength(1);
    expect(fracturesIn(atWar(withPact(), ALP, COD), members)).toHaveLength(1);
  });

  it("does not read a move against an outsider as a breach of the compact", () => {
    expect(fracturesIn(pressing(withPact(), ALP, DUN), [USA, ALP, COD])).toHaveLength(0);
  });
});

describe("a compact being shown to be hollow", () => {
  it("charges nothing where the breach leaves only one member standing outside it", () => {
    // A three-member pact in which two are fighting has exactly one bystander,
    // and a single bystander has no fellow signatory left to lose faith in.
    // The offender's own bill is priced by the ripple system, and charging it
    // again here would charge the same act twice.
    const campaign = pressing(withPact(), ALP, COD);
    expect(fracturesIn(campaign, [USA, ALP, COD])).toHaveLength(1);
    expect(blocPhase(campaign)).toEqual([]);
  });

  it("moves every remaining member-to-member bond once there are bystanders to move", () => {
    const base = withPact();
    const fourth = member(DUN, [PACT]);
    const campaign = pressing(
      { ...base, nations: { ...base.nations, [DUN]: { base: fourth, stats: fourth.stats, traits: fourth.traits } } },
      ALP,
      COD,
    );
    const before = selectRelationship(campaign, USA, DUN)!.trust;
    const after = apply(campaign, blocPhase(campaign)[0]!);
    expect(selectRelationship(after, USA, DUN)!.trust).toBeLessThan(before);
    expect(selectRelationship(after, DUN, USA)!.trust).toBeLessThan(before);
  });

  it("leaves an intact compact entirely alone", () => {
    const campaign = withPact();
    expect(blocPhase(campaign)).toEqual([]);
  });
});

describe("who everyone is afraid of", () => {
  it("reads nothing into a threatening neighbor that has not actually done anything", () => {
    // A posture and a border are not a record. Without this, the map's
    // starting threat values alone would assemble coalitions on turn one.
    const quiet = withPact({ threat: 0.9, trust: -0.8 });
    expect(alarmAt(quiet, USA, ALP)).toBe(0);
    expect(alarmedBy(quiet, ALP)).toEqual([]);
  });

  it("rises once the state has a record, and saturates rather than climbing forever", () => {
    // Three files of the same weight, so what is measured is the saturation and
    // not the difference between a tariff schedule and a war.
    const one = pressing(withPact({ threat: 0.6, trust: -0.4 }), ALP, DUN);
    const two = pressing(one, ALP, COD);
    const three = pressing(two, ALP, USA);
    expect(alarmAt(two, USA, ALP)).toBeGreaterThan(alarmAt(one, USA, ALP));
    expect(alarmAt(three, USA, ALP) - alarmAt(two, USA, ALP)).toBeLessThan(
      alarmAt(two, USA, ALP) - alarmAt(one, USA, ALP),
    );
  });

  it("reads a run of low-rung campaigns as an argument rather than a menace", () => {
    // The defect: `alarmAt` counted open files, so a state running permanent
    // tariff campaigns read exactly like a state prosecuting wars, and nearly
    // the whole roster cleared the line about whoever had the most files open.
    const base = withPact({ threat: 0.9, trust: -0.8 });
    const arguing = pressing(pressing(pressing(base, ALP, DUN, 2), ALP, COD, 2), ALP, USA, 1);
    expect(alarmAt(arguing, USA, ALP)).toBe(0);
    expect(alarmedBy(arguing, ALP)).toEqual([]);
  });

  it("weighs a war above a campaign that never left the low rungs", () => {
    const base = withPact({ threat: 0.6, trust: -0.4 });
    expect(alarmAt(atWar(base, ALP, DUN), USA, ALP)).toBeGreaterThan(alarmAt(pressing(base, ALP, DUN, 3), USA, ALP));
  });

  it("reads nothing into a campaign nobody can see", () => {
    // A covert campaign is not a record third parties hold, so it cannot be the
    // thing they assemble over.
    const base = withPact({ threat: 0.9, trust: -0.8 });
    expect(alarmAt(pressing(base, ALP, DUN, 5, "covert"), USA, ALP)).toBe(0);
    expect(alarmAt(pressing(base, ALP, DUN, 5, "military"), USA, ALP)).toBeGreaterThan(0);
  });

  it("keeps reading a record for some weeks after the last file closes", () => {
    // Alarm read only off open files went to zero on the single week between
    // one campaign ending and the next beginning, which dissolved the coalition
    // and let its formation be announced again.
    const running = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN, 4), ALP, COD, 4);
    const justClosed = closed(running, running.turn - 1);
    const longClosed = closed(running, running.turn - 20);
    expect(alarmAt(justClosed, USA, ALP)).toBeGreaterThan(0);
    expect(alarmAt(justClosed, USA, ALP)).toBeLessThan(alarmAt(running, USA, ALP));
    expect(alarmAt(longClosed, USA, ALP)).toBe(0);
  });

  it("is not the whole world: a coalition is capped at a share of the board", () => {
    // 59 of 60 capitals "about China", four times in one presidency. A set that
    // size is not a coalition forming, it is the rule saturating.
    const roster = withRoster(20);
    const campaign = pressing(pressing(roster, ALP, COD, 4), ALP, DUN, 4);
    const cap = coalitionCap(campaign);
    expect(cap).toBe(4);
    expect(alarmedBy(campaign, ALP)).toHaveLength(cap);
    // The capitals left out are over the standing line and below the one that
    // rose: they have noticed, and they are not the ones coordinating.
    const outside = (Object.keys(campaign.nations) as NationId[]).filter(
      (id) => id !== ALP && !alarmedBy(campaign, ALP).includes(id),
    );
    expect(alarmAt(campaign, outside[0]!, ALP)).toBeGreaterThan(0);
  });

  it("draws the alarmed toward each other, which is the only thing a coalition is", () => {
    const campaign = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN), ALP, COD);
    expect(alarmedBy(campaign, ALP).length).toBeGreaterThanOrEqual(3);
    const before = selectRelationship(campaign, USA, DUN)!;
    const after = apply(campaign, blocPhase(campaign)[0]!);
    expect(selectRelationship(after, USA, DUN)!.trust).toBe(before.trust);
    expect(selectRelationship(after, USA, DUN)!.alignment).toBeGreaterThan(before.alignment);
  });

  it("writes no treaty, because nobody signed one", () => {
    const campaign = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN), ALP, COD);
    const after = apply(campaign, blocPhase(campaign)[0]!);
    expect(selectRelationship(after, USA, DUN)!.treaties).toEqual([]);
  });

  it("reports a coalition on the week it forms and not for every week it lasts", () => {
    const campaign = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN), ALP, COD);
    const first = apply(campaign, blocPhase(campaign)[0]!);
    expect(first.feed.filter((item) => item.kind === "bloc")).toHaveLength(1);
    expect(first.player.flags[coalitionFlag(ALP)]).toBe(true);
    const second = apply(first, blocPhase(first)[0]!);
    expect(second.feed.filter((item) => item.kind === "bloc")).toHaveLength(1);
  });

  it("lets a coalition dissolve once the thing it was about stops", () => {
    const campaign = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN), ALP, COD);
    const formed = apply(campaign, blocPhase(campaign)[0]!);
    const quiet = { ...formed, pursuits: {} };
    const after = apply(quiet, blocPhase(quiet)[0]!);
    expect(after.player.flags[coalitionFlag(ALP)]).toBe(false);
  });

  it("carries a pair only as far as a shared fear explains, however long it lasts", () => {
    // Uncapped, this was the largest mover of the President's diplomatic
    // position across a presidency in which the President did nothing: 0.02 a
    // week, forever, on every ordered pair in the set.
    let working = pressing(pressing(withPact({ threat: 0.8, trust: -0.5 }), ALP, DUN), ALP, COD);
    const opening = selectRelationship(working, USA, DUN)!;
    const targetBefore = selectRelationship(working, DUN, ALP)!;
    let weeks = 0;
    for (; weeks < 200; weeks++) {
      const packets = blocPhase(working);
      if (packets.length === 0) break;
      working = apply(working, packets[0]!);
    }
    const closing = selectRelationship(working, USA, DUN)!;
    expect(closing.alignment).toBeGreaterThan(opening.alignment);
    expect(closing.alignment).toBeLessThanOrEqual(0.301);
    expect(closing.trust).toBe(opening.trust);
    expect(selectRelationship(working, DUN, ALP)!.trust).toBe(targetBefore.trust);
    // The rule runs out rather than running forever, so the week it stops
    // producing anything is a week this phase has nothing to say.
    expect(weeks).toBeLessThan(200);
  });
});

// The measurement the audit made, and the one that has to keep holding: a
// presidency in which the President does nothing, on the shipped dataset,
// played out to the full 104 weeks the audit ran. Slower than the rest of this
// file on purpose — the claim is about what accumulates, and no fixture with
// four nations in it can answer that.
const IDLE_TURNS = 104;

type IdleRun = {
  readonly player: NationId;
  readonly opening: ReadonlyMap<string, Relationship>;
  readonly closing: Campaign;
  /** Formations and dissolutions over the run, per subject. */
  readonly formed: ReadonlyMap<string, number>;
  readonly dissolved: ReadonlyMap<string, number>;
  /** Dissolutions where some capital was still alarmed: the flicker. */
  readonly thinnedRatherThanEnded: number;
};

let idle: IdleRun | undefined;

const subjectOf = (flag: string) => flag.slice("coalition:".length) as NationId;
const bump = (into: Map<string, number>, key: string) => into.set(key, (into.get(key) ?? 0) + 1);

const COALITION_LINE = /capitals are now talking to each other about/;

function idleRun(): IdleRun {
  if (idle) return idle;
  const { campaign, charter } = foundedForBalance("blocs-idle");
  const phases = campaignTurnPhases(charter);
  const player = campaign.founding.nation;
  const opening = new Map(
    Object.values(campaign.relationships)
      .filter((edge) => edge.from === player)
      .map((edge) => [edge.to as string, edge]),
  );
  const up = (state: Campaign) =>
    new Set(Object.keys(state.player.flags).filter((flag) => flag.startsWith("coalition:") && state.player.flags[flag]));
  const formed = new Map<string, number>();
  const dissolved = new Map<string, number>();
  let thinnedRatherThanEnded = 0;
  let working = campaign;
  for (let turn = 0; turn < IDLE_TURNS; turn++) {
    const before = up(working);
    working = advanceTurn(working, phases);
    const after = up(working);
    for (const flag of after) if (!before.has(flag)) bump(formed, flag);
    for (const flag of before) {
      if (after.has(flag)) continue;
      bump(dissolved, flag);
      if (alarmedBy(working, subjectOf(flag)).length > 0) thinnedRatherThanEnded += 1;
    }
  }
  idle = { player, opening, closing: working, formed, dissolved, thinnedRatherThanEnded };
  return idle;
}

describe("two idle terms of the world talking about itself", () => {
  it("does not move the President's own edges by more than a shared fear explains", () => {
    const run = idleRun();
    for (const edge of Object.values(run.closing.relationships)) {
      if (edge.from !== run.player) continue;
      const before = run.opening.get(edge.to as string);
      if (!before) continue;
      expect(
        Math.abs(edge.alignment - before.alignment),
        `${run.player} -> ${edge.to} alignment`,
      ).toBeLessThanOrEqual(0.15);
    }
  }, 120_000);

  it("announces a coalition once per formation, not four times about one country", () => {
    // The defect this replaces: "59 capitals are now talking to each other
    // about China", printed four times in one presidency, because the set fell
    // under the forming bar for a week each time and the guard read that as the
    // coalition having ended.
    const run = idleRun();
    // Accessions and sanctions packages file under the same feed kind; only the coalition line is an announcement.
    const announcements = run.closing.feed.filter((item) => item.kind === "bloc" && COALITION_LINE.test(item.headline)).length;
    const formations = [...run.formed.values()].reduce((sum, n) => sum + n, 0);
    expect(announcements).toBe(formations);
    for (const [flag, times] of run.formed) {
      expect(times, `${flag} announced`).toBeLessThanOrEqual((run.dissolved.get(flag) ?? 0) + 1);
    }
  }, 120_000);

  it("ends a coalition when its cause is gone, not the week it thins", () => {
    // The other half of the same rule, and the half that made the guard fail: a
    // coalition of seven that drops to two has lost members, and was struck off
    // the board on that week to be re-announced as news a month later.
    expect(idleRun().thinnedRatherThanEnded).toBe(0);
  }, 120_000);

  it("keeps a coalition a subset of the board rather than the whole of it", () => {
    const run = idleRun();
    for (const id of Object.keys(run.closing.nations) as NationId[]) {
      expect(alarmedBy(run.closing, id).length, `capitals alarmed by ${id}`).toBeLessThanOrEqual(
        coalitionCap(run.closing),
      );
    }
  }, 120_000);
});

describe("who stands with the government everyone fears", () => {
  const threatened = () => withPact({ threat: 0.8, trust: -0.5 });

  it("leaves its partners in a compact it keeps out of the coalition against it", () => {
    // ALP presses only DUN, who sits outside the pact: the pact is intact, so
    // its members stand with ALP rather than against it.
    const campaign = pressing(threatened(), ALP, DUN, 4);
    expect(alarmedBy(campaign, ALP)).not.toContain(USA);
    expect(alarmedBy(campaign, ALP)).not.toContain(COD);
  });

  it("owes nothing to a partner that turns on the compact itself", () => {
    const campaign = pressing(pressing(threatened(), ALP, DUN, 4), ALP, COD, 4);
    expect(alarmedBy(campaign, ALP)).toEqual(expect.arrayContaining([USA, COD, DUN]));
  });

  it("leaves out a capital aligned with it past what fear alone explains", () => {
    const campaign = pressing(pressing(threatened(), ALP, DUN, 4), ALP, COD, 4);
    const key = `${DUN}:${ALP}`;
    const aligned = { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key]!, alignment: 0.5 } } };
    expect(alarmedBy(aligned, ALP)).not.toContain(DUN);
  });
});

describe("how long a shared fear pulls", () => {
  it("draws the members together in the weeks the coalition forms, and not for as long as it stands", () => {
    let working = pressing(pressing(withPact({ threat: 0.8, trust: -0.95 }), ALP, DUN, 4), ALP, COD, 4);
    working = {
      ...working,
      relationships: Object.fromEntries(
        Object.entries(working.relationships).map(([key, edge]) => [key, { ...edge, alignment: -0.9 }]),
      ),
    };
    const moves: number[] = [];
    for (let week = 0; week < 12; week++) {
      const before = selectRelationship(working, USA, DUN)!.alignment;
      const packets = blocPhase(working);
      working = packets.length > 0 ? apply({ ...working, turn: working.turn + 1 }, packets[0]!) : { ...working, turn: working.turn + 1 };
      moves.push(selectRelationship(working, USA, DUN)!.alignment - before);
    }
    expect(working.player.flags[coalitionFlag(ALP)]).toBe(true);
    expect(moves.slice(0, 6).every((move) => move > 0)).toBe(true);
    expect(moves.slice(6).every((move) => move === 0)).toBe(true);
  });
});
