import { describe, expect, it } from "vitest";
import {
  CHARTER_USA_CONSTITUTION,
  US_ID,
  leaderBackgrounds,
  leaderRoutes,
  worldDataset,
  type LeaderBackgroundId,
  type LeaderRouteId,
  type PlankId,
  type StateId,
} from "@admin/world";
import { HARNESS_PRESIDENTS } from "./balance-harness.js";
import { BACKGROUND_HOOKS, ROUTE_HOOKS } from "./founding-leader-hooks.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, seatedPeople, type FoundingChoices } from "./founding.js";
import { openingPosition } from "./opening-position.js";
import { defaultLeaderDraft, type LeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import type { Campaign } from "./state.js";
import { figureRapport } from "./ties.js";
import { runningMateCandidates } from "./vice-president.js";
import { staffCandidates } from "./white-house.js";

// Every question the founding asks has to be worth asking: each answer changes
// something the sealed campaign carries, and a career or a route changes more
// than the leader's own record — it buys the one thing its card promises.

const SEED = makeCampaignSeed("founding-inputs");
const pool = generateFoundingPool(SEED, worldDataset);
const leader: LeaderDraft = {
  ...defaultLeaderDraft(),
  name: "Ada Verrin",
  age: 60,
  ideology: HARNESS_PRESIDENTS.democrat,
  homeState: "OH" as StateId,
};
const president = { party: leader.party, ideology: leader.ideology };
const cabinet = Object.fromEntries(
  Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, president)).map(([role, list]) => [
    role,
    list[0]!.id,
  ]),
) as FoundingChoices["cabinet"];
const base: FoundingChoices = { cabinet, leader };

function seal(overrides: Partial<FoundingChoices> = {}, draft: Partial<LeaderDraft> = {}): Campaign {
  return sealFounding(SEED, worldDataset, { ...base, ...overrides, leader: { ...leader, ...draft } });
}

/** What the sealed campaign holds, less the echo of the choices themselves. */
function consequences(campaign: Campaign): unknown {
  const { founding: _founding, ...rest } = campaign;
  return rest;
}

const reference = seal();

describe("every founding answer", () => {
  const answers: readonly [string, () => Campaign][] = [
    ["the name", () => seal({}, { name: "Grace Holloway" })],
    ["the age", () => seal({}, { age: 66 })],
    ["the economics", () => seal({}, { ideology: { ...leader.ideology, economicLeftRight: -0.6 } })],
    ["the view of authority", () => seal({}, { ideology: { ...leader.ideology, authLibertarian: 0.5 } })],
    ["the world view", () => seal({}, { ideology: { ...leader.ideology, nationalistGlobalist: 0.6 } })],
    ["the party", () => sealWithOwnCabinet()],
    ["the home state", () => seal({}, { homeState: "TX" as StateId })],
    ["the presentation", () => seal({}, { presentation: "feminine" })],
    ["the mandate", () => seal({ mandate: "landslide" })],
    ["the running mate", () => seal({ runningMate: runningMateCandidates(pool, US_ID, { ...president, age: 60 })[3]!.person.id })],
    ["the chief of staff", () => seal({ staff: { "role-chief-of-staff": staffCandidates(pool, US_ID, president, "role-chief-of-staff")[2]!.person.id } })],
    ["a cabinet pick", () => seal({ cabinet: { ...cabinet, ["role-treasury-minister" as never]: draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, president)["role-treasury-minister" as never]![1]!.id } })],
  ];

  for (const [label, sealed] of answers) {
    it(`changes what the campaign carries: ${label}`, () => {
      expect(consequences(sealed())).not.toEqual(consequences(reference));
    });
  }

  it("records the platform and the pronouns the player states on the founding they sealed", () => {
    const planks = seal({ platform: ["plank-open-government"] as unknown as readonly PlankId[] });
    expect(planks.founding.platform).toEqual(["plank-open-government"]);
    expect(seal({}, { pronouns: "she/her" }).founding.leader.pronouns).toBe("she/her");
  });
});

/** A Republican founding needs a Republican cabinet, drawn the way the screen would draw it. */
function sealWithOwnCabinet(): Campaign {
  const republican = { party: "republican" as const, ideology: HARNESS_PRESIDENTS.republican };
  const own = Object.fromEntries(
    Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, republican)).map(([role, list]) => [
      role,
      list[0]!.id,
    ]),
  ) as FoundingChoices["cabinet"];
  return sealFounding(SEED, worldDataset, { cabinet: own, leader: { ...leader, ...republican } });
}

describe("each career and each nomination", () => {
  it("names exactly one hook, and only for a life or a route the founding offers", () => {
    expect(Object.keys(BACKGROUND_HOOKS).sort()).toEqual(leaderBackgrounds.map((background) => background.id as string).sort());
    expect(Object.keys(ROUTE_HOOKS).sort()).toEqual(leaderRoutes.map((route) => route.id as string).sort());
  });

  // A hook that reaches the Hill, a statehouse, a city or the public is
  // compared against a background whose hook reaches none of those, so the
  // difference is the hook and not the readings. A hook that moves an opening
  // reading is read against the same founding's opening with no hook at all.
  for (const background of leaderBackgrounds) {
    it(`buys something beyond the President's own readings: ${background.name}`, () => {
      const age = Math.max(background.ageRange.min, Math.min(background.ageRange.max, 60));
      const chosen = seal({}, { backgroundId: background.id as LeaderBackgroundId, age });
      const hook = BACKGROUND_HOOKS[background.id as string]!;
      if (hook.kind === "opening") {
        const people = Object.values(chosen.people).map((runtime) => runtime.base);
        const nation = worldDataset.nations.find((entry) => entry.id === US_ID)!;
        const unhooked = openingPosition(nation, seatedPeople(chosen.player.cabinet, people), chosen.founding.leadRole);
        expect(chosen.player.metrics[hook.metric] - unhooked.metrics[hook.metric]).toBeCloseTo(hook.shift, 3);
        return;
      }
      const control = seal({}, { backgroundId: "path-general" as LeaderBackgroundId, age: 60 });
      expect(hookFields(chosen)).not.toEqual(hookFields(control));
    });
  }

  for (const route of leaderRoutes) {
    it(`buys something beyond the President's own readings: ${route.name}`, () => {
      const other = route.id === "route-convention" ? "route-primaries" : "route-convention";
      const chosen = seal({}, { routeId: route.id as LeaderRouteId });
      const control = seal({}, { routeId: other as LeaderRouteId });
      expect(hookFields(chosen)).not.toEqual(hookFields(control));
    });
  }
});

/** The fields a non-opening hook writes, none of which the President's own readings move. */
function hookFields(campaign: Campaign): unknown {
  const home = campaign.states["OH" as StateId];
  return {
    leadership: campaign.congress.leadership.map((figure) => figureRapport(campaign.people, figure)),
    room: campaign.congress.disposition,
    governor: home?.governor?.disposition,
    cities: Object.values(campaign.cities).map((city) => city.adminLean),
    prosperity: campaign.player.opinion.prosperity,
  };
}
