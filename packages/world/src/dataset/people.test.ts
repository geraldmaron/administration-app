import { describe, it, expect } from "vitest";
import { NAME_BANKS, NAME_CULTURES } from "./name-banks.js";
import {
  AGENCY_HEAD_ROLE,
  ALL_ROLES,
  US_ONLY_ROLES,
  nameBankFor,
  nameCultureFor,
  personPoolSpecByNation,
  personPoolSpecs,
  roleProfileByRole,
  roleProfiles,
} from "./people.js";
import { US_ID } from "./nations.js";
import { genericCharters } from "./charters.js";
import { usaCharter } from "./usa.js";
import { worldDataset } from "./index.js";
import { US_NAME_GROUPS, US_NAME_GROUP_BY_HERITAGE, nameGroupForHeritage } from "./name-cultures.js";
import { seatHeritageMixFor } from "./portraits.js";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES } from "../schemas/person.js";
import { METRIC_COPY } from "./metric-copy.js";

describe("world.person-pool authoring", () => {
  it("gives every nation a pool spec covering every role", () => {
    for (const nation of worldDataset.nations) {
      const spec = personPoolSpecByNation.get(nation.id as string);
      expect(spec, `${nation.identity.name} pool spec`).toBeDefined();
      // The American seats are the seat nation's alone: no other capital has
      // statehouses, bureaus, a Senate committee or a Secretary of Veterans
      // Affairs, and generating one abroad staffs a chair nobody can hold.
      const npcRoles = ALL_ROLES.filter((role) => !US_ONLY_ROLES.includes(role as string));
      expect(spec!.roles).toEqual(nation.id === US_ID ? ALL_ROLES : npcRoles);
      if (nation.id === US_ID) {
        expect(spec!.roleDepth?.["role-governor"]).toBe(50);
        // Deep enough to seat every non-cabinet office in the engine's
        // institution catalog, which is what the engine's founding test holds
        // this number to from the other side.
        expect(spec!.roleDepth?.[AGENCY_HEAD_ROLE]).toBeGreaterThanOrEqual(48);
      }
      // A thin country seats one person per chair: nobody meets its bench, and
      // three deep for every microstate is people carried in every save.
      expect(spec!.depthPerRole).toBeGreaterThanOrEqual(nation.fidelity === "thin" ? 1 : 2);
    }
  });

  // Both directions of the US-only rule, because a list is only right if it is
  // neither too long nor too short — and either way the failure is invisible on
  // screen until a player opens a dossier for a chair that does not exist.
  it("keeps no American seat a foreign charter could actually fill", () => {
    const abroad = new Set(genericCharters.flatMap((charter) => charter.cabinetRoles.map((r) => r as string)));
    for (const role of US_ONLY_ROLES) {
      expect(abroad.has(role), `${role} is US-only but a generic charter seats it`).toBe(false);
    }
  });

  it("generates nobody abroad for a chair no charter abroad can seat", () => {
    const abroad = new Set(genericCharters.flatMap((charter) => charter.cabinetRoles.map((r) => r as string)));
    // The two seats that exist in every country without a charter creating
    // them: somebody leads the opposition and somebody writes about it.
    const unseated = new Set(["role-opposition-leader", "role-journalist"]);
    const spec = personPoolSpecByNation.get(
      (worldDataset.nations.find((nation) => (nation.id as string) !== US_ID)!.id as string),
    )!;
    for (const role of spec.roles) {
      const name = role as string;
      expect(abroad.has(name) || unseated.has(name), `${name} is generated abroad but nothing abroad seats it`).toBe(
        true,
      );
    }
  });

  it("covers every cabinet seat any authored charter can create", () => {
    const authored = new Set(ALL_ROLES.map((r) => r as string));
    for (const charter of [...genericCharters, usaCharter]) {
      for (const role of charter.cabinetRoles) {
        expect(authored.has(role as string), `${charter.id} needs ${role}`).toBe(true);
      }
    }
  });

  it("has a role profile for every role, with usable attribute windows", () => {
    for (const role of ALL_ROLES) {
      const profile = roleProfileByRole.get(role as string);
      expect(profile, `${role} profile`).toBeDefined();
      for (const [key, window] of Object.entries(profile!.attributes)) {
        expect(window.max - window.min, `${role}.${key} window`).toBeGreaterThan(0.1);
      }
    }
    expect(roleProfiles).toHaveLength(ALL_ROLES.length);
  });

  it("keeps the opposition leader and the journalist structurally disloyal", () => {
    for (const role of ["role-opposition-leader", "role-journalist"]) {
      expect(roleProfileByRole.get(role)!.attributes.loyalty.max).toBeLessThanOrEqual(0.35);
    }
  });

  it("resolves every nation to a name bank with real depth in every group", () => {
    for (const nation of worldDataset.nations) {
      const bank = nameBankFor(nation.id as string);
      for (const group of bank.groups) {
        const givenCount = group.given.masculine.length + group.given.feminine.length + group.given.neutral.length;
        expect(givenCount * group.surname.length, `${nation.identity.name} name space`).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it("has no duplicate names inside any culture's banks", () => {
    for (const culture of NAME_CULTURES) {
      const bank = NAME_BANKS[culture];
      for (const group of bank.groups) {
        expect(new Set(group.given.masculine).size, `${culture} masculine given`).toBe(group.given.masculine.length);
        expect(new Set(group.given.feminine).size, `${culture} feminine given`).toBe(group.given.feminine.length);
        expect(new Set(group.given.neutral).size, `${culture} neutral given`).toBe(group.given.neutral.length);
        expect(new Set(group.surname).size, `${culture} surname`).toBe(group.surname.length);
      }
    }
  });
});

describe("a bench as deep as the country's fidelity", () => {
  it("staffs the playable nation eight deep and a full-fidelity country three deep", () => {
    const us = personPoolSpecs.find((spec) => spec.nation === "USA")!;
    const iceland = personPoolSpecs.find((spec) => spec.nation === "ISL")!;
    expect(us.depthPerRole).toBe(8);
    expect(iceland.depthPerRole).toBe(3);
  });
});

describe("the American bench's names", () => {
  it("draws the United States from its own six heritage groups rather than the shared Anglo bank", () => {
    expect(nameCultureFor(US_ID)).toBe("american");
    expect(nameCultureFor("GBR")).toBe("anglo");
    expect(Object.keys(US_NAME_GROUPS).sort()).toEqual(
      ["black", "east-asian", "hispanic", "south-asian", "southeast-asian", "white"].sort(),
    );
  });

  it("repeats no name inside a group", () => {
    for (const [id, group] of Object.entries(US_NAME_GROUPS)) {
      for (const list of [group.given.masculine, group.given.feminine, group.given.neutral, group.surname]) {
        expect(new Set(list).size, id).toBe(list.length);
      }
    }
  });

  it("carries the surnames a Black, Hispanic or Asian American official is actually called", () => {
    expect(US_NAME_GROUPS.black.surname).toEqual(expect.arrayContaining(["Washington", "Jefferson", "Booker", "Banks"]));
    expect(US_NAME_GROUPS.hispanic.surname).toEqual(expect.arrayContaining(["Garcia", "Padilla", "Castro"]));
    expect(US_NAME_GROUPS["east-asian"].surname).toEqual(expect.arrayContaining(["Kim", "Chen", "Wong"]));
    expect(US_NAME_GROUPS["south-asian"].surname).toEqual(expect.arrayContaining(["Patel", "Shah"]));
    expect(US_NAME_GROUPS["southeast-asian"].surname).toEqual(expect.arrayContaining(["Nguyen", "Tran"]));
  });

  it("leaves out the surnames of every modern president and vice president", () => {
    const all = Object.values(US_NAME_GROUPS).flatMap((group) => group.surname);
    for (const name of ["Bush", "Clinton", "Obama", "Biden", "Trump", "Pence", "Vance", "Cheney", "Carter", "Reagan"]) {
      expect(all, name).not.toContain(name);
    }
  });

  it("names every face an American seat can draw from exactly one group", () => {
    const roles = ["role-treasury-minister", "role-governor", "role-committee-chair", "role-congressional-leader", "role-journalist"];
    for (const role of roles) {
      for (const party of ["democrat", "republican", "independent", undefined] as const) {
        for (const { heritage } of seatHeritageMixFor(US_ID, role, party)) {
          expect(US_NAME_GROUP_BY_HERITAGE[heritage], `${role} ${party} ${heritage}`).toBeDefined();
          expect(nameGroupForHeritage("american", heritage)).toBeDefined();
        }
      }
    }
    expect(nameGroupForHeritage("anglo", "europe-north")).toBeUndefined();
  });
});

describe("which way an ideology axis runs", () => {
  it("names both ends of every axis once, positive toward authority and toward the nation", () => {
    expect(Object.keys(IDEOLOGY_AXIS_POLES)).toEqual([...IDEOLOGY_AXES]);
    expect(IDEOLOGY_AXIS_POLES.authLibertarian.positive).toBe("Authoritarian");
    expect(IDEOLOGY_AXIS_POLES.nationalistGlobalist.positive).toBe("Nationalist");
    expect(IDEOLOGY_AXIS_POLES.nationalistGlobalist.negative).toBe("Globalist");
  });

  it("prints the metric registry's scale the same way round", () => {
    expect(METRIC_COPY["person.ideology.nationalistGlobalist"]!.scale).toEqual({ low: "globalist", high: "nationalist" });
    expect(METRIC_COPY["person.ideology.authLibertarian"]!.scale).toEqual({ low: "libertarian", high: "authoritarian" });
  });
});
