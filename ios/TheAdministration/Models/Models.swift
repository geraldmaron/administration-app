import Foundation

/// Core shared models for The Administration iOS client, including metrics,
/// scenarios, player profiles, geography, and game state used by services and views.

struct Metric: Identifiable, Codable {
    let id: String
    let name: String
    let description: String
    let type: String
    
    // Extended schema alignment with web metrics
    let shortName: String?
    let category: String?
    let inverse: Bool?
    let range: MetricRange?
    let display: MetricDisplay?
    let behavior: MetricBehavior?
    let derivation: MetricDerivation?
    let revealCondition: RevealCondition?
}

struct MetricRange: Codable {
    let min: Double
    let max: Double
    let baseline: Double
    let criticalLow: Double?
    let criticalHigh: Double?
}

struct MetricDisplay: Codable {
    let format: String? // 'percentage' | 'grade' | 'raw' | 'currency'
    let precision: Int?
    let showTrend: Bool?
    let icon: String?
}

struct MetricCorrelation: Codable {
    let targetMetricId: String
    let strength: Double
    let lag: Int
    let bidirectional: Bool
}

struct MetricBehavior: Codable {
    let volatility: Double
    let inertia: Double
    let decayRate: Double?
    let equilibrium: Double?
    let correlations: [MetricCorrelation]?
}

struct MetricDerivation: Codable {
    struct Component: Codable {
        let sourceMetricId: String
        let weight: Double
        let transform: String?
    }
    
    let components: [Component]
    let formula: String?
}

struct RevealCondition: Codable {
    let type: String // 'threshold' | 'turn' | 'event'
    let parameters: [String: AnyCodable]
}

enum SeverityLevel: String, Codable {
    case low
    case medium
    case high
    case extreme
    case critical
}

enum GamePhase: String, Codable {
    case early
    case mid
    case late
    case endgame
}

enum GameStatus: String, Codable {
    case setup
    case active
    case paused
    case ended
}

struct ScenarioLocation: Codable {
    let countryId: String?
    let region: String?
    let city: String?
    let site: String?
    let cityId: String?
    let cityIds: [String]?
    let regionId: String?
    let siteId: String?
    let localeTemplate: String?
}

struct Locale: Codable {
    let id: String
    let countryId: String
    let name: String
    let type: String
    let region: String?
    let population: Int?
    let tags: [String]?
}

struct PopulationImpact: Codable {
    let countryId: String
    let casualties: Double?
    let displaced: Double?
    let severity: SeverityLevel?
}

struct EconomicImpact: Codable {
    let countryId: String?
    let gdpDelta: Double?
    let tradeDelta: Double?
    let energyDelta: Double?
}

struct HumanCost: Codable {
    let civilian: Double?
    let military: Double?
    let displaced: Double?
    let casualtyConfidence: Double?
}

struct Effect: Codable {
    let targetMetricId: String
    let value: Double
    let duration: Int
    let probability: Double
    let delay: Int?
    let type: String?
    let condition: EffectCondition?
    let scaling: EffectScaling?
    let tags: [String]?

    init(targetMetricId: String, value: Double, duration: Int = 1, probability: Double = 1.0,
         delay: Int? = nil, type: String? = nil, condition: EffectCondition? = nil,
         scaling: EffectScaling? = nil, tags: [String]? = nil) {
        self.targetMetricId = targetMetricId; self.value = value
        self.duration = duration; self.probability = probability
        self.delay = delay; self.type = type; self.condition = condition
        self.scaling = scaling; self.tags = tags
    }
}

struct EffectCondition: Codable {
    let type: String // 'metric_threshold' | 'policy_active' | 'cabinet_stat' | 'turn_range'
    let metricId: String?
    let `operator`: String?
    let threshold: Double?
    let stat: String?
    let minTurn: Int?
    let maxTurn: Int?
    let invertEffect: Bool?
}

struct EffectScaling: Codable {
    let baseMetricId: String
    let formula: String // 'linear' | 'logarithmic' | 'threshold'
    let coefficient: Double?
    let threshold: Double?
    let cap: Double?
}

struct MetricImpact: Codable {
    let metricId: String
    let delta: Double
    let name: String
    let projected: Bool?
}

struct AdvisorFeedback: Codable {
    let roleId: String
    let stance: String
    let feedback: String
}

struct Option: Identifiable, Codable {
    let id: String
    let text: String
    let label: String?
    let advisorFeedback: [AdvisorFeedback]?
    let advisorFeedbackString: String?
    let effects: [Effect]
    let effectsMap: [String: Double]?
    let nextScenarioId: String?
    let impactText: String?
    let impactMap: [String: Double]?
    let relationshipImpact: [String: Double]?
    let relationshipEffects: [String: Double]?
    let populationImpact: [PopulationImpact]?
    let economicImpact: [EconomicImpact]?
    let humanCost: HumanCost?
    let actor: String?
    let location: ScenarioLocation?
    let severity: SeverityLevel?
    let tags: [String]?
    let cooldown: Int?
    let oncePerGame: Bool?
    let outcome: String?
    let outcomeHeadline: String?
    let outcomeSummary: String?
    let outcomeContext: String?
    let isAuthoritarian: Bool?
    let moralWeight: Double?
    let consequenceScenarioIds: [String]?
    let consequenceDelay: Int?

