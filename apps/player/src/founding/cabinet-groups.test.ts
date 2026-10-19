import { describe, expect, it } from "vitest";
import { makeCampaignSeed } from "@admin/engine";
import { foundingOptions } from "@admin/player-core";
import { cabinetGroups } from "./cabinet-groups";
import { foundingSeats } from "./draft";

describe("cabinet groups", () => {
  it("places every chair the charter appoints in exactly one known group", () => {
    const roles = foundingSeats(foundingOptions(makeCampaignSeed("cabinet-groups"))).departments.map((role) => role as string);
    const groups = cabinetGroups(roles);
    expect(groups.flatMap((group) => group.roles).sort()).toEqual([...roles].sort());
    expect(groups.some((group) => group.key === "other")).toBe(false);
  });

  it("keeps a chair the table does not know, in a group of its own", () => {
    const groups = cabinetGroups(["role-treasury-minister", "role-space-secretary"]);
    expect(groups.map((group) => group.key)).toEqual(["economy", "other"]);
  });
});
