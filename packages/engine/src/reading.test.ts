import { describe, expect, it } from "vitest";
import { READING_SOURCES, readingCarriesFigure, readingSourceLabel, type Reading } from "./reading.js";

function reading(patch: Partial<Reading> = {}): Reading {
  return { band: "moderate", source: "intelligence-assessment", confidence: "moderate", ...patch };
}

describe("the reading contract", () => {
  it("words every source class, and never twice with the same words", () => {
    const labels = READING_SOURCES.map(readingSourceLabel);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(READING_SOURCES.length);
  });

  it("classifies seven ways, ordered from what the game declares to what somebody says", () => {
    expect(READING_SOURCES).toHaveLength(7);
    expect(READING_SOURCES[0]).toBe("canonical-fact");
    expect(READING_SOURCES[READING_SOURCES.length - 1]).toBe("allegation");
  });

  it("refuses a figure to an allegation however confident the teller is", () => {
    expect(readingCarriesFigure(reading({ source: "allegation", confidence: "high" }))).toBe(false);
  });

  it("refuses a figure to a low-confidence reading, and allows one above it", () => {
    expect(readingCarriesFigure(reading({ confidence: "low" }))).toBe(false);
    expect(readingCarriesFigure(reading({ confidence: "moderate" }))).toBe(true);
    expect(readingCarriesFigure(reading({ source: "canonical-fact", confidence: "high" }))).toBe(true);
  });

  it("carries a range only where one was given, rather than inventing an error bar", () => {
    expect(reading().range).toBeUndefined();
    expect(reading({ range: [0.2, 0.4] }).range).toEqual([0.2, 0.4]);
  });
});