    // Convenience init for programmatic construction
    init(
        id: String, text: String, label: String? = nil,
        advisorFeedback: [AdvisorFeedback]? = nil,
        advisorFeedbackString: String? = nil,
        effects: [Effect] = [], effectsMap: [String: Double]? = nil,
        nextScenarioId: String? = nil, impactText: String? = nil,
        impactMap: [String: Double]? = nil,
        relationshipImpact: [String: Double]? = nil,
        relationshipEffects: [String: Double]? = nil,
        populationImpact: [PopulationImpact]? = nil,
        economicImpact: [EconomicImpact]? = nil,
        humanCost: HumanCost? = nil, actor: String? = nil,
        location: ScenarioLocation? = nil, severity: SeverityLevel? = nil,
        tags: [String]? = nil, cooldown: Int? = nil,
        oncePerGame: Bool? = nil, outcome: String? = nil,
        outcomeHeadline: String? = nil, outcomeSummary: String? = nil,
        outcomeContext: String? = nil, isAuthoritarian: Bool? = nil,
        moralWeight: Double? = nil, consequenceScenarioIds: [String]? = nil,
        consequenceDelay: Int? = nil
    ) {
        self.id = id; self.text = text; self.label = label
        self.advisorFeedback = advisorFeedback
        self.advisorFeedbackString = advisorFeedbackString
        self.effects = effects; self.effectsMap = effectsMap
        self.nextScenarioId = nextScenarioId; self.impactText = impactText
        self.impactMap = impactMap; self.relationshipImpact = relationshipImpact
        self.relationshipEffects = relationshipEffects
        self.populationImpact = populationImpact; self.economicImpact = economicImpact
        self.humanCost = humanCost; self.actor = actor; self.location = location
        self.severity = severity; self.tags = tags; self.cooldown = cooldown
        self.oncePerGame = oncePerGame; self.outcome = outcome
        self.outcomeHeadline = outcomeHeadline; self.outcomeSummary = outcomeSummary
        self.outcomeContext = outcomeContext; self.isAuthoritarian = isAuthoritarian
        self.moralWeight = moralWeight; self.consequenceScenarioIds = consequenceScenarioIds
        self.consequenceDelay = consequenceDelay
    }

    enum CodingKeys: String, CodingKey {
        case id
        case text
        case label
        case advisorFeedback
        case effects
        case nextScenarioId
        case impact
        case relationshipImpact
        case relationshipEffects
        case populationImpact
        case economicImpact
        case humanCost
        case actor
        case location
        case severity
        case tags
        case cooldown
        case oncePerGame
        case outcome
        case outcomeHeadline
        case outcomeSummary
        case outcomeContext
        case isAuthoritarian = "is_authoritarian"
        case moralWeight = "moral_weight"
        case consequenceScenarioIds
        case consequenceDelay
    }

}

extension Option {
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(text, forKey: .text)
        try c.encodeIfPresent(label, forKey: .label)
        try c.encodeIfPresent(advisorFeedback, forKey: .advisorFeedback)
        try c.encode(effects, forKey: .effects)
        try c.encodeIfPresent(nextScenarioId, forKey: .nextScenarioId)
        try c.encodeIfPresent(actor, forKey: .actor)
        try c.encodeIfPresent(location, forKey: .location)
        try c.encodeIfPresent(severity, forKey: .severity)
        try c.encodeIfPresent(tags, forKey: .tags)
        try c.encodeIfPresent(cooldown, forKey: .cooldown)
        try c.encodeIfPresent(oncePerGame, forKey: .oncePerGame)
        try c.encodeIfPresent(outcome, forKey: .outcome)
        try c.encodeIfPresent(outcomeHeadline, forKey: .outcomeHeadline)
        try c.encodeIfPresent(outcomeSummary, forKey: .outcomeSummary)
        try c.encodeIfPresent(outcomeContext, forKey: .outcomeContext)
        try c.encodeIfPresent(isAuthoritarian, forKey: .isAuthoritarian)
        try c.encodeIfPresent(moralWeight, forKey: .moralWeight)
        try c.encodeIfPresent(consequenceScenarioIds, forKey: .consequenceScenarioIds)
        try c.encodeIfPresent(consequenceDelay, forKey: .consequenceDelay)
        try c.encodeIfPresent(populationImpact, forKey: .populationImpact)
        try c.encodeIfPresent(economicImpact, forKey: .economicImpact)
        try c.encodeIfPresent(humanCost, forKey: .humanCost)
        try c.encodeIfPresent(relationshipImpact, forKey: .relationshipImpact)
        try c.encodeIfPresent(relationshipEffects, forKey: .relationshipEffects)
        if let impactText = impactText {
            try c.encode(impactText, forKey: .impact)
        } else if let impactMap = impactMap {
            try c.encode(impactMap, forKey: .impact)
        }
    }
}

extension Option {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        text = try container.decode(String.self, forKey: .text)
        label = try container.decodeIfPresent(String.self, forKey: .label)

        if let feedbackArray = try? container.decode([AdvisorFeedback].self, forKey: .advisorFeedback) {
            advisorFeedback = feedbackArray; advisorFeedbackString = nil
        } else if let feedbackString = try? container.decode(String.self, forKey: .advisorFeedback) {
            advisorFeedback = nil; advisorFeedbackString = feedbackString
        } else {
            advisorFeedback = nil; advisorFeedbackString = nil
        }

        nextScenarioId = try container.decodeIfPresent(String.self, forKey: .nextScenarioId)
        actor = try container.decodeIfPresent(String.self, forKey: .actor)
        location = try container.decodeIfPresent(ScenarioLocation.self, forKey: .location)
        severity = try container.decodeIfPresent(SeverityLevel.self, forKey: .severity)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        cooldown = try container.decodeIfPresent(Int.self, forKey: .cooldown)
        oncePerGame = try container.decodeIfPresent(Bool.self, forKey: .oncePerGame)
        outcome = try container.decodeIfPresent(String.self, forKey: .outcome)
        outcomeHeadline = try container.decodeIfPresent(String.self, forKey: .outcomeHeadline)
        outcomeSummary = try container.decodeIfPresent(String.self, forKey: .outcomeSummary)
        outcomeContext = try container.decodeIfPresent(String.self, forKey: .outcomeContext)
        isAuthoritarian = try container.decodeIfPresent(Bool.self, forKey: .isAuthoritarian)
        moralWeight = try container.decodeIfPresent(Double.self, forKey: .moralWeight)
        consequenceScenarioIds = try container.decodeIfPresent([String].self, forKey: .consequenceScenarioIds)
        consequenceDelay = try container.decodeIfPresent(Int.self, forKey: .consequenceDelay)
        populationImpact = try container.decodeIfPresent([PopulationImpact].self, forKey: .populationImpact)
        economicImpact = try container.decodeIfPresent([EconomicImpact].self, forKey: .economicImpact)
        humanCost = try container.decodeIfPresent(HumanCost.self, forKey: .humanCost)
        relationshipImpact = try container.decodeIfPresent([String: Double].self, forKey: .relationshipImpact)
        relationshipEffects = try container.decodeIfPresent([String: Double].self, forKey: .relationshipEffects)

