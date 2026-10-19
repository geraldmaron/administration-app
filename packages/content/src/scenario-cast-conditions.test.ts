// The four things content learned to read: the running condition a scenario is
// about, the time of year on its own ground, what the administration ran on, and
// how long ago the deed was.
import { describe, expect, it } from "vitest";
import { apply, markedFlags, type Campaign, type NationCondition } from "@admin/engine";
import { previewBoards, sealedCampaign } from "./preview-board.js";
import { supplementBoards } from "./preview-board-oversight.js";
import { auditReachability } from "./scenario-reachability.js";
import {
  boundCondition,
  boundConditionLive,
  boundState,
  calendarMet,
  elapsedPhrase,
  governorName,
  markerTurnOf,
  seasonAt,
  sinceDeedPhrase,
  strickenNation,
  ticketMet,
} from "./scenario-cast-conditions.js";
import type { ScenarioCondition } from "./scenario-conditions.js";
import { bindCounterpart, castBound, castStillBound, scenarioLive, type ScenarioSelectorLike } from "./scenario-cast.js";
import { ScenarioDef } from "./scenario.js";
import type { NationId } from "@admin/world";

function selector(conditions: readonly ScenarioCondition[], locus?: ScenarioSelectorLike["locus"]): ScenarioSelectorLike {
  return {
    id: "probe",
    class: "unrest",
    severity: "serious",
    cast: { pick: "stricken" },
    conditions,
    weight: 1,
    ...(locus ? { locus } : {}),
  };
}

function plant(campaign: Campaign, patch: Partial<NationCondition> & Pick<NationCondition, "kind">): Campaign {
  const condition: NationCondition = {
    id: `condition:${patch.kind}:${campaign.founding.nation}:${patch.startedTurn ?? campaign.turn}`,
    nation: campaign.founding.nation,
    scope: "region",
    severity: 0.4,
    startedTurn: campaign.turn,
    status: "active",
    beats: [],
    ...patch,
  };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: `${patch.kind} planted` },
    effects: [{ kind: "condition", set: condition }],
  });
}

function withPlatform(campaign: Campaign, planks: readonly string[]): Campaign {
  return { ...campaign, founding: { ...campaign.founding, platform: planks as Campaign["founding"]["platform"] } };
}

function onMonth(campaign: Campaign, month: number): Campaign {
  return { ...campaign, calendar: { ...campaign.calendar, month } };
}

describe("the season", () => {
  it("reads the northern year, and flips below the equator", () => {
    expect(seasonAt(1, 40)).toBe("winter");
    expect(seasonAt(7, 40)).toBe("summer");
    expect(seasonAt(12, 40)).toBe("winter");
    expect(seasonAt(1, -33)).toBe("summer");
    expect(seasonAt(7, -33)).toBe("winter");
    expect(seasonAt(10, -33)).toBe("spring");
  });
});

describe("the calendar gate", () => {
  const campaign = sealedCampaign("calendar-gate");

  it("holds a month list to the month it is", () => {
    const gate: Extract<ScenarioCondition, { kind: "calendar" }> = { kind: "calendar", months: [6, 7, 8] };
    expect(calendarMet(onMonth(campaign, 7), gate, campaign.founding.nation)).toBe(true);
    expect(calendarMet(onMonth(campaign, 2), gate, campaign.founding.nation)).toBe(false);
  });

  // Argentina: the same January, read below the equator, is summer.
  const southern = "ARG" as NationId;

  it("reads a season on the ground the scenario stands on", () => {
    const gate: Extract<ScenarioCondition, { kind: "calendar" }> = { kind: "calendar", season: "winter" };
    expect(calendarMet(onMonth(campaign, 1), gate, campaign.founding.nation)).toBe(true);
    expect(calendarMet(onMonth(campaign, 7), gate, campaign.founding.nation)).toBe(false);
    expect(calendarMet(onMonth(campaign, 1), gate, southern)).toBe(false);
  });

  // A gate asking nothing would otherwise be true every week of the campaign.
  it("refuses a gate that names neither a month nor a season", () => {
    expect(calendarMet(onMonth(campaign, 7), { kind: "calendar" }, campaign.founding.nation)).toBe(false);
  });
});

