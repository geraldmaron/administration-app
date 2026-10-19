import { describe, expect, it } from "vitest";
import { benchReading, place } from "@admin/player-core";
import { openingHarnessCampaign } from "../map/harness/fixture";
import { navGroups, navPlace } from "./modes";

describe("navGroups", () => {
  it("carries the new and waiting counts onto the nav items", () => {
    const government = navGroups({ courts: { fresh: 1, waiting: 3 } }).find((group) => group.id === "government");
    const courts = government?.items.find((item) => item.id === "courts");
    expect(courts?.attention).toBe(1);
    expect(courts?.waiting).toBe(3);
  });

  it("draws no count where nothing waits", () => {
    const government = navGroups({}).find((group) => group.id === "government");
    expect(government?.items.every((item) => item.attention === undefined && item.waiting === undefined)).toBe(true);
  });
});

describe("navPlace", () => {
  const campaign = openingHarnessCampaign();
  const justice = benchReading(campaign).seats.find((seat) => seat.personId)!.personId!;
  const governor = Object.values(campaign.states).find((state) => state.governor?.person)!.governor!.person as string;

  it("lights the section a person's role belongs to", () => {
    expect(navPlace(place.person(justice), campaign)).toBe("courts");
    expect(navPlace(place.person(governor), campaign)).toBe("nation");
  });

  it("reads every other page by its path", () => {
    expect(navPlace("/washington/courts", campaign)).toBe("courts");
    expect(navPlace(place.person("nobody"), campaign)).toBe("washington");
  });
});
