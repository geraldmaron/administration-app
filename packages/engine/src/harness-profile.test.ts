import { describe, expect, it } from "vitest";
import { playCampaign, PROXY_PROFILES } from "./balance-harness.js";

// A measurement can hand the harness a player that is not in the population,
// schedule a program change partway through a run, watch each weekly phase, and
// take decisions of its own for the President. None of them may move a run that
// uses none of them.

const WEEKS = 3;

describe("a player the harness is handed rather than named", () => {
  it("plays a profile exactly as the named proxy with the same dials plays", () => {
    const named = playCampaign("harness-profile", "reckless", WEEKS);
    const handed = playCampaign("harness-profile", { ...PROXY_PROFILES.reckless }, WEEKS);
    expect(handed.skill).toBe("profile");
    expect({ ...handed, skill: named.skill }).toEqual(named);
  });
});

describe("a program taken up partway through a run", () => {
  it("is pursued from its week and not before, and a run with no schedule is unchanged", () => {
    const civil: string[] = [];
    const scheduled = playCampaign("harness-schedule", "passive", WEEKS, "democrat", undefined, {
      schedule: [{ week: 1, program: ["civil-emergency-powers"] }],
      observePhase: (id, state) => {
        if (id === "policyPhase") civil.push(state.player.policies.civil ?? "none");
      },
    });
    expect(civil).toHaveLength(WEEKS);
    expect(civil[0]).not.toBe("civil-emergency-powers");
    expect(civil.slice(1).every((stance) => stance === "civil-emergency-powers")).toBe(true);
    expect(scheduled.turnsPlayed).toBe(WEEKS);
    expect(playCampaign("harness-schedule", "passive", WEEKS, "democrat", undefined, {})).toEqual(playCampaign("harness-schedule", "passive", WEEKS));
  });
});

describe("decisions a measurement takes for the President", () => {
  it("are applied in their week, and a run that takes none is unchanged", () => {
    const decided: number[] = [];
    const quiet = playCampaign("harness-decide", "passive", WEEKS, "democrat", undefined, {
      decide: (state, step) => {
        decided.push(step);
        return step === 1 ? [{ source: "action", actor: "player", turn: state.turn, narration: { summary: "The President snubs an ally." }, effects: [{ kind: "metric", deltas: { standing: -0.05 } }] }] : [];
      },
    });
    expect(decided).toEqual([0, 1, 2]);
    expect(quiet.metricSeries[2]!.standing).toBeLessThan(playCampaign("harness-decide", "passive", WEEKS).metricSeries[2]!.standing);
    expect(playCampaign("harness-decide", "passive", WEEKS, "democrat", undefined, { decide: () => [] })).toEqual(playCampaign("harness-decide", "passive", WEEKS));
  });
});

describe("watching each weekly phase", () => {
  it("sees every phase of every week, and a run watched is the run unwatched", () => {
    const seen: string[] = [];
    const watched = playCampaign("harness-observe", "passive", WEEKS, "democrat", undefined, { observePhase: (id) => seen.push(id) });
    expect(seen.filter((id) => id === "fiscalPhase")).toHaveLength(WEEKS);
    expect(watched).toEqual(playCampaign("harness-observe", "passive", WEEKS));
  });
});
