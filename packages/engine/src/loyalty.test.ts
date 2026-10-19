import { describe, expect, it } from "vitest";
import { Person, type PersonId, type RoleId } from "@admin/world";
import { buildCampaign, nationB, person as base } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { cabinetLoyaltyPhase, selectLoyaltyTrend, HEEDED_GAIN, OVERRULED_COST } from "./loyalty.js";
import { cabinetRiskRate } from "./cabinet.js";
import type { ActionRecord, Campaign } from "./state.js";

const ROLE = "role-foreign-minister" as RoleId;

const TURN = buildCampaign().turn;

const minister = Person.parse({ ...base, id: "PER-9", name: "Ilse Brandt", eligibleRoles: [ROLE] });

function seated(entries: readonly ActionRecord[]): Campaign {
  const campaign = buildCampaign();
  return {
    ...campaign,
    people: {
      ...campaign.people,
      [minister.id]: {
        base: minister,
        alive: true,
        currentRole: ROLE,
        loyaltyAtAppointment: minister.loyalty,
      },
    },
    player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [ROLE]: minister.id } },
    ledger: [...campaign.ledger, ...entries],
  };
}

function call(turn: number, stance: "for" | "against" | "wary"): ActionRecord {
  return {
    turn,
    actor: "player",
    description: "United States uses Private Warning against Alpland, and it lands.",
    commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
    counsel: { role: ROLE, person: minister.id, stance, successChance: 0.6 },
  };
}

function run(campaign: Campaign): Campaign {
  return cabinetLoyaltyPhase(campaign).reduce(apply, campaign);
}

describe("loyalty answers to being listened to", () => {
  it("costs a chair regard when the president goes the other way", () => {
    const campaign = seated([call(TURN, "against")]);
    const after = run(campaign);
    expect(after.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + OVERRULED_COST, 5);
  });

  it("pays less for being heeded than being overruled costs", () => {
    const heeded = run(seated([call(TURN, "for")]));
    expect(heeded.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + HEEDED_GAIN, 5);
    expect(HEEDED_GAIN).toBeLessThan(Math.abs(OVERRULED_COST));
  });

  it("does not move on a hedge, which is not a position to overrule", () => {
    expect(cabinetLoyaltyPhase(seated([call(TURN, "wary")]))).toEqual([]);
  });

  // The phase reads the turn just resolved and only that turn. Scoring the
  // whole record every week would charge a president for the same decision
  // once a week for the rest of the term.
  it("scores a week's calls once, not the whole record every week", () => {
    const campaign = seated([call(TURN, "against")]);
    const week1 = run(campaign);
    const week2 = run({ ...week1, turn: week1.turn + 1 });
    expect(week2.people[minister.id]!.base.loyalty).toBe(week1.people[minister.id]!.base.loyalty);
  });

  it("never drives loyalty out of its own bounds", () => {
    const overruledRepeatedly = seated(Array.from({ length: 200 }, () => call(TURN, "against")));
    const after = run(overruledRepeatedly);
    expect(after.people[minister.id]!.base.loyalty).toBe(0);
  });

  // The point of the rule: the consequences the engine already draws are now
  // downstream of how the president has actually governed.
  it("makes the weekly risk of breaking ranks answer to the president's own decisions", () => {
    const campaign = seated([call(TURN, "against"), call(TURN, "against"), call(TURN, "against")]);
    const before = cabinetRiskRate(campaign.people[minister.id]!.base);
    const after = cabinetRiskRate(run(campaign).people[minister.id]!.base);
    expect(after).toBeGreaterThan(before);
  });

  it("leaves the player's own chair alone", () => {
    const campaign = buildCampaign();
    const lead = campaign.founding.leadRole;
    const holder = campaign.player.cabinet[lead]!;
    const withCall: Campaign = {
      ...campaign,
      ledger: [
        ...campaign.ledger,
        {
          turn: campaign.turn,
          actor: "player",
          description: "United States uses Private Warning against Alpland, and it lands.",
          commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
          counsel: { role: lead, person: holder, stance: "against", successChance: 0.6 },
        },
      ],
    };
    expect(cabinetLoyaltyPhase(withCall)).toEqual([]);
  });
});

