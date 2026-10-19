import { leaderConstraintFor, roleProfileByRole, type CareerPost, type Person, type PersonTrait } from "@admin/world";
import { ATTRIBUTE_LINES } from "./bio-attribute-lines.js";
import { CAREER_LINES, CONTESTED_CAREER_LINES, MILITARY_CAREER_LINES, REIGNING_CAREER_LINES } from "./bio-career-lines.js";
import { hashIndex } from "./rng.js";

// A minister's bio is the one piece of prose on the cabinet screen, and it used
// to be a template: name, nation, seat, the word "candidate". Every person in
// the pool got the same sentence with three words swapped, which made the whole
// cast read as one person wearing fifteen name tags.
//
// A bio is composed instead, out of two things that are already true of the
// person by the time it is written: the seat they are up for, and whichever of
// their five attributes came out furthest from the middle. The second half is
// the point — the attributes are not decoration, they are the numbers
// stewardSway and counselOnReply read, and the bio is where the player meets
// them as a person rather than as five bars. Appoint the one whose integrity
// rolled low and the prose says so before the first scandal does.
//
// The composition is drawn from the same seeded stream as everything else about
// the person, so a seed always produces the same cast, told the same way.

/** Whether a person's generated career ever ran through the military or the intelligence services. */
export function hasMilitaryCareer(career: readonly CareerPost[]): boolean {
  return career.some((post) => post.archetype === "military-command" || post.archetype === "intelligence-service");
}

// The bank a candidate is actually allowed to draw from: the full bank for
// someone whose record includes military or intelligence service, since every
// line in a bank is at worst silent about that and never contradicts it; the
// bank minus MILITARY_CAREER_LINES for someone whose record does not, since those
// lines assert a service record this candidate never earned.
function eligibleCareerLines(role: string, bank: readonly string[], hasMilitaryBackground: boolean): readonly string[] {
  const restricted = MILITARY_CAREER_LINES[role];
  if (!restricted || hasMilitaryBackground) return bank;
  const filtered = bank.filter((line) => !restricted.has(line));
  return filtered.length > 0 ? filtered : bank;
}

/**
 * What the government a leader heads allows their past to have held.
 *
 * Read off the leader table for the chair it describes, so a bio can never
 * contradict the government beside it: a crown prince who governs under a
 * reigning King did not "take the crown", and the President of a party state
 * never won a convention on the fourth ballot.
 */
export type CareerGate = { readonly reigning: boolean; readonly contested: boolean };

const MONARCHIES: ReadonlySet<string> = new Set(["absolute_monarchy", "constitutional_monarchy_executive"]);
const UNCONTESTED: ReadonlySet<string> = new Set(["authoritarian", "one_party_state", "military_junta", "absolute_monarchy", "theocracy"]);

/** The gate for one nation's chair; undefined for any chair the leader table does not describe. */
export function careerGateFor(nation: string, role: string): CareerGate | undefined {
  const row = leaderConstraintFor(nation, role);
  if (!row) return undefined;
  return {
    reigning: MONARCHIES.has(row.regime) && row.seat === "head_of_state",
    contested: !UNCONTESTED.has(row.regime),
  };
}

/** A seat's bank with the lines its government rules out taken away; the whole bank if that would leave nothing. */
function gatedBank(role: string, bank: readonly string[], gate: CareerGate | undefined): readonly string[] {
  if (!gate) return bank;
  const reigning = gate.reigning ? undefined : REIGNING_CAREER_LINES[role];
  const contested = gate.contested ? undefined : CONTESTED_CAREER_LINES[role];
  const kept = bank.filter((line) => !reigning?.has(line) && !contested?.has(line));
  return kept.length > 0 ? kept : bank;
}

const ATTRIBUTE_KEYS = ["competence", "loyalty", "integrity", "charisma", "ambition"] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** What a person is, before the seat: enough to write a bio about. */
export type BioSubject = {
  /**
   * The person this bio is about.
   *
   * The one thing in here that is theirs alone, and the reason it is required:
   * the closing sentence is drawn from a bank by a hash of it, so two ministers
   * with the same readings do not close on the same line. Shortlist position
   * cannot do that job — the write that actually lands on a shipped record
   * (`reassignCareerLines`) passes every candidate index 0.
   */
  readonly id: string;
  readonly role: string;
  readonly nationName: string;
  readonly traits: readonly PersonTrait[];
  /** Where this candidate sits in the shortlist for their seat. */
  readonly index: number;
  /** Rotates which career line the shortlist opens on, per nation and seat. */
  readonly careerOffset: number;
  /** Whether this candidate's own generated career ran through the military or the intelligence services. */
  readonly hasMilitaryBackground?: boolean;
  /** What the government they would lead allows their past to hold; absent for every chair but a foreign lead. */
  readonly government?: CareerGate | undefined;
} & Record<AttributeKey, number>;

