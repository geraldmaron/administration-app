import { engineOwnedFlag } from "./scenario-deeds.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { OPENING_CLAUSE_STARTS, OPENING_DETERMINERS, OPENING_HEAD_NOUNS } from "./audit-lexicon-opening.js";
/**
 * The grounding family, as a set. Exported for the one caller that needs to
 * separate these findings from the rest: shipped content that predates the
 * rules carries grounding debt the upgrade wave owns, and a pack test still
 * has to refuse every *other* finding rather than loosening to "no errors".
 */
export const GROUNDING_FINDING_KINDS = new Set([
    "decapitated-opening",
    "particulars-floor",
    "foreign-cast-no-transmission",
    "critical-prices-no-life",
    "hardcoded-assembly",
    "gate-on-nothing",
    "condition-vocabulary-spread",
    "unmoored-price",
]);
/** Every passage of a scenario that is player-readable prose. */
function scenarioProse(def, options) {
    const parts = [def.subject, def.locus.descriptor];
    for (const particular of def.particulars ?? [])
        parts.push(particular.label, particular.value);
    if (def.context) {
        parts.push(def.context.standing, def.context.precedent, def.context.inaction, def.context.unknown);
        for (const pressure of def.context.pressures)
            parts.push(pressure.want);
    }
    for (const beat of def.opening)
        parts.push(beat.text);
    if (options.transmission && def.transmission)
        parts.push(def.transmission.text, def.transmission.attribution);
    for (const reply of def.replies) {
        parts.push(reply.text);
        if (reply.commitment.kind === "position") {
            parts.push(reply.commitment.remembered);
            if (reply.commitment.rejoinder)
                parts.push(reply.commitment.rejoinder.text);
        }
        if (reply.press)
            parts.push(reply.press);
    }
    return parts.join("\n");
}
// --- A1. The decapitated opening -------------------------------------------
/**
 * The first sentence of the player's week, beginning mid-clause.
 *
 * Doctrine §6.1 bans it outright: 34 of 303 shipped scenarios open on a
 * lowercase word, the residue of a pass that deleted the article §10 forbids
 * as a stock opener instead of rewriting the sentence that needed it. The
 * message says "rewrite" rather than "capitalize" because capitalizing is the
 * defect wearing a hat — "Levee went in the night" is not a sentence either.
 *
 * The capitalized variant ("Facility stays open", "Man who negotiated") and
 * the one that hides behind a demonym ("{{counterpartAdjective}} coast guard
 * is holding six trawlers", which renders "French coast guard is holding")
 * are read by `strippedHead`, which asks only what two short word lists can
 * answer, so "Baltimore's port authority has..." and "Backup generators
 * failed" pass.
 */
export function auditDecapitatedOpening(def, findings) {
    const first = def.opening[0];
    if (!first)
        return;
    const text = first.text.trimStart();
    const stripped = strippedHead(text);
    if (stripped) {
        findings.push({
            kind: "decapitated-opening",
            severity: "error",
            scenario: def.id,
            message: `the first opening beat begins "${stripped}…", a singular noun phrase with no determiner, so the player's week ` +
                "begins on wreckage. Rewrite the sentence so it does not need the article back (\"Backup generators failed at the " +
                "central hospital\"); doctrine §6.1 bans the stripped determiner outright",
        });
        return;
    }
    // Any other binder token renders capitalized or as a proper noun, so the
    // source's case says nothing about what the player reads.
    if (text.startsWith("{{"))
        return;
    const initial = text[0];
    if (!initial || initial !== initial.toLowerCase() || initial === initial.toUpperCase())
        return;
    findings.push({
        kind: "decapitated-opening",
        severity: "error",
        scenario: def.id,
        message: `the first opening beat starts lowercase — "${text.slice(0, 48)}…" — so the player's week begins mid-clause. ` +
            "Rewrite the sentence so it does not need the article back (\"Backup generators failed at the central hospital\"); " +
            "capitalizing the wreckage leaves the same bare noun phrase doctrine §6.1 bans",
    });
}
// How far into the sentence the head of the opening phrase is looked for: a
// modifier or two ("Overnight patrol", "City council"), never a whole clause.
const OPENING_PHRASE_REACH = 3;
const DEMONYM_TOKEN = "{{counterpartAdjective}}";
function bareWord(token) {
    return token === undefined ? undefined : token.replace(/[,;:.!?]+$/, "");
}
/** Whether `word` continues a compound the head started: "city council", "border villages". */
function continuesHead(word) {
    return [word, word.replace(/s$/, ""), word.replace(/es$/, ""), word.replace(/ies$/, "y")].some((form) => OPENING_HEAD_NOUNS.has(form));
}
/** Whether `word` starts the clause the head is the subject of: its verb, a relative or a preposition. */
function startsClause(word) {
    return OPENING_CLAUSE_STARTS.has(word) || /^[a-z]+ed$/.test(word);
}
/**
 * The opening words of a sentence whose first phrase is a singular count noun
 * with its determiner stripped, or undefined. The head is the first listed
 * count noun within reach, after at most a couple of modifiers; it convicts
 * the sentence only when a clause starts straight after it, so a plural or a
 * compound it modifies ("Refinery workers voted", "Ship procurement is") is
 * left alone.
 */
