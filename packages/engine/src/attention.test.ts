import { describe, expect, it } from "vitest";
import {
  closingDayOnOrAfter,
  composeAttentionStop,
  deferUntil,
  gatherMatters,
  MAX_MATTERS_PER_STOP,
  stopIsWarranted,
  type AttentionMatter,
  type AttentionSource,
} from "./attention.js";
import { addDays } from "./clock.js";
import type { GameDate } from "./state.js";

const day = { year: 2027, month: 3, day: 1 };

function matter(over: Partial<AttentionMatter> & { id: string }): AttentionMatter {
  return {
    source: "scenario",
    urgency: "soft",
    title: over.id,
    reason: "because",
    subject: over.id,
    date: day,
    ...over,
  };
}

describe("what reaches the desk", () => {
  it("shows nothing when the world raised nothing", () => {
    const stop = composeAttentionStop([]);
    expect(stop.presented).toEqual([]);
    expect(stopIsWarranted(stop)).toBe(false);
  });

  it("never shows more than three, however many were raised", () => {
    const stop = composeAttentionStop(
      Array.from({ length: 25 }, (_, i) => matter({ id: `m${i}` })),
    );
    expect(stop.presented.length).toBe(MAX_MATTERS_PER_STOP);
    expect(stop.deferred.length).toBe(22);
  });

  it("keeps everything it did not show rather than dropping it", () => {
    const raised = Array.from({ length: 10 }, (_, i) => matter({ id: `m${i}` }));
    const stop = composeAttentionStop(raised);
    expect(stop.presented.length + stop.deferred.length).toBe(raised.length);
  });

  it("puts every hard matter ahead of every soft one", () => {
    const stop = composeAttentionStop([
      matter({ id: "soft-a" }),
      matter({ id: "soft-b" }),
      matter({ id: "hard", urgency: "hard" }),
    ]);
    expect(stop.presented[0]!.id).toBe("hard");
  });

  it("orders by the nearest deadline, and puts undated worries behind dated ones", () => {
    const stop = composeAttentionStop([
      matter({ id: "standing" }),
      matter({ id: "later", dueDate: { year: 2027, month: 9, day: 30 } }),
      matter({ id: "sooner", dueDate: { year: 2027, month: 3, day: 15 } }),
    ]);
    expect(stop.presented.map((m) => m.id)).toEqual(["sooner", "later", "standing"]);
  });
});

describe("not the same problem twice", () => {
  it("collapses two matters about the same subject", () => {
    const stop = composeAttentionStop([
      matter({ id: "a", subject: "steel tariff" }),
      matter({ id: "b", subject: "steel tariff" }),
      matter({ id: "c", subject: "court" }),
    ]);
    expect(stop.presented.map((m) => m.id)).toEqual(["a", "c"]);
    expect(stop.deferred.map((m) => m.id)).toEqual(["b"]);
  });

  it("refuses to let one capital fill the desk", () => {
    const stop = composeAttentionStop([
      matter({ id: "a", actor: "CHN" }),
      matter({ id: "b", actor: "CHN" }),
      matter({ id: "c", actor: "CHN" }),
    ]);
    expect(stop.presented.length).toBe(1);
  });

  it("refuses to let one place fill the desk", () => {
    const stop = composeAttentionStop([
      matter({ id: "a", locale: "US-MI" }),
      matter({ id: "b", locale: "US-MI" }),
    ]);
    expect(stop.presented.length).toBe(1);
  });

  it("still shows two genuinely different rulings", () => {
    const stop = composeAttentionStop([
      matter({ id: "a", source: "court-ruling", subject: "order 12" }),
      matter({ id: "b", source: "court-ruling", subject: "order 19" }),
    ]);
    expect(stop.presented.length).toBe(2);
  });

  it("defers rather than drops a hard matter crowded out by other hard matters", () => {
    const stop = composeAttentionStop([
      matter({ id: "a", urgency: "hard", locale: "US-MI" }),
      matter({ id: "b", urgency: "hard", locale: "US-MI" }),
    ]);
    expect(stop.presented.map((m) => m.id)).toEqual(["a"]);
    expect(stop.deferred.map((m) => m.id)).toEqual(["b"]);
  });
});

