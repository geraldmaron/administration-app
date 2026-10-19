import { describe, expect, it } from "vitest";
import { ACT_OPTIONS, REPORT_AUTHORITIES, authorityByCite, hasAuthoredSeal, sealFor } from "@admin/player-core";
import { LAW_TOPICS, actAuthorities, commitmentAuthorities, familySeal, reportAuthority, serviceSeal, topicAuthorities, type LawTopic } from "./law";

describe("the law each foreign act rests on", () => {
  it("cites at least one registry authority for every act the workspace offers", () => {
    for (const option of ACT_OPTIONS) {
      const law = actAuthorities(option);
      expect(law.length, option.id).toBeGreaterThan(0);
      for (const authority of law) expect(authorityByCite(authority.cite)?.id, `${option.id} → ${authority.cite}`).toBe(authority.id);
    }
  });

  it("resolves every topic id, so a help line never shows a citation the registry lacks", () => {
    for (const topic of Object.keys(LAW_TOPICS) as LawTopic[]) expect(topicAuthorities(topic)).toHaveLength(LAW_TOPICS[topic].length);
  });

  it("puts force under the War Powers Resolution and sanctions under IEEPA", () => {
    expect(actAuthorities({ id: "military-4", family: "military" }).map((authority) => authority.cite)).toContain("50 U.S.C. §§1541–1548");
    expect(actAuthorities({ id: "economic-4", family: "economic" }).map((authority) => authority.id)).toEqual(["ieepa", "national-emergencies-act"]);
    expect(actAuthorities({ id: "assistance-4", family: "assist" })[0]?.cite).toBe("22 U.S.C. §2776");
    expect(actAuthorities({ id: "treaty-future-kind", family: "sign" }).map((authority) => authority.id)).toEqual(["const-art2-s2-cl2", "case-zablocki"]);
  });

  it("finds the War Powers record from the clock's own sections, 50 U.S.C. §§1543–1544", () => {
    expect(authorityByCite("50 U.S.C. §1543")?.id).toBe("war-powers-resolution");
    expect(authorityByCite("50 U.S.C. §1544")?.id).toBe("war-powers-resolution");
  });

  it("cites the law over every kind of standing commitment", () => {
    for (const kind of ["aid", "arms", "deployment", "basing", "sustainment", "program"]) expect(commitmentAuthorities(kind).length, kind).toBeGreaterThan(0);
    expect(commitmentAuthorities("arms")[0]?.cite).toBe("22 U.S.C. §2776");
  });

  it("names the clause each War Powers report option claims", () => {
    expect(REPORT_AUTHORITIES.map((option) => reportAuthority(option.value)?.id)).toEqual(["const-art2-s2-cl1", "war-powers-resolution", "un-charter-art51"]);
  });
});

describe("the emblem of the body that carries out an act", () => {
  it("draws an authored seal for every department and service it names", () => {
    for (const family of ["meet", "sign", "assist", "tariff", "diplomatic", "economic", "covert", "military", "congress"] as const) expect(hasAuthoredSeal(familySeal(family)), family).toBe(true);
    for (const service of ["INST-ARMY", "INST-NAVY", "INST-AIRFORCE", "army", "space", "cyber"]) expect(hasAuthoredSeal(serviceSeal(service)), service).toBe(true);
    expect(sealFor(serviceSeal("marines")).id).toBe("INST-NAVY");
  });
});
