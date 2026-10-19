// World-map modes: their ids and labels, and which fill a region takes
// from a plain bucket. No campaign object crosses this file. A fill is a
// design-token name without the leading "--", or "empty" when there is
// nothing honest to paint.
import { trustWord } from "../format/figures.js";
export const MAP_MODES = [
    { id: "trust", label: "Their trust in you" },
    { id: "reading", label: "Your view of them" },
    { id: "blocs", label: "Blocs and alliances" },
    { id: "regime", label: "Type of government" },
    { id: "conflict", label: "Conflict" },
    { id: "trade", label: "Trade with the US" },
    { id: "house", label: "House delegation" },
    { id: "governors", label: "Governors' parties" },
    { id: "electoral", label: "Election forecast" },
    { id: "senate", label: "Senate seats up" },
    { id: "hazards", label: "Disasters and emergencies" },
    { id: "deployments", label: "US troops and bases" },
    { id: "sanctions", label: "Sanctions" },
];
/** The sentence a mode shows when it has nothing it can color without inventing it. */
export const MAP_UNSEATED = "No one in office yet.";
const STANCES = ["favorable", "neutral", "caution", "adverse"];
// Same four words standing.ts uses for "Your read of them" (OUR_TRUST).
const READING_WORDS = {
    favorable: "Trusted",
    neutral: "Neutral",
    caution: "Wary",
    adverse: "Hostile",
};
const BLOC_WORDS = {
    aligned: "On your side",
    "leaning-aligned": "Leaning your way",
    neutral: "On neither side",
    "leaning-opposed": "Leaning against you",
    opposed: "Against you",
};
const BLOC_FILLS = {
    aligned: "map-board-favorable",
    "leaning-aligned": "map-board-neutral",
    neutral: "map-board-lean-center",
    "leaning-opposed": "map-board-caution",
    opposed: "map-board-adverse",
};
const PARTY_FILLS = {
    democrat: "color-party-democrat",
    republican: "color-party-republican",
    independent: "color-party-independent",
};
const PARTY_WORDS = {
    democrat: "Democrat",
    republican: "Republican",
    independent: "Independent",
};
// A House delegation the parties hold in equal numbers, and a place that sends
// no voting member: both are facts about the delegation, not a missing reading,
// so each has its own fill and word rather than the empty land.
const DELEGATION_FILLS = {
    split: "map-board-split",
    nonvoting: "map-board-land",
};
const DELEGATION_WORDS = {
    split: "Evenly split",
    nonvoting: "No voting member",
};
const REGIME_ORDER = ["theocracy", "military", "party", "monarchy", "republic", "other"];
const REGIME_WORDS = {
    theocracy: "Theocracy",
    military: "Military rule",
    party: "One-party state",
    monarchy: "Monarchy",
    republic: "Republic or democracy",
    other: "Other government",
};
const REGIME_FILLS = {
    theocracy: "map-board-lean-center",
    military: "map-board-modeled",
    party: "map-board-adverse",
    monarchy: "map-board-caution",
    republic: "map-board-neutral",
    other: "map-board-land",
};
const TRADE_MID = 0.01;
const TRADE_HIGH = 0.05;
const CONFLICT_HOT = 0.45;
// The lean bucket the electoral lens paints in, on the same 0.08 cut the
// board summary already calls competitive.
const LEAN_CUT = 0.08;
const ELECTORAL_WORDS = {
    "lean-democrat": "Leans Democratic",
    tossup: "Competitive",
    "lean-republican": "Leans Republican",
};
const ELECTORAL_FILLS = {
    "lean-democrat": "color-party-democrat",
    tossup: "map-board-lean-center",
    "lean-republican": "color-party-republican",
};
const HAZARD_WORDS = {
    declared: "Emergency declared",
    condition: "Trouble under way, no emergency declared",
};
const HAZARD_FILLS = {
    declared: "map-board-adverse",
    condition: "map-board-caution",
};
/** Which of the 5-point lean scale a state's current lean falls in, for the electoral lens. */
export function electoralBucket(lean) {
    if (lean <= -LEAN_CUT)
        return "lean-democrat";
    if (lean >= LEAN_CUT)
        return "lean-republican";
    return "tossup";
}
function isStance(value) {
    return STANCES.includes(value);
}
function stanceFill(bucket) {
    if (isStance(bucket))
        return `map-board-${bucket}`;
    if (bucket === "unread")
        return "map-board-modeled";
    return undefined;
}
function regimeClass(government) {
    const text = government.toLowerCase();
    if (text.includes("theocrat"))
        return "theocracy";
    if (text.includes("military"))
        return "military";
    if (text.includes("communist") || text.includes("dictatorship") || text.includes("single-party") || text.includes("party-led"))
        return "party";
    if (text.includes("monarch"))
        return "monarchy";
    if (text.includes("republic") || text.includes("democracy"))
        return "republic";
    return "other";
}
function partyFill(bucket) {
    if (typeof bucket !== "string")
        return "empty";
    return PARTY_FILLS[bucket] ?? "empty";
}
function conflictFill(bucket) {
    const intensity = typeof bucket === "number" ? bucket : 0;
    if (intensity <= 0)
        return "map-board-land";
    return intensity < CONFLICT_HOT ? "map-board-caution" : "map-board-adverse";
}
function tradeFill(bucket) {
    if (typeof bucket !== "number")
        return "empty";
    if (bucket <= 0)
        return "map-board-land";
    if (bucket < TRADE_MID)
        return "map-board-neutral";
    if (bucket < TRADE_HIGH)
        return "map-board-caution";
    return "map-board-favorable";
}
/**
 * The fill for one region. Trust with no bucket stays on the modeled land so
 * the default board is never blank. House delegation and Governor party are
 * both empty unless the bucket is a real party id: a state's delegation
 * apportions at founding, so most states paint immediately, and a state the
 * engine has not apportioned (or a governor bench not yet seated) stays empty
 * rather than guessing.
 */