describe("ambient is not attention", () => {
  it("never counts ambient against the three, and never stops for it", () => {
    const stop = composeAttentionStop([
      ...Array.from({ length: 30 }, (_, i) => matter({ id: `amb${i}`, urgency: "ambient" })),
    ]);
    expect(stop.presented).toEqual([]);
    expect(stop.ambient.length).toBe(30);
    expect(stopIsWarranted(stop)).toBe(false);
  });

  it("lets a busy ambient week still surface the one bill on the desk", () => {
    const stop = composeAttentionStop([
      ...Array.from({ length: 20 }, (_, i) => matter({ id: `amb${i}`, urgency: "ambient" })),
      matter({ id: "bill", urgency: "hard", source: "bill-signature" }),
    ]);
    expect(stop.presented.map((m) => m.id)).toEqual(["bill"]);
  });
});

describe("sources", () => {
  it("asks every source once and concatenates", () => {
    const raised = gatherMatters({}, day, [
      () => [matter({ id: "a" })],
      () => [matter({ id: "b" }), matter({ id: "c" })],
      () => [],
    ]);
    expect(raised.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("is content with a world where every source is quiet", () => {
    expect(gatherMatters({}, day, [() => [], () => []])).toEqual([]);
  });

  it("carries the press's standing source under its own name, not the market's", () => {
    const source: AttentionSource = "standing-threshold";
    expect(source).toBe("standing-threshold");
  });
});

describe("closingDayOnOrAfter", () => {
  it("is `from` itself when `from` already falls on the founding weekday", () => {
    const founding = { year: 2029, month: 1, day: 20 }; // a Saturday
    expect(closingDayOnOrAfter(founding, founding)).toEqual(founding);
  });

  it("advances to the next occurrence of the founding weekday otherwise", () => {
    const founding = { year: 2029, month: 1, day: 20 }; // a Saturday
    const midweek = { year: 2029, month: 1, day: 23 }; // the following Tuesday
    expect(closingDayOnOrAfter(midweek, founding)).toEqual({ year: 2029, month: 1, day: 27 });
  });
});

describe("deferUntil, a passed deadline", () => {
  const founding = { year: 2029, month: 1, day: 20 }; // a Saturday
  const lapsed = (from: GameDate): AttentionMatter => ({
    id: "appropriations",
    source: "appropriations-deadline",
    urgency: "hard",
    title: "Appropriations lapsed",
    reason: "because",
    subject: "appropriations",
    date: from,
    dueDate: addDays(from, -1),
  });

  it("without a founding date, still comes back the very next day (the narrower, older promise)", () => {
    const from = { year: 2029, month: 9, day: 30 };
    expect(deferUntil(lapsed(from), from)).toEqual(addDays(from, 1));
  });

  it("with a founding date, comes back on the next closing day rather than tomorrow", () => {
    const from = { year: 2029, month: 9, day: 30 }; // a Sunday; the next Saturday is Oct 6
    expect(deferUntil(lapsed(from), from, founding)).toEqual({ year: 2029, month: 10, day: 6 });
  });

  it("the six one-day appropriations stops on living-clock-a (2029-09-30 to 10-05) are gone", () => {
    // A statutory matter with a fixed due date, pressed once a day starting
    // the day it lapses. Before this change every one of the six days in the
    // window was its own deferral target (`from + 1`); now the first day's
    // deferral already lands outside the window, so at most one of the six
    // is a candidate stop.
    const dueDate = { year: 2029, month: 9, day: 29 };
    const matter: AttentionMatter = {
      id: "appropriations",
      source: "appropriations-deadline",
      urgency: "hard",
      title: "Appropriations lapsed",
      reason: "because",
      subject: "appropriations",
      date: dueDate,
      dueDate,
    };
    const windowStart = { year: 2029, month: 9, day: 30 };
    const windowEnd = { year: 2029, month: 10, day: 5 };
    const next = deferUntil(matter, windowStart, founding);
    expect(next.year === windowEnd.year && next.month === windowEnd.month && next.day <= windowEnd.day).toBe(false);
  });
});
