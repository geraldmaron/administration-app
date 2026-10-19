import { describe, expect, it } from "vitest";
import type { Region } from "../data";
import { districtCode, labelTexts } from "./label-text";

const region = (layer: Region["layer"], id: string): Region => ({ index: 0, layer, id, centroid: [0, 0], label: [0, 0], area: 0, bounds: [0, 0, 0, 0], pointOnly: false });

describe("labelTexts", () => {
  it("writes a seat as its code, and with the place it is known by where there is room", () => {
    expect(districtCode("PA-07")).toBe("PA-7");
    expect(districtCode("AK-AL")).toBe("AK-AL");
    expect(districtCode("DC-DL")).toBe("DC");
    expect(labelTexts(region("districts", "PA-07"))).toEqual(["PA-7 · Allentown", "PA-7"]);
  });

  it("gives a state its name and its postal code, and a government its name and only a short form readers know", () => {
    expect(labelTexts(region("states", "PA"))).toEqual(["Pennsylvania", "PA"]);
    expect(labelTexts(region("world", "GBR"))).toEqual(["United Kingdom", "UK"]);
    expect(labelTexts(region("world", "DEU"))).toEqual(["Germany"]);
  });
});
