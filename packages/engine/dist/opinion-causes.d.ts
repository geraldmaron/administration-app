import { type OpinionDriver } from "./opinion-drivers.js";
import type { Campaign } from "./state.js";
import type { NationCondition } from "./state.js";
/**
 * What a hollowed-out executive costs the two judgments it belongs to.
 *
 * Written as a drag from zero rather than as a term in the average, so a
 * government running as it was inherited reads exactly what it read before
 * delivery reached the public at all: this can only mark an administration
 * down, and only for the part of the government it has actually let go.
 */
export declare const SERVICES_DELIVERY_DRAG = 0.35;
export declare const COMPETENCE_DELIVERY_DRAG = 0.45;
/**
 * How far the corps's standing can carry the two judgments coverage is made of,
 * and the most it may ever carry them.
 *
 * The press corps had a standing that moved off the administration's real record
 * and reached the headline through nothing, so a government covered for a full term as a scandal polled
 * exactly like one covered as a success — and removal, which reads approval,
 * could not tell the two apart.
 *
 * This is the edge, and its shape is the point. It is one term into two targets,
 * never a write to a metric: coverage moves what the country believes about this
 * government's honesty and about whether it can do the job, at the speed a
 * public revises an impression, and it cannot touch the money, the army or the
 * order at home. The single path into `player.opinion` is still `apply()`, and
 * the single writer of `metrics.approval` is still `recomputeApproval`.
 *
 * Capped because a press corps is not an electorate. At the cap — a corps as
 * hostile as the model allows, held there for long enough that both judgments
 * have drifted the whole way — the two together are worth about four points of
 * raw approval, nearer three once polarization has compressed it. That is a
 * term of hostile coverage costing what a term of hostile coverage costs: real
 * enough to govern around, smaller than a single live scandal (a quarter of
 * `integrity` on its own), and far short of anything that can end a presidency
 * by itself.
 */
export declare const PRESS_COVERAGE_WEIGHT = 0.5;
export declare const PRESS_COVERAGE_CAP = 0.15;
/**
 * What crime costs the sense of being safe, per point of it — and only the part
 * this administration is answerable for.
 *
 * Measured against where crime was heading with nobody governing
 * (`crimeBaseline`), not against zero and not against the authored figure. A
 * country that has always carried this much crime is not losing its sense of
 * safety to it every week, and a rise that the economy drove is already charged
 * once, to prosperity, through the unemployment and cost-of-living terms the
 * baseline itself reads. So what is left here is the excess: the crime this
 * government has on its own record.
 *
 * Under the insurgency term's weight, because armed opposition to the state and
 * a worse year for burglary are not the same order of fact.
 */
export declare const CRIME_SECURITY_WEIGHT = 0.3;
/**
 * Security's resting reading and how far order's departure from its rest moves
 * it. Security used to start at the order reading itself, so a country whose
 * order sat at its ordinary level billed it in full every week and again in
 * competence; order now bills only its change from where the country's
 * institutions hold it, once, here. Design judgment, labeled.
 */
export declare const SECURITY_BASE = 0.6;
export declare const SECURITY_ORDER_WEIGHT = 0.4;
/**
 * Competence's base. It carries what order at its usual level used to give it
 * (0.3 of a resting order near 0.65), because order now bills its change from
 * rest once, in security, rather than its level in two judgments.
 */
export declare const COMPETENCE_BASE = 0.35;
/**
 * What an empty cabinet costs competence, as a share of the seats: a third of
 * the cabinet empty costs a quarter. Read as a share because the count of
 * seats differs by charter, and a count charged three empty seats as much on a
 * fifteen-seat cabinet as on a five-seat one. Design judgment, labeled.
 */
export declare const VACANCY_WEIGHT = 0.75;
/**
 * Unity reads what this administration did to the country's division, not the
 * era's level of it, which the blocs already carry. At the stock's ceiling
 * unity falls to about a fifth; at its floor it reaches about 0.84. Design
 * judgment, labeled.
 */
export declare const UNITY_BASE = 0.6;
export declare const UNITY_DIVISION_WEIGHT = 1.6;
/**
 * What a settled promise is worth to the country's reading of this
 * administration's honesty, and for how long.
 *
 * The defect this closes: a broken promise reached approval exactly once, as a
 * single week's nudge to the mood, and then the weekly revision walked it
 * straight back — because nothing in the honesty judgment's own target had
 * heard about it. The only lasting record was a cohort strain, and cohort
 * strain is centered by construction and so cannot move the national figure at
 * all. A first-hundred-days promise broken in public therefore cost about a
 * tenth of the point the stakes are written for, and the size could not be
 * fixed on the stakes: their strain weight is already at its documented cap.
 *
 * So the record is a term now, where it belongs. A promise the country was
 * given a date for and did not get is one of the largest things a public's
 * honesty judgment is actually made of, and a term is the only form in which
 * the weekly revision carries it rather than erases it.
 *
 * A broken first-hundred-days promise is about half a live scandal
 * (`SCANDAL_INTEGRITY_WEIGHT`), and the same size as the week's own shock, so
 * the news and the record agree about one broken promise. Kept promises credit
 * far less than broken ones cost: a president who does what they said was
 * supposed to.
 */
