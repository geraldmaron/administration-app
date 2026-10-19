import { describe, expect, it } from "vitest";
import { apply, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { adviserTrackRecords, forecastPacket, forecastSource } from "./forecast";

const campaign = openingCampaign({ seedText: "forecast-source" });

describe("the forecast's source", () => {
  it("gives money to the Treasury, the courts to the Attorney General and Congress to the Chief of Staff", () => {
    expect(forecastSource(campaign, { kind: "budget-draft", draft: {} }).role).toBe("role-treasury-minister");
    expect(forecastSource(campaign, { kind: "acts", title: "t", against: "a", baselineMeaning: "b", alternatives: [{ id: "x", label: "x", act: { act: "withdraw-nomination", id: "n" } }] }).role).toBe("role-attorney-general");
    expect(forecastSource(campaign, { kind: "acts", title: "t", against: "a", baselineMeaning: "b", alternatives: [{ id: "x", label: "x", act: { act: "transmit", id: "n" } }] }).role).toBe("role-chief-of-staff");
  });

  it("forecasts from the staff in normal play, as good as the occupant, and from the truth only in God Mode", () => {
    const source = forecastSource(campaign, { kind: "budget-draft", draft: {} });
    expect(source.basis.kind).toBe("staff");
    expect(source.label.length).toBeGreaterThan(0);
    const god: Campaign = { ...campaign, godMode: { ...(campaign.godMode ?? {}), enabled: true } as NonNullable<Campaign["godMode"]> };
    expect(forecastSource(god, { kind: "budget-draft", draft: {} }).basis).toEqual({ kind: "truth" });
  });
});

describe("the filed forecast", () => {
  it("goes on the Record by adviser and waits for its week", () => {
    const source = forecastSource(campaign, { kind: "budget-draft", draft: {} });
    const packet = forecastPacket(campaign, { source, subject: "The draft budget", option: "Send the draft", weeks: 4, approval: { median: 0.5, low: 0.47, high: 0.53 } })!;
    const filed = apply(campaign, packet);
    const [record] = adviserTrackRecords(filed);
    expect(record!.role).toBe("role-treasury-minister");
    expect(record!.filed).toBe(1);
    expect(record!.settled).toBe(0);
    expect(record!.entries[0]!.outcome).toEqual({ state: "pending" });
  });

  it("is not filed for a God Mode forecast", () => {
    expect(forecastPacket(campaign, { source: { basis: { kind: "truth" }, label: "God Mode", confidence: "high" }, subject: "s", option: "o", weeks: 4, approval: { median: 0.5, low: 0.5, high: 0.5 } })).toBeUndefined();
  });
});
