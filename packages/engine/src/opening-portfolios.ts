import type { Person, PersonTrait } from "@admin/world";
import type { OpeningMetric } from "./opening-position.js";

// What each chair is worth at inauguration, as authored tables.
//
// Split out of `opening-position.ts` when the cabinet went from five chairs to
// sixteen and the tables grew past the file-size gate with it. Nothing here is
// logic: every entry is a claim about what a particular ministry, held by a
// particular kind of person, is worth to a particular reading on the day the
// government is formed. The arithmetic that folds them lives next door.

export type PortfolioPush = {
  readonly metric: OpeningMetric;
  readonly attribute: "competence" | "integrity" | "charisma";
  readonly weight: number;
  readonly reason: (person: Person, favorable: boolean) => string;
};

// Treasury pushes are fractions of the nation's own treasury rather than
// absolute sums: a competent Treasury Secretary is worth proportionally more to
// a rich country than to a poor one, and an absolute figure would be a rounding
// error in one and the entire budget in the other.
export const PORTFOLIOS: Readonly<Record<string, readonly PortfolioPush[]>> = {
  "role-treasury-minister": [
    {
      metric: "treasury",
      attribute: "competence",
      weight: 0.1,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} finds money in the accounts the last administration had written off.`
          : `${p.name} inherits the books and cannot yet say what is actually in them.`,
    },
    {
      metric: "treasury",
      attribute: "integrity",
      weight: 0.08,
      reason: (p, favorable) =>
        favorable
          ? `Nothing leaves the treasury under ${p.name} without a signature against it.`
          : `The reserves ${p.name} reports and the reserves that exist are not the same figure.`,
    },
  ],
  "role-defense-minister": [
    {
      metric: "militaryReadiness",
      attribute: "competence",
      weight: 0.14,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} has the service's confidence before the first order is given.`
          : `The general staff is waiting to see whether ${p.name} can read a readiness return.`,
    },
  ],
  "role-foreign-minister": [
    {
      metric: "standing",
      attribute: "competence",
      weight: 0.1,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} is already known in the capitals that matter.`
          : `${p.name} arrives in the post without a single counterpart who owes them a call.`,
    },
    {
      metric: "standing",
      attribute: "charisma",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `Other governments take the meeting when ${p.name} asks for it.`
          : `${p.name} will be represented abroad more often by the department than in person.`,
    },
  ],
  "role-interior-minister": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.12,
      reason: (p, favorable) =>
        favorable
          ? `The state capitals know ${p.name}, and the appointment is read as a steady one.`
          : `${p.name} takes the department with no administration behind them.`,
    },
  ],
  "role-intelligence-director": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} inherits a service that will tell them things.`
          : `The service has already decided how much of itself ${p.name} is going to see.`,
    },
  ],
  "role-court-chancellor": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.08,
      reason: (p, favorable) =>
        favorable ? `${p.name} has the court in order from the first day.` : `The court does not yet answer to ${p.name}.`,
    },
  ],
  "role-electoral-affairs-minister": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name}'s appointment is accepted by both sides of the count.`
          : `${p.name} takes the commission with one side of the count already objecting.`,
    },
  ],
  // --- The ten department secretaries ---------------------------------------
  //
  // Each moves the reading its department actually moves, which is the whole
  // point of a declared portfolio: without one they fell to `GENERIC_PORTFOLIO`
  // and a superb Secretary of Energy was worth exactly what a superb Secretary
  // of Education was, because the only thing either could touch was the
  // government's general footing. The weights sit under the inner cabinet's on
  // purpose — Agriculture is a real department and it is not the Treasury —
  // and every one names the metric a president would actually feel from that
  // building.
  "role-agriculture-secretary": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.07,
      reason: (p, favorable) =>
        favorable
          ? `The farm states read ${p.name} as one of their own, and the price supports will go out on time.`
          : `The farm states do not know ${p.name}, and are saying so before the first payment is late.`,
    },
  ],
  "role-commerce-secretary": [
    {
      metric: "treasury",
      attribute: "competence",
      weight: 0.05,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} knows which export licenses are worth issuing and which are a subsidy in disguise.`
          : `${p.name} will take a year to learn what the export desk already knows.`,
    },
    {
      metric: "standing",
      attribute: "competence",
      weight: 0.04,
      reason: (p, favorable) =>
        favorable
          ? `Trading partners have dealt with ${p.name} before and expect to be able to again.`
          : `Trading partners are asking, politely, who ${p.name} is.`,
    },
  ],
  "role-labor-secretary": [
    {
      metric: "stability",
      attribute: "charisma",
      weight: 0.08,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} can get both sides of a dispute into the same room, which is most of the job.`
          : `${p.name} is not somebody either side of a dispute has asked for.`,
    },
  ],
  "role-health-secretary": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.09,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} has run a health system through a bad year and the people who did it with them are still reachable.`
          : `${p.name} has never run a health system through a bad year, and one is always coming.`,
    },
  ],
  "role-housing-secretary": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} has cleared a repair backlog before and is not frightened of this one.`
          : `The backlog ${p.name} is inheriting is older than their experience of clearing one.`,
    },
  ],
  "role-transportation-secretary": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} has delivered infrastructure on a schedule, which almost nobody has.`
          : `Nothing ${p.name} has delivered arrived on the date it was promised.`,
    },
  ],
  "role-energy-secretary": [
    {
      metric: "militaryReadiness",
      attribute: "competence",
      weight: 0.05,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} is trusted with the stockpile, and the laboratories say so unprompted.`
          : `The laboratories are waiting to see whether ${p.name} understands what they are holding.`,
    },
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.04,
      reason: (p, favorable) =>
        favorable
          ? `The grid operators have ${p.name}'s number and expect it to be answered.`
          : `The grid operators do not yet know who to call.`,
    },
  ],
  "role-education-secretary": [
    {
      metric: "stability",
      attribute: "charisma",
      weight: 0.05,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} can say what the department is for in a sentence a parent will repeat.`
          : `Nobody can yet say what ${p.name} intends the department to be for.`,
    },
  ],
  "role-veterans-secretary": [
    {
      metric: "militaryReadiness",
      attribute: "integrity",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} published their own department's wait times once before, and the services have not forgotten it.`
          : `The services are watching to see whether ${p.name} will publish a figure that embarrasses them.`,
    },
  ],
  "role-homeland-secretary": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.09,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} has run a border and a disaster season, and can tell you which one is harder.`
          : `${p.name} is learning the border and the disaster season at the same time.`,
    },
  ],
  "role-attorney-general": [
    {
      metric: "stability",
      attribute: "competence",
      weight: 0.08,
      reason: (p, favorable) =>
        favorable
          ? `The department will take ${p.name}'s cases and the courts will hear them.`
          : `The department has not yet decided how much of itself ${p.name} is going to see.`,
    },
    {
      metric: "stability",
      attribute: "integrity",
      weight: 0.06,
      reason: (p, favorable) =>
        favorable
          ? `${p.name} will not sign an opinion the statute cannot carry.`
          : `The opinions ${p.name} will sign and the ones the statute can carry are not yet the same list.`,
    },
  ],
};

