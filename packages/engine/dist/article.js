import { incidentArticle } from "./article-incidents.js";
import { nationName } from "./naming.js";
import { secondOutletFor } from "./press-filing.js";
import { applyOutletVoice, voiceStance, bylineFor, capitalize, firstSentence, freshStake, headlineClause, moveName, moveToward, outletFor, personShortName, pick, pickLine, polish, sentence, subjectIsNation, KIND_STANDFIRST, } from "./article-desk.js";
import { domesticParagraphs, domesticRelevance, domesticStandfirst, isDomesticItem } from "./article-domestic.js";
import { operatorParagraphs, operatorRelevance, operatorStandfirst, operatorThemeFromHeadline } from "./article-operator.js";
import { conditionParagraphs, conditionRelevance, conditionStandfirst, readCondition } from "./article-condition.js";
// When the item carries nothing but its headline, the piece is the headline,
// framed by the kind of report it is. One line per kind, and no two alike: the
// wire gate reads shared text across kinds as interchangeable texture.
const BARE_LEDE = {
    press: (d) => `The report, as published: ${headlineClause(d)}.`,
    "npc-action": (d) => `${d.actor ? `${capitalize(d.actor)} acted` : "A foreign government acted"}: ${headlineClause(d)}.`,
    "player-action": (d) => `The administration acted: ${headlineClause(d)}.`,
    operator: (d) => `Outside any government's control: ${headlineClause(d)}.`,
    drift: (d) => `The numbers moved: ${headlineClause(d)}.`,
    conflict: (d) => `From the war: ${headlineClause(d)}.`,
    condition: (d) => `The report from the ground: ${headlineClause(d)}.`,
    governance: (d) => `On the statute book: ${headlineClause(d)}.`,
    pursuit: (d) => `The campaign file: ${headlineClause(d)}.`,
    bloc: (d) => `Among the bloc's members: ${headlineClause(d)}.`,
};
// A change of seat abroad files as governance with this as its instrument; it
// is a new government, not a program being reset.
const isLeadershipChange = (desk) => desk.instrument === "Change of government";
const isWar = (desk) => /\b(?:war|front) between\b/.test(desk.item.headline);
// --- The lede: the angle, from a particular the deck has not already used. ---
const LEDES = {
    press: [
        (d) => (d.subject && !subjectIsNation(d.subject) ? `The story turns on ${d.subject}.` : undefined),
        (d) => (subjectIsNation(d.subject) ? `${d.subject} answered in public.` : undefined),
        (d) => (freshStake(d) ? `At issue: ${firstSentence(freshStake(d)).replace(/[.!?]$/, "")}.` : undefined),
    ],
    "npc-action": [
        (d) => (freshStake(d) ? sentence(freshStake(d)) : undefined),
        (d) => (d.actor && d.instrument && !d.target ? `${d.actor} turned to ${moveName(d.instrument)}.` : undefined),
        (d) => d.instrument && d.target && !freshStake(d)
            ? `The move ${moveToward(d.instrument) === "to" ? "for" : "against"} ${d.target} was ${moveName(d.instrument)}.`
            : undefined,
    ],
    "player-action": [(d) => (freshStake(d) ? sentence(freshStake(d)) : undefined)],
    operator: [],
    drift: [(d) => (freshStake(d) ? sentence(freshStake(d)) : undefined)],
    conflict: [(d) => (d.actor && d.target && isWar(d) ? `Neither ${d.actor} nor ${d.target} has stopped fighting.` : undefined)],
    condition: [],
    governance: [
        (d) => (d.figure && d.person && isCourt(d) ? `${d.subject} wrote for the majority.` : undefined),
        (d) => (isLeadershipChange(d) && freshStake(d) ? sentence(freshStake(d)) : undefined),
        (d) => (d.actor && !isLeadershipChange(d) && freshStake(d) ? sentence(firstSentence(freshStake(d))) : undefined),
        (d) => (!d.actor && freshStake(d) ? `At issue: ${firstSentence(freshStake(d)).replace(/[.!?]$/, "")}.` : undefined),
    ],
    pursuit: [
        (d) => (d.actor && d.target && /\blapse\b/.test(d.item.headline) ? `${d.actor} has stopped pressing ${d.target}.` : undefined),
        (d) => (d.actor && d.target && /\bwhat it wanted\b/.test(d.item.headline) ? `${d.actor} has what it was pressing ${d.target} for.` : undefined),
    ],
    bloc: [(d) => (freshStake(d) ? sentence(freshStake(d)) : undefined)],
};
// --- A figure is printed only with what it measures. ---
const isCourt = (desk) => desk.item.facts?.topicTags?.includes("judiciary") === true;
function figureLine(desk) {
    const figure = desk.figure;
    if (!figure)
        return undefined;
    const tags = desk.item.facts?.topicTags ?? [];
    if (isCourt(desk))
        return figure === "per curiam" ? "The decision was unsigned, per curiam." : `The vote was ${figure}.`;
    if (tags.includes("debt")) {
        return /%$/.test(figure) ? `Creditors are being asked to write off ${figure} of what they are owed.` : `The new rating is ${figure}.`;
    }
    if (tags.includes("markets") && /%$/.test(figure) && desk.subject)
        return `${capitalize(desk.subject)} moved ${figure} in one week.`;
    return undefined;
}
// What a reply to a move aimed at this government is: the President's choice,
// said once. A move that gives rather than takes asks for no reply.
function closingFor(desk) {
    if (desk.secret)
        return pick(desk.item, "closing", SECRET_CLOSINGS)(desk);
    if (!desk.aimedAtPlayer || desk.kind !== "npc-action")
        return undefined;
    if (desk.instrument && moveToward(desk.instrument) === "to")
        return undefined;
    return "The reply, or the choice not to make one, is the President's.";
}
// A restricted read closes on what the holder is expected to do, not on what a
// readership will be told.
const SECRET_CLOSINGS = [
    () => "No action is requested at this stage. This office will circulate again if the picture changes.",
    () => "Distribution is limited to the original list.",
];
// An intelligence read is not a newspaper: it states what is assessed, or that
// nothing is beyond the report.
function secretAssessment(desk, lede) {
    const stake = freshStake(desk);
    return stake && !lede.includes(sentence(stake).slice(0, -1)) ? `Assessment: ${sentence(stake)}` : "Assessment: nothing beyond the report itself has been established.";
}
function bodyFor(desk, read) {
    if (desk.domestic)
        return domesticParagraphs(desk, read);
    if (desk.kind === "operator") {
        const piece = operatorParagraphs(desk);
        if (piece)
            return desk.secret ? [...piece, secretAssessment(desk, piece[0])] : piece;
    }
    if (desk.kind === "condition") {
        const piece = conditionParagraphs(desk, read);
        if (piece)
            return piece;
    }
    const lede = pickLine(desk, "lede", LEDES[desk.kind]) ?? BARE_LEDE[desk.kind](desk);
    const rest = [figureLine(desk), desk.secret ? secretAssessment(desk, lede) : undefined, closingFor(desk)];
    return [lede, ...rest.filter((text) => text !== undefined && text !== lede)];
}
// --- The standfirst: what and who, consistent with the body below it. ---
function partiesStandfirst(desk) {
    const { actor, target } = desk;
    if (!actor || !target)
        return undefined;
    if (desk.kind === "conflict")
        return isWar(desk) ? `Where the war between ${actor} and ${target} stands.` : undefined;
    if (desk.kind === "pursuit")
        return `${capitalize(actor)}'s campaign against ${target}.`;
    if (desk.byPlayer)
        return `What the administration did, and what ${target} does next.`;
    return `Between ${actor} and ${target}.`;
}
function subjectStandfirst(desk) {
    const subject = desk.subject;
    if (!subject)
        return undefined;
    if (desk.kind === "drift" && desk.figure && desk.item.facts?.topicTags?.includes("markets")) {
        return `A ${desk.figure} move in ${subject.toLowerCase()} prices.`;
    }
    const stake = freshStake(desk);
    if (stake)
        return `${capitalize(subject)}: ${firstSentence(stake).replace(/[.!?]$/, "")}.`;
    if (!subjectIsNation(subject))
        return `${capitalize(subject)}, and what was reported.`;
    return undefined;
}
function standfirstFor(desk, read) {
    if (desk.domestic)
        return domesticStandfirst(desk, read, freshStake(desk));
    if (desk.kind === "operator")
        return operatorStandfirst(desk) ?? KIND_STANDFIRST.operator;
    if (desk.kind === "condition")
        return conditionStandfirst(desk, read) ?? KIND_STANDFIRST.condition;
    if (isLeadershipChange(desk) && desk.actor)
        return `Who leads ${desk.actor}'s government now.`;
    if (desk.kind === "governance" && desk.actor && desk.instrument && !desk.byPlayer) {
        return `${desk.actor} is resetting its ${moveName(desk.instrument)}.`;
    }
    if (desk.instrument && desk.actor && desk.target) {
        const move = moveName(desk.instrument);
        return `${capitalize(desk.actor)}: ${move.charAt(0).toLowerCase()}${move.slice(1)}, ${moveToward(desk.instrument) === "to" ? "for" : "aimed at"} ${desk.target}.`;
    }
    return partiesStandfirst(desk) ?? subjectStandfirst(desk) ?? KIND_STANDFIRST[desk.kind];
}
// --- Why it matters to the administration: only what the item says. ---
function relevanceFor(desk, read, ties) {
    if (desk.domestic)
        return domesticRelevance(desk, read);
    const reader = readerName(desk.playerNationName);
    // A piece about our own act says so, rather than telling the player they
    // are not named in a move they ordered. Only an act is ordered: a Senate
    // vote or a debt limit filed under this country's name is not.
    if (desk.byPlayer && (desk.kind === "player-action" || desk.kind === "npc-action")) {
        const ordered = desk.instrument ? `You ordered ${moveName(desk.instrument)}${desk.target ? ` ${moveToward(desk.instrument)} ${desk.target}` : ""}.` : "You ordered this.";
        return desk.target ? `${ordered} What ${desk.target} does next is the open question.` : `${ordered} How it is answered is the open question.`;
    }
    if (desk.kind === "operator")
        return operatorRelevance(reader, desk) ?? tieLine(reader, ties);
    if (desk.aimedAtPlayer && desk.kind === "pursuit" && desk.actor) {
        return /\blapse\b/.test(desk.item.headline) ? `${desk.actor} has stopped pressing ${reader}. Nothing in this asks for a reply.` : `${desk.actor}'s campaign is aimed at ${reader}.`;
    }
    if ((desk.aimedAtPlayer || desk.byPlayer) && desk.kind === "conflict")
        return `${reader} is a party to this war.`;
    if (desk.aimedAtPlayer && desk.kind === "npc-action") {
        const from = desk.actor ? capitalize(desk.actor) : "A foreign government";
        if (desk.instrument && moveToward(desk.instrument) === "to")
            return `${from} directed ${moveName(desk.instrument)} to ${reader}. Whether to answer in kind is the President's call.`;
        return `${from} aimed this at ${reader}. Whether and how to answer is the President's call.`;
    }
    if (desk.kind === "condition")
        return conditionRelevance(reader, desk, read) ?? tieLine(reader, ties);
    if (isLeadershipChange(desk) && desk.actor)
        return `Whoever holds the chair in ${desk.actor} is who ${reader} deals with, and this says who that is.`;
    if (desk.kind === "governance" && (desk.byPlayer || !desk.actor))
        return "This changes the rules the administration works under at home.";
    if (desk.kind === "governance" && desk.actor)
        return `Any agreement with ${desk.actor} is now made under this program.`;
    if (desk.aimedAtPlayer || desk.byPlayer)
        return `This report names ${reader} directly.`;
    if (desk.kind === "drift" && desk.subject && desk.item.facts?.topicTags?.includes("markets")) {
        return `American buyers pay the world price for ${desk.subject.toLowerCase()}.`;
    }
    return tieLine(reader, ties);
}
// The one stake a story with no American party can honestly claim: a tie the
// live relationship records. With none, the piece leaves the line off.
function tieLine(reader, ties) {
    const lines = ties.flatMap((tie) => {
        const name = nationName(tie.name);
        return [
            ...(tie.treatyAlly ? [`${capitalize(name)} is a treaty ally of ${reader}.`] : []),
            ...(tie.threat ? [`${capitalize(reader)} counts ${name} among its military threats.`] : []),
        ];
    });
    return lines.length > 0 ? lines.join(" ") : undefined;
}
// The reader's country as it sits mid-sentence ("the United States"); polish()
// puts the capital back where it opens one.
function readerName(name) {
    if (name === undefined)
        return "this administration";
    return nationName(name.replace(/^the\s+/i, ""));
}
// A figure that is a bare number says nothing on its own: the feed's regional
// fold keeps its running count of folded lines in this field, and printing it
// produced "the number attached to this is 1". Only a figure with a unit, a
// split or a rating in it reaches the desk.
function labeledFigure(facts) {
    const figure = facts.figure?.trim();
    if (!figure || /^\d[\d,.]*$/.test(figure))
        return undefined;
    return figure;
}
function deskFor(item, names, facts) {
    const domestic = isDomesticItem(item, names.playerNation);
    const party = (name) => (domestic || name === undefined ? undefined : nationName(name));
    // A country filed as a story's subject with nobody else named is the party
    // that acted, so the banks that speak of an actor can speak of it.
    const actingSubject = names.actor === undefined && subjectIsNation(facts.subject) ? facts.subject : undefined;
    return {
        item,
        kind: item.kind,
        subject: facts.subject,
        person: facts.subject ? personShortName(facts.subject) : undefined,
        actor: party(names.actor ?? actingSubject),
        target: party(names.target),
        figure: labeledFigure(facts),
        stake: facts.stake,
        instrument: facts.instrument,
        aimedAtPlayer: !domestic && names.playerNation !== undefined && item.target === names.playerNation,
        byPlayer: names.playerNation !== undefined && item.actor === names.playerNation,
        playerNationName: names.playerNationName,
        secret: item.visibility === "intelligence",
        domestic,
        operatorTheme: item.kind === "operator" ? operatorThemeFromHeadline(item.headline) : "generic",
    };
}
/**
 * The piece behind a headline. Pure and deterministic on the item's own
 * content, so a dispatch opened, closed, and opened again three turns later
 * reads identically.
 *
 * `names` is passed rather than inferred so the piece can say the one thing a
 * masthead genuinely would — whether this was aimed at the government the
 * reader is running — and so the standfirst can name countries rather than
 * print their ids.
 */
