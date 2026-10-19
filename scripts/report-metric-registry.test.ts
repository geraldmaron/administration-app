import { describe, expect, it } from "vitest";
import { buildReport } from "./report-metric-registry.mjs";

type Report = { readonly fields: Record<string, { readonly readers: readonly string[]; readonly writers: readonly string[] }> };

// The report is committed so that its diff is the audit. That only holds if
// the same tree always writes the same bytes, and if a site is keyed by its
// declaration rather than its line, so moving code does not churn it.
describe("the metric registry report", () => {
  const first = buildReport() as Report;

  it("writes the same report twice from the same tree", () => {
    expect(JSON.stringify(buildReport())).toBe(JSON.stringify(first));
  });

  it("keys every site by path#declaration, never by line", () => {
    const sites = Object.values(first.fields).flatMap((field) => [...field.readers, ...field.writers]);
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.filter((site) => !/^[\w./-]+\.(tsx?|mjs)#[\w$<>]+( \(.+\))?$/.test(site))).toEqual([]);
  });
}, 120_000);