/**
 * Which metrics a chair's holder's *disposition* can act on.
 *
 * A minister acts through their ministry. Without this, a cautious treasury
 * minister raised military readiness and a reclusive interior minister cost the
 * government standing abroad — the trait table applied whole to every seat, so
 * every disposition reached every metric regardless of what the person actually
 * had authority over. Stability is on every list because cabinet cohesion is
 * every minister's business; defense carries treasury too, because procurement
 * is where a defense ministry's money actually goes.
 *
 * The head of government is exempt: they chair the room and speak for the
 * country, so their disposition genuinely does reach everything.
 */
export const PORTFOLIO_REACH: Readonly<Record<string, readonly OpeningMetric[]>> = {
  "role-treasury-minister": ["treasury", "stability"],
  "role-defense-minister": ["militaryReadiness", "treasury", "stability"],
  "role-foreign-minister": ["standing", "stability"],
  "role-interior-minister": ["stability"],
  "role-intelligence-director": ["stability"],
  "role-court-chancellor": ["stability", "treasury"],
  "role-electoral-affairs-minister": ["stability"],
  "role-attorney-general": ["stability"],
  // Reach follows the portfolio: a disposition acts through the ministry the
  // person actually holds, so a corrupt Commerce Secretary costs the accounts
  // and a reclusive one costs standing, while neither reaches the readiness of
  // a force they have nothing to do with.
  "role-agriculture-secretary": ["stability"],
  "role-commerce-secretary": ["treasury", "standing", "stability"],
  "role-labor-secretary": ["stability"],
  "role-health-secretary": ["stability"],
  "role-housing-secretary": ["stability"],
  "role-transportation-secretary": ["stability"],
  "role-energy-secretary": ["militaryReadiness", "stability"],
  "role-education-secretary": ["stability"],
  "role-veterans-secretary": ["militaryReadiness", "stability"],
  "role-homeland-secretary": ["stability"],
};

