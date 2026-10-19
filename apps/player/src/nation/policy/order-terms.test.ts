import { describe, expect, it } from "vitest";
import type { OrderAuthority } from "@admin/engine";
import type { ChoiceTable, OrderDesk } from "@admin/player-core";
import { authorityWords, riskTable, scopeWords } from "./order-terms";

const authority = (kind: OrderAuthority["kind"]): OrderAuthority => ({ kind, cite: "50 U.S.C. §4501 et seq.", name: "The Defense Production Act", limit: "It reaches contracts, not prices.", source: "https://example.org", opened: "2026-10-01" });

describe("authorityWords", () => {
  it("names the act Congress would have to pass for a needs-act order", () => {
    const words = authorityWords(authority("needs-act"));
    expect(words).toContain("Congress would have to pass a law");
    expect(words).toContain("The Defense Production Act (50 U.S.C. §4501 et seq.)");
  });

  it("says a statute-backed order rests on a law, with its limit", () => {
    expect(authorityWords(authority("statute"))).toBe("Your power here comes from a law, The Defense Production Act (50 U.S.C. §4501 et seq.). It reaches contracts, not prices.");
  });

  it("refuses to invent an authority that is absent", () => {
    expect(authorityWords(undefined)).toBe("No law or part of the Constitution gives you this power, so you can't sign this order.");
  });
});

describe("scopeWords", () => {
  const order = (id: string) => ({ id }) as OrderDesk["order"];
  it("reads a country-wide order as the whole country", () => {
    expect(scopeWords({ order: order("order-x"), states: [] })).toBe("The whole country, with no state singled out");
  });
  it("counts who gains and who bears the cost", () => {
    const states = [{ state: "CA", helps: true }, { state: "TX", helps: false }, { state: "NY", helps: true }] as unknown as OrderDesk["states"];
    expect(scopeWords({ order: order("order-x"), states })).toBe("3 states affected, 2 helped and 1 paying the cost");
  });
  it("says relief is received, not borne", () => {
    const states = [{ state: "CA", helps: true }] as unknown as OrderDesk["states"];
    expect(scopeWords({ order: order("order-relief-program"), states })).toBe("1 state receives disaster relief");
  });
});

describe("riskTable", () => {
  it("keeps only the risk and politics rows beside every column", () => {
    const comparison: ChoiceTable = {
      columns: [{ id: "sign", label: "Sign" }],
      rows: ["cost", "challenge", "review", "politics", "pledges", "lands"].map((id) => ({ id, label: id, cells: [] })),
    };
    const table = riskTable({ comparison });
    expect(table.columns).toHaveLength(1);
    expect(table.rows.map((row) => row.id)).toEqual(["challenge", "review", "politics", "pledges"]);
  });
});
