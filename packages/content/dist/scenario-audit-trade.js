import { TRADE_ACT_DEBT } from "./scenario-trade-act-debt.js";
// A reply's own instruction and the record it leaves are where it states the
// act. The rejoinder narrates what followed and the briefing describes what
// the other side did, so neither says what this answer does.
const ACT_PATTERNS = {
    impose: /\b(?:impose[sd]?|answer(?:s|ed)? with|put(?:s)?|post(?:s|ed)?|lay|levy|raise[sd]?|mirror(?:s|ed)?|match(?:es|ed)?)\b[^.;:]{0,50}\b(?:tariffs?|dut(?:y|ies))\b|\b(?:tariffs?|dut(?:y|ies))\b[^.;:]{0,12}\bin kind\b|\bour (?:tariffs?|dut(?:y|ies))\b[^.;:]{0,30}\bsame rate\b/i,
    lift: /\b(?:lift(?:s|ed)?|end(?:s|ed)?|drop(?:s|ped)?|remov(?:e|es|ed)|paus(?:e|es|ed)|suspend(?:s|ed)?|cut(?:s)?|reduc(?:e|es|ed|tion)|halv(?:e|es|ed)|roll(?:s|ed)? back)\b[^.;:]{0,50}\b(?:tariffs?|dut(?:y|ies))\b|\b(?:tariffs?|dut(?:y|ies))\b[^.;:]{0,20}\b(?:reduction|pause|lifted|ended)\b/i,
    sanction: /\b(?:announce[sd]?|impose[sd]?|levy|order(?:s|ed)?)\b[^.;:]{0,40}\bsanctions?\b/i,
};
// A sentence that declines the act states the act's words without taking it.
// A sentence that proposes talks about the act is not the act either.
const DECLINED = /\b(?:no|not|never|without|rather than|instead of|don't|won't|refus\w*|delay\w*|keep|kept|unchanged|stay\w*|unanswered|talks|propos\w*|negotiat\w*|ask\w*|seek\w*)\b/i;
// What the second economic rung cannot do: it lays one fixed rate on one sector.
const MATCHES_THEIR_RATE = /\b(?:same rate|match(?:es|ed)? theirs|mirror(?:s|ed)? (?:it|theirs|their rate))\b/i;
const EVERY_GOOD = /\b(?:everything|every good|all (?:of )?their goods|across the board)\b/i;
const PERCENT_WORDS = {
    five: 5, ten: 10, fifteen: 15, twenty: 20, "twenty-five": 25, thirty: 30, forty: 40, fifty: 50, hundred: 100,
};
// Goods a writer names in plain words, mapped to the one sector they mean.
// A word that could mean two sectors is left out, so a match is never a guess.
const SECTOR_WORDS = [
    [/\bsteel\b/i, "steel"], [/\balumin(?:um|ium)\b/i, "aluminum"], [/\bfertilizer\b/i, "fertilizer"],
    [/\bsemiconductors?\b|\bchips\b/i, "semiconductors"], [/\bgrain\b|\bwheat\b|\bsoybeans?\b|\bcorn\b/i, "agriculture-row-crops"],
    [/\bfruit\b/i, "agriculture-specialty"], [/\btextiles?\b|\bapparel\b/i, "textiles-apparel"],
    [/\bcrude\b/i, "energy-crude"], [/\brefined\b|\bgasoline\b|\bdiesel\b/i, "energy-refined"],
    [/\bLNG\b|\bnatural gas\b/i, "energy-gas-lng"], [/\bdairy\b|\blivestock\b|\bbeef\b/i, "agriculture-livestock"],
    [/\bprocessed food\b/i, "food-processing"], [/\bsolar\b|\bbatter(?:y|ies)\b/i, "batteries-solar"],
];
/** The rate the economic ladder's second rung lays, whatever the reply says. */
const RUNG_TWO_RATE = 10;
function sentences(text) {
    // "U.S." is a name, not the end of a sentence.
    return text.replace(/\bU\.S\./g, "US").split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
}
/** The acts a reply's words take, with the sentence that takes each. */
function statedActs(reply) {
    const remembered = reply.commitment.kind === "position" ? reply.commitment.remembered : "";
    return [reply.text, remembered].flatMap(sentences).flatMap((sentence) => Object.keys(ACT_PATTERNS)
        .filter((act) => ACT_PATTERNS[act].test(sentence) && !DECLINED.test(sentence))
        .map((act) => ({ act, sentence })));
}
function routes(reply, act) {
    const commitment = reply.commitment;
    if (commitment.kind === "instrument") {
        return commitment.instrument === "economic" && (act === "impose" ? commitment.rung === 2 : act === "sanction" && commitment.rung >= 3);
    }
    if (commitment.kind !== "position")
        return false;
    return act === "impose" ? commitment.tariff !== undefined : act === "lift" ? commitment.tariffLift !== undefined : false;
}
function statedRate(sentence) {
    const digits = /(\d+(?:\.\d+)?)\s*(?:%|-?\s?percent)/i.exec(sentence);
    if (digits)
        return Number(digits[1]);
    const words = /\b(twenty-five|five|ten|fifteen|twenty|thirty|forty|fifty|hundred)[\s-]percent\b/i.exec(sentence);
    return words ? PERCENT_WORDS[words[1].toLowerCase()] : undefined;
}
function statedSector(sentence) {
    const named = [...new Set(SECTOR_WORDS.filter(([pattern]) => pattern.test(sentence)).map(([, sector]) => sector))];
    return named.length === 1 ? named[0] : undefined;
}
/** What the routed act actually lays, or undefined where the engine picks it. */
function routedTerms(reply) {
    const commitment = reply.commitment;
    if (commitment.kind === "position" && commitment.tariff) {
        return { rate: Math.round(commitment.tariff.rate * 1000) / 10, sector: commitment.tariff.sector, engineSector: false };
    }
    if (commitment.kind === "instrument" && commitment.instrument === "economic" && commitment.rung === 2) {
        return { rate: RUNG_TWO_RATE, engineSector: true };
    }
    return { engineSector: false };
}
function termFindings(reply, sentence) {
    const terms = routedTerms(reply);
    const rate = statedRate(sentence);
    const sector = statedSector(sentence);
    return [
        ...(rate !== undefined && terms.rate !== undefined && rate !== terms.rate
            ? [`reply ${reply.id} states a ${rate}% tariff but lays ${terms.rate}%`] : []),
        ...(sector && terms.sector && sector !== terms.sector
            ? [`reply ${reply.id} names ${sector} goods but lays the tariff on ${terms.sector}`] : []),
        ...(sector && terms.engineSector
            ? [`reply ${reply.id} names ${sector} goods, but the second economic rung lays its tariff on whatever the partner sells most of; use a tariff reply that names the goods`] : []),
        ...(terms.engineSector && MATCHES_THEIR_RATE.test(sentence)
            ? [`reply ${reply.id} matches their rate, but the second economic rung lays a fixed ${RUNG_TWO_RATE}%; answering their rate needs a pinned retaliation and a tariff reply`] : []),
        ...(terms.engineSector && EVERY_GOOD.test(sentence)
            ? [`reply ${reply.id} puts a tariff on all their goods, but the second economic rung taxes one sector`] : []),
    ];
}
/**
 * A reply whose words impose, lift or pause a tariff, or announce sanctions,
 * must carry the route that does it, at the rate and on the goods it names,
 * and a reply that lays a tariff must say so.
 * Otherwise the memo says the duty ended while the trade ledger still collects
 * it. Ids that shipped before the rule are listed in `TRADE_ACT_DEBT` and may
 * only leave it.
 */
export function auditTradeActs(def, findings) {
    if (TRADE_ACT_DEBT.has(def.id))
        return;
    for (const reply of def.replies) {
        const stated = statedActs(reply);
        if (routedTerms(reply).rate !== undefined && !stated.some(({ act }) => act === "impose")) {
            findings.push({ kind: "unstated-trade-act", severity: "error", scenario: def.id,
                message: `reply ${reply.id} lays a tariff its words never mention; say what it taxes, or route it to what the words describe` });
        }
        for (const { act, sentence } of stated) {
            if (!routes(reply, act)) {
                findings.push({ kind: "unrouted-trade-act", severity: "error", scenario: def.id,
                    message: `reply ${reply.id} says it will ${act === "sanction" ? "announce sanctions" : `${act} a tariff`} ("${sentence.trim().slice(0, 90)}") but its commitment does not; route it (a tariff or tariffLift reply, or the economic ladder) or rewrite the words to what it does` });
            }
            for (const message of act === "impose" ? termFindings(reply, sentence) : []) {
                findings.push({ kind: "trade-act-terms-mismatch", severity: "error", scenario: def.id, message });
            }
        }
    }
}
