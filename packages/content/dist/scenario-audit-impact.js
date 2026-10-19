// The impact family: reading a stated toll back out of prose, and the rules that
// hold a reply's declared impact to the sentence the author wrote about it.
import { tollBandFor } from "./impact-model.js";
function make(kind, severity, scenario, message) {
    return { kind, severity, scenario, message };
}
/**
 * Reading a stated death toll back out of prose.
 *
 * Every figure in player copy is spelled (gate rule 9 refuses digits), so the
 * parser has to read words. It is deliberately narrow: it recognizes the shapes
 * a writer actually uses for a toll and returns nothing for everything else,
 * because the cost of a miss here is a rule that does not fire and the cost of a
 * false positive is a correct scenario refused.
 */
const UNITS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES = { hundred: 100, thousand: 1_000, million: 1_000_000 };
/**
 * Bare plurals, which carry a magnitude without a count. "hundreds dead" is a
 * toll a writer states often and a number parser reads as nothing, so these map
 * straight onto the band they name rather than through arithmetic.
 */
const BARE_PLURALS = {
    dozens: 40,
    hundreds: 400,
    thousands: 4_000,
};
const DEATH_WORD = /\b(?:dead|killed|died|dying|bodies|casualties|fatalities|fatality|corpses|buried)\b/i;
/** The value of a spelled cardinal phrase ("four hundred and twelve"), or undefined. */
export function spelledValue(phrase) {
    const words = phrase.toLowerCase().split(/[\s-]+/).filter((word) => word && word !== "and");
    if (words.length === 0)
        return undefined;
    let total = 0;
    let current = 0;
    let sawNumber = false;
    for (const word of words) {
        if (word === "a" || word === "an") {
            current = current === 0 ? 1 : current;
            continue;
        }
        if (word === "dozen") {
            current = (current === 0 ? 1 : current) * 12;
            sawNumber = true;
            continue;
        }
        const unit = UNITS[word] ?? TENS[word];
        if (unit !== undefined) {
            current += unit;
            sawNumber = true;
            continue;
        }
        const scale = SCALES[word];
        if (scale === undefined)
            return undefined;
        sawNumber = true;
        if (scale === 100) {
            current = (current === 0 ? 1 : current) * 100;
        }
        else {
            total += (current === 0 ? 1 : current) * scale;
            current = 0;
        }
    }
    return sawNumber ? total + current : undefined;
}
const NUMBER_WORD = "(?:a|an|and|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen)";
// The count and the death word, with room between them for the noun the toll is
// counted in — "nineteen of the miners are dead", "forty children killed".
const TOLL_PHRASE = new RegExp(`\\b((?:${NUMBER_WORD})(?:[\\s-]+(?:${NUMBER_WORD}))*)\\b(?:\\W+\\w+){0,4}?\\W+${DEATH_WORD.source}`, "i");
const BARE_PLURAL_TOLL = new RegExp(`\\b(dozens|hundreds|thousands)\\b(?:\\W+\\w+){0,4}?\\W+${DEATH_WORD.source}`, "i");
/**
 * The death toll a piece of prose states, as a count. Undefined where the prose
 * states no toll — which is most prose, and is not a defect.
 */
export function statedTollIn(text) {
    const bare = BARE_PLURAL_TOLL.exec(text);
    if (bare)
        return BARE_PLURALS[bare[1].toLowerCase()];
    const match = TOLL_PHRASE.exec(text);
    return match ? spelledValue(match[1]) : undefined;
}
/** Every piece of prose a reply is answerable for: the option, and what it is remembered as. */
function replyProse(reply) {
    const rejoinder = reply.commitment.rejoinder?.text ?? "";
    const remembered = reply.commitment.kind === "position" ? reply.commitment.remembered : "";
    return [reply.text, remembered, rejoinder].join(" ");
}
/**
 * A week with a body count whose answers price nothing.
 *
 * The scenario-level half of the impact contract. If the room is called in over
 * something that killed people, displaced them, or has to be paid for, then at
 * least one answer to it did something the model can price — and a corpus where
 * none of them do is one where the dead are set dressing. That was literally
 * true of every scenario written before the bands existed, which is why this is
 * an error rather than a warning: the field is optional in the schema so that
 * a reply with genuinely nothing to declare can stay silent, and this is what
 * stops "optional" from meaning "never".
 */
