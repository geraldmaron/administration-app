/**
 * A war's pull on whether people feel safe: a rally that fades, the unease of
 * a hot front, and the dead on a log scale, tested at two casualty bands.
 */
import { approvalFor } from "./opinion.js";
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { issueForceAuthorization, resolveDueAuthorizations } from "./force-authorization.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { atCampaignTurn, withWeeksElapsed } from "./__fixtures__/campaign.js";
import {
  CASUALTY_CAP,
  RALLY,
  WAR_UNEASE,
  casualtyCost,
  rallyFatigueFactor,
  rallyFor,
  warOpinionTerms,
  warSecurityContribution,
  warSecurityDetail,
} from "./opinion-war.js";
import { selectOpinionCauses } from "./opinion.js";
import type { Campaign, Conflict, WarLossBand } from "./state.js";

const IRN = "IRN" as NationId;
const { campaign: BARE } = foundedForBalance("opinion-war", "democrat", {}, { carriedWorld: false });

function atWar(campaign: Campaign, casualties?: WarLossBand, weeksIn = 0): Campaign {
  const war: Conflict = {
    ...openConflict(campaign.founding.nation, IRN, campaign.turn - weeksIn, "A test war."),
    intensity: 0.5,
    ...(casualties ? { casualties: { aggressor: casualties } } : {}),
  };
  return { ...campaign, conflicts: { [war.id]: war } };
}

describe("the rally", () => {
  it("peaks in the first week and halves over its half-life, smaller and shorter for a war this government opened", () => {
    const launched = openConflict("USA" as NationId, IRN, 10, "A test war.");
    expect(rallyFor(launched, 10, "USA" as NationId)).toBeCloseTo(RALLY.launched.valence, 9);
    expect(rallyFor(launched, 10 + RALLY.launched.halfLifeWeeks, "USA" as NationId)).toBeCloseTo(RALLY.launched.valence / 2, 9);
    const attacked = openConflict(IRN, "USA" as NationId, 10, "A test war.");
    expect(rallyFor(attacked, 10, "USA" as NationId)).toBeCloseTo(RALLY.drawnIn.valence, 9);
    expect(rallyFor(attacked, 10 + RALLY.drawnIn.halfLifeWeeks, "USA" as NationId)).toBeCloseTo(RALLY.drawnIn.valence / 2, 9);
    expect(RALLY.launched.valence).toBeLessThan(RALLY.drawnIn.valence);
  });

  it("gives nothing for a war this government opened by blockade", () => {
    const blockade = openConflict("USA" as NationId, IRN, 10, "A test war.", "blockade");
    expect(rallyFor(blockade, 10, "USA" as NationId)).toBe(0);
  });

  it("reaches the headline through the record every bloc reads, not through the security judgment", () => {
    const at = atWar(BARE);
    expect(warSecurityContribution(warOpinionTerms(at))).toBeLessThanOrEqual(0);
    expect(approvalFor(at)).toBeGreaterThan(approvalFor(BARE));
  });
});

describe("the dead", () => {
  const light: WarLossBand = { killed: { low: 50, high: 150 }, wounded: { low: 400, high: 1_200 }, confidence: "medium" };
  const heavy: WarLossBand = { killed: { low: 8_000, high: 12_000 }, wounded: { low: 30_000, high: 40_000 }, confidence: "low" };

  it("cost the judgment more at a heavy band than a light one, on a log scale, and never past the cap", () => {
    expect(casualtyCost(undefined)).toBe(0);
    expect(casualtyCost(light)).toBeGreaterThan(0);
    expect(casualtyCost(heavy)).toBeGreaterThan(casualtyCost(light));
    expect(casualtyCost(heavy)).toBeLessThan(100 * casualtyCost(light));
    expect(casualtyCost({ killed: { low: 1e7, high: 1e7 }, wounded: { low: 0, high: 0 }, confidence: "low" })).toBe(CASUALTY_CAP);
  });

  it("reads the killed, not the wounded", () => {
    const wounded = { ...light, wounded: { low: 1e6, high: 1e6 } };
    expect(casualtyCost(wounded)).toBe(casualtyCost(light));
  });

  it("moves the security judgment's war term by the band the war record carries", () => {
    const lightWar = warSecurityContribution(warOpinionTerms(atWar(BARE, light, 30)));
    const heavyWar = warSecurityContribution(warOpinionTerms(atWar(BARE, heavy, 30)));
    expect(heavyWar).toBeLessThan(lightWar);
    const causes = selectOpinionCauses(atWar(BARE, heavy, 30)).find((reading) => reading.driver === "security")!.causes;
    // A cause is published to the thousandth; the term behind it is not rounded.
    expect(causes.find((cause) => cause.key === "war")?.contribution).toBe(Math.round(heavyWar * 1000) / 1000);
  });
});

