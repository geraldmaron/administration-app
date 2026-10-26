import {
  COURT_ORDER_KINDS,
  DIRECTIVE_KIND_WEIGHT,
  EMERGENCY_DECLARATION_AUTHORITY,
  EXECUTIVE_ORDERS,
  INSTITUTION_IDS,
  LOCALE_ACTS,
  LOCALE_MISSION_ORDERS,
  directiveRefusal,
  institutionDef,
  localeActAuthority,
  type DirectiveKind,
} from "@admin/engine";
import { describe, expect, it } from "vitest";
import { glossaryEntry } from "../glossary/index.js";
import {
  AUTHORITIES,
  AUTHORITY_SOURCE_HOSTS,
  DIRECTIVE_AUTHORITY_EXEMPTIONS,
  authoritiesForGlossaryTerm,
  authorityByCite,
  authorityKeys,
  authorityView,
  normalizeCite,
  orderAuthorityRecord,
  resolveAuthorityText,
  sourceHost,
  unplacedAuthorities,
  LAW_SECTIONS,
} from "./index.js";

function directiveAuthorityTexts(): readonly string[] {
  const kinds = Object.keys(DIRECTIVE_KIND_WEIGHT) as DirectiveKind[];
  const texts = INSTITUTION_IDS.flatMap((id) => {
    const def = institutionDef(id);
    return def ? kinds.flatMap((kind) => directiveRefusal(def, kind)?.authority ?? []) : [];
  });
  return [...new Set(texts)];
}

