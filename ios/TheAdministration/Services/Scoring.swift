import Foundation

/// ScoringEngine
/// Applies scenario option effects, advances turns, and calculates metric and
/// approval changes for The Administration iOS client.
class ScoringEngine {
    static let INITIAL_METRIC_VALUE: Double = 50.0
    static let MAX_METRIC_CHANGE_BASE: Double = 4.5  // FIXED: Web uses 4.5, not 6.8

    private static let METRIC_IDS: [String: String] = [
        "approval": "metric_approval",
        "relations": "metric_foreign_relations",
        "foreign_relations": "metric_foreign_relations",
        "control": "metric_public_order",
        "public_order": "metric_public_order",
        "order": "metric_public_order",
        "economy": "metric_economy",
        "military": "metric_military",
        "health": "metric_health",
        "environment": "metric_environment",
        "innovation": "metric_innovation",
        "equality": "metric_equality",
        "liberty": "metric_liberty",
        "infrastructure": "metric_infrastructure",
        "employment": "metric_employment",
        "education": "metric_education",
        "bureaucracy": "metric_bureaucracy",
        "trade": "metric_trade",
        "inflation": "metric_inflation",
        "corruption": "metric_corruption",
        "energy": "metric_energy",
        "housing": "metric_housing",
        "crime": "metric_crime"
    ]

    private struct MetricSwingRange {
        let minor: (Double, Double)
        let moderate: (Double, Double)
        let major: (Double, Double)
    }

