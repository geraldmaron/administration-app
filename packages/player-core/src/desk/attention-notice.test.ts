import { describe, expect, it } from "vitest";
import { advanceUntilAttention, type Campaign, type TurnPhases } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { briefMatters } from "./brief-matters";
import { deskMatterSource, owedItems, presentedItems } from "./attention";

const phases: TurnPhases = { simulate: () => [], select: () => [] };

function withPressure(campaign: Campaign, pressure: number): Campaign {
  return { ...campaign, removal: { ...campaign.removal, pressure } };
}

const run = (campaign: Campaign) =>
  advanceUntilAttention(campaign, { phases, matterSources: [deskMatterSource], horizonDays: 21 });
const removalStops = (result: ReturnType<typeof run>) => result.stop.presented.filter((m) => m.id === "summons:removal-beat").length;

describe("the removal summons stops the world once per approach to a rung", () => {
  const near = withPressure(openingCampaign({ seedText: "notice-1" }), 0.44);

  it("stops on arrival and stays quiet while the level holds", () => {
    const first = run(near);
    expect(removalStops(first)).toBe(1);
    const second = run(withPressure(first.campaign, 0.45 - 0.02));
    expect(removalStops(second)).toBe(0);
    expect(first.campaign.noticed?.["summons:removal-beat"]).toBe("rung:0.45");
  });

  it("stops again for the next rung", () => {
    const first = run(near);
    const next = run(withPressure(first.campaign, 0.51));
    expect(removalStops(next)).toBe(1);
    expect(next.campaign.noticed?.["summons:removal-beat"]).toBe("rung:0.52");
  });

  it("stops again on a fresh approach after pressure left reach", () => {
    const first = run(near);
    const away = run(withPressure(first.campaign, 0.2));
    expect(away.campaign.noticed?.["summons:removal-beat"]).toBeUndefined();
    expect(removalStops(run(withPressure(away.campaign, 0.44)))).toBe(1);
  });
});

describe("Continue and the Brief use the engine's notice eligibility", () => {
  const near = withPressure(openingCampaign({ seedText: "notice-1" }), 0.44);
  const removal = (items: readonly { readonly id: string }[]) => items.some((item) => item.id === "summons:removal-beat");

  it("holds before the world has stopped for the summons, and lets go once it has", () => {
    expect(removal(presentedItems(near))).toBe(true);
    const noticed = run(near).campaign;
    expect(removal(presentedItems(noticed))).toBe(false);
    expect(removal(owedItems(noticed))).toBe(true);
    const row = briefMatters(noticed).find((matter) => matter.id === "summons:removal-beat");
    expect(row?.holds).toBe(false);
  });

  it("is not restored by a deferral that has lapsed", () => {
    const noticed = run(near).campaign;
    const later = { ...noticed, deferrals: { "summons:removal-beat": noticed.calendar } };
    expect(removal(presentedItems(later))).toBe(false);
  });

  it("holds again on the next rung", () => {
    const noticed = run(near).campaign;
    expect(removal(presentedItems(withPressure(noticed, 0.51)))).toBe(true);
  });
});
