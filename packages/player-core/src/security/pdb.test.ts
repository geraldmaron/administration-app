import { describe, expect, it } from "vitest";
import { openConflict, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { pdbReading } from "./pdb";

const RUS = "RUS" as NationId;
const UKR = "UKR" as NationId;

describe("the security section of the daily brief", () => {
  it("is never undefined, and stamps itself as the daily brief family", () => {
    const opening = openingCampaign({ seedText: "pdb" });
    const brief = pdbReading(opening);
    expect(brief.marking.family).toBe("presidential-daily-brief");
    expect(brief.marking.level).toBe("SECRET");
  });

  it("reports a war this government fights, and nothing for one it is not a party to", () => {
    const opening = openingCampaign({ seedText: "pdb" });
    const conflict = openConflict(RUS, UKR, opening.turn, "Russia invades Ukraine.");
    const notOurs: Campaign = { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } };
    expect(pdbReading(notOurs).items.some((item) => item.id === `war:${conflict.id}`)).toBe(false);

    const ours = openConflict(RUS, opening.founding.nation, opening.turn, "Russia strikes Alaska.");
    const atWar: Campaign = { ...opening, conflicts: { ...opening.conflicts, [ours.id]: ours } };
    const item = pdbReading(atWar).items.find((row) => row.id === `war:${ours.id}`);
    expect(item?.headline).toMatch(/intensity/);
  });
});
