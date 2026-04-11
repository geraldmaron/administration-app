import Foundation

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
    case impeached
    case resigned
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
    var scope: EffectScope?
    var targetCountryId: String?
    var targetBranchId: String?
    var targetBranchType: String? = nil
    var populationImpact: EffectPopulationImpact?
    var environmentalImpact: EffectEnvironmentalImpact?

    enum CodingKeys: String, CodingKey {
        case targetMetricId, value, duration, probability, delay, type, condition, scaling, tags
        case scope, targetCountryId, targetBranchId, populationImpact, environmentalImpact
        case targetBranchType = "target_branch_type"
    }

    init(targetMetricId: String, value: Double, duration: Int = 1, probability: Double = 1.0,
         delay: Int? = nil, type: String? = nil, condition: EffectCondition? = nil,
         scaling: EffectScaling? = nil, tags: [String]? = nil,
         scope: EffectScope? = nil, targetCountryId: String? = nil,
         targetBranchId: String? = nil, targetBranchType: String? = nil,
         populationImpact: EffectPopulationImpact? = nil,
         environmentalImpact: EffectEnvironmentalImpact? = nil) {
        self.targetMetricId = targetMetricId; self.value = value
        self.duration = duration; self.probability = probability
        self.delay = delay; self.type = type; self.condition = condition
        self.scaling = scaling; self.tags = tags
        self.scope = scope; self.targetCountryId = targetCountryId
        self.targetBranchId = targetBranchId; self.targetBranchType = targetBranchType
        self.populationImpact = populationImpact
        self.environmentalImpact = environmentalImpact
    }
}

enum EffectScope: String, Codable {
    case domestic, foreign, regional, global
}

struct EffectPopulationImpact: Codable {
    let casualtiesThousands: Double
    let displacedThousands: Double
    let civilianRatio: Double

    enum CodingKeys: String, CodingKey {
        case casualtiesThousands = "casualties_thousands"
        case displacedThousands = "displaced_thousands"
        case civilianRatio = "civilian_ratio"
    }
}

struct EffectEnvironmentalImpact: Codable {
    let radiation: Bool
    let contaminationDuration: Int
    let affectedMetrics: [String]

    enum CodingKeys: String, CodingKey {
        case radiation
        case contaminationDuration = "contamination_duration"
        case affectedMetrics = "affected_metrics"
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

struct ImpactReview: Identifiable {
    let id = UUID()
    let title: String
    let impacts: [MetricImpact]
    let onConfirm: () -> Void
}

struct MetricImpact: Codable {
    let metricId: String
    let delta: Double
    let name: String
    let projected: Bool?

    static func label(for metricId: String) -> String {
        switch metricId {
        case "metric_economy":           return "Economy"
        case "metric_employment":        return "Employment"
        case "metric_budget":            return "Budget"
        case "metric_health":            return "Health"
        case "metric_equality":          return "Equality"
        case "metric_approval":          return "Approval"
        case "metric_military":          return "Military"
        case "metric_environment":       return "Environment"
        case "metric_infrastructure":    return "Infrastructure"
        case "metric_education":         return "Education"
        case "metric_public_order":      return "Public Order"
        case "metric_foreign_relations": return "Foreign Relations"
        case "metric_innovation":        return "Innovation"
        default:
            return metricId
                .replacingOccurrences(of: "metric_", with: "")
                .replacingOccurrences(of: "_", with: " ")
                .capitalized
        }
    }
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
    let effects: [Effect]
    let effectsMap: [String: Double]?
    let nextScenarioId: String?
    let impactText: String?
    let impactMap: [String: Double]?
    let relationshipImpact: [String: Double]?
    let relationshipEffects: [RelationshipEffect]?
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
    let policyImplications: [PolicyImplication]?
    let consequenceScenarioIds: [String]?
    let consequenceDelay: Int?