describe("the ticket gate", () => {
  const campaign = sealedCampaign("ticket-gate");

  it("reads the party, the background and the route off the founding", () => {
    expect(ticketMet(campaign, { kind: "ticket", party: campaign.congress.administrationParty })).toBe(true);
    expect(ticketMet(campaign, { kind: "ticket", party: "no-such-party" })).toBe(false);
    expect(ticketMet(campaign, { kind: "ticket", background: campaign.founding.leader.backgroundId })).toBe(true);
    expect(ticketMet(campaign, { kind: "ticket", background: "no-such-background" })).toBe(false);
    expect(ticketMet(campaign, { kind: "ticket", route: campaign.founding.leader.routeId })).toBe(true);
  });

  // The preview boards seal with no platform, which is itself the case a plank
  // gate has to refuse: a campaign that ran on nothing ran on no plank.
  it("reads a plank off the platform, and refuses one that was never run on", () => {
    const plank = "plank-balanced-budget";
    expect(ticketMet(campaign, { kind: "ticket", plank })).toBe(false);
    const ran = withPlatform(campaign, [plank]);
    expect(ticketMet(ran, { kind: "ticket", plank })).toBe(true);
    expect(ticketMet(ran, { kind: "ticket", plank: "a-plank-nobody-ran-on" })).toBe(false);
  });

  // Every field named has to hold, not any of them.
  it("refuses when one named field misses", () => {
    expect(
      ticketMet(campaign, {
        kind: "ticket",
        party: campaign.congress.administrationParty,
        route: "no-such-route",
      }),
    ).toBe(false);
  });
});

describe("the condition bind", () => {
  const quiet = sealedCampaign("condition-bind");

  it("binds nothing on a board with no matching condition", () => {
    const def = selector([{ kind: "conditionActive", condition: "wildfire", atLeast: 0.1 }]);
    expect(boundCondition(quiet, def, quiet.founding.nation)).toBeUndefined();
    expect(boundState(quiet, def, quiet.founding.nation)).toBeUndefined();
  });

  it("binds the worst matching condition, and reads its state", () => {
    const campaign = plant(plant(quiet, { kind: "wildfire", severity: 0.3, state: "OR" }), {
      kind: "wildfire",
      severity: 0.7,
      state: "CO",
      startedTurn: quiet.turn - 1,
    });
    const def = selector([{ kind: "conditionActive", condition: "wildfire", atLeast: 0.1 }]);
    expect(boundCondition(campaign, def, campaign.founding.nation)?.severity).toBe(0.7);
    expect(boundState(campaign, def, campaign.founding.nation)).toBe("CO");
  });

  it("ignores a kind the scenario does not gate on", () => {
    const campaign = plant(quiet, { kind: "flood", severity: 0.9, state: "MO" });
    const def = selector([{ kind: "conditionActive", condition: "wildfire", atLeast: 0.1 }]);
    expect(boundCondition(campaign, def, campaign.founding.nation)).toBeUndefined();
  });

  // A nation-scope condition is a real condition with no place in it: the bind
  // has nothing to say and the locus resolver places the event as it always has.
  it("binds a nation-scope condition and reads no state from it", () => {
    const campaign = plant(quiet, { kind: "recession", scope: "nation", severity: 0.5 });
    const def = selector([{ kind: "conditionActive", condition: "recession", atLeast: 0.1 }]);
    expect(boundCondition(campaign, def, campaign.founding.nation)).toBeDefined();
    expect(boundState(campaign, def, campaign.founding.nation)).toBeUndefined();
  });

  it("answers whether the record it was bound to is still running", () => {
    const campaign = plant(quiet, { kind: "wildfire", severity: 0.5, state: "CO" });
    const def = selector([{ kind: "conditionActive", condition: "wildfire", atLeast: 0.1 }]);
    const bound = boundCondition(campaign, def, campaign.founding.nation);
    expect(bound).toBeDefined();
    expect(boundConditionLive(campaign, bound!.id)).toBe(true);
    expect(boundConditionLive(quiet, bound!.id)).toBe(false);
  });
});

