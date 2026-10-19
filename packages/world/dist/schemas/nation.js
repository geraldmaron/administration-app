import { z } from "zod";
import { NationId, CharterId, RegionId, ChokepointId, OrgId, CurrencyCode } from "./ids.js";
import { EnergyMix, SectorId, SectorMixEntry } from "./sector.js";
import { Party } from "./org-cradle-charter.js";
import { ForceAssetIdSchema } from "./force-asset.js";
import { ChokepointDependence } from "./geography.js";
// Every field here must have a named consumer; a dataset test
// (validate/dataset-validator.ts) asserts this against a consumer registry.
// The three added last are the ones a United States campaign actually lives
// through and the first six could not name: a tornado, a winter storm and a heat
// wave are the hazards the federal government declares against most often, and
// each of them is a distinct week for a President — a county, a third of the
// country, a whole season. No nation carries exposure to them yet, so they are
// declarable and unreachable until the sourced rows land.
export const DisasterKind = z.enum([
    "earthquake",
    "flood",
    "drought",
    "cyclone",
    "wildfire",
    "pandemic",
    "tornado",
    "winter-storm",
    "heat-wave",
]);
// The services a nation raises and the catalog of what each can count are
// declared in schemas/force-asset.ts; the branch list is re-exported here so
// every consumer that iterates services keeps one import.
export { MILITARY_BRANCHES } from "./force-asset.js";
/**
 * A named thing a branch can put somewhere — carrier strike groups, airborne
 * divisions, fighter squadrons, ballistic-missile submarines.
 *
 * Separate from `units` because the two answer different questions. A player
 * asking what the Navy *is* wants eleven carrier strike groups; a player asking
 * what the Navy can *send this week* wants the hull count and how ready it is.
 *
 * `name` is a catalog id, not prose: what the thing is, which service owns it
 * and what one of it costs in people all come from the catalog, so a rule can
 * add two benches together and a screen never prints an id. `label` is the
 * optional local name where a service calls the same thing something else —
 * naval infantry rather than marines — and is presentation only.
 */
export const BranchCapability = z.object({
    name: ForceAssetIdSchema,
    count: z.number().nonnegative().int(),
    label: z.string().min(1).optional(),
});
/**
 * One countable holding a deployment can draw on: `type` is a catalog id,
 * `count` is how many are on the books, and `readiness` (0..1, an index) is
 * the share of them that could move this month.
 */
export const ForceUnit = z.object({
    type: ForceAssetIdSchema,
    count: z.number().nonnegative().int(),
    readiness: z.number().min(0).max(1),
    label: z.string().min(1).optional(),
});
/**
 * One service's share of the order of battle.
 *
 * `headcount` is required and `capabilities`/`units` are not, which is the
 * tiering expressed in the schema rather than in a comment:
 * every nation that ships an order of battle at all states how its people are
 * split between services, and only the nations whose formations the game
 * actually moves — the played one first — pay the authoring cost of naming
 * them. The dataset validator is what requires the full depth of the playable
 * nation, because "playable" is a fact about the dataset, not about the shape.
 */
