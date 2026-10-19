import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEADER_BACKGROUND,
  DEFAULT_LEADER_ROUTE,
  leaderBackgroundById,
  leaderBackgrounds,
  leaderRouteById,
  leaderRoutes,
} from "./leader-paths.js";

const AXES = ["competence", "loyalty", "ambition", "integrity", "charisma"] as const;

describe("routes to the office", () => {
  it("stays a choice rather than a menu, with unique ids the defaults resolve against", () => {
    expect(leaderRoutes.length).toBeGreaterThanOrEqual(3);
    expect(leaderRoutes.length).toBeLessThanOrEqual(5);
    expect(new Set(leaderRoutes.map((route) => route.id as string)).size).toBe(leaderRoutes.length);
    expect(leaderRouteById.get(DEFAULT_LEADER_ROUTE as string)).toBeDefined();
    expect(leaderBackgroundById.get(DEFAULT_LEADER_BACKGROUND as string)).toBeDefined();
  });

  // The same rule the backgrounds live under: if one arrival were better on all
  // five readings, the founding screen would have a right answer on it.
  it("has no route that beats another on every reading at once", () => {
    for (const a of leaderRoutes) {
      for (const b of leaderRoutes) {
        if (a.id === b.id) continue;
        const dominates = AXES.every((axis) => a.shift[axis] > b.shift[axis]);
        expect(dominates, `${a.name} dominates ${b.name} on every reading`).toBe(false);
      }
    }
  });

  // Every reachable pairing has to land inside 0..1 before the engine's
  // conviction and seniority terms are even applied, so no authored pair can
  // reach the chair only because a clamp caught it.
  it("keeps every background and route pairing inside the readings' range", () => {
    for (const background of leaderBackgrounds) {
      for (const route of leaderRoutes) {
        for (const axis of AXES) {
          const value = background.base[axis] + route.shift[axis];
          expect(value, `${background.name} by ${route.name} on ${axis}`).toBeGreaterThanOrEqual(0);
          expect(value, `${background.name} by ${route.name} on ${axis}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  // Both halves of the composed bio are written for a presidential seat, not
  // for the parliamentary nation this dataset used to carry.
  it("writes arrivals for this office rather than for a chamber", () => {
    const parliamentary = /coalition|chamber|governing party|prime minister|confidence vote/i;
    for (const route of leaderRoutes) {
      const prose = `${route.name} ${route.kicker} ${route.rationale} ${route.arrivalLine}`;
      expect(parliamentary.test(prose), `${route.name} reads as parliamentary`).toBe(false);
    }
    for (const background of leaderBackgrounds) {
      expect(parliamentary.test(background.careerLine), `${background.name} reads as parliamentary`).toBe(false);
    }
  });
});

describe("the American lives a President can have led", () => {
  it("offers the careers American presidents and nominees come from, and no fictional-nation ones", () => {
    expect(leaderBackgrounds.map((background) => background.name)).toEqual([
      "U.S. Senator",
      "House Member",
      "Governor",
      "Vice President",
      "General",
      "Business Executive",
      "Cabinet Secretary",
      "Mayor",
    ]);
    const retired = /central bank|union organizer|career diplomat|party organizer/i;
    for (const background of leaderBackgrounds) {
      expect(retired.test(`${background.name} ${background.rationale}`), background.name).toBe(false);
    }
  });

  // The mandate a President won by is its own founding choice, so no route may
  // also claim a popular vote or a vacancy the calendar cannot produce.
  it("routes to the nomination, not to the election result or a succession", () => {
    const claims = /popular vote|electoral count|vacancy|funeral|landslide/i;
    for (const route of leaderRoutes) {
      expect(claims.test(`${route.name} ${route.kicker} ${route.rationale} ${route.arrivalLine}`), route.name).toBe(false);
    }
  });
});
