// The transition's routing rules. These are the reason a blocked seal can send
// the player to the control that unblocks it, so they are tested apart from any
// screen that renders them.

import { describe, expect, it } from "vitest";
import type { FoundingRejection, LeaderDraft } from "@admin/engine";
import {
  FOUNDING_STAGE_IDS,
  FOUNDING_STAGE_SPEC,
  STAGE_CLAUSE,
  STAGE_TITLE,
  blockedStages,
  leaderStageFor,
  nextStage,
  orderRejections,
  previousStage,
  routeRejections,
  stageForRejection,
  stageStanding,
  ticketConsequence,
  ticketLabel,
} from "./founding-stages";

const DEPARTMENTS = ["role-foreign-minister", "role-treasury-minister", "role-attorney-general"];

const ROUTING = { departments: DEPARTMENTS, leaderStage: "record" as const };

function rejection(subject: string, explanation = "It does not hold."): FoundingRejection {
  return { subject, explanation };
}

function draft(overrides: Partial<LeaderDraft> = {}): LeaderDraft {
  return {
    name: "Eleanor Vance",
    age: 55,
    backgroundId: "path-senator" as LeaderDraft["backgroundId"],
    routeId: "route-primaries" as LeaderDraft["routeId"],
    party: "democrat",
    ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
    ...overrides,
  };
}

describe("the stages of taking office", () => {
  it("asks one question at a time, in a fixed order of eight", () => {
    expect(FOUNDING_STAGE_IDS).toEqual(["person", "record", "politics", "ticket", "platform", "staff", "cabinet", "oath"]);
  });

  it("derives every stage lookup from the one declared spec", () => {
    // The order is the argument, so it is declared once as data rather than
    // as three parallel records that could disagree about a stage.
    expect(FOUNDING_STAGE_SPEC.map((stage) => stage.id)).toEqual([...FOUNDING_STAGE_IDS]);
    for (const stage of FOUNDING_STAGE_SPEC) {
      expect(STAGE_TITLE[stage.id]).toBe(stage.title);
      expect(STAGE_CLAUSE[stage.id]).toBe(stage.question);
    }
  });

  it("walks forward and back without falling off either end", () => {
    expect(previousStage("person")).toBeUndefined();
    expect(nextStage("person")).toBe("record");
    expect(nextStage("politics")).toBe("ticket");
    expect(nextStage("staff")).toBe("cabinet");
    expect(nextStage("oath")).toBeUndefined();
    expect(previousStage("oath")).toBe("cabinet");
  });
});

describe("routing a refusal to the control that fixes it", () => {
  it("sends a vacant chair to the Cabinet, carrying the chair it is about", () => {
    const routed = routeRejections([rejection("role-attorney-general")], ROUTING);
    expect(routed[0]!.stage).toBe("cabinet");
    expect(routed[0]!.role).toBe("role-attorney-general");
  });

  it("sends a refused running mate or mandate to the ticket, a staff post to the White House, a plank to the platform", () => {
    expect(stageForRejection(rejection("runningMate"), ROUTING)).toBe("ticket");
    expect(stageForRejection(rejection("mandate"), ROUTING)).toBe("ticket");
    const staff = routeRejections([rejection("role-chief-of-staff")], ROUTING)[0]!;
    expect(staff.stage).toBe("staff");
    expect(staff.role).toBe("role-chief-of-staff");
    expect(stageForRejection(rejection("plank-infrastructure"), ROUTING)).toBe("platform");
    expect(stageForRejection(rejection("platform"), ROUTING)).toBe("platform");
  });

  it("sends an unnamed President, a home state off the map or a face that contradicts the presentation to the person", () => {
    expect(leaderStageFor(draft({ name: "   " }))).toBe("person");
    expect(leaderStageFor(draft({ homeState: "ZZ" as LeaderDraft["homeState"] }))).toBe("person");
    expect(
      leaderStageFor(draft({ presentation: "feminine", portraitRef: "npc/europe-north/masculine/senior/tone-1/business/short/graying/none/none/v1" })),
    ).toBe("person");
    expect(leaderStageFor(draft({ portraitRef: "not-a-face" }))).toBe("person");
    expect(stageForRejection(rejection("leader"), { departments: DEPARTMENTS, leaderStage: "person" })).toBe("person");
  });

  it("sends an implausible age to the record, which is where the career and the age are asked", () => {
    expect(leaderStageFor(draft({ age: 21 }))).toBe("record");
    expect(stageForRejection(rejection("leader"), ROUTING)).toBe("record");
  });

  it("keeps a refusal the player cannot act on at the oath rather than inventing a stage for it", () => {
    expect(stageForRejection(rejection("charter-usa-constitution"), ROUTING)).toBe("oath");
    expect(routeRejections([rejection("nation")], ROUTING)[0]!.role).toBeUndefined();
  });

  it("reports the blocked stages in transition order, not in the order they were raised", () => {
    const routed = routeRejections(
      [rejection("role-attorney-general"), rejection("role-press-secretary"), rejection("leader"), rejection("runningMate")],
      ROUTING,
    );
    expect(blockedStages(routed)).toEqual(["record", "ticket", "staff", "cabinet"]);
    expect(orderRejections(routed).map((entry) => entry.stage)).toEqual(["record", "ticket", "staff", "cabinet"]);
  });

  it("names one stage once however many refusals it carries", () => {
    const routed = routeRejections([rejection("role-foreign-minister"), rejection("role-treasury-minister")], ROUTING);
    expect(blockedStages(routed)).toEqual(["cabinet"]);
  });
});

describe("the ticket an administration runs on", () => {
  it("prefers the party the player chose over the one the economics resolve to", () => {
    expect(ticketLabel("republican", "Democratic Party")).toBe("Republican Party");
  });

  it("says what an independent presidency is rather than printing a blank", () => {
    expect(ticketLabel("independent", undefined)).toBe("Independent");
    expect(ticketConsequence("Independent")).toMatch(/You don't belong to a party/);
  });

  it("falls back to the resolved ticket while no explicit choice exists, and says when there is none", () => {
    expect(ticketLabel(undefined, "Democratic Party")).toBe("Democratic Party");
    expect(ticketConsequence("Democratic Party")).toMatch(/Congress sees you as part of the Democratic Party/);
    expect(ticketLabel(undefined, undefined)).toBe("No ticket");
  });
});

describe("how a stage reads on the rail", () => {
  it("keeps a broken stage behind the player marked as broken", () => {
    expect(stageStanding("record", "cabinet", ["record"])).toBe("blocked");
  });

  it("does not call the stage the player is standing on 'blocked' as well as 'current'", () => {
    expect(stageStanding("cabinet", "cabinet", ["cabinet"])).toBe("current");
  });

  it("separates a stage already answered from one not yet asked", () => {
    expect(stageStanding("person", "politics", [])).toBe("settled");
    expect(stageStanding("oath", "politics", [])).toBe("ahead");
  });
});
