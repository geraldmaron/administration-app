/** Country archetypes — structural classifications computed from country facts.
 *
 * Archetypes are OR-matched: a scenario with archetypes=['island','petro_exporter']
 * applies to any country that is an island OR a petro exporter.
 *
 * Computed by scripts/seed-country-archetypes.ts from CountryDocument facts.
 * Stored on countries/{id}.archetypes.
 *
 * Companion: computeCountryRequiresFlags() derives RequiresFlag values from
 * the computed archetypes. Stored on countries/{id}.flags.
 */
export type CountryArchetype =
    // Economic structure
    | 'petro_exporter'              // >30% of exports are hydrocarbons
    | 'natural_resource_exporter'   // >30% of exports are extractive resources (non-petro)
    | 'manufacturing_economy'       // manufacturing is primary GDP driver
    | 'service_economy'             // services >60% of GDP
    | 'developing_economy'          // GDP per capita < $5,000 USD
    | 'emerging_market'             // GDP per capita $5,000–$20,000 USD
    | 'developed_economy'           // GDP per capita > $20,000 USD
    // Geography
    | 'island'                      // surrounded by water (island or archipelago state)
    | 'landlocked'                  // no sea access
    | 'coastal'                     // significant coastline (non-island)
    // Power tier
    | 'major_power'                 // P5 or equivalent global force-projection capability
    | 'regional_power'              // significant influence within its region
    | 'small_state'                 // limited population, GDP, or military reach
    | 'micro_state'                 // population < 1 million
    | 'city_state'                  // territory is essentially a single metropolitan area
    // Government form
    | 'constitutional_monarchy'     // monarch with constitutional constraints
    | 'absolute_monarchy'           // monarch with unrestricted power
    | 'parliamentary_republic'      // parliament is primary power; PM leads government
    | 'presidential_republic'       // directly elected president is primary executive
    | 'semi_presidential_republic'  // both president and PM share executive power
    | 'federation'                  // significant powers devolved to sub-national units
    | 'unitary_state'               // centralised governance
    | 'one_party_state'             // single party dominates all branches, no real electoral competition
    // Regime character
    | 'liberal_democracy'           // free elections, rule of law, civil liberties
    | 'illiberal_democracy'         // elections held but institutions are constrained
    | 'hybrid_regime'               // mix of democratic and authoritarian elements
    | 'authoritarian'               // power concentrated; elections absent or symbolic
    | 'fragile_state'               // regimeStability < 35
    // Special
    | 'nuclear_power'               // confirmed nuclear weapons capability
    | 'neutral_state'               // formal non-alignment doctrine (e.g. Switzerland, Austria)
    | 'occupied_territory'          // foreign power exerts effective control over parts of territory
    | 'theocracy';                  // religious law is primary basis of governance

/** Compute archetypes for a country from its document fields.
 *
 * This function is the single source of truth for archetype derivation.
 * Import and call it from scripts/seed-country-archetypes.ts.
 */