        if let effectArray = try? container.decode([Effect].self, forKey: .effects) {
            effects = effectArray; effectsMap = nil
        } else if let effectMap = try? container.decode([String: Double].self, forKey: .effects) {
            effects = []; effectsMap = effectMap
        } else {
            effects = []; effectsMap = nil
        }

        if let impactTextValue = try? container.decode(String.self, forKey: .impact) {
            impactText = impactTextValue; impactMap = nil
        } else if let impactMapValue = try? container.decode([String: Double].self, forKey: .impact) {
            impactText = nil; impactMap = impactMapValue
        } else {
            impactText = nil; impactMap = nil
        }
    }
}

struct ScenarioCondition: Codable {
    let metricId: String
    let min: Double?
    let max: Double?
}

struct TriggerCondition: Codable {
    let actionId: String?
    let metricId: String?
    let `operator`: String?
    let threshold: Double?
    let delayTurns: Int?
    let triggerProbability: Double?
}

struct ScenarioClassification: Codable {
    let category: String // 'random', 'consequence', 'crisis', 'escalation'
    let domain: [String]
    let severity: SeverityLevel
    let tags: [String]
}

struct ScenarioBehavior: Codable {
    let weight: Double
    let cooldown: Int
    let oncePerGame: Bool
    let chainGroup: String?
    let escalationLevel: Int?
}

struct OutcomePresentation: Codable {
    let headline: String
    let summary: String
    let context: String?
    let tone: String? // 'positive' | 'negative' | 'mixed' | 'neutral'
}

struct ScenarioMetadata: Codable {
    var applicableCountries: [String]?
    var requiresTags: [String]?
    var excludesTags: [String]?
    var requiredGeopoliticalTags: [String]?
    var excludedGeopoliticalTags: [String]?
    var requiredGovernmentCategories: [String]?
    var excludedGovernmentCategories: [String]?
    var regionalBoost: [String: Double]?
    var isNeighborEvent: Bool?
    var involvedCountries: [String]?

    enum CodingKeys: String, CodingKey {
        case applicableCountries = "applicable_countries"
        case requiresTags = "requires_tags"
        case excludesTags = "excludes_tags"
        case requiredGeopoliticalTags = "required_geopolitical_tags"
        case excludedGeopoliticalTags = "excluded_geopolitical_tags"
        case requiredGovernmentCategories = "required_government_categories"
        case excludedGovernmentCategories = "excluded_government_categories"
        case regionalBoost = "regional_boost"
        case isNeighborEvent = "is_neighbor_event"
        case involvedCountries = "involved_countries"
    }
}

struct Scenario: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let conditions: [ScenarioCondition]?
    let phase: String?
    let severity: SeverityLevel?
    let chainId: String?
    let options: [Option]
    let chainsTo: [String]?
    let actor: String?
    let location: ScenarioLocation?
    let tags: [String]?
    let cooldown: Int?
    let classification: ScenarioClassification?
    let behavior: ScenarioBehavior?
    let weight: Double?
    let tier: String?
    let category: String?
    let triggerConditions: [TriggerCondition]?
    let oncePerGame: Bool?
    let titleTemplate: String?
    let descriptionTemplate: String?
    let tokenMap: [String: String]?
    let storagePath: String?
    let metadata: ScenarioMetadata?

    init(
        id: String, title: String, description: String,
        conditions: [ScenarioCondition]? = nil, phase: String? = nil,
        severity: SeverityLevel? = nil, chainId: String? = nil,
        options: [Option], chainsTo: [String]? = nil,
        actor: String? = nil, location: ScenarioLocation? = nil,
        tags: [String]? = nil, cooldown: Int? = nil,
        classification: ScenarioClassification? = nil,
        behavior: ScenarioBehavior? = nil, weight: Double? = nil,
        tier: String? = nil, category: String? = nil,
        triggerConditions: [TriggerCondition]? = nil,
        oncePerGame: Bool? = nil, titleTemplate: String? = nil,
        descriptionTemplate: String? = nil, tokenMap: [String: String]? = nil,
        storagePath: String? = nil, metadata: ScenarioMetadata? = nil
    ) {
        self.id = id; self.title = title; self.description = description
        self.conditions = conditions; self.phase = phase; self.severity = severity
        self.chainId = chainId; self.options = options; self.chainsTo = chainsTo
        self.actor = actor; self.location = location; self.tags = tags
        self.cooldown = cooldown; self.classification = classification
        self.behavior = behavior; self.weight = weight; self.tier = tier
        self.category = category; self.triggerConditions = triggerConditions
        self.oncePerGame = oncePerGame; self.titleTemplate = titleTemplate
        self.descriptionTemplate = descriptionTemplate; self.tokenMap = tokenMap
        self.storagePath = storagePath; self.metadata = metadata
    }

    enum CodingKeys: String, CodingKey {
        case id, title, description, conditions, phase, severity
        case chainId = "chain_id"
        case options
        case chainsTo = "chains_to"
        case actor, location, tags, cooldown, classification, behavior, weight, tier, category
        case triggerConditions = "trigger_conditions"
        case oncePerGame = "once_per_game"
        case titleTemplate = "title_template"
        case descriptionTemplate = "description_template"
        case tokenMap = "token_map"
        case storagePath = "storage_path"
        case metadata
    }
}

struct SecondaryImpactModifier: Codable {
    let condition: String // 'metric_below' | 'metric_above' | 'policy_active' | 'cabinet_stat'
    let reference: String
    let threshold: Double?
    let multiplierAdjustment: Double
}

struct SecondaryImpactRule: Codable {
    let sourceMetric: String
    let targetMetric: String
    let baseMultiplier: Double
    let thresholdMagnitude: Double
    let modifiers: [SecondaryImpactModifier]
}

struct OutcomeVariance: Codable {
    struct Modifier: Codable {
        let condition: String
        let varianceMultiplier: Double
    }
    
    struct CriticalOutcome: Codable {
        let probability: Double
        let type: String // 'critical_success' | 'critical_failure'
        let effectMultiplier: Double
    }
    
    let baseVariance: Double
    let modifiers: [Modifier]
    let criticalOutcomes: [CriticalOutcome]
}

struct DynamicDuration: Codable {
    struct TerminationCondition: Codable {
        let metricId: String
        let threshold: Double
        let `operator`: String
    }
    
