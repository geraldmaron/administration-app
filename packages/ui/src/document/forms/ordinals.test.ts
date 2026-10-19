import { describe, expect, it } from "vitest";
import { congressOrdinalWords, numberWords, ordinalSuffix, witnessDate } from "./ordinals";

describe("Congress ordinals", () => {
  it("spells the Congress the way the enrolled print does", () => {
    expect(congressOrdinalWords(121)).toBe("One Hundred Twenty-first");
    expect(congressOrdinalWords(120)).toBe("One Hundred Twentieth");
    expect(congressOrdinalWords(111)).toBe("One Hundred Eleventh");
    expect(congressOrdinalWords(100)).toBe("One Hundredth");
  });

  it("writes the short ordinal the way the introduced print does", () => {
    expect(ordinalSuffix(121)).toBe("121st");
    expect(ordinalSuffix(112)).toBe("112th");
    expect(ordinalSuffix(2)).toBe("2nd");
  });
});

describe("a proclamation's witness date", () => {
  it("spells the day, the year and the year of Independence", () => {
    expect(witnessDate({ year: 2029, month: 1, day: 20 })).toBe("twentieth day of January, in the year of our Lord two thousand twenty-nine, and of the Independence of the United States of America the two hundred fifty-third");
    expect(numberWords(2000)).toBe("two thousand");
    expect(numberWords(250, true)).toBe("two hundred fiftieth");
    expect(numberWords(21, true)).toBe("twenty-first");
  });
});
