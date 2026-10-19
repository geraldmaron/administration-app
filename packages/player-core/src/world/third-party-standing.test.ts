import { describe, expect, it } from "vitest";
import { relationshipKey, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { thirdPartyTieReadable, unreadTiesOf } from "./third-party-standing";
import { nationFile } from "./nation-file";

const campaign = openingCampaign();
const home = campaign.founding.nation;
const foreign = (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== home);

describe("D18: reading a tie between two OTHER governments", () => {
  it("is always readable for a pair that touches the United States", () => {
    const other = foreign[0]!;
    expect(thirdPartyTieReadable(campaign, home, other)).toBe(true);
    expect(thirdPartyTieReadable(campaign, other, home)).toBe(true);
  });

  it("is readable when the graph carries no relationship for the pair", () => {
    const noGraph = { ...campaign, relationships: {} } as Campaign;
    const [a, b] = foreign;
    expect(thirdPartyTieReadable(noGraph, a!, b!)).toBe(true);
  });
});

describe("unreadTiesOf: the partners a selected country's hatch covers", () => {
  it("names exactly the governments whose tie to the selected one is unreadable", () => {
    const selected = foreign.find((id) => unreadTiesOf(campaign, id).length > 0)!;
    const hatched = unreadTiesOf(campaign, selected);
    expect(hatched.length).toBeGreaterThan(0);
    for (const other of foreign.filter((id) => id !== selected)) {
      expect(hatched.includes(other)).toBe(!thirdPartyTieReadable(campaign, selected, other));
    }
  });

  it("never hatches the United States or the selected country itself, and hatches nothing for the United States", () => {
    const selected = foreign[0]!;
    expect(unreadTiesOf(campaign, selected)).not.toContain(home);
    expect(unreadTiesOf(campaign, selected)).not.toContain(selected);
    expect(unreadTiesOf(campaign, home)).toEqual([]);
  });
});

it("does not expose the number of unread ties in an ordinary nation file", () => {
  const selected = foreign.find((id) => unreadTiesOf(campaign, id).length > 0)!;
  const hidden = unreadTiesOf(campaign, selected)[0]! as NationId;
  const key = relationshipKey(selected, hidden);
  const { [key]: _removed, ...relationships } = campaign.relationships;
  const fewer = { ...campaign, relationships } as Campaign;
  expect(unreadTiesOf(fewer, selected).length).toBeLessThan(unreadTiesOf(campaign, selected).length);
  expect(nationFile(fewer, selected)).toEqual(nationFile(campaign, selected));
});
