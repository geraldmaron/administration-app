import { describe, expect, it } from "vitest";
import { US_ID, worldDataset } from "@admin/world";
import { COST_JITTER, anchorInWorldDollars, costMultiplier, financialCost, financialCenterForUs, jitterTreasury } from "./scenario-cost.js";
import { auditFinancialBasis } from "./scenario-audit-cost.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import type { ScenarioDef } from "./scenario.js";

const us = worldDataset.nations.find((nation) => nation.id === US_ID)!;
const keys = Array.from({ length: 4000 }, (_, index) => `seed-${index}|scenario|reply|12`);

describe("anchors carried to the world's dollars", () => {
  it("carries a 2013 appropriation forward by CPI-U", () => {
    // Sandy's $50.5 billion at 2013 prices is about $71.9 billion at 2026's.
    expect(anchorInWorldDollars("sandy-supplemental")).toBeCloseTo(71907, -1);
  });

  it("refuses an anchor the table does not carry", () => {
    expect(() => anchorInWorldDollars("no-such-anchor")).toThrow("no anchor");
  });
});

describe("the draw around a price", () => {
  it("is the same for the same occurrence, so a replay costs what it cost", () => {
    expect(costMultiplier("a|b|c|3", COST_JITTER.bandSpread)).toBe(costMultiplier("a|b|c|3", COST_JITTER.bandSpread));
  });

  it("differs between campaigns, so no two programs cost the same", () => {
    const draws = new Set(keys.slice(0, 50).map((key) => costMultiplier(key, COST_JITTER.bandSpread)));
    expect(draws.size).toBe(50);
  });

  it("is the center itself when there is no occurrence to draw for", () => {
    expect(costMultiplier(undefined, COST_JITTER.bandSpread)).toBe(1);
  });

  it("lands over the center more often than under it, and inside its bounds", () => {
    const draws = keys.map((key) => costMultiplier(key, COST_JITTER.bandSpread));
    const over = draws.filter((draw) => draw > 1).length / draws.length;
    expect(over).toBeGreaterThan(0.55);
    expect(over).toBeLessThan(0.7);
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(COST_JITTER.floor);
    expect(Math.max(...draws)).toBeLessThanOrEqual(COST_JITTER.ceiling);
    const sorted = [...draws].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]!).toBeCloseTo(Math.exp(COST_JITTER.overrunBias), 1);
  });

  it("spreads a stated basis less than a band", () => {
    const spread = (values: readonly number[]) => {
      const logs = values.map(Math.log);
      const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
      return Math.sqrt(logs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / logs.length);
    };
    expect(spread(keys.map((key) => costMultiplier(key, COST_JITTER.basisSpread)))).toBeLessThan(
      spread(keys.map((key) => costMultiplier(key, COST_JITTER.bandSpread))),
    );
  });
});

describe("a reply that states its own arithmetic", () => {
  const basis = { quantity: 400, unit: "drivers", unitCostUSD: 630, weeks: 26, source: "planning value: 3 unpaid hours a day, 5 days, at 42 an hour" };

  it("is priced as quantity times unit cost times weeks, not from the band", () => {
    const amount = financialCost({ financial: { scale: "supplemental", basis } }, us)!;
    expect(amount / us.stats.economy.costOfLiving).toBeCloseTo((400 * 630 * 26) / 1_000_000, 6);
  });

  it("is drawn around that figure with the basis spread", () => {
    const center = financialCost({ financial: { scale: "supplemental", basis } }, us)!;
    const drawn = financialCost({ financial: { scale: "supplemental", basis } }, us, { key: "seed|week" })!;
    expect(drawn / center).toBeCloseTo(costMultiplier("seed|week", COST_JITTER.basisSpread), 12);
  });
});

