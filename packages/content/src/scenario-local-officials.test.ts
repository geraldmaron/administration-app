import { expect, it } from "vitest";
import { apply, createSave, loadSave } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { castBound, castScenario } from "./scenario-cast.js";
import { storySubjectEffects } from "./scenario-subjects.js";
import { ScenarioDef } from "./scenario.js";
import { auditScenario } from "./scenario-audit.js";

const campaign = sealedCampaign("local-official-letters");

it.each(["governor", "mayor", "member"] as const)("relays a real bound %s through a document without adding a direct speaker", (source) => {
  const def = ScenarioDef.parse({ ...plantHolidayScenario, subjects: [{ key: "sender", source,
    ...(source === "member" ? { chamber: "senate", scope: "state" } : {}) }],
    transmission: { relay: "letter", domesticSubject: "sender", attribution: "Letter from {{sender}}", text: plantHolidayScenario.opening[0]!.text } });
  const cast = castBound(campaign, def, campaign.founding.nation);
  const sender = cast.script.subjects!.find((subject) => subject.key === "sender")!;
  expect(cast.transmission?.source).toBe(sender.name);
  expect(cast.transmission?.attribution).toContain(sender.name);
  expect(cast.script.opening.every((beat) => ["cabinet", "narrator", "player"].includes(beat.speaker.kind))).toBe(true);
  const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "The document arrived." }, effects: storySubjectEffects(campaign, cast) });
  expect(after.people[sender.person!]).toBeDefined();
  expect(loadSave(JSON.parse(JSON.stringify(createSave(after)))).people[sender.person!]?.base.name).toBe(sender.name);
});

it("does not turn a narrative organization into a domestic official or invent a missing mayor", () => {
  expect(ScenarioDef.safeParse({ ...plantHolidayScenario, subjects: [{ key: "sender", source: "entity", entity: "voss-shipyard" }],
    transmission: { relay: "letter", domesticSubject: "sender", attribution: "A letter", text: plantHolidayScenario.opening[0]!.text } }).success).toBe(false);
  const def = { ...plantHolidayScenario, locus: { ...plantHolidayScenario.locus, city: undefined, state: "WY" as const }, subjects: [{ key: "sender", source: "mayor" as const }] };
  expect(castScenario(campaign, def)).toBeUndefined();
});

it("does not give domestic letters the foreign-document vocabulary exemption", () => {
  const def = ScenarioDef.parse({ ...plantHolidayScenario, subjects: [{ key: "sender", source: "governor" }],
    transmission: { relay: "letter", domesticSubject: "sender", attribution: "Letter from {{sender}}",
      text: "The prime minister has asked for the promised funding before the next public hearing." } });
  expect(auditScenario(def).some((finding) => finding.kind === "parliamentary-vocabulary" && finding.severity === "error")).toBe(true);
});
