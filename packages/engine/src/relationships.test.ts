import { describe, it, expect } from "vitest";
import type { Relationship } from "@admin/world";
import { buildCampaign, nationA, nationB, relationship } from "./__fixtures__/campaign.js";
import { deedTowardFlag } from "./deeds.js";
import { apply } from "./effects.js";
import type { RelationshipEffect } from "./effects.js";
import { rungDefinition } from "./instruments.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { Campaign, FlagId } from "./state.js";
import { advanceTurn, type TurnPhase, type TurnPhases } from "./turn-loop.js";
import {
  bothDirections,
  createGrudge,
  deedPressure,
  disposition,
  grudgeDecayPhase,
  grudgeDecayRate,
  grudgeWeight,
  historyPressure,
  repeatDrag,
} from "./relationships.js";

const phasesWithDecay: TurnPhases = { simulate: grudgeDecayPhase, select: () => [] };

describe("relationship directionality", () => {
  it("reads both directions independently, even when only one exists", () => {
    const state = buildCampaign();
    const both = bothDirections(state, relationship.from, relationship.to);
    expect(both.aToB).toEqual(relationship);
    expect(both.bToA).toBeUndefined();
  });
});

describe("grudge decay rate", () => {
  it("decays slower for a more vengeful nation", () => {
    expect(grudgeDecayRate(1)).toBeLessThan(grudgeDecayRate(0.5));
    expect(grudgeDecayRate(0.5)).toBeLessThan(grudgeDecayRate(0));
  });

  it("never goes negative or to zero regardless of vengefulness", () => {
    expect(grudgeDecayRate(1)).toBeGreaterThan(0);
  });
});

describe("grudge decay over the turn loop", () => {
  it("reduces grudge weight each turn and eventually removes it", () => {
    const withGrudge = apply(buildCampaign(), {
      source: "action",
      actor: "player",
      turn: 1,
      narration: { summary: "A betrayal is remembered" },
      effects: [
        {
          kind: "relationship",
          from: relationship.from,
          to: relationship.to,
          addGrudge: createGrudge("border incursion", 0.3, 1, 0.5),
        },
      ],
    });

    let state = withGrudge;
    for (let i = 0; i < 20; i++) state = advanceTurn(state, phasesWithDecay);

    const rel = state.relationships[`${relationship.from}:${relationship.to}`]!;
    expect(rel.grudges).toEqual([]);
  });

  it("every grudge-decay change is attributable to a packet with narration", () => {
    const withGrudge = apply(buildCampaign(), {
      source: "action",
      actor: "player",
      turn: 1,
      narration: { summary: "A betrayal is remembered" },
      effects: [
        { kind: "relationship", from: relationship.from, to: relationship.to, addGrudge: createGrudge("border incursion", 0.3, 1, 0.5) },
      ],
    });
    // Two weeks, because the first is the week the grievance was planted and
    // decay passes over it — there is nothing to attribute until it ticks.
    const next = advanceTurn(advanceTurn(withGrudge, phasesWithDecay), phasesWithDecay);
    expect(next.ledger.at(-1)?.description).toMatch(/fade with time/);
    // Named as the player knows them, never by code.
    expect(next.ledger.at(-1)?.description).not.toContain(`between ${relationship.from} and`);
  });

  it("does not age a grievance in the same week it was planted", () => {
    // Decay runs after every phase that plants a grudge, and the runner hands
    // it the state those phases produced. Without the guard the betrayal is
    // already being forgotten in the week it was committed.
    const plant: TurnPhase = (state) => [
      {
        source: "simulate",
        actor: "world",
        turn: state.turn,
        narration: { summary: "A betrayal is remembered" },
        effects: [
          {
            kind: "relationship",
            from: relationship.from,
            to: relationship.to,
            addGrudge: createGrudge("border incursion", 0.3, state.turn, 0.5),
          },
        ],
      },
    ];
    const plantThenDecay: TurnPhases = { simulate: [plant, grudgeDecayPhase], select: () => [] };
    const weightOf = (state: Campaign): number =>
      state.relationships[`${relationship.from}:${relationship.to}`]!.grudges.find(
        (g) => g.cause === "border incursion",
      )!.weight;

    const plantedWeek = advanceTurn(buildCampaign(), plantThenDecay);
    expect(weightOf(plantedWeek)).toBe(0.3);

    // And the clock does start the week after, or the guard is an amnesty.
    expect(weightOf(advanceTurn(plantedWeek, phasesWithDecay))).toBeLessThan(0.3);
  });

  it("a grudge created early measurably shapes disposition many turns later", () => {
    const baseline = buildCampaign();
    const aggrieved = apply(baseline, {
      source: "action",
      actor: "player",
      turn: 1,
      narration: { summary: "A betrayal is remembered" },
      effects: [
        {
          kind: "relationship",
          from: relationship.from,
          to: relationship.to,
          addGrudge: createGrudge("border incursion", 0.6, 1, 0.9), // high vengefulness -> slow decay
        },
      ],
    });

    let baselineState = baseline;
    let aggrievedState = aggrieved;
    for (let i = 0; i < 15; i++) {
      baselineState = advanceTurn(baselineState, phasesWithDecay);
      aggrievedState = advanceTurn(aggrievedState, phasesWithDecay);
    }

    const baselineRel = baselineState.relationships[`${relationship.from}:${relationship.to}`]!;
    const aggrievedRel = aggrievedState.relationships[`${relationship.from}:${relationship.to}`]!;

    expect(grudgeWeight(aggrievedRel)).toBeGreaterThan(0);
    expect(disposition(aggrievedRel)).toBeLessThan(disposition(baselineRel));
  });
});

