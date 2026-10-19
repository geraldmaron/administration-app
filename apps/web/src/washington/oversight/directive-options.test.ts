import { describe, expect, it } from "vitest";
import { apply } from "@admin/engine";
import { directivePacket, directiveTargets, inquiryPipeline } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { directiveSubjects } from "./directive-options";

const opening = openingHarnessCampaign();
describe("record-backed directive choices", () => {
  it("offers monetary requests without implying an automatic rate change", () => {
    const fed = directiveTargets(opening).find((target) => target.institution === "INST-FED")!;
    const subjects = directiveSubjects(opening, fed, "monetary");
    expect(subjects).toHaveLength(3);
    expect(subjects.every((subject) => subject.label.startsWith("Request"))).toBe(true);
  });
  it("never invents an investigation subject on an empty board", () => {
    const target = directiveTargets(opening).find((target) => target.institution === "INST-IRS")!;
    expect(directiveSubjects(opening, target, "investigation")).toEqual([]);
  });
  it("offers actual recorded matters only to their institution, without making a same-profession inference", () => {
    const one = apply(opening, directivePacket(opening, "INST-IRS", "investigation", "Recorded returns case"));
    const campaign = apply(one, directivePacket(one, "INST-IRS", "investigation", "Recorded returns case"));
    const recorded = inquiryPipeline(campaign).stages.flatMap((stage) => stage.matters)[0]!;
    expect(recorded.institution).toBeTruthy();
    const target = directiveTargets(campaign).find((entry) => entry.institution === recorded.institution)!;
    expect(directiveSubjects(campaign, target, "investigation")).toEqual([{ value: recorded.subject, label: recorded.subject }]);
    const other = directiveTargets(campaign).find((entry) => entry.institution === "INST-FED")!;
    expect(directiveSubjects(campaign, other, "investigation")).toEqual([]);
  });
});
