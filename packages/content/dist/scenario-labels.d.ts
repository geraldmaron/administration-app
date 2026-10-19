import { z } from "zod";
export declare const ScenarioClass: z.ZodEnum<{
    tragedy: "tragedy";
    terror: "terror";
    unrest: "unrest";
    disaster: "disaster";
    "public-health": "public-health";
    migration: "migration";
    "foreign-crisis": "foreign-crisis";
    war: "war";
    espionage: "espionage";
    hostage: "hostage";
    technology: "technology";
    economy: "economy";
    scandal: "scandal";
    justice: "justice";
    institution: "institution";
    culture: "culture";
    death: "death";
    triumph: "triumph";
}>;
export type ScenarioClass = z.infer<typeof ScenarioClass>;
/**
 * What the decision *is*, underneath what it is about.
 *
 * `class` says which desk the week arrives at; this says which argument the
 * room is having. The two are near-independent — a loyalty test reads the same
 * whether the person protected is a general or a registrar — and it is this
 * axis, not the class, that a player feels repeat.
 *
 * These eight are measured rather than reasoned: independent readers relabel
 * the same 56 shipped scenarios blind and agree at Cohen's kappa 0.83. A
 * vocabulary that has not survived contact with a second reader does not
 * belong here, however tidy it looks in prose — so changing a member means
 * re-running the measurement, not arguing for it.
 *
 * Closed on purpose. The value of the field is that two scenarios can be
 * compared for sameness by equality rather than by similarity, which is the
 * comparison the phrasing index cannot make: real duplicates in a real batch
 * shared 2% of their wording and the whole of their argument.
 *
 * The ordering is load-bearing. A writer or auditor works DOWN the list and
 * takes the first shape whose test passes — that rule is most of the
 * agreement, because it decides the cases where two labels are both
 * defensible. The tests themselves live in the generation brief.
 */
export declare const DilemmaShape: z.ZodEnum<{
    "credulity-bet": "credulity-bet";
    containment: "containment";
    retaliation: "retaliation";
    allocation: "allocation";
    disclosure: "disclosure";
    "loyalty-test": "loyalty-test";
    exposure: "exposure";
    "foot-in-the-door": "foot-in-the-door";
}>;
export type DilemmaShape = z.infer<typeof DilemmaShape>;
/**
 * The recurring IMAGE a scenario is built from, underneath the argument
 * `dilemmaShape` names. Two credulity bets can share nothing in prose and
 * still both turn on a single uncorroborated informant; two containments can
 * both hinge on a checkpoint with a queue behind it. That resemblance is
 * invisible to the shingle-based overlap detector (paraphrase, not copying)
 * and invisible to `dilemmaShape` (same argument, different picture). This
 * field is what closes that gap.
 *
 * Seeded, not measured. Unlike `DilemmaShape`, this vocabulary has not been
 * through inter-rater reliability testing — it is read off the seven images a
 * cross-batch review found reused near-verbatim across scenarios: an
 * uncorroborated single source, a second agency that will not confirm or sign,
 * a broken evidence trail, a border crossing as the staged location, a quiet
 * transfer to launder a wrongdoing, a public split cleanly down the middle on
 * how the week reads, and a leader closing on a bare claim of ownership.
 * Optional, because the field must exist before the corpus it will describe;
 * promoting or pruning an entry needs a corpus-wide measurement pass on images
 * of the kind `DilemmaShape` had on arguments.
 *
 * Closed and capped at three per scenario (see `motifs` below) so two
 * scenarios can be compared by exact tuple match rather than fuzzy prose
 * similarity, which is the whole reason this field exists rather than a free
 * tag.
 */