describe("historyPressure", () => {
  it("is zero for a relationship with no history", () => {
    expect(historyPressure(relationship)).toBe(0);
  });

  it("is zero for history entries no write site's kind ever produces uncoercively or uncooperatively", () => {
    // "demarche" (the softest diplomatic rung), an authored consequence's
    // remembered line, a conversation's recorded position, and an
    // intervention are all logged to history but are deliberately unpriced
    // here — see the why-comment on classifyHistoryEvent in relationships.ts.
    const withUnclassified: typeof relationship = {
      ...relationship,
      history: [
        { turn: 1, kind: "demarche", description: "a quiet warning" },
        { turn: 2, kind: "consequence", description: "the affair was noted" },
        { turn: 3, kind: "position", description: "a position was recorded" },
        { turn: 4, kind: "intervention", description: "an intervention occurred" },
      ],
    };
    expect(historyPressure(withUnclassified)).toBe(0);
  });

  it("is negative for a recent severed relationship and positive for a recent guarantee", () => {
    const severed: typeof relationship = {
      ...relationship,
      history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
    };
    const guaranteed: typeof relationship = {
      ...relationship,
      history: [{ turn: 5, kind: "guarantee", description: "security was guaranteed" }],
    };
    expect(historyPressure(severed)).toBeLessThan(0);
    expect(historyPressure(guaranteed)).toBeGreaterThan(0);
  });

  it("weighs a failed covert operation the same coercive direction as an outright severance", () => {
    const failedOp: typeof relationship = {
      ...relationship,
      history: [{ turn: 5, kind: "failed-covert-1", description: "an operation was caught" }],
    };
    expect(historyPressure(failedOp)).toBeLessThan(0);
  });

  it("weighs the most recent classified act more than an older one competing against it", () => {
    // Same two acts, opposite order: whichever is more recent should pull
    // harder, since a nation's read is dominated by what a counterpart has
    // done lately rather than an unweighted tally since founding.
    const recentGuarantee: typeof relationship = {
      ...relationship,
      history: [
        { turn: 1, kind: "severance", description: "an old breach" },
        { turn: 10, kind: "guarantee", description: "a fresh guarantee" },
      ],
    };
    const recentSeverance: typeof relationship = {
      ...relationship,
      history: [
        { turn: 1, kind: "guarantee", description: "an old guarantee" },
        { turn: 10, kind: "severance", description: "a fresh breach" },
      ],
    };
    expect(historyPressure(recentGuarantee)).toBeGreaterThan(historyPressure(recentSeverance));
  });

  it("stays within a fraction of the trust/tension scale even with a long coercive record", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      turn: i,
      kind: "severance" as const,
      description: `breach ${i}`,
    }));
    const longRecord: typeof relationship = { ...relationship, history };
    expect(historyPressure(longRecord)).toBeGreaterThan(-0.2);
  });
});