/**
 * Where a reading sits inside the range its own seat is drawn from, as 0..1.
 *
 * The first version of this measured distance from a flat 0.5 and produced a
 * cabinet in which all six ministers said the same sentence. Every role's
 * competence is authored high — a treasury minister is drawn from 0.55–0.95 —
 * so competence was always the furthest from 0.5, and the player seats the most
 * competent candidate for every chair by definition. Measured against the seat's
 * own range instead, 0.87 competence in a 0.5–0.9 band is unremarkable and
 * 0.45 loyalty in a 0.4–0.85 band is the thing worth saying about the person.
 */
function positionInRange(value: number, range: { min: number; max: number }): number {
  const span = range.max - range.min;
  return span > 0 ? Math.max(0, Math.min(1, (value - range.min) / span)) : 0.5;
}

/**
 * Every reading placed inside the window its own seat draws from, as 0..1.
 *
 * The one yardstick anything that judges a person is allowed to use. It is
 * exported because two surfaces reach a verdict about the same person — the
 * card's closing sentence and the dossier's assessment — and a card that calls
 * someone incorruptible beside an assessment that calls them slippery is two
 * generators disagreeing in front of the player.
 *
 * `ranges` is optional because a seat with no authored profile has no window to
 * measure against; the raw reading is then the honest answer rather than a
 * placement pretending to be one.
 */
export function attributePositions(
  readings: Readonly<Record<AttributeKey, number>>,
  ranges?: Readonly<Record<AttributeKey, { min: number; max: number }>>,
): ReadonlyMap<AttributeKey, number> {
  return new Map(
    ATTRIBUTE_KEYS.map((key) => [key, ranges ? positionInRange(readings[key], ranges[key]) : readings[key]] as const),
  );
}

/**
 * The four readings no campaign event can write, and therefore the only ones a
 * past-tense sentence may be selected by.
 *
 * `loyalty` is the fifth reading and it is the one that moves: `loyaltyShift`
 * folds into the record at two hundredths per contested call, so a prose bank
 * ranked against all five is a prose bank the present can re-pick. That is
 * tolerable for the card bio, which is composed once at generation and stored
 * as a string. It is not tolerable for the long-form dossier, which is
 * recomposed on every read — a Secretary overruled twice would open his file
 * and find a different event in his past.
 */
export const RECORD_ATTRIBUTE_KEYS = ["competence", "integrity", "charisma", "ambition"] as const;
export type RecordAttributeKey = (typeof RECORD_ATTRIBUTE_KEYS)[number];

function furthestFromMiddle<Key extends AttributeKey>(
  subject: BioSubject,
  keys: readonly Key[],
): { key: Key; high: boolean } {
  const positions = attributePositions(subject, roleProfileByRole.get(subject.role)?.attributes);
  const position = (key: AttributeKey) => positions.get(key)!;

  let best: Key = keys[0]!;
  for (const key of keys) {
    if (Math.abs(position(key) - 0.5) > Math.abs(position(best) - 0.5)) best = key;
  }
  return { key: best, high: position(best) >= 0.5 };
}

/**
 * Whichever reading is most unusual for somebody in this seat.
 *
 * Ties break on the fixed key order rather than on the stream, so the same
 * person always gets the same sentence about themselves no matter when the bio
 * is composed. All five readings, because this one is called once, at
 * generation, and its answer is frozen into `Person.bio` — see
 * {@link standoutOfRecord} for the version anything recomposed at read time
 * must use instead.
 */
export function standoutAttribute(subject: BioSubject): { key: AttributeKey; high: boolean } {
  return furthestFromMiddle(subject, ATTRIBUTE_KEYS);
}

/** The same ranking over the readings a campaign cannot write, for prose recomposed every time it is read. */
export function standoutOfRecord(subject: BioSubject): { key: RecordAttributeKey; high: boolean } {
  return furthestFromMiddle(subject, RECORD_ATTRIBUTE_KEYS);
}

// The nation is an adjective in the two lines that use it, so a pool generated
// without a nation name still reads as a sentence rather than as a gap.
export function fillNation(line: string, nationName: string): string {
  return nationName ? line.replace("{nation}", nationName) : line.replace(" {nation}", "");
}

function attributeLine(subject: BioSubject): string {
  const { key, high } = standoutAttribute(subject);
  const bank = ATTRIBUTE_LINES[key]![high ? "high" : "low"];
  return bank[hashIndex(`${subject.id}:${key}:${high ? "high" : "low"}`, bank.length)]!;
}

/**
 * The composed bio: where they were, then what they are.
 *
 * The career line walks the bank by shortlist position rather than drawing
 * freely, so the candidates competing for one seat never open on the same
 * sentence — they are read side by side when the player fills a chair, and two
 * identical openings there read as a broken generator rather than as a
 * coincidence. The offset is what keeps that from making every nation's first
 * candidate for a seat sound alike.
 *
 * This walks the bank for one subject in isolation, which is enough to
 * guarantee the line never contradicts *this* candidate's own background but
 * not enough, on its own, to keep two candidates for the same chair from
 * landing on the same line once some of a bank's lines are off-limits to
 * some of the shortlist — see {@link assignCareerLines}, which is what the
 * generator actually calls for a whole shortlist at once.
 */
