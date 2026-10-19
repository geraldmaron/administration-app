import { describe, expect, it } from "vitest";
import { intensityWord } from "./conflict-intensity";

describe("intensityWord", () => {
  it("cuts at 15, 40 and 70 of 100", () => {
    expect(intensityWord(0)).toBe("Held");
    expect(intensityWord(0.149)).toBe("Held");
    expect(intensityWord(0.15)).toBe("Simmering");
    expect(intensityWord(0.399)).toBe("Simmering");
    expect(intensityWord(0.4)).toBe("Hot");
    expect(intensityWord(0.699)).toBe("Hot");
    expect(intensityWord(0.7)).toBe("Intense");
    expect(intensityWord(1)).toBe("Intense");
  });
});
