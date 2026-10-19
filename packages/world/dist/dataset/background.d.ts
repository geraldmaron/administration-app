import type { CareerArchetype, CareerPost, Education, SchoolTier, StudyField } from "../schemas/background.js";
export type BackgroundAttribute = "competence" | "loyalty" | "ambition" | "integrity" | "charisma";
type Weights = Partial<Record<BackgroundAttribute, number>>;
/**
 * What a career does to someone.
 *
 * Read these as "compared to an average official", not as moral judgments.
 * Intelligence work lowers `loyalty` because the trade selects for people who
 * keep their own counsel, not because spies are traitors.
 */
export declare const CAREER_EFFECTS: Readonly<Record<CareerArchetype, Weights>>;
export declare const FIELD_EFFECTS: Readonly<Record<StudyField, Weights>>;
/**
 * What the name on the certificate does.
 *
 * `regional` is not a penalty on competence — a competent official is produced
 * everywhere. What a less-networked school changes is what the graduate had to
 * do to get into the room, which reads as loyalty and integrity rather than as
 * a lower ceiling.
 */
export declare const TIER_EFFECTS: Readonly<Record<SchoolTier, Weights>>;
/**
 * Which working lives plausibly lead to which chair.
 *
 * A defense minister who has never been near the forces is possible and
 * interesting; one drawn from a pool that never includes military command is a
 * simulation that cannot produce a general. These are the draws, not a
 * requirement — the last post in a career is what the seat mostly reflects.
 */
export declare const ROLE_CAREER_POOL: Readonly<Record<string, readonly CareerArchetype[]>>;
/**
 * What a generated bench's life must hold, where the seat it is drawn for has
 * a floor the career draw alone would miss: a judge read law, and a serving
 * officer's last post is in uniform. Only the vacancy benches carry a rule, so
 * every pooled seat rolls exactly the life it always did.
 */
export type BackgroundRule = {
    readonly field?: StudyField;
    readonly finalPost?: CareerArchetype;
};
export declare const ROLE_BACKGROUND_RULES: Readonly<Record<string, BackgroundRule>>;
export declare function backgroundRuleFor(role: string): BackgroundRule | undefined;
export declare function careerPoolFor(role: string): readonly CareerArchetype[];
/**
 * Where a background places someone on each attribute, as a position in [0, 1].
 *
 * Longer service in a post counts for more than a brief one, but with sharply
 * diminishing returns: thirty years in the civil service is more civil-servant
 * than five, and not six times more. Without the damping a single long post
 * would swamp every other fact about a life.
 */
export declare function backgroundPosition(education: Education, career: readonly CareerPost[], tier: SchoolTier): Readonly<Record<BackgroundAttribute, number>>;
/**
 * How much a post of this length counts.
 *
 * A square root rather than a linear span: the difference between two years and
 * ten is most of what a post does to someone, and the difference between twenty
 * and thirty is nearly none.
 */
export declare function tenureWeight(years: number): number;
/**
 * A summed nudge, as a position in [0, 1].
 *
 * A logistic curve rather than a clamp, so an unusually consistent life keeps
 * pushing toward the end of its window instead of piling up against a wall
 * where every extreme background produces the identical maximum.
 */
export declare function squash(total: number): number;
/**
 * One thing in a life, and how hard it pushed one reading.
 *
 * `weight` is signed and is the same arithmetic {@link backgroundPosition}
 * sums, so a consumer can say which part of a person's record is most of the
 * reason a number came out where it did instead of asserting that it did.
 */
export type BackgroundDriver = {
    readonly kind: "school";
    readonly tier: SchoolTier;
    readonly weight: number;
} | {
    readonly kind: "field";
    readonly field: StudyField;
    readonly weight: number;
} | {
    readonly kind: "postgraduate";
    readonly weight: number;
} | {
    readonly kind: "career";
    readonly archetype: CareerArchetype;
    readonly years: number;
    readonly weight: number;
};
/**
 * What pushed one reading where it landed, hardest push first.
 *
 * The dossier's assessment of a person is only worth printing if it can name
 * the fact behind it — the same discipline the relationship graph works under,
 * where a tie nobody's record supports is not written. A reading is the sum of
 * a school, a field, a graduate degree and every post held, so the largest
 * signed term in that sum is a fact about this person and not a guess about
 * them.
 *
 * Posts of one archetype are summed rather than listed: two spells in the civil
 * service twenty years apart are one civil service career to anybody reading
 * the file, and printing the shorter of them would name the smaller truth.
 * Terms that move this attribute not at all are left out entirely.
 */
export declare function backgroundDrivers(education: Education, career: readonly CareerPost[], tier: SchoolTier | undefined, attribute: BackgroundAttribute): readonly BackgroundDriver[];
export {};
