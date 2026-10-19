import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { Nomination } from "./nomination.js";
import { vettingFindings } from "./nomination.js";
import { campaignDay } from "./clock.js";
import { deriveImplementationQuality, institutionForRole, seatCabinetOffice } from "./institutions.js";
import { actingEffects, deputyFor } from "./appointments.js";
import { confirmationVote, crossingLoyaltyEffects, isConsensus } from "./confirmation-count.js";
import { vicePresidentLiaison } from "./vice-president.js";

// The Senate's answer to the cabinet a President names on the first morning.
//
// A pick the Senate would confirm by a comfortable margin is confirmed at the
// seal, the way a new administration's uncontroversial Secretaries are sworn in
// within days of the oath. A pick inside that margin goes onto the Senate's
// calendar, its hearing already held with the rest before the inauguration, and
// the department runs under its senior deputy as acting Secretary from day one.
// A confirmation fight over the first Treasury Secretary is the first week of a
// real presidency, and the fights are the only nominations the country hears
// about.
//
// Its own module rather than a branch inside founding.ts because the seal is
// already the longest assembly in the engine, and because this is a rule about
// Congress rather than a rule about founding: the chambers it reads are the ones
// the seal has just composed.

/**
 * Put the Vice President in the Senate's chair, with what they are worth there.
 *
 * First, because the Vice President presides over the confirmation votes this
 * seal is about to count.
 */
function withPresidingOfficer(campaign: Campaign): Campaign {
  const vicePresident = campaign.vicePresident;
  if (!vicePresident || !campaign.people[vicePresident]?.alive) return campaign;
  const liaison = vicePresidentLiaison(campaign, vicePresident);
  return { ...campaign, congress: { ...campaign.congress, presidingOfficer: { person: vicePresident, liaison } } };
}

/** The contested pick's nomination, at the committee's vote: the hearing was held with the rest before the oath. */
function contestedNomination(campaign: Campaign, role: RoleId, nominee: PersonRuntime): Nomination | undefined {
  const def = institutionForRole(role);
  const office = def?.offices[0];
  if (!def || !office) return undefined;
  const day = campaignDay(campaign);
  return {
    id: `${office.id}:${day}`,
    office: office.id,
    institution: def.id,
    nominee: nominee.base.id,
    stage: "committee-action",
    stageEnteredDay: day,
    openedDay: day,
    ...(office.committee ? { committee: office.committee } : {}),
    controversies: vettingFindings(nominee.base),
    transition: true,
    history: [{ stage: "committee-action", day, note: `${nominee.base.name}'s hearing was held with the rest of the cabinet's before the inauguration; the committee has yet to vote.` }],
  };
}

/** Seat the chair's senior deputy as acting, written the way `appointActing` writes one. */
function withActing(campaign: Campaign, role: RoleId, nominee: PersonId): Campaign {
  const deputy = deputyFor(campaign, role, nominee);
  const seated = deputy ? actingEffects(campaign, role, deputy) : undefined;
  if (!seated?.ok) return campaign;
  return seated.effects.reduce<Campaign>((state, effect) => {
    if (effect.kind === "acting" && effect.person) return { ...state, actings: { ...(state.actings ?? {}), [effect.seat]: effect.person } };
    if (effect.kind === "institution" && effect.institution && effect.changes) {
      const runtime = state.institutions[effect.institution];
      return runtime ? { ...state, institutions: { ...state.institutions, [effect.institution]: { ...runtime, ...effect.changes } } } : state;
    }
    return state;
  }, campaign);
}

/** Send one contested pick to the calendar: the chair empties, the nomination opens, the deputy acts. */
function sendToCalendar(campaign: Campaign, role: RoleId, nominee: PersonRuntime): Campaign {
  const nomination = contestedNomination(campaign, role, nominee);
  if (!nomination) return campaign;
  const emptied = seatCabinetOffice(campaign, role, undefined);
  const pending = { ...emptied, nominations: { ...emptied.nominations, [nomination.id]: nomination } };
  const acting = withActing(pending, role, nominee.base.id);
  // The department's delivery opens on the chair as it now stands, the way the
  // confirmation writer re-reads it for a seated officer, rather than on the
  // Secretary it no longer has until the first week's tick catches up.
  const runtime = acting.institutions[nomination.institution];
  const def = institutionForRole(role);
  if (!runtime || !def) return acting;
  const implementationQuality = deriveImplementationQuality(runtime, def);
  return { ...acting, institutions: { ...acting.institutions, [nomination.institution]: { ...runtime, implementationQuality } } };
}

/** A confirmed pick from across the aisle is a chair the President's own side did not get. */
function withCrossingCost(campaign: Campaign, role: RoleId, nominee: PersonId): Campaign {
  return crossingLoyaltyEffects(campaign, nominee, role).reduce<Campaign>((state, effect) => {
    if (effect.kind !== "person" || effect.loyaltyShift === undefined) return state;
    const runtime = state.people[effect.person];
    if (!runtime) return state;
    const loyalty = Math.max(0, Math.min(1, runtime.base.loyalty + effect.loyaltyShift));
    // The seal is their appointment, so the baseline their trend is read from
    // moves with it: the cost is in the number, not in a drop on the first day.
    return { ...state, people: { ...state.people, [effect.person]: { ...runtime, base: { ...runtime.base, loyalty }, loyaltyAtAppointment: loyalty } } };
  }, campaign);
}

/**
 * Put the sealed cabinet through the Senate.
 *
 * Every pick is counted against the Senate the seal composed, with the Vice
 * President in the chair; the confirmed keep their seats and the contested go
 * to the calendar under an acting. Runs inside the seal, before the opening
 * approval is recomputed, so the country's first reading is of the cabinet
 * actually seated.
 */
export function foundingConfirmations(campaign: Campaign): Campaign {
  const presided = withPresidingOfficer(campaign);
  const picks = (Object.entries(presided.player.cabinet) as [RoleId, PersonId][]).filter(([role]) => role !== presided.founding.leadRole);
  // Counted against one Senate: the fights are decided by the chamber as it
  // stands on the first morning, not by the order the chairs are listed in.
  const contested = new Set(picks.filter(([, person]) => !isConsensus(confirmationVote(presided, person))).map(([role]) => role));
  return picks.reduce<Campaign>((state, [role, person]) => {
    const runtime = state.people[person];
    if (!runtime) return state;
    return contested.has(role) ? sendToCalendar(state, role, runtime) : withCrossingCost(state, role, person);
  }, presided);
}
