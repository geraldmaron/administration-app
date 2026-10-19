import { describe, expect, it } from "vitest";
import { consulteeEmblem } from "./office-emblem";

describe("the mark a consultee wears", () => {
  it("gives every cabinet chair the acts consult its department's emblem", () => {
    for (const roleId of ["role-attorney-general", "role-commerce-secretary", "role-defense-minister", "role-energy-secretary", "role-foreign-minister", "role-health-secretary", "role-homeland-secretary", "role-intelligence-director", "role-treasury-minister", "role-veterans-secretary"]) {
      expect(consulteeEmblem({ roleId }), roleId).not.toBe("building");
    }
  });

  it("reads a body by what it is", () => {
    expect(consulteeEmblem({ body: "Congress, which alone declares war" })).toBe("subjectCapitol");
    expect(consulteeEmblem({ body: "The intelligence committees, by notification" })).toBe("subjectCapitol");
    expect(consulteeEmblem({ body: "Allied capitals whose forces are committed with ours" })).toBe("flag");
    expect(consulteeEmblem({ body: "Counsel, on the secret order" })).toBe("gavel");
    expect(consulteeEmblem({ body: "Somebody new" })).toBe("building");
  });
});
