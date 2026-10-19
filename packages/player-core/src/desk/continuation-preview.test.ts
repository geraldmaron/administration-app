import { describe, expect, it } from "vitest";
import { compareDates } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { attentionItems } from "./attention";
import { continuationHorizon } from "./continuation-preview";

const base = openingCampaign();

describe("continuationHorizon: what Continue will run to", () => {
  it("names the nearest dated matter on the board, not merely the first one built", () => {
    const dated = attentionItems(base).filter((item) => item.urgency === "ambient" && item.dueDate !== undefined);
    const nearest = [...dated].sort((a, b) => compareDates(a.dueDate!, b.dueDate!))[0];
    expect(nearest).toBeDefined();
    const horizon = continuationHorizon(base);
    expect(horizon).toEqual({ title: nearest!.title, dueDate: nearest!.dueDate });
  });

  it("never counts a hard or soft matter — those are already presented, not a horizon to run to", () => {
    const horizon = continuationHorizon(base);
    expect(horizon).toBeDefined();
    const matching = attentionItems(base).find((item) => item.title === horizon!.title && item.dueDate === horizon!.dueDate);
    expect(matching?.urgency).toBe("ambient");
  });
});
