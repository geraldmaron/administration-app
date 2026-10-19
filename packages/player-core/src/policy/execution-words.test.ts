import { describe, expect, it } from "vitest";
import { executionFigure, executionWords } from "./execution-words";

describe("execution words", () => {
  it("says a strong chair's multiplier as more than written, never as past 100%", () => {
    expect(executionWords(1.33)).toBe("has 33% more effect than written");
    expect(executionFigure(1.33)).toBe("+33%");
  });
  it("says a caretaker as less than written", () => {
    expect(executionWords(0.6)).toBe("has 40% less effect than written");
    expect(executionFigure(0.6)).toBe("−40%");
  });
  it("says a middling chair lands the program as written", () => {
    expect(executionWords(1.002)).toBe("has the full written effect");
    expect(executionFigure(1)).toBe("As written");
  });
});
