import { type CareerPost, type Person, type PersonTrait } from "@admin/world";
/** Whether a person's generated career ever ran through the military or the intelligence services. */
export declare function hasMilitaryCareer(career: readonly CareerPost[]): boolean;
/**
 * What the government a leader heads allows their past to have held.
 *
 * Read off the leader table for the chair it describes, so a bio can never
 * contradict the government beside it: a crown prince who governs under a
 * reigning King did not "take the crown", and the President of a party state
 * never won a convention on the fourth ballot.
 */
export type CareerGate = {
    readonly reigning: boolean;
    readonly contested: boolean;
};
/** The gate for one nation's chair; undefined for any chair the leader table does not describe. */
export declare function careerGateFor(nation: string, role: string): CareerGate | undefined;
declare const ATTRIBUTE_KEYS: readonly ["competence", "loyalty", "integrity", "charisma", "ambition"];
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
export declare function attributePositions(readings: Readonly<Record<AttributeKey, number>>, ranges?: Readonly<Record<AttributeKey, {
    min: number;
    max: number;
}>>): ReadonlyMap<AttributeKey, number>;
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
export declare const RECORD_ATTRIBUTE_KEYS: readonly ["competence", "integrity", "charisma", "ambition"];
export type RecordAttributeKey = (typeof RECORD_ATTRIBUTE_KEYS)[number];
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
export declare function standoutAttribute(subject: BioSubject): {
    key: AttributeKey;
    high: boolean;
};
/** The same ranking over the readings a campaign cannot write, for prose recomposed every time it is read. */
export declare function standoutOfRecord(subject: BioSubject): {
    key: RecordAttributeKey;
    high: boolean;
};
export declare function fillNation(line: string, nationName: string): string;
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
export declare function composeBio(subject: BioSubject): string;
/** The same composition as {@link composeBio}, for a career line already chosen elsewhere. */
export declare function composeBioFromCareerLine(subject: BioSubject, careerLine: string): string;
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
export declare function assignCareerLines(role: string, careerOffset: number, hasMilitaryBackground: readonly boolean[], government?: CareerGate): readonly string[];
/** Every seat the composer can write a bio for — the paired test's whole input. */
export declare const BIO_ROLES: readonly string[];
/** Calendar birth year from age at a given campaign year — dossier display only. */
export declare function birthYear(person: Pick<Person, "age">, campaignCalendarYear: number): number;
/**
 * The career bank for one seat, for the long-form dossier to open on.
 *
 * `hasMilitaryBackground` narrows the bank exactly as {@link composeBio} does,
 * and so does `nation` for a foreign lead chair, so the card bio and the
 * dossier's "road here" never disagree about whether this particular person
 * served, or reigns.
 */
export declare function careerLinesFor(role: string, hasMilitaryBackground?: boolean, nation?: string): readonly string[];
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
export declare const CAREER_OFFSET_SPAN = 12;
/**
 * How deep one seat's bank is.
 *
 * The number a bench has to fit inside, and the reason it is a function rather
 * than a constant: a bank is as deep as the bench it dresses, and the three
 * seats held one to a chair are far deeper than the shortlisted ones.
 */
export declare function careerBankDepth(role: string): number;
export {};
