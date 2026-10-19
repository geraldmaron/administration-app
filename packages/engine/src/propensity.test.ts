import { describe, expect, it } from "vitest";
import { Nation } from "@admin/world";
import { nationA } from "./__fixtures__/campaign.js";
import { coercionPropensity, exposureTo, leverageOver, propensityFor } from "./propensity.js";

type Economy = {
  readonly id: string;
  readonly balance?: number;
  readonly exports?: number;
  readonly importDependence?: number;
  readonly dependsOn?: Record<string, number>;
  readonly opportunism?: number;
};

function economy(over: Economy): Nation {
  return Nation.parse({
    ...nationA,
    id: over.id,
    identity: { ...nationA.identity, name: `Nation ${over.id}` },
    stats: {
      ...nationA.stats,
      trade: {
        ...nationA.stats.trade,
        exports: over.exports ?? 10_000,
        balance: over.balance ?? 0,
        tradeDependence: over.dependsOn ?? {},
      },
      energy: { ...nationA.stats.energy, importDependence: over.importDependence ?? 0.2 },
    },
    traits: { ...nationA.traits, opportunism: over.opportunism ?? 0.4 },
  });
}

type Force = {
  readonly id: string;
  readonly neighbors?: readonly string[];
  readonly posture?: "defensive" | "balanced" | "assertive" | "expansionist";
  readonly redLine?: string;
  readonly corruption?: number;
  readonly borderControl?: number;
  readonly factionalism?: number;
  readonly intel?: number;
};

function force(over: Force): Nation {
  return Nation.parse({
    ...nationA,
    id: over.id,
    identity: { ...nationA.identity, name: `Nation ${over.id}` },
    geo: { ...nationA.geo, neighbors: over.neighbors ?? [] },
    doctrine: {
      ...nationA.doctrine,
      posture: over.posture ?? "defensive",
      redLines: over.redLine ? [{ id: over.redLine, description: "A line this government has drawn." }] : [],
    },
    stats: {
      ...nationA.stats,
      trade: { ...nationA.stats.trade, tradeDependence: {} },
      security: {
        ...nationA.stats.security,
        corruptionIndex: over.corruption ?? 0.3,
        borderControl: over.borderControl ?? 0.7,
        intelCapability: over.intel ?? 0.5,
      },
      politics: { ...nationA.stats.politics, factionalism: over.factionalism ?? 0.3 },
    },
  });
}

describe("what an economy says about reaching for the economy", () => {
  it("reads a surplus as leverage and a deficit as none", () => {
    expect(coercionPropensity(economy({ id: "SUR", balance: 5_000 })).mercantilist).toBeCloseTo(0.5);
    // Not negative: a country that buys more than it sells simply has nothing
    // to withhold. It does not have anti-leverage.
    expect(coercionPropensity(economy({ id: "DEF", balance: -5_000 })).mercantilist).toBe(0);
  });

  it("scales the surplus against what the country actually sells", () => {
    const small = coercionPropensity(economy({ id: "SML", balance: 1_000, exports: 2_000 }));
    const large = coercionPropensity(economy({ id: "LRG", balance: 1_000, exports: 900_000 }));
    expect(small.mercantilist).toBeGreaterThan(large.mercantilist);
  });

  it("reads self-sufficiency off energy and trade together", () => {
    const alone = coercionPropensity(economy({ id: "ALN", importDependence: 0, dependsOn: {} }));
    const tied = coercionPropensity(economy({ id: "TIE", importDependence: 0.9, dependsOn: { ALP: 0.9 } }));
    expect(alone.autarkic).toBe(1);
    expect(tied.autarkic).toBeLessThan(0.2);
  });

  it("makes the surplus exporter that needs nobody the readiest to sanction", () => {
    const strong = coercionPropensity(economy({ id: "STR", balance: 9_000, importDependence: 0, dependsOn: {} }));
    const weak = coercionPropensity(economy({ id: "WEK", balance: -3_000, importDependence: 0.9, dependsOn: { X: 0.9 } }));
    expect(strong.sanctionProne).toBeGreaterThan(weak.sanctionProne);
  });
});

describe("leverage runs in one direction at a time", () => {
  const actor = economy({ id: "ACT", dependsOn: { TGT: 0.1 } });
  const target = economy({ id: "TGT", dependsOn: { ACT: 0.8 } });

  it("counts what the target would lose, not what the actor sells generally", () => {
    expect(leverageOver(actor, target)).toBeCloseTo(0.8);
    expect(leverageOver(target, actor)).toBeCloseTo(0.1);
  });

  it("counts the actor's own exposure separately", () => {
    expect(exposureTo(actor, target)).toBeCloseTo(0.1);
  });
});