export function computeCountryArchetypes(country: {
    facts: {
        economy: {
            gdp_nominal_usd: number;
            gdp_per_capita?: number;
            primary_export?: string;
        };
        demographics: { population_total: number };
    };
    geopolitical: {
        governmentCategory: string;
        regimeStability: number;
        tags?: string[];
    };
    military: {
        nuclear: { warhead_count: number } | null;
        doctrine: string;
    };
    geography?: { capital_city?: string };
    /** Overrides: author-curated tags to force-include specific archetypes. */
    archetype_overrides?: CountryArchetype[];
}): CountryArchetype[] {
    const archetypes = new Set<CountryArchetype>();
    const tags: string[] = country.geopolitical.tags ?? [];
    const overrides = country.archetype_overrides ?? [];

    // Apply author overrides first
    for (const a of overrides) archetypes.add(a);

    const gdpPc = country.facts.economy.gdp_per_capita ?? 0;
    const pop = country.facts.demographics.population_total;
    const primaryExport = (country.facts.economy.primary_export ?? '').toLowerCase();
    const govCat = country.geopolitical.governmentCategory;
    const stability = country.geopolitical.regimeStability;

    // Economic structure
    if (/oil|gas|petroleum|hydrocarbon|lng/.test(primaryExport)) archetypes.add('petro_exporter');
    else if (/mining|mineral|coal|copper|iron|gold|diamond|bauxite|phosphate/.test(primaryExport)) archetypes.add('natural_resource_exporter');
    if (/manufactur|industrial|auto|electronic|textil|machinery/.test(primaryExport)) archetypes.add('manufacturing_economy');

    if (gdpPc > 0 && gdpPc < 5_000) archetypes.add('developing_economy');
    else if (gdpPc >= 5_000 && gdpPc < 20_000) archetypes.add('emerging_market');
    else if (gdpPc >= 20_000) archetypes.add('developed_economy');

    // Geography
    if (tags.includes('island_nation') || tags.includes('island') || tags.includes('archipelago')) archetypes.add('island');
    if (tags.includes('landlocked')) archetypes.add('landlocked');
    if (!archetypes.has('island') && !archetypes.has('landlocked')) archetypes.add('coastal');

    // Power tier
    if (tags.includes('major_power') || tags.includes('superpower')) archetypes.add('major_power');
    else if (tags.includes('regional_power')) archetypes.add('regional_power');
    if (pop < 1_000_000) archetypes.add('micro_state');
    else if (pop < 10_000_000) archetypes.add('small_state');

    // Government form
    if (govCat === 'constitutional_monarchy') archetypes.add('constitutional_monarchy');
    if (govCat === 'absolute_monarchy') archetypes.add('absolute_monarchy');
    if (govCat === 'liberal_democracy' || govCat === 'illiberal_democracy') {
        if (tags.includes('federation')) archetypes.add('federation');
        archetypes.add('parliamentary_republic'); // default; overrides can correct
    }
    if (govCat === 'authoritarian' || govCat === 'totalitarian') archetypes.add('one_party_state');
    if (govCat === 'theocracy') archetypes.add('theocracy');
    if (tags.includes('federation')) archetypes.add('federation');
    if (tags.includes('presidential')) archetypes.add('presidential_republic');
    if (tags.includes('semi_presidential')) archetypes.add('semi_presidential_republic');

    // Regime character
    if (govCat === 'liberal_democracy') archetypes.add('liberal_democracy');
    else if (govCat === 'illiberal_democracy') archetypes.add('illiberal_democracy');
    else if (govCat === 'hybrid_regime') archetypes.add('hybrid_regime');
    else if (govCat === 'authoritarian' || govCat === 'totalitarian') archetypes.add('authoritarian');
    if (stability < 35) archetypes.add('fragile_state');

    // Special
    if (country.military.nuclear && country.military.nuclear.warhead_count > 0) archetypes.add('nuclear_power');
    if (tags.includes('neutral_state')) archetypes.add('neutral_state');
    if (tags.includes('occupied_territory')) archetypes.add('occupied_territory');

    return [...archetypes];
}

/**
 * Derives RequiresFlag values from a country's computed archetypes and raw data.
 *
 * This is the single source of truth for `country.flags`. Call it immediately
 * after computeCountryArchetypes() and write the result to countries/{id}.flags.
 *
 * Maps:
 *   constitutional_monarchy | absolute_monarchy → has_monarch
 *   constitutional_monarchy | parliamentary_republic | presidential_republic |
 *     semi_presidential_republic | liberal_democracy | illiberal_democracy → has_legislature
 *   liberal_democracy | illiberal_democracy | hybrid_regime → has_opposition_party, has_party_system
 *   liberal_democracy | illiberal_democracy | hybrid_regime | parliamentary_republic |
 *     presidential_republic | semi_presidential_republic → has_supreme_court, has_written_constitution
 *   liberal_democracy | illiberal_democracy → has_central_bank, has_stock_exchange
 *   developed_economy | emerging_market → has_central_bank, has_stock_exchange
 *   nuclear_power → nuclear_state
 *   major_power | regional_power → power_projection
 *   major_power → large_military
 *   island → island_nation, coastal
 *   coastal (archetype) → coastal
 *   landlocked (archetype) → landlocked
 *   fragile_state (archetype) → fragile_state
 *   petro_exporter | natural_resource_exporter → resource_rich
 *   major_power | regional_power (with tag cyber_capable) → cyber_capable
 *   liberal_democracy | illiberal_democracy → democratic_regime
 *   authoritarian | one_party_state → authoritarian_regime
 */
