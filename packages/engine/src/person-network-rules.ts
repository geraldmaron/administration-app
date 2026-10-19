import {
  type CareerArchetype,
  type Person,
  type PersonConnection,
  type PersonId,
  type TieProvenance,
  PROVENANCE_OF_ARCHETYPE,
} from "@admin/world";
import { fnv1aFrom, mulberryOnce } from "@admin/world";

/**
 * What one pair of people is to each other, and how the record proves it.
 *
 * Split from `person-network.ts` because the two halves answer different
 * questions and only one of them is about relationships. This file decides what
 * a pair IS; the other decides which of those readings a circle has room to
 * draw. The seam is `bestCandidate`, which is the only thing the seating needs
 * from here.
 *
 * ### The rules read shared history, not collisions
 *
 * A `CareerPost` carries `startAge` and `years`, so a working life is a set of
 * dated intervals, and two lives can be compared without a calendar: a post ran
 * from `age - startAge` years ago to `age - startAge - years` years ago, and
 * the difference of two people's ages is the difference of their birth years.
 * Every rule below therefore asks for a real overlap in real time, in the same
 * country, before it will say two people know each other. Where the record
 * shows no shared history, it returns nothing and the pair gets no tie.
 *
 * The one modeled assumption, stated rather than hidden: an `academia` post
 * held by someone who names the same school as the student is taken to have
 * been served AT that school. The school is data; the posting's place is not,
 * and no `CareerPost` records one.
 */

export type Candidate = PersonConnection & {
  readonly score: number;
  /** What this pair is if the seating refuses the reading above. Only mentorships carry one. */
  readonly fallback?: Candidate;
};

export /** Below this two careers brushed past each other rather than shared anything. */
const MIN_CAREER_OVERLAP_YEARS = 3;

/** A counterpart relationship is diplomatic contact, which needs less time than a colleague. */
const MIN_COUNTERPART_OVERLAP_YEARS = 2;

/** How much longer the senior must already have been in the world for it to be mentorship. */
const SENIORITY_YEARS = 12;

/** And how much older, so a peer who happened to arrive early is not made a mentor. */
const MENTOR_AGE_GAP_YEARS = 12;

/**
 * How long a degree took.
 *
 * `Education` records no dates at all — the generator sets the first career
 * post's `startAge` to the age study ended, and that is every temporal fact
 * about schooling the dataset holds. The span backwards from it is this
 * constant, and it is the reason a school tie says "in the same years" and
 * never names one.
 */
const STUDY_YEARS = 4;

/** Ideological distance, normalized across the three axes, at which two readings are opposed. */
const RIVAL_GAP = 0.45;

/** And at which they are close enough to reinforce each other. */
const ALLY_GAP = 0.05;

/** An interval in years-before-now. `from` is the older edge, `to` the newer. */
type Span = { readonly from: number; readonly to: number };

const IDEOLOGY_AXIS_NOUN = {
  economicLeftRight: "economics",
  authLibertarian: "how far the state should reach",
  nationalistGlobalist: "the country's place in the world",
} as const;

/**
 * How a shared working world is named in a sentence a player reads.
 *
 * Exported because the dossier's assessment names the same worlds when it says
 * which part of a record put a reading where it landed, and two tables for one
 * vocabulary is how "the diplomatic corps" becomes "the foreign service" on the
 * next screen down.
 */
export const WORLD_PHRASE: Readonly<Record<CareerArchetype, string>> = {
  "civil-service": "the civil service",
  "military-command": "uniform",
  "intelligence-service": "the intelligence service",
  "diplomatic-corps": "the diplomatic corps",
  "private-law": "private practice",
  business: "business",
  academia: "academic life",
  "party-organizing": "party organizing",
  "local-government": "local government",
  "state-media": "the state broadcaster",
  "independent-press": "the independent press",
  activism: "campaigning",
  medicine: "medicine",
  "labor-union": "the labor movement",
  judiciary: "the bench",
};

/**
 * Everything a pair test needs about one person, derived once per cast rather
 * than per pair — the same reason the previous sweep derived one, with the
 * career spans added because every rule now reads them.
 */
