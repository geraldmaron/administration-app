import { describe, expect, it } from "vitest";
import { makeCampaignSeed } from "@admin/engine";
import { foundingOptions } from "@admin/player-core";
import { WHITE_HOUSE_STAFF_ROLE_IDS } from "@admin/world";
import { openingDraft, resolveFounding, withLeader } from "./draft";
import { drawTeam } from "./quick-start";
import { drawPlayableTeam, refusalsOf } from "./seal";

const SEED = "quick-start-draw";
const options = foundingOptions(makeCampaignSeed(SEED));
const named = withLeader({ ...openingDraft(SEED), setupMode: "short", quickStart: true }, { name: "Ada Quill" });

/** A repeatable stand-in for Math.random, so a failing draw can be replayed. */
function sequence(start: number): () => number {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("quick start", () => {
  it("seats every chair, the ticket and every staff post from their own shortlists, nobody twice", () => {
    const drawn = drawTeam(options, named, sequence(7));
    const resolved = resolveFounding(options, drawn);
    for (const role of resolved.seats.departments) {
      const id = drawn.cabinet[role as string];
      expect(resolved.cabinetSlates[role as string]?.some((row) => row.person.id === id)).toBe(true);
    }
    expect(resolved.runningMates.some((row) => row.person.id === drawn.runningMate)).toBe(true);
    expect(WHITE_HOUSE_STAFF_ROLE_IDS.every((post) => drawn.staff[post] !== undefined)).toBe(true);
    const seated = [...Object.values(drawn.cabinet), drawn.runningMate, ...Object.values(drawn.staff)];
    expect(new Set(seated).size).toBe(seated.length);
    expect(drawn.mandate).toBeDefined();
  });

  it("keeps what the player said about the President", () => {
    const drawn = drawTeam(options, named, sequence(11));
    expect(drawn.leader).toEqual(named.leader);
    expect(drawn.quickStart).toBe(true);
  });

  it("draws different teams on different draws", () => {
    const teams = [3, 5, 9, 13].map((start) => JSON.stringify(drawTeam(options, named, sequence(start)).cabinet));
    expect(new Set(teams).size).toBeGreaterThan(1);
  });

  it("hands the oath a team the seal accepts", () => {
    for (const start of [2, 17, 31]) {
      const drawn = drawPlayableTeam(named, sequence(start));
      expect(refusalsOf(drawn)).toEqual([]);
    }
  });
});