export function computeCountryRequiresFlags(
    archetypes: CountryArchetype[],
    country?: {
        geopolitical?: {
            tags?: string[] | Array<{ id?: string; tag?: string } | string>;
            allies?: Array<{ type: string; sharedBorder?: boolean }>;
            adversaries?: Array<{ type: string; sharedBorder?: boolean }>;
            neighbors?: Array<{ type: string; sharedBorder?: boolean }>;
        };
        military?: { doctrine?: string };
    }
): Partial<Record<RequiresFlagForDerivation, true>> {
    const flags: Partial<Record<RequiresFlagForDerivation, true>> = {};
    const set = new Set(archetypes);
    // tags may be a string[] or a GeopoliticalTag[] with an `id` or `tag` field
    const rawTags = country?.geopolitical?.tags ?? [];
    const tags: string[] = rawTags.map((t) => (typeof t === 'string' ? t : (t.id ?? t.tag ?? '')));

    const allies = country?.geopolitical?.allies ?? [];
    const adversaries = country?.geopolitical?.adversaries ?? [];
    const neighbors = country?.geopolitical?.neighbors ?? [];

    // ── Monarchy ──────────────────────────────────────────────────────────────
    if (set.has('constitutional_monarchy') || set.has('absolute_monarchy')) {
        flags.has_monarch = true;
    }

    // ── Legislature ───────────────────────────────────────────────────────────
    if (
        set.has('constitutional_monarchy') ||
        set.has('parliamentary_republic') ||
        set.has('presidential_republic') ||
        set.has('semi_presidential_republic') ||
        set.has('liberal_democracy') ||
        set.has('illiberal_democracy')
    ) {
        flags.has_legislature = true;
    }

    // ── Party system & opposition ─────────────────────────────────────────────
    if (set.has('liberal_democracy') || set.has('illiberal_democracy') || set.has('hybrid_regime')) {
        flags.has_party_system = true;
        flags.has_opposition_party = true;
    }

    // ── Judicial & constitutional institutions ────────────────────────────────
    if (
        set.has('liberal_democracy') ||
        set.has('illiberal_democracy') ||
        set.has('hybrid_regime') ||
        set.has('constitutional_monarchy') ||
        set.has('parliamentary_republic') ||
        set.has('presidential_republic') ||
        set.has('semi_presidential_republic')
    ) {
        flags.has_supreme_court = true;
        flags.has_written_constitution = true;
    }

    // ── Economic institutions ─────────────────────────────────────────────────
    if (
        set.has('developed_economy') ||
        set.has('emerging_market') ||
        set.has('liberal_democracy') ||
        set.has('illiberal_democracy')
    ) {
        flags.has_central_bank = true;
    }
    if (set.has('developed_economy') || set.has('emerging_market')) {
        flags.has_stock_exchange = true;
    }

    // ── Military capability ───────────────────────────────────────────────────
    if (set.has('nuclear_power')) flags.nuclear_state = true;
    if (set.has('major_power')) {
        flags.large_military = true;
        flags.power_projection = true;
    } else if (set.has('regional_power')) {
        flags.power_projection = true;
    }
    if (tags.includes('cyber_capable') || set.has('major_power')) {
        flags.cyber_capable = true;
    }

    // ── Geography ─────────────────────────────────────────────────────────────
    if (set.has('island')) {
        flags.island_nation = true;
        flags.coastal = true;
    } else if (set.has('coastal')) {
        flags.coastal = true;
    }
    if (set.has('landlocked')) flags.landlocked = true;

    // ── Regime character ──────────────────────────────────────────────────────
    if (set.has('liberal_democracy') || set.has('illiberal_democracy')) {
        flags.democratic_regime = true;
    }
    if (set.has('authoritarian') || set.has('one_party_state')) {
        flags.authoritarian_regime = true;
    }

    // ── State character ───────────────────────────────────────────────────────
    if (set.has('fragile_state')) flags.fragile_state = true;
    if (set.has('petro_exporter') || set.has('natural_resource_exporter')) flags.resource_rich = true;

    // ── Geopolitical relationships (dynamic — derived from country.geopolitical) ──
    // formal_ally: country has at least one treaty-bound formal ally
    if (allies.some((r) => r.type === 'formal_ally')) {
        flags.formal_ally = true;
    }
    // adversary: country has any adversarial relationship on record
    if (adversaries.length > 0 || allies.some((r) => r.type === 'adversary' || r.type === 'conflict')) {
        flags.adversary = true;
    }
    // land_border_adversary: hostile or rival relationship + shared border
    if (
        adversaries.some((r) => r.sharedBorder) ||
        neighbors.some((r) => (r.type === 'rival' || r.type === 'adversary' || r.type === 'conflict') && r.sharedBorder)
    ) {
        flags.land_border_adversary = true;
    }
    // trade_partner: strategic partner relationship (diplomatic trade ties)
    if (
        allies.some((r) => r.type === 'strategic_partner') ||
        neighbors.some((r) => r.type === 'trade_partner' || r.type === 'strategic_partner')
    ) {
        flags.trade_partner = true;
    }

    return flags;
}

/** Subset of RequiresFlag values that can be derived from archetype data.
 *  Geopolitical relationship flags (formal_ally, adversary, land_border_adversary,
 *  trade_partner) are excluded — they are derived from geopolitical_relationships
 *  on the country document, not from archetypes.
 */
type RequiresFlagForDerivation =
    | 'has_legislature'
    | 'has_opposition_party'
    | 'has_party_system'
    | 'has_central_bank'
    | 'has_stock_exchange'
    | 'has_supreme_court'
    | 'has_written_constitution'
    | 'has_monarch'
    | 'nuclear_state'
    | 'island_nation'
    | 'landlocked'
    | 'coastal'
    | 'cyber_capable'
    | 'power_projection'
    | 'large_military'
    | 'authoritarian_regime'
    | 'democratic_regime'
    | 'fragile_state'
    | 'resource_rich'
    | 'formal_ally'
    | 'adversary'
    | 'land_border_adversary'
    | 'trade_partner';
