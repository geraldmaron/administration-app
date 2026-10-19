import { nationTraitProfiles } from "./traits.js";
// What kind of aim an agenda is. Agendas are authored as prose with an id, one
// per nation-shaped ambition; the NPC decision layer needs to know which
// instrument an aim reaches for without carrying 120-odd content ids inside the
// engine. Classification lives here, next to the agendas themselves, so adding
// an agenda and giving it a theme is one edit in one package.
export const AGENDA_THEMES = ["security", "economic", "prestige", "autonomy", "internal"];
// Ids whose wording does not give the aim away, or where the obvious keyword
// points at the wrong theme. Checked before the keyword rules.
const THEME_OVERRIDES = {
    "alliance-normalization": "prestige",
    "alliance-participation": "prestige",
    "bloc-leverage": "prestige",
    "chip-industry-leverage": "economic",
    "chokepoint-hub": "economic",
    "deny-peer-basing": "security",
    "downstream-industrialization": "economic",
    "eastern-pacification": "security",
    "energy-dependence-hedge": "economic",
    "factional-balance": "internal",
    "federal-cohesion": "internal",
    "genocide-prevention-legacy": "internal",
    "global-role-post-empire": "prestige",
    "great-power-competition": "security",
    "keep-lanes-open": "economic",
    "legal-shelter": "autonomy",
    "maritime-fulcrum": "economic",
    "mediterranean-migration": "internal",
    "multi-vector-diplomacy": "autonomy",
    "neighborhood-order": "prestige",
    "patron-alignment": "autonomy",
    "patron-management": "autonomy",
    "price-defense": "economic",
    "regional-network": "prestige",
    "regulatory-arbitrage": "economic",
    "rules-based-hedging": "autonomy",
    "seat-at-the-table": "prestige",
    "settlement-survival": "internal",
    "shape-the-order": "prestige",
    "single-sector-defense": "economic",
    "sovereignty-optics": "autonomy",
    "sphere-of-influence": "security",
    "status-quo-preservation": "autonomy",
    "survival-by-usefulness": "autonomy",
    "technology-lead": "economic",
};
// Ordered: the first pattern that matches wins, so narrower phrases come before
// the broad single words they contain.
const THEME_KEYWORDS = [
    ["security", /deterren|arsenal|rearmament|territorial|border|defense|defense|primacy|monopoly-of-force|security|claims|reunification|consolidation/],
    ["autonomy", /neutral|nonalignment|hedg|autonomy|sanctions|embargo|survival|sovereign|resist-external|donor-dependence|shelter/],
    ["economic", /trade|export|growth|revenue|debt|manufactur|industry|hub|finance|financial|commodity|resource|mineral|hydro|renewable|energy|subsidy|nearshoring|diversification|canal|fisheries|garment|services|supply-chain|tech-export|niche-influence|regulatory/],
    ["prestige", /alliance|coalition|bloc|leadership|status|recognition|mediation|broker|partnership|diplomacy|cooperation|role|integration|balancing|order|relief|humanitarian|stabilizer|conflict-resolution|leverage|seat|influence/],
    ["internal", /institution|reconcil|cohesion|welfare|inequality|demographic|climate|resilience|reconstruction|pacification|regime|settlement|factional|migration|legacy|management|adaptation|stabilization/],
];
// Undefined means "this aim has no classified theme": callers treat it as
// neutral rather than guessing. The paired test keeps that case out of the
// shipped dataset.
export function agendaTheme(agendaId) {
    const override = THEME_OVERRIDES[agendaId];
    if (override)
        return override;
    for (const [theme, pattern] of THEME_KEYWORDS) {
        if (pattern.test(agendaId))
            return theme;
    }
    return undefined;
}
// Every agenda any nation can roll this campaign, deduped — the surface the
// exhaustiveness test walks.
export function allCandidateAgendaIds() {
    const ids = new Set();
    for (const profile of nationTraitProfiles) {
        for (const agenda of profile.candidateAgendas)
            ids.add(agenda.id);
    }
    return [...ids].sort();
}