describe("the war term", () => {
  it("is nothing without a war, and the front's unease in a war's first week", () => {
    expect(warSecurityContribution(warOpinionTerms(BARE))).toBe(0);
    expect(warSecurityDetail(warOpinionTerms(BARE))).toBe("The country is not at war.");
    const first = warOpinionTerms(atWar(BARE));
    expect(warSecurityContribution(first)).toBeCloseTo(-WAR_UNEASE * 0.5, 9);
    expect(warSecurityDetail(first)).toContain("unsettles");
  });
});

describe("a public rallies less to each war after the first", () => {
  const USA = BARE.founding.nation;
  const war = (id: string, startedTurn: number, defender: string, over: Partial<Conflict> = {}): Conflict => ({
    ...openConflict(USA, defender as NationId, startedTurn, "A test war."),
    id,
    ...over,
  });
  const ledger = (...wars: Conflict[]): Campaign => ({
    ...BARE,
    turn: 100,
    conflicts: Object.fromEntries(wars.map((entry) => [entry.id, entry])),
  });

  it("gives the first war its whole rally and a later one less, with ended wars still remembered", () => {
    const first = war("w1", 60, "IRN");
    const second = war("w2", 67, "IRQ");
    const campaign = ledger(first, second);
    expect(rallyFatigueFactor(campaign, first, USA)).toBe(1);
    expect(rallyFatigueFactor(campaign, second, USA)).toBeLessThan(0.6);
    const ended = ledger({ ...first, status: "settled", endedTurn: 70 }, second);
    expect(rallyFatigueFactor(ended, second, USA)).toBe(rallyFatigueFactor(campaign, second, USA));
  });

  it("forgets slowly: a war a year and a half later is rallied to nearly as fully", () => {
    const first = war("w1", 10, "IRN");
    const later = war("w2", 90, "IRQ");
    expect(rallyFatigueFactor(ledger(first, later), later, USA)).toBeGreaterThan(0.7);
  });

  it("is not fed by a blockade, which never earned a rally", () => {
    const blockade = war("w1", 60, "IRN", { opening: "blockade" });
    const invasion = war("w2", 67, "IRQ");
    expect(rallyFatigueFactor(ledger(blockade, invasion), invasion, USA)).toBe(1);
  });

  it("holds the lift of seven wars in seven weeks below the first war's alone", () => {
    const wars = ["IRN", "IRQ", "SYR", "LBY", "YEM", "AFG", "SOM"].map((d, i) => war(`w${i}`, 60 + i * 7, d));
    const campaign = { ...ledger(...wars), turn: 60 + 6 * 7 };
    const alone = { ...campaign, conflicts: { w0: { ...wars[0]!, startedTurn: campaign.turn } }, turn: campaign.turn };
    expect(warOpinionTerms(campaign).rally).toBeLessThan(warOpinionTerms(alone).rally / 2);
  });

  it("reaches the ledger only through congressional authorization, one vote per war", () => {
    const at60 = atCampaignTurn(foundedForBalance("opinion-war-serial").campaign, 60);
    const base = { ...at60, congress: { ...at60.congress, disposition: 0.95 } };
    const invade = (campaign: Campaign, target: string) =>
      resolveAction(campaign, { actor: USA, target: target as NationId, instrument: "military", rung: 5 }, createRngStreams(campaign.seed));
    const first = invade(base, "IRN");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const afterFirst = withWeeksElapsed(apply(base, first.packet), 7);
    const refused = invade(afterFirst, "IRQ");
    expect(refused.ok).toBe(false);
    const issued = issueForceAuthorization(afterFirst, "IRQ" as NationId);
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const voted = resolveDueAuthorizations({ ...apply(afterFirst, issued.packet), calendar: issued.act.dueDate }).campaign;
    const second = invade(voted, "IRQ");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const both = apply(voted, second.packet);
    const [early, late] = Object.values(both.conflicts).filter((c) => c.aggressor === USA).sort((a, b) => a.startedTurn - b.startedTurn);
    expect(rallyFatigueFactor(both, late!, USA)).toBeLessThan(rallyFatigueFactor(both, early!, USA));
  });
});