    // Convenience init for programmatic construction
    init(
        id: String, text: String, label: String? = nil,
        advisorFeedback: [AdvisorFeedback]? = nil,
        effects: [Effect] = [], effectsMap: [String: Double]? = nil,
        nextScenarioId: String? = nil, impactText: String? = nil,
        impactMap: [String: Double]? = nil,
        relationshipImpact: [String: Double]? = nil,
        relationshipEffects: [RelationshipEffect]? = nil,
        populationImpact: [PopulationImpact]? = nil,
        economicImpact: [EconomicImpact]? = nil,
        humanCost: HumanCost? = nil, actor: String? = nil,
        location: ScenarioLocation? = nil, severity: SeverityLevel? = nil,
        tags: [String]? = nil, cooldown: Int? = nil,
        oncePerGame: Bool? = nil, outcome: String? = nil,
        outcomeHeadline: String? = nil, outcomeSummary: String? = nil,
        outcomeContext: String? = nil, isAuthoritarian: Bool? = nil,
        moralWeight: Double? = nil, policyImplications: [PolicyImplication]? = nil,
        consequenceScenarioIds: [String]? = nil,
        consequenceDelay: Int? = nil
    ) {
        self.id = id; self.text = text; self.label = label
        self.advisorFeedback = advisorFeedback
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
        self.moralWeight = moralWeight; self.policyImplications = policyImplications
        self.consequenceScenarioIds = consequenceScenarioIds
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
        case policyImplications
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
        try c.encodeIfPresent(policyImplications, forKey: .policyImplications)
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
            advisorFeedback = feedbackArray
        } else {
            advisorFeedback = nil
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
        policyImplications = try container.decodeIfPresent([PolicyImplication].self, forKey: .policyImplications)
        consequenceDelay = try container.decodeIfPresent(Int.self, forKey: .consequenceDelay)
        populationImpact = try container.decodeIfPresent([PopulationImpact].self, forKey: .populationImpact)
        economicImpact = try container.decodeIfPresent([EconomicImpact].self, forKey: .economicImpact)
        humanCost = try container.decodeIfPresent(HumanCost.self, forKey: .humanCost)
        relationshipImpact = try container.decodeIfPresent([String: Double].self, forKey: .relationshipImpact)
        relationshipEffects = try? container.decodeIfPresent([RelationshipEffect].self, forKey: .relationshipEffects)

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

struct RelationshipCondition: Codable {
    let relationshipId: String
    let min: Double?
    let max: Double?
}

struct RelationshipEffect: Codable {
    let relationshipId: String
    let delta: Double
    let probability: Double?
}

struct RelationshipGate: Codable {
    let kind: String
    let state: String
    let targetId: String?
}

struct ScenarioRequirements: Codable {
    let landBorderAdversary: Bool?
    let formalAlly: Bool?
    let adversary: Bool?
    let tradePartner: Bool?
    let nuclearState: Bool?
    let islandNation: Bool?
    let landlocked: Bool?
    let coastal: Bool?
    let minPowerTier: String?
    let cyberCapable: Bool?
    let powerProjection: Bool?
    let largeMilitary: Bool?
    let authoritarianRegime: Bool?
    let democraticRegime: Bool?
    let fragileState: Bool?
    let hasLegislature: Bool?
    let hasOppositionParty: Bool?

    enum CodingKeys: String, CodingKey {
        case landBorderAdversary = "land_border_adversary"
        case formalAlly = "formal_ally"
        case adversary
        case tradePartner = "trade_partner"
        case nuclearState = "nuclear_state"
        case islandNation = "island_nation"
        case landlocked
        case coastal
        case minPowerTier = "min_power_tier"
        case cyberCapable = "cyber_capable"
        case powerProjection = "power_projection"
        case largeMilitary = "large_military"
        case authoritarianRegime = "authoritarian_regime"
        case democraticRegime = "democratic_regime"
        case fragileState = "fragile_state"
        case hasLegislature = "has_legislature"
        case hasOppositionParty = "has_opposition_party"
    }
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
    var applicableCountries: [String]? = nil
    var requiresTags: [String]? = nil
    var excludesTags: [String]? = nil
    var requiredGeopoliticalTags: [String]? = nil
    var excludedGeopoliticalTags: [String]? = nil
    var requiredGovernmentCategories: [String]? = nil
    var excludedGovernmentCategories: [String]? = nil
    var regionalBoost: [String: Double]? = nil
    var isNeighborEvent: Bool? = nil
    var involvedCountries: [String]? = nil
    var regionTags: [String]? = nil
    var theme: String? = nil
    var scopeTier: String? = nil
    var scopeKey: String? = nil
    var sourceKind: String? = nil
    var requires: ScenarioRequirements? = nil
    var primaryMetrics: [String]? = nil
    var secondaryMetrics: [String]? = nil
    var actorPattern: String? = nil
    var relationshipGates: [RelationshipGate]? = nil
    var eventCategory: String? = nil

    enum CodingKeys: String, CodingKey {
        case applicableCountries = "applicable_countries"
        case requiresTags = "requires_tags"
        case excludesTags = "excludes_tags"
        case requiredGeopoliticalTags
        case excludedGeopoliticalTags
        case requiredGovernmentCategories
        case excludedGovernmentCategories
        case regionalBoost
        case isNeighborEvent
        case involvedCountries
        case regionTags = "region_tags"
        case theme
        case scopeTier
        case scopeKey
        case sourceKind
        case requires
        case primaryMetrics = "primary_metrics"
        case secondaryMetrics = "secondary_metrics"
        case actorPattern
        case relationshipGates = "relationship_gates"
        case eventCategory
    }
}

struct StateTrigger: Codable {
    var metricId: String
    var condition: String
    var threshold: Double
    var weightBoost: Double

    enum CodingKeys: String, CodingKey {
        case metricId = "metric_id"
        case condition, threshold
        case weightBoost = "weight_boost"
    }
}

struct ScenarioDynamicProfile: Codable {
    var stateTriggers: [StateTrigger]?
    var actorPattern: String?
    var narrativeFingerprint: [String]?
    var pressureSources: [String]?
    var governingLens: String?
    var followUpHooks: [String]?
    var recurrenceGroup: String?
    var suppressionTags: [String]?

    enum CodingKeys: String, CodingKey {
        case stateTriggers = "state_triggers"
        case actorPattern = "actor_pattern"
        case narrativeFingerprint = "narrative_fingerprint"
        case pressureSources = "pressure_sources"
        case governingLens = "governing_lens"
        case followUpHooks = "follow_up_hooks"
        case recurrenceGroup = "recurrence_group"
        case suppressionTags = "suppression_tags"
    }
}

struct Scenario: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let conditions: [ScenarioCondition]?
    let relationshipConditions: [RelationshipCondition]?
    let phase: String?
    /// 1-based index within a multi-act chain (`chain_id`); used for accessibility and storyline UI.
    let actIndex: Int?
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
    let legislatureRequirement: LegislatureRequirement?
    var dynamicProfile: ScenarioDynamicProfile?

    init(
        id: String, title: String, description: String,
        conditions: [ScenarioCondition]? = nil, relationshipConditions: [RelationshipCondition]? = nil, phase: String? = nil,
        actIndex: Int? = nil,
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
        storagePath: String? = nil, metadata: ScenarioMetadata? = nil,
        legislatureRequirement: LegislatureRequirement? = nil,
        dynamicProfile: ScenarioDynamicProfile? = nil
    ) {
        self.id = id; self.title = title; self.description = description
        self.conditions = conditions; self.relationshipConditions = relationshipConditions; self.phase = phase; self.actIndex = actIndex; self.severity = severity
        self.chainId = chainId; self.options = options; self.chainsTo = chainsTo
        self.actor = actor; self.location = location; self.tags = tags
        self.cooldown = cooldown; self.classification = classification
        self.behavior = behavior; self.weight = weight; self.tier = tier
        self.category = category; self.triggerConditions = triggerConditions
        self.oncePerGame = oncePerGame; self.titleTemplate = titleTemplate
        self.descriptionTemplate = descriptionTemplate; self.tokenMap = tokenMap
        self.storagePath = storagePath; self.metadata = metadata
        self.legislatureRequirement = legislatureRequirement
        self.dynamicProfile = dynamicProfile
    }

    enum CodingKeys: String, CodingKey {
        case id, title, description, conditions, phase
        case actIndex = "act_index"
        case severity
        case relationshipConditions = "relationship_conditions"
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
        case legislatureRequirement = "legislature_requirement"
        case dynamicProfile = "dynamic_profile"
    }
}

struct LegislatureRequirement: Codable {
    let minApproval: Int
    let chamber: String?

