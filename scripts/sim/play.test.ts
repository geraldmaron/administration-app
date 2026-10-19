import { describe, expect, it } from "vitest";
import { loadPool } from "./corpus-pool.ts";
import { playCampaign } from "./play.ts";

describe("held forecast replay", () => {
  it("waits through the due turn before allowing another decision", async () => {
    const { pool } = loadPool("corpus");
    const run = await playCampaign("balance-6", "steady", pool, "corpus", 4, {
      every: 6, members: 5, weeks: 2, control: "hold",
    });
    const forecast = run.forecasts?.[0];
    expect(forecast?.outcome).toBe("settled");
    expect(forecast?.dueTurn).toBe(3);
    expect(forecast?.followUps).toBe(0);
    expect(run.answered.map((answer) => answer.turn)).toContain(1);
    expect(run.answered.some((answer) => answer.turn > 1 && answer.turn <= forecast!.dueTurn)).toBe(false);
  });
});