export function strippedHead(sentence) {
    const tokens = sentence.split(/(?<=[.!?])\s/)[0].split(/\s+/).filter(Boolean);
    const start = tokens[0] === DEMONYM_TOKEN ? 1 : 0;
    if (start === 0 && tokens[0]?.startsWith("{{"))
        return undefined;
    for (let index = start; index < Math.min(tokens.length, start + OPENING_PHRASE_REACH); index += 1) {
        const raw = tokens[index];
        const word = bareWord(raw);
        // A possessive, a figure or an acronym is a proper reference, and
        // punctuation ends the phrase before any head is reached.
        if (raw !== word || !/^[A-Za-z][a-z-]*$/.test(word))
            return undefined;
        const lower = word.toLowerCase();
        if (OPENING_DETERMINERS.has(lower))
            return undefined;
        // A capital past the first word is a proper noun: "Operation Nightfall began".
        if (index > 0 && word !== lower)
            return undefined;
        if (!OPENING_HEAD_NOUNS.has(lower))
            continue;
        const next = bareWord(tokens[index + 1])?.toLowerCase();
        if (next === undefined)
            return undefined;
        if (continuesHead(next))
            continue;
        return startsClause(next) ? tokens.slice(0, index + 2).join(" ") : undefined;
    }
    return undefined;
}
// --- A2. The particulars floor ---------------------------------------------
/**
 * The floor is four, measured as the audit measured it: rows in `particulars`,
 * which is the only place a figure is pinned somewhere the Record can reach.
 * All ten reference scenarios carry four; the corpus median is two and 85 of
 * 303 carry none.
 *
 * Zero is an error at any severity (§6.1: "a defect at any severity and
 * disqualifying at critical"). Below four is a warning — the doctrine asks
 * for an argument in the review record, not a refusal, and the schema caps the
 * array at four so this rule can never ask for more than the schema allows.
 */
const PARTICULARS_FLOOR = 4;
export function auditParticularsFloor(def, findings) {
    const count = def.particulars?.length ?? 0;
    if (count === 0) {
        findings.push({
            kind: "particulars-floor",
            severity: "error",
            scenario: def.id,
            message: "carries no particulars at all, so nothing in the record fixes how many, how long, how much or how far. " +
                `Doctrine §6.1 sets the floor at ${PARTICULARS_FLOOR}, the number every reference scenario carries`,
        });
        return;
    }
    if (count >= PARTICULARS_FLOOR)
        return;
    findings.push({
        kind: "particulars-floor",
        severity: "warning",
        scenario: def.id,
        message: `carries ${count} particular${count === 1 ? "" : "s"} against the reference set's uniform ${PARTICULARS_FLOOR}. ` +
            "Fewer than four wants an argument in the review record: a place, an actor or a quantity named in prose with no " +
            "particular pinning it has spent its specificity where the Record cannot reach it",
    });
}
// --- A3. The relay on a foreign week ---------------------------------------
/**
 * A foreign counterpart the player only ever hears paraphrased.
 *
 * §6.1: "a foreign cast without a transmission is a warning at routine and
 * serious, and a defect at critical." The relay is the corpus's strongest
 * single device where it exists, and 40 of 118 foreign-cast scenarios do
 * without it.
 */