describe("disposition reads relationship.history", () => {
  it("differs measurably between an otherwise-identical relationship with recent coercive history and one without", () => {
    const withoutHistory = relationship;
    const withCoerciveHistory: typeof relationship = {
      ...relationship,
      history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
    };
    expect(disposition(withCoerciveHistory)).toBeLessThan(disposition(withoutHistory));
  });

  it("does not double-count a grudge and its history entry when both land on the same relationship", () => {
    // consequences.ts's grudgeEffect and its "remembered" line both write to
    // (target, actor) for the same card; the remembered line is stamped with
    // the generic kind "consequence", which historyPressure does not
    // classify, so only grudgeWeight prices that act.
    const grudgeOnly: typeof relationship = {
      ...relationship,
      grudges: [createGrudge("a caught operation", 0.4, 1, 0.5)],
    };
    const grudgeWithRememberedLine: typeof relationship = {
      ...grudgeOnly,
      history: [{ turn: 1, kind: "consequence", description: "the affair was noted" }],
    };
    expect(disposition(grudgeWithRememberedLine)).toBe(disposition(grudgeOnly));
  });
});

// The reader is the country the player has been acting on, so the direction
// under test is the counterpart's own view of the administration.
const towardPlayer: Relationship = { ...relationship, from: nationB.id, to: nationA.id };

function campaignWithFlags(...flags: readonly FlagId[]): Campaign {
  const base = buildCampaign();
  const raised = Object.fromEntries(flags.map((flag) => [flag, true]));
  return { ...base, player: { ...base.player, flags: { ...base.player.flags, ...raised } } };
}

const pressureOf = (...flags: readonly FlagId[]) =>
  deedPressure(campaignWithFlags(...flags).player.flags, towardPlayer, nationA.id);

describe("deedPressure", () => {
  it("builds the flag its writer writes", () => {
    // The one place this module restates another module's string grammar.
    // If the deed flag ever changes shape, this fails rather than the reading
    // silently going quiet.
    const landedMilitary = deedTowardFlag(nationB.id, "military", "high", "landed");
    expect(pressureOf(landedMilitary)).toBeLessThan(0);
  });

  it("is zero when nothing has been done to this nation", () => {
    expect(pressureOf()).toBe(0);
  });

  it("weighs a landed act higher the further up the ladder it sat", () => {
    const low = pressureOf(deedTowardFlag(nationB.id, "military", "low", "landed"));
    const mid = pressureOf(deedTowardFlag(nationB.id, "military", "mid", "landed"));
    const high = pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed"));
    expect(high).toBeLessThan(mid);
    expect(mid).toBeLessThan(low);
    expect(low).toBeLessThan(0);
  });

  it("weighs force over a formal act at the same rung band", () => {
    const demarche = pressureOf(deedTowardFlag(nationB.id, "diplomatic", "high", "landed"));
    const force = pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed"));
    expect(force).toBeLessThan(demarche);
  });

  it("prices nothing for an act that did not land", () => {
    // A visible failure is already carried as a live grudge on this very
    // relationship, and an invisible one is a fact the reader never learned.
    const failures = (["diplomatic", "economic", "covert", "military"] as const).map((family) =>
      deedTowardFlag(nationB.id, family, "high", "failed"),
    );
    expect(pressureOf(...failures)).toBe(0);
  });

  it("prices nothing for aid, which already moves this direction directly", () => {
    expect(pressureOf(deedTowardFlag(nationB.id, "assistance", "high", "landed"))).toBe(0);
  });

  it("does not read covert orders as target knowledge, including legacy flags", () => {
    expect(pressureOf(deedTowardFlag(nationB.id, "covert", "high", "landed"))).toBe(0);
  });

  it("does not charge the administration's own reading of a counterpart with its own acts", () => {
    // `relationship` runs player -> counterpart, and `deed-toward:<X>` is the
    // record of what the player did to X. Reading it on this direction would
    // have a government think worse of a country for what it did to that
    // country itself.
    const ownAct = deedTowardFlag(nationB.id, "military", "high", "landed");
    const playerReadingOfThem = deedPressure(campaignWithFlags(ownAct).player.flags, relationship, nationA.id);
    expect(playerReadingOfThem).toBe(0);
  });

  it("stays within one live grievance's worth however long the record gets", () => {
    const everything = (["diplomatic", "economic", "covert", "military"] as const).flatMap((family) =>
      (["low", "mid", "high"] as const).map((band) => deedTowardFlag(nationB.id, family, band, "landed")),
    );
    const total = pressureOf(...everything);
    expect(total).toBeGreaterThanOrEqual(-0.2);
    expect(total).toBeLessThan(pressureOf(deedTowardFlag(nationB.id, "military", "high", "landed")));
  });
});

