import { color } from "./color.js";
import { materials } from "./materials.js";
import { semantic } from "./semantic.js";
/**
 * Lanes that must never share one hex across unrelated meanings.
 * Identity / chrome / ownership / classification are audited separately.
 */
export const EXCLUSIVE_LANES = ["interaction", "danger", "party"];
/**
 * Role pairs that may share one hex because they are the same interaction
 * meaning at different states — not a conflation across lanes.
 */
export const VALID_SHARED_HEX_PAIRS = [
    ["interactive", "selected"],
];
/**
 * Roles whose contract must declare at least one non-color cue (interactive
 * affordances and meaning-bearing states).
 */
export const CUE_REQUIRED_ROLES = new Set([
    "interactive",
    "selected",
    "focus",
    "favorable",
    "caution",
    "adverse",
    "destructive",
    "informational",
    "democratic",
    "republican",
    "independent",
    "institutional",
    "classified",
    "playerOwned",
    "disabled",
    "muted",
]);
export const SEMANTIC_ROLE_CONTRACT = [
    {
        id: "interactive",
        label: "interactive",
        lane: "interaction",
        status: "mapped",
        tokenPath: "semantic.interaction",
        hex: semantic.interaction,
        nonColorCues: ["label", "shape", "stroke"],
        note: "Active nav / selected chip hue. Never crimson.",
    },
    {
        id: "selected",
        label: "selected",
        lane: "interaction",
        status: "mapped",
        tokenPath: "semantic.interaction",
        hex: semantic.interaction,
        nonColorCues: ["label", "shape", "stroke"],
        note: "Shares interactive by design (valid pair). Selected is state, not a second hue.",
    },
    {
        id: "focus",
        label: "focus",
        lane: "interaction",
        status: "mapped",
        tokenPath: "color.focus.ring",
        hex: color.focus.ring,
        nonColorCues: ["stroke"],
        note: "Interaction-lane azure stroke. Accent presets no longer recolor focus.",
    },
    {
        id: "favorable",
        label: "favorable",
        lane: "stance",
        status: "mapped",
        tokenPath: "semantic.positive",
        hex: semantic.positive,
        nonColorCues: ["label", "icon"],
    },
    {
        id: "caution",
        label: "caution",
        lane: "stance",
        status: "mapped",
        tokenPath: "semantic.caution",
        hex: semantic.caution,
        nonColorCues: ["label", "icon"],
    },
    {
        id: "adverse",
        label: "adverse",
        lane: "danger",
        status: "mapped",
        tokenPath: "semantic.adverse",
        hex: semantic.adverse,
        nonColorCues: ["label", "icon"],
        note: "Bad reading / removal pressure. Lane danger so it cannot share a hex with interaction or party.",
    },
    {
        id: "destructive",
        label: "destructive",
        lane: "danger",
        status: "mapped",
        tokenPath: "semantic.destructive",
        hex: semantic.destructive,
        nonColorCues: ["label", "icon", "shape"],
    },
    {
        id: "informational",
        label: "informational",
        lane: "stance",
        status: "mapped",
        tokenPath: "semantic.information",
        hex: semantic.information,
        nonColorCues: ["label"],
    },
    {
        id: "democratic",
        label: "Democratic",
        lane: "party",
        status: "mapped",
        tokenPath: "color.party.democrat",
        hex: color.party.democrat,
        nonColorCues: ["label"],
        note: "Deeper than semantic.interaction on purpose — whip counts must not read as selection.",
    },
    {
        id: "republican",
        label: "Republican",
        lane: "party",
        status: "mapped",
        tokenPath: "color.party.republican",
        hex: color.party.republican,
        nonColorCues: ["label"],
    },
    {
        id: "independent",
        label: "independent/other",
        lane: "party",
        status: "mapped",
        tokenPath: "color.party.independent",
        hex: color.party.independent,
        nonColorCues: ["label"],
    },
    {
        id: "institutional",
        label: "institutional",
        lane: "identity",
        status: "mapped",
        tokenPath: "color.mark.gold",
        hex: color.mark.gold,
        nonColorCues: ["label", "shape"],
        note: "Brass identity marker. Committing crimson remains semantic.identity (not an AC role here).",
    },
    {
        id: "classified",
        label: "classified",
        lane: "classification",
        status: "mapped",
        tokenPath: "materials.classification.topSecret",
        hex: materials.classification.topSecret,
        nonColorCues: ["label"],
        note: "TOP SECRET handling fill. Distinct from semantic.identity crimson; " +
            "level word + helper label are the non-color cues (ClassificationBanner).",
    },
    {
        id: "playerOwned",
        label: "player-owned",
        lane: "ownership",
        status: "mapped",
        tokenPath: "color.mark.owned",
        hex: color.mark.owned,
        nonColorCues: ["label", "shape"],
        note: "Map territory / claim stroke. Distinct from institutional mark.gold. " +
            "WorldMap paints isPlayer fills and claim rings from this token.",
    },
    {
        id: "disabled",
        label: "disabled",
        lane: "chrome",
        status: "mapped",
        tokenPath: "semantic.disabled",
        hex: semantic.disabled,
        nonColorCues: ["label", "shape"],
    },
    {
        id: "muted",
        label: "muted",
        lane: "chrome",
        status: "mapped",
        tokenPath: "color.text.tertiary",
        hex: color.text.tertiary,
        nonColorCues: ["label"],
        note: "Muted reading / pending-adjacent chrome. Not a stance.",
    },
];
export const SEMANTIC_ROLE_IDS = SEMANTIC_ROLE_CONTRACT.map((r) => r.id);
export function roleById(id) {
    const found = SEMANTIC_ROLE_CONTRACT.find((r) => r.id === id);
    if (!found) {
        throw new Error(`Unknown semantic role: ${id}`);
    }
    return found;
}
/** Live hex for a mapped role — consumers paint from the contract, not ad-hoc ramps. */
export function rolePaint(id) {
    const role = roleById(id);
    if (role.hex === null) {
        throw new Error(`Semantic role ${id} has no live paint`);
    }
    return role.hex;
}
/**
 * Stance reading ink via the contract. Neutral is not an AC role — it stays on
 * `color.stance.neutral` so a fact chip does not borrow muted/disabled chrome.
 */
export function stanceRoleInk(stance) {
    if (stance === "favorable")
        return rolePaint("favorable");
    if (stance === "caution")
        return rolePaint("caution");
    if (stance === "adverse")
        return rolePaint("adverse");
    return color.stance.neutral;
}
export function isValidSharedHexPair(a, b) {
    return VALID_SHARED_HEX_PAIRS.some(([left, right]) => (left === a && right === b) || (left === b && right === a));
}