export declare const Motif: z.ZodEnum<{
    "uncorroborated-source": "uncorroborated-source";
    "agency-non-confirmation": "agency-non-confirmation";
    "broken-chain-of-custody": "broken-chain-of-custody";
    "border-crossing": "border-crossing";
    "quiet-transfer": "quiet-transfer";
    "divided-public-perception": "divided-public-perception";
    "closing-claim-of-ownership": "closing-claim-of-ownership";
}>;
export type Motif = z.infer<typeof Motif>;
/**
 * The closed sets a writer has to hit exactly.
 *
 * These were inline `z.enum(...)` calls, which meant the generation brief could
 * not quote them and a model had to infer them from the two exemplars. Every
 * writer in the first session batch invented values that sounded right —
 * "pragmatic", "urgent", "defiant", "expedient" for a tone; "health",
 * "intelligence", "infrastructure", "legal" for a chair — and every one of
 * those rejected a whole file. Named here so the brief states them and the
 * brief can never drift from what the parser accepts.
 */
export declare const ScenarioTone: z.ZodEnum<{
    conciliatory: "conciliatory";
    firm: "firm";
    principled: "principled";
    evasive: "evasive";
    coercive: "coercive";
}>;
export type ScenarioTone = z.infer<typeof ScenarioTone>;
export declare const ScenarioInstrument: z.ZodEnum<{
    diplomatic: "diplomatic";
    economic: "economic";
    covert: "covert";
    military: "military";
    assistance: "assistance";
}>;
export type ScenarioInstrument = z.infer<typeof ScenarioInstrument>;
export declare const ScenarioPolicyDomain: z.ZodEnum<{
    fiscal: "fiscal";
    industry: "industry";
    trade: "trade";
    civil: "civil";
    security: "security";
    defense: "defense";
}>;
export type ScenarioPolicyDomain = z.infer<typeof ScenarioPolicyDomain>;
export declare const ScenarioSeverity: z.ZodEnum<{
    routine: "routine";
    serious: "serious";
    critical: "critical";
}>;
export type ScenarioSeverity = z.infer<typeof ScenarioSeverity>;
/**
 * How well sourced the falsifiable claim the briefing rests on actually is.
 *
 * Until this existed every fact in an opening was true, which made the sourced
 * hedges the writing already carried — the second service disputes the timing,
 * one defector says so — decoration, and a player who noticed that was right to
 * stop reading them. A marked scenario is one where the claim can turn out to
 * have been wrong, and the aftermath pool has cards written to say so.
 *
 * The set is closed and the split inside it is load-bearing. "confirmed" is a
 * claim the board will never overturn, so a writer marking a briefing confirmed
 * is promising the player the ground under it holds. The other two are the low
 * band, and only the low band can ever resolve false — which is what keeps
 * trusting your own services the rational default rather than a mug's game.
 *
 * Scenario-level rather than per-beat. The aftermath layer's handle is the act
 * the player took, not the sentence they believed, so a per-beat marker would
 * need a per-beat reveal the consequence pool has no way to select; and the
 * tell rule reads the whole briefing regardless, because a hedge two beats away
 * from the number is still a hedge a careful reader weighs.
 */
export declare const ScenarioIntelConfidence: z.ZodEnum<{
    "single-sourced": "single-sourced";
    disputed: "disputed";
    confirmed: "confirmed";
}>;
export type ScenarioIntelConfidence = z.infer<typeof ScenarioIntelConfidence>;
/**
 * Who is pushing, and what they want.
 *
 * Named by the kind of party rather than by a person or an institution's proper
 * name, for the same reason every other authored field is world-neutral: the
 * board decides which nation and which charter this lands under, and a scenario
 * that named a Speaker would be a scenario that could only ever be cast one way.
 */
export declare const PressureSource: z.ZodEnum<{
    military: "military";
    cabinet: "cabinet";
    legislature: "legislature";
    street: "street";
    press: "press";
    business: "business";
    ally: "ally";
    adversary: "adversary";
    court: "court";
}>;
export type PressureSource = z.infer<typeof PressureSource>;
export declare const ScenarioLocusSite: z.ZodEnum<{
    capital: "capital";
    city: "city";
    coast: "coast";
    border: "border";
    interior: "interior";
    chokepoint: "chokepoint";
}>;
export type ScenarioLocusSite = z.infer<typeof ScenarioLocusSite>;
export declare const ScenarioConflictMove: z.ZodEnum<{
    offerTerms: "offerTerms";
    acceptTerms: "acceptTerms";
    deescalate: "deescalate";
}>;
export type ScenarioConflictMove = z.infer<typeof ScenarioConflictMove>;