    enum CodingKeys: String, CodingKey {
        case minApproval = "min_approval"
        case chamber
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
    var skills: [PlayerSkill]? = nil
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

struct TraitStatBonus: Codable, Hashable, Equatable {
    let stat: String
    let value: Double
}

struct PlayerSkill: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let statBonuses: [TraitStatBonus]
    let iconName: String
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
    var gender: PersonGender = .male
    var roleAffinity: [String]? = nil
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

struct CountryFacts: Codable, Hashable {
    struct Demographics: Codable, Hashable {
        let populationTotal: Int?
        let sourceYear: Int?

        enum CodingKeys: String, CodingKey {
            case populationTotal = "population_total"
            case sourceYear = "source_year"
        }
    }

    struct Economy: Codable, Hashable {
        let gdpNominalUsd: Double?
        let sourceYear: Int?
        let currencyName: String?
        let currencyCode: String?
        let centralBank: String?
        let primaryExport: String?
        let primaryImport: String?
        let majorIndustry: String?

        enum CodingKeys: String, CodingKey {
            case gdpNominalUsd = "gdp_nominal_usd"
            case sourceYear = "source_year"
            case currencyName = "currency_name"
            case currencyCode = "currency_code"
            case centralBank = "central_bank"
            case primaryExport = "primary_export"
            case primaryImport = "primary_import"
            case majorIndustry = "major_industry"
        }
    }

    struct Geography: Codable, Hashable {
        let capitalCity: String?

        enum CodingKeys: String, CodingKey {
            case capitalCity = "capital_city"
        }
    }

    struct Institutions: Codable, Hashable {
        struct Executive: Codable, Hashable {
            let leaderTitle: String?
            let headOfStateTitle: String?
            let viceLeaderTitle: String?

            enum CodingKeys: String, CodingKey {
                case leaderTitle = "leader_title"
                case headOfStateTitle = "head_of_state_title"
                case viceLeaderTitle = "vice_leader_title"
            }
        }

        struct Legislature: Codable, Hashable {
            let legislature: String?
            let lowerHouse: String?
            let upperHouse: String?

            enum CodingKeys: String, CodingKey {
                case legislature
                case lowerHouse = "lower_house"
                case upperHouse = "upper_house"
            }
        }

        struct OfficeTitles: Codable, Hashable {
            let financeRole: String?
            let defenseRole: String?
            let foreignAffairsRole: String?
            let justiceRole: String?
            let healthRole: String?
            let educationRole: String?
            let commerceRole: String?
            let laborRole: String?
            let energyRole: String?
            let environmentRole: String?
            let transportRole: String?
            let interiorRole: String?
            let executiveRole: String?
            let legislatureSpeaker: String?
            let upperHouseLeader: String?
            let militaryChiefTitle: String?
            let capitalMayorTitle: String?
            let provincialLeaderTitle: String?
            let regionalGovernorTitle: String?
            let pressSecretaryTitle: String?

            enum CodingKeys: String, CodingKey {
                case financeRole = "finance_role"
                case defenseRole = "defense_role"
                case foreignAffairsRole = "foreign_affairs_role"
                case justiceRole = "justice_role"
                case healthRole = "health_role"
                case educationRole = "education_role"
                case commerceRole = "commerce_role"
                case laborRole = "labor_role"
                case energyRole = "energy_role"
                case environmentRole = "environment_role"
                case transportRole = "transport_role"
                case interiorRole = "interior_role"
                case executiveRole = "executive_role"
                case legislatureSpeaker = "legislature_speaker"
                case upperHouseLeader = "upper_house_leader"
                case militaryChiefTitle = "military_chief_title"
                case capitalMayorTitle = "capital_mayor_title"
                case provincialLeaderTitle = "provincial_leader_title"
                case regionalGovernorTitle = "regional_governor_title"
                case pressSecretaryTitle = "press_secretary_title"
            }
        }

        let executive: Executive?
        let legislature: Legislature?
        let officeTitles: OfficeTitles?

        enum CodingKeys: String, CodingKey {
            case executive
            case legislature
            case officeTitles = "office_titles"
        }
    }

    let schemaVersion: Int?
    let baselineId: String?
    let demographics: Demographics?
    let economy: Economy?
    let institutions: Institutions?
    let geography: Geography?

    enum CodingKeys: String, CodingKey {
        case schemaVersion = "schema_version"
        case baselineId = "baseline_id"
        case demographics
        case economy
        case institutions
        case geography
    }
}

struct CountryAmountValues: Codable, Hashable {
    let graftAmount: Double?
    let infrastructureCost: Double?
    let aidAmount: Double?
    let tradeValue: Double?
    let militaryBudgetAmount: Double?
    let disasterCost: Double?
    let sanctionsAmount: Double?
    let currencyCode: String?

    enum CodingKeys: String, CodingKey {
        case graftAmount = "graft_amount"
        case infrastructureCost = "infrastructure_cost"
        case aidAmount = "aid_amount"
        case tradeValue = "trade_value"
        case militaryBudgetAmount = "military_budget_amount"
        case disasterCost = "disaster_cost"
        case sanctionsAmount = "sanctions_amount"
        case currencyCode = "currency_code"
    }
}

struct Country: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    var definiteArticle: String?
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
    var militaryProfile: MilitaryProfile?
    var legislatureProfile: LegislatureProfile?
    var legislatureInitialState: LegislatureState?
    var countryTraits: [CountryTrait]?
    var populationMillions: Double?
    var gdpBillions: Double?
    var facts: CountryFacts?
    var amounts: CountryAmountValues?
    