    let type: String // 'fixed' | 'decaying' | 'building' | 'conditional'
    let baseDuration: Int
    let decayRate: Double?
    let buildRate: Double?
    let peakTurn: Int?
    let terminationCondition: TerminationCondition?
}

struct PlayerProfile: Codable {
    let name: String
    let party: String
    let approach: String
    var stats: PlayerStats? = nil
    var traits: [PlayerTrait]? = nil
    var background: String? = nil
    var strengths: [String]? = nil
    var weaknesses: [String]? = nil
}

struct PlayerStats: Codable {
    let diplomacy: Double
    let economics: Double
    let military: Double
    let management: Double
    let compassion: Double
    let integrity: Double
    let charisma: Double?
    let competency: Double?
    let ideology: Double?
    let corruption: Double?

    init(diplomacy: Double, economics: Double, military: Double, management: Double,
         compassion: Double, integrity: Double,
         charisma: Double? = nil, competency: Double? = nil,
         ideology: Double? = nil, corruption: Double? = nil) {
        self.diplomacy = diplomacy; self.economics = economics
        self.military = military; self.management = management
        self.compassion = compassion; self.integrity = integrity
        self.charisma = charisma; self.competency = competency
        self.ideology = ideology; self.corruption = corruption
    }
}

struct TraitStatBonus: Codable {
    let stat: String
    let value: Double
}

struct PlayerTrait: Codable {
    let name: String
    let description: String
    let statBonus: TraitStatBonus?
    let iconName: String?

    init(name: String, description: String, statBonus: TraitStatBonus? = nil, iconName: String? = nil) {
        self.name = name; self.description = description
        self.statBonus = statBonus; self.iconName = iconName
    }
}

struct Candidate: Identifiable, Codable {
    let id: String
    let name: String
    let party: String
    let background: String
    let education: String
    let experience: String
    let institution: String?
    let age: Int?
    let yearsOfExperience: Int?
    let stats: PlayerStats
    let traits: [PlayerTrait]
    let analysisBullets: [String]?
    let strengths: [String]?
    let weaknesses: [String]?
    let degreeType: String?
    let degreeField: String?
    let skills: [String]?
    let careerHistory: [String]?
    let potentialScore: Double?
    var cost: Int?
}

struct Role: Identifiable, Codable {
    let id: String
    let title: String
    let category: String
    let description: String?
    let iconName: String?
    let priority: Int?

    init(id: String, title: String, category: String, description: String? = nil, iconName: String? = nil, priority: Int? = nil) {
        self.id = id
        self.title = title
        self.category = category
        self.description = description
        self.iconName = iconName
        self.priority = priority
    }
}

struct CabinetMember: Identifiable, Codable {
    let id: String
    var name: String
    let roleId: String
    let skillLevel: Int
    var isVacant: Bool
    var cost: Int?
    var candidate: Candidate? = nil
}

struct Subdivision: Codable, Hashable {
    let id: String
    let name: String
    let cities: [City]
}

struct City: Codable, Hashable {
    let id: String
    let name: String
    let population: Int
}