export type Derived = {
  readonly person: Person;
  readonly id: string;
  readonly surname: string;
  readonly nationality: string;
  readonly school: string | undefined;
  readonly party: string | undefined;
  /**
   * Every posting in one archetype, in years-before-now.
   *
   * Kept as the separate intervals rather than one hull: a career that left a
   * world and came back has a gap in it, and a hull would let two people claim
   * years together that one of them spent somewhere else.
   */
  readonly spans: ReadonlyMap<string, readonly Span[]>;
  readonly archetypeSet: ReadonlySet<string>;
  /** The world they entered working life in — the only one a mentor can come from. */
  readonly firstArchetype: string | undefined;
  /** When they left school, in years-before-now. Undefined when no career post dates it. */
  readonly study: Span | undefined;
  readonly foreignSeat: boolean;
  readonly age: number;
  readonly economic: number;
  readonly authLib: number;
  readonly nationalist: number;
};

export function derive(person: Person): Derived {
  const spans = new Map<string, Span[]>();
  for (const post of person.career) {
    const from = person.age - post.startAge;
    const held = spans.get(post.archetype);
    const span: Span = { from, to: from - post.years };
    if (held) held.push(span);
    else spans.set(post.archetype, [span]);
  }
  const first = person.career[0];
  return {
    person,
    id: person.id as string,
    surname: surname(person),
    nationality: person.nationality as string,
    school: person.education.school as string | undefined,
    party: person.party as string | undefined,
    spans,
    archetypeSet: new Set(spans.keys()),
    firstArchetype: first?.archetype,
    study:
      first === undefined
        ? undefined
        : { from: person.age - first.startAge + STUDY_YEARS, to: person.age - first.startAge },
    foreignSeat: person.eligibleRoles.some((role) => role === ("role-foreign-minister" as never)),
    age: person.age,
    economic: person.ideology.economicLeftRight,
    authLib: person.ideology.authLibertarian,
    nationalist: person.ideology.nationalistGlobalist,
  };
}

/** Years two intervals share. Zero when they never ran at the same time. */
function spanOverlap(a: Span, b: Span): number {
  return Math.max(0, Math.min(a.from, b.from) - Math.max(a.to, b.to));
}

/** Years two sets of postings share, counted across every pair of them. */
function overlapYears(a: readonly Span[], b: readonly Span[]): number {
  let total = 0;
  for (const left of a) for (const right of b) total += spanOverlap(left, right);
  return total;
}

/** The year, counted backwards from now, that someone first entered a world. */
function enteredAt(spans: readonly Span[]): number {
  let earliest = spans[0]!.from;
  for (const span of spans) if (span.from > earliest) earliest = span.from;
  return earliest;
}

function derivedGap(a: Derived, b: Derived): number {
  const total =
    Math.abs(a.economic - b.economic) +
    Math.abs(a.authLib - b.authLib) +
    Math.abs(a.nationalist - b.nationalist);
  return total / 6;
}

/** The axis two readings are furthest apart on — the one a sentence should name. */
function widestAxis(a: Derived, b: Derived): string {
  const gaps: readonly (readonly [keyof typeof IDEOLOGY_AXIS_NOUN, number])[] = [
    ["economicLeftRight", Math.abs(a.economic - b.economic)],
    ["authLibertarian", Math.abs(a.authLib - b.authLib)],
    ["nationalistGlobalist", Math.abs(a.nationalist - b.nationalist)],
  ];
  let best = gaps[0]!;
  for (const gap of gaps) if (gap[1] > best[1]) best = gap;
  return IDEOLOGY_AXIS_NOUN[best[0]];
}

/** And the one they are closest on, for the tie that says they agree. */
function narrowestAxis(a: Derived, b: Derived): string {
  const gaps: readonly (readonly [keyof typeof IDEOLOGY_AXIS_NOUN, number])[] = [
    ["economicLeftRight", Math.abs(a.economic - b.economic)],
    ["authLibertarian", Math.abs(a.authLib - b.authLib)],
    ["nationalistGlobalist", Math.abs(a.nationalist - b.nationalist)],
  ];
  let best = gaps[0]!;
  for (const gap of gaps) if (gap[1] < best[1]) best = gap;
  return IDEOLOGY_AXIS_NOUN[best[0]];
}