describe("a reply's own authored obligation", () => {
  it("lands near what the writer typed, at cents of a million, the same on a replay", () => {
    const drawn = jitterTreasury(-20, "seed|scenario|reply|4");
    expect(drawn).toBe(jitterTreasury(-20, "seed|scenario|reply|4"));
    expect(drawn).toBeLessThan(-10);
    expect(drawn).toBeGreaterThan(-50);
    expect(Math.round(drawn * 100) / 100).toBe(drawn);
  });

  it("is left as written with no occurrence to draw for, and zero stays zero", () => {
    expect(jitterTreasury(-20, undefined)).toBe(-20);
    expect(jitterTreasury(0, "seed")).toBe(0);
  });

  it("stops ending in zero across campaigns", () => {
    const round = keys.slice(0, 200).filter((key) => jitterTreasury(-20, key) % 1 === 0).length;
    expect(round).toBeLessThan(10);
  });
});

describe("the audit of a stated basis", () => {
  const withFinancial = (financial: object): ScenarioDef => {
    const def = FIXTURE_SCENARIOS.find((candidate) => candidate.replies.some((reply) => reply.commitment.kind === "position"))!;
    const index = def.replies.findIndex((reply) => reply.commitment.kind === "position");
    const reply = def.replies[index]!;
    const commitment = { ...reply.commitment, impact: { financial } };
    return { ...def, severity: "routine", replies: def.replies.map((entry, at) => (at === index ? ({ ...reply, commitment } as typeof reply) : entry)) };
  };
  const findingsFor = (def: ScenarioDef) => {
    const findings: ScenarioFinding[] = [];
    auditFinancialBasis(def, findings);
    return findings;
  };
  const drivers = { quantity: 400, unit: "drivers", unitCostUSD: 630, weeks: 26, source: "planning value: unpaid waiting hours at a rate" };

  it("warns when the stated money is an order of magnitude from its band, and names the nearer band", () => {
    const findings = findingsFor(withFinancial({ scale: "supplemental", basis: { ...drivers, coverage: "Counts driver compensation only; excludes port capital works and state costs." } }));
    expect(findings.map((finding) => finding.kind)).toEqual(["financial-basis-off-band"]);
    expect(findings[0]!.message).toContain('"discretionary"');
  });

  it("is quiet when the basis sits near its band's anchor", () => {
    expect(findingsFor(withFinancial({ scale: "discretionary", basis: { ...drivers, coverage: "Counts driver compensation only; excludes port capital works and state costs." } }))).toEqual([]);
  });

  it("refuses a basis that says what the money is for but not how it is authorized", () => {
    expect(findingsFor(withFinancial({ basis: { ...drivers, coverage: "Counts driver compensation only; excludes port capital works and state costs." } })).map((finding) => finding.kind)).toEqual(["financial-basis-without-band"]);
  });
});


it("adds independently sourced federal components without silently treating a grant as the whole cost", () => {
  const impact = { financial: { scale: "supplemental" as const, basis: { quantity: 2000, unit: "placements", unitCostUSD: 2275,
    source: "Published per-person placement grant; illustrative test inputs", coverage: "Includes the placement grant and the independently priced health component; excludes state spending.",
    components: [{ label: "Health component", quantity: 2000, unit: "screenings", unitCostUSD: 500, source: "Explicit planning assumption for the regression fixture" }] } } };
  expect(financialCost(impact, us)).toBeCloseTo(5.55 * us.stats.economy.costOfLiving, 8);
  expect(financialCenterForUs(impact, "serious")).toBeCloseTo(5.55, 8);
  const def = FIXTURE_SCENARIOS.find((candidate) => candidate.replies.some((reply) => reply.commitment.kind === "position"))!;
  const incomplete = { ...def, replies: def.replies.map((reply) => reply.commitment.kind === "position" ? { ...reply,
    commitment: { ...reply.commitment, impact: { financial: { ...impact.financial, basis: { ...impact.financial.basis, coverage: undefined } } } } } : reply) };
  const findings: ScenarioFinding[] = [];
  auditFinancialBasis(incomplete, findings);
  expect(findings.some((finding) => finding.kind === "financial-basis-incomplete" && finding.severity === "error")).toBe(true);
});