export const GENERIC_REACH: readonly OpeningMetric[] = ["stability"];

// Any seat a charter defines that has no portfolio of its own still has a
// ministry, a staff and a budget — it is administration, and administration
// held by a competent hand is worth something to the government's footing.
export const GENERIC_PORTFOLIO: readonly PortfolioPush[] = [
  {
    metric: "stability",
    attribute: "competence",
    weight: 0.05,
    reason: (p, favorable) =>
      favorable ? `${p.name}'s department runs itself from week one.` : `${p.name}'s department will need watching.`,
  },
];

// --- What a disposition is worth, on top of what the readings say. --------

export type TraitPush = { readonly metric: OpeningMetric; readonly delta: number; readonly note: string };

export const TRAIT_PUSHES: Readonly<Record<PersonTrait, readonly TraitPush[]>> = {
  corrupt: [
    { metric: "treasury", delta: -0.05, note: "what goes missing before anyone is looking for it" },
    { metric: "stability", delta: -0.03, note: "a reputation that arrives in the post before they do" },
  ],
  principled: [{ metric: "stability", delta: 0.025, note: "a government that is believed when it says something" }],
  charismatic: [{ metric: "standing", delta: 0.035, note: "an administration that is listened to abroad" }],
  reclusive: [{ metric: "standing", delta: -0.03, note: "a government that is not in the room it is being discussed in" }],
  hawkish: [
    { metric: "militaryReadiness", delta: 0.035, note: "forces that are told to expect to be used" },
    { metric: "standing", delta: -0.02, note: "neighbors who read the appointment as a signal" },
  ],
  dovish: [
    { metric: "militaryReadiness", delta: -0.025, note: "a defense posture nobody is in a hurry to tighten" },
    { metric: "standing", delta: 0.03, note: "channels that open more easily than they used to" },
  ],
  pragmatic: [{ metric: "stability", delta: 0.02, note: "a government that can be dealt with" }],
  cautious: [
    { metric: "militaryReadiness", delta: 0.015, note: "contingencies drawn up before they are needed" },
    { metric: "standing", delta: -0.015, note: "an administration that is slow to commit to anyone" },
  ],
  ambitious: [{ metric: "stability", delta: -0.02, note: "a coalition watching for who is positioning" }],
  loyal: [{ metric: "stability", delta: 0.02, note: "a government that holds together under pressure" }],
};

// A cabinet's loyalty is not a per-seat fact — one disloyal minister is a
// problem, five is a different government — so it is read across the whole
// room at once and attributed to the lead chair, which is where the
// consequences of it will land.

// The head of government's own readings are felt across the whole administration
// rather than through one ministry, so they push on three metrics where a
// minister pushes on their own.
export const LEADER_PORTFOLIO: readonly PortfolioPush[] = [
  {
    metric: "stability",
    attribute: "competence",
    weight: 0.1,
    reason: (p, favorable) =>
      favorable
        ? `${p.name} is taken seriously by the institutions from the first week.`
        : `${p.name} takes office with the institutions reserving judgment.`,
  },
  {
    metric: "standing",
    attribute: "charisma",
    weight: 0.12,
    reason: (p, favorable) =>
      favorable
        ? `${p.name} is a head of government other capitals want to be seen beside.`
        : `${p.name} is an unknown quantity to every government that has to deal with them.`,
  },
  {
    metric: "stability",
    attribute: "integrity",
    weight: 0.06,
    reason: (p, favorable) =>
      favorable
        ? `Nothing in ${p.name}'s record gives the opposition an opening.`
        : `${p.name} arrives carrying something the opposition already knows about.`,
  },
];

// A portfolio push is already sized for the chair it belongs to, so it carries
// no further per-seat weighting; only a disposition is scaled, because the same
// trait in the lead chair and in a junior ministry are not the same fact.
/**
 * The smallest movement worth reporting, in points.
 *
 * Surfaces draw these as whole points, so anything under half a point renders
 * as "+0" — a line that occupies a row, names a person, and tells the player
 * nothing. Below the floor it is not a contribution, it is rounding, and it is
 * dropped from the sum as well as from the list so that what is shown adds up
 * to what is applied.
 */
