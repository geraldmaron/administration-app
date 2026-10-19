import { describe, expect, it } from "vitest";
import { buildScenarioBrief, scenarioJob } from "./brief.js";
import { PERSONAS, PersonaId, personaFor, personaForClass } from "../personas/index.js";
import { ScenarioClass } from "@admin/content";

// The anti-drift pass. Persona prose is the deliverable, so it is pinned as
// text: a full-text snapshot per director, and proof that a director sits above
// the gates rather than among them.
//
// The pins below are what the *next* batch is written under. They do not
// describe `content/corpus/`, which was produced under an earlier brief and is
// still awaiting regeneration — so a diff here is not evidence about content
// already on disk.

describe("the brief without a persona", () => {
  it("pins the directorless brief in full", () => {
    expect(
      buildScenarioBrief({ class: "espionage", severity: "serious", cast: "tensest", steer: "a defector with a suitcase", count: 3 }),
    ).toMatchSnapshot();
  });
});

it("gives a live-bill session writer the pinned command contract", () => {
  const brief = buildScenarioBrief({ class: "institution", severity: "serious", cast: "liveBill", count: 1 });
  expect(brief).toContain("Live-bill binding");
  expect(brief).toContain('A two-way conference choice uses responseText "both" and two replies recommending "house" and "senate"');
  expect(brief).toContain("the binder requires different text actually passed by each chamber");
  expect(brief).toContain("{{billHouseProvision}} and {{billSenateProvision}}");
});

describe("the brief under each director", () => {
  // One representative cell per director, so the snapshot diff on a prose edit
  // shows the whole brief the generator will actually be handed.
  const CELLS = {
    "the-embed": { class: "war", severity: "critical", cast: "tensest" },
    "the-architect-of-dread": { class: "espionage", severity: "serious", cast: "tensest" },
    "the-room": { class: "unrest", severity: "serious", cast: "none" },
    // The routine director: any class can have an ordinary week, so its
    // representative cell is the same class the room's is, one tier down.
    "the-beat": { class: "unrest", severity: "routine", cast: "none" },
  } as const;

  for (const id of PersonaId.options) {
    const cell = CELLS[id];
    const brief = buildScenarioBrief({ ...cell, persona: id, count: 2 });

    it(`pins ${id}'s brief in full`, () => {
      expect(brief).toMatchSnapshot();
    });

    it(`states ${id} once, and above the gates`, () => {
      const prompt = PERSONAS[id].prompt;
      expect(brief.split(prompt)).toHaveLength(2);
      expect(brief.indexOf(prompt)).toBeLessThan(brief.indexOf("Every scenario must clear these gates"));
      // The frame is the guardrail: it must reach the generator before the
      // director's voice does, or the voice reads as license.
      expect(brief.indexOf("The gates that follow it are non-negotiable")).toBeLessThan(brief.indexOf(prompt));
    });

    // A director that only carries the other two's briefs would ship happily
    // and produce one register in three costumes.
    it(`does not carry the other directors into ${id}'s brief`, () => {
      for (const other of PersonaId.options) {
        if (other === id) continue;
        expect(brief).not.toContain(PERSONAS[other].prompt);
      }
    });
  }
});

describe("routing", () => {
  it("gives every scenario class a director", () => {
    for (const cls of ScenarioClass.options) {
      expect(PERSONAS[personaForClass(cls)]).toBeDefined();
    }
  });

  it("routes any routine cell to the beat, whatever its class", () => {
    for (const cls of ScenarioClass.options) {
      expect(personaFor({ class: cls, cast: "none", severity: "routine" })).toBe("the-beat");
    }
  });

  it("splits scandal by cast: at home to the room, abroad to dread", () => {
    expect(personaFor({ class: "scandal", cast: "none", severity: "serious" })).toBe("the-room");
    expect(personaFor({ class: "scandal", cast: "tensest", severity: "serious" })).toBe("the-architect-of-dread");
  });

  it("resolves per-cell override over the job flag over the class map", () => {
    const job = scenarioJob(
      "scn-1",
      "mock",
      [
        { class: "war", severity: "serious", cast: "tensest", count: 1 },
        { class: "war", severity: "serious", cast: "tensest", count: 1, persona: "the-room" },
      ],
      "the-architect-of-dread",
    );
    expect(job.items[0]!.payload.persona).toBe("the-architect-of-dread");
    expect(job.items[1]!.payload.persona).toBe("the-room");
  });

  it("stamps the routed director into the payload when no flag is given", () => {
    const job = scenarioJob("scn-2", "mock", [{ class: "unrest", severity: "serious", cast: "none", count: 1 }]);
    expect(job.items[0]!.payload.persona).toBe("the-room");
    expect(job.items[0]!.payload.prompt).toContain(PERSONAS["the-room"].prompt);
  });
});