describe("what the agent reads off it", () => {
  it("finds sanctions obvious against a customer that cannot replace you", () => {
    const actor = economy({ id: "ACT", balance: 8_000, importDependence: 0.1, dependsOn: {} });
    const target = economy({ id: "TGT", dependsOn: { ACT: 0.9 } });
    expect(propensityFor("economic", actor, target)).toBeGreaterThan(0.4);
  });

  it("finds them a way to hurt yourself when the dependence runs the other way", () => {
    const actor = economy({ id: "ACT", balance: -4_000, importDependence: 0.8, dependsOn: { TGT: 0.9 } });
    const target = economy({ id: "TGT", dependsOn: {} });
    expect(propensityFor("economic", actor, target)).toBeLessThan(0);
  });

  it("says nothing at all about sanctioning a country that would not notice", () => {
    // Leverage multiplies rather than adds: an appetite for economic coercion
    // is not a reason to use it where it lands on nobody.
    const eager = economy({ id: "EGR", balance: 9_000, importDependence: 0, dependsOn: {} });
    const indifferent = economy({ id: "IND", dependsOn: {} });
    expect(propensityFor("economic", eager, indifferent)).toBe(0);
  });

  it("makes a state slower to shoot the supplier it cannot do without", () => {
    const dependent = economy({ id: "DEP", dependsOn: { TGT: 0.8 } });
    const target = economy({ id: "TGT", dependsOn: {} });
    expect(propensityFor("military", dependent, target)).toBeLessThan(0);
  });

  it("is silent about the one instrument no position makes more available", () => {
    const actor = economy({ id: "ACT", balance: 9_000, dependsOn: { TGT: 0.9 } });
    const target = economy({ id: "TGT", dependsOn: { ACT: 0.9 } });
    expect(propensityFor("diplomatic", actor, target)).toBe(0);
  });
});

describe("what geography and doctrine say about reaching for force", () => {
  it("gives a neighbor a case where a stranger has none", () => {
    const target = force({ id: "TGT" });
    const neighbor = force({ id: "NBR", neighbors: ["TGT"] });
    const distant = force({ id: "DST" });
    expect(propensityFor("military", neighbor, target)).toBeGreaterThan(propensityFor("military", distant, target));
  });

  it("adds the border a government has drawn one of its own lines around", () => {
    const target = force({ id: "TGT" });
    const quiet = force({ id: "QUI", neighbors: ["TGT"], redLine: "sovereign-development" });
    const disputed = force({ id: "DIS", neighbors: ["TGT"], redLine: "kashmir-status" });
    expect(propensityFor("military", disputed, target)).toBeGreaterThan(propensityFor("military", quiet, target));
  });

  it("reads the posture the nation declares, at any distance", () => {
    const target = force({ id: "TGT" });
    const defensive = force({ id: "DEF", posture: "defensive" });
    const expansionist = force({ id: "EXP", posture: "expansionist" });
    expect(propensityFor("military", defensive, target)).toBe(0);
    expect(propensityFor("military", expansionist, target)).toBeGreaterThan(0.3);
  });

  it("is never simply a penalty the way it used to be", () => {
    const target = force({ id: "TGT" });
    const assertive = force({ id: "ASR", neighbors: ["TGT"], posture: "assertive", redLine: "kashmir-status" });
    expect(propensityFor("military", assertive, target)).toBeGreaterThan(0);
  });
});

describe("what the inside of a country says about running an operation there", () => {
  it("prefers the country with something to work with", () => {
    const open = force({ id: "OPN", corruption: 0.8, borderControl: 0.2, factionalism: 0.8 });
    const shut = force({ id: "SHT", corruption: 0.05, borderControl: 0.95, factionalism: 0.05 });
    const actor = force({ id: "ACT", intel: 0.9 });
    expect(propensityFor("covert", actor, open)).toBeGreaterThan(propensityFor("covert", actor, shut));
  });

  it("says nothing to a government with no service to run it with", () => {
    const open = force({ id: "OPN", corruption: 0.8, borderControl: 0.2, factionalism: 0.8 });
    expect(propensityFor("covert", force({ id: "NON", intel: 0 }), open)).toBe(0);
  });
});