    init(
        id: String,
        name: String,
        definiteArticle: String? = nil,
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
        gameplayProfile: CountryGameplayProfile? = nil,
        militaryProfile: MilitaryProfile? = nil,
        legislatureProfile: LegislatureProfile? = nil,
        legislatureInitialState: LegislatureState? = nil,
        countryTraits: [CountryTrait]? = nil,
        populationMillions: Double? = nil,
        gdpBillions: Double? = nil,
        facts: CountryFacts? = nil,
        amounts: CountryAmountValues? = nil
    ) {
        self.id = id
        self.name = name
        self.definiteArticle = definiteArticle
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
        self.militaryProfile = militaryProfile
        self.legislatureProfile = legislatureProfile
        self.legislatureInitialState = legislatureInitialState
        self.countryTraits = countryTraits
        self.populationMillions = populationMillions
        self.gdpBillions = gdpBillions
        self.facts = facts
        self.amounts = amounts
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, definiteArticle, governmentProfileId, attributes, military, diplomacy, region, leaderTitle, leader, difficulty, termLengthYears, currentPopulation, population, gdp, description, subdivisions, blocs, analysisBullets, strengths, weaknesses, vulnerabilities, uniqueCapabilities, tokens, code, flagUrl, alliances, economy, geopoliticalProfile, gameplayProfile, militaryProfile, legislatureProfile, legislatureInitialState, countryTraits, populationMillions, gdpBillions, facts, amounts
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        definiteArticle = try container.decodeIfPresent(String.self, forKey: .definiteArticle)
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
        militaryProfile = try container.decodeIfPresent(MilitaryProfile.self, forKey: .militaryProfile)
        legislatureProfile = try container.decodeIfPresent(LegislatureProfile.self, forKey: .legislatureProfile)
        legislatureInitialState = try container.decodeIfPresent(LegislatureState.self, forKey: .legislatureInitialState)
        countryTraits = try container.decodeIfPresent([CountryTrait].self, forKey: .countryTraits)
        populationMillions = try container.decodeIfPresent(Double.self, forKey: .populationMillions)
        gdpBillions = try container.decodeIfPresent(Double.self, forKey: .gdpBillions)
        facts = try container.decodeIfPresent(CountryFacts.self, forKey: .facts)
        amounts = try container.decodeIfPresent(CountryAmountValues.self, forKey: .amounts)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(definiteArticle, forKey: .definiteArticle)
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
        try container.encodeIfPresent(militaryProfile, forKey: .militaryProfile)
        try container.encodeIfPresent(legislatureProfile, forKey: .legislatureProfile)
        try container.encodeIfPresent(legislatureInitialState, forKey: .legislatureInitialState)
        try container.encodeIfPresent(countryTraits, forKey: .countryTraits)
        try container.encodeIfPresent(populationMillions, forKey: .populationMillions)
        try container.encodeIfPresent(gdpBillions, forKey: .gdpBillions)
        try container.encodeIfPresent(facts, forKey: .facts)
        try container.encodeIfPresent(amounts, forKey: .amounts)
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Country, rhs: Country) -> Bool {
        lhs.id == rhs.id
    }
}

extension Country {
    var resolvedGdpBillions: Double? {
        if let gdp = facts?.economy?.gdpNominalUsd, gdp > 0 { return gdp / 1_000_000_000 }
        if let b = gdpBillions, b > 0 { return b }
        if attributes.gdp > 0 { return Double(attributes.gdp) / 1_000_000_000 }
        if let s = gdp, !s.isEmpty { return Country.parseGdpString(s) }
        return nil
    }

    var resolvedPopulation: Int {
        if let currentPopulation, currentPopulation > 0 { return currentPopulation }
        if let pop = facts?.demographics?.populationTotal, pop > 0 { return pop }
        return attributes.population
    }

    private static func parseGdpString(_ raw: String) -> Double? {
        let s = raw.trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
            .uppercased()
        if s.hasSuffix("T"), let v = Double(s.dropLast()) { return v * 1_000 }
        if s.hasSuffix("B"), let v = Double(s.dropLast()) { return v }
        if s.hasSuffix("M"), let v = Double(s.dropLast()) { return v / 1_000 }
        if let v = Double(s) { return v / 1_000_000_000 }
        return nil
    }

    var flagEmoji: String {
        guard let code = code, code.count == 2 else { return "🌐" }
        let base: UInt32 = 0x1F1E6 - 65
        return String(String.UnicodeScalarView(
            code.uppercased().unicodeScalars.compactMap { UnicodeScalar($0.value + base) }
        ))
    }

    /// Name with a definite article applied when appropriate
    ///
    /// If `definiteArticle` is explicitly provided on the country, it is used.
    /// Otherwise, we fall back to known exceptions (e.g. United States, United Kingdom).
    var nameWithDefiniteArticle: String {
        // If name already includes a definite article, use it as-is
        if name.lowercased().hasPrefix("the ") {
            return name
        }

        if let article = definiteArticle?.trimmingCharacters(in: .whitespacesAndNewlines), !article.isEmpty {
            // If the name already starts with the provided article, just return the name.
            if name.lowercased().hasPrefix(article.lowercased() + " ") {
                return name
            }
            return "\(article) \(name)"
        }

        if let defaultArticle = Country.defaultDefiniteArticle(for: name) {
            return "\(defaultArticle) \(name)"
        }

        return name
    }