describe("the stricken cast", () => {
  const quiet = sealedCampaign("stricken-cast");

  it("casts nobody while nothing has struck the country", () => {
    expect(strickenNation(quiet)).toBeUndefined();
  });

  it("casts the player's own government under an acute condition", () => {
    const struck = plant(quiet, { kind: "wildfire", severity: 0.5, state: "CO" });
    expect(strickenNation(struck)).toBe(quiet.founding.nation);
  });

  // A recession is a condition a government manages, not a place it was struck.
  it("does not cast on a standing condition alone", () => {
    const slump = plant(quiet, { kind: "recession", scope: "nation", severity: 0.6 });
    expect(strickenNation(slump)).toBeUndefined();
  });
});

describe("the governor of a bound state", () => {
  it("names the person actually seated", () => {
    const campaign = sealedCampaign("governor-token");
    const name = governorName(campaign, "CO");
    expect(name).toBeTruthy();
    expect(campaign.states.CO?.governor?.person).toBeDefined();
  });

  // The District has no governor, and a token against it must render nothing
  // rather than a name the country does not have.
  it("names nobody for an unseated seat", () => {
    expect(governorName(sealedCampaign("governor-token"), "DC")).toBeUndefined();
  });
});

describe("how long ago", () => {
  it("says it in the words a person would use", () => {
    expect(elapsedPhrase(0)).toBe("this week");
    expect(elapsedPhrase(1)).toBe("last week");
    expect(elapsedPhrase(3)).toBe("three weeks ago");
    expect(elapsedPhrase(9)).toBe("two months ago");
    expect(elapsedPhrase(26)).toBe("six months ago");
    expect(elapsedPhrase(48)).toBe("eleven months ago");
    expect(elapsedPhrase(52)).toBe("a year ago");
    expect(elapsedPhrase(104)).toBe("two years ago");
  });

  it("reads the elapsed time off the flag's own marker", () => {
    const base = sealedCampaign("since-deed");
    const stamped = apply(base, {
      source: "simulate",
      actor: "world",
      turn: base.turn,
      narration: { summary: "the deed" },
      effects: [{ kind: "flag", set: markedFlags(["guaranteed-the-deposits"], base.turn) }],
    });
    expect(markerTurnOf(stamped, "guaranteed-the-deposits")).toBe(base.turn);
    const def = selector([{ kind: "flag", flag: "guaranteed-the-deposits", is: true }]);
    expect(sinceDeedPhrase(stamped, def)).toBe("this week");
    const later = { ...stamped, turn: stamped.turn + 5 };
    expect(sinceDeedPhrase(later, def)).toBe("five weeks ago");
  });

  it("says nothing where there is no gating flag, or no marker behind it", () => {
    const base = sealedCampaign("since-deed");
    expect(sinceDeedPhrase(base, selector([{ kind: "turn", atLeast: 2 }]))).toBeUndefined();
    expect(sinceDeedPhrase(base, selector([{ kind: "flag", flag: "never-set", is: true }]))).toBeUndefined();
  });
});

// The bind end to end: a domestic decision whose place, governor and season all
// come from the fire that is actually burning.
const theFireOnTheRidge: ScenarioDef = {
  id: "probe-the-fire-on-the-ridge",
  class: "disaster",
  severity: "serious",
  dilemmaShape: "allocation",
  subject: "The fire on the ridge above the reservoir",
  cast: { pick: "stricken" },
  locus: {
    site: "interior",
    ground: "home",
    bind: "condition",
    descriptor: "the fire camp on the ridge road above the reservoir that supplies the valley",
  },
  conditions: [{ kind: "conditionActive", condition: "wildfire", atLeast: 0.1 }],
  weight: 1,
  opening: [
    {
      speaker: { kind: "narrator" },
      text: "The fire has been burning above the reservoir in {{state}} for nine days, and the governor, {{governor}}, has asked for the federal declaration in writing twice.",
    },
  ],
  replies: [
    {
      id: "sign-the-declaration",
      tone: "firm",
      text: "Sign the declaration tonight and put the federal money behind the line they are already holding.",
      commitment: {
        kind: "position",
        cost: { treasury: -400, stability: 0.02 },
        remembered: "The administration signed the declaration the night it was asked for, and the money reached the fire line inside a week.",
        rejoinder: { speaker: { kind: "narrator" }, text: "The crews on the ridge road were paid federal rates by the weekend, and the reservoir held." },
      },
    },
    {
      id: "hold-the-state-to-its-own-plan",
      tone: "firm",
      text: "Hold them to the plan they filed. The federal money follows the plan, and the plan says the line holds at the ridge road.",
      commitment: {
        kind: "position",
        cost: { stability: -0.03, standing: -0.02 },
        remembered: "The administration held the state to the plan it had filed rather than signing a declaration written in the middle of a fire.",
        rejoinder: { speaker: { kind: "narrator" }, text: "The ridge road held for two more days and then it did not, and the plan was the first document anybody asked to see." },
      },
    },
  ],
};