export const BranchOrderOfBattle = z.object({
    headcount: z.number().nonnegative(),
    capabilities: z.array(BranchCapability).max(16).optional(),
    units: z.array(ForceUnit).max(24).optional(),
});
export const OrderOfBattle = z.object({
    army: BranchOrderOfBattle,
    navy: BranchOrderOfBattle,
    air: BranchOrderOfBattle,
    marines: BranchOrderOfBattle,
    space: BranchOrderOfBattle,
    cyber: BranchOrderOfBattle,
});
export const NationStats = z.object({
    demography: z.object({
        population: z.number().positive(),
        urbanization: z.number().min(0).max(1),
        medianAge: z.number().min(10).max(60),
        // The net of the three vital rates below, written at assembly by
        // `applyVitalRates`. Authored on the record so a dataset assembled by hand
        // still parses, and held to the identity by the validator: two numbers
        // that can disagree are the defect every derived field here exists to
        // avoid.
        growthRate: z.number().min(-0.05).max(0.1),
        literacy: z.number().min(0).max(1),
        // Births, deaths and net arrivals per person per year — fractions, for
        // consistency with every other rate in this schema. Player surfaces render
        // them per 1,000, which is how a reader expects to see a vital rate.
        //
        // The upper bound on births is wider than the rate law's own baseline
        // clamp because the roster contains countries the clamp's range cannot
        // hold: the DR Congo, Afghanistan and Nigeria all carry a crude birth rate
        // above 30 per 1,000, and a bound that refuses the real figure would only
        // force the difference into net migration with the wrong sign.
        birthRate: z.number().min(0.004).max(0.045),
        deathRate: z.number().min(0.003).max(0.025),
        // Symmetric and wide because the roster carries three countries whose
        // headcount is being emptied by a war (Yemen, Ukraine, Syria); an outflow
        // bound is no different in kind from an inflow one.
        netMigration: z.number().min(-0.05).max(0.05),
    }),
    economy: z.object({
        gdp: z.number().nonnegative(), // USD millions, the canonical unit throughout
        gdpPerCapita: z.number().nonnegative(), // USD, not millions — derived, checked for consistency
        growth: z.number().min(-0.3).max(0.3),
        inflation: z.number().min(-0.1).max(2),
        unemployment: z.number().min(0).max(1),
        // The price level, indexed to the dataset snapshot: 1.000 for every nation
        // by definition, because the snapshot is what the index is measured
        // against. An index and not a rate — inflation is the rate that moves it.
        // Bounded wide enough for two terms at the highest inflation the engine
        // allows, so a save from a hyperinflating country still parses.
        costOfLiving: z.number().min(0.1).max(1e5),
        // The nominal debt stock in USD millions, not a ratio. A stored ratio is
        // two facts collapsed into one number that can disagree with both of them;
        // the ratio a rule wants is `debtToGdp(stats)` in dataset/fiscal-identities.
        debt: z.number().nonnegative(),
        reserves: z.number().nonnegative(), // USD millions
        sovereignRating: z.enum(["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"]),
    }),
    trade: z.object({
        exports: z.number().nonnegative(),
        imports: z.number().nonnegative(),
        balance: z.number(),
        topExports: z.array(SectorId).max(10),
        // Not truncated to a display-sized list: a great power's real trade is
        // spread thin across dozens of partners at a small share each, and this
        // array is what the economic instrument ladder's tradeAccess gate reads,
        // so a nation missing from it is one rungs 2-5 can never be aimed at.
        // The played nation keeps every partner whose lane clears the
        // derivation's share floor (trade.ts's partnerCap), so the bound is the
        // roster: nobody trades with more governments than exist.
        topPartners: z.array(NationId).max(200),
        tradeDependence: z.record(NationId, z.number().min(0).max(1)),
    }),
    energy: z.object({
        production: z.number().nonnegative(),
        consumption: z.number().nonnegative(),
        importDependence: z.number().min(0).max(1),
        // Keys are energy-* SectorIds only. Coal burned as thermal fuel is
        // `energy-oil` (fossil thermal); there is no energy-coal. Coal as a
        // mined commodity belongs on `trade.topExports` as `mining`.
        mix: EnergyMix,
    }),
    military: z.object({
        budget: z.number().nonnegative(),
        activeHeadcount: z.number().nonnegative(),
        reserveHeadcount: z.number().nonnegative(),
        readiness: z.number().min(0).max(1),
        doctrineQuality: z.number().min(0).max(1),
        branchStrength: z.object({
            land: z.number().min(0).max(1),
            air: z.number().min(0).max(1),
            naval: z.number().min(0).max(1),
            cyber: z.number().min(0).max(1),
            space: z.number().min(0).max(1),
        }),
        airliftCapacity: z.number().min(0).max(1),
        sealiftCapacity: z.number().min(0).max(1),
        arsenal: z.object({
            warheads: z.number().nonnegative().int(),
            deliveryTriad: z.boolean(),
            // Whether the government admits to the arsenal at all. Absent reads as
            // declared; a state that has never declared one is credited with no
            // count on any surface, however well the count is estimated abroad.
            declared: z.boolean().optional(),
        }),
        basesAbroad: z.number().nonnegative().int(),
        // The aggregates above stay: bands, the validator, content targeting and
        // the engine all read them. This sits beneath them and is checked against
        // them, so a decomposition that contradicts its own total fails the
        // dataset rather than quietly disagreeing with every screen.
        orderOfBattle: OrderOfBattle.optional(),
    }),
    security: z.object({
        crimeIndex: z.number().min(0).max(1),
        corruptionIndex: z.number().min(0).max(1),
        insurgencyPressure: z.number().min(0).max(1),
        borderControl: z.number().min(0).max(1),
        intelCapability: z.number().min(0).max(1),
        counterIntel: z.number().min(0).max(1),
    }),
    politics: z.object({
        regimeStability: z.number().min(0).max(1),
        legitimacy: z.number().min(0).max(1),
        factionalism: z.number().min(0).max(1),
        pressFreedom: z.number().min(0).max(1),
        protestPressure: z.number().min(0).max(1),
    }),
    softPower: z.object({
        diplomaticReach: z.number().min(0).max(1),
        culturalReach: z.number().min(0).max(1),
        aidGiven: z.number().nonnegative(),
        aidReceived: z.number().nonnegative(),
    }),
});
// Traits say what a nation *will* do; rolled per campaign
// within an authored range.
export const Agenda = z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    weight: z.number().min(0).max(1),
});
export const NationTraits = z.object({
    aggression: z.number().min(0).max(1),
    opportunism: z.number().min(0).max(1),
    legalism: z.number().min(0).max(1),
    isolationism: z.number().min(0).max(1),
    riskTolerance: z.number().min(0).max(1),
    vengefulness: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    transparency: z.number().min(0).max(1),
    // May be empty on an authored record: a thin country authors no aims of its
    // own and rolls them from its archetype's pool at founding
    // (`candidateAgendasFor`). The validator holds a full record to two and a
    // standard record to one; the rolled set is never empty, because every
    // archetype's pool carries three.
    agendas: z.array(Agenda).max(3),
});
// Derived, never hand-authored. Content targets bands rather than nation
// ids, so adding a new nation needs no new content written for it.
export const NationArchetype = z.enum([
    "great-power",
    "regional-power",
    "middle-power",
    "resource-exporter",
    "trading-hub",
    "post-conflict",
    "isolationist",
    "client-state",
    "rising-power",
    "microstate",
]);
export const NationBands = z.object({
    archetype: NationArchetype,
    powerTier: z.number().int().min(1).max(5),
    wealthTier: z.number().int().min(1).max(5),
    alignmentBand: z.enum(["aligned", "leaning-aligned", "neutral", "leaning-opposed", "opposed"]),
    stabilityBand: z.enum(["stable", "fragile", "volatile", "collapsing"]),
    militaryTier: z.number().int().min(1).max(5),
    // No `relationshipBand` belongs here. How a nation stands toward the player
    // is a fact about a pair, and a pair's fact cannot live on one half of it —
    // the dataset is built before any player exists, so such a field could only
    // ever be seeded, never updated.
    //
    // Content reaches the fact where it belongs: the `relationship` condition
    // (trust, alignment, tension, tradeDependence, militaryThreat) and the
    // `closest` and `tensest` casts all read the directed edge.
    militaryMetrics: z
        .object({
        forceIndex: z.number().min(0).max(1),
        mobilizationCap: z.number().min(0).max(1),
        sustainability: z.object({
            warDuration: z.number().min(0).max(1),
            industrialMobilization: z.number().min(0).max(1),
        }),
        downtime: z.number().min(0).max(1),
    })
        .optional(),
});
export const Posture = z.enum(["defensive", "balanced", "assertive", "expansionist"]);
export const RedLine = z.object({
    id: z.string().min(1),
    description: z.string().min(1),
});
/**
 * How power is actually contested inside a country.
 *
 * Not every government runs parties, and pretending otherwise is the lie this
 * field exists to stop. `Charter.parties` could never carry this: twenty-one
 * nations in the dataset share `charter-presidential-republic`, so a slate on
 * the charter would give China and Brazil the same politics. Parties are a
 * fact about a country, not about the shape of its constitution.
 */