struct Country: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    var governmentProfileId: String?
    var attributes: CountryAttributes
    var military: MilitaryStats
    var diplomacy: DiplomaticStats
    var region: String?
    var leaderTitle: String?
    var leader: String?
    var difficulty: String?
    var termLengthYears: Int?
    var currentPopulation: Int?
    var population: String?
    var gdp: String?
    var description: String?
    var subdivisions: [Subdivision]?
    var blocs: [String]?
    var analysisBullets: [String]?
    var strengths: [String]?
    var weaknesses: [String]?
    var vulnerabilities: [String]?
    var uniqueCapabilities: [String]?
    var tokens: [String: String]?
    var code: String?
    var flagUrl: String?
    var alliances: Alliances?
    var economy: EconomyStats?
    var geopoliticalProfile: GeopoliticalProfile?
    var gameplayProfile: CountryGameplayProfile?
    
    init(
        id: String,
        name: String,
        governmentProfileId: String? = nil,
        attributes: CountryAttributes,
        military: MilitaryStats,
        diplomacy: DiplomaticStats,
        region: String? = nil,
        leaderTitle: String? = nil,
        leader: String? = nil,
        difficulty: String? = nil,
        termLengthYears: Int? = nil,
        currentPopulation: Int? = nil,
        population: String? = nil,
        gdp: String? = nil,
        description: String? = nil,
        subdivisions: [Subdivision]? = nil,
        blocs: [String]? = nil,
        analysisBullets: [String]? = nil,
        strengths: [String]? = nil,
        weaknesses: [String]? = nil,
        vulnerabilities: [String]? = nil,
        uniqueCapabilities: [String]? = nil,
        tokens: [String: String]? = nil,
        code: String? = nil,
        flagUrl: String? = nil,
        alliances: Alliances? = nil,
        economy: EconomyStats? = nil,
        geopoliticalProfile: GeopoliticalProfile? = nil,
        gameplayProfile: CountryGameplayProfile? = nil
    ) {
        self.id = id
        self.name = name
        self.governmentProfileId = governmentProfileId
        self.attributes = attributes
        self.military = military
        self.diplomacy = diplomacy
        self.region = region
        self.leaderTitle = leaderTitle
        self.leader = leader
        self.difficulty = difficulty
        self.termLengthYears = termLengthYears
        self.currentPopulation = currentPopulation
        self.population = population
        self.gdp = gdp
        self.description = description
        self.subdivisions = subdivisions
        self.blocs = blocs
        self.analysisBullets = analysisBullets
        self.strengths = strengths
        self.weaknesses = weaknesses
        self.vulnerabilities = vulnerabilities
        self.uniqueCapabilities = uniqueCapabilities
        self.tokens = tokens
        self.code = code
        self.flagUrl = flagUrl
        self.alliances = alliances
        self.economy = economy
        self.geopoliticalProfile = geopoliticalProfile
        self.gameplayProfile = gameplayProfile
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, governmentProfileId, attributes, military, diplomacy, region, leaderTitle, leader, difficulty, termLengthYears, currentPopulation, population, gdp, description, subdivisions, blocs, analysisBullets, strengths, weaknesses, vulnerabilities, uniqueCapabilities, tokens, code, flagUrl, alliances, economy, geopoliticalProfile, gameplayProfile
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        governmentProfileId = try container.decodeIfPresent(String.self, forKey: .governmentProfileId)
        attributes = try container.decode(CountryAttributes.self, forKey: .attributes)
        military = try container.decode(MilitaryStats.self, forKey: .military)
        diplomacy = try container.decode(DiplomaticStats.self, forKey: .diplomacy)
        region = try container.decodeIfPresent(String.self, forKey: .region)
        leaderTitle = try container.decodeIfPresent(String.self, forKey: .leaderTitle)
        leader = try container.decodeIfPresent(String.self, forKey: .leader)
        difficulty = try container.decodeIfPresent(String.self, forKey: .difficulty)
        termLengthYears = try container.decodeIfPresent(Int.self, forKey: .termLengthYears)
        currentPopulation = try container.decodeIfPresent(Int.self, forKey: .currentPopulation)
        population = try container.decodeIfPresent(String.self, forKey: .population)
        gdp = try container.decodeIfPresent(String.self, forKey: .gdp)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        subdivisions = try container.decodeIfPresent([Subdivision].self, forKey: .subdivisions)
        blocs = try container.decodeIfPresent([String].self, forKey: .blocs)
        analysisBullets = try container.decodeIfPresent([String].self, forKey: .analysisBullets)
        strengths = try container.decodeIfPresent([String].self, forKey: .strengths)
        weaknesses = try container.decodeIfPresent([String].self, forKey: .weaknesses)
        vulnerabilities = try container.decodeIfPresent([String].self, forKey: .vulnerabilities)
        uniqueCapabilities = try container.decodeIfPresent([String].self, forKey: .uniqueCapabilities)
        tokens = try container.decodeIfPresent([String: String].self, forKey: .tokens)
        code = try container.decodeIfPresent(String.self, forKey: .code)
        flagUrl = try container.decodeIfPresent(String.self, forKey: .flagUrl)
        alliances = try container.decodeIfPresent(Alliances.self, forKey: .alliances)
        economy = try container.decodeIfPresent(EconomyStats.self, forKey: .economy)
        geopoliticalProfile = try container.decodeIfPresent(GeopoliticalProfile.self, forKey: .geopoliticalProfile)
        gameplayProfile = try container.decodeIfPresent(CountryGameplayProfile.self, forKey: .gameplayProfile)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(governmentProfileId, forKey: .governmentProfileId)
        try container.encode(attributes, forKey: .attributes)
        try container.encode(military, forKey: .military)
        try container.encode(diplomacy, forKey: .diplomacy)
        try container.encodeIfPresent(region, forKey: .region)
        try container.encodeIfPresent(leaderTitle, forKey: .leaderTitle)
        try container.encodeIfPresent(leader, forKey: .leader)
        try container.encodeIfPresent(difficulty, forKey: .difficulty)
        try container.encodeIfPresent(termLengthYears, forKey: .termLengthYears)
        try container.encodeIfPresent(currentPopulation, forKey: .currentPopulation)
        try container.encodeIfPresent(population, forKey: .population)
        try container.encodeIfPresent(gdp, forKey: .gdp)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(subdivisions, forKey: .subdivisions)
        try container.encodeIfPresent(blocs, forKey: .blocs)
        try container.encodeIfPresent(analysisBullets, forKey: .analysisBullets)
        try container.encodeIfPresent(strengths, forKey: .strengths)
        try container.encodeIfPresent(weaknesses, forKey: .weaknesses)
        try container.encodeIfPresent(vulnerabilities, forKey: .vulnerabilities)
        try container.encodeIfPresent(uniqueCapabilities, forKey: .uniqueCapabilities)
        try container.encodeIfPresent(tokens, forKey: .tokens)
        try container.encodeIfPresent(code, forKey: .code)
        try container.encodeIfPresent(flagUrl, forKey: .flagUrl)
        try container.encodeIfPresent(alliances, forKey: .alliances)
        try container.encodeIfPresent(economy, forKey: .economy)
        try container.encodeIfPresent(geopoliticalProfile, forKey: .geopoliticalProfile)
        try container.encodeIfPresent(gameplayProfile, forKey: .gameplayProfile)
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Country, rhs: Country) -> Bool {
        lhs.id == rhs.id
    }
}

struct CountryAttributes: Codable, Hashable {
    var population: Int
    var gdp: Int
}

struct MilitaryStats: Codable, Hashable {
    var strength: Double
    var nuclearCapable: Bool
    var nuclearCapabilities: Bool { nuclearCapable }
    var posture: String?
    var navyPower: Double
    var cyberCapability: Double
    var description: String?

    enum CodingKeys: String, CodingKey {
        case strength, nuclearCapable, posture, navyPower, cyberCapability, description
    }
}

struct DiplomaticStats: Codable, Hashable {
    var relationship: Double
    var alignment: String
    var tradeAgreements: [String]
    var tradeRelationships: [String: Double]?
}

struct GameState: Codable {
    var schemaVersion: String = "5.0"
    var isSetup: Bool
    var countryId: String?
    var turn: Int
    var maxTurns: Int
    var phase: GamePhase = .early
    var status: GameStatus = .setup
    var gameLength: String? // 'short', 'medium', 'long'
    var startDate: String? // ISO date string (YYYY-MM-DD)
    var currentDate: String? // ISO date string (YYYY-MM-DD)
    var startedAt: String?
    var lastPlayedAt: String?
    var metrics: [String: Double]
    var metricHistory: [String: [Double]]
    var metricTrends: [String: String]? // 'rising', 'stable', 'falling'
    var hiddenMetrics: [String: Double]?
    var cabinet: [CabinetMember]
    var activeEffects: [ActiveEffect]
    var currentScenario: Scenario?
    var player: PlayerProfile?
    var personnelSpent: Int?
    var totalBudget: Int?
    var metricOffsets: [String: Double]?
    
    // NEW: Strategic Planning
    var strategicPlan: StrategicPlan?
    
    // NEW: History and Archives
    var newsHistory: [NewsArticle] = []
    var lastBriefing: Briefing?
    var archive: [TurnRecord] = []
    
    // NEW: Game Data
    var countries: [Country] = []
    
    // NEW: Settings
    var fiscalSettings: FiscalSettings?
    var policySettings: PolicySettings?
    