export function composeArticle(item, names = {}, context = {}) {
    const facts = item.facts ?? {};
    // Asked first, so a home incident is written in its own register rather than
    // as a standing condition with a week of development behind it.
    const incident = item.kind === "condition" ? incidentArticle(item) : undefined;
    const desk = deskFor(item, names, facts);
    const read = readCondition(item);
    const masthead = outletFor(item);
    const paragraphs = incident?.body ?? bodyFor(desk, read);
    // A piece filed with its desk's stance reads in that voice forever: a paper
    // that has since come round did not write a friendlier story last month.
    const stance = masthead.pressOutlet ? voiceStance(item, context.outletDisposition) : undefined;
    // The voice lines are a masthead's view of what the administration did, so
    // they are read only over a story about an act of this administration. Over
    // a flood in Barbados they put a White House into a piece that has none, and
    // over a storm at home they describe an answer nobody has given.
    const plain = polish(standfirstFor(desk, read));
    const voiced = masthead.pressOutlet && desk.byPlayer && desk.kind === "player-action";
    const standfirst = voiced ? applyOutletVoice(plain, masthead.pressOutlet, stance) : plain;
    const second = secondOutletFor(item);
    const relevance = relevanceFor(desk, read, names.ties ?? []);
    return {
        outlet: masthead.outlet,
        outletId: masthead.outletId,
        ...(stance ? { stance } : {}),
        headline: incident?.headline ?? item.headline,
        standfirst,
        ...(relevance ? { relevance: polish(relevance) } : {}),
        byline: bylineFor(item, facts, context.filedOn, masthead.outletId),
        ...(second
            ? { also: { outlet: second.name, outletId: second.id, byline: bylineFor(item, facts, context.filedOn, second.id) } }
            : {}),
        paragraphs: paragraphs.map(polish),
        domestic: desk.domestic,
    };
}