    static func defaultDefiniteArticle(for countryName: String) -> String? {
        let normalized = countryName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let definiteArticleCountries: Set<String> = [
            "united states",
            "united kingdom",
            "netherlands",
            "philippines",
            "czech republic",
            "united arab emirates",
            "dominican republic",
            "central african republic",
            "ivory coast",
            "bahamas",
            "gambia",
            "sudan",
            "democratic republic of the congo",
            "republic of the congo"
        ]

        return definiteArticleCountries.contains(normalized) ? "the" : nil
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
    var impeachmentSurvived: Bool = false
    var trustYourGutUsed: Int = 0
    var playedScenarioIds: [String] = []
    var recentActions: [String]?
    var turnDiplomaticActionCount: Int = 0
    var turnMilitaryActionCount: Int = 0
    var infinitePulseEnabled: Bool?
    var lockedMetricIds: [String]?
    var godMode: Bool?
    /// Player's current mood (e.g. "focused", "stressed"). Update frequency throttled via playerActionLastUsedTurn["mood"].
    var playerMood: String? = nil
    /// Last turn when each throttled player action was performed. Keys: "mood", "task", "reminder", "quest". Use GameStore.canPerformPlayerAction/recordPlayerAction so tasks, reminders, quests share the same cooldown pattern and do not conflict.
    var playerActionLastUsedTurn: [String: Int]? = nil
    
    // NEW: Consequences and Special Modes
    var outcomeHistory: [OutcomeRecord]?
    var pendingConsequences: [PendingConsequence]?
    var pendingRetaliations: [PendingRetaliation]?
    var worldConflicts: [WorldConflict]?
    var dickMode: DickModeConfig?
    var aiScenarioQueue: AIScenarioQueue?

    // NEW: Scenario Director memory
    var scenarioDirectorState: ScenarioDirectorState?

    // NEW: Advanced features from web
    var achievements: [String]?
    var milestones: [Milestone]?
    var resources: GameResources?
    var policyBudget: PolicyBudgetState?
    var flags: [String: AnyCodable]?

    // Live dynamic state
    var legislatureState: LegislatureState?
    var countryEconomicState: CountryEconomicState?
    var countryPopulationState: CountryPopulationState?
    var countryMilitaryProfile: MilitaryProfile?
    var countryTraits: [CountryTrait]?
    var activeCrises: [ActiveCrisis] = []

    // Per-game scale factors derived from randomized GDP/population at game init.
    // countryScaleFactor: 0.7 (micro) → 1.0 (medium) → 1.4 (major economy)
    // Controls how strongly metric effects and human impacts are felt.
    var countryScaleFactor: Double?
    var countryAmounts: CountryAmountValues?

    // MARK: - §11 additions: parties, locales, military
    var countryParties: [PoliticalParty] = []
    var activeLocale: SubLocale? = nil
    var countryMilitaryState: CountryMilitaryState? = nil

    // Maps chainId → (tokenRole → resolvedCountryId) for multi-act scenario consistency.
    // Ensures the same country fills each relationship role across all acts of a chain.
    var chainTokenBindings: [String: [String: String]]? = nil
}

extension GameState {
    /// Converts a game turn number to an in-game calendar date.
    /// Turn 1 = startDate (today), turn maxTurns = startDate + termLength.
    /// Adds deterministic per-turn jitter so consecutive articles don't land on the same day.
    func date(forTurn turn: Int) -> Date {
        let base: Date = {
            let fmt = ISO8601DateFormatter()
            fmt.formatOptions = [.withFullDate]
            return startDate.flatMap { fmt.date(from: $0) } ?? Date()
        }()
        let termDays: Int
        switch gameLength ?? "medium" {
        case "short": termDays = 365
        case "long":  termDays = 1460
        default:      termDays = 730
        }
        let safeTurns = max(1, maxTurns)
        let linearDays = Int((Double(min(turn, safeTurns)) / Double(safeTurns)) * Double(termDays))
        let jitter = Int((sin(Double(turn) * 17.3 + 4.7) + 1.0) * 3.5)
        return Calendar.current.date(byAdding: .day, value: linearDays + jitter, to: base) ?? base
    }

    /// Formatted in-game date string for display in news bylines.
    func formattedDate(forTurn turn: Int) -> String {
        date(forTurn: turn).formatted(date: .abbreviated, time: .omitted).uppercased()
    }
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

struct ActiveCrisis: Codable, Identifiable {
    var id: String { crisis.id }
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
    let isBackgroundEvent: Bool?
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
    let policyShifts: [PolicyImplication]?
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

struct ScenarioDirectorState: Codable {
    var recentFingerprints: [[String]]
    var activeThreads: [String]
    var actorMemory: [String: String]

    init() {
        recentFingerprints = []
        activeThreads = []
        actorMemory = [:]
    }
}

struct PendingRetaliation: Codable {
    let id: String
    let triggerTurn: Int
    let countryId: String
    let countryName: String
    let metricDeltas: [String: Double]
    let relationshipDelta: Double
    let headline: String
    let summary: String
}

struct WorldConflict: Codable, Identifiable {
    var id: String
    let actorCountryId: String
    let targetCountryId: String
    let type: String
    let startTurn: Int
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

struct PolicyImplication: Codable {
    let target: String
    let delta: Double
}

// MARK: - Settings
struct FiscalSettings: Codable, Equatable {
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
        spendingMilitary: 25, spendingInfrastructure: 30, spendingSocial: 45
    )
}

struct PolicySettings: Codable, Equatable {
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
    /// Per-metric volatility multiplier (0–2). 1.0 = default. >1 = more reactive, <1 = more stable.
    let metricSensitivities: [String: Double]?
    /// Crisis type likelihood weights (0–1) for this country.
    let crisisProbabilities: [String: Double]?

    enum CodingKeys: String, CodingKey {
        case startingMetrics = "starting_metrics"
        case metricEquilibria = "metric_equilibria"
        case bundleWeightOverrides = "bundle_weight_overrides"
        case priorityTags = "priority_tags"
        case suppressedTags = "suppressed_tags"
        case neighborEventChance = "neighbor_event_chance"
        case metricSensitivities = "metric_sensitivities"
        case crisisProbabilities = "crisis_probabilities"
    }
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

// MARK: - Gender & Names

enum PersonGender: String, Codable, CaseIterable {
    case male
    case female
    case nonbinary
}

struct RegionNamePool: Codable {
    let firstMale: [String]
    let firstFemale: [String]
    let firstNeutral: [String]
    let last: [String]
    let honorifics: Honorifics?

    struct Honorifics: Codable {
        let male: [String]?
        let female: [String]?
        let neutral: [String]?
    }

    enum CodingKeys: String, CodingKey {
        case firstMale = "first_male"
        case firstFemale = "first_female"
        case firstNeutral = "first_neutral"
        case last
        case honorifics
    }
}

// MARK: - Military Branch Model

enum MilitaryBranchId: String, Codable, CaseIterable {
    case army
    case navy
    case airForce = "air_force"
    case marines
    case specialForces = "special_forces"
    case cyberCommand = "cyber_command"
    case spaceCommand = "space_command"
    case coastGuard = "coast_guard"
    case nationalGuard = "national_guard"
    case strategicNuclear = "strategic_nuclear"
    case intelligence
}

enum BranchSize: String, Codable {
    case token, small, medium, large, massive
}

enum EquipmentLevel: String, Codable {
    case obsolete
    case coldWar = "cold_war"
    case modern
    case advanced
    case cuttingEdge = "cutting_edge"
}

enum MilitaryDoctrine: String, Codable {
    case defensive
    case deterrent
    case powerProjection = "power_projection"
    case guerrilla
    case hybrid
}

enum NuclearDoctrine: String, Codable {
    case noFirstUse = "no_first_use"
    case ambiguous
    case launchOnWarning = "launch_on_warning"
}

struct MilitaryCapabilityEntry: Codable, Identifiable {
    let id: String
    let operational: Bool
    var count: Int?
    let quality: Int // 0-100

    enum CodingKeys: String, CodingKey {
        case id, operational, count, quality
    }
}

struct BranchStats: Codable {
    var readiness: Int // 0-100
    let size: BranchSize
    let equipment: EquipmentLevel
    let budgetShare: Double // 0-1
    var capabilities: [MilitaryCapabilityEntry]