describe("the authority registry", () => {
  it("gives every record a unique id and every name or cite one record", () => {
    const ids = AUTHORITIES.map((authority) => authority.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shared = [...authorityKeys()].filter(([, owners]) => owners.length > 1);
    expect(shared).toEqual([]);
  });

  it("links every record to an https primary source on an allowed host", () => {
    const bad = AUTHORITIES.filter((authority) => {
      const host = sourceHost(authority.sourceUrl);
      return host === undefined || !AUTHORITY_SOURCE_HOSTS.includes(host);
    }).map((authority) => authority.id);
    expect(bad).toEqual([]);
  });

  it("writes a summary and at least one limit for every record, and names only glossary terms that exist", () => {
    expect(AUTHORITIES.filter((authority) => authority.summary.length < 40 || authority.limits.length === 0).map((a) => a.id)).toEqual([]);
    const missing = AUTHORITIES.flatMap((authority) => (authority.glossaryTerms ?? []).filter((id) => glossaryEntry(id) === undefined));
    expect(missing).toEqual([]);
  });

  it("finds every record by its own cite", () => {
    expect(AUTHORITIES.filter((authority) => authorityByCite(authority.cite) !== authority).map((a) => a.id)).toEqual([]);
  });
});

describe("engine citations", () => {
  it("resolves the authority of every order in the catalogue", () => {
    const unresolved = EXECUTIVE_ORDERS.filter((order) => !order.authority || !orderAuthorityRecord(order.authority)).map((order) => order.id);
    expect(unresolved).toEqual([]);
    expect(orderAuthorityRecord(EMERGENCY_DECLARATION_AUTHORITY)?.id).toBe("national-emergencies-act");
  });

  it("maps orders to the statute they run on", () => {
    const byOrder = new Map(EXECUTIVE_ORDERS.map((order) => [order.id, order.authority ? orderAuthorityRecord(order.authority)?.id : undefined]));
    expect(byOrder.get("order-asset-seizure")).toBe("ieepa");
    expect(byOrder.get("order-relief-program")).toBe("stafford-major-disaster");
    expect(byOrder.get("order-entry-suspension")).toBe("ina-212f");
    expect(byOrder.get("order-price-controls")).toBe("economic-stabilization-act");
    expect(byOrder.get("order-regulatory-review")).toBe("const-art2-s3");
  });

  it("resolves the law of every mission order, every locale act and every court order Justice can seek", () => {
    const cited = [
      ...LOCALE_MISSION_ORDERS.map((order) => [order.id, order.authority] as const),
      ...LOCALE_ACTS.map((act) => [act.id, localeActAuthority(act)] as const),
      ...Object.values(COURT_ORDER_KINDS).map((kind) => [kind.kind, kind.authority] as const),
    ];
    const unresolved = cited.filter(([id, authority]) => !authority ? !["waiver", "review"].includes(id) : !orderAuthorityRecord(authority));
    expect(unresolved.map(([id]) => id)).toEqual([]);
    const byId = new Map(cited.map(([id, authority]) => [id, authority ? orderAuthorityRecord(authority)?.id : undefined]));
    expect(byId.get("order-immigration-operation")).toBe("ina-officer-powers");
    expect(byId.get("order-joint-task-force")).toBe("doj-investigative-officials");
    expect(byId.get("request-deployment")).toBe("guard-state-duty-502f");
    expect(byId.get("priority")).toBe("attorney-general-functions");
    expect(byId.get("title-iii-order")).toBe("title-iii-interception");
    expect(byId.get("search-warrant")).toBe("search-warrant-rule-41");
    expect(byId.get("injunction-enforcement")).toBe("united-states-as-plaintiff");
    expect(byId.get("fisa-order")).toBe("fisa");
  });

  it("resolves every directive refusal's authority, or exempts it for a stated reason", () => {
    const texts = directiveAuthorityTexts();
    expect(texts.length).toBeGreaterThan(3);
    const exempt = (text: string) => DIRECTIVE_AUTHORITY_EXEMPTIONS.some((entry) => entry.pattern.test(text));
    expect(texts.filter((text) => !exempt(text) && !resolveAuthorityText(text))).toEqual([]);
    expect(DIRECTIVE_AUTHORITY_EXEMPTIONS.every((entry) => entry.reason.length > 20)).toBe(true);
  });
});

describe("citation normalization", () => {
  it("reads the same cite written different ways", () => {
    expect(normalizeCite("50 U.S.C. §§1541–1548")).toBe(normalizeCite("50 USC 1541-1548"));
    expect(normalizeCite("U.S. Const. art. II, §3")).toBe(normalizeCite("Article II, Section 3"));
    expect(normalizeCite("Exec. Order No. 12333")).toBe(normalizeCite("EO 12333"));
    expect(normalizeCite("Pub. L. 107-40")).toBe(normalizeCite("Public Law 107-40"));
    expect(normalizeCite("26 U.S.C. § 7217")).toBe(normalizeCite("26 USC Sec. 7217"));
  });

  it("finds a record from a pinpoint cite inside its sections, preferring the narrowest", () => {
    expect(authorityByCite("50 U.S.C. §1702(a)(1)(B)")?.id).toBe("ieepa");
    expect(authorityByCite("50 USC 1544")?.id).toBe("war-powers-resolution");
    expect(authorityByCite("42 U.S.C. §5170")?.id).toBe("stafford-major-disaster");
    expect(authorityByCite("42 U.S.C. §5122")?.id).toBe("stafford-act");
    expect(authorityByCite("5 U.S.C. §3349d")?.id).toBe("vacancies-reform-act");
    expect(authorityByCite("2 C.F.R. §200.211(c)(1)(ii)")?.id).toBe("uniform-guidance-award-terms");
    expect(authorityByCite("U.S. Const. art. II, §2, cl. 2")?.id).toBe("const-art2-s2-cl2");
    expect(authorityByCite("Twenty-fifth Amendment")?.id).toBe("amend-25");
    expect(authorityByCite("99 U.S.C. §1")).toBeUndefined();
  });

  it("does not guess a clause the text leaves out", () => {
    expect(authorityByCite("Article II, Section 2")).toBeUndefined();
    expect(authorityByCite("Article I, Section 7")?.id).toBe("const-art1-s7");
  });

  it("finds the first authority a sentence names", () => {
    expect(resolveAuthorityText("28 U.S.C. § 509 and the Department's standing policy on communications with the White House")?.id).toBe(
      "attorney-general-functions",
    );
    expect(resolveAuthorityText("the Federal Reserve Act, 12 U.S.C. §§ 241–242")?.id).toBe("federal-reserve-board");
    expect(resolveAuthorityText("Fair Labor Standards Act, 29 U.S.C. §§207(a)(1), 216(b), 216(c) and 260.")?.id).toBe("fair-labor-standards-act");
    expect(resolveAuthorityText("Foreign Intelligence Surveillance Act, 50 U.S.C. §§1801(f), 1809 and 1810.")?.id).toBe("fisa");
    expect(resolveAuthorityText("Help America Vote Act §§301(a)(3) and 401; Congress's federal-election authority under Article I, §4.")?.id).toBe(
      "help-america-vote-act",
    );
    expect(resolveAuthorityText("The Annual Defense Authorization Act's industrial-base title and the Defense Production Act's priority authority.")?.id).toBe(
      "defense-production-act",
    );
    expect(resolveAuthorityText("8 U.S.C. §1182(f); Trump v. Hawaii, 585 U.S. 667 (2018)")?.id).toBe("ina-212f");
    expect(resolveAuthorityText("Congress is notified under the War Powers Resolution")?.id).toBe("war-powers-resolution");
    expect(resolveAuthorityText("A memo about nothing in particular")).toBeUndefined();
  });

  it("resolves the statute names the clocks and the desk already print", () => {
    for (const name of ["War Powers Resolution", "Congressional Review Act", "Article I, Section 7", "Presentment clause"]) {
      expect(resolveAuthorityText(name), name).toBeDefined();
    }
  });
});

describe("the view and the Handbook chapter", () => {
  it("draws a record with its source's plain name and its kind", () => {
    const view = authorityView(authorityByCite("50 U.S.C. §§1541–1548")!);
    expect(view.sourceLabel).toBe("United States Code, Office of the Law Revision Counsel");
    expect(view.kindLabel).toBe("Statute");
    expect(view.inForce).toBe(true);
    expect(authorityView(authorityByCite("Pub. L. 91-379")!).inForce).toBe(false);
  });

  it("places every record in exactly one section and names only records that exist", () => {
    const placed = LAW_SECTIONS.flatMap((section) => section.authorities);
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.filter((id) => !AUTHORITIES.some((authority) => authority.id === id))).toEqual([]);
    expect(unplacedAuthorities().map((authority) => authority.id)).toEqual([]);
  });

  it("offers the records behind a glossary term", () => {
    expect(authoritiesForGlossaryTerm("war-powers-resolution").map((authority) => authority.id)).toContain("war-powers-resolution");
  });
});
