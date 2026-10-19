import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { congressSystem } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { lensMembers, WhereYouStand } from "./AisleView";
vi.mock("../../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a> }));

const campaign = openingHarnessCampaign();
const base = congressSystem(campaign).chambers[0]!;
const members = base.members.filter((member) => !member.vacant).slice(0, 4).map((member, index) => ({ ...member, lean: [-1, -0.95, 0.96, 1][index]! }));
const chamber = { ...base, members };

describe("the full congressional position spectrum", () => {
  it("selects both tails inclusively across all parties", () => {
    expect(lensMembers(chamber, 0, { kind: "slice", at: -1 }).members).toEqual(members.slice(0, 2).reverse());
    expect(lensMembers(chamber, 0, { kind: "slice", at: 1 }).members).toEqual(members.slice(2));
  });
  it("keeps strongest opponents in all-members and farthest-first views", () => {
    expect(lensMembers(chamber, 1, { kind: "all" }).members).toHaveLength(4);
    const farthest = lensMembers(chamber, 1, { kind: "opponents" }).members;
    expect(farthest.map((member) => member.lean)).toEqual([-1, -0.95, 0.96, 1]);
  });
  it("provides keyboard and touch access to the entire scale", () => {
    const html = renderToStaticMarkup(<WhereYouStand campaign={campaign} chambers={[chamber]} you={1} />);
    expect(html).toContain('type="range" min="-1" max="1"');
    expect(html).toContain("All members");
    expect(html).toContain("Farthest from you");
    expect(html).toContain("including the outer fringes");
  });
});