    enum CodingKeys: String, CodingKey {
        case readiness, size, equipment
        case budgetShare = "budget_share"
        case capabilities
    }
}

struct NuclearProfile: Codable {
    let warheadCount: Int
    let deliverySystems: [String]
    let triad: Bool
    let doctrine: NuclearDoctrine
    let tacticalWeapons: Bool

    enum CodingKeys: String, CodingKey {
        case warheadCount = "warhead_count"
        case deliverySystems = "delivery_systems"
        case triad, doctrine
        case tacticalWeapons = "tactical_weapons"
    }
}

struct CyberProfile: Codable {
    let offensive: Int // 0-100
    let defensive: Int // 0-100
    let aptCapability: Bool
    let infrastructureTargeting: Bool

    enum CodingKeys: String, CodingKey {
        case offensive, defensive
        case aptCapability = "apt_capability"
        case infrastructureTargeting = "infrastructure_targeting"
    }
}

struct MilitaryProfile: Codable {
    let doctrine: MilitaryDoctrine
    let overallReadiness: Int // 0-100
    var nuclear: NuclearProfile?
    let cyber: CyberProfile
    var branches: [String: BranchStats] // keyed by BranchId raw value

    enum CodingKeys: String, CodingKey {
        case doctrine
        case overallReadiness = "overall_readiness"
        case nuclear, cyber, branches
    }
}

// MARK: - Country Traits & Person Traits

enum TraitDomain: String, Codable {
    case military, economic, diplomatic, geographic, social, technological, governance, crisis
}

struct TraitEffect: Codable {
    var metricEquilibriumShift: [String: Double]?
    var bundleWeightModifier: [String: Double]?
    var capabilityModifier: CapabilityModifier?
    var scenarioConditionTags: [String]?

    struct CapabilityModifier: Codable {
        let branchId: String
        let readinessBonus: Int

        enum CodingKeys: String, CodingKey {
            case branchId = "branch_id"
            case readinessBonus = "readiness_bonus"
        }
    }

    enum CodingKeys: String, CodingKey {
        case metricEquilibriumShift = "metric_equilibrium_shift"
        case bundleWeightModifier = "bundle_weight_modifier"
        case capabilityModifier = "capability_modifier"
        case scenarioConditionTags = "scenario_condition_tags"
    }
}

struct CountryTrait: Codable, Identifiable {
    let id: String
    let label: String
    let type: TraitType
    let domain: TraitDomain
    let effects: TraitEffect
    let description: String

    enum TraitType: String, Codable {
        case strength, weakness
    }
}

struct PersonTraitEffect: Codable {
    var metricModifier: MetricModifier?
    var condition: String?
    var scenarioTagsUnlocked: [String]?
    var corruptionModifier: Double?

    struct MetricModifier: Codable {
        let target: String // MetricId
        let magnitude: Double
    }

    enum CodingKeys: String, CodingKey {
        case metricModifier = "metric_modifier"
        case condition
        case scenarioTagsUnlocked = "scenario_tags_unlocked"
        case corruptionModifier = "corruption_modifier"
    }
}

struct StructuredPersonTrait: Codable, Identifiable {
    let id: String
    let label: String
    let type: CountryTrait.TraitType
    let domain: TraitDomain
    let effect: PersonTraitEffect
    let description: String
}

// MARK: - Extended Person Stats

struct PersonStats: Codable {
    let diplomacy: Double    // 1-10
    let economics: Double    // 1-10
    let military: Double     // 1-10
    let management: Double   // 1-10
    let compassion: Double   // 1-10
    let integrity: Double    // 1-10
    let charisma: Double     // 1-10
    let ideology: Double     // 1-10 (1=progressive/dove, 10=conservative/hawk)
    let corruptionRisk: Double  // 1-10
    let crisisRating: Double    // 1-10

    enum CodingKeys: String, CodingKey {
        case diplomacy, economics, military, management, compassion, integrity, charisma, ideology
        case corruptionRisk = "corruption_risk"
        case crisisRating = "crisis_rating"
    }
}

// MARK: - Legislature Model

enum LegislatureType: String, Codable {
    case bicameral, unicameral
    case noLegislature = "no_legislature"
    case rubberStamp = "rubber_stamp"
}

enum ElectionSystem: String, Codable {
    case firstPastPost = "first_past_post"
    case proportional
    case mixed
    case appointed
}

enum LegislativeRoleType: String, Codable {
    case senator, representative
    case memberOfParliament = "member_of_parliament"
    case deputy, councillor
    case appointedLord = "appointed_lord"
}

struct ChamberProfile: Codable {
    let name: String
    let token: String
    let seatCount: Int
    let termLengthFraction: Double
    let electedPerCycleFraction: Double
    let roleType: LegislativeRoleType
    let partisan: Bool

    enum CodingKeys: String, CodingKey {
        case name, token
        case seatCount = "seat_count"
        case termLengthFraction = "term_length_fraction"
        case electedPerCycleFraction = "elected_per_cycle_fraction"
        case roleType = "role_type"
        case partisan
    }
}

struct LegislatureProfile: Codable {
    let type: LegislatureType
    var upperHouse: ChamberProfile?
    var lowerHouse: ChamberProfile?
    var singleChamber: ChamberProfile?
    let electionSystem: ElectionSystem

    enum CodingKeys: String, CodingKey {
        case type
        case upperHouse = "upper_house"
        case lowerHouse = "lower_house"
        case singleChamber = "single_chamber"
        case electionSystem = "election_system"
    }
}

struct LegislativeBloc: Codable, Identifiable {
    var id: String { party_id + "_" + chamber }
    var partyId: String
    var partyName: String
    let ideologicalPosition: Int // 1-10
    var seatShare: Double // 0-1
    var approvalOfPlayer: Int // 0-100
    let chamber: String // "upper" | "lower" | "single"
    var isRulingCoalition: Bool

    enum CodingKeys: String, CodingKey {
        case partyId = "party_id"
        case partyName = "party_name"
        case ideologicalPosition = "ideological_position"
        case seatShare = "seat_share"
        case approvalOfPlayer = "approval_of_player"
        case chamber
        case isRulingCoalition = "is_ruling_coalition"
    }

    private var party_id: String { partyId }
}

struct LegislativeMemberStats: Codable {
    var influence: Int       // 1-10
    var loyaltyToPlayer: Int // 0-100
    var ideology: Int        // 1-10
    var corruptionRisk: Int  // 1-10

