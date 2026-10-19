import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLACES, place } from "@admin/player-core";

// Every address player-core builds must land on a route file. The route tree
// is generated from these files, so reading them directly proves the same
// thing without needing a build.

const ROUTES = new URL("../routes/", import.meta.url);

function routeFiles(): readonly string[] {
  return readdirSync(ROUTES, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return readdirSync(new URL(`${entry.name}/`, ROUTES)).map((file) => `${entry.name}.${file}`);
    return [entry.name];
  });
}

function patternOf(file: string): RegExp | undefined {
  if (file.startsWith("__") || !file.endsWith(".tsx")) return undefined;
  const segments = file.slice(0, -".tsx".length).split(".");
  if (segments.at(-1) === "index") segments.pop();
  const body = segments.map((segment) => (segment === "$" ? ".*" : segment.startsWith("$") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/");
  return new RegExp(`^/${body}/?$`);
}

const PATTERNS = routeFiles().flatMap((file) => patternOf(file) ?? []);

function resolves(href: string): boolean {
  const pathname = href.split("?")[0]!;
  return PATTERNS.some((pattern) => pattern.test(pathname));
}

describe("every address player-core builds", () => {
  it("has a route behind each named destination", () => {
    const missing = Object.entries(PLACES).filter(([, destination]) => !resolves(destination.href));
    expect(missing.map(([key, destination]) => `${key}: ${destination.href}`)).toEqual([]);
  });

  it("has a route behind each builder, given an id", () => {
    const builders = Object.entries(place) as readonly [string, (id: string) => string][];
    const missing = builders.map(([name, build]) => [name, build("CA-12")] as const).filter(([, href]) => !resolves(href));
    expect(missing.map(([name, href]) => `${name}: ${href}`)).toEqual([]);
  });

  it("covers the four destinations that once had no screen", () => {
    for (const href of ["/record/press", "/record/press/dispatch/3", "/ending", "/legacy"]) expect(resolves(href), href).toBe(true);
  });

  it("does not take an unknown address for a route", () => {
    expect(resolves("/record/press/nowhere/else")).toBe(false);
    expect(resolves("/nowhere")).toBe(false);
  });
});
