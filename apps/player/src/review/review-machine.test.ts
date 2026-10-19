import { describe, expect, it } from "vitest";
import { CLOSED, reviewStep, type ReviewEvent, type ReviewState, type ReviewTerms } from "./review-machine";

const FULL: ReviewTerms = { tier: "full", title: "The order is signed", lines: [], verb: "Confirm and sign", danger: false };
const ROUTINE: ReviewTerms = { ...FULL, tier: "confirm", verb: "Confirm" };
const run = (events: readonly ReviewEvent[], from: ReviewState = CLOSED): ReviewState => events.reduce(reviewStep, from);
const open = (terms: ReviewTerms): ReviewEvent => ({ type: "open", terms });

describe("the presidential review", () => {
  it("opens terms immediately, with no simulated scan or automatic confirmation", () => {
    const ready = run([open(FULL)]);
    expect(ready).toEqual({ phase: "ready", terms: FULL });
    expect(run([{ type: "confirm" }], ready).phase).toBe("resolving");
  });

  it("gives a routine act a confirmation with no scan", () => {
    expect(run([open(ROUTINE)])).toEqual({ phase: "ready", terms: ROUTINE });
  });

  it("cancels before confirmation and refuses to cancel after it", () => {
    expect(run([open(FULL), { type: "cancel" }])).toBe(CLOSED);
    expect(run([open(ROUTINE), { type: "cancel" }])).toBe(CLOSED);
    expect(run([open(ROUTINE), { type: "confirm" }, { type: "cancel" }]).phase).toBe("resolving");
  });

  it("confirms once: a second confirm or a second open changes nothing", () => {
    const resolving = run([open(ROUTINE), { type: "confirm" }]);
    expect(run([{ type: "confirm" }], resolving)).toBe(resolving);
    expect(run([open(FULL)], resolving)).toBe(resolving);
  });

  it("closes any review that applied and saved, since the screen's result view takes over", () => {
    const applied = { type: "settle", result: { kind: "applied", date: "February 9, 2030", eventId: "evt-1" } } as const;
    expect(run([open(FULL), { type: "confirm" }, applied])).toBe(CLOSED);
    expect(run([open(ROUTINE), { type: "confirm" }, applied])).toBe(CLOSED);
  });

  it("keeps the result open for a routine act that was refused or not saved", () => {
    const refused = { type: "settle", result: { kind: "refused", words: "Time has moved." } } as const;
    const unsaved = { type: "settle", result: { kind: "applied", date: "February 9, 2030", saveError: "Storage is full." } } as const;
    expect(run([open(ROUTINE), { type: "confirm" }, refused]).phase).toBe("result");
    expect(run([open(ROUTINE), { type: "confirm" }, unsaved]).phase).toBe("result");
  });

  it("lets the display be dismissed while the act resolves, and ignores the late result", () => {
    const dismissed = run([open(FULL), { type: "confirm" }, { type: "dismiss" }]);
    expect(dismissed).toBe(CLOSED);
    expect(run([{ type: "settle", result: { kind: "refused", words: "No." } }], dismissed)).toBe(CLOSED);
  });

});