describe("selectLoyaltyTrend", () => {
  it("says nothing about a minister who has not moved", () => {
    expect(selectLoyaltyTrend(seated([]), minister.id)).toBeUndefined();
  });

  it("reports the signed move from where they started, in whole points", () => {
    const after = run(seated([call(TURN, "against"), call(TURN, "against")]));
    const trend = selectLoyaltyTrend(after, minister.id)!;
    expect(trend.movedPoints).toBe(-4);
    expect(trend.atAppointment).toBe(minister.loyalty);
    expect(trend.now).toBeLessThan(trend.atAppointment);
  });

  // Without a stamped baseline there is no trend to state, and inventing one
  // from the founding roll would attribute a predecessor's drift to whoever
  // holds the chair now.
  it("has nothing to say about someone who has never been seated", () => {
    const campaign = seated([]);
    const unseated = (Object.keys(campaign.people) as PersonId[]).find((id) => !campaign.people[id]!.currentRole)!;
    expect(selectLoyaltyTrend(campaign, unseated)).toBeUndefined();
  });
});

// The whole meeting is on the record, so the whole meeting is scored. A
// decision routes to one chair and is argued by up to four, and reading only
// the chair it routed to made every other objection in the room free.
describe("a seat that was not the primary one", () => {
  const OTHER = "role-defense-minister" as RoleId;
  const otherHolder = "PER-8" as PersonId;

  function fromTheRoom(stance: "for" | "against" | "wary"): ActionRecord {
    return {
      turn: TURN,
      actor: "player",
      description: "The government says what it thinks, and says it out loud.",
      counsel: {
        role: OTHER,
        person: otherHolder,
        stance: "for",
        room: [
          { role: OTHER, person: otherHolder, stance: "for" },
          { role: ROLE, person: minister.id, stance },
        ],
      },
    };
  }

  it("charges a minister who was overruled from a chair the decision did not route to", () => {
    const after = run(seated([fromTheRoom("against")]));
    expect(after.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + OVERRULED_COST, 5);
  });

  it("pays a minister who was heeded from that same chair", () => {
    const after = run(seated([fromTheRoom("for")]));
    expect(after.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + HEEDED_GAIN, 5);
  });

  it("still reads nothing into a hedge, wherever in the room it was filed", () => {
    expect(cabinetLoyaltyPhase(seated([fromTheRoom("wary")]))).toEqual([]);
  });

  // An entry stamped before the room was kept, and every act that takes no
  // counsel at all, still have to score exactly as they did.
  it("falls back to the primary fields where no room was stamped", () => {
    const after = run(seated([call(TURN, "against")]));
    expect(after.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + OVERRULED_COST, 5);
  });

  // The primary voice is room[0], not a second copy of it. Reading both would
  // charge a president twice for overruling one minister once.
  it("scores a primary chair once, not once per copy of its own stance", () => {
    const campaign = seated([
      {
        turn: TURN,
        actor: "player",
        description: "The government says what it thinks, and says it out loud.",
        counsel: {
          role: ROLE,
          person: minister.id,
          stance: "against",
          room: [{ role: ROLE, person: minister.id, stance: "against" }],
        },
      },
    ]);
    expect(run(campaign).people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + OVERRULED_COST, 5);
  });
});

// The rule has to reach the replies players actually give. Nine in ten carry
// no instrument at all, and scoring only committed action would have left this
// firing on a tenth of the decisions the room argued about.
describe("a position is a decision too", () => {
  it("moves loyalty on a reply that commits no instrument", () => {
    const campaign = seated([
      {
        turn: TURN,
        actor: "player",
        description: "The government says what it thinks, and says it out loud.",
        counsel: { role: ROLE, person: minister.id, stance: "against" },
      },
    ]);
    const after = run(campaign);
    expect(after.people[minister.id]!.base.loyalty).toBeCloseTo(minister.loyalty + OVERRULED_COST, 5);
  });
});