    private static let DEFAULT_RANGE = MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.6), major: (2.7, 4.2))

    private static let METRIC_SWING_RANGES: [String: MetricSwingRange] = [
        "metric_approval": MetricSwingRange(minor: (0.4, 1.1), moderate: (1.2, 2.4), major: (2.5, 4.0)),
        "metric_economy": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.3), major: (2.4, 3.8)),
        "metric_public_order": MetricSwingRange(minor: (0.4, 1.2), moderate: (1.3, 2.6), major: (2.7, 4.2)),
        "metric_health": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.4), major: (2.5, 4.0)),
        "metric_education": MetricSwingRange(minor: (0.2, 0.9), moderate: (1.0, 2.1), major: (2.2, 3.5)),
        "metric_infrastructure": MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.5), major: (2.6, 4.0)),
        "metric_environment": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.3), major: (2.4, 3.8)),
        "metric_foreign_relations": MetricSwingRange(minor: (0.4, 1.4), moderate: (1.5, 2.8), major: (2.9, 4.4)),
        "metric_military": MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.5), major: (2.6, 4.0)),
        "metric_liberty": MetricSwingRange(minor: (0.4, 1.2), moderate: (1.3, 2.6), major: (2.7, 4.0)),
        "metric_equality": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.3), major: (2.4, 3.8)),
        "metric_corruption": MetricSwingRange(minor: (0.2, 0.9), moderate: (1.0, 2.1), major: (2.2, 3.4)),
        "metric_employment": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.3), major: (2.4, 3.8)),
        "metric_inflation": MetricSwingRange(minor: (0.2, 0.8), moderate: (0.9, 1.8), major: (1.9, 3.0)),
        "metric_innovation": MetricSwingRange(minor: (0.4, 1.2), moderate: (1.3, 2.5), major: (2.6, 3.9)),
        "metric_trade": MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.4), major: (2.5, 3.9)),
        "metric_energy": MetricSwingRange(minor: (0.3, 1.2), moderate: (1.3, 2.6), major: (2.7, 4.1)),
        "metric_housing": MetricSwingRange(minor: (0.3, 1.0), moderate: (1.1, 2.3), major: (2.4, 3.8)),
        "metric_crime": MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.4), major: (2.5, 3.9)),
        "metric_bureaucracy": MetricSwingRange(minor: (0.2, 0.8), moderate: (0.9, 1.9), major: (2.0, 3.1))
    ]

    private static func clampMetricInt(_ value: Double) -> Double {
        let n = value.isFinite ? value : INITIAL_METRIC_VALUE
        return max(0, min(100, Double(Int(n.rounded()))))
    }
    
    static func isInverseMetric(_ metricId: String) -> Bool {
        let inverseMetrics = ["metric_corruption", "metric_inflation", "metric_pollution", "metric_inequality", "metric_crime"]
        return inverseMetrics.contains(metricId)
    }

    static func applyJitter(_ value: Double, isProcessing: Bool = false) -> Double {
        // UPDATED: Match web implementation exactly (from scoring.ts lines 41-62)
        let baseJitter = (Double.random(in: 0...1) * 0.34) - 0.17
        let varianceMultiplier = isProcessing 
            ? (Double.random(in: 0...1) * 0.28) + 0.86 
            : (Double.random(in: 0...1) * 0.24) + 0.88
        let microVariance = (Double.random(in: 0...1) * 0.11) - 0.055
        var newValue = value * varianceMultiplier + baseJitter + microVariance
        
        // Web uses < 0.08 || > 0.92 (not 0.12/0.88)
        let remainder = abs(newValue.truncatingRemainder(dividingBy: 1))
        if remainder < 0.08 || remainder > 0.92 {
            let antiRoundJitter = (Double.random(in: 0...1) * 0.23) - 0.115
            newValue += antiRoundJitter
        }
        
        // Web uses < 0.15 || > 4.85 (not 0.22/4.78)
        let modFive = abs(newValue.truncatingRemainder(dividingBy: 5))
        if modFive < 0.15 || modFive > 4.85 {
            let antiFiveJitter = (Double.random(in: 0...1) * 0.42) - 0.21
            newValue += antiFiveJitter
        }
        
        return newValue
    }
    
    static func mapMetricNameToId(_ metricName: String) -> String {
        if metricName.hasPrefix("metric_") {
            return metricName
        }
        
        let normalized = metricName.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        return METRIC_IDS[normalized] ?? "metric_\(normalized)"
    }

    private static func selectBucket(_ magnitude: Double) -> String {
        if magnitude < 2 { return "minor" }
        if magnitude < 5 { return "moderate" }
        return "major"
    }

    private static func normalizeEffectValue(targetMetricId: String?, rawValue: Double?) -> Double {
        let value = rawValue?.isFinite == true ? rawValue! : 0
        let sign: Double = value >= 0 ? 1 : -1
        let magnitude = abs(value)
        let bucket = selectBucket(magnitude)
        let range = METRIC_SWING_RANGES[targetMetricId ?? ""] ?? DEFAULT_RANGE
        let chosen: (Double, Double)
        switch bucket {
        case "minor": chosen = range.minor
        case "moderate": chosen = range.moderate
        default: chosen = range.major
        }
        let jitter = chosen.0 + Double.random(in: 0...1) * (chosen.1 - chosen.0)
        return (sign * jitter * 100).rounded() / 100
    }

    private static func severityMultiplier(_ severity: SeverityLevel?, kind: String) -> Double {
        let base: Double
        switch severity {
        case .high: base = 0.005
        case .medium: base = 0.001
        case .extreme: base = 0.03
        default: base = 0.0001
        }
        return kind == "displaced" ? base * 4 : base
    }

    static func clampHumanImpact(population: Double, requested: Double?, severity: SeverityLevel?, kind: String) -> Double {
        let multiplier = severityMultiplier(severity, kind: kind)
        let derived = population * multiplier * ((Double.random(in: 0...1) * 0.4) + 0.8)
        
        let target = (requested != nil && requested! > derived) ? requested! : derived
        let cap = population * multiplier * 5
        let value = min(max(0, target), cap)
        return value.rounded()
    }
    
    static func deriveSecondaryImpacts(_ primaryEffects: [String: Double]) -> [String: Double] {
        var secondary: [String: Double] = [:]
        
        func findMetricKey(_ searchTerms: [String]) -> String? {
            return primaryEffects.keys.first { key in
                searchTerms.contains { term in
                    key.lowercased().contains(term.lowercased())
                }
            }
        }
        
        if let militaryKey = findMetricKey(["military"]) {
            let militaryChange = primaryEffects[militaryKey] ?? 0
            if abs(militaryChange) > 2 {
                let economyKey = findMetricKey(["economy"]) ?? "metric_economy"
                let relationsKey = findMetricKey(["relations", "foreign"]) ?? "metric_foreign_relations"
                let economyJitter = (Double.random(in: 0...1) * 0.13) - 0.065
                let relationsJitter = (Double.random(in: 0...1) * 0.15) - 0.075
                secondary[economyKey] = (secondary[economyKey] ?? 0) - abs(militaryChange) * (0.25 + economyJitter * 0.1)
                secondary[relationsKey] = (secondary[relationsKey] ?? 0) - abs(militaryChange) * (0.3 + relationsJitter * 0.1)
            }
        }
        
        if let relationsKey = findMetricKey(["relations", "foreign"]) {
            let relationsChange = primaryEffects[relationsKey] ?? 0
            if abs(relationsChange) > 2 {
                let economyKey = findMetricKey(["economy"]) ?? "metric_economy"
                let approvalKey = findMetricKey(["approval"]) ?? "metric_approval"
                let economyJitter = (Double.random(in: 0...1) * 0.11) - 0.055
                let approvalJitter = (Double.random(in: 0...1) * 0.09) - 0.045
                if relationsChange < 0 {
                    secondary[economyKey] = (secondary[economyKey] ?? 0) + relationsChange * (0.2 + economyJitter * 0.1)
                    secondary[approvalKey] = (secondary[approvalKey] ?? 0) + relationsChange * (0.12 + approvalJitter * 0.1)
                } else {
                    secondary[economyKey] = (secondary[economyKey] ?? 0) + relationsChange * (0.15 + economyJitter * 0.1)
                    secondary[approvalKey] = (secondary[approvalKey] ?? 0) + relationsChange * (0.08 + approvalJitter * 0.1)
                }
            }
        }
        
        if let economyKey = findMetricKey(["economy"]) {
            let economyChange = primaryEffects[economyKey] ?? 0
            if abs(economyChange) > 2 {
                let approvalKey = findMetricKey(["approval"]) ?? "metric_approval"
                let controlKey = findMetricKey(["order", "control", "public"]) ?? "metric_public_order"
                let approvalJitter = (Double.random(in: 0...1) * 0.12) - 0.06
                let controlJitter = (Double.random(in: 0...1) * 0.1) - 0.05
                secondary[approvalKey] = (secondary[approvalKey] ?? 0) + economyChange * (0.15 + approvalJitter * 0.1)
                if economyChange > 0 {
                    secondary[controlKey] = (secondary[controlKey] ?? 0) + economyChange * (0.08 + controlJitter * 0.1)
                } else {
                    secondary[controlKey] = (secondary[controlKey] ?? 0) + economyChange * (0.12 + controlJitter * 0.1)
                }
            }
        }
        
        if let controlKey = findMetricKey(["control", "order", "public"]) {
            let controlChange = primaryEffects[controlKey] ?? 0
            if abs(controlChange) > 2 {
                let approvalKey = findMetricKey(["approval"]) ?? "metric_approval"
                let approvalJitter = (Double.random(in: 0...1) * 0.14) - 0.07
                let multiplier = controlChange > 0 ? (0.12 + approvalJitter * 0.1) : (0.2 + approvalJitter * 0.1)
                secondary[approvalKey] = (secondary[approvalKey] ?? 0) + controlChange * multiplier
            }
        }
        
        if let healthKey = findMetricKey(["health"]) {
            let healthChange = primaryEffects[healthKey] ?? 0
            if abs(healthChange) > 2 {
                let approvalKey = findMetricKey(["approval"]) ?? "metric_approval"
                let economyKey = findMetricKey(["economy"]) ?? "metric_economy"
                let approvalJitter = (Double.random(in: 0...1) * 0.08) - 0.04
                let economyJitter = (Double.random(in: 0...1) * 0.11) - 0.055
                secondary[approvalKey] = (secondary[approvalKey] ?? 0) + healthChange * (0.1 + approvalJitter * 0.1)
                if healthChange < 0 {
                    secondary[economyKey] = (secondary[economyKey] ?? 0) + healthChange * (0.15 + economyJitter * 0.1)
                }
            }
        }
        
        let granularThreshold = 0.27 + (Double.random(in: 0...1) * 0.08)
        secondary = secondary.filter { abs($0.value) >= granularThreshold }
        
        return secondary
    }
    
    static func applyDecision(state: GameState, option: Option) -> GameState {
        var newState = state
        
        let scenario = state.currentScenario
        let metricsBefore = state.metrics
        
        newState.activeEffects = state.activeEffects
        newState.countries = state.countries

        if !option.effects.isEmpty {
            for effect in option.effects {
                let normalizedValue = normalizeEffectValue(targetMetricId: effect.targetMetricId, rawValue: effect.value)
                if Double.random(in: 0...1) <= effect.probability {
                    let jitteredValue = applyJitter(normalizedValue)
                    let activeEffect = ActiveEffect(
                        baseEffect: Effect(
                            targetMetricId: effect.targetMetricId,
                            value: jitteredValue,
                            duration: effect.duration,
                            probability: effect.probability,
                            delay: effect.delay
                        ),
                        remainingDuration: effect.duration
                    )
                    newState.activeEffects.append(activeEffect)
                }
            }
        } else if let effectsMap = option.effectsMap {
            var primaryEffects: [String: Double] = [:]
            for (metricId, value) in effectsMap {
                let targetId = mapMetricNameToId(metricId)
                let normalizedValue = normalizeEffectValue(targetMetricId: targetId, rawValue: value)
                primaryEffects[targetId] = normalizedValue
                let activeEffect = ActiveEffect(
                    baseEffect: Effect(targetMetricId: targetId, value: applyJitter(normalizedValue), duration: 1, probability: 1, delay: nil),
                    remainingDuration: 1
                )
                newState.activeEffects.append(activeEffect)
            }

            let secondary = deriveSecondaryImpacts(primaryEffects)
            for (metricId, value) in secondary {
                let targetId = mapMetricNameToId(metricId)
                let activeEffect = ActiveEffect(
                    baseEffect: Effect(targetMetricId: targetId, value: applyJitter(value), duration: 1, probability: 1, delay: nil),
                    remainingDuration: 1
                )
                newState.activeEffects.append(activeEffect)
            }
        }

        var relationshipChangesMap: [String: Double] = [:]
        if let relationshipImpact = option.relationshipImpact {
            for (countryId, delta) in relationshipImpact {
                relationshipChangesMap[countryId, default: 0] += delta
            }
        }
        if let relationshipEffects = option.relationshipEffects {
            for (countryId, delta) in relationshipEffects {
                relationshipChangesMap[countryId, default: 0] += delta
            }
        }

        for (countryId, delta) in relationshipChangesMap {
            if let idx = newState.countries.firstIndex(where: { $0.id == countryId }) {
                var country = newState.countries[idx]
                let oldRelationship = country.diplomacy.relationship
                let newRelationship = max(-100, min(100, oldRelationship + delta))
                country.diplomacy = DiplomaticStats(relationship: newRelationship, alignment: country.diplomacy.alignment, tradeAgreements: country.diplomacy.tradeAgreements, tradeRelationships: country.diplomacy.tradeRelationships)
                newState.countries[idx] = country
            }
        }

        if let populationImpact = option.populationImpact {
            let severity = option.severity ?? state.currentScenario?.severity
            for impact in populationImpact {
                if let idx = newState.countries.firstIndex(where: { $0.id == impact.countryId }) {
                    var country = newState.countries[idx]
                    let baselinePop = Double(country.currentPopulation ?? country.attributes.population)
                    let casualties = clampHumanImpact(population: baselinePop, requested: impact.casualties, severity: impact.severity ?? severity, kind: "casualty")
                    let displaced = clampHumanImpact(population: baselinePop, requested: impact.displaced, severity: impact.severity ?? severity, kind: "displaced")
                    let remaining = max(0, baselinePop - casualties)
                    country.currentPopulation = Int(remaining)
                    country.attributes = CountryAttributes(population: Int(remaining), gdp: country.attributes.gdp)
                    
                    // Diplomatic penalty from casualties/displacement
                    let casualtyRate = casualties / max(1, baselinePop)
                    let displacementRate = displaced / max(1, baselinePop)
                    let casualtyPenalty = casualties > 0 ? -20 - (casualtyRate * 200) : 0
                    let displacementPenalty = displaced > 0 ? -5 - (displacementRate * 50) : 0
                    let totalRelationshipDelta = (casualtyPenalty + displacementPenalty).rounded()
                    
                    if totalRelationshipDelta != 0 {
                        let oldRel = country.diplomacy.relationship
                        let newRel = max(-100, min(100, oldRel + totalRelationshipDelta))
                        country.diplomacy = DiplomaticStats(relationship: newRel, alignment: country.diplomacy.alignment, tradeAgreements: country.diplomacy.tradeAgreements, tradeRelationships: country.diplomacy.tradeRelationships)
                        
                        // Propagate to allies
                        if let militaryAlliances = country.alliances?.military {
                            for allianceId in militaryAlliances {
                                // Find all countries in this alliance
                                for otherIdx in 0..<newState.countries.count {
                                    var otherCountry = newState.countries[otherIdx]
                                    if otherCountry.id != country.id && (otherCountry.alliances?.military?.contains(allianceId) ?? false) {
                                        let allyPenalty = (totalRelationshipDelta * 0.4).rounded()
                                        let oldAllyRel = otherCountry.diplomacy.relationship
                                        let newAllyRel = max(-100, min(100, oldAllyRel + allyPenalty))
                                        otherCountry.diplomacy = DiplomaticStats(relationship: newAllyRel, alignment: otherCountry.diplomacy.alignment, tradeAgreements: otherCountry.diplomacy.tradeAgreements, tradeRelationships: otherCountry.diplomacy.tradeRelationships)
                                        newState.countries[otherIdx] = otherCountry
                                    }
                                }
                            }
                        }
                    }
                    
                    newState.countries[idx] = country

                    let displacementImpact = min(displaced, remaining * 0.05)
                    let orderDelta = -(displacementImpact / max(1, baselinePop)) * 50
                    let approvalDelta = -(casualties / max(1, baselinePop)) * 65
                    newState.activeEffects.append(ActiveEffect(baseEffect: Effect(targetMetricId: "metric_public_order", value: applyJitter(orderDelta), duration: 1, probability: 1, delay: nil), remainingDuration: 1))
                    newState.activeEffects.append(ActiveEffect(baseEffect: Effect(targetMetricId: "metric_approval", value: applyJitter(approvalDelta), duration: 1, probability: 1, delay: nil), remainingDuration: 1))
                }
            }
        }

        if let economicImpact = option.economicImpact {
            for impact in economicImpact {
                if let gdpDelta = impact.gdpDelta {
                    newState.activeEffects.append(ActiveEffect(baseEffect: Effect(targetMetricId: "metric_economy", value: applyJitter(gdpDelta), duration: 1, probability: 1, delay: nil), remainingDuration: 1))
                }
                if let tradeDelta = impact.tradeDelta {
                    newState.activeEffects.append(ActiveEffect(baseEffect: Effect(targetMetricId: "metric_trade", value: applyJitter(tradeDelta), duration: 1, probability: 1, delay: nil), remainingDuration: 1))
                }
                if let energyDelta = impact.energyDelta {
                    newState.activeEffects.append(ActiveEffect(baseEffect: Effect(targetMetricId: "metric_energy", value: applyJitter(energyDelta), duration: 1, probability: 1, delay: nil), remainingDuration: 1))
                }
            }
        }

        // Calculate metric deltas for history
        var metricDeltas: [String: Double] = [:]
        for (metricId, value) in newState.metrics {
            let before = metricsBefore[metricId] ?? INITIAL_METRIC_VALUE
            let delta = value - before
            if abs(delta) > 0.01 {
                metricDeltas[metricId] = delta
            }
        }
        
        // Record outcome and consequences
        if let currentScenario = scenario {
            recordOutcome(state: &newState, scenario: currentScenario, option: option, metricDeltas: metricDeltas)
        }

        return advanceTurn(state: newState, lastScenario: state.currentScenario, lastOption: option)
    }

    static func generateBriefingForDecision(option: Option, metricDeltas: [String: Double]) -> Briefing {
        var title = option.outcomeHeadline ?? "Directive Implemented"
        var description = option.outcomeSummary ?? ""
        
        if description.isEmpty {
            // Pick a primary delta
            let primary = metricDeltas.sorted { abs($0.value) > abs($1.value) }.first
            if let primary = primary {
                let isInverse = isInverseMetric(primary.key)
                let isGood = isInverse ? primary.value < 0 : primary.value > 0
                let metricLabel = primary.key.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ")
                
                if isGood {
                    title = "\(metricLabel.capitalized) Improving"
                    description = "Your recent decision has led to positive movement in \(metricLabel). The administration's approach is yielding results."
                } else {
                    title = "\(metricLabel.capitalized) Under Pressure"
                    description = "We are seeing some negative pressure on \(metricLabel) following the latest directive. We should monitor this closely."
                }
            } else {
                description = "The directive has been successfully implemented. Monitoring long-term impacts across all sectors."
            }
        }
        
        if let context = option.outcomeContext {
            description += "\n\n\(context)"
        }
        
        return Briefing(title: title, description: description, metrics: [], boosts: [])
    }
    
    struct Briefing {
        let title: String
        let description: String
        let metrics: [MetricDelta]
        let boosts: [Boost]
    }
    
    struct MetricDelta {
        let id: String
        let delta: Double
        let name: String
        let cabinetOffset: Double?
        let playerOffset: Double?
        let netChange: Double?
    }
    
    struct Boost {
        let memberName: String
        let role: String
        let contribution: String
    }

    static func recordOutcome(state: inout GameState, scenario: Scenario, option: Option, metricDeltas: [String: Double]) {
        if state.outcomeHistory == nil {
            state.outcomeHistory = []
        }
        
        let record = OutcomeRecord(
            turn: state.turn,
            scenarioId: scenario.id,
            optionId: option.id,
            optionText: option.text,
            metricDeltas: metricDeltas,
            consequenceScenarioIds: option.consequenceScenarioIds
        )
        
        state.outcomeHistory?.append(record)
        
        // Register pending consequences
        if let consequenceIds = option.consequenceScenarioIds, !consequenceIds.isEmpty {
            if state.pendingConsequences == nil {
                state.pendingConsequences = []
            }
            
            let delayTurns = option.consequenceDelay ?? 2
            
            for cid in consequenceIds {
                let pending = PendingConsequence(
                    scenarioId: cid,
                    triggerTurn: state.turn + delayTurns,
                    sourceTurn: state.turn,
                    sourceOptionId: option.id,
                    probability: 0.7
                )
                state.pendingConsequences?.append(pending)
            }
        }
    }
    
    static func cleanupExpiredConsequences(state: inout GameState) {
        guard let pending = state.pendingConsequences else { return }
        state.pendingConsequences = pending.filter { $0.triggerTurn >= state.turn }
    }
    
    static func findApplicableConsequence(state: inout GameState, availableScenarios: [Scenario]) -> Scenario? {
        guard let readyConsequences = state.pendingConsequences?.filter({ $0.triggerTurn == state.turn }), !readyConsequences.isEmpty else {
            return nil
        }
        
        for consequence in readyConsequences {
            if Double.random(in: 0...1) > consequence.probability {
                continue
            }
            
            if let scenario = availableScenarios.first(where: { $0.id == consequence.scenarioId }) {
                // Remove from pending
                state.pendingConsequences = state.pendingConsequences?.filter { 
                    $0.scenarioId != consequence.scenarioId || $0.triggerTurn != state.turn 
                }
                return scenario
            }
        }
        
        return nil
    }
    
    static func selectScenarioWithConsequences(state: inout GameState, availableScenarios: [Scenario]) -> Scenario {
        cleanupExpiredConsequences(state: &state)
        
        if Double.random(in: 0...1) < 0.6 {
            if let consequence = findApplicableConsequence(state: &state, availableScenarios: availableScenarios) {
                return consequence
            }
        }
        
        return availableScenarios.randomElement() ?? availableScenarios[0]
    }
    
    static func advanceTurn(state: GameState, lastScenario: Scenario? = nil, lastOption: Option? = nil) -> GameState {
        var newState = state
        newState.turn += 1
        
        // Normalize starting offsets over a portion of the game length
        if var offsets = newState.metricOffsets {
            let normalizationWindow = max(5.0, Double(state.maxTurns) * 0.25)
            for (metricId, offset) in offsets {
                if offset > 0.01 {
                    let decay = offset / normalizationWindow
                    let newOffset = max(0, offset - decay)
                    offsets[metricId] = newOffset
                    
                    if let currentVal = newState.metrics[metricId] {
                        newState.metrics[metricId] = max(0, min(100, currentVal - decay))
                    }
                }
            }
            newState.metricOffsets = offsets
        }
        
        var metricDeltas: [String: Double] = [:]
        var cabinetOffsets: [String: Double] = [:]
        var playerOffsets: [String: Double] = [:]
        var baseEffectValues: [String: Double] = [:]
        var directApprovalEffect = (value: 0.0, cabinetOffset: 0.0, playerOffset: 0.0)
        var boosts: [Boost] = []
        
        newState.activeEffects = newState.activeEffects.compactMap { ae in
            var effect = ae
            
            if let delay = effect.baseEffect.delay, delay > 0 {
                let updatedBase = Effect(
                    targetMetricId: effect.baseEffect.targetMetricId,
                    value: effect.baseEffect.value,
                    duration: effect.baseEffect.duration,
                    probability: effect.baseEffect.probability,
                    delay: delay - 1
                )
                effect.baseEffect = updatedBase
                return effect
            }
            
            if metricDeltas[effect.baseEffect.targetMetricId] == nil {
                metricDeltas[effect.baseEffect.targetMetricId] = 0
            }
            if cabinetOffsets[effect.baseEffect.targetMetricId] == nil {
                cabinetOffsets[effect.baseEffect.targetMetricId] = 0
            }
            if baseEffectValues[effect.baseEffect.targetMetricId] == nil {
                baseEffectValues[effect.baseEffect.targetMetricId] = 0
            }
            
            let variance = (Double.random(in: 0...1) * 0.32) + 0.84
            let microVariance = (Double.random(in: 0...1) * 0.12) - 0.06
            var effectValue = effect.baseEffect.value * variance + microVariance
            let baseEffect = effectValue
            
            let relevantCabinets = newState.cabinet.filter { !$0.isVacant }
            
            for member in relevantCabinets {
                var boostFactor = 0.0
                var isRelevant = false
                
                if effect.baseEffect.targetMetricId.contains("economy") && member.roleId == "role_economy" {
                    let skillNormalized = Double(member.skillLevel) / 100.0
                    let baseBoost = (skillNormalized - 0.5) / 2.5
                    boostFactor = baseBoost + (Double.random(in: 0...1) * 0.007) - 0.0035
                    isRelevant = true
                    if boostFactor > 0.01 {
                        boosts.append(Boost(memberName: member.name, role: "Treasury Seal", contribution: "Fiscal optimization"))
                    }
                }
                if effect.baseEffect.targetMetricId.contains("military") && member.roleId == "role_defense" {
                    let skillNormalized = Double(member.skillLevel) / 100.0
                    let baseBoost = (skillNormalized - 0.5) / 2.0
                    boostFactor = baseBoost + (Double.random(in: 0...1) * 0.008) - 0.004
                    isRelevant = true
                    if boostFactor > 0.01 {
                        boosts.append(Boost(memberName: member.name, role: "Defense Mandate", contribution: "Readiness boost"))
                    }
                }
                if effect.baseEffect.targetMetricId.contains("relations") && member.roleId == "role_diplomacy" {
                    let skillNormalized = Double(member.skillLevel) / 100.0
                    let baseBoost = (skillNormalized - 0.5) / 2.0
                    boostFactor = baseBoost + (Double.random(in: 0...1) * 0.008) - 0.004
                    isRelevant = true
                    if boostFactor > 0.01 {
                        boosts.append(Boost(memberName: member.name, role: "Diplomatic Core", contribution: "International leverage"))
                    }
                }
                if member.roleId == "role_executive" {
                    let skillNormalized = Double(member.skillLevel) / 100.0
                    let baseBoost = (skillNormalized - 0.5) / 2.5
                    boostFactor = baseBoost + (Double.random(in: 0...1) * 0.007) - 0.0035
                    isRelevant = true
                    if boostFactor > 0.01 {
                        boosts.append(Boost(memberName: member.name, role: "Executive Oversight", contribution: "Stability bonus"))
                    }
                }
                
                if !isRelevant { continue }
                
                if effectValue > 0 {
                    effectValue *= (1 + boostFactor)
                } else if effectValue < 0 {
                    effectValue *= (1 - boostFactor)
                }
            }
            
            let cabinetOffset = effectValue - baseEffect
            cabinetOffsets[effect.baseEffect.targetMetricId] = (cabinetOffsets[effect.baseEffect.targetMetricId] ?? 0) + cabinetOffset
            baseEffectValues[effect.baseEffect.targetMetricId] = (baseEffectValues[effect.baseEffect.targetMetricId] ?? 0) + baseEffect
            
            if effect.baseEffect.targetMetricId == "metric_approval" {
                directApprovalEffect.value += baseEffect
                directApprovalEffect.cabinetOffset += cabinetOffset
            }
            
            metricDeltas[effect.baseEffect.targetMetricId] = (metricDeltas[effect.baseEffect.targetMetricId] ?? 0) + applyJitter(effectValue, isProcessing: true)
            
            let newRemainingDuration = effect.remainingDuration - 1
            if newRemainingDuration > 0 {
                var updatedEffect = effect
                updatedEffect.remainingDuration = newRemainingDuration
                return updatedEffect
            }
            return nil
        }
        
        let allMetricIds = newState.metrics.keys.isEmpty ? Array(metricDeltas.keys) : Array(newState.metrics.keys)
        
        // Process strategic plan drift if active
        if let plan = newState.strategicPlan, let targetMetrics = plan.targetMetrics as [String: Double]? {
            let planAge = newState.turn - (plan.activeTurn ?? newState.turn)
            let isActive = planAge < 10
            if isActive {
                for (metricId, targetValue) in targetMetrics {
                    if metricId == "metric_approval" { continue }
                    let currentValue = newState.metrics[metricId] ?? INITIAL_METRIC_VALUE
                    let target = targetValue
                    let driftVelocity = (target - currentValue) / 50
                    let driftJitter = (Double.random(in: 0...1) * 0.15) - 0.075
                    let driftDelta = driftVelocity * (1 + driftJitter)
                    if abs(driftDelta) > 0.1 {
                        metricDeltas[metricId] = (metricDeltas[metricId] ?? 0) + driftDelta
                    }
                }
            }
        }

        for metricId in allMetricIds {
            if metricId == "metric_approval" { continue }
            
            if newState.metrics[metricId] == nil {
                newState.metrics[metricId] = INITIAL_METRIC_VALUE
            }
            
            // ADDED: Metric Lock check (God Mode)
            if newState.lockedMetricIds?.contains(metricId) == true {
                continue
            }
            
            var delta = metricDeltas[metricId] ?? 0
            let baseDelta = delta
            
            // ADDED: Strategic plan drift (web scoring.ts lines 1132-1147)
            if let plan = newState.strategicPlan, let targetMetrics = plan.targetMetrics as [String: Double]?,
               let targetValue = targetMetrics[metricId],
               let activeTurn = plan.activeTurn, newState.turn - activeTurn >= 10 {
                // Plans are active for 10+ turns, then can provide drift bonus
                let currentValue = newState.metrics[metricId] ?? INITIAL_METRIC_VALUE
                let driftDelta = (targetValue - currentValue) * 0.05 // Gentle drift
                delta += driftDelta
            }
        
        if let playerStats = newState.player?.stats {
            let management = playerStats.management
                if delta < 0 {
                    let mitigation = (management - 30) / 300
                    let mitigationJitter = (Double.random(in: 0...1) * 0.04) - 0.02
                    let mitigationFactor = (1 - max(0, mitigation) + mitigationJitter)
                    let mitigatedDelta = delta * mitigationFactor
                    let playerOffset = mitigatedDelta - baseDelta
                    playerOffsets[metricId] = (playerOffsets[metricId] ?? 0) + playerOffset
                    delta = mitigatedDelta
                }
            }
            
            let maxChangeJitter = (Double.random(in: 0...1) * 0.18) - 0.09
            let maxChangeVariance = (Double.random(in: 0...1) * 0.4) - 0.2
            let effectiveMaxChange = MAX_METRIC_CHANGE_BASE + maxChangeJitter + maxChangeVariance
            if delta > effectiveMaxChange { delta = effectiveMaxChange }
            if delta < -effectiveMaxChange { delta = -effectiveMaxChange }
            
            let updated = (newState.metrics[metricId] ?? INITIAL_METRIC_VALUE) + delta
            newState.metrics[metricId] = clampMetricInt(updated)
            
            if newState.metricHistory[metricId] == nil {
                newState.metricHistory[metricId] = []
            }
            newState.metricHistory[metricId]?.append(newState.metrics[metricId] ?? INITIAL_METRIC_VALUE)
        }
        
        let approvalOldVal = newState.metrics["metric_approval"] ?? INITIAL_METRIC_VALUE
        
        let hasDirectApprovalEffect = abs(directApprovalEffect.value) >= 0.01 || abs(directApprovalEffect.cabinetOffset) >= 0.01
        
        if hasDirectApprovalEffect {
            let directEffect = directApprovalEffect.value + directApprovalEffect.cabinetOffset
            newState.metrics["metric_approval"] = clampMetricInt(approvalOldVal + directEffect)
        } else {
            calculateApproval(&newState)
        }
        
        if newState.metricHistory["metric_approval"] == nil {
            newState.metricHistory["metric_approval"] = []
        }
        newState.metricHistory["metric_approval"]?.append(newState.metrics["metric_approval"] ?? INITIAL_METRIC_VALUE)
        
        if newState.maxTurns == 0 {
            newState.maxTurns = calculateMaxTurns(newState)
        }
        
        return newState
    }
    
    static func calculateMaxTurns(_ state: GameState) -> Int {
        let gameLength = state.gameLength ?? "medium"
        let targetTurns = gameLength == "short" ? 30 : gameLength == "long" ? 120 : 60
        let variance = Double(targetTurns) * 0.1
        let randomVariance = (Double.random(in: 0...1) * variance * 2) - variance
        let calculated = Int((Double(targetTurns) + randomVariance).rounded())
        let minTurns = Int((Double(targetTurns) - variance).rounded())
        let maxTurns = Int((Double(targetTurns) + variance).rounded())
        return max(minTurns, min(maxTurns, calculated))
    }
    
    static func calculateApproval(_ state: inout GameState) {
        let coreMetrics = state.metrics.filter { $0.key != "metric_approval" && $0.key != "metric_corruption" }
        if coreMetrics.isEmpty { return }
        
        let sum = coreMetrics.values.reduce(0, +)
        var avg = sum / Double(coreMetrics.count)
        
        if let playerStats = state.player?.stats {
            let compassionBase = (playerStats.compassion - 50) * 0.15
            let integrityBase = (playerStats.integrity - 50) * 0.1
            let compassionJitter = (Double.random(in: 0...1) * 0.06) - 0.03
            let integrityJitter = (Double.random(in: 0...1) * 0.04) - 0.02
            avg += (compassionBase + compassionJitter + integrityBase + integrityJitter)
        }
        
        let corruption = state.metrics["metric_corruption"] ?? 0
        if corruption > 40 {
            let corruptionPenalty = (corruption - 40) * 0.5
            let penaltyJitter = (Double.random(in: 0...1) * 0.05) - 0.025
            avg -= (corruptionPenalty + penaltyJitter)
        }
        
        state.metrics["metric_approval"] = clampMetricInt(avg)
    }

    // MARK: - End Game Review

    struct EndGameMetricChange {
        let id: String
        let name: String
        let netChange: Int
        let startValue: Int
        let endValue: Int
    }

    struct EndGameAchievement {
        let title: String
        let description: String
    }

    struct EndGameFailure {
        let title: String
        let description: String
    }

    struct EndGameKeyDecision {
        let turn: Int
        let scenario: String
        let decision: String
        let impact: String
    }

    struct EndGameReview {
        let title: String
        let description: String
        let metrics: [EndGameMetricChange]
        let achievements: [EndGameAchievement]
        let failures: [EndGameFailure]
        let keyDecisions: [EndGameKeyDecision]
        let performanceGrade: String
        let overallAssessment: String
    }

    static func generateEndGameReview(state: GameState) -> EndGameReview {
        let metrics = state.metrics
        let metricHistory = state.metricHistory
        let archive = state.archive

        var metricChanges: [EndGameMetricChange] = []

        for (id, endValue) in metrics {
            let history = metricHistory[id] ?? []
            let startValue = history.count > 1 ? history.first ?? INITIAL_METRIC_VALUE : INITIAL_METRIC_VALUE
            let net = endValue - startValue
            let name = id
                .replacingOccurrences(of: "metric_", with: "")
                .replacingOccurrences(of: "_", with: " ")
                .uppercased()

            metricChanges.append(
                EndGameMetricChange(
                    id: id,
                    name: name,
                    netChange: Int(net.rounded()),
                    startValue: Int(startValue.rounded()),
                    endValue: Int(endValue.rounded())
                )
            )
        }

        let sortedMetrics = metricChanges.sorted { abs($0.netChange) > abs($1.netChange) }
        let coreMetrics = metricChanges.filter { $0.id != "metric_approval" && $0.id != "metric_corruption" }
        let averageChange: Double
        if coreMetrics.isEmpty {
            averageChange = 0
        } else {
            let sum = coreMetrics.reduce(0.0) { $0 + Double($1.netChange) }
            averageChange = sum / Double(coreMetrics.count)
        }

        let approval = metrics["metric_approval"] ?? INITIAL_METRIC_VALUE
        let finalApproval = Int(approval.rounded())

        var performanceGrade = "C"
        var overallAssessment = ""

        let gameLength = state.gameLength ?? "medium"
        var approvalThresholdBase = 0
        var changeThresholdBase: Double = 0

        if gameLength == "long" {
            approvalThresholdBase = 3
            changeThresholdBase = 1.5
        } else if gameLength == "short" {
            approvalThresholdBase = -3
            changeThresholdBase = -1.0
        }

        if Double(finalApproval) >= Double(75 + approvalThresholdBase) && averageChange >= (5 + changeThresholdBase) {
            performanceGrade = "A"
            overallAssessment = "Exceptional leadership characterized by sustained improvements across multiple domains. The administration demonstrated remarkable consistency and strategic vision."
        } else if Double(finalApproval) >= Double(65 + approvalThresholdBase) && averageChange >= (2 + changeThresholdBase) {
            performanceGrade = "B"
            overallAssessment = "Strong performance with measurable gains in key areas. The administration navigated challenges effectively and maintained public confidence."
        } else if Double(finalApproval) >= Double(50 + approvalThresholdBase) && averageChange >= (-2 + changeThresholdBase) {
            performanceGrade = "C"
            overallAssessment = "Mixed results with some successes offset by setbacks. The administration maintained stability but struggled to achieve transformative change."
        } else if Double(finalApproval) >= Double(40 + approvalThresholdBase) && averageChange >= (-5 + changeThresholdBase) {
            performanceGrade = "D"
            overallAssessment = "Challenging term marked by declining metrics and eroding public trust. The administration faced significant headwinds and struggled to maintain control."
        } else if finalApproval < 30 {
            performanceGrade = "COLLAPSE"
            overallAssessment = "Complete systemic failure. The administration lost all public confidence and control, leading to immediate termination of the term."
        } else {
            performanceGrade = "F"
            overallAssessment = "Catastrophic performance with widespread deterioration across critical systems. The administration failed to address fundamental challenges."
        }

        var achievements: [EndGameAchievement] = []
        let topGains = sortedMetrics.filter { $0.netChange > 5 && $0.id != "metric_approval" }.prefix(3)
        for metric in topGains {
            if metric.netChange > 10 {
                achievements.append(
                    EndGameAchievement(
                        title: "Major Improvement in \(metric.name)",
                        description: "\(metric.name) increased by \(metric.netChange) points over the term, representing one of the administration's most significant policy successes."
                    )
                )
            } else {
                achievements.append(
                    EndGameAchievement(
                        title: "Notable Gains in \(metric.name)",
                        description: "\(metric.name) improved by \(metric.netChange) points, demonstrating effective policy implementation in this area."
                    )
                )
            }
        }

        if finalApproval >= 70 {
            achievements.append(
                EndGameAchievement(
                    title: "Strong Public Support",
                    description: "Maintained approval rating of \(finalApproval)%, reflecting broad public confidence in the administration's direction."
                )
            )
        }

        if gameLength == "long" && performanceGrade != "COLLAPSE" && performanceGrade != "F" {
            achievements.append(
                EndGameAchievement(
                    title: "Marathon Administration",
                    description: "Successfully navigated an extended term in office, demonstrating resilience against long-term instability."
                )
            )
        }

        var failures: [EndGameFailure] = []
        let worstDrops = sortedMetrics.filter { $0.netChange < -5 && $0.id != "metric_approval" }.prefix(3)
        for metric in worstDrops {
            failures.append(
                EndGameFailure(
                    title: "Deterioration in \(metric.name)",
                    description: "\(metric.name) fell by \(abs(metric.netChange)) points, signaling unresolved structural problems in this domain."
                )
            )
        }

        if finalApproval < 40 {
            failures.append(
                EndGameFailure(
                    title: "Low Public Confidence",
                    description: "Approval ended at \(finalApproval)%, indicating a serious loss of public trust in the administration."
                )
            )
        }

        var keyDecisions: [EndGameKeyDecision] = []
        for record in archive.suffix(8) {
            let scenarioTitle = record.scenarioTitle
            let decisionLabel = record.decisionLabel

            let impactText: String
            if !record.metricDeltas.isEmpty {
                let primary = record.metricDeltas.max(by: { abs($0.delta) < abs($1.delta) })
                if let primary = primary {
                    let direction = primary.delta >= 0 ? "improved" : "declined"
                    impactText = "\(primary.metricName) \(direction) by \(String(format: "%.1f", primary.delta)) points."
                } else {
                    impactText = "Minor mixed impacts across tracked metrics."
                }
            } else {
                impactText = "Limited measurable impact on top-line metrics."
            }

            keyDecisions.append(
                EndGameKeyDecision(
                    turn: record.turn,
                    scenario: scenarioTitle,
                    decision: decisionLabel,
                    impact: impactText
                )
            )
        }

        keyDecisions.sort { $0.turn < $1.turn }

        let title = performanceGrade == "COLLAPSE" ? "TERM COLLAPSE BRIEFING" : "END OF TERM REVIEW"
        let description = "Summary briefing generated at the conclusion of the administration's term, combining metric performance, cabinet actions, and key strategic decisions."

        return EndGameReview(
            title: title,
            description: description,
            metrics: sortedMetrics,
            achievements: achievements,
            failures: failures,
            keyDecisions: keyDecisions,
            performanceGrade: performanceGrade,
            overallAssessment: overallAssessment
        )
    }
}