export const PoliticalContest = z.enum([
    /** Several tickets can plausibly take power. */
    "multiparty",
    /** Tickets exist and compete, but one has not lost in living memory. */
    "dominant-party",
    /** One ticket is the state; the others are permitted rather than competing. */
    "one-party",
    /** No party system at all — a monarchy, a junta, a clerical council. */
    "none",
]);
export const NationPartySystem = z
    .object({
    contest: PoliticalContest,
    /**
     * The tickets a national politician can carry. Empty where `contest` is
     * "none" — an absent slate is the reading, not a gap in the research.
     */
    parties: z.array(Party),
})
    .strict();
/**
 * How much of a country the dataset authors, not what shape it is.
 *
 * Every nation is the same shape whatever its fidelity: this scales only the
 * numbers that were a constant or a special case before it existed — how deep
 * its bench of people runs, and how much the validator asks of its authored
 * layer. `full` is a country with its own researched agendas and red lines;
 * `standard` has an authored political layer on sourced figures; `thin` is a
 * small state whose figures are sourced and whose traits are its archetype's.
 * Read by `personPoolSpecs` (depth per role) and the dataset validator (depth
 * checks); defaults to `full` so an authored record says nothing new.
 */
export const NationFidelity = z.enum(["full", "standard", "thin"]);
export const Nation = z.object({
    id: NationId,
    playable: z.boolean(),
    fidelity: NationFidelity.default("full"),
    identity: z.object({
        name: z.string().min(1),
        adjective: z.string().min(1),
        capital: z.string().min(1),
        government: CharterId,
        languages: z.array(z.string()).min(1),
        currency: CurrencyCode,
        // Every money field in the dataset is stored in USD millions, so rendering
        // a figure in the nation's own currency needs a rate. It is optional here
        // and required by the dataset validator on playable nations only: the
        // player's own treasury is the only money the currency toggle restates,
        // and inventing a rate for fifty NPC economies would be fifty figures
        // nobody could check. Units of the nation's currency per one US dollar.
        currencyPerUsd: z.number().positive().optional(),
        // Whether the English short name is said with "the" — "the United States",
        // "the United Kingdom", "the Democratic Republic of the Congo" — versus a
        // bare proper noun ("Germany", "Japan"). A rendered sentence that pastes
        // `name` straight in reads wrong for every nation that needs the article,
        // and a scenario writer casting the same line onto all fifty nations has
        // no way to know which ones do. Optional and defaults to no article: the
        // false case (a name the heuristic elsewhere would guess wrong) is set
        // explicitly rather than left absent, same as every other override in this
        // file. Consumed by `displayName()` below, by the placeholder resolver at
        // `packages/content/src/nation-article.ts` (`takesDefiniteArticle`,
        // `nationPhrase`), and by narration at `packages/engine/src/naming.ts`
        // (`nationName`) — all three fall back to their own name-shape heuristic
        // when this is absent, so the field is additive rather than load-bearing
        // for the nations not listed here.
        definiteArticle: z.boolean().optional(),
    }),
    geo: z.object({
        region: RegionId,
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        neighbors: z.array(NationId),
        coastline: z.boolean(),
        chokepoints: z.array(ChokepointId),
        // How badly each of those straits closing would hurt this country, filled
        // at assembly beside `chokepoints` from the same row. Optional because a
        // record that has not been through assembly carries no lanes at all.
        chokepointDependence: z.array(ChokepointDependence).optional(),
        disasterExposure: z.object({
            earthquake: z.number().min(0).max(1).optional(),
            flood: z.number().min(0).max(1).optional(),
            drought: z.number().min(0).max(1).optional(),
            cyclone: z.number().min(0).max(1).optional(),
            wildfire: z.number().min(0).max(1).optional(),
            pandemic: z.number().min(0).max(1).optional(),
            tornado: z.number().min(0).max(1).optional(),
            "winter-storm": z.number().min(0).max(1).optional(),
            "heat-wave": z.number().min(0).max(1).optional(),
        }),
    }),
    stats: NationStats,
    // Closed-enum industrial mix. Weights sum to 1 (dataset validator).
    sectors: z.array(SectorMixEntry).min(1),
    traits: NationTraits,
    doctrine: z.object({
        posture: Posture,
        redLines: z.array(RedLine),
        alignmentPull: z.array(NationId),
    }),
    memberships: z.array(OrgId),
    /**
     * How power is contested here, and by whom. Required on an assembled nation:
     * `applyPartySystems` attaches one to every shipped country and the dataset
     * validator refuses a nation without it, so an absent field was never a state
     * this game could reach — only a shape an unreadable save could arrive in.
     */
    partySystem: NationPartySystem,
    bands: NationBands,
});
// What a nation looks like before assembly fills in what is derived. Bands are
// computed from the stats beside them, memberships are mirrored from the
// organization registry, and the party system is attached from its own authored
// table — so authoring any of the three by hand only creates a second copy that
// can disagree with the first.
export const NationInput = Nation.omit({ bands: true, memberships: true, partySystem: true });