    enum CodingKeys: String, CodingKey {
        case influence
        case loyaltyToPlayer = "loyalty_to_player"
        case ideology
        case corruptionRisk = "corruption_risk"
    }
}

struct LegislativeMember: Codable, Identifiable {
    let id: String
    var name: String
    let gender: PersonGender
    let roleType: LegislativeRoleType
    let chamber: String
    let partyId: String
    var tenureStartTurn: Int
    var tenureEndTurn: Int
    var stats: LegislativeMemberStats
    let title: String
    var subdivision: String?

    enum CodingKeys: String, CodingKey {
        case id, name, gender
        case roleType = "role_type"
        case chamber
        case partyId = "party_id"
        case tenureStartTurn = "tenure_start_turn"
        case tenureEndTurn = "tenure_end_turn"
        case stats, title, subdivision
    }
}

struct LegislatureState: Codable {
    var composition: [LegislativeBloc]
    var approvalOfPlayer: Int     // 0-100 aggregate
    var lastElectionTurn: Int
    var nextElectionTurn: Int
    var gridlockLevel: Int        // 0-100
    var coalitionFragility: Int   // 0-100
    var notableMembers: [LegislativeMember]

    enum CodingKeys: String, CodingKey {
        case composition
        case approvalOfPlayer = "approval_of_player"
        case lastElectionTurn = "last_election_turn"
        case nextElectionTurn = "next_election_turn"
        case gridlockLevel = "gridlock_level"
        case coalitionFragility = "coalition_fragility"
        case notableMembers = "notable_members"
    }

    init(
        composition: [LegislativeBloc],
        approvalOfPlayer: Int,
        lastElectionTurn: Int,
        nextElectionTurn: Int,
        gridlockLevel: Int,
        coalitionFragility: Int = 0,
        notableMembers: [LegislativeMember]
    ) {
        self.composition = composition
        self.approvalOfPlayer = approvalOfPlayer
        self.lastElectionTurn = lastElectionTurn
        self.nextElectionTurn = nextElectionTurn
        self.gridlockLevel = gridlockLevel
        self.coalitionFragility = coalitionFragility
        self.notableMembers = notableMembers
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        composition = try c.decode([LegislativeBloc].self, forKey: .composition)
        approvalOfPlayer = try c.decode(Int.self, forKey: .approvalOfPlayer)
        lastElectionTurn = try c.decode(Int.self, forKey: .lastElectionTurn)
        nextElectionTurn = try c.decode(Int.self, forKey: .nextElectionTurn)
        gridlockLevel = try c.decode(Int.self, forKey: .gridlockLevel)
        coalitionFragility = (try? c.decodeIfPresent(Int.self, forKey: .coalitionFragility)) ?? 0
        notableMembers = (try? c.decode([LegislativeMember].self, forKey: .notableMembers)) ?? []
    }
}

// MARK: - Live Economic & Population State

struct CountryEconomicState: Codable {
    var gdpIndex: Double          // starts 100.0, moves ±
    var gdpGrowthRate: Double     // per-turn %
    var inflationRate: Double     // mirrors metric_inflation
    var tradeBalance: Double      // surplus/deficit index
    var unemploymentRate: Double  // mirrors metric_employment
    var fiscalReserves: Double    // accumulated surplus/deficit
    var baseGdpBillions: Double   // snapshot at game start (raw country fact)
    var randomizedGdpBillions: Double  // per-game randomized GDP (±15%)

    enum CodingKeys: String, CodingKey {
        case gdpIndex = "gdp_index"
        case gdpGrowthRate = "gdp_growth_rate"
        case inflationRate = "inflation_rate"
        case tradeBalance = "trade_balance"
        case unemploymentRate = "unemployment_rate"
        case fiscalReserves = "fiscal_reserves"
        case baseGdpBillions = "base_gdp_billions"
        case randomizedGdpBillions = "randomized_gdp_billions"
    }

    var currentGdpBillions: Double {
        baseGdpBillions * (gdpIndex / 100.0)
    }
}

struct CountryPopulationState: Codable {
    var populationMillions: Double
    var randomizedPopulationMillions: Double  // per-game randomized (±10%)
    var growthRatePerTurn: Double      // ~0.0002 baseline
    var displacedMillions: Double
    var cumulativeCasualties: Double   // thousands
    var emigrationRate: Double         // 0-1
    var medianAge: Double

    enum CodingKeys: String, CodingKey {
        case populationMillions = "population_millions"
        case randomizedPopulationMillions = "randomized_population_millions"
        case growthRatePerTurn = "growth_rate_per_turn"
        case displacedMillions = "displaced_millions"
        case cumulativeCasualties = "cumulative_casualties"
        case emigrationRate = "emigration_rate"
        case medianAge = "median_age"
    }

    var displacedRatio: Double {
        guard populationMillions > 0 else { return 0 }
        return displacedMillions / populationMillions
    }
}

// MARK: - SubLocale

struct SubLocale: Codable, Identifiable {
    let id: String
    let countryId: String
    let name: String
    let type: String
    let populationMillions: Double
    let economicWeight: Double
    let politicalSensitivity: Int
    let tags: [String]
    let localeTokens: LocaleTokens

    struct LocaleTokens: Codable {
        let localeName: String
        let localeType: String
        let regionType: String
        let terrain: String

        enum CodingKeys: String, CodingKey {
            case localeName = "locale_name"
            case localeType = "locale_type"
            case regionType = "region_type"
            case terrain
        }
    }

    enum CodingKeys: String, CodingKey {
        case id
        case countryId = "countryId"
        case name, type, tags
        case populationMillions = "population_millions"
        case economicWeight = "economic_weight"
        case politicalSensitivity = "political_sensitivity"
        case localeTokens = "locale_tokens"
    }
}

// MARK: - PoliticalParty

struct PoliticalParty: Codable, Identifiable {
    let id: String
    let countryId: String
    let name: String
    let shortName: String?
    let ideology: Int           // 1=far-left, 5=center, 10=far-right
    let foundingYear: Int?
    let isRuling: Bool
    let isCoalitionMember: Bool
    let isMainOpposition: Bool?
    let currentLeader: String?
    let color: String?          // hex e.g. "#0047AB"
    let keyPolicies: [String]
    let description: String
    /// -1 to +1 per metric: how strongly the party base cares about each metric direction.
    let metricBiases: [String: Double]?
    /// Demographic groups that form this party's base (e.g. ["urban", "youth", "minority"]).
    let popularBase: [String]?
    /// 0–1: likelihood the party will cooperate in coalition arrangements.
    let coalitionWillingness: Double?
    let suggestedSkills: [String]?