function countFill(bucket) {
    return typeof bucket === "number" && bucket > 0 ? "map-board-modeled" : "empty";
}
export function mapRegionFill(mode, bucket) {
    if (mode === "house" && typeof bucket === "string" && DELEGATION_FILLS[bucket])
        return DELEGATION_FILLS[bucket];
    if (mode === "house" || mode === "governors" || mode === "senate")
        return partyFill(bucket);
    if (mode === "trust")
        return (typeof bucket === "string" ? stanceFill(bucket) : undefined) ?? "map-board-modeled";
    if (mode === "reading")
        return typeof bucket === "string" ? (stanceFill(bucket) ?? "empty") : "empty";
    if (mode === "blocs")
        return typeof bucket === "string" ? (BLOC_FILLS[bucket] ?? "empty") : "empty";
    if (mode === "regime")
        return typeof bucket === "string" && bucket !== "" ? REGIME_FILLS[regimeClass(bucket)] : "empty";
    if (mode === "conflict")
        return conflictFill(bucket);
    if (mode === "electoral")
        return typeof bucket === "string" ? (ELECTORAL_FILLS[bucket] ?? "empty") : "empty";
    if (mode === "hazards")
        return typeof bucket === "string" ? (HAZARD_FILLS[bucket] ?? "empty") : "empty";
    if (mode === "deployments" || mode === "sanctions")
        return countFill(bucket);
    return tradeFill(bucket);
}
function stanceWord(mode, bucket) {
    if (bucket === "unread")
        return "Unread";
    if (!isStance(bucket))
        return mode === "trust" ? "Not known" : "Not known.";
    return mode === "trust" ? trustWord(bucket) : READING_WORDS[bucket];
}
function conflictWord(bucket) {
    const intensity = typeof bucket === "number" ? bucket : 0;
    if (intensity <= 0)
        return "At peace";
    return intensity < CONFLICT_HOT ? "At war" : "Heavy fighting";
}
function tradeWord(bucket) {
    if (typeof bucket !== "number")
        return "No trade figures.";
    if (bucket <= 0)
        return "No goods trade";
    if (bucket < 0.005)
        return "Under 1% of US goods trade";
    return `${Math.round(bucket * 100)}% of US goods trade`;
}
/** The words that travel with a fill, so the color is never the only signal. */
export function mapBucketWord(mode, bucket) {
    if (mode === "house" || mode === "governors" || mode === "senate") {
        if (typeof bucket === "string" && PARTY_WORDS[bucket])
            return PARTY_WORDS[bucket];
        if (mode === "house" && typeof bucket === "string" && DELEGATION_WORDS[bucket])
            return DELEGATION_WORDS[bucket];
        return mode === "senate" ? "No Senate seat up this election" : MAP_UNSEATED;
    }
    if (mode === "trust" || mode === "reading")
        return typeof bucket === "string" ? stanceWord(mode, bucket) : stanceWord(mode, "");
    if (mode === "blocs")
        return typeof bucket === "string" ? (BLOC_WORDS[bucket] ?? "Not known.") : "Not known.";
    if (mode === "regime")
        return typeof bucket === "string" && bucket !== "" ? bucket : "Not known.";
    if (mode === "conflict")
        return conflictWord(bucket);
    if (mode === "electoral")
        return typeof bucket === "string" ? (ELECTORAL_WORDS[bucket] ?? "Not known.") : "Not known.";
    if (mode === "hazards")
        return typeof bucket === "string" ? (HAZARD_WORDS[bucket] ?? "Nothing declared") : "Nothing declared";
    if (mode === "deployments")
        return typeof bucket === "number" && bucket > 0 ? `${bucket} US base${bucket === 1 ? "" : "s"}` : "No US bases";
    if (mode === "sanctions")
        return typeof bucket === "number" && bucket > 0 ? `${bucket} sanctions program${bucket === 1 ? "" : "s"} in effect` : "No US sanctions";
    return tradeWord(bucket);
}
function legend(word, fill) {
    return { word, fill };
}
/** Legend swatches whose words name the fill. Trust keeps the board's own legend. */
export function mapLegend(mode) {
    if (mode === "reading")
        return STANCES.map((stance) => legend(READING_WORDS[stance], `map-board-${stance}`));
    if (mode === "blocs")
        return Object.keys(BLOC_WORDS).map((key) => legend(BLOC_WORDS[key] ?? key, BLOC_FILLS[key] ?? "map-board-land"));
    if (mode === "regime")
        return REGIME_ORDER.map((key) => legend(REGIME_WORDS[key], REGIME_FILLS[key]));
    if (mode === "conflict") {
        return [legend("At peace", "map-board-land"), legend("At war", "map-board-caution"), legend("Heavy fighting", "map-board-adverse")];
    }
    if (mode === "trade") {
        return [
            legend("No goods trade", "map-board-land"),
            legend("A small share", "map-board-neutral"),
            legend("A medium share", "map-board-caution"),
            legend("Among the largest", "map-board-favorable"),
        ];
    }
    const parties = Object.keys(PARTY_WORDS).map((key) => legend(PARTY_WORDS[key] ?? key, PARTY_FILLS[key] ?? "map-board-land"));
    if (mode === "house")
        return [...parties, ...Object.keys(DELEGATION_WORDS).map((key) => legend(DELEGATION_WORDS[key] ?? key, DELEGATION_FILLS[key] ?? "map-board-land"))];
    if (mode === "governors" || mode === "senate")
        return parties;
    if (mode === "electoral")
        return Object.keys(ELECTORAL_WORDS).map((key) => legend(ELECTORAL_WORDS[key] ?? key, ELECTORAL_FILLS[key] ?? "map-board-land"));
    if (mode === "hazards")
        return Object.keys(HAZARD_WORDS).map((key) => legend(HAZARD_WORDS[key] ?? key, HAZARD_FILLS[key] ?? "map-board-land"));
    if (mode === "deployments")
        return [legend("A US base is there", "map-board-modeled")];
    if (mode === "sanctions")
        return [legend("The US has sanctions on this country", "map-board-modeled")];
    return [];
}
