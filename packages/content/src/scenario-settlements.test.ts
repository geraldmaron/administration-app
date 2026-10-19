import { describe, expect, it } from "vitest";
import { worldSettlements } from "@admin/world";
import { apply, createSave, loadSave } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { castBound, castScenario } from "./scenario-cast.js";
import { resolveLocus } from "./scenario-locus.js";

const campaign = sealedCampaign("small-settlements");

describe("sourced settlement binding", () => {
  it("uses a real smaller place rather than silently substituting its state metro", () => {
    const def = { ...plantHolidayScenario, locus: { ...plantHolidayScenario.locus, city: undefined, state: "PA" as const, settlement: "small" as const },
      subject: "The request from {{settlement}}" };
    const cast = castBound(campaign, def, campaign.founding.nation);
    const source = worldSettlements.find((place) => place.id === cast.locus?.settlement)!;
    expect(source.population).toBeLessThanOrEqual(100000);
    expect(cast.locus?.city).toBeUndefined();
    expect(cast.script.subject).toContain(source.name);
    expect(cast.locus?.state).toBe("PA");
  });

  it("uses evidenced Port Newark for a new New Jersey coast scene", () => {
    const locus = resolveLocus(campaign, { ...plantHolidayScenario, locus: { site: "coast", ground: "home", state: "NJ", descriptor: "The waterfront in {{city}}, {{state}}" } }, campaign.founding.nation);
    expect(locus?.placeName).toContain("Newark");
    expect(locus?.descriptor).toBe("The waterfront in Newark, New Jersey");
    expect(worldSettlements.find((place) => place.id === locus?.settlement)?.commercialPort).toBe(true);
  });

  it("uses an evidenced road crossing rather than a lake port for a Minnesota border scene", () => {
    const locus = resolveLocus(campaign, { ...plantHolidayScenario, locus: { site: "border", ground: "home", state: "MN", descriptor: plantHolidayScenario.locus.descriptor } }, campaign.founding.nation);
    expect(locus?.placeName).toContain("International Falls");
    expect(worldSettlements.find((place) => place.id === locus?.settlement)?.roadBorderCrossing).toBe(true);
  });

  it("accepts an explicitly pinned sourced port without silently imposing the small-place tier", () => {
    const port = worldSettlements.find((place) => place.commercialPort)!;
    const def = { ...plantHolidayScenario, locus: { site: "coast" as const, ground: "home" as const, state: "NJ" as const,
      settlementId: port.id, descriptor: "The waterfront at {{settlement}}" } };
    expect(castScenario(campaign, def)?.locus?.settlement).toBe(port.id);
  });

  it("retains a locality identity and exact place through a saved case and callback", () => {
    const def = { ...plantHolidayScenario, locus: { ...plantHolidayScenario.locus, city: undefined, state: "PA" as const, settlement: "small" as const } };
    const cast = castBound(campaign, def, campaign.founding.nation);
    const raised = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Local request received." }, effects: [{ kind: "case", actor: "world", raise: {
      id: `scenario:${def.id}`, kind: "authored-scenario", title: cast.script.subject, subject: { kind: "scenario", id: def.id },
      clock: { kind: "none" }, defaultOutcome: { kind: "none" }, urgency: "soft", responseRequirement: "president", allowedDispositions: ["act"],
      story: { scenario: def.id, subjects: cast.script.subjects!, place: { state: "PA", settlement: cast.locus!.settlement! } } } }] });
    const next = castBound(loadSave(JSON.parse(JSON.stringify(createSave(raised)))), { ...def, id: "locality-followup", locus: { ...def.locus, state: undefined },
      subjects: [{ key: "originalSite", source: "inherit", scenario: def.id, slot: "settlementSite" }] }, campaign.founding.nation);
    expect(next.locus?.settlement).toBe(cast.locus?.settlement);
    expect(next.script.subjects!.find((subject) => subject.key === "originalSite")).toMatchObject({ id: cast.locus!.settlement, kind: "place" });
    const ordinary = castBound(raised, { ...def, id: "locality-ordinary-callback", locus: { site: "city", ground: "home", descriptor: "The request from {{city}}" },
      subjects: [{ key: "originalSite", source: "inherit", scenario: def.id, slot: "settlementSite" }] }, campaign.founding.nation);
    expect(ordinary.locus?.settlement).toBe(cast.locus?.settlement);
    expect(ordinary.locus?.descriptor).toContain(cast.script.subjects!.find((subject) => subject.kind === "place")!.name);
  });

  it("declines unsupported foreign settlement requirements instead of fabricating a place", () => {
    const def = { ...plantHolidayScenario, cast: { pick: "nation" as const, nation: "FRA" }, locus: { ...plantHolidayScenario.locus, city: undefined,
      state: undefined, ground: "counterpart" as const, settlement: "small" as const } };
    expect(castScenario(campaign, def)).toBeUndefined();
  });
});