describe("disposition reads the deeds done to the reader", () => {
  it("reads a landed coercive act that moves no other term on this relationship", () => {
    // Nothing else on (target -> actor) records a coercive act that worked:
    // the ripple sweep excludes the target by name, only the assistance
    // ladder writes back toward the actor, and the resolver's grudge branch
    // fires on failure. Without this term the reading does not move at all.
    const campaign = campaignWithFlags(deedTowardFlag(nationB.id, "economic", "high", "landed"));
    expect(disposition(towardPlayer, campaign)).toBeLessThan(disposition(towardPlayer));
  });

  it("is unchanged for a caller that has no campaign in hand", () => {
    const campaign = buildCampaign();
    expect(disposition(towardPlayer, campaign)).toBe(disposition(towardPlayer));
  });

  it("does not charge a failed act twice against its own grudge", () => {
    // One caught operation writes a grudge here and a `failed` deed flag in
    // the player's record. Only the grudge may price it.
    const aggrieved: Relationship = {
      ...towardPlayer,
      grudges: [createGrudge("covert-2", 0.4, 1, 0.5)],
    };
    const campaign = campaignWithFlags(deedTowardFlag(nationB.id, "covert", "high", "failed"));
    expect(disposition(aggrieved, campaign)).toBe(disposition(aggrieved));
  });

  it("charges a landed act and a separate remembered severance once each", () => {
    // A severance the reader itself carried out lands in its own history; a
    // sanction the player landed on it lands in the deed record. Two acts,
    // two terms, and the total is exactly their sum.
    const withOwnSeverance: Relationship = {
      ...towardPlayer,
      history: [{ turn: 5, kind: "severance", description: "relations were severed" }],
    };
    const flag = deedTowardFlag(nationB.id, "economic", "high", "landed");
    const campaign = campaignWithFlags(flag);
    const deedOnly = disposition(towardPlayer, campaign) - disposition(towardPlayer);
    const historyOnly = disposition(withOwnSeverance) - disposition(towardPlayer);
    expect(disposition(withOwnSeverance, campaign) - disposition(towardPlayer)).toBeCloseTo(
      deedOnly + historyOnly,
      10,
    );
  });
});

