import { CONFLICT_MOVES, POLICY_DOMAINS } from "@admin/engine";
import { z } from "zod";
// The closed vocabularies a scenario is labeled with: what kind of week it is,
// what argument the room is having, what picture it is built from, and the
// four small enums a writer has to hit exactly. Split out of `scenario.ts` so
// the document schema stays readable; `scenario.ts` re-exports every name
// here, which is where the rest of the workspace still resolves them from.
// One class per kind of month a head of government can have. Classes are a
// coverage and pacing dimension — generation fans out across them, and the
// draw can be balanced by them — but every class flows through the same
// schema, gate, casting, and surface. There are no special cases per class.
export const ScenarioClass = z.enum([
    "tragedy", // mass casualty at home: a school, a mine, a ferry
    "terror",
    "unrest",
    "disaster", // natural, home and abroad
    "public-health", // outbreaks, contamination, a hospital system buckling
    "migration", // borders, boats, the people arriving and the ones sent back
    "foreign-crisis", // incidents, standoffs, summits gone wrong
    "war", // entering, leaving, escalating, staying out
    "espionage", // spies caught in both directions, leaks, defectors
    "hostage", // citizens taken, embassies under siege, the price of a life
    "technology", // cyberattacks, grid failures, what surveillance is for
    "economy", // crashes, strikes, bailouts, a run on the currency
    "scandal",
    "justice", // trials, pardons, amnesties — the rule of law bent or held
    "institution", // courts defied, elections disputed, the military's loyalty
    "culture", // identity in public: sport, faith, art, what gets banned
    "death", // the deaths of significant figures, at home and abroad
    "triumph", // the good month, and what it gets spent on
]);
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
export const DilemmaShape = z.enum([
    // 1. The room itself is unsure whether a claim is true.
    "credulity-bet",
    // 2. A crisis at home, and the argument is how harsh: harm pushed onto a
    //    population, or the cost paid out of the government's own ledger.
    "containment",
    // 3. Someone outside already acted; the argument is how hard to answer.
    "retaliation",
    // 4. Two legitimate claimants, one finite thing, and a loser either way.
    "allocation",
    // 5. Reveal or conceal, where concealment protects the government itself.
    "disclosure",
    // 6. One option protects a specific person at the expense of the outcome.
    "loyalty-test",
    // 7. The same commitment shown quietly or shown with your flag on it.
    "exposure",
    // 8. The text argues this changes what can be asked of you next time.
    "foot-in-the-door",
]);
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
export const Motif = z.enum([
    "uncorroborated-source",
    "agency-non-confirmation",
    "broken-chain-of-custody",
    "border-crossing",
    "quiet-transfer",
    "divided-public-perception",
    "closing-claim-of-ownership",
]);
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
export const ScenarioTone = z.enum(["conciliatory", "firm", "principled", "evasive", "coercive"]);
export const ScenarioInstrument = z.enum(["diplomatic", "economic", "covert", "military", "assistance"]);
// The six domains a government holds a standing program in, mirrored from the
// engine's own list as a zod enum for the same reason `ScenarioInstrument`
// mirrors the instrument ids: a scenario is a JSON document a validator has to
// be able to refuse, and a domain invented by a writer must not parse.
export const ScenarioPolicyDomain = z.enum(POLICY_DOMAINS);
// What the author claims the week is. The director reads it for pacing —
// criticals are spaced out so the building only shakes when the board earns
// it — and the audit reads it for register, because an ultimatum in a routine
// week is a manufactured clock. Routine is the connective tissue of governing:
// a budget squabble, an appointment, a provincial complaint. Serious is a real
// crisis with room to think. Critical is the rare week the building shakes.
export const ScenarioSeverity = z.enum(["routine", "serious", "critical"]);
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
export const ScenarioIntelConfidence = z.enum(["single-sourced", "disputed", "confirmed"]);
/**
 * Who is pushing, and what they want.
 *
 * Named by the kind of party rather than by a person or an institution's proper
 * name, for the same reason every other authored field is world-neutral: the
 * board decides which nation and which charter this lands under, and a scenario
 * that named a Speaker would be a scenario that could only ever be cast one way.
 */
export const PressureSource = z.enum([
    "cabinet",
    "legislature",
    "street",
    "press",
    "military",
    "business",
    "ally",
    "adversary",
    "court",
]);
// Where the event physically is. A scenario stays world-neutral in prose — it
// names a *kind* of place, and casting resolves that against the cast nation's
// real geography. Domestic plant/factory/tax-holiday weeks also bind
// `locus.city` (a dataset CityId) and write `{{city}}`; they never free-text
// the metro. `site` is the anchor the resolver swings from; `descriptor` is
// the authored close-up. It obeys the same neutrality audit every other prose
// field does.
export const ScenarioLocusSite = z.enum([
    "capital", // the seat of government itself
    "city", // a major population center away from the capital
    "coast", // a port, a harbor, the shore — falls back to city inland
    "border", // a land frontier with a real neighbor — falls back to coast
    "interior", // deep country: mines, dams, the provinces
    "chokepoint", // the nearest real maritime chokepoint to the cast nation
]);
export const ScenarioConflictMove = z.enum(CONFLICT_MOVES);