    // NEW: Tracking
    var trustYourGutUsed: Int = 0
    var playedScenarioIds: [String] = []
    var recentActions: [String]?
    var infinitePulseEnabled: Bool?
    var lockedMetricIds: [String]?
    var godMode: Bool?
    
    // NEW: Consequences and Special Modes
    var outcomeHistory: [OutcomeRecord]?
    var pendingConsequences: [PendingConsequence]?
    var dickMode: DickModeConfig?
    var aiScenarioQueue: AIScenarioQueue?
    
    // NEW: Advanced features from web
    var achievements: [String]?
    var milestones: [Milestone]?
    var resources: GameResources?
    var policyBudget: PolicyBudgetState?
    var flags: [String: AnyCodable]?
}

// Extended game configuration aligned with web schema
struct GameConfig: Codable {
    let approvalWeights: [String: Double]
    let gameLengths: [String: Int]
    let dynamicEnding: DynamicEndingConfig
    let effectCurves: [MetricEffectCurve]
    let secondaryImpactRules: [SecondaryImpactRule]
    let feedbackLoops: [FeedbackLoop]
    let approvalDerivation: ApprovalDerivation
    let outcomeVariance: OutcomeVariance
    let inertiaEffects: InertiaEffect
    
    struct DynamicEndingConfig: Codable {
        let earlyEndThreshold: Double
        let lateExtensionThreshold: Double
    }
}

struct MetricEffectCurve: Codable {
    let metricId: String
    let curve: String
    let parameters: [String: Double]?
}

struct ApprovalDerivation: Codable {
    let weights: [String: Double]
    let baseline: Double
}

struct ActiveEffect: Codable {
    var baseEffect: Effect
    var remainingDuration: Int
    
    // Optional source tracking alignment with web schema
    var sourceScenarioId: String?
    var sourceOptionId: String?
}

// MARK: - Events, Crises, and Feedback Loops

struct CrisisTrigger: Codable {
    let type: String // 'metric_threshold' | 'scenario_outcome' | 'external_event' | 'cascade'
    let conditions: [String: AnyCodable]
    let probability: Double
}

struct CrisisResolution: Codable {
    let type: String // 'metric_recovery' | 'scenario_choice' | 'turns_elapsed' | 'resource_spent'
    let parameters: [String: AnyCodable]
}

struct CrisisExtension: Codable {
    let condition: String
    let additionalTurns: Int
}

struct Crisis: Codable {
    let id: String
    let name: String
    let description: String
    let severity: SeverityLevel
    let triggers: [CrisisTrigger]
    let duration: CrisisDuration
    let effects: CrisisEffects
    let resolutionConditions: [CrisisResolution]
    let escalationPath: String?
    let escalationThreshold: CrisisEscalationThreshold?
    let relatedScenarioIds: [String]
    
    struct CrisisDuration: Codable {
        let min: Int
        let max: Int
        let extensionConditions: [CrisisExtension]?
    }
    
    struct CrisisEffects: Codable {
        let immediate: [Effect]
        let perTurn: [Effect]
        let resolution: [Effect]
    }
    
    struct CrisisEscalationThreshold: Codable {
        let turnsUnresolved: Int
        let metricConditions: [ScenarioCondition]?
    }
}

struct ActiveCrisis: Codable {
    let crisis: Crisis
    let startTurn: Int
    let currentDuration: Int
}

struct FeedbackLoop: Codable {
    struct AffectedMetric: Codable {
        let metricId: String
        let perTurnDelta: Double
        let decayRate: Double?
    }
    
    let id: String
    let type: String // 'reinforcing' | 'balancing'
    let triggerMetric: String
    let triggerCondition: FeedbackTriggerCondition
    let affectedMetrics: [AffectedMetric]
    let description: String
    
    struct FeedbackTriggerCondition: Codable {
        let `operator`: String
        let value: Double
    }
}

struct HiddenVariable: Codable {
    struct Accumulator: Codable {
        let condition: String
        let deltaPerTurn: Double
    }
    
    struct TriggerEffect: Codable {
        let type: String // 'scenario_unlock' | 'metric_shock' | 'cascade'
        let parameters: [String: AnyCodable]
    }
    
    struct Hint: Codable {
        let threshold: Double
        let message: String
    }
    
    let id: String
    let name: String
    let value: Double
    let accumulators: [Accumulator]
    let triggerThreshold: Double
    let triggerEffect: TriggerEffect
    let hints: [Hint]
}

struct QueuedEvent: Codable {
    struct Payload: Codable {
        let scenarioId: String?
        let crisisId: String?
        let effects: [Effect]?
        let narrative: String?
    }
    
    struct Source: Codable {
        let type: String // 'decision' | 'metric' | 'time' | 'external'
        let reference: String?
        let turn: Int
    }
    
    let id: String
    let type: String // 'scenario' | 'crisis' | 'consequence' | 'random' | 'scheduled'
    let triggerTurn: Int
    let probability: Double
    let priority: Int
    let conditions: [EffectCondition]
    let payload: Payload
    let source: Source
}

struct ProcessedEvent: Codable {
    let event: QueuedEvent
    let processedTurn: Int
    let outcome: String // 'triggered' | 'expired' | 'cancelled' | 'deferred'
    let reason: String?
}

struct EventQueue: Codable {
    let pending: [QueuedEvent]
    let processed: [ProcessedEvent]
}

// MARK: - Strategic Planning
struct StrategicPlan: Codable {
    let id: String
    let name: String
    let description: String
    let focus: String?
    let targetMetrics: [String: Double]
    var activeTurn: Int?
    let priority: String?
    let durationTurns: Int?

    init(id: String, name: String, description: String, focus: String? = nil,
         targetMetrics: [String: Double] = [:], activeTurn: Int? = nil,
         priority: String? = nil, durationTurns: Int? = nil) {
        self.id = id
        self.name = name
        self.description = description
        self.focus = focus
        self.targetMetrics = targetMetrics
        self.activeTurn = activeTurn
        self.priority = priority
        self.durationTurns = durationTurns
    }
}

// MARK: - News and History
struct NewsArticle: Identifiable, Codable {
    let id: String
    let title: String?
    let headline: String?
    let summary: String
    let content: String?
    let turn: Int
    let impact: String?
    let tags: [String]?
    let category: String?
    let relatedScenarioId: String?
    let isAlert: Bool?
}

