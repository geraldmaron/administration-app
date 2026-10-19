import { describe, expect, it } from "vitest";
import { MAP_COLORS, pinLayers } from "./style";

describe("pin layers", () => {
  const layers = pinLayers();
  const byId = (id: string) => layers.find((layer) => layer.id === id) as { filter?: unknown; paint?: Record<string, unknown> } | undefined;

  it("draws a waiting pin as a solid dot and a declaration as a hollow ring, so the two differ by shape and not only by color", () => {
    expect(byId("pin-dot")?.filter).toEqual(["==", ["get", "kind"], "needs"]);
    expect(byId("pin-dot")?.paint?.["circle-color"]).toBe(MAP_COLORS.alert);
    expect(byId("pin-declared")?.filter).toEqual(["==", ["get", "kind"], "declared"]);
    expect(byId("pin-declared")?.paint?.["circle-color"]).toBe(MAP_COLORS.sea);
    expect(byId("pin-declared")?.paint?.["circle-stroke-color"]).toBe(MAP_COLORS.gold);
  });
});
