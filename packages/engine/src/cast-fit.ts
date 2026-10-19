import type { IdeologyVector, Person } from "@admin/world";
import { otherMajorParty, sealCaucusAnchor } from "./party.js";
import type { AdministrationParty, UsParty } from "./state-legislature.js";

// How well someone fits the President who would appoint them.
//
// Every shortlist used to rank by competence alone, so the strongest name on a
// Democrat's Treasury bench was as often a Republican as not, and accepting the
// defaults seated six of the other party. A President appoints from their own
// side first, then from people who believe what they believe, and only then
// weighs who is best at the job; this is that order, stated once, and every
// shortlist in the founding reads it.
//
// The fit a card prints is the other two terms alone, politics and competence,
// read against the best on the same shortlist. Party already has its own mark
// on the card and leads the order, and folding it into the fit as well made
// every co-partisan read "strong" and every name across the aisle "poor": the
// party badge twice, and nothing left to compare inside the President's side.

/** How a fit reads on a card. */
export type FitBand = "strong" | "good" | "fair" | "poor";

/** One person weighed against the President, before the list they are offered on is known. */
export type PersonFit = {
  readonly person: Person;
  /** 0..1, higher fits better: politics beside the President's, and competence. Party is not in it. */
  readonly fit: number;
  /** Of the President's own party. Always false for an Independent President, who has none. */
  readonly coPartisan: boolean;
  /** Of the other party, or of none while the President has one. */
  readonly crossesTheAisle: boolean;
};

/** A person as a shortlist offers them: their fit, banded against the best fit on the same list. */
export type CandidateFit = PersonFit & { readonly band: FitBand };

/** What a ranking needs to know about the President. */
export type FitPresident = {
  readonly party: AdministrationParty;
  readonly ideology: IdeologyVector;
};

/**
 * The weights, in the order a President reads them. Party is worth more than
 * either of the others and is also the first sort key, so a co-partisan always
 * leads a cross-party name; ideology outweighs competence because a capable
 * secretary pulling against the President's program is the appointment that
 * goes wrong.
 */
const FIT_PARTY = 0.4;
const FIT_IDEOLOGY = 0.35;
const FIT_COMPETENCE = 0.25;

/**
 * How far behind the best fit on the same list each band reaches. Inside 0.02
 * two candidates are the same fit (a twentieth of the competence scale); 0.10
 * is about one verdict step of competence. Measured on 15 seeds of cabinet
 * shortlists, fewer than one list in twenty-five reads a single band for a
 * party President and about one in six for an Independent, whose bench sits
 * closer together; the absolute floors these replace read every co-partisan
 * on every list "strong".
 */
const BAND_REACH: readonly (readonly [FitBand, number])[] = [
  ["strong", 0.02],
  ["good", 0.05],
  ["fair", 0.1],
];

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** The party a person carries on the American ticket, or none. */
export function usPartyOfPerson(person: Pick<Person, "party">): UsParty | undefined {
  const id = person.party as string | undefined;
  if (id === "party-usa-democrat") return "democrat";
  if (id === "party-usa-republican") return "republican";
  if (id === "party-usa-independent") return "independent";
  return undefined;
}

/** 1 for the same politics, 0 for opposite ends on every axis. */
export function ideologyCloseness(a: IdeologyVector, b: IdeologyVector): number {
  const gap =
    (Math.abs(a.economicLeftRight - b.economicLeftRight) +
      Math.abs(a.authLibertarian - b.authLibertarian) +
      Math.abs(a.nationalistGlobalist - b.nationalistGlobalist)) /
    3;
  return clamp01(1 - gap);
}

/**
 * Whether seating this person reaches across the aisle. An Independent
 * President sits with the caucus nearest their economics, so the aisle they
 * cross is the one between that caucus and the other.
 */
export function crossesTheAisle(person: Pick<Person, "party">, president: FitPresident): boolean {
  const party = usPartyOfPerson(person);
  if (president.party === "independent") {
    return party === otherMajorParty(sealCaucusAnchor("independent", president.ideology));
  }
  return party !== president.party;
}

type Weighed = { readonly fit: PersonFit; readonly drawScore: number };

/**
 * A person's fit, and the score shortlists are drawn in. The draw score still
 * carries the party weight: party is also the first sort key, so the weight
 * only ever mattered through rounding, and it is kept, rounding and all, so a
 * seed seats exactly the cabinet it always has.
 */
function weigh(person: Person, president: FitPresident): Weighed {
  const merit = FIT_IDEOLOGY * ideologyCloseness(person.ideology, president.ideology) + FIT_COMPETENCE * person.competence;
  const coPartisan = president.party !== "independent" && usPartyOfPerson(person) === president.party;
  const fit = round3(merit / (FIT_IDEOLOGY + FIT_COMPETENCE));
  const drawScore = president.party === "independent" ? fit : round3((coPartisan ? FIT_PARTY : 0) + merit);
  return { fit: { person, fit, coPartisan, crossesTheAisle: crossesTheAisle(person, president) }, drawScore };
}

export function candidateFit(person: Person, president: FitPresident): PersonFit {
  return weigh(person, president).fit;
}

/** Best fit first: the President's own party, then the closest politics, then the most capable. Unbanded. */
export function orderByFit(candidates: readonly Person[], president: FitPresident): readonly PersonFit[] {
  return candidates
    .map((person) => weigh(person, president))
    .sort(
      (a, b) =>
        Number(b.fit.coPartisan) - Number(a.fit.coPartisan) ||
        b.drawScore - a.drawScore ||
        b.fit.person.competence - a.fit.person.competence ||
        (a.fit.person.id as string).localeCompare(b.fit.person.id as string),
    )
    .map(({ fit }) => fit);
}

function bandBehind(fit: number, best: number): FitBand {
  const shortfall = round3(best - fit);
  return BAND_REACH.find(([, reach]) => shortfall <= reach)?.[0] ?? "poor";
}

/**
 * Every candidate on a list banded against the best fit on that same list, so
 * the band says how this name compares with the others offered for the post.
 * Call it on the list as shown: a name filtered off it cannot set the bar.
 */
export function bandedAgainstList<T extends PersonFit>(list: readonly T[]): readonly (T & { readonly band: FitBand })[] {
  const best = list.reduce((top, candidate) => Math.max(top, candidate.fit), 0);
  return list.map((candidate) => ({ ...candidate, band: bandBehind(candidate.fit, best) }));
}

/** The whole list ranked best fit first and banded against itself. */
export function rankByFit(candidates: readonly Person[], president: FitPresident): readonly CandidateFit[] {
  return bandedAgainstList(orderByFit(candidates, president));
}
