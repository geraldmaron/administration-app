import { describe, expect, it } from "vitest";
import { defaultFlagDesign, nationTraitProfiles, worldDataset } from "@admin/world";
import { makeCampaignSeed, createRngStreams, type CampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { npcActionPhase } from "./npc-turn.js";
import { operatorPhase } from "./operators.js";
import { grudgeDecayPhase } from "./relationships.js";
import { rollWorldTraits } from "./traits.js";
import { DIVERGENCE_FACETS, measureDivergence } from "./divergence.js";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";

// The gate behind "no two campaigns feel the same". Two campaigns are run
// from different seeds under an *identical* decision script — same charter,
// same cradle, same cabinet slot choices, same number of turns — so anything
// that differs at the end came from the world's own divergence sources and
// not from the player.

const PROBE_TURNS = 12;

// The bar. Chosen from what the shipped divergence sources actually produce:
// two campaigns under an identical script currently score 0.96, with every
// facet contributing (traits 1.0, people 1.0, relationships 0.97, events
// 0.92). A bar of 0.6 sits far enough below today's figure to absorb ordinary content churn, and
// far enough above a world with one source disabled — the deliberate
// regression below scores under it — to fail loudly when the game gets
// samier.
export const DIVERGENCE_BAR = 0.6;

function foundedCampaign(seed: CampaignSeed): Campaign {
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Probe Chancellor",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    // The same slot every time: the first name on each shortlist. The script
    // is identical; who happens to be standing there is the world's doing.
    cabinet: Object.fromEntries(
      Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
    ),
    leader: { ...defaultLeaderDraft(), name: "Test Leader" },
  };
  return sealFounding(seed, worldDataset, choices);
}

const probePhases = {
  simulate: (state: Campaign) =>
    [...npcActionPhase(state), ...operatorPhase(state), ...grudgeDecayPhase(state)] as readonly EffectPacket[],
  select: noopPhase,
};

function runScript(campaign: Campaign): Campaign {
  let working = campaign;
  for (let turn = 0; turn < PROBE_TURNS; turn++) working = advanceTurn(working, probePhases);
  return working;
}

function probe(seedA: string, seedB: string) {
  const a = runScript(foundedCampaign(makeCampaignSeed(seedA)));
  const b = runScript(foundedCampaign(makeCampaignSeed(seedB)));
  return measureDivergence(a, b);
}

describe("the divergence probe", () => {
  it("clears the bar for two seeds under an identical decision script", () => {
    const report = probe("probe-alpha", "probe-beta");
    // Reported rather than only asserted: a CI log that says 0.96 tells you
    // how much headroom the bar has, which a bare pass does not.
    console.info(
      `divergence: ${report.score} (bar ${DIVERGENCE_BAR}) — ` +
        DIVERGENCE_FACETS.map((f) => `${f} ${report.byFacet[f]}`).join(", "),
    );
    expect(report.score, `divergence ${report.score} fell below the bar ${DIVERGENCE_BAR}`).toBeGreaterThanOrEqual(
      DIVERGENCE_BAR,
    );
  });

  it("holds the bar across several seed pairs, not one lucky one", () => {
    const pairs: [string, string][] = [
      ["seed-1", "seed-2"],
      ["seed-3", "seed-4"],
      ["usa-a", "usa-b"],
    ];
    for (const [a, b] of pairs) {
      expect(probe(a, b).score, `${a} vs ${b}`).toBeGreaterThanOrEqual(DIVERGENCE_BAR);
    }
  });

  it("scores a campaign against itself as no divergence at all", () => {
    const campaign = runScript(foundedCampaign(makeCampaignSeed("probe-alpha")));
    const report = measureDivergence(campaign, campaign);
    expect(report.score).toBe(0);
    for (const facet of DIVERGENCE_FACETS) expect(report.byFacet[facet]).toBe(0);
  });

  it("finds divergence in every facet it claims to measure", () => {
    const report = probe("probe-alpha", "probe-beta");
    for (const facet of DIVERGENCE_FACETS) {
      expect(report.byFacet[facet], `${facet} contributed nothing`).toBeGreaterThan(0);
    }
  });

  it("fails when a divergence source is deliberately removed", () => {
    // The regression: strip the per-campaign trait and agenda roll, so every
    // nation has its authored midpoint personality in both campaigns. This is
    // the check that proves the probe measures what it claims — if disabling a
    // source did not move the figure, the figure would be decoration.
    const withoutTraitRoll = (seed: CampaignSeed): Campaign => {
      const campaign = foundedCampaign(seed);
      const authored = Object.fromEntries(
        worldDataset.nations.map((n) => [n.id as string, n.traits]),
      );
      return {
        ...campaign,
        nations: Object.fromEntries(
          Object.entries(campaign.nations).map(([id, runtime]) => [
            id,
            { ...runtime, traits: authored[id] ?? runtime.traits },
          ]),
        ),
      };
    };

    const a = withoutTraitRoll(makeCampaignSeed("probe-alpha"));
    const b = withoutTraitRoll(makeCampaignSeed("probe-beta"));
    const crippled = measureDivergence(a, b);
    const healthy = measureDivergence(foundedCampaign(makeCampaignSeed("probe-alpha")), foundedCampaign(makeCampaignSeed("probe-beta")));

    expect(crippled.byFacet.traits).toBe(0);
    expect(healthy.byFacet.traits).toBeGreaterThan(0);
    expect(crippled.score).toBeLessThan(healthy.score);
  });

  it("keeps the trait roll itself seed-sensitive, which is what the probe leans on", () => {
    const roll = (seed: string) =>
      rollWorldTraits(worldDataset.nations, nationTraitProfiles, createRngStreams(makeCampaignSeed(seed)));
    expect(JSON.stringify(roll("one"))).not.toBe(JSON.stringify(roll("two")));
    expect(JSON.stringify(roll("one"))).toBe(JSON.stringify(roll("one")));
  });
});