describe("a decision bound to the fire that is burning", () => {
  const quiet = sealedCampaign("bound-decision");

  it("parses", () => {
    expect(ScenarioDef.safeParse(theFireOnTheRidge).success).toBe(true);
  });

  it("is not live, and casts nobody, while nothing is burning", () => {
    expect(scenarioLive(quiet, theFireOnTheRidge, quiet.founding.nation)).toBe(false);
    expect(bindCounterpart(quiet, theFireOnTheRidge)).toBeUndefined();
  });

  it("never leaves a raw place token when the fire it is bound to names no state", () => {
    const burning = plant(quiet, { kind: "wildfire", severity: 0.6, scope: "nation" });
    expect(scenarioLive(burning, theFireOnTheRidge, burning.founding.nation)).toBe(true);
    const beat = castBound(burning, theFireOnTheRidge, burning.founding.nation).script.opening[0]!.text;
    expect(beat).not.toMatch(/\{\{/);
    expect(beat).toContain("in the country");
  });

  it("names the burning state and its seated governor", () => {
    const burning = plant(quiet, { kind: "wildfire", severity: 0.6, state: "CO" });
    expect(scenarioLive(burning, theFireOnTheRidge, burning.founding.nation)).toBe(true);
    const cast = castBound(burning, theFireOnTheRidge, burning.founding.nation);
    expect(cast.locus?.state).toBe("CO");
    expect(cast.locus?.placeName).toContain("Colorado");
    expect(cast.locus?.condition).toBe(boundCondition(burning, theFireOnTheRidge, burning.founding.nation)?.id);
    const beat = cast.script.opening[0]!.text;
    expect(beat).toContain("Colorado");
    expect(beat).not.toContain("{{");
    expect(beat).toContain(governorName(burning, "CO")!);
  });

  // The whole point of the bind: the state in the prose is the state on fire,
  // whichever one that is this campaign.
  it("follows the fire to another state", () => {
    const burning = plant(quiet, { kind: "wildfire", severity: 0.6, state: "OR" });
    const cast = castBound(burning, theFireOnTheRidge, burning.founding.nation);
    expect(cast.locus?.state).toBe("OR");
    expect(cast.script.opening[0]!.text).toContain("Oregon");
  });

  it("is withdrawn when the fire ends, and the frozen pin says so too", () => {
    const burning = plant(quiet, { kind: "wildfire", severity: 0.6, state: "CO" });
    const frozen = castBound(burning, theFireOnTheRidge, burning.founding.nation);
    expect(castStillBound(burning, frozen)).toBe(true);
    // The same campaign before the fire was planted stands in for the board the
    // week it ends: the record is gone, so the pinned decision is about nothing.
    expect(castStillBound(quiet, frozen)).toBe(false);
    expect(scenarioLive(quiet, theFireOnTheRidge, quiet.founding.nation)).toBe(false);
  });
});

// AC13's paired reading, the shape `economy-regate.test.ts` set: a bound week has
// to be dealt on a board carrying its condition and refused on the canonical
// spread alone. Refused on the spread is not a defect — it is the whole point of
// the bind — and it is what proves the supplement board is measuring the content
// rather than the fixture.
describe("the bound week on the preview harness", () => {
  it("is dealt under its condition and not without it", () => {
    const spread = previewBoards();
    expect(auditReachability([theFireOnTheRidge], spread)).toHaveLength(1);
    expect(auditReachability([theFireOnTheRidge], [...spread, ...supplementBoards([theFireOnTheRidge])])).toEqual([]);
  });
});
