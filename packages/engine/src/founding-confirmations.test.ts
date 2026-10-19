import { describe, expect, it } from "vitest";
import type { PersonId, RoleId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { projectConfirmation } from "./congress.js";
import { confirmationQuestion, confirmationVote, CONSENSUS_MARGIN, crossingLoyaltyEffects, isConsensus, nomineeReadings } from "./confirmation-count.js";
import { foundingConfirmations } from "./founding-confirmations.js";
import { selectActing, dismissMinister, selectAppointableFor } from "./appointments.js";
import { apply } from "./effects.js";
import { institutionForRole } from "./institutions.js";
import { openNomination } from "./nomination.js";
import { voteOn } from "./congress-votes.js";
import { SENATE_LIAISON_BOUND } from "./hill.js";
import { vicePresidentLiaison } from "./vice-president.js";
import type { Campaign } from "./state.js";

const democrat = foundedForBalance("confirmations-d", "democrat").campaign;
// A seed whose founding has contested picks under the member-level record
// (confirmation-count.ts); "confirmations-i" sat on the consensus line and
// cleared it by a vote once a nominee's record stopped being clipped.
const independent = foundedForBalance("confirmations-independent", "independent").campaign;

describe("the Senate's answer to the founding cabinet", () => {
  it("confirms every pick that clears the majority by the consensus margin, and leaves them seated", () => {
    for (const [role, person] of Object.entries(democrat.player.cabinet)) {
      if (role === (democrat.founding.leadRole as string)) continue;
      expect(isConsensus(confirmationVote(democrat, person))).toBe(true);
      expect(democrat.people[person]!.currentRole).toBe(role);
    }
    expect(Object.keys(democrat.nominations)).toEqual([]);
  });

  it("sends a contested pick to the calendar at the committee's vote, with the deputy acting from day one", () => {
    const nominations = Object.values(independent.nominations);
    expect(nominations.length).toBeGreaterThan(0);
    const days = new Set(nominations.map((nomination) => nomination.stageEnteredDay));
    // The hearings were held together before the oath, so the committee votes
    // come due together.
    expect(days.size).toBe(1);
    for (const nomination of nominations) {
      expect(nomination.stage).toBe("committee-action");
      // The seal's own carry-over: its confirmation earns no standing a pick
      // confirmed on the first morning did not.
      expect(nomination.transition).toBe(true);
      const role = Object.keys(independent.founding.cabinet).find((seat) => independent.founding.cabinet[seat as RoleId] === nomination.nominee) as RoleId;
      expect(independent.player.cabinet[role]).toBeUndefined();
      expect(independent.people[nomination.nominee]!.currentRole).toBeUndefined();
      const acting = selectActing(independent, role);
      expect(acting).toBeDefined();
      expect(acting).not.toBe(nomination.nominee);
    }
  });

  it("counts only picks inside the margin as contested", () => {
    for (const nomination of Object.values(independent.nominations)) {
      const vote = confirmationVote(independent, nomination.nominee);
      expect(vote.yeas).toBeLessThan(vote.required + CONSENSUS_MARGIN + 1);
    }
  });

  it("seats the Vice President in the Senate's chair with a bounded liaison", () => {
    const officer = democrat.congress.presidingOfficer;
    expect(officer?.person).toBe(democrat.vicePresident);
    expect(Math.abs(officer!.liaison)).toBeLessThanOrEqual(SENATE_LIAISON_BOUND);
    expect(officer!.liaison).toBe(vicePresidentLiaison(democrat, democrat.vicePresident!));
  });

  it("is idempotent over a campaign it has already answered", () => {
    expect(foundingConfirmations(democrat)).toEqual(democrat);
  });
});

describe("a nominee from across the aisle", () => {
  const role = "role-commerce-secretary" as RoleId;
  const open = (() => {
    const result = dismissMinister(democrat, role);
    if (!result.ok) throw new Error(result.reason);
    return apply(democrat, result.packet);
  })();
  const ownSide = selectAppointableFor(open, role).find((runtime) => runtime.base.party === "party-usa-democrat")!.base.id;
  const crosser = selectAppointableFor(open, role).find((runtime) => runtime.base.party === "party-usa-republican")!.base.id;

  it("is counted exactly as the standing projection counts a nominee from the President's own side", () => {
    expect(nomineeReadings(open, ownSide)).toBeUndefined();
    expect(confirmationVote(open, ownSide)).toEqual(projectConfirmation(open, role, ownSide).vote);
  });

  it("moves the count caucus by caucus: votes from the other side, a little less enthusiasm on the President's own", () => {
    const readings = nomineeReadings(open, crosser)!;
    expect(readings.opposition).toBeGreaterThan(0);
    expect(readings.administration).toBeLessThan(0);
    const counted = confirmationVote(open, crosser);
    const { readings: _readings, ...plain } = confirmationQuestion(open, crosser);
    const uncrossed = voteOn(open, plain);
    expect(counted.byCaucus.opposition.yeas).toBeGreaterThanOrEqual(uncrossed.byCaucus.opposition.yeas);
    expect(counted.byCaucus.administration.yeas).toBeLessThanOrEqual(uncrossed.byCaucus.administration.yeas);
    expect(counted).not.toEqual(uncrossed);
    // The card the President reads counts the crosser the way the floor will.
    expect(projectConfirmation(open, role, crosser).vote).toEqual(counted);
  });

  it("costs the President's own Secretaries loyalty the day the nomination is sent up", () => {
    const slighted = crossingLoyaltyEffects(open, crosser, role);
    expect(slighted.length).toBeGreaterThan(0);
    const office = institutionForRole(role)!.offices[0]!.id;
    const sent = openNomination(open, office, crosser);
    if (!sent.ok) throw new Error(sent.reason);
    expect(sent.packet.effects.filter((effect) => effect.kind === "person")).toEqual(slighted);
    const own = openNomination(open, office, ownSide);
    if (!own.ok) throw new Error(own.reason);
    expect(own.packet.effects.some((effect) => effect.kind === "person")).toBe(false);
    expect(crossingLoyaltyEffects(open, ownSide, role)).toEqual([]);
  });
});

describe("the running mate's standing in the Senate", () => {
  it("rises with Hill service and with politics near the majority, inside the bound", () => {
    const mate = democrat.vicePresident as PersonId;
    const runtime = democrat.people[mate]!;
    const withMate = (changes: Partial<typeof runtime.base>): Campaign => ({
      ...democrat,
      people: { ...democrat.people, [mate]: { ...runtime, base: { ...runtime.base, ...changes } } },
    });
    const leader = vicePresidentLiaison(withMate({ eligibleRoles: ["role-congressional-leader" as RoleId] }), mate);
    const outsider = vicePresidentLiaison(withMate({ eligibleRoles: ["role-journalist" as RoleId] }), mate);
    expect(leader).toBeGreaterThan(outsider);
    for (const value of [leader, outsider]) expect(Math.abs(value)).toBeLessThanOrEqual(SENATE_LIAISON_BOUND);
  });
});
