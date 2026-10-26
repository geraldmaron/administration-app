import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { EXECUTIVE_ORDERS, executiveOrder, projectOrder, signOrder } from "./orders.js";
import { filingOdds, selectLegalExposures, stateInjuries, CHARGE_CHANCE, REMOVAL_FILING_WEEKS, REMOVAL_REINSTATEMENT_CHANCE } from "./legal-exposure.js";
import { removeOfficer } from "./career-incumbents.js";
import { ORDER_EXPOSURE } from "./order-exposure.js";
import { strikeDownChance } from "./strike-odds.js";
import type { RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import type { OversightMatter } from "./oversight.js";
import { LOCALE_MISSION_ORDERS } from "./locale-mission-orders.js";
import type { OrderSubject } from "./order-subjects.js";

const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;
const filed = { stream: () => ({ next: () => 0, nextInt: (min: number) => min }) } as unknown as RngStreams;
const founded = () => foundedForBalance("legal-exposure").campaign;

describe("filing is a separate question from the merits", () => {
  it("names an exposure for every order in the catalogue", () => {
    expect(EXECUTIVE_ORDERS.map((order) => order.id).filter((id) => !ORDER_EXPOSURE[id])).toEqual([]);
  });

  it("sues a loud, lawful order more often than a court would strike it, and a quiet one rarely", () => {
    const campaign = founded();
    const border = projectOrder(campaign, CHARTER, executiveOrder("order-border-controls")!);
    const review = projectOrder(campaign, CHARTER, executiveOrder("order-regulatory-review")!);
    expect(border.challengeChance).toBeGreaterThan(border.meritsChance);
    expect(review.challengeChance).toBeLessThan(border.challengeChance / 3);
  });

  it("does not read lawfulness: an order that reaches further is not sued more for that alone", () => {
    const campaign = founded();
    const order = executiveOrder("order-border-controls")!;
    const reaching = { ...order, overreach: 0.9 };
    expect(filingOdds(campaign, reaching).chance).toBe(filingOdds(campaign, order).chance);
    expect(strikeDownChance(CHARTER, reaching)).toBeGreaterThan(strikeDownChance(CHARTER, order));
  });

  it("reads state injury off who the order lands on, strongest state first", () => {
    const campaign = founded();
    const injuries = stateInjuries(campaign, executiveOrder("order-border-controls")!);
    const ranked = Object.entries(injuries).sort((a, b) => b[1]! - a[1]!);
    expect(ranked[0]![1]).toBe(1);
    expect(injuries.CA ?? 0).toBeGreaterThan(injuries.WV ?? 0);
    expect(stateInjuries(campaign, executiveOrder("order-asset-seizure")!)).toEqual({});
  });
});

describe("one origin per dispute", () => {
  function signedTwice(): Campaign {
    let campaign = founded();
    for (const id of ["order-border-controls", "order-clean-energy"]) {
      const result = signOrder(campaign, CHARTER, id, filed);
      if (!result.ok) throw new Error(result.reason);
      campaign = apply(campaign, result.packet);
    }
    return campaign;
  }

  it("keeps one exposure per signed order, linking its proceeding once", () => {
    const campaign = signedTwice();
    const exposures = selectLegalExposures(campaign, executiveOrder).filter((entry) => entry.origin.kind === "executive-order");
    expect(exposures).toHaveLength(campaign.orders.length);
    expect(new Set(exposures.map((entry) => entry.id)).size).toBe(exposures.length);
    const representations = exposures.flatMap((entry) => entry.representations);
    expect(new Set(representations).size).toBe(representations.length);
    expect(exposures.every((entry) => entry.authority !== "uncited")).toBe(true);
    expect(exposures.find((entry) => entry.origin.kind === "executive-order" && entry.origin.orderId === "order-border-controls")?.status).toBe("filed");
  });

  it("treats a public misconduct finding as a referral that prosecutors decide later, not an indictment", () => {
    const campaign = founded();
    const matter: OversightMatter = { id: "matter:ig:test:1", causeId: "event:graft:1", origin: { kind: "inspector-general", institution: "INST-DOJ" as never },
      direction: "received", subject: "Contract steering", openedTurn: campaign.turn, stage: "reported", public: true,
      obstructed: false, beats: [{ turn: campaign.turn, description: "The finding is public." }], finding: "Contracts were steered." };
    const withMatter = { ...campaign, oversight: { ...campaign.oversight, matters: [matter] } };
    const now = selectLegalExposures(withMatter, executiveOrder).find((entry) => entry.origin.kind === "misconduct")!;
    expect(now.status).toBe("referred");
    expect(now.filingChance).toBe(CHARGE_CHANCE);
    const later = selectLegalExposures({ ...withMatter, turn: withMatter.turn + 60 }, executiveOrder).find((entry) => entry.origin.kind === "misconduct")!;
    expect(["charged", "declined"]).toContain(later.status);
  });
});

describe("a removal from a contested seat is a legal exposure", () => {
  function removed(id: string): Campaign {
    const campaign = founded();
    const result = removeOfficer(campaign, id);
    if (!result.ok) throw new Error(result.reason);
    return apply(campaign, result.packet);
  }

  it("opens one exposure per removal, priced in the administration's favor and citing Slaughter", () => {
    const after = removed("INST-SEC");
    const exposures = selectLegalExposures(after, executiveOrder).filter((entry) => entry.origin.kind === "removal");
    expect(exposures).toHaveLength(1);
    expect(exposures[0]!.status).toBe("exposed");
    expect(exposures[0]!.meritsChance).toBe(REMOVAL_REINSTATEMENT_CHANCE);
    expect(exposures[0]!.meritsChance!).toBeLessThan(0.5);
    expect(exposures[0]!.authority).toMatch(/Trump v\. Slaughter/);
    const later = selectLegalExposures({ ...after, turn: after.turn + REMOVAL_FILING_WEEKS.max }, executiveOrder)
      .find((entry) => entry.origin.kind === "removal")!;
    expect(["filed", "declined"]).toContain(later.status);
  });

  it("opens none for an at-will commission", () => {
    expect(selectLegalExposures(removed("INST-FTC"), executiveOrder).filter((entry) => entry.origin.kind === "removal")).toEqual([]);
  });
});

describe("the subject being signed decides who is injured", () => {
  const pentagon = { kind: "federal-site" as const, institutionId: "INST-DOD" };
  // A Republican President and a Democratic-leaning Virginia: its elected attorney general opposes the order.
  const opposedVirginia = (): Campaign => {
    const campaign = founded();
    return { ...campaign, congress: { ...campaign.congress, administrationParty: "republican", caucusAnchor: "republican" },
      states: { ...campaign.states, VA: { ...campaign.states.VA!, lean: -0.4 } } };
  };

  it("resolves a protected federal building to the state it stands in", () => {
    const order = executiveOrder("order-force-protection")!;
    expect(stateInjuries(founded(), order, pentagon)).toEqual({ VA: 1 });
    expect(stateInjuries(founded(), order)).toEqual({});
  });

  it("lets that state's attorney general raise the chance of a suit only when the subject is known", () => {
    const campaign = opposedVirginia();
    const order = executiveOrder("order-force-protection")!;
    const withSite = filingOdds(campaign, order, pentagon);
    expect(withSite.states[0]?.stateId).toBe("VA");
    expect(withSite.chance).toBeGreaterThan(filingOdds(campaign, order).chance);
    expect(projectOrder(campaign, CHARTER, order, pentagon).filing.chance).toBe(withSite.chance);
  });

  it("rolls the signature against the subject-aware chance it projected", () => {
    const campaign = opposedVirginia();
    const order = executiveOrder("order-force-protection")!;
    const result = signOrder(campaign, CHARTER, order.id, filed, pentagon);
    if (!result.ok) throw new Error(result.reason);
    const projected = projectOrder(campaign, CHARTER, order, pentagon).challengeChance;
    expect(result.record.challengeChance).toBe(projected);
    expect(result.projection.filing.states[0]?.stateId).toBe("VA");
  });
});

describe("a federal mission in one state exposes that state", () => {
  const mission = (act: "federalize" | "troops" | "property-surge", state = "MN"): OrderSubject =>
    ({ kind: "locale-mission", state: state as never, act });

  it("names an exposure row for every mission order", () => {
    for (const order of LOCALE_MISSION_ORDERS) expect(ORDER_EXPOSURE[order.id], order.id).toBeDefined();
  });

  it("injures only the state the mission is in, and none when the mission names no state", () => {
    const campaign = founded();
    const guard = executiveOrder("order-guard-federalization")!;
    expect(stateInjuries(campaign, guard, mission("federalize"))).toEqual({ MN: 1 });
    expect(stateInjuries(campaign, guard, mission("federalize", "WI"))).toEqual({ WI: 1 });
    expect(stateInjuries(campaign, guard)).toEqual({});
  });

  it("lets the state sue over troops and the Guard but not over a proclamation or a task force", () => {
    const campaign = founded();
    const sued = (id: string, subject: OrderSubject) => filingOdds(campaign, executiveOrder(id)!, subject).states.map((entry) => entry.stateId);
    expect(sued("order-guard-federalization", mission("federalize"))).toContain("MN");
    expect(sued("order-insurrection-enforcement", mission("troops"))).toContain("MN");
    expect(sued("order-insurrection-proclamation", mission("troops"))).toEqual([]);
    expect(sued("order-joint-task-force", mission("troops"))).toEqual([]);
  });

  it("sues over the troops more than over the task force, which is the quieter mission", () => {
    const campaign = founded();
    const chance = (id: string) => filingOdds(campaign, executiveOrder(id)!, mission("troops")).chance;
    expect(chance("order-insurrection-enforcement")).toBeGreaterThan(chance("order-joint-task-force"));
  });
});