struct TurnRecord: Identifiable, Codable {
    var id: String { "\(turn)-\(decisionId)" }
    let turn: Int
    let metricSnapshots: [String: Double]?
    let scenarioId: String?
    let optionId: String?
    let briefing: String?
    let newsArticles: [String]? // IDs of news articles from this turn
    let scenarioTitle: String
    let scenarioDescription: String
    let decisionLabel: String
    let decisionId: String
    let metricDeltas: [MetricDelta]
    let cabinetFeedback: [CabinetContribution]
    let timestamp: String?
}

struct Briefing: Codable {
    let title: String
    let summary: String
    let metricDeltas: [MetricDelta]
    let cabinetContributions: [CabinetContribution]?
}

struct MetricDelta: Identifiable, Codable {
    var id: String { metricId }
    let metricId: String
    let metricName: String
    let delta: Double
    let cabinetOffset: Double?
    let playerOffset: Double?
    let netChange: Double?

    /// Convenience for display
    var name: String { metricName }
}

struct CabinetContribution: Codable {
    let memberName: String
    let role: String
    let contribution: String
}

// MARK: - New Schema Support
struct OutcomeRecord: Codable {
    let turn: Int
    let scenarioId: String
    let optionId: String
    let optionText: String
    let metricDeltas: [String: Double]
    let consequenceScenarioIds: [String]?
}

struct PendingConsequence: Codable {
    let scenarioId: String
    let triggerTurn: Int
    let sourceTurn: Int
    let sourceOptionId: String
    let probability: Double
}

struct DickModeConfig: Codable {
    var enabled: Bool
    var active: Bool
    var authoritarianBias: Double
    var moralPenaltyMultiplier: Double
}

struct AIScenarioQueue: Codable {
    var readyChains: [AIChain]
    
    struct AIChain: Codable {
        let scenarios: [Scenario]
        let rootScenarioId: String
    }
}

struct EconomyStats: Codable, Hashable {
    let system: String
    let primaryExport: String
    let primaryImport: String
    let tradeDependencies: [String]
    let majorExports: [String]?
    
    enum CodingKeys: String, CodingKey {
        case system
        case primaryExport = "primary_export"
        case primaryImport = "primary_import"
        case tradeDependencies = "trade_dependencies"
        case majorExports = "major_exports"
    }
}

struct Alliances: Codable, Hashable {
    let economic: [String]?
    let military: [String]?
    let trade: [String]?
}

// MARK: - Settings
struct FiscalSettings: Codable {
    var budgetAllocation: [String: Double]?
    var taxRate: Double?
    var spending: [String: Double]?
    var taxIncome: Double
    var taxCorporate: Double
    var spendingMilitary: Double
    var spendingInfrastructure: Double
    var spendingSocial: Double

    static let defaults = FiscalSettings(
        budgetAllocation: nil, taxRate: nil, spending: nil,
        taxIncome: 25, taxCorporate: 15,
        spendingMilitary: 20, spendingInfrastructure: 20, spendingSocial: 30
    )
}

struct PolicySettings: Codable {
    var militaryPosture: String?
    var tradePolicy: String?
    var environmentalCommitment: String?
    var socialPolicy: String?
    var immigration: Double?
    var tradeOpenness: Double?
    var environmentalProtection: Double?
    var healthcareAccess: Double?
    var educationFunding: Double?
    var socialWelfare: Double?
    // Numeric stance sliders (0–100)
    var economicStance: Double?
    var socialSpending: Double?
    var defenseSpending: Double?
    var environmentalPolicy: Double?
}

struct Milestone: Codable {
    let id: String
    let turn: Int
    let type: String // 'achievement_unlocked', 'crisis_survived', 'term_milestone', etc.
    let data: [String: AnyCodable]
    let headline: String
}

struct GameResources: Codable {
    var politicalCapital: Double
    var trustYourGutRemaining: Int
}

struct PolicyBudgetState: Codable {
    var totalCapital: Double
    var spent: Double
    var lastRecalculated: Int
    var lastWarningTurn: Int?
}

// MARK: - Diplomacy extensions

struct CountryEconomy: Codable {
    let system: String
    let gdp: Double
    let gdpGrowthRate: Double?
    let primaryExport: String
    let primaryImport: String
    let tradeDependencies: [String]
    let majorExports: [String]?
    let currencyStrength: Double?
    let debtToGdpRatio: Double?
}

struct Demographics: Codable {
    struct AgeDistribution: Codable {
        let under18: Double
        let adults: Double
        let elderly: Double
    }
    
    struct UrbanRural: Codable {
        let urban: Double
        let rural: Double
    }
    
    struct EconomicClasses: Codable {
        let wealthy: Double
        let middleClass: Double
        let workingClass: Double
        let poverty: Double
    }
    
    struct EducationLevels: Codable {
        let noFormal: Double
        let primary: Double
        let secondary: Double
        let tertiary: Double
    }
    
    struct PoliticalLeanings: Codable {
        let progressive: Double
        let moderate: Double
        let conservative: Double
    }
    
    let total: Double
    let growthRate: Double?
    let ageDistribution: AgeDistribution?
    let urbanRural: UrbanRural?
    let economicClasses: EconomicClasses?
    let educationLevels: EducationLevels?
    let politicalLeanings: PoliticalLeanings?
}

struct CountryTokens: Codable {
    let leaderTitle: String?
    let viceLeader: String?
    let rulingParty: String?
    let legislature: String?
    let upperHouse: String?
    let lowerHouse: String?
    let judicialRole: String?
    let chiefJusticeRole: String?
    let prosecutorRole: String?
    let financeRole: String?
    let defenseRole: String?
    let foreignAffairsRole: String?
    let healthRole: String?
    let educationRole: String?
    let commerceRole: String?
    let laborRole: String?
    let energyRole: String?
    let environmentRole: String?
    let transportRole: String?
    let agricultureRole: String?
    let interiorRole: String?
    let executiveRole: String?
    let intelligenceAgency: String?
    let domesticIntelligence: String?
    let securityCouncil: String?
    let centralBank: String?
    let currency: String?
    let stockExchange: String?
    let sovereignFund: String?
    let stateEnterprise: String?
    let commodityName: String?
    let capitalCity: String?
    let capitalMayor: String?
    let regionalGovernor: String?
    let provincialLeader: String?
    let cabinetSecretary: String?
    let seniorOfficial: String?
    let stateMedia: String?
    let pressSecretary: String?
}