/** The name a sentence calls someone by. Full names make a 240-character reason a gamble. */
function surname(person: Person): string {
  const parts = person.name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? person.name;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The longest working world two people actually shared, and for how long. */
type SharedWorld = { readonly archetype: string; readonly years: number } | undefined;

function sharedWorld(a: Derived, b: Derived): SharedWorld {
  let best: { archetype: string; years: number } | undefined;
  for (const [archetype, span] of a.spans) {
    const other = b.spans.get(archetype);
    if (!other) continue;
    const years = overlapYears(span, other);
    if (years <= 0) continue;
    // Ties on length break on the archetype name so the winner does not depend
    // on Map insertion order, which follows the person's career order.
    if (!best || years > best.years || (years === best.years && archetype < best.archetype)) {
      best = { archetype, years };
    }
  }
  return best;
}

function provenanceOf(archetype: string): TieProvenance {
  return PROVENANCE_OF_ARCHETYPE[archetype as CareerArchetype];
}

/**
 * Mentorship in a shared working world: the senior was already established
 * there when the junior ARRIVED IN IT AT THE START OF THEIR CAREER, and the two
 * served alongside each other after.
 *
 * Three conditions, and each one rules out a case the others let through. Age
 * alone establishes nothing — two people can be twenty years apart and have
 * entered the same trade in the same month — so the rule reads entry into the
 * world rather than birth. Seniority alone is not enough either: somebody who
 * joined the civil service twelve years before you, when you were already forty
 * and on your third career, did not form you. So the world has to be the one
 * the junior's own working life STARTED in, which is what makes this a claim
 * about formation rather than about tenure. The age gap is the last guard,
 * against a late-starting elder made a mentor by arithmetic.
 */
function serviceMentor(
  a: Derived,
  b: Derived,
  world: SharedWorld,
): { readonly senior: Derived; readonly junior: Derived; readonly archetype: string; readonly years: number; readonly lead: number } | undefined {
  if (!world || world.years < MIN_CAREER_OVERLAP_YEARS) return undefined;
  const enteredA = enteredAt(a.spans.get(world.archetype)!);
  const enteredB = enteredAt(b.spans.get(world.archetype)!);
  // A bigger `from` is longer ago, so the larger one entered the world first.
  const senior = enteredA > enteredB ? a : b;
  const junior = senior === a ? b : a;
  const lead = Math.abs(enteredA - enteredB);
  if (lead < SENIORITY_YEARS) return undefined;
  if (senior.age - junior.age < MENTOR_AGE_GAP_YEARS) return undefined;
  if (junior.firstArchetype !== world.archetype) return undefined;
  return { senior, junior, archetype: world.archetype, years: world.years, lead };
}

/**
 * Mentorship at a school: one of them was already years into academic life
 * while the other was still studying, at the school they both name.
 */
function academicMentor(
  a: Derived,
  b: Derived,
): { readonly senior: Derived; readonly junior: Derived; readonly years: number; readonly lead: number } | undefined {
  if (a.school === undefined || a.school !== b.school) return undefined;
  for (const [senior, junior] of [
    [a, b],
    [b, a],
  ] as const) {
    const teaching = senior.spans.get("academia");
    if (!teaching || junior.study === undefined) continue;
    const years = overlapYears(teaching, [junior.study]);
    if (years < 2) continue;
    if (senior.age - junior.age < MENTOR_AGE_GAP_YEARS) continue;
    const lead = Math.max(0, enteredAt(teaching) - junior.study.from);
    return { senior, junior, years, lead };
  }
  return undefined;
}

type Scorer = (
  from: PersonId,
  to: PersonId,
  kind: PersonConnection["kind"],
  provenance: TieProvenance,
  reason: string,
  strength: number,
  score: number,
) => Candidate;

function makeScorer(hashFor: (from: string) => number): Scorer {
  return (from, to, kind, provenance, reason, strength, score) => ({
    from,
    to,
    kind,
    provenance,
    reason,
    strength: round2(strength),
    score: score + mulberryOnce(fnv1aFrom(hashFor(from as string), to as string)) * 0.001,
  });
}

/** The mentorship reading of a pair, if the record supports one at all. */
function mentorReading(a: Derived, b: Derived, scored: Scorer, shared: SharedWorld): Candidate | undefined {
  if (a.nationality !== b.nationality) return undefined;
  const service = serviceMentor(a, b, shared);
  if (service) {
    const world = WORLD_PHRASE[service.archetype as CareerArchetype];
    return scored(
      service.senior.person.id,
      service.junior.person.id,
      "mentor",
      provenanceOf(service.archetype),
      `${service.junior.surname} began in ${world} while ${service.senior.surname} was already ${yearsPhrase(service.lead)} into it; they served ${yearsPhrase(service.years)} alongside each other.`,
      0.55 + (Math.min(service.years, 20) / 20) * 0.4,
      0.86,
    );
  }
  const academic = academicMentor(a, b);
  if (academic) {
    return scored(
      academic.senior.person.id,
      academic.junior.person.id,
      "mentor",
      "education",
      `They were at the same school in the same years — ${academic.senior.surname} ${yearsPhrase(academic.lead)} into academic life, ${academic.junior.surname} still a student.`,
      0.6 + (Math.min(academic.years, 6) / 6) * 0.3,
      0.86,
    );
  }
  return undefined;
}

/**
 * Everything a pair can be other than mentor and protégé, walked in descending
 * score order and stopped at the first hit:
 *
 *   prior-counterpart 0.70 · rival 0.66 · former-colleague 0.62 ·
 *   peer 0.58 · ally 0.52
 */
function plainReading(a: Derived, b: Derived, scored: Scorer, world: SharedWorld, publicOnly = false): Candidate | undefined {
  const ordered = a.id < b.id;
  const left = ordered ? a.person.id : b.person.id;
  const right = ordered ? b.person.id : a.person.id;

  if (a.nationality !== b.nationality) {
    const counterpart = priorCounterpart(a, b);
    if (counterpart === undefined) return undefined;
    return scored(
      left,
      right,
      "prior-counterpart",
      "diplomatic",
      `They worked the same file from opposite capitals: ${yearsPhrase(counterpart)} in the diplomatic corps at the same time, one of them holding a foreign seat.`,
      0.4 + (Math.min(counterpart, 15) / 15) * 0.35,
      0.7,
    );
  }


  // Ideology decides nothing on its own. A rivalry needs an arena the two keep
  // meeting in, and it is read BEFORE the colleague rule: two people who served
  // twelve years side by side and cannot agree on anything are rivals, and
  // "former colleague" would be the true half of that sentence standing in for
  // the whole of it. The shared service does not disappear — it is the tie's
  // provenance, and the arena its reason names.
  const arena = sharedArena(a, b, world);
  if (arena && !publicOnly) {
    const gap = derivedGap(a, b);
    if (gap >= RIVAL_GAP) {
      return scored(
        left,
        right,
        "rival",
        arena.provenance,
        `${arena.phrase} keeps putting them in the same rooms, and they are furthest apart on ${widestAxis(a, b)}.`,
        0.45 + Math.min((gap - RIVAL_GAP) / (1 - RIVAL_GAP), 1) * 0.45,
        0.66,
      );
    }
  }

  if (world && world.years >= MIN_CAREER_OVERLAP_YEARS) {
    const phrase = WORLD_PHRASE[world.archetype as CareerArchetype];
    return scored(
      left,
      right,
      "former-colleague",
      provenanceOf(world.archetype),
      `${a.surname} and ${b.surname} were both in ${phrase}, and their years there overlapped by ${yearsPhrase(world.years)}.`,
      0.3 + (Math.min(world.years, 20) / 20) * 0.4,
      0.62,
    );
  }

  if (a.school !== undefined && a.school === b.school && a.study && b.study) {
    const together = spanOverlap(a.study, b.study);
    if (together >= 1) {
      return scored(
        left,
        right,
        "peer",
        "education",
        `They were students at the same school at the same time, ${yearsPhrase(together)} of it overlapping.`,
        0.35 + (Math.min(together, STUDY_YEARS) / STUDY_YEARS) * 0.25,
        0.58,
      );
    }
  }

  // Alignment reads last, under every fact. An arena and a shared decade of
  // service is something the record SAYS; two readings sitting close together
  // is something the record IMPLIES, and among people who chose the same party
  // it is the default rather than the news. So it is only spoken when there is
  // nothing more concrete to say about the pair. Opposition is the exception
  // above, because a standing opponent changes what the office should expect.
  if (arena && !publicOnly) {
    const gap = derivedGap(a, b);
    if (gap <= ALLY_GAP) {
      return scored(
        left,
        right,
        "ally",
        arena.provenance,
        `${arena.phrase} keeps putting them in the same rooms, and they read ${narrowestAxis(a, b)} almost identically.`,
        0.45 + (1 - gap / ALLY_GAP) * 0.4,
        0.52,
      );
    }
  }
  return undefined;
}

/** Diplomats of two countries whose postings ran at the same time, one of them senior enough to be received. */
function priorCounterpart(a: Derived, b: Derived): number | undefined {
  if (!a.foreignSeat && !b.foreignSeat) return undefined;
  const mine = a.spans.get("diplomatic-corps");
  const theirs = b.spans.get("diplomatic-corps");
  if (!mine || !theirs) return undefined;
  const years = overlapYears(mine, theirs);
  return years >= MIN_COUNTERPART_OVERLAP_YEARS ? years : undefined;
}

/**
 * Where two people kept meeting, if anywhere the record can show.
 *
 * An arena has to be somewhere they actually kept meeting, so a working world
 * qualifies on the same overlap a colleagueship needs rather than on a year of
 * brushing past each other. A shared party ticket qualifies on its own: it is a
 * standing, current arena rather than a period in the past.
 */
function sharedArena(
  a: Derived,
  b: Derived,
  world: { readonly archetype: string; readonly years: number } | undefined,
): { readonly provenance: TieProvenance; readonly phrase: string } | undefined {
  if (world && world.years >= MIN_CAREER_OVERLAP_YEARS) {
    return {
      provenance: provenanceOf(world.archetype),
      phrase: `${yearsPhrase(world.years)} together in ${WORLD_PHRASE[world.archetype as CareerArchetype]}`,
    };
  }
  if (a.party !== undefined && a.party === b.party) {
    return { provenance: "party", phrase: "The same party ticket" };
  }
  return undefined;
}

function yearsPhrase(years: number): string {
  const whole = Math.max(1, Math.round(years));
  return whole === 1 ? "a year" : `${whole} years`;
}

/**
 * What a pair contributes: its best reading, and — when that reading is a
 * mentorship — the reading to fall back to if the seating refuses it.
 *
 * The fallback exists because mentorship is the one kind with a quota of its
 * own. A person has a mentor, not four, so `seatUnderCap` will refuse a second
 * one; and if the refusal simply dropped the pair, a true shared decade of
 * service would vanish from both files because the rule that describes it best
 * was already spoken for. The shared history is the same fact either way. Only
 * the claim made about it changes.
 */
export function bestCandidate(a: Derived, b: Derived, hashFor: (from: string) => number, publicOnly = false): Candidate | undefined {
  const scored = makeScorer(hashFor);
  const world = a.nationality === b.nationality ? sharedWorld(a, b) : undefined;
  const plain = plainReading(a, b, scored, world, publicOnly);
  if (publicOnly) return plain; // Shared biography does not prove mentorship, trust, alliance or rivalry.
  const mentor = mentorReading(a, b, scored, world);
  if (!mentor) return plain;
  return plain ? { ...mentor, fallback: plain } : mentor;
}
