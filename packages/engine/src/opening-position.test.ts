import { describe, expect, it } from "vitest";
import type { Nation, Person, RoleId } from "@admin/world";
import { foundingBaseline, openingPosition } from "./opening-position.js";
import { nationA, person } from "./__fixtures__/campaign.js";

const LEAD = "role-prime-minister" as RoleId;
const TREASURY = "role-treasury-minister" as RoleId;
const DEFENSE = "role-defense-minister" as RoleId;
const FOREIGN = "role-foreign-minister" as RoleId;

// A person with nothing notable about them: every reading dead center and no
// traits, so they contribute exactly zero and any movement in a test is
// attributable to whatever that test changed.
const NEUTRAL: Person = {
  ...person,
  competence: 0.5,
  loyalty: 0.5,
  ambition: 0.5,
  integrity: 0.5,
  charisma: 0.5,
  traits: [],
};

const named = (overrides: Partial<Person>): Person => ({ ...NEUTRAL, ...overrides });

describe("the opening position", () => {
  it("opens on the nation itself when nobody seated is remarkable", () => {
    const { metrics, baseline, contributions } = openingPosition(nationA, { [LEAD]: NEUTRAL }, LEAD);
    expect(contributions).toEqual([]);
    expect(metrics.stability).toBe(baseline.stability);
    expect(metrics.militaryReadiness).toBe(baseline.militaryReadiness);
    expect(metrics.standing).toBe(baseline.standing);
    expect(metrics.treasury).toBe(baseline.treasury);
  });

  it("opens on the public the nation already carries, then lets the cabinet move it", () => {
    // Not zero and not set by a seat: the baseline reads the country's own
    // resting mood (`openingApproval`), because an opening of zero would be a
    // country that despises a president who has not been sworn in. What the
    // founding cabinet does is move it from there.
    const baseline = foundingBaseline(nationA);
    expect(baseline.approval).toBeGreaterThan(0);
    expect(baseline.approval).toBeLessThan(1);
    const { metrics } = openingPosition(nationA, { [LEAD]: NEUTRAL }, LEAD);
    expect(metrics.approval).toBeGreaterThan(0);
  });

  // The whole point of the founding cabinet: who holds which chair has to be
  // worth something before the first turn, or the choice was decoration.
  it("moves the metric a chair is actually responsible for", () => {
    const strong = openingPosition(
      nationA,
      { [LEAD]: NEUTRAL, [DEFENSE]: named({ competence: 0.95 }) },
      LEAD,
    );
    const weak = openingPosition(nationA, { [LEAD]: NEUTRAL, [DEFENSE]: named({ competence: 0.05 }) }, LEAD);
    expect(strong.metrics.militaryReadiness).toBeGreaterThan(weak.metrics.militaryReadiness);
    // And not somebody else's metric.
    expect(strong.metrics.standing).toBe(weak.metrics.standing);
  });

  it("prices a Treasury Secretary against the size of the economy rather than in flat points", () => {
    const rich = { ...nationA, stats: { ...nationA.stats, economy: { ...nationA.stats.economy, gdp: 1_000_000 } } };
    const poor = { ...nationA, stats: { ...nationA.stats, economy: { ...nationA.stats.economy, gdp: 10_000 } } };
    const cabinet = { [LEAD]: NEUTRAL, [TREASURY]: named({ competence: 0.1, integrity: 0.1 }) };
    const lossRich = openingPosition(rich, cabinet, LEAD).metrics.treasury - foundingBaseline(rich).treasury;
    const lossPoor = openingPosition(poor, cabinet, LEAD).metrics.treasury - foundingBaseline(poor).treasury;
    expect(lossRich).toBeLessThan(lossPoor);
    expect(lossPoor).toBeLessThan(0);
  });

  // Budget authority is the part of an enacted appropriation the President
  // holds, and the carry share is all of it on the first morning. A secretary
  // who finds money finds it for the general fund.
  it("opens no higher than the appropriation's carry share, whatever the secretaries find", () => {
    const best = named({ competence: 1, integrity: 1 });
    const { metrics, baseline, contributions } = openingPosition(nationA, { [LEAD]: NEUTRAL, [TREASURY]: best }, LEAD);
    expect(metrics.treasury).toBe(baseline.treasury);
    const pushed = contributions.filter((entry) => entry.metric === "treasury" && entry.person !== "The appropriation");
    expect(pushed.some((entry) => entry.delta > 0)).toBe(true);
    // The bound is its own line, so the lines still add up to the reading.
    const sum = contributions.filter((entry) => entry.metric === "treasury").reduce((total, entry) => total + entry.delta, 0);
    expect(baseline.treasury + sum).toBeCloseTo(metrics.treasury, 2);
    expect(contributions.find((entry) => entry.person === "The appropriation")?.reason).toMatch(/nothing a secretary finds/);
  });

  it("lets a strong secretary cover what a corrupt colleague would lose, and no more", () => {
    const bent = named({ traits: ["corrupt"] });
    const alone = openingPosition(nationA, { [LEAD]: NEUTRAL, [DEFENSE]: bent }, LEAD);
    const covered = openingPosition(nationA, { [LEAD]: NEUTRAL, [DEFENSE]: bent, [TREASURY]: named({ competence: 1, integrity: 1 }) }, LEAD);
    expect(alone.metrics.treasury).toBeLessThan(alone.baseline.treasury);
    expect(covered.metrics.treasury).toBeGreaterThan(alone.metrics.treasury);
    expect(covered.metrics.treasury).toBeLessThanOrEqual(covered.baseline.treasury);
  });

  // Forex reserves measure an economy's ability to pay for imports, not a
  // government's ability to spend, and a reserve-currency issuer holds a
  // fraction of what a mid-power does. Reading the treasury off them handed the
  // larger economy the thinner war chest against costs that scale with GDP.
  it("opens the treasury off the economy, not off foreign-exchange reserves", () => {
    const thinReserves = { ...nationA, stats: { ...nationA.stats, economy: { ...nationA.stats.economy, reserves: 1 } } };
    expect(foundingBaseline(thinReserves).treasury).toBe(foundingBaseline(nationA).treasury);
    expect(foundingBaseline(nationA).treasury).toBeGreaterThan(0);
  });

  // A cautious treasury minister raising military readiness is the trait table
  // reaching past the ministry it belongs to. A minister acts through their own
  // portfolio; only the head of government acts across the whole of it.
  it("keeps a minister's disposition inside the portfolio they actually hold", () => {
    const { contributions } = openingPosition(
      nationA,
      { [LEAD]: NEUTRAL, ["role-treasury-minister" as RoleId]: named({ traits: ["cautious"] }) },
      LEAD,
    );
    expect(contributions.some((c) => c.metric === "militaryReadiness")).toBe(false);
    expect(contributions.some((c) => c.metric === "standing")).toBe(false);
  });

  it("still lets the head of government's disposition reach the whole of it", () => {
    const { contributions } = openingPosition(nationA, { [LEAD]: named({ traits: ["cautious"] }) }, LEAD);
    expect(contributions.some((c) => c.metric === "militaryReadiness")).toBe(true);
    expect(contributions.some((c) => c.metric === "standing")).toBe(true);
  });

  // Surfaces draw these as whole points; anything under half a point renders as
  // "+0", which is a row that names a person and says nothing.
  it("reports no movement too small to draw", () => {
    const { contributions } = openingPosition(
      nationA,
      { [LEAD]: named({ integrity: 0.53 }), [DEFENSE]: named({ competence: 0.52 }) },
      LEAD,
    );
    for (const entry of contributions) {
      const drawn = entry.metric === "treasury" ? Math.round(entry.delta) : Math.round(entry.delta * 100);
      expect(drawn, entry.reason).not.toBe(0);
    }
  });

  it("weighs the same reading heavier in the lead chair than in a ministry", () => {
    const asLeader = openingPosition(nationA, { [LEAD]: named({ traits: ["charismatic"] }) }, LEAD);
    const asMinister = openingPosition(
      nationA,
      { [LEAD]: NEUTRAL, [FOREIGN]: named({ traits: ["charismatic"] }) },
      LEAD,
    );
    expect(asLeader.metrics.standing).toBeGreaterThan(asMinister.metrics.standing);
  });

  it("lets a disposition act on its own, not only through the readings", () => {
    const hawk = openingPosition(nationA, { [LEAD]: named({ traits: ["hawkish"] }) }, LEAD);
    const dove = openingPosition(nationA, { [LEAD]: named({ traits: ["dovish"] }) }, LEAD);
    expect(hawk.metrics.militaryReadiness).toBeGreaterThan(dove.metrics.militaryReadiness);
    expect(dove.metrics.standing).toBeGreaterThan(hawk.metrics.standing);
  });

  it("costs the treasury for seating someone corrupt", () => {
    const clean = openingPosition(nationA, { [LEAD]: NEUTRAL, [TREASURY]: NEUTRAL }, LEAD);
    const bent = openingPosition(nationA, { [LEAD]: NEUTRAL, [TREASURY]: named({ traits: ["corrupt"] }) }, LEAD);
    expect(bent.metrics.treasury).toBeLessThan(clean.metrics.treasury);
    expect(bent.metrics.stability).toBeLessThan(clean.metrics.stability);
  });

  it("reads the cabinet's loyalty across the whole room, not seat by seat", () => {
    const loyal = openingPosition(
      nationA,
      { [LEAD]: NEUTRAL, [TREASURY]: named({ loyalty: 0.95 }), [DEFENSE]: named({ loyalty: 0.95 }) },
      LEAD,
    );
    const mutinous = openingPosition(
      nationA,
      { [LEAD]: NEUTRAL, [TREASURY]: named({ loyalty: 0.05 }), [DEFENSE]: named({ loyalty: 0.05 }) },
      LEAD,
    );
    expect(loyal.metrics.stability).toBeGreaterThan(mutinous.metrics.stability);
    expect(loyal.contributions.some((c) => c.person === "The cabinet")).toBe(true);
  });

  // A player who opens two points down should be able to read why, and the
  // answer has to be a person they chose.
  it("explains every point of daylight between the nation and the government", () => {
    const { contributions } = openingPosition(
      nationA,
      { [LEAD]: named({ competence: 0.9, traits: ["corrupt"] }), [DEFENSE]: named({ competence: 0.2 }) },
      LEAD,
    );
    expect(contributions.length).toBeGreaterThan(0);
    for (const entry of contributions) {
      expect(entry.reason.length).toBeGreaterThan(20);
      expect(entry.delta).not.toBe(0);
      expect(entry.person.length).toBeGreaterThan(0);
    }
  });

  it("cannot be pushed out of range by an unusually good or bad slate", () => {
    const best = named({ competence: 1, integrity: 1, charisma: 1, loyalty: 1, traits: ["principled", "charismatic"] });
    const worst = named({ competence: 0, integrity: 0, charisma: 0, loyalty: 0, traits: ["corrupt", "reclusive"] });
    for (const who of [best, worst]) {
      const { metrics } = openingPosition(
        nationA,
        { [LEAD]: who, [TREASURY]: who, [DEFENSE]: who, [FOREIGN]: who },
        LEAD,
      );
      for (const key of ["stability", "militaryReadiness", "standing", "approval"] as const) {
        expect(metrics[key], key).toBeGreaterThanOrEqual(0);
        expect(metrics[key], key).toBeLessThanOrEqual(1);
      }
      expect(metrics.treasury).toBeGreaterThanOrEqual(0);
    }
  });
});