export function auditForeignCastTransmission(def, findings) {
    // "stricken" is the other domestic cast: the counterpart is the player's own
    // government, bearing a condition at home. There is no foreign party to relay
    // anything, so asking for a transmission would be asking a week about a fire
    // in Colorado to quote a cable.
    // "outlet" is a newspaper at home: its words, when it has any, are an
    // editor's letter, and a week without one is not a foreign paraphrase.
    // An issued collection report is our analysts' finding, not a message from
    // the government it concerns. A relay would invent words the source never
    // recorded; this also covers a domestic state report bound at home.
    if (def.cast.pick === "none" || def.cast.pick === "stricken" || def.cast.pick === "outlet" ||
        def.cast.pick === "liveBill" || def.cast.pick === "judicialVacancy" || def.cast.pick === "pendingOrderCase" ||
        def.cast.pick === "collectionReport" || def.transmission)
        return;
    findings.push({
        kind: "foreign-cast-no-transmission",
        severity: def.severity === "critical" ? "error" : "warning",
        scenario: def.id,
        message: `casts a foreign counterpart (pick: "${def.cast.pick}") and carries no transmission, so the player weighs another ` +
            "government's decision on domestic paraphrase alone. Give the counterpart its own words — one relayed document " +
            "does more work than three beats of cabinet summary (§6.1)",
    });
}
// --- A4. Weightlessness at severity ----------------------------------------
/** Whether any answer to this week prices a human toll. */
function pricesLife(reply) {
    if (reply.commitment.kind !== "position")
        return false;
    const lives = reply.commitment.impact?.human?.lives;
    return lives !== undefined && lives !== "none";
}
/**
 * A critical week structurally indistinguishable from a routine one.
 *
 * 36 of 50 shipped criticals price no human life at all, which is severity
 * carried entirely by prose intensity and by nothing the engine can see. A
 * warning, not an error: a critical constitutional or fiscal week can be
 * genuinely bloodless, and the escape is exactly that — the week declares an
 * institutional or financial consequence instead, and a reader judges whether
 * that is the honest reading.
 */