export function composeBio(subject: BioSubject): string {
  const authored = CAREER_LINES[subject.role];
  if (!authored) throw new Error(`no career lines authored for ${subject.role}`);
  const bank = gatedBank(subject.role, authored, subject.government);
  const careers = eligibleCareerLines(subject.role, bank, subject.hasMilitaryBackground ?? false);
  const career = careers[(subject.careerOffset + subject.index) % careers.length]!;
  return `${fillNation(career, subject.nationName)} ${attributeLine(subject)}`;
}

/** The same composition as {@link composeBio}, for a career line already chosen elsewhere. */
export function composeBioFromCareerLine(subject: BioSubject, careerLine: string): string {
  return `${fillNation(careerLine, subject.nationName)} ${attributeLine(subject)}`;
}

/**
 * The career line for every candidate on one shortlist at once, so a line
 * gated off for one candidate's background can never collide with a line a
 * sibling candidate already holds.
 *
 * A single-subject walk (`composeBio`) picks a candidate's line purely from
 * its own shortlist position, which is exactly what breaks once some of a
 * bank's lines are off-limits to some candidates: a civilian candidate
 * skipped forward past a gated line lands on a line a military candidate
 * elsewhere on the same shortlist was going to use anyway, and two ministers
 * up for the same chair read the identical sentence. This walks the whole
 * shortlist in shortlist order instead, keeping a running tally of which
 * lines are already spoken for — civilian and military candidates each rank
 * within their own eligible lane, and any rank that would collide with a
 * line an earlier candidate already took is skipped forward, still inside
 * the same lane, until a free one turns up. For a seat with nothing gated at
 * all this reduces to exactly the walk `composeBio` already does.
 */
export function assignCareerLines(
  role: string,
  careerOffset: number,
  hasMilitaryBackground: readonly boolean[],
  government?: CareerGate,
): readonly string[] {
  const authored = CAREER_LINES[role];
  if (!authored) throw new Error(`no career lines authored for ${role}`);
  const bank = gatedBank(role, authored, government);
  const restricted = MILITARY_CAREER_LINES[role];
  const filtered = restricted ? bank.filter((line) => !restricted.has(line)) : bank;

  const used = new Set<string>();
  const assigned: string[] = [];
  let civilianRank = 0;
  let militaryRank = 0;
  for (const isMilitary of hasMilitaryBackground) {
    const pool = isMilitary ? bank : filtered;
    const rank = isMilitary ? militaryRank : civilianRank;
    // Walk forward from this candidate's own rank, inside its own lane, until
    // a line nobody earlier on the shortlist has already taken turns up.
    let chosen = pool[(careerOffset + rank) % pool.length]!;
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(careerOffset + rank + step) % pool.length]!;
      if (!used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    used.add(chosen);
    assigned.push(chosen);
    if (isMilitary) militaryRank += 1;
    else civilianRank += 1;
  }
  return assigned;
}

/** Every seat the composer can write a bio for — the paired test's whole input. */
export const BIO_ROLES: readonly string[] = Object.keys(CAREER_LINES);

/** Calendar birth year from age at a given campaign year — dossier display only. */
export function birthYear(person: Pick<Person, "age">, campaignCalendarYear: number): number {
  return campaignCalendarYear - person.age;
}

/**
 * The career bank for one seat, for the long-form dossier to open on.
 *
 * `hasMilitaryBackground` narrows the bank exactly as {@link composeBio} does,
 * and so does `nation` for a foreign lead chair, so the card bio and the
 * dossier's "road here" never disagree about whether this particular person
 * served, or reigns.
 */
export function careerLinesFor(role: string, hasMilitaryBackground = false, nation?: string): readonly string[] {
  const lines = CAREER_LINES[role];
  if (!lines) throw new Error(`no career lines authored for ${role}`);
  const gate = nation === undefined ? undefined : careerGateFor(nation, role);
  return eligibleCareerLines(role, gatedBank(role, lines, gate), hasMilitaryBackground);
}

/**
 * How far the opening line of a seat's shortlist is rotated, per nation.
 *
 * A rotation, not a bank length: it exists so that two countries' shortlists
 * for the same chair do not both open on the bank's first sentence. Every
 * candidate's line is `(offset + rank) % bank.length`, so the rotation can be
 * smaller than the bank and every rank still lands somewhere distinct.
 *
 * Twelve because that is the shallowest bank — a shortlisted seat, whose bench
 * is eight deep with slack for the refill after a resignation. The seats held
 * one to a chair carry a line per chair instead (fifty governors, sixty bureau
 * chiefs, thirty-four committee chairs), and rotating those by more would buy
 * nothing: the walk covers the whole bank either way.
 */
export const CAREER_OFFSET_SPAN = 12;

/**
 * How deep one seat's bank is.
 *
 * The number a bench has to fit inside, and the reason it is a function rather
 * than a constant: a bank is as deep as the bench it dresses, and the three
 * seats held one to a chair are far deeper than the shortlisted ones.
 */
export function careerBankDepth(role: string): number {
  const lines = CAREER_LINES[role];
  if (!lines) throw new Error(`no career lines authored for ${role}`);
  return lines.length;
}
