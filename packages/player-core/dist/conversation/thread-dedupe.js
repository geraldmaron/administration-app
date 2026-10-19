/**
 * When the scene plate's particulars grid is on screen, opening beats must not
 * restate the same figures in prose — each fact is said once on the briefing.
 */
const NUMBER_WORDS = {
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
    "10": "ten",
    "11": "eleven",
    "12": "twelve",
    "13": "thirteen",
    "14": "fourteen",
    "15": "fifteen",
    "16": "sixteen",
    "17": "seventeen",
    "18": "eighteen",
    "19": "nineteen",
    "20": "twenty",
};
const LABEL_SYNONYMS = {
    copies: ["copies", "versions", "drafts"],
    circulation: ["circulation", "circulating"],
    days: ["days", "day"],
    months: ["months", "month"],
    weeks: ["weeks", "week"],
    clinics: ["clinics", "clinic"],
    boats: ["boats", "boat", "patrol", "refit", "fleet"],
    held: ["held", "hold", "holding", "people", "prisoners"],
    ours: ["ours", "our"],
    depots: ["depots", "depot"],
    port: ["port", "ports", "shifts"],
};
const LABEL_SKIP = new Set(["what", "since", "past", "the", "with", "from", "over", "left"]);
function normalizeText(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function numberTokenPatterns(valueNorm) {
    const patterns = [];
    if (/^\d+$/.test(valueNorm)) {
        const word = NUMBER_WORDS[valueNorm];
        patterns.push(new RegExp(`\\b${valueNorm}\\b`, "i"));
        if (word)
            patterns.push(new RegExp(`\\b${word}\\b`, "i"));
        return patterns;
    }
    const word = valueNorm.match(/^[a-z]+$/) ? valueNorm : undefined;
    if (word) {
        patterns.push(new RegExp(`\\b${word}\\b`, "i"));
        const digit = Object.entries(NUMBER_WORDS).find(([, w]) => w === word)?.[0];
        if (digit)
            patterns.push(new RegExp(`\\b${digit}\\b`, "i"));
    }
    return patterns;
}
function labelKeywords(label) {
    const words = normalizeText(label)
        .split(/\s+/)
        .filter((word) => word.length > 2 && !LABEL_SKIP.has(word));
    const expanded = new Set();
    for (const word of words) {
        expanded.add(word);
        for (const synonym of LABEL_SYNONYMS[word] ?? [])
            expanded.add(synonym);
    }
    return [...expanded];
}
function phrasePatterns(valueNorm) {
    const patterns = [new RegExp(escapeRegex(valueNorm), "i")];
    const digitUnit = valueNorm.match(/^(\d+)\s+(.+)$/);
    if (digitUnit?.[1] && digitUnit[2]) {
        const word = NUMBER_WORDS[digitUnit[1]];
        if (word)
            patterns.push(new RegExp(`${word}\\s+${escapeRegex(digitUnit[2])}`, "i"));
    }
    const ofParts = valueNorm.match(/^(\d+)\s+of\s+(\d+)$/);
    if (ofParts?.[1] && ofParts[2]) {
        const w1 = NUMBER_WORDS[ofParts[1]];
        const w2 = NUMBER_WORDS[ofParts[2]];
        patterns.push(new RegExp(`${ofParts[1]}\\s+of\\s+${ofParts[2]}`, "i"));
        if (w1 && w2)
            patterns.push(new RegExp(`${w1}\\s+of\\s+${w2}`, "i"));
    }
    const inParts = valueNorm.match(/^(\d+)\s+in\s+(\d+)$/);
    if (inParts?.[1] && inParts[2]) {
        const w1 = NUMBER_WORDS[inParts[1]];
        const w2 = NUMBER_WORDS[inParts[2]];
        patterns.push(new RegExp(`${inParts[1]}\\s+in\\s+${inParts[2]}`, "i"));
        if (w1 && w2)
            patterns.push(new RegExp(`${w1}\\s+in\\s+${w2}`, "i"));
    }
    return patterns;
}
function nearKeywordPattern(numberPattern, keyword) {
    const num = numberPattern.source;
    const kw = escapeRegex(keyword);
    return new RegExp(`(?:${num}\\s+(?:\\w+\\s+){0,5}${kw}|${kw}\\s+(?:\\w+\\s+){0,5}${num})`, "i");
}
function particularMatchesText(text, particular) {
    const norm = normalizeText(text);
    const valueNorm = normalizeText(particular.value);
    if (valueNorm.includes(" ") || valueNorm.length > 8 || /[°$]/.test(valueNorm)) {
        return phrasePatterns(valueNorm).some((pattern) => pattern.test(norm));
    }
    if (norm.includes(valueNorm) && valueNorm.length >= 6)
        return true;
    const numberPatterns = numberTokenPatterns(valueNorm);
    if (numberPatterns.length === 0) {
        return phrasePatterns(valueNorm).some((pattern) => pattern.test(norm));
    }
    const keywords = labelKeywords(particular.label);
    if (keywords.length === 0) {
        return numberPatterns.some((pattern) => pattern.test(norm)) && norm.includes(valueNorm);
    }
    for (const numberPattern of numberPatterns) {
        for (const keyword of keywords) {
            if (nearKeywordPattern(numberPattern, keyword).test(norm))
                return true;
        }
    }
    return false;
}
function splitSentences(text) {
    const parts = text.match(/[^.!?]+[.!?]?/g);
    return parts?.map((part) => part.trim()).filter((part) => part.length > 0) ?? [text];
}
function sentenceRestatesParticulars(sentence, particulars) {
    const matches = particulars.filter((particular) => particularMatchesText(sentence, particular));
    if (matches.length >= 2)
        return true;
    if (matches.length === 0)
        return false;
    const norm = normalizeText(sentence);
    const valueNorm = normalizeText(matches[0].value);
    if (valueNorm.includes(" ") || valueNorm.length >= 6) {
        return phrasePatterns(valueNorm).some((pattern) => pattern.test(norm));
    }
    return particularMatchesText(sentence, matches[0]);
}
function trimLeadingConnector(text) {
    return text.replace(/^(?:and|but|so|yet)\s+/i, "").trim();
}
export function trimParticularRestatement(text, particulars) {
    if (particulars.length === 0)
        return text;
    const kept = splitSentences(text).filter((sentence) => !sentenceRestatesParticulars(sentence, particulars));
    return trimLeadingConnector(kept.join(" ").trim());
}
export function beatsWithoutParticularRestatement(beats, particulars) {
    if (!particulars || particulars.length === 0)
        return beats;
    return beats.flatMap((beat) => {
        const trimmed = trimParticularRestatement(beat.text, particulars);
        if (trimmed.length === 0)
            return [];
        if (trimmed === beat.text)
            return [beat];
        return [{ ...beat, text: trimmed }];
    });
}
