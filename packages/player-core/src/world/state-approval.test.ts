import { describe, expect, it } from "vitest";
import { advanceTurn, projectVote, projectedStateCalls, stateApprovals, type Campaign, type StateCall } from "@admin/engine";
import { STATE_IDS, type StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { STATE_APPROVAL_HISTORY_NOTE, stateApprovalDivergence, stateApprovalReading } from "./state-approval";

const base = openingCampaign();

function call(winner: StateCall["winner"]): StateCall {
  return {
    state: STATE_IDS[0]!,
    share: winner === "administration" ? 0.53 : 0.47,
    electoralVotes: 10,
    administrationVotes: winner === "administration" ? 10 : 0,
    winner,
    allocation: "winner-take-all",
  };
}

describe("stateApprovalDivergence", () => {
  it("says nothing where approval and the call agree", () => {
    expect(stateApprovalDivergence(0.56, call("administration"), 0.02)).toBeUndefined();
    expect(stateApprovalDivergence(0.41, call("opposition"), -0.02)).toBeUndefined();
  });

  it("names partisan lean when the state approves and lean still carries it against the administration", () => {
    expect(stateApprovalDivergence(0.51, call("opposition"), -0.08)).toBe(
      "Approves at 51%, but it's still expected to vote against you. The state's usual party lean matters more here than your approval.",
    );
  });

  it("names the national vote when the state approves, leans the administration's way, and is still lost", () => {
    expect(stateApprovalDivergence(0.52, call("opposition"), 0.01)).toBe(
      "Approves at 52%, but it's still expected to vote against you. The national vote is running behind your approval, and this state is following it.",
    );
  });

  it("names partisan lean when the state disapproves and is still called for the administration", () => {
    expect(stateApprovalDivergence(0.46, call("administration"), 0.09)).toBe(
      "Disapproves at 54%, but it's still expected to vote for you. The state's usual party lean carries it.",
    );
  });

  it("names the national vote when a state that leans away is carried anyway", () => {
    expect(stateApprovalDivergence(0.48, call("administration"), -0.01)).toBe(
      "Disapproves at 52%, but it's still expected to vote for you. The national vote is running ahead of your approval, and this state is following it.",
    );
  });
});

describe("stateApprovalReading", () => {
  const id = STATE_IDS[0]!;

  it("reads the engine's approval beside the call this week's projected vote makes", () => {
    const reading = stateApprovalReading(base, id)!;
    expect(reading.approval).toBe(stateApprovals(base)[id]);
    const projected = projectedStateCalls(base, projectVote(base).share).find((entry) => entry.state === id);
    expect(reading.call).toEqual(projected);
    expect(reading.historyNote).toBe(STATE_APPROVAL_HISTORY_NOTE);
  });

  it("carries a divergence line exactly where approval and the call point opposite ways", () => {
    for (const state of STATE_IDS) {
      const reading = stateApprovalReading(base, state)!;
      const disagree = reading.approval >= 0.5 !== (reading.call.winner === "administration");
      expect(reading.divergence !== undefined, state).toBe(disagree);
    }
  });

  it("starts with no history at the oath and gains one week per turn", () => {
    expect(stateApprovalReading(base, id)!.history).toEqual([]);
    const later: Campaign = advanceTurn(advanceTurn(base));
    const history = stateApprovalReading(later, id)!.history;
    expect(history.map((point) => point.turn)).toEqual([base.turn, base.turn + 1]);
    expect(history[0]!.approval).toBeCloseTo(stateApprovals(base)[id]!, 3);
  });

  it("is undefined for a state the campaign does not carry", () => {
    expect(stateApprovalReading(base, "STATE-NOT-REAL" as StateId)).toBeUndefined();
  });
});
