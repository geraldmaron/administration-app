import { describe, expect, it } from "vitest";
import type { PersonId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import type { Campaign } from "./state.js";
import { nextInLine, officeSuccessionPhase } from "./succession.js";
import { ageInYear, deathsThisWeek } from "./officeholder-mortality.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { careerOffices, withCareerIncumbents } from "./career-incumbents.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { openNomination, selectNominableFor, type Nomination } from "./nomination.js";
import { resolveStage } from "./nomination-stages.js";
import { withMember } from "./congress-members.js";
import { campaignDay } from "./clock.js";
import { inabilityDeclarationDue } from "./inability.js";

// The vice presidency under the Twenty-fifth Amendment, section 2: a vacancy is
// filled by the President's nominee on confirmation by a majority of both
// houses, and never by a career official.

const OFFICE = "OFF-VP";
const { campaign: founded } = foundedForBalance("succession-line", "democrat");

function withAge(campaign: Campaign, person: PersonId, age: number): Campaign {
  const runtime = campaign.people[person]!;
  return { ...campaign, people: { ...campaign.people, [person]: { ...runtime, base: { ...runtime.base, age } } } };
}

function run(campaign: Campaign): Campaign {
  return officeSuccessionPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
}

/** The first week, within thirty years, the Vice President is drawn to die, with the week's state. */
function vicePresidentDies(): Campaign | undefined {
  const old = withAge(founded, founded.vicePresident!, 99);
  for (let week = 1; week <= 1560; week += 1) {
    const state = withWeeksElapsed(old, week);
    if (deathsThisWeek(state).some((death) => death.holder.office.kind === "vice-president")) return state;
  }
  return undefined;
}

const dying = vicePresidentDies();
const vacated = dying ? run(dying) : founded;

function atVote(campaign: Campaign, nominee: PersonId): Nomination {
  const day = campaignDay(campaign);
  return { id: `${OFFICE}:${day}`, office: OFFICE, institution: VICE_PRESIDENCY_INSTITUTION_ID, nominee, stage: "vote", stageEnteredDay: day, openedDay: day, controversies: [], history: [] };
}

describe("the Vice President dies in office", () => {
  it("empties the office, the Senate's chair and the line's first place together", () => {
    expect(dying, "a 99-year-old Vice President dies within thirty years").toBeDefined();
    const vicePresident = founded.vicePresident!;
    expect(vacated.people[vicePresident]!.alive).toBe(false);
    expect(vacated.people[vicePresident]!.currentRole).toBeUndefined();
    expect(vacated.vicePresident).toBeUndefined();
    expect(vacated.congress.presidingOfficer).toBeUndefined();
    expect(vacated.institutions[VICE_PRESIDENCY_INSTITUTION_ID]!.leader).toBeUndefined();
    expect(nextInLine(vacated)?.from).toBe("speaker");
  });

  it("is never filled from the career bench", () => {
    expect(careerOffices().map((entry) => entry.institution.id)).not.toContain(VICE_PRESIDENCY_INSTITUTION_ID);
    const swept = withCareerIncumbents(vacated.people, vacated.institutions);
    expect(swept.institutions[VICE_PRESIDENCY_INSTITUTION_ID]!.leader).toBeUndefined();
  });
});

describe("a nominee for Vice President", () => {
  const nominee = selectNominableFor(vacated, OFFICE)[0]?.base.id;

  it("can be sent up only once the office is empty, and only at thirty-five or older", () => {
    expect(openNomination(founded, OFFICE, nominee ?? ("nobody" as PersonId)).ok).toBe(false);
    expect(nominee, "the vacancy offers somebody to nominate").toBeDefined();
    expect(openNomination(vacated, OFFICE, nominee!).ok).toBe(true);
    // Eligibility ages the nominee by the calendar from the founding year, so the founding age is set back from the vacancy's year.
    const yearsSinceFounding = ageInYear(vacated, 0, vacated.calendar.year);
    const young = openNomination(withAge(vacated, nominee!, 34 - yearsSinceFounding), OFFICE, nominee!);
    expect(young.ok).toBe(false);
    if (!young.ok) expect(young.reason).toContain("at least 35");
    expect(openNomination(withAge(vacated, nominee!, 35 - yearsSinceFounding), OFFICE, nominee!).ok).toBe(true);
  });

  it("needs the House as well as the Senate", () => {
    const passed = resolveStage(vacated, atVote(vacated, nominee!));
    expect(passed.stage).toBe("confirmed");
    expect(passed.note).toContain("in the House");
    // A House with nobody seated cannot give a majority, whatever the Senate does.
    const house = (vacated.congress.members ?? []).filter((member) => member.chamber === "house");
    const emptied = house.reduce(
      (congress, member) => withMember(congress, member.seat, { ...member, vacancy: { since: vacated.calendar, path: "special-election", fillsOn: vacated.calendar } }),
      vacated.congress,
    );
    const blocked = resolveStage({ ...vacated, congress: emptied }, atVote(vacated, nominee!));
    expect(blocked.stage).toBe("rejected");
    expect(blocked.outcome).toBe("rejected in the House");
  });

  it("takes office on confirmation: presides over the Senate and stands first in line", () => {
    const opened = openNomination(vacated, OFFICE, nominee!);
    if (!opened.ok) throw new Error(opened.reason);
    const pending = apply(vacated, opened.packet);
    const id = Object.values(pending.nominations).find((entry) => entry.office === OFFICE)!.id;
    const confirmed = apply(pending, {
      source: "simulate", actor: "world", turn: pending.turn, narration: { summary: "confirmed" },
      effects: [{ kind: "nomination", advance: { id, stage: "confirmed", day: campaignDay(pending), note: "Confirmed." } }],
      provenance: { origin: "world", confidence: "observed", visibility: "public", entities: [nominee!], systems: ["nominations"] },
    });
    expect(confirmed.vicePresident).toBe(nominee);
    expect(confirmed.congress.presidingOfficer?.person).toBe(nominee);
    expect(confirmed.people[nominee!]!.currentRole).toBe("role-vice-president");
    expect(confirmed.institutions[VICE_PRESIDENCY_INSTITUTION_ID]!.leader).toBe(nominee);
    expect(nextInLine(confirmed)).toEqual({ successor: nominee, from: "vice-president" });
  });
});

describe("the Twenty-fifth Amendment, section 4", () => {
  const sustained = { belowSince: -1000 };

  it("cannot be invoked while the vice presidency is empty", () => {
    expect(inabilityDeclarationDue(founded, sustained)).toBe(true);
    expect(inabilityDeclarationDue(vacated, sustained)).toBe(false);
  });
});
