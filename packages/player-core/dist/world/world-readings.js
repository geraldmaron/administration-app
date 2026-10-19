import { ALIGNMENT_WORDS } from "./world-governments";
// The facts of a government the World map and table read. Each reading turns a
// government into one tone and the word the table prints for it, and names the
// legend that explains every tone it uses, so the map, its key and the table
// cell cannot disagree.
export const WORLD_READINGS = ["standing", "trend", "alignment", "trade", "forces"];
export function isWorldReading(value) {
    return typeof value === "string" && WORLD_READINGS.includes(value);
}
/** Where a partner's share of US goods trade changes tone: a half percent, two, five. */
export const TRADE_CUTS = [0.005, 0.02, 0.05];
const ALIGNMENT_TONES = {
    aligned: "favorable",
    "leaning-aligned": "lean-favorable",
    neutral: "neutral",
    "leaning-opposed": "caution",
    opposed: "adverse",
};
const TREND_TONES = { warming: "favorable", steady: "neutral", cooling: "adverse" };
const FORCE_TONES = { None: "none", Small: "seq-2", Sizable: "seq-3", Large: "seq-4" };
function tradeTone(share) {
    const step = TRADE_CUTS.filter((cut) => share >= cut).length;
    return ["seq-1", "seq-2", "seq-3", "seq-4"][step] ?? "seq-1";
}
/** What one government shows under one reading. */
export function readingCell(government, reading) {
    switch (reading) {
        case "standing":
            return { tone: government.stance ?? "unread", word: government.standingWord };
        case "trend":
            if (government.stance === "unread" || government.stance === undefined)
                return { tone: "unread", word: "Unread" };
            return government.trend ? { tone: TREND_TONES[government.trend.direction], word: government.trend.word } : { tone: "none", word: "No record yet" };
        case "alignment":
            return { tone: ALIGNMENT_TONES[government.alignment], word: ALIGNMENT_WORDS[government.alignment] };
        case "trade":
            return { tone: tradeTone(government.tradeShare), word: government.tradeText };
        case "forces":
            return { tone: FORCE_TONES[government.forcesText] ?? "none", word: government.forces > 0 ? `${government.forcesText} US presence` : "No US troops" };
    }
}
export const READING_LEGENDS = {
    standing: [
        { tone: "favorable", word: "Trusts you" },
        { tone: "neutral", word: "Neutral" },
        { tone: "caution", word: "Wary" },
        { tone: "adverse", word: "Hostile" },
        { tone: "unread", word: "Unread" },
    ],
    trend: [
        { tone: "favorable", word: "Warming" },
        { tone: "neutral", word: "Steady" },
        { tone: "adverse", word: "Cooling" },
        { tone: "none", word: "No record yet" },
        { tone: "unread", word: "Unread" },
    ],
    alignment: [
        { tone: "favorable", word: "On your side" },
        { tone: "lean-favorable", word: "Leaning your way" },
        { tone: "neutral", word: "On neither side" },
        { tone: "caution", word: "Leaning against you" },
        { tone: "adverse", word: "Against you" },
    ],
    trade: [
        { tone: "seq-1", word: "Under 0.5%" },
        { tone: "seq-2", word: "0.5% to 2%" },
        { tone: "seq-3", word: "2% to 5%" },
        { tone: "seq-4", word: "5% or more" },
    ],
    forces: [
        { tone: "none", word: "No US troops" },
        { tone: "seq-2", word: "Small" },
        { tone: "seq-3", word: "Sizable" },
        { tone: "seq-4", word: "Large" },
    ],
};
