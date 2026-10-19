/**
 * Month-precision selections are due all month. Exact dates are due that day.
 */
import { describe, expect, it } from "vitest";
import { selectionDue, selectionDueNation } from "./election-due.js";

describe("selection due", () => {
  it("treats Belgium's June 2029 row as the whole month", () => {
    expect(selectionDue({ year: 2029, month: 6, day: 1 }, "BEL")).toBe(true);
    expect(selectionDue({ year: 2029, month: 6, day: 30 }, "BEL")).toBe(true);
    expect(selectionDue({ year: 2029, month: 7, day: 1 }, "BEL")).toBe(false);
  });

  it("does not schedule a conflict row or a country with no date", () => {
    expect(selectionDue({ year: 2029, month: 11, day: 1 }, "IRL")).toBe(false);
    expect(selectionDue({ year: 2029, month: 1, day: 1 }, "AFG")).toBe(false);
  });

  it("uses Canada's exact day", () => {
    expect(selectionDue({ year: 2029, month: 10, day: 15 }, "CAN")).toBe(true);
    expect(selectionDue({ year: 2029, month: 10, day: 16 }, "CAN")).toBe(false);
  });

  it("names one nation when several could be due", () => {
    const named = selectionDueNation({ year: 2029, month: 6, day: 13 });
    expect(named).toBe("BEL");
  });

  it("names Belgium and Canada inside a 208-week term and never the United States", () => {
    let date = { year: 2029, month: 1, day: 20 };
    const named = new Set<string>();
    let canadaDue = false;
    for (let day = 0; day < 208 * 7; day += 1) {
      const due = selectionDueNation(date);
      if (due) named.add(due);
      if (selectionDue(date, "CAN")) canadaDue = true;
      const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
      date = { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
    }
    expect(named.has("BEL")).toBe(true);
    expect(canadaDue).toBe(true);
    expect(named.has("USA")).toBe(false);
  });
});
