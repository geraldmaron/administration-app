import { describe, expect, it } from "vitest";
import { foreignLeaderFor, hasIntelOnNation, presidentRapport, type Campaign, type PersonRuntime } from "@admin/engine";
import type { NationId, PersonId, RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { engagementReading, envoyReading, rapportLine } from "./engagement";

// The country file's reading of what the President could do with a government
// this week: which engagements are on the table and how each would be taken,
// and whether that government would sign each kind of treaty.

const campaign = openingCampaign();
const GBR = "GBR" as NationId;
const PRK = "PRK" as NationId;

describe("the President's engagement reading", () => {
  it("reads nothing for the President's own country", () => {
    expect(engagementReading(campaign, campaign.founding.nation)).toBeUndefined();
  });

  it("puts a call on the table with a close ally and forecasts it taken", () => {
    const reading = engagementReading(campaign, GBR)!;
    const call = reading.options.find((option) => option.kind === "call");
    expect(call?.forecast).toBe("likely");
    expect(call?.label).toBe("A call");
  });

  it("offers no state visit to a capital that distrusts the United States", () => {
    const reading = engagementReading(campaign, PRK)!;
    expect(reading.options.map((option) => option.kind)).not.toContain("visit");
  });

  it("says the size of each step in words and never a figure", () => {
    for (const option of engagementReading(campaign, GBR)!.options) {
      expect(["a small step", "a real step", "a large step"]).toContain(option.warmth);
      for (const reason of option.reasons) expect(reason).not.toMatch(/\d/);
    }
  });

  it("forecasts every kind of treaty with at most two reasons", () => {
    const reading = engagementReading(campaign, GBR)!;
    expect(reading.treaties.map((treaty) => treaty.kind).sort()).toEqual(["alliance", "arms-control", "executive-agreement", "trade"]);
    for (const treaty of reading.treaties) expect(treaty.reasons.length).toBeLessThanOrEqual(2);
  });
});

// The two people on the President's side of the table. These read engine
// exports added beside them, so they run against a rebuilt engine.

const STATE = "role-foreign-minister" as RoleId;

function withPerson(state: Campaign, id: PersonId, base: Partial<PersonRuntime["base"]>): Campaign {
  const runtime = state.people[id]!;
  return { ...state, people: { ...state.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}
const secretary = campaign.player.cabinet[STATE]! as PersonId;
const skilled = withPerson(campaign, secretary, { charisma: 0.95, competence: 0.95, integrity: 0.9, traits: ["charismatic"] });
const clumsy = withPerson(campaign, secretary, { charisma: 0.05, competence: 0.1, integrity: 0.1, traits: ["reclusive"] });
// Craft at the bench's middle: 0.45 charisma + 0.35 competence + 0.2 integrity, no trait.
const typical = withPerson(campaign, secretary, { charisma: 0.783, competence: 0.783, integrity: 0.783, traits: [] });
const emptied = Object.fromEntries(Object.entries(campaign.player.cabinet).filter(([role]) => role !== STATE));
const noActings = Object.fromEntries(Object.entries(campaign.actings ?? {}).filter(([seat]) => seat !== STATE));
const vacant: Campaign = { ...campaign, player: { ...campaign.player, cabinet: emptied as Campaign["player"]["cabinet"] }, actings: noActings };

describe("the Secretary of State's hand on the country file", () => {
  it("names the Secretary and says where they stand among those who hold the job, in words", () => {
    const up = envoyReading(skilled);
    const middle = envoyReading(typical);
    const down = envoyReading(clumsy);
    expect(up.hand).toBe("skilled");
    expect(up.person).toBe(secretary);
    expect(up.line).toMatch(/^Secretary of State .+ is one of the best diplomats to hold the job\./);
    expect(middle.hand).toBe("capable");
    expect(middle.line).toMatch(/is about as good a diplomat as most who've held the job\./);
    expect(down.hand).toBe("unsure");
    expect(down.line).toMatch(/is a weaker diplomat than most who've held the job\. Other countries are a little less willing to meet/);
    for (const line of [up.line, middle.line, down.line]) expect(line).not.toMatch(/\d/);
  });

  it("says plainly when nobody runs the department", () => {
    const reading = envoyReading(vacant);
    expect(reading.hand).toBe("vacant");
    expect(reading.line).toMatch(/^Nobody is running the State Department right now\./);
  });

  it("sizes each step by the Secretary's skill: an empty chair takes a state visit down a size", () => {
    const visit = (state: Campaign): string | undefined => engagementReading(state, GBR)?.options.find((option) => option.kind === "visit")?.warmth;
    expect(visit(skilled)).toBe("a large step");
    expect(visit(clumsy)).toBe("a real step");
    expect(visit(vacant)).toBe("a real step");
  });
});

describe("rapport between the leaders on the country file", () => {
  const nations = Object.keys(campaign.nations) as NationId[];
  const readable = nations.filter((id) => id !== campaign.founding.nation && hasIntelOnNation(campaign, id));

  it("is said only where the services read the government and the record is full", () => {
    for (const id of nations) {
      const line = rapportLine(campaign, id);
      if (line === undefined) continue;
      expect(hasIntelOnNation(campaign, id)).toBe(true);
      expect(campaign.nations[id]!.base.fidelity).toBe("full");
      expect(line).not.toMatch(/\d/);
    }
    const thin = nations.find((id) => campaign.nations[id]!.base.fidelity !== "full" && presidentRapport(campaign, id) !== undefined);
    expect(thin).toBeDefined();
    expect(rapportLine(campaign, thin!)).toBeUndefined();
  });

  it("says good rapport and bad blood both, by the leader's name", () => {
    const target = readable.find((id) => campaign.nations[id]!.base.fidelity === "full" && foreignLeaderFor(campaign, id));
    if (!target) throw new Error("no readable full-fidelity government with a leader on record");
    const leader = foreignLeaderFor(campaign, target)!;
    const president = campaign.people[foreignLeaderFor(campaign, campaign.founding.nation)!.person]!.base;
    const kindred = withPerson(campaign, leader.person as PersonId, { ideology: president.ideology, traits: [...president.traits] });
    const opposed = withPerson(campaign, leader.person as PersonId, {
      ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
      traits: president.traits.includes("hawkish") ? ["dovish", "corrupt"] : ["hawkish", "corrupt"],
    });
    expect(rapportLine(kindred, target)).toBe(`You and ${leader.name} get along well, which helps every meeting and every treaty.`);
    expect(rapportLine(opposed, target)).toMatch(/^You and .+ don't get along/);
  });
});