    enum CodingKeys: String, CodingKey {
        case id, name, description, color, ideology
        case countryId
        case shortName = "shortName"
        case foundingYear = "foundingYear"
        case isRuling = "isRuling"
        case isCoalitionMember = "isCoalitionMember"
        case isMainOpposition = "isMainOpposition"
        case currentLeader = "currentLeader"
        case keyPolicies = "keyPolicies"
        case metricBiases = "metricBiases"
        case popularBase = "popularBase"
        case coalitionWillingness = "coalitionWillingness"
        case suggestedSkills = "suggestedSkills"
    }

    var ideologyLabel: String {
        switch ideology {
        case 1: return "far-left"
        case 2: return "left"
        case 3: return "centre-left"
        case 4: return "centre-left"
        case 5: return "centre"
        case 6: return "centre-right"
        case 7: return "centre-right"
        case 8: return "right"
        case 9: return "right-wing"
        case 10: return "far-right"
        default: return "centrist"
        }
    }
}

// MARK: - University (full struct — augments AppConfig string arrays)

struct UniversityRecord: Codable, Identifiable {
    let id: String
    let name: String
    let countryId: String?
    let region: String
    let prestige: Int           // 1–10
    let foundingYear: Int?
    let specializations: [String]
    let isNotable: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, region, prestige, specializations
        case countryId
        case foundingYear = "foundingYear"
        case isNotable = "isNotable"
    }
}

// MARK: - CountryMilitaryState (new subcollection format from seed-military.ts)

struct MilitaryBranchData: Codable {
    let canonicalType: String   // CanonicalBranchType raw string
    let localName: String
    let tokenKey: String        // e.g. "ground_forces_branch", "maritime_branch"
    var readiness: Int          // 0–100
    let size: Int               // personnel in thousands
    let equipmentLevel: Int     // 0–100
    let foundedYear: Int?

    enum CodingKeys: String, CodingKey {
        case localName = "local_name"
        case tokenKey = "token_key"
        case readiness
        case size
        case equipmentLevel = "equipment_level"
        case foundedYear = "founded_year"
        case canonicalType = "canonical_type"
    }
}

struct NuclearCapabilityData: Codable {
    let warheads: Int
    let triad: Bool
    let doctrine: String
    let systems: [String]
}

struct CyberCapabilityData: Codable {
    let readiness: Int
    let offensiveCapability: Int
    let defensiveCapability: Int
    let hasApt: Bool
    let knownAptGroups: [String]?

    enum CodingKeys: String, CodingKey {
        case readiness
        case offensiveCapability = "offensive_capability"
        case defensiveCapability = "defensive_capability"
        case hasApt = "has_apt"
        case knownAptGroups = "known_apt_groups"
    }
}

struct CountryMilitaryState: Codable {
    let branches: [MilitaryBranchData]
    let nuclearProfile: NuclearCapabilityData?
    let cyberProfile: CyberCapabilityData
    let overallReadiness: Int
    let activeConflicts: [String]
    let lastUpdatedTurn: Int

    enum CodingKeys: String, CodingKey {
        case branches
        case nuclearProfile = "nuclear_profile"
        case cyberProfile = "cyber_profile"
        case overallReadiness = "overall_readiness"
        case activeConflicts = "active_conflicts"
        case lastUpdatedTurn = "last_updated_turn"
    }
}

// MARK: - World Simulation

struct FirebaseWorldEvent: Identifiable, Codable {
    let id: String
    let timestamp: String
    let actorCountryId: String
    let actorCountryName: String
    let targetCountryId: String
    let targetCountryName: String
    let actionType: String
    let actionCategory: String
    let severity: String
    let headline: String
    let summary: String
    let context: String
    let newsCategory: String
    let newsTags: [String]
    let globalMetricDeltas: [MetricDelta]
    let regionId: String?
    let isBreakingNews: Bool

    enum CodingKeys: String, CodingKey {
        case id, timestamp, headline, summary, context, severity, regionId
        case actorCountryId, actorCountryName, targetCountryId, targetCountryName
        case actionType, actionCategory, newsCategory, newsTags
        case globalMetricDeltas, isBreakingNews
    }
}

struct CountryWorldStateRelationship: Codable {
    let countryId: String
    let type: String
    let strength: Double
    let sharedBorder: Bool
}

struct ActiveEventFlagEntry: Codable {
    let startedAt: Double
    let expiresAt: Double
    let severity: Double
}

struct RecentEventHistoryEntry: Codable {
    let flag: String
    let turn: Int
    let scenarioId: String?
}

struct CountryWorldState: Identifiable, Codable {
    var id: String { countryId }
    let countryId: String
    let currentMetrics: [String: Double]
    let relationships: [CountryWorldStateRelationship]
    let lastTickAt: String
    let generation: Int
    let recentScenarioIds: [String]
    let activeEventFlags: [String: ActiveEventFlagEntry]?
    let recentEventHistory: [RecentEventHistoryEntry]?

    enum CodingKeys: String, CodingKey {
        case countryId, currentMetrics, relationships, lastTickAt, generation, recentScenarioIds
        case activeEventFlags, recentEventHistory
    }
}

// MARK: - Shared formatting utilities

enum GameFormat {
    static func money(_ value: Double) -> String {
        if value >= 1_000_000_000_000 { return String(format: "$%.2fT", value / 1_000_000_000_000) }
        if value >= 1_000_000_000     { return String(format: "$%.1fB", value / 1_000_000_000) }
        if value >= 1_000_000         { return String(format: "$%.0fM", value / 1_000_000) }
        return String(format: "$%.0fK", value / 1_000)
    }

    static func population(_ pop: Double) -> String {
        if pop >= 1_000_000_000 { return String(format: "%.2fB", pop / 1_000_000_000) }
        if pop >= 1_000_000     { return String(format: "%.1fM", pop / 1_000_000) }
        if pop >= 1_000         { return String(format: "%.0fK", pop / 1_000) }
        return "\(Int(pop))"
    }
}
