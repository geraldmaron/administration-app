import { describe, expect, it, vi } from "vitest";
import { CHARTER_USA_CONSTITUTION, type RoleId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { timesOverruled } from "./loyalty.js";
import { OBJECTION_CHALLENGE_FACTOR, REVIEW_REACH_FLOOR, certifyOrder, certifyTerms, reviewOrder } from "./order-review.js";
import { executiveOrder, projectOrder, signOrder } from "./orders.js";
import { createRngStreams } from "./rng.js";
import type { Campaign, PersonRuntime, Pursuit } from "./state.js";
import { QUESTION_TERMS, willDraw } from "./willingness.js";

// A pass-through spy, so a test can prove the review never reaches the one draw.
vi.mock("./willingness.js", async (original) => {
  const actual = await original<typeof import("./willingness.js")>();
  return { ...actual, willDraw: vi.fn(actual.willDraw) };
});

const AG = "role-attorney-general" as RoleId;
const CHARTER = CHARTER_USA_CONSTITUTION;
const founded = foundedForBalance("order-review").campaign;
const ENTRY = executiveOrder("order-entry-suspension")!;

function withEntryFinding(campaign: Campaign): { campaign: Campaign; subject: { kind: "entry-class"; nation: Campaign["founding"]["nation"]; pursuitId: string } } {
  const nation = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation)! as Campaign["founding"]["nation"];
  const pursuit: Pursuit = { id: `pursuit:entry:${nation}`, actor: nation, target: campaign.founding.nation,
    aim: "security", openedTurn: campaign.turn, commitment: 0.7, progress: 0.2,
    rungReached: 2, overt: true, lastActedTurn: campaign.turn, status: "active", beats: [] };
  return { campaign: { ...campaign, pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit } },
    subject: { kind: "entry-class", nation, pursuitId: pursuit.id } };
}

function withAg(campaign: Campaign, base: Partial<PersonRuntime["base"]>): Campaign {
  const id = campaign.player.cabinet[AG]!;
  const runtime = campaign.people[id]!;
  return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}

// Two Attorneys General a long way apart on the two things the review reads.
const principled = withAg(founded, { integrity: 0.95, loyalty: 0.35, traits: ["principled"] });
const deferent = withAg(founded, { integrity: 0.4, loyalty: 0.95, traits: ["loyal", "pragmatic"] });

describe("the Attorney General's review of an order", () => {
  it("objects where a principled Attorney General sits, and clears where a deferent one does", () => {
    expect(projectOrder(principled, CHARTER, ENTRY).review?.objects).toBe(true);
    expect(projectOrder(deferent, CHARTER, ENTRY).review?.objects).toBe(false);
  });

  it("raises the odds of a challenge by the objection's own factor, and only by that", () => {
    const objecting = projectOrder(principled, CHARTER, ENTRY);
    const cleared = projectOrder(deferent, CHARTER, ENTRY);
    expect(objecting.challengeChance).toBeCloseTo(cleared.challengeChance * OBJECTION_CHALLENGE_FACTOR, 9);
  });

  it("leaves ordinary business unreviewed", () => {
    const routine = executiveOrder("order-regulatory-review")!;
    expect(routine.overreach).toBeLessThan(REVIEW_REACH_FLOOR);
    expect(projectOrder(principled, CHARTER, routine).review).toBeUndefined();
  });

  it("has no reviewer in a charter without an ownership table", () => {
    const generic = buildCampaign();
    expect(reviewOrder(generic, ENTRY, { reach: 0.4, accumulated: 0, ground: "silent" })).toBeUndefined();
  });

  it("leaves deference out when the order is the Justice Department's own to carry out", () => {
    const grants = executiveOrder("order-grant-conditions")!;
    const own = projectOrder(principled, CHARTER, grants).review!;
    expect(own.decision.terms.map((term) => term.key)).not.toContain("deference");
    expect(projectOrder(principled, CHARTER, ENTRY).review!.decision.terms.map((term) => term.key)).toContain("deference");
  });

  it("reads a statute behind the order as a defense, and a record of contested orders against it", () => {
    const ag = principled.people[principled.player.cabinet[AG]!]!.base;
    const silent = certifyOrder(ag, { reach: 0.3, accumulated: 0, ground: "silent" }, false);
    const authorized = certifyOrder(ag, { reach: 0.3, accumulated: 0, ground: "authorized" }, false);
    const refused = certifyOrder(ag, { reach: 0.3, accumulated: 0.24, ground: "silent" }, false);
    expect(authorized.score).toBeGreaterThan(silent.score);
    expect(refused.score).toBeLessThan(silent.score);
  });
});

describe("signing over an objection", () => {
  it("puts the Attorney General on the record against, stamped public, and the room counts it", () => {
    const { campaign, subject } = withEntryFinding(principled);
    const result = signOrder(campaign, CHARTER, ENTRY.id, createRngStreams(campaign.seed), subject);
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.counsel).toEqual({ role: AG, person: principled.player.cabinet[AG], stance: "against" });
    const stamp = result.packet.provenance?.decision;
    expect(stamp?.question).toBe("certify-order");
    expect(stamp?.visibility).toBe("public");
    expect(stamp?.acts).toBe(false);
    for (const term of stamp!.terms) expect(QUESTION_TERMS["certify-order"]).toContain(term.key);
    const after = apply(campaign, result.packet);
    expect(timesOverruled(after, AG, principled.turn)).toBe(1);
  });

  it("writes no counsel when the order is cleared, so signing cannot buy the room's loyalty", () => {
    const { campaign, subject } = withEntryFinding(deferent);
    const result = signOrder(campaign, CHARTER, ENTRY.id, createRngStreams(campaign.seed), subject);
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.counsel).toBeUndefined();
    expect(timesOverruled(apply(campaign, result.packet), AG, deferent.turn)).toBe(0);
  });
});

describe("the review is a projection", () => {
  it("gives the same answer twice and on a cloned campaign, and draws nothing", () => {
    vi.mocked(willDraw).mockClear();
    const once = projectOrder(principled, CHARTER, ENTRY).review;
    const twice = projectOrder(principled, CHARTER, ENTRY).review;
    const clone = projectOrder(structuredClone(principled), CHARTER, ENTRY).review;
    expect(twice).toEqual(once);
    expect(clone).toEqual(once);
    expect(vi.mocked(willDraw)).not.toHaveBeenCalled();
  });

  it("moves one way along each axis it reads", () => {
    const base = principled.people[principled.player.cabinet[AG]!]!.base;
    const input = { reach: 0.3, accumulated: 0, ground: "silent" as const };
    const score = (over: Partial<typeof base>) => certifyOrder({ ...base, traits: [], ...over }, input, false).score;
    // Principle: more integrity, less willing to clear.
    expect(score({ integrity: 0.9 })).toBeLessThan(score({ integrity: 0.5 }));
    // Deference: more loyalty, more willing to clear.
    expect(score({ loyalty: 0.9 })).toBeGreaterThan(score({ loyalty: 0.5 }));
    expect(certifyTerms(base, input, false).every((term) => Number.isFinite(term.value))).toBe(true);
  });
});
