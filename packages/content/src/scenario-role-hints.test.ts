import { describe, expect, it } from "vitest";
import { matchRole, INSTITUTION_CATALOG } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { worldDataset } from "@admin/world";
import { ScenarioRoleHint, ScenarioSpeakerRoleHint } from "./scenario-speaker.js";
import { roleHintTargets } from "./scenario-role-hints.js";

// The speaker vocabulary against the government it has to be able to speak for.
//
// It was five hints for as long as the cabinet was five chairs, and stayed five
// when the cabinet became sixteen — so ten of the fifteen departments the game
// models could not say a word in any scenario, and no scenario could gate on
// their holders. A closed vocabulary is right; a closed vocabulary that has
// stopped matching the government is just a smaller government.

const USA = worldDataset.charters.find((charter) => charter.id === "charter-usa-constitution")!;
const SEATS = USA.cabinetRoles as readonly RoleId[];

describe("the role hints a scenario may name", () => {
  it("covers every chair the playable charter seats, one hint each", () => {
    const hit = new Map<string, string[]>();
    for (const hint of ScenarioRoleHint.options) {
      const role = matchRole(SEATS, roleHintTargets(hint));
      expect(role, `no seat answers to the "${hint}" hint`).toBeDefined();
      hit.set(role as string, [...(hit.get(role as string) ?? []), hint]);
    }
    // Every seat reachable, and no seat reachable by two different hints — two
    // hints landing on one chair is two ways to write the same speaker, which
    // is exactly the comparability a closed vocabulary exists to protect.
    for (const [role, hints] of hit) {
      expect(hints, `${role} answers to ${hints.join(" and ")}`).toHaveLength(1);
    }
    expect([...hit.keys()].sort()).toEqual([...SEATS].map((role) => role as string).sort());
  });

  it("gives every department the game models a voice", () => {
    // Not the charter's list but the institution catalog's: the departments are
    // what the player sees in the roster, and a department that cannot speak is
    // a building with no one in it as far as the writing is concerned.
    const departments = INSTITUTION_CATALOG.filter((def) => def.kind === "department");
    expect(departments).toHaveLength(15);
    const spoken = new Set(
      ScenarioSpeakerRoleHint.options.map((hint) => matchRole(SEATS, roleHintTargets(hint)) as string),
    );
    for (const department of departments) {
      expect(spoken.has(department.cabinetRole as string), `${department.name} has no speaker hint`).toBe(true);
    }
  });

  it("still refuses the lead chair as a speaker while allowing it as a condition", () => {
    // Unchanged by the widening, and the reason is unchanged: the lead chair is
    // always the player, so a lead speaker is the player talking to themselves.
    expect(ScenarioRoleHint.options).toContain("lead");
    expect(ScenarioSpeakerRoleHint.options).not.toContain("lead");
  });
});