struct CountryGameplayModifiers: Codable {
    struct UniqueMechanic: Codable {
        let id: String
        let description: String
        let triggerConditions: [String: AnyCodable]
        let effect: [String: AnyCodable]
    }
    
    let countryId: String
    let metricSensitivities: [String: Double]
    let domainBonuses: [String: Double]
    let domainPenalties: [String: Double]
    let uniqueMechanics: [UniqueMechanic]
}

enum GovernmentCategory: String, Codable {
    case liberalDemocracy = "liberal_democracy"
    case illiberalDemocracy = "illiberal_democracy"
    case hybridRegime = "hybrid_regime"
    case authoritarian
    case totalitarian
    case theocracy
    case constitutionalMonarchy = "constitutional_monarchy"
    case absoluteMonarchy = "absolute_monarchy"
}

struct CountryRelationship: Codable, Hashable {
    let countryId: String
    let type: String // 'formal_ally' | 'strategic_partner' | 'neutral' | 'rival' | 'adversary' | 'conflict'
    let strength: Double
    let treaty: String?
    let sharedBorder: Bool
}

struct GeopoliticalProfile: Codable {
    let neighbors: [CountryRelationship]
    let allies: [CountryRelationship]
    let adversaries: [CountryRelationship]
    let tags: [String]
    let governmentCategory: GovernmentCategory
    let regimeStability: Double
}

struct CountryGameplayProfile: Codable {
    let startingMetrics: [String: Double]?
    let metricEquilibria: [String: Double]?
    let bundleWeightOverrides: [String: Double]?
    let priorityTags: [String]?
    let suppressedTags: [String]?
    let neighborEventChance: Double?
}

struct CountryProfile: Codable {
    let tags: [String]
    let geography: String?
    let economicScale: String?
    let incomeLevel: String?
    let vulnerabilities: [String]
    let strengths: [String]
}

struct AllianceMember: Codable {
    let name: String
    let role: String
}

struct AllianceChange: Codable {
    let allianceType: String // 'military' | 'economic' | 'trade'
    let countryId: String
    let change: String // 'joined' | 'left' | 'suspended' | 'expelled'
}

struct DiplomaticIncident: Codable {
    struct Resolution: Codable {
        let turn: Int
        let outcome: String // 'favorable' | 'unfavorable' | 'neutral' | 'ongoing'
        let terms: String?
    }
    
    struct Consequences: Codable {
        let tradeImpact: [String: Double]?
        let allianceChanges: [AllianceChange]?
        let ongoingEffects: [Effect]?
    }
    
    let id: String
    let turn: Int
    let involvedCountries: [String]
    let type: String
    let severity: SeverityLevel
    let playerRole: String
    let relationshipImpacts: [String: Double]
    let resolution: Resolution?
    let consequences: Consequences
}

struct Agreement: Codable {
    let id: String
    let type: String // 'trade' | 'defense' | 'cultural' | 'economic'
    let parties: [String]
    let startTurn: Int
    let duration: Int?
    let terms: String
    let effects: [Effect]
}

struct Sanction: Codable {
    let id: String
    let targetCountryId: String
    let imposedBy: [String]
    let startTurn: Int
    let type: String // 'economic' | 'military' | 'diplomatic' | 'comprehensive'
    let severity: SeverityLevel
    let effects: [Effect]
}

struct DiplomacyState: Codable {
    let relationships: [String: Double]
    let incidents: [DiplomaticIncident]
    let activeAgreements: [Agreement]
    let sanctions: [Sanction]
}

// MARK: - Fiscal and Policy state

struct FiscalRevenue: Codable {
    let taxIncome: Double
    let taxCorporate: Double
    let taxSales: Double?
    let tariffs: Double?
    let stateEnterprises: Double?
    let foreignAid: Double?
}

struct FiscalSpending: Codable {
    let military: Double
    let healthcare: Double?
    let education: Double?
    let infrastructure: Double
    let welfare: Double?
    let debtService: Double?
    let administration: Double?
    let social: Double
}

struct FiscalRecord: Codable {
    let turn: Int
    let revenue: Double
    let spending: Double
    let debt: Double
}

struct FiscalState: Codable {
    let revenue: FiscalRevenue
    let totalRevenue: Double
    let spending: FiscalSpending
    let totalSpending: Double
    let surplus: Double
    let debt: Double
    let debtToGdpRatio: Double
    let creditRating: String
    let borrowingCapacity: Double
    let history: [FiscalRecord]
}

struct PolicyMomentum: Codable {
    let policyId: String
    let currentDirection: Double
    let stability: Double
    let changeHistory: [PolicyMomentumChange]
    
    struct PolicyMomentumChange: Codable {
        let turn: Int
        let delta: Double
    }
}

struct InertiaEffect: Codable {
    struct Penalties: Codable {
        let approvalDelta: Double
        let effectivenessMultiplier: Double
        let bureaucracyDelta: Double
    }
    
    let rapidChangeThreshold: Double
    let penalties: Penalties
}

struct AchievementCondition: Codable {
    let type: String
    let parameters: [String: AnyCodable]
}

struct Achievement: Codable {
    struct Reward: Codable {
        let bonusEffects: [Effect]?
        let unlocks: [String]?
    }
    
    let id: String
    let name: String
    let description: String
    let icon: String?
    let category: String
    let conditions: [AchievementCondition]
    let rewards: Reward?
    let rarity: String
}

struct GameHistory: Codable {
    let turns: [TurnRecord]
    let milestones: [Milestone]
    let achievements: [String]
    let playedScenarioIds: [String]
    let outcomes: [OutcomeRecord]
}

struct CurrentGameState: Codable {
    let scenario: Scenario?
    let activeCrises: [ActiveCrisis]
    let activeEffects: [ActiveEffect]
    let feedbackLoops: [FeedbackLoop]
}

// Helper to support any codable value
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else {
            value = NSNull()
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        } else if let boolValue = value as? Bool {
            try container.encode(boolValue)
        }
    }
}