export function auditImpactDeclared(def, findings) {
    const positions = def.replies.filter((reply) => reply.commitment.kind === "position");
    if (positions.length === 0)
        return;
    if (positions.some((reply) => reply.commitment.kind === "position" && reply.commitment.impact !== undefined))
        return;
    const briefing = [def.subject, ...def.opening.map((beat) => beat.text), def.transmission?.text ?? ""].join(" ");
    const toll = statedTollIn(briefing);
    // Typed commands execute in the engine. They already spend capability,
    // treasury or authority without an authored impact band. A stated human toll
    // still needs a matching declaration, regardless of the command.
    if (toll === undefined && positions.some((reply) => reply.commitment.kind === "position" &&
        (reply.commitment.collection || reply.commitment.relief || reply.commitment.localeAct ||
            reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.transmit ||
            reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview)))
        return;
    // The rule keeps its teeth where its name is. A briefing that states a toll
    // owes an answer that prices it, and that stays an error. A briefing that
    // states none may be a week where nothing true is available to declare —
    // three officials contradicting each other about one sentence, an
    // intelligence judgment whose answers all hold — and there is no way to tell
    // that from a week whose author skipped the work without reading the prose.
    //
    // So it is reported and not enforced. Twice now an error here has bought a
    // false declaration rather than a missing one: an author told a block may
    // not be empty writes "forces-committed" over a reply whose own text says
    // nothing moved, or reaches for an institutional entry that prices zero. A
    // warning puts it in front of the reviewer, which is the reader that can
    // tell the two cases apart.
    findings.push(make("impact-undeclared", toll === undefined ? "warning" : "error", def.id, toll === undefined
        ? "no answer on this scenario declares an impact, so whatever it decides costs nobody anything the model " +
            "can price: it moves the authored metrics and leaves the country identical. At least one answer to a " +
            "week worth calling the room in for spends people, money, or a capability — declare it"
        : `the briefing states a toll of about ${toll} and not one answer declares an impact, so nobody died: the ` +
            "prose reads as a catastrophe and the board moves by the authored costs alone. Declare an impact on the " +
            "replies that respond to it — at minimum the human toll and its agency"));
}
/**
 * The one impact field that can invert what it prices.
 *
 * `acted-upon` carries a negative multiplier, because a country attacked from
 * outside closes ranks: the toll term flips sign and the death becomes a
 * standing gain. That is right for a strike on our own people and wrong for
 * every case that merely resembles it — "we declined, and someone else's crew
 * died" reads like the same shape and is not, and a scenario declaring it pays
 * the player for a death.
 *
 * Checked mechanically, because the tell is mechanical: what rallies a country
 * is harm to its own. A toll declared "abroad" was borne by people who are not
 * the public doing the rallying, so the two cannot both be true.
 *
 * An omitted `borneBy` is refused for the same reason and is the nastier half.
 * The default routing is "diffuse" — our own people, spread across the country
 * — which is precisely the case "acted-upon" exists for, so silence here does
 * not fail open into something visibly wrong. It fails open into the one shape
 * that looks most legitimate, at the full negative multiplier, with nothing
 * left for the check above to compare. Saying who bore the toll is work the
 * author owes anyway, so nothing correct is refused by asking for it.
 */
export function auditActedUponToll(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const impact = reply.commitment.impact;
        if (!impact || impact.agency !== "acted-upon")
            continue;
        const borneBy = impact.human?.borneBy;
        if (borneBy === undefined) {
            findings.push(make("acted-upon-abroad", "error", def.id, `reply "${reply.id}" declares the toll "acted-upon" without saying who bore it. That agency multiplies the ` +
                `toll by a negative number — it is the rally a country gets when its own are killed — and with no ` +
                `"borneBy" beside it the reading defaults to our own people, which is the one answer nothing checked. ` +
                `Name who the dead were`));
            continue;
        }
        if (borneBy !== "abroad")
            continue;
        findings.push(make("acted-upon-abroad", "error", def.id, `reply "${reply.id}" declares the toll "acted-upon" and borne "abroad" at once. Agency "acted-upon" is the ` +
            `rally a country gets when something is done to it, and it multiplies the toll by a negative number — so a ` +
            `death borne by somebody else's people is priced as a gain in standing. If this was done to us, the dead are ` +
            `ours; if the dead are not ours, this is "on-our-watch" or "our-doing"`));
    }
}
/**
 * An agency declared over nothing.
 *
 * `agency` is read only inside the toll branch of `opinionDeltas`, where it
 * multiplies what a death costs a government's reputation. Written with no
 * `lives` band beside it, it moves no number and says nothing to a player,
 * while reading to the next author as though the block declares something.
 * Mechanical enough to check without reading a word of prose, which is the
 * point: this is the field an author reaches for once a rule has told them the
 * block must not be empty, and the answer to an empty block is to delete it
 * rather than to furnish it.
 *
 * `borneBy` has the same problem and is deliberately not checked here: whether
 * a bare one should price something is an open question about the model rather
 * than about the writing, and a rule that hardens today's answer would have to
 * be unwritten if it changes.
 */
export function auditInertImpactFields(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const impact = reply.commitment.impact;
        if (!impact)
            continue;
        const lives = impact.human?.lives;
        if (lives && lives !== "none")
            continue;
        if (impact.agency === undefined)
            continue;
        findings.push(make("inert-impact-field", "error", def.id, `reply "${reply.id}" declares an agency with no toll beside it. Agency is read only alongside "lives" — it ` +
            `multiplies what a death costs a government and touches nothing else — so here it moves no number while ` +
            `making the block look like it declares something. Declare the toll if the prose has one; otherwise drop the ` +
            `field, and drop the block with it if nothing is left`));
    }
}
/**
 * A declared band against the author's own sentence.
 *
 * Checked against the reply's own prose rather than the briefing's, and the
 * distinction is what keeps the rule honest: a briefing states what has already
 * happened, while an impact states what this answer did. An answer that
 * escalates legitimately declares a higher band than the week opened with, so
 * comparing it against the opening would refuse the correct scenario. Comparing
 * it against the sentence the author wrote about their own decision is the
 * arithmetic check `tollBandFor` exists for.
 */
export function auditImpactMatchesProse(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const declared = reply.commitment.impact?.human?.lives;
        if (!declared)
            continue;
        const toll = statedTollIn(replyProse(reply));
        if (toll === undefined)
            continue;
        const band = tollBandFor(toll);
        if (band === declared)
            continue;
        findings.push(make("impact-contradicts-prose", "error", def.id, `reply "${reply.id}" says about ${toll} died and declares the toll as "${declared}", which is the band ` +
            `for a different event — that count reads as "${band}". Either the sentence or the declaration is wrong, ` +
            "and the one the player sees is the sentence"));
    }
}
