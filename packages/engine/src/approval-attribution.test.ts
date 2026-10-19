import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply, type EffectPacket } from "./effects.js";
import { advanceTurn, type TurnPhase } from "./turn-loop.js";
import { opinionPhase } from "./opinion.js";
import { approvalMovement } from "./opinion-movement.js";
import { opinionTargets } from "./opinion-causes.js";
import { attributeWeek, attributedMovement, openAttribution, type PhaseStart } from "./approval-attribution.js";
import type { Campaign } from "./state.js";

const ORDER_SPENT = { stability: -0.08, standing: -0.05 } as const;

/** A President who spends the country's order every week, at the desk. */
function spendOrder(state: Campaign): Campaign {
  return apply(state, {
    source: "action",
    actor: "player",
    turn: state.turn,
    narration: { summary: "Order is spent" },
    effects: [{ kind: "metric", deltas: ORDER_SPENT }],
  });
}

/** A standing program that spends the same order every week, inside the turn. */
const programPhase: TurnPhase = (state): readonly EffectPacket[] => [
  { source: "simulate", actor: "world", turn: state.turn, narration: { summary: "The program runs" }, effects: [{ kind: "metric", deltas: ORDER_SPENT }] },
];

/** The fixture with its public already at rest on what it can see, so any movement is somebody's doing. */
function settled(): Campaign {
  const campaign = buildCampaign();
  return { ...campaign, player: { ...campaign.player, opinion: { ...campaign.player.opinion, ...opinionTargets(campaign) } } };
}

function run(weeks: number, act: (state: Campaign) => Campaign, program?: { readonly id: string; readonly run: TurnPhase }) {
  const founded = settled();
  const starts: PhaseStart[] = [];
  const observed = (id: string, phase: TurnPhase): TurnPhase => (state) => {
    starts.push({ id, state });
    return phase(state);
  };
  // The public's weekly revision is what carries the mood toward the targets
  // a decision or a program has moved; the program, when there is one, runs
  // before it, as the campaign's own turn runs them.
  const simulate = [...(program ? [observed(program.id, program.run)] : []), observed("opinionPhase", opinionPhase)];
  let working = founded;
  let ledger = openAttribution(working);
  for (let week = 0; week < weeks; week += 1) {
    const start = working;
    const decided = act(working);
    working = advanceTurn(decided, { simulate, select: [] });
    ledger = attributeWeek(ledger, start, decided, starts.splice(0), working);
  }
  return { founded, working, ledger };
}

describe("where approval's movement came from", () => {
  // The decision never writes the mood: it moves where the judgments are
  // heading, and the weekly revision carries the mood there. Read off the
  // ledger, every such step was the revision's.
  it("charges a decision with the movement it caused through the targets, not the weekly revision", () => {
    const { founded, working, ledger } = run(8, spendOrder);
    const attributed = attributedMovement(ledger);
    expect(attributed.total).toBeGreaterThan(0);
    expect(attributed.byPath.decisions).toBeGreaterThan(0.9);
    expect(attributed.byPath.drift).toBe(0);
    expect(approvalMovement(working.ledger, founded.turn).byPath.decisions).toBeLessThan(0.1);
  });

  it("charges the President's standing program to their decisions, though it runs inside the turn", () => {
    const attributed = attributedMovement(run(8, (state) => state, { id: "policyPhase", run: programPhase }).ledger);
    expect(attributed.byPath.decisions).toBeGreaterThan(0.9);
    const unowned = attributedMovement(run(8, (state) => state, { id: "conditionPhase", run: programPhase }).ledger);
    expect(unowned.byPath.world).toBeGreaterThan(0.9);
    expect(unowned.byPath.decisions).toBe(0);
  });

  it("charges a quiet presidency's movement to nothing it did", () => {
    const attributed = attributedMovement(run(8, (state) => state).ledger);
    expect(attributed.byPath.decisions).toBe(0);
  });

  it("still sums its shares to the whole movement", () => {
    const attributed = attributedMovement(run(6, spendOrder).ledger);
    const paths = Object.values(attributed.byPath).reduce((sum, share) => sum + share, 0);
    const drivers = Object.values(attributed.byDriver).reduce((sum, share) => sum + share, 0);
    expect(paths).toBeCloseTo(1, 2);
    expect(drivers).toBeCloseTo(1, 2);
  });
});