export declare const PROMISE_INTEGRITY: {
    readonly firstHundredDays: {
        readonly broken: -0.12;
        readonly kept: 0.04;
    };
    readonly term: {
        readonly broken: -0.05;
        readonly kept: 0.015;
    };
};
/**
 * How long the country holds a settled promise against, or to the credit of,
 * the administration that made it. A year: long enough that a promise broken in
 * the first hundred days is still being asked about at the anniversary, short
 * enough that it is not the whole term.
 */
export declare const PROMISE_MEMORY_WEEKS = 52;
/**
 * Every kind of term a target is made of.
 *
 * A union rather than free strings, and `OPINION_CAUSE_LABELS` below is keyed
 * on it: a term added to `opinionTargets` with no name for the player fails the
 * typecheck rather than appearing on screen as an unexplained movement. Shared
 * where the same fact reaches two judgments — the delivery shortfall and the
 * week's coverage each reach two — because it is one fact and a player reading
 * both should see it named the same way twice.
 */
export type OpinionCauseKey = "base" | "stability" | "war" | "insurgency" | "unemployment" | "inflation" | "growth" | "prices" | "conditions" | "money" | "delivery" | "scandal" | "coverage" | "polarization" | "readiness" | "standing" | "vacancies" | "crime" | "promises" | "bounded";
/** What each term is called, in the words the surface prints above the sentence. */
export declare const OPINION_CAUSE_LABELS: Readonly<Record<OpinionCauseKey, string>>;
/**
 * One signed term of one judgment's target.
 *
 * `contribution` is what this term adds to or takes off the target, in the
 * target's own 0..1 units, so a surface can rank causes by size without
 * knowing anything about the arithmetic that produced them.
 */
export type OpinionCause = {
    readonly key: OpinionCauseKey;
    readonly contribution: number;
    /** The sentence a president is owed, with this week's figure in it. */
    readonly detail: string;
};
/**
 * What prices that have already risen cost the public's sense of being better
 * off, per unit of the price level above where the term started them.
 *
 * The inflation term reads how fast prices are rising this year; this one reads
 * where they have got to. A public that lived through a price surge does not
 * feel better the week inflation cools, because the groceries still cost what
 * they cost. One for one against the price level: a surge that leaves prices
 * four percent higher than the term's own inflation would have is worth four
 * points off this judgment until wages or a new term reset the memory.
 */
export declare const PRICE_LEVEL_WEIGHT = 1;
/**
 * How far prices stand above where the term-start inflation would have put
 * them, as a share, and never below zero.
 *
 * Measured against the inflation the country was already running when the
 * administration took office, compounded over the weeks since, so an economy
 * rising at its ordinary pace leaves no mark and only the excess does. The term
 * start is the authored economy the founding opened on: nothing in the save
 * keeps a second one yet.
 */
export declare function priceLevelScar(campaign: Campaign): number;
/**
 * The live conditions at home that are emergencies rather than an economy: the
 * disasters, the epidemic and unrest.
 *
 * The economic standing kinds (a recession, a price or jobs shock, a debt
 * crisis, an energy shortage, a housing crunch) are judged on prosperity or
 * competence through their own bills and through the live economy itself, so
 * counting them here as well charged one crisis to two judgments and printed
 * "a disaster is live at home" beside a price shock.
 */
export declare function reliefConditions(campaign: Campaign): readonly NationCondition[];
/**
 * The named terms behind one judgment's target, in the order the model reads
 * them, with the bounding line last where the scale bit.
 */
export declare function opinionCausesFor(campaign: Campaign, driver: OpinionDriver): readonly OpinionCause[];
/**
 * What the country would think if it judged only on what it can currently see.
 *
 * Every target reads state that already exists and is already moved by the rest
 * of the simulation, which is what makes opinion a *consequence* of the board
 * rather than a second scoreboard kept alongside it. Nothing here is authored
 * and nothing here can be set by content.
 *
 * The sum of the named terms, deliberately: the arithmetic and the explanation
 * are the same object, so the explanation cannot go stale against the charge.
 */
export declare function opinionTargets(campaign: Campaign): Readonly<Record<OpinionDriver, number>>;