export function auditCriticalPricesLife(def, findings) {
    if (def.severity !== "critical")
        return;
    if (def.replies.some(pricesLife))
        return;
    findings.push({
        kind: "critical-prices-no-life",
        severity: "warning",
        scenario: def.id,
        message: "is a critical week and no reply prices a human toll: no impact.human.lives anywhere on the board. " +
            "Either the week costs people something an answer should declare, or the reason it does not belongs in the " +
            "review record — severity widens the tail, and here it widens nothing the engine can read (§2)",
    });
}
// --- A6. The player's legislature, hard-coded -------------------------------
// "The assembly" as the player's own legislature. `{{assembly}}` is the
// templated placeholder and renders correctly; this is the literal, and it is
// distinguished from the legitimate senses — an assembly area on a border, an
// assembly line in a factory — by the noun that follows.
const ASSEMBLY_LITERAL = /\bthe\s+assembl(?:y|y's|ies)\b(?!\s*(?:area|line|lines|hall|halls|plant|point|room|rooms|floor|building|yard))/gi;
/**
 * Doctrine §10 requires American vocabulary on the player's own government.
 * The `parliamentary-vocabulary` rule catches "the minister", "the chair" and
 * "parliament"; it does not catch this literal, which is 20 occurrences across
 * 12 shipped scenarios. A transmission is exempt whole, on the same grounds it
 * is exempt from the parliamentary rule: a foreign government naming its own
 * legislature is the correct thing for it to say.
 */
export function auditHardcodedAssembly(def, findings) {
    const prose = scenarioProse(def, { transmission: Boolean(def.transmission?.domesticSubject) });
    const hits = [...prose.matchAll(ASSEMBLY_LITERAL)];
    if (hits.length === 0)
        return;
    findings.push({
        kind: "hardcoded-assembly",
        severity: "error",
        scenario: def.id,
        message: `writes "${hits[0][0]}" about the player's own legislature (${hits.length} occurrence${hits.length === 1 ? "" : "s"}), ` +
            "and the seat this game ships is the United States presidency — say \"Congress\", or the chamber by name. " +
            "{{assembly}} is the placeholder and renders correctly; this is the hard-coded literal (§10)",
    });
}
// --- B1. Gate-on-nothing ----------------------------------------------------
// A turn floor this early is the director's warm-up, not a reading of the
// board: every campaign passes turn 5.
const EARLY_TURN_FLOOR = 5;
/** Whether a condition says anything about the board beyond the calendar. */
function bindsToState(def) {
    return def.conditions.some((condition) => condition.kind !== "turn" || (condition.atLeast ?? 0) > EARLY_TURN_FLOOR);
}
/**
 * A week the director can deal to any President in any state of any campaign.
 *
 * 123 of 303 shipped scenarios are in that position. §6.2 rule 2 makes it a
 * defect *with one honest exception*: some weeks genuinely should deal
 * anywhere, and forcing a gate onto a quiet routine culture week manufactures
 * a false dependency the fiction cannot support.
 *
 * The doctrine puts that declaration in the brief and the review record, not
 * in the JSON — "silence is not a declaration" — so there is no schema field
 * to escape through and this rule does not invent one. What it accepts instead
 * is the weaker in-file evidence that somebody thought about the board: one
 * condition that is not an early turn floor, or a weight boost, which reads
 * live state to decide when this week rises. A warning at routine and serious,
 * because the exception is real and a batch is allowed two or three; an error
 * at critical, because a critical week bound to nothing is the anti-exemplar
 * §6.2 names by name.
 */
export function auditGateOnNothing(def, findings) {
    if (bindsToState(def))
        return;
    if ((def.boosts?.length ?? 0) > 0)
        return;
    const what = def.conditions.length === 0 ? "carries no conditions at all" : "carries only an early turn floor";
    findings.push({
        kind: "gate-on-nothing",
        severity: def.severity === "critical" ? "error" : "warning",
        scenario: def.id,
        message: `${what}, so it can be dealt to any President on any board in any campaign. §6.2: "turn says when the game may ` +
            'deal a week; it never says why this week belongs to this board." Gate on a reading the planner actually has — ' +
            "institutionState, oversightMatter, shutdown, appropriation, relationship, policyStance — or, if this is genuinely " +
            'a universal week, say so and say why in the brief and the review record: "silence is not a declaration"',
    });
}
// --- B2. Condition monoculture (batch) --------------------------------------
// Below this a batch is too small for a share to mean anything: two
// conditioned scenarios both gating on a flag is not a monoculture.
const SPREAD_BATCH_FLOOR = 8;
const TURN_FLAG_CEILING = 0.8;
/**
 * A batch that gated on the clock and called it gating on the board.
 *
 * 193 of the corpus's 216 conditions (89%) are `turn` or `flag`, and five
 * kinds in the schema — `alignment`, `removalPressure`, `stateGrievance`,
 * `cohortStrain` and `institutionState`, the richest gate the game has — are
 * used zero times. §6.2 rule 3 asks for the spread at batch scale rather than
 * per scenario, because any individual week is allowed to gate on a flag.
 */
export function auditConditionVocabularySpread(defs, findings) {
    const conditioned = defs.filter((def) => def.conditions.length > 0);
    if (conditioned.length < SPREAD_BATCH_FLOOR)
        return;
    // Measured over conditions rather than scenarios, which is how the audit
    // measured it: one week gating on turn, flag and institutionState is a week
    // that read the board, and counting it whole either way would hide the
    // batch that reached outside the two kinds exactly once.
    const conditions = conditioned.flatMap((def) => def.conditions);
    const narrow = conditions.filter((condition) => condition.kind === "turn" || condition.kind === "flag");
    const share = narrow.length / conditions.length;
    if (share <= TURN_FLAG_CEILING && narrow.length < conditions.length)
        return;
    findings.push({
        kind: "condition-vocabulary-spread",
        severity: "warning",
        scenario: defs[0].id,
        message: `${narrow.length} of this batch's ${conditions.length} conditions are turn or flag ` +
            `(${Math.round(share * 100)}%, over the ${Math.round(TURN_FLAG_CEILING * 100)}% ceiling). A batch whose conditions are all ` +
            "turn and flag has not gated on the board; it has gated on the clock (§6.2 rule 3). At least one condition per ten " +
            "should come from outside those two kinds — institutionState reads a body's delivery, backlog and vacant days, " +
            "every one of them a number the player moved themselves",
    });
}
// --- B5. The unmoored price -------------------------------------------------
// The military lexicon, kept deliberately wide. A false negative here costs a
// finding; a false positive costs a writer's trust in the rule, and this rule
// is a heuristic standing in for a reader.
const MILITARY_LANGUAGE = /\b(militar\w*|army|armies|navy|naval|air ?force|troops?|soldiers?|marines?|airmen|regiments?|brigades?|battalions?|garrisons?|barracks|deploy\w*|mobiliz\w*|redeploy\w*|patrols?|warships?|frigates?|destroyers?|submarines?|corvettes?|carriers?|gunboats?|fighter jets?|aircraft|helicopters?|drones?|missiles?|artillery|ordnance|munitions?|ammunition|arsenal|airstrikes?|sortie|sorties|readiness|combat|frontline|front line|wars?|wartime|warfare|war ?fighting|weapons?|rifles?|small arms|arms shipments?|armed forces|rearm\w*|quartermasters?|veterans?|convoys?|fleets?|escort\w*|generals?|admirals?|officers? corps|joint chiefs|defense (?:department|secretary|budget|posture|planners?)|chiefs of staff|reservists?|conscript\w*|border troops|peacekeep\w*|ceasefire|cease-fire|belligerent|hostilities|occupation force)\b/i;
/**
 * A metric that moves with no mechanism in the fiction.
 *
 * The clean mechanical case, and the one doctrine §2 already calls
 * "unsupported in practice": `cost.militaryReadiness` on a scenario whose
 * prose contains no military language anywhere — subject, context, pressures,
 * opening, transmission, replies, rejoinders, remembered lines or press. 151
 * of 911 shipped replies do it, on culture grants and orchestra contracts, and
 * the Record is then unable to name the cause of the swing (§6 rule 12).
 *
 * A warning rather than an error because the lexicon is a proxy for a reader:
 * a scenario can carry the mechanism in a sentence no word list will match.
 * The fix is almost always deletion — take the metric off — and the supported
 * path for a week that really did commit forces is
 * `impact.institutional: ["forces-committed"]`.
 */
export function auditUnmooredPrice(def, findings) {
    const priced = def.replies.filter((reply) => reply.commitment.kind === "position" && (reply.commitment.cost.militaryReadiness ?? 0) !== 0);
    if (priced.length === 0)
        return;
    // A war week's mechanism is its class. Both of the corpus's war-class hits
    // were true weeks of a live campaign — a staged column waiting on a tide, a
    // coalition clearing the airspace a resupply flies through — that no word
    // list catches without also catching a courtroom's "defense".
    if (def.class === "war")
        return;
    if (MILITARY_LANGUAGE.test(scenarioProse(def, { transmission: true })))
        return;
    for (const reply of priced) {
        findings.push({
            kind: "unmoored-price",
            severity: "warning",
            scenario: def.id,
            message: `reply "${reply.id}" moves cost.militaryReadiness and no sentence in this scenario is about the military, ` +
                'so nothing here completes "this reply moves readiness because ___" (§6.2 rule 7). Take the metric off, or, ' +
                'if the week really does commit forces, declare impact.institutional: ["forces-committed"] and write the ' +
                "sentence that says so — hand-authored readiness is unsupported in practice (§2)",
        });
    }
}
// --- Wiring -----------------------------------------------------------------
/** Every per-scenario grounding rule, in the order a reader would meet them. */
export function auditGrounding(def, findings) {
    auditDecapitatedOpening(def, findings);
    auditParticularsFloor(def, findings);
    auditForeignCastTransmission(def, findings);
    auditCriticalPricesLife(def, findings);
    auditHardcodedAssembly(def, findings);
    auditGateOnNothing(def, findings);
    auditUnmooredPrice(def, findings);
}
/** Every batch-level grounding rule. */
export function auditGroundingBatch(defs, findings) {
    auditConditionVocabularySpread(defs, findings);
}
/**
 * A condition waiting on a flag nothing ever writes: an arc reader that is
 * authored, shipped, and permanently undealable.
 *
 * The audit's highest-value finding — 13 flag names read by 24 shipped
 * scenarios — and §6.2 rule 4's second half: a batch "checks that every flag
 * it reads is set by something the game can actually load." The union it
 * checks against is the batch itself, the packs the caller says are installed,
 * and the bundled pack, which ships with every install: two of the audit's
 * thirteen orphans turned out to be set by `packs/core.ts` all along, and a
 * rule that could not see the binary would have called them dead.
 *
 * The inverse (a flag written that nothing reads) is deliberately not a rule.
 * Packs compose: a reply stamps governance memory so that some later pack can
 * gate on it, and demanding the reader already exist would make writing the
 * setter first an offense. Measured against the bundled pack, that rule fired
 * thirty-one times on content that is entirely correct.
 */
export function auditFlagEconomy(defs, knownFlags, findings) {
    const ids = new Set(defs.map((def) => def.id));
    const written = new Set([...flagsSetBy(defs), ...flagsSetBy(CORE_SCENARIOS)]);
    for (const def of defs) {
        for (const condition of def.conditions) {
            if (condition.kind !== "flag" || !condition.is)
                continue;
            if (written.has(condition.flag) || knownFlags.has(condition.flag) || engineOwnedFlag(condition.flag, ids))
                continue;
            findings.push({
                kind: "flag-condition-never-set",
                severity: "error",
                scenario: def.id,
                message: `waits on the flag "${condition.flag}", which nothing here, in the bundled pack, or in the packs already installed ever sets`,
            });
        }
    }
}
/**
 * Every flag a set of scenarios writes. Exported so a caller assembling the
 * "known flags" union for `flag-condition-never-set` — the rule that catches
 * an arc reader waiting on a flag nothing sets — can include a pack it holds
 * without re-deriving the traversal. The bundled core pack is folded in by the
 * audit itself; this is for the packs a caller loads off disk.
 */
export function flagsSetBy(defs) {
    return new Set(defs.flatMap((def) => def.replies.flatMap((reply) => reply.sets ?? [])));
}
