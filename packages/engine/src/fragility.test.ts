import { describe, expect, it } from "vitest";
import {
  FRAGILITY_WEIGHTS,
  OPPOSED_SHARE_CENTER,
  amplifiedCost,
  explainAmplification,
  fragilityTerms,
  selectCabinetSplit,
  selectFragility,
  type FragilityTermKey,
} from "./fragility.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { balanceSeeds, foundedForBalance } from "./balance-harness.js";
import type { PersonId } from "@admin/world";
import type { Campaign } from "./state.js";

function hollowed(campaign: Campaign): Campaign {
  // A government that has been run into the ground: agencies that cannot
  // execute, bent institutions, a demoralized service, no money, no standing.
  return {
    ...campaign,
    institutions: Object.fromEntries(
      Object.entries(campaign.institutions).map(([id, runtime]) => [
        id,
        { ...runtime, implementationQuality: 0.05, politicization: 0.9, integrity: 0.1, morale: 0.1 },
      ]),
    ),
    player: {
      ...campaign.player,
      metrics: { ...campaign.player.metrics, standing: 0.02, approval: 0.1, treasury: 5, stability: 0.1 },
    },
    congress: { ...campaign.congress, disposition: 0.05 },
  };
}

describe("the weights", () => {
  it("sum to one, so fragility is a share of a whole rather than an open-ended tally", () => {
    const total = Object.values(FRAGILITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("gives every term a weight, so no reading is computed and then ignored", () => {
    const terms = Object.keys(fragilityTerms(buildCampaign())) as FragilityTermKey[];
    for (const term of terms) {
      expect(FRAGILITY_WEIGHTS[term], `${term} has no weight`).toBeGreaterThan(0);
    }
    expect(Object.keys(FRAGILITY_WEIGHTS).sort()).toEqual([...terms].sort());
  });
});

describe("every term is a reading of state", () => {
  it("keeps every term in range", () => {
    for (const campaign of [buildCampaign(), hollowed(buildCampaign())]) {
      for (const [term, reading] of Object.entries(fragilityTerms(campaign))) {
        expect(reading, `${term} out of range`).toBeGreaterThanOrEqual(0);
        expect(reading, `${term} out of range`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("reads every term as health, so a higher number is always better", () => {
    // A mixed convention is how a sign error becomes a difficulty setting
    // nobody can find. Every term has to move the same way.
    const healthy = fragilityTerms(buildCampaign());
    const broken = fragilityTerms(hollowed(buildCampaign()));
    for (const term of ["agencyCapacity", "institutionalTrust", "politicalCapital", "congressionalSupport", "fiscalSpace", "bureaucraticMorale"] as const) {
      expect(broken[term], `${term} should be worse when the government is`).toBeLessThan(healthy[term]);
    }
  });

  it("falls when the executive branch cannot execute", () => {
    const campaign = buildCampaign();
    const hollow: Campaign = {
      ...campaign,
      institutions: Object.fromEntries(
        Object.entries(campaign.institutions).map(([id, runtime]) => [
          id,
          { ...runtime, implementationQuality: 0.05 },
        ]),
      ),
    };
    expect(fragilityTerms(hollow).agencyCapacity).toBeLessThan(fragilityTerms(campaign).agencyCapacity);
  });

  it("falls when institutions have been bent toward the administration's politics", () => {
    const campaign = buildCampaign();
    const bent: Campaign = {
      ...campaign,
      institutions: Object.fromEntries(
        Object.entries(campaign.institutions).map(([id, runtime]) => [
          id,
          { ...runtime, politicization: 0.95 },
        ]),
      ),
    };
    expect(fragilityTerms(bent).institutionalTrust).toBeLessThan(
      fragilityTerms(campaign).institutionalTrust,
    );
  });

  it("counts only crises the President is actually carrying", () => {
    // A famine in another country is not a load on this administration, and
    // counting it would make the world's weather into the player's penalty.
    const campaign = buildCampaign();
    const abroad: Campaign = {
      ...campaign,
      conditions: {
        elsewhere: {
          id: "elsewhere",
          nation: "ALP" as never,
          kind: "famine" as never,
          scope: "national" as never,
          severity: 0.9,
          startedTurn: 1,
          status: "active",
          beats: [],
        },
      },
    };
    expect(fragilityTerms(abroad).crisisLoad).toBe(fragilityTerms(campaign).crisisLoad);
  });
});

describe("the composite", () => {
  it("leaves a healthy government essentially unamplified", () => {
    const reading = selectFragility(buildCampaign());
    expect(reading.amplification).toBeGreaterThanOrEqual(1);
    expect(reading.amplification).toBeLessThan(1.35);
  });

  it("makes a hollowed-out government absorb a shock materially worse", () => {
    const healthy = selectFragility(buildCampaign());
    const broken = selectFragility(hollowed(buildCampaign()));
    expect(broken.fragility).toBeGreaterThan(healthy.fragility);
    expect(broken.amplification).toBeGreaterThan(healthy.amplification);
  });

  it("never makes a mistake free, however healthy the government is", () => {
    // Amplification is a floor of 1 by construction: fragility can make a
    // mistake worse and can never make one cheaper.
    const reading = selectFragility(buildCampaign());
    expect(reading.amplification).toBeGreaterThanOrEqual(1);
    expect(amplifiedCost(reading, -0.1)).toBeLessThanOrEqual(-0.1);
  });

  it("does not amplify gains, only costs", () => {
    // Amplifying both directions would be a difficulty curve wearing a
    // mechanic's clothes: a failing government would get more out of a win.
    const reading = selectFragility(hollowed(buildCampaign()));
    expect(amplifiedCost(reading, 0.2)).toBe(0.2);
    expect(amplifiedCost(reading, -0.2)).toBeLessThan(-0.2);
  });

  it("is bounded, so it cannot become a second health bar", () => {
    const reading = selectFragility(hollowed(buildCampaign()));
    expect(reading.fragility).toBeLessThanOrEqual(1);
    expect(reading.amplification).toBeLessThanOrEqual(1.5);
  });
});

describe("nothing is amplified invisibly", () => {
  it("names the terms carrying the fragility whenever there is any to name", () => {
    // The design forbids an unexplained global multiplier. A reading that
    // amplifies and cannot say why would be exactly that.
    const reading = selectFragility(hollowed(buildCampaign()));
    expect(reading.drivers.length).toBeGreaterThan(0);
    for (const driver of reading.drivers) {
      expect(driver.reading).toBeLessThan(1);
      expect(driver.contribution).toBeGreaterThan(0);
      expect(driver.remedy.length).toBeGreaterThan(0);
    }
  });

  it("orders the drivers worst first, so the player is told what to fix", () => {
    const reading = selectFragility(hollowed(buildCampaign()));
    for (let i = 1; i < reading.drivers.length; i += 1) {
      expect(reading.drivers[i - 1]!.contribution).toBeGreaterThanOrEqual(
        reading.drivers[i]!.contribution,
      );
    }
  });

  it("gives every driver a remedy the player could actually act on", () => {
    const reading = selectFragility(hollowed(buildCampaign()));
    for (const driver of reading.drivers) {
      expect(driver.remedy).toMatch(/[a-z]/);
      expect(driver.remedy.endsWith(".")).toBe(true);
    }
  });

  it("explains an amplification in one sentence with a subject in it", () => {
    const sentence = explainAmplification(selectFragility(hollowed(buildCampaign())));
    expect(sentence).toBeDefined();
    expect(sentence).toContain("because of");
  });

  it("claims no penalty when none was applied", () => {
    // A screen that said "you were penalized" on a healthy government would be
    // inventing a mechanic the state did not run.
    const reading = selectFragility(buildCampaign());
    if (reading.drivers.length === 0) {
      expect(explainAmplification(reading)).toBeUndefined();
    }
  });

  it("recovers when the government does, rather than ratcheting", () => {
    // Decline and recovery have to be symmetric, or fragility is a countdown.
    const broken = hollowed(buildCampaign());
    const repaired: Campaign = {
      ...broken,
      institutions: buildCampaign().institutions,
      player: buildCampaign().player,
      congress: buildCampaign().congress,
    };
    expect(selectFragility(repaired).fragility).toBeLessThan(selectFragility(broken).fragility);
  });
});

// Cohesion is the cabinet's: the governors, the Hill's leaders, the agency heads
// and the Court hold roles too, and averaging them in left a cabinet in open
// revolt reading nearly as cohesive as a loyal one.
describe("a fractious cabinet", () => {
  const { campaign: founded } = foundedForBalance("fragility-cohesion");
  const secretaries = Object.entries(founded.player.cabinet)
    .filter(([role]) => role !== founded.founding.leadRole)
    .map(([, id]) => id as PersonId);
  const withLoyalty = (campaign: Campaign, ids: readonly PersonId[], loyalty: number): Campaign => ({
    ...campaign,
    people: Object.fromEntries(
      Object.entries(campaign.people).map(([id, runtime]) =>
        ids.includes(id as PersonId) ? [id, { ...runtime, base: { ...runtime.base, loyalty } }] : [id, runtime],
      ),
    ),
  });

  it("reads the living secretaries' loyalty and nobody else's", () => {
    const mean = secretaries.reduce((sum, id) => sum + founded.people[id]!.base.loyalty, 0) / secretaries.length;
    const split = 0.25 * (selectCabinetSplit(founded).opposedShare - OPPOSED_SHARE_CENTER);
    expect(fragilityTerms(founded).cabinetCohesion).toBeCloseTo(mean - split, 3);
    const outsiders = Object.values(founded.people)
      .filter((person) => person.currentRole !== undefined && !secretaries.includes(person.base.id))
      .map((person) => person.base.id);
    expect(outsiders.length).toBeGreaterThan(secretaries.length);
    expect(fragilityTerms(withLoyalty(founded, outsiders, 0)).cabinetCohesion).toBe(fragilityTerms(founded).cabinetCohesion);
  });

  it("reads a government with no secretary seated as cohesive rather than as a revolt", () => {
    const lone = buildCampaign();
    expect(Object.keys(lone.player.cabinet)).toEqual([lone.founding.leadRole]);
    expect(fragilityTerms(lone).cabinetCohesion).toBe(1);
    expect(selectFragility(lone).drivers.map((driver) => driver.term)).not.toContain("cabinetCohesion");
  });

  it("makes a hard decision costlier and names the cabinet as the reason", () => {
    const fractious = withLoyalty(founded, secretaries, 0.1);
    const split = 0.25 * (selectCabinetSplit(fractious).opposedShare - OPPOSED_SHARE_CENTER);
    expect(fragilityTerms(fractious).cabinetCohesion).toBeCloseTo(0.1 - split, 3);
    expect(amplifiedCost(selectFragility(fractious), -0.1)).toBeLessThan(amplifiedCost(selectFragility(founded), -0.1));
    expect(selectFragility(fractious).drivers.map((driver) => driver.term)).toContain("cabinetCohesion");
  });
});

// A room where Secretaries cannot sit together carries out a hard decision worse
// than the same loyalty in a room that can, and the reading says so by name.
describe("a feuding cabinet", () => {
  const { campaign: founded } = foundedForBalance("fragility-cohesion");
  const secretaries = Object.entries(founded.player.cabinet)
    .filter(([role]) => role !== founded.founding.leadRole)
    .map(([, id]) => id as PersonId);
  const meanLoyalty = (campaign: Campaign) =>
    secretaries.reduce((sum, id) => sum + campaign.people[id]!.base.loyalty, 0) / secretaries.length;
  // Every Secretary pushed to one end of every axis, alternating, so half the
  // room sits as far from the other half as the axes allow.
  const polarized = (campaign: Campaign, count: number): Campaign => ({
    ...campaign,
    people: Object.fromEntries(
      Object.entries(campaign.people).map(([id, runtime]) => {
        const index = secretaries.indexOf(id as PersonId);
        if (index < 0 || index >= count) return [id, runtime];
        const end = index % 2 === 0 ? -1 : 1;
        const ideology = { economicLeftRight: end, authLibertarian: end, nationalistGlobalist: end };
        return [id, { ...runtime, base: { ...runtime.base, ideology } }];
      }),
    ),
  });

  it("uses the center without inventing opposed pairs for an empty cabinet", () => {
    const empty = { ...founded, player: { ...founded.player, cabinet: {} } };
    expect(selectCabinetSplit(empty)).toEqual({ pairs: 0, opposedPairs: 0, opposedShare: OPPOSED_SHARE_CENTER });
  });

  it("is pinned on the typical founded cabinet's opposed share, recomputed over the balance seeds", () => {
    const shares = (["democrat", "republican", "independent"] as const)
      .flatMap((party) => balanceSeeds(12).map((seed) => selectCabinetSplit(foundedForBalance(seed, party).campaign)))
      // Only observed pairs estimate the center: zero-pair fallbacks are circular.
      .filter((split) => split.pairs > 0)
      .map((split) => split.opposedShare)
      .sort((a, b) => a - b);
    const middle = Math.floor(shares.length / 2);
    const median = shares.length % 2 ? shares[middle]! : (shares[middle - 1]! + shares[middle]!) / 2;
    expect(Math.round(median * 10000) / 10000).toBe(OPPOSED_SHARE_CENTER);
  }, 60_000);

  it("reads a founded party cabinet's cohesion close to its loyalty, less a quarter of its split off the typical one", () => {
    const split = selectCabinetSplit(founded);
    const expected = meanLoyalty(founded) - 0.25 * (split.opposedShare - OPPOSED_SHARE_CENTER);
    expect(fragilityTerms(founded).cabinetCohesion).toBeCloseTo(expected, 3);
    expect(Math.abs(fragilityTerms(founded).cabinetCohesion - meanLoyalty(founded))).toBeLessThanOrEqual(0.05);
  });

  it("reads lower the more of the room is opposed, by a quarter of the opposed share", () => {
    const some = polarized(founded, 4);
    const most = polarized(founded, secretaries.length);
    const split = selectCabinetSplit(most);
    expect(selectCabinetSplit(some).opposedShare).toBeGreaterThan(0);
    expect(split.opposedShare).toBeGreaterThan(selectCabinetSplit(some).opposedShare);
    expect(fragilityTerms(some).cabinetCohesion).toBeLessThan(fragilityTerms(founded).cabinetCohesion);
    expect(fragilityTerms(most).cabinetCohesion).toBeLessThan(fragilityTerms(some).cabinetCohesion);
    expect(fragilityTerms(most).cabinetCohesion).toBeCloseTo(meanLoyalty(most) - 0.25 * (split.opposedShare - OPPOSED_SHARE_CENTER), 3);
  });

  it("recovers when the feud leaves the room", () => {
    const most = polarized(founded, secretaries.length);
    const settled: Campaign = { ...most, people: founded.people };
    expect(fragilityTerms(settled).cabinetCohesion).toBeGreaterThan(fragilityTerms(most).cabinetCohesion);
  });

  it("tells the President to settle a feud or win back the disloyal", () => {
    const fractious: Campaign = {
      ...polarized(founded, secretaries.length),
      people: Object.fromEntries(
        Object.entries(polarized(founded, secretaries.length).people).map(([id, runtime]) =>
          secretaries.includes(id as PersonId) ? [id, { ...runtime, base: { ...runtime.base, loyalty: 0.3 } }] : [id, runtime],
        ),
      ),
    };
    const driver = selectFragility(fractious).drivers.find((entry) => entry.term === "cabinetCohesion");
    expect(driver?.remedy).toMatch(/feud/);
    expect(driver?.remedy).toMatch(/loyal/);
  });
});
