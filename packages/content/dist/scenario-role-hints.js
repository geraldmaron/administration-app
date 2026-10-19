// The same hint vocabulary answers two questions: who speaks a beat (a
// ScenarioSpeaker) and who a cabinetAttribute condition reads — one map,
// so a role hint always resolves to the same charter role either way.
// Every list is tried in order and the first substring that matches a seated
// role id wins, so the exact id goes first and the cross-charter synonyms
// follow it. That ordering is load-bearing now that the cabinet is sixteen:
// `interior`'s old fallback list ended in "security", which with a Homeland
// Security chair seated would otherwise resolve the interior hint onto the
// wrong department the moment a charter seated no interior minister.
const ROLE_HINTS = {
    foreign: ["foreign", "state", "external"],
    interior: ["interior", "home-affairs", "domestic"],
    defense: ["defense", "war", "military"],
    finance: ["treasury", "finance", "economy"],
    justice: ["attorney", "justice", "law"],
    agriculture: ["agriculture", "farm", "rural"],
    commerce: ["commerce", "industry", "trade"],
    labor: ["labor", "employment", "work"],
    health: ["health", "welfare", "social"],
    housing: ["housing", "urban", "shelter"],
    transportation: ["transportation", "transport", "infrastructure"],
    energy: ["energy", "power", "nuclear"],
    education: ["education", "schools", "learning"],
    veterans: ["veterans", "veteran"],
    homeland: ["homeland", "border", "immigration", "civil-protection"],
    intelligence: ["intelligence", "security-service"],
    lead: ["chancellor", "premier", "prime", "president", "first"],
};
/**
 * The substrings a hint is resolved by, exposed so the paired test can check
 * the vocabulary against the government rather than restating this table.
 */
export function roleHintTargets(hint) {
    return ROLE_HINTS[hint];
}