describe("repeatDrag", () => {
  function withHistory(turn: number, history: Relationship["history"]): Campaign {
    const base = buildCampaign();
    return {
      ...base,
      turn,
      relationships: {
        ...base.relationships,
        [`${relationship.from}:${relationship.to}`]: { ...relationship, history },
      },
    };
  }

  it("pins 'demarche' to what diplomatic rung 1 actually stamps, so the map cannot drift from its owner", () => {
    // relationships.ts cannot import instruments.ts's value exports (the
    // dependency-direction rule this package's own instruments module warns
    // about at the top of this file), so the kind this module reads for
    // "diplomatic" is checked here against the ladder's real resolve() output
    // instead, the same way deedTowardFlag is pinned against deedPressure below.
    const campaign = buildCampaign();
    const streams = createRngStreams(makeCampaignSeed("pin-test"));
    const effects = rungDefinition("diplomatic", 1).resolve({
      campaign,
      actor: nationA.id,
      target: nationB.id,
      streams,
    });
    const relationshipEffect = effects.find(
      (effect): effect is RelationshipEffect => effect.kind === "relationship",
    );
    expect(relationshipEffect?.addHistory?.kind).toBe("demarche");
  });

  it("is unaffected by a single, non-repeated act — nothing precedes the first attempt", () => {
    const campaign = withHistory(1, []);
    expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
  });

  it("is zero for a target with no relationship on file", () => {
    const campaign = buildCampaign();
    expect(repeatDrag(campaign, nationB.id, nationA.id, "diplomatic")).toBe(0);
  });

  it("is zero for an instrument the ladder does not yet stamp a repeatable kind for", () => {
    const campaign = withHistory(2, [
      { turn: 1, kind: "demarche", description: "a quiet warning" },
      { turn: 1, kind: "demarche", description: "a second one" },
    ]);
    expect(repeatDrag(campaign, nationA.id, nationB.id, "economic")).toBe(0);
    expect(repeatDrag(campaign, nationA.id, nationB.id, "covert")).toBe(0);
    expect(repeatDrag(campaign, nationA.id, nationB.id, "military")).toBe(0);
  });

  it("raises measurably on the second démarche inside the lookback window", () => {
    const first = withHistory(1, []);
    const second = withHistory(2, [{ turn: 1, kind: "demarche", description: "a quiet warning" }]);
    expect(repeatDrag(first, nationA.id, nationB.id, "diplomatic")).toBe(0);
    expect(repeatDrag(second, nationA.id, nationB.id, "diplomatic")).toBeGreaterThan(0);
  });

  it("grows with each additional repeat, up to its ceiling", () => {
    const history = Array.from({ length: 3 }, (_, i) => ({
      turn: i + 1,
      kind: "demarche",
      description: `warning ${i}`,
    }));
    const campaign = withHistory(5, history);
    const drag = repeatDrag(campaign, nationA.id, nationB.id, "diplomatic");
    expect(drag).toBeGreaterThan(0);
    expect(drag).toBeLessThanOrEqual(0.3);

    const manyHistory = Array.from({ length: 20 }, (_, i) => ({
      turn: i + 1,
      kind: "demarche",
      description: `warning ${i}`,
    }));
    const saturated = withHistory(21, manyHistory);
    expect(repeatDrag(saturated, nationA.id, nationB.id, "diplomatic")).toBe(0.3);
    expect(repeatDrag(saturated, nationA.id, nationB.id, "diplomatic")).toBeGreaterThanOrEqual(drag);
  });

  it("does not count a démarche outside the lookback window", () => {
    const campaign = withHistory(30, [{ turn: 1, kind: "demarche", description: "long ago" }]);
    expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
  });

  it("does not read the mirror direction's history", () => {
    const base = buildCampaign();
    const campaign: Campaign = {
      ...base,
      turn: 2,
      relationships: {
        ...base.relationships,
        [`${nationB.id}:${nationA.id}`]: {
          ...relationship,
          from: nationB.id,
          to: nationA.id,
          history: [{ turn: 1, kind: "demarche", description: "a démarche the other way" }],
        },
      },
    };
    expect(repeatDrag(campaign, nationA.id, nationB.id, "diplomatic")).toBe(0);
  });

  it("does not double-count against historyPressure: 'demarche' is unclassified there", () => {
    const history = [
      { turn: 1, kind: "demarche", description: "a quiet warning" },
      { turn: 2, kind: "demarche", description: "a second one" },
    ];
    expect(historyPressure({ ...relationship, history })).toBe(0);
    expect(repeatDrag(withHistory(3, history), nationA.id, nationB.id, "diplomatic")).toBeGreaterThan(0);
  });
});