// The superpower the metric ceiling was found on: a great power holding
// capability figures near the top of every scale. Under the old mapping this
// opened at stability 0.91, readiness 0.92 and standing 1.00 — three of four
// headline readings pinned, with standing physically unable to rise.
const superpower: Nation = {
  ...nationA,
  stats: {
    ...nationA.stats,
    military: { ...nationA.stats.military, readiness: 0.85 },
    politics: { ...nationA.stats.politics, regimeStability: 0.75 },
    softPower: { ...nationA.stats.softPower, diplomaticReach: 0.95 },
  },
  bands: { ...nationA.bands, archetype: "great-power", powerTier: 5, wealthTier: 5, militaryTier: 5 },
};

describe("what the readings are a reading of", () => {
  it("opens every performance metric with room in both directions, at any tier", () => {
    // The invariant this test exists for. A president's panel reports how well
    // the office is being held, so a government that inherits a strong country
    // and a government that inherits an ordinary one both start somewhere they
    // can climb from and fall from. Capability copied straight across cannot do
    // this: at the top of the roster it has nowhere left to go.
    for (const [label, nation] of [["superpower", superpower], ["mid-power", nationA]] as const) {
      const { metrics } = openingPosition(nation, { [LEAD]: NEUTRAL }, LEAD);
      for (const key of ["stability", "militaryReadiness", "standing"] as const) {
        expect(metrics[key], `${label} ${key} has room to fall`).toBeGreaterThan(0.15);
        expect(metrics[key], `${label} ${key} has room to rise`).toBeLessThan(0.85);
      }
    }
  });

  it("reads a strong inheritance as credit rather than as a full mark", () => {
    const strong = openingPosition(superpower, { [LEAD]: NEUTRAL }, LEAD).metrics;
    const ordinary = openingPosition(nationA, { [LEAD]: NEUTRAL }, LEAD).metrics;
    // Diplomatic reach of 0.95 is normal for a great power and remarkable for a
    // middle one, so the two do not open in the same place — but neither of them
    // opens pinned.
    expect(strong.standing).toBeGreaterThan(0.5);
    expect(strong.standing).toBeLessThan(0.75);
    expect(ordinary.standing).toBeLessThan(strong.standing);
  });

  it("gives every point of daylight a reason a player can read", () => {
    const { baseline, expectations } = openingPosition(superpower, { [LEAD]: NEUTRAL }, LEAD);
    expect(expectations.map((entry) => entry.metric).sort()).toEqual(["militaryReadiness", "stability", "standing"]);
    for (const entry of expectations) {
      expect(entry.reason.length, entry.metric).toBeGreaterThan(0);
      expect(baseline[entry.metric], entry.metric).toBe(entry.opening);
      // The account has to be complete enough to reconstruct the reading, or it
      // is a sentence beside a number rather than the reason for it.
      expect(entry.held).not.toBe(entry.opening);
      expect(entry.expected).toBeGreaterThan(0);
    }
  });
});
