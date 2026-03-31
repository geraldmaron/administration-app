import Foundation

class ScoringEngine {
    static let INITIAL_METRIC_VALUE: Double = 50.0
    static let MAX_METRIC_CHANGE_BASE: Double = 6.0

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
        "crime": "metric_crime",
        "democracy": "metric_democracy",
        "sovereignty": "metric_sovereignty",
        "immigration": "metric_immigration",
        "budget": "metric_budget",
        "unrest": "metric_unrest",
        "economic_bubble": "metric_economic_bubble",
        "foreign_influence": "metric_foreign_influence"
    ]

    private struct MetricSwingRange {
        let minor: (Double, Double)
        let moderate: (Double, Double)
        let major: (Double, Double)
        // critical: raw magnitude >= 10 — crisis-level events (military humiliation, wartime rally,
        // major scandal revelation, economic collapse). Grounded in presidential approval research:
        // 9/11 rally +35 pts/month, Gulf War +20, OBL raid +7, Carter Iran hostage -4/month avg.
        let critical: (Double, Double)

        init(minor: (Double, Double), moderate: (Double, Double), major: (Double, Double), critical: (Double, Double)? = nil) {
            self.minor    = minor
            self.moderate = moderate
            self.major    = major
            self.critical = critical ?? (major.0 * 1.6, major.1 * 1.6)
        }
    }

    private static let DEFAULT_RANGE = MetricSwingRange(minor: (0.3, 1.1), moderate: (1.2, 2.6), major: (2.7, 4.5), critical: (4.5, 7.5))

    private static let METRIC_SWING_RANGES: [String: MetricSwingRange] = [
        // Approval: calibrated to historical presidential approval data.
        // Real per-month swings: routine decisions ±0.5–2, notable events ±2–5,
        // significant events ±5–10 (major scandal, military news, economic shock),
        // crisis events ±8–18 (wartime rally, military defeat, impeachment proceedings).
        "metric_approval":         MetricSwingRange(minor: (0.5, 1.5),  moderate: (2.0, 5.0),  major: (5.0, 9.0),   critical: (8.0, 16.0)),
        // Economy: GDP growth changes felt gradually; crisis can cause 5–10 pt monthly swings
        "metric_economy":          MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.5),  major: (2.5, 5.0),   critical: (5.0, 9.0)),
        // Public order: civil unrest events (protests, riots) can spike dramatically
        "metric_public_order":     MetricSwingRange(minor: (0.4, 1.2),  moderate: (1.3, 3.0),  major: (3.0, 6.0),   critical: (6.0, 11.0)),
        "metric_health":           MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.4),  major: (2.5, 4.5),   critical: (4.5, 8.0)),
        "metric_education":        MetricSwingRange(minor: (0.2, 0.9),  moderate: (1.0, 2.1),  major: (2.2, 3.5),   critical: (3.5, 6.0)),
        "metric_infrastructure":   MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.5),  major: (2.6, 4.0),   critical: (4.0, 7.0)),
        "metric_environment":      MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        // Foreign relations: incidents between nations can cause large bilateral swings
        "metric_foreign_relations":MetricSwingRange(minor: (0.4, 1.5),  moderate: (1.5, 4.0),  major: (4.0, 8.0),   critical: (8.0, 18.0)),
        "metric_military":         MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.5),  major: (2.6, 4.5),   critical: (4.5, 8.0)),
        "metric_liberty":          MetricSwingRange(minor: (0.4, 1.2),  moderate: (1.3, 2.6),  major: (2.7, 4.5),   critical: (4.5, 8.0)),
        "metric_equality":         MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        // Corruption: scandals can cause rapid nonlinear drops; recovers very slowly
        "metric_corruption":       MetricSwingRange(minor: (0.2, 0.9),  moderate: (1.0, 2.2),  major: (2.2, 4.0),   critical: (4.0, 8.0)),
        "metric_employment":       MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        // Inflation: responds quickly to shocks (energy price spike, supply chain collapse)
        "metric_inflation":        MetricSwingRange(minor: (0.2, 0.8),  moderate: (0.9, 2.0),  major: (2.0, 4.0),   critical: (4.0, 7.0)),
        "metric_innovation":       MetricSwingRange(minor: (0.4, 1.2),  moderate: (1.3, 2.5),  major: (2.6, 3.9),   critical: (3.9, 6.5)),
        "metric_trade":            MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.5),  major: (2.5, 4.5),   critical: (4.5, 8.0)),
        "metric_energy":           MetricSwingRange(minor: (0.3, 1.2),  moderate: (1.3, 2.6),  major: (2.7, 4.5),   critical: (4.5, 8.0)),
        "metric_housing":          MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        "metric_crime":            MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.4),  major: (2.5, 4.0),   critical: (4.0, 7.0)),
        "metric_bureaucracy":      MetricSwingRange(minor: (0.2, 0.8),  moderate: (0.9, 1.9),  major: (2.0, 3.1),   critical: (3.1, 5.0)),
        "metric_democracy":        MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 4.0),   critical: (4.0, 7.5)),
        "metric_sovereignty":      MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.5),  major: (2.6, 4.5),   critical: (4.5, 8.0)),
        "metric_immigration":      MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        "metric_budget":           MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 3.8),   critical: (3.8, 6.5)),
        "metric_unrest":           MetricSwingRange(minor: (0.4, 1.2),  moderate: (1.3, 3.0),  major: (3.0, 6.0),   critical: (6.0, 12.0)),
        "metric_economic_bubble":  MetricSwingRange(minor: (0.3, 1.0),  moderate: (1.1, 2.3),  major: (2.4, 4.5),   critical: (4.5, 9.0)),
        "metric_foreign_influence":MetricSwingRange(minor: (0.3, 1.1),  moderate: (1.2, 2.5),  major: (2.6, 4.5),   critical: (4.5, 8.0))
    ]

    private static func clampMetricInt(_ value: Double) -> Double {
        let n = value.isFinite ? value : INITIAL_METRIC_VALUE
        return (max(0, min(100, n)) * 10).rounded() / 10
    }
    
    static func isInverseMetric(_ metricId: String) -> Bool {
        let inverseMetrics: Set<String> = [
            "metric_corruption", "metric_inflation", "metric_crime",
            "metric_bureaucracy", "metric_unrest", "metric_economic_bubble",
            "metric_foreign_influence"
        ]
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
        if magnitude < 2  { return "minor" }
        if magnitude < 5  { return "moderate" }
        if magnitude < 10 { return "major" }
        return "critical"
    }

    private static func normalizeEffectValue(targetMetricId: String?, rawValue: Double?) -> Double {
        let value = rawValue?.isFinite == true ? rawValue! : 0
        let sign: Double = value >= 0 ? 1 : -1
        let magnitude = abs(value)
        let bucket = selectBucket(magnitude)
        let range = METRIC_SWING_RANGES[targetMetricId ?? ""] ?? DEFAULT_RANGE
        let chosen: (Double, Double)
        switch bucket {
        case "minor":    chosen = range.minor
        case "moderate": chosen = range.moderate
        case "major":    chosen = range.major
        default:         chosen = range.critical
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
                let economyJitter = (Double.random(in: 0...1) * 0.11) - 0.055
                if relationsChange < 0 {
                    secondary[economyKey] = (secondary[economyKey] ?? 0) + relationsChange * (0.2 + economyJitter * 0.1)
                } else {
                    secondary[economyKey] = (secondary[economyKey] ?? 0) + relationsChange * (0.15 + economyJitter * 0.1)
                }
            }
        }

        if let economyKey = findMetricKey(["economy"]) {
            let economyChange = primaryEffects[economyKey] ?? 0
            if abs(economyChange) > 2 {
                let controlKey = findMetricKey(["order", "control", "public"]) ?? "metric_public_order"
                let controlJitter = (Double.random(in: 0...1) * 0.1) - 0.05
                if economyChange > 0 {
                    secondary[controlKey] = (secondary[controlKey] ?? 0) + economyChange * (0.08 + controlJitter * 0.1)
                } else {
                    secondary[controlKey] = (secondary[controlKey] ?? 0) + economyChange * (0.12 + controlJitter * 0.1)
                }
            }
        }

        if let healthKey = findMetricKey(["health"]) {
            let healthChange = primaryEffects[healthKey] ?? 0
            if healthChange < -2 {
                let economyKey = findMetricKey(["economy"]) ?? "metric_economy"
                let economyJitter = (Double.random(in: 0...1) * 0.11) - 0.055
                secondary[economyKey] = (secondary[economyKey] ?? 0) + healthChange * (0.15 + economyJitter * 0.1)
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

                    let rawMagnitude = abs(effect.value)
                    if rawMagnitude >= 1.5 {
                        newState.activeEffects.append(ActiveEffect(
                            baseEffect: Effect(targetMetricId: effect.targetMetricId, value: normalizedValue * 0.55, duration: 1, probability: 1.0, delay: 1),
                            remainingDuration: 1
                        ))
                    }
                    if rawMagnitude >= 3.0 {
                        newState.activeEffects.append(ActiveEffect(
                            baseEffect: Effect(targetMetricId: effect.targetMetricId, value: normalizedValue * 0.28, duration: 1, probability: 1.0, delay: 2),
                            remainingDuration: 1
                        ))
                    }
                    if rawMagnitude >= 5.0 {
                        newState.activeEffects.append(ActiveEffect(
                            baseEffect: Effect(targetMetricId: effect.targetMetricId, value: normalizedValue * 0.12, duration: 1, probability: 1.0, delay: 3),
                            remainingDuration: 1
                        ))
                    }
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
                let rawMag = abs(value)
                if rawMag >= 1.5 {
                    newState.activeEffects.append(ActiveEffect(
                        baseEffect: Effect(targetMetricId: targetId, value: normalizedValue * 0.55, duration: 1, probability: 1.0, delay: 1),
                        remainingDuration: 1
                    ))
                }
                if rawMag >= 3.0 {
                    newState.activeEffects.append(ActiveEffect(
                        baseEffect: Effect(targetMetricId: targetId, value: normalizedValue * 0.28, duration: 1, probability: 1.0, delay: 2),
                        remainingDuration: 1
                    ))
                }
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

        // Apply branch-specific readiness deltas to countryMilitaryProfile
        for effect in option.effects {
            guard let branchId = effect.targetBranchId, !branchId.isEmpty else { continue }
            guard Double.random(in: 0...1) <= effect.probability else { continue }
            guard var profile = newState.countryMilitaryProfile else { continue }
            if var branch = profile.branches[branchId] {
                let delta = max(-50, min(50, Int(effect.value.rounded())))
                branch.readiness = max(0, min(100, branch.readiness + delta))
                profile.branches[branchId] = branch
                newState.countryMilitaryProfile = profile
            }
        }

        // Apply branch-specific readiness deltas to countryMilitaryState (canonical type)
        for effect in option.effects {
            guard let branchType = effect.targetBranchType, !branchType.isEmpty else { continue }
            guard Double.random(in: 0...1) <= effect.probability else { continue }
            guard var milState = newState.countryMilitaryState else { continue }
            let delta = Int((effect.value * 10).rounded())
            if let idx = milState.branches.firstIndex(where: { $0.canonicalType == branchType }) {
                var mutableBranches = milState.branches
                mutableBranches[idx].readiness = max(0, min(100, mutableBranches[idx].readiness + delta))
                newState.countryMilitaryState = CountryMilitaryState(
                    branches: mutableBranches,
                    nuclearProfile: milState.nuclearProfile,
                    cyberProfile: milState.cyberProfile,
                    overallReadiness: milState.overallReadiness,
                    activeConflicts: milState.activeConflicts,
                    lastUpdatedTurn: milState.lastUpdatedTurn
                )
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

        let policyImplications = option.policyImplications ?? inferPolicyImplications(option: option)
        applyPolicyImplications(state: &newState, implications: policyImplications)

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

    static func policyShiftLabel(for target: String) -> String {
        let labels: [String: String] = [
            "fiscal.taxIncome": "Income Tax",
            "fiscal.taxCorporate": "Corporate Tax",
            "fiscal.spendingMilitary": "Military Budget",
            "fiscal.spendingInfrastructure": "Infrastructure Budget",
            "fiscal.spendingSocial": "Social Budget",
            "policy.economicStance": "Economic Stance",
            "policy.socialSpending": "Social Spending",
            "policy.defenseSpending": "Defense Spending",
            "policy.environmentalPolicy": "Environmental Policy",
            "policy.tradeOpenness": "Trade Openness",
            "policy.immigration": "Immigration",
            "policy.environmentalProtection": "Environmental Protection",
            "policy.healthcareAccess": "Healthcare Access",
            "policy.educationFunding": "Education Funding",
            "policy.socialWelfare": "Social Welfare",
        ]
        return labels[target] ?? target.split(separator: ".").last.map(String.init) ?? target
    }

    static func generateBriefingForDecision(option: Option, metricDeltas: [String: Double]) -> Briefing {
        var title = option.outcomeHeadline ?? "Directive Implemented"
        var description = option.outcomeSummary?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
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
        
        if let context = option.outcomeContext?.trimmingCharacters(in: .whitespacesAndNewlines), !context.isEmpty {
            description += "\n\n\(context)"
        }
        
        let metricDeltaItems: [MetricDelta] = metricDeltas
            .filter { abs($0.value) >= 0.1 }
            .sorted { abs($0.value) > abs($1.value) }
            .prefix(6)
            .map { metricId, delta in
                let name = metricId
                    .replacingOccurrences(of: "metric_", with: "")
                    .replacingOccurrences(of: "_", with: " ")
                    .split(separator: " ")
                    .map { $0.prefix(1).uppercased() + $0.dropFirst() }
                    .joined(separator: " ")
                return MetricDelta(id: metricId, delta: delta, name: name, cabinetOffset: nil, playerOffset: nil, netChange: nil)
            }

        let implications = option.policyImplications ?? inferPolicyImplications(option: option)
        let shifts = implications.map { impl in
            PolicyShift(target: impl.target, label: policyShiftLabel(for: impl.target), delta: impl.delta)
        }

        return Briefing(title: title, description: description, metrics: Array(metricDeltaItems), boosts: [], humanCost: option.humanCost, policyShifts: shifts)
    }
    
    struct PolicyShift {
        let target: String
        let label: String
        let delta: Double
    }

    struct Briefing {
        let title: String
        let description: String
        let metrics: [MetricDelta]
        let boosts: [Boost]
        let humanCost: HumanCost?
        let policyShifts: [PolicyShift]
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

    // MARK: - Policy Implications

    static func applyPolicyImplications(state: inout GameState, implications: [PolicyImplication]) {
        guard !implications.isEmpty else { return }

        var fiscal = state.fiscalSettings ?? .defaults
        var policy = state.policySettings ?? PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: nil, socialSpending: nil,
            defenseSpending: nil, environmentalPolicy: nil
        )

        for implication in implications {
            let parts = implication.target.split(separator: ".")
            guard parts.count == 2 else { continue }
            let category = String(parts[0])
            let field = String(parts[1])

            if category == "fiscal" {
                switch field {
                case "taxIncome":
                    fiscal.taxIncome = clampValue(fiscal.taxIncome + implication.delta, 0, 100)
                case "taxCorporate":
                    fiscal.taxCorporate = clampValue(fiscal.taxCorporate + implication.delta, 0, 100)
                case "spendingMilitary":
                    fiscal.spendingMilitary = clampValue(fiscal.spendingMilitary + implication.delta, 0, 100)
                case "spendingInfrastructure":
                    fiscal.spendingInfrastructure = clampValue(fiscal.spendingInfrastructure + implication.delta, 0, 100)
                case "spendingSocial":
                    fiscal.spendingSocial = clampValue(fiscal.spendingSocial + implication.delta, 0, 100)
                default: break
                }
            } else if category == "policy" {
                switch field {
                case "economicStance":
                    policy.economicStance = clampValue((policy.economicStance ?? 50) + implication.delta, 0, 100)
                case "socialSpending":
                    policy.socialSpending = clampValue((policy.socialSpending ?? 50) + implication.delta, 0, 100)
                case "defenseSpending":
                    policy.defenseSpending = clampValue((policy.defenseSpending ?? 50) + implication.delta, 0, 100)
                case "environmentalPolicy":
                    policy.environmentalPolicy = clampValue((policy.environmentalPolicy ?? 50) + implication.delta, 0, 100)
                case "tradeOpenness":
                    policy.tradeOpenness = clampValue((policy.tradeOpenness ?? 50) + implication.delta, 0, 100)
                case "immigration":
                    policy.immigration = clampValue((policy.immigration ?? 50) + implication.delta, 0, 100)
                case "environmentalProtection":
                    policy.environmentalProtection = clampValue((policy.environmentalProtection ?? 50) + implication.delta, 0, 100)
                case "healthcareAccess":
                    policy.healthcareAccess = clampValue((policy.healthcareAccess ?? 50) + implication.delta, 0, 100)
                case "educationFunding":
                    policy.educationFunding = clampValue((policy.educationFunding ?? 50) + implication.delta, 0, 100)
                case "socialWelfare":
                    policy.socialWelfare = clampValue((policy.socialWelfare ?? 50) + implication.delta, 0, 100)
                default: break
                }
            }
        }

        state.fiscalSettings = fiscal
        state.policySettings = policy
    }

    static func inferPolicyImplications(option: Option) -> [PolicyImplication] {
        var implications: [PolicyImplication] = []
        let magnitudeThreshold = 1.5
        let inferredCap = 8.0

        var effectsByMetric: [String: Double] = [:]
        for effect in option.effects {
            effectsByMetric[effect.targetMetricId] = effect.value
        }

        if let military = effectsByMetric["metric_military"], abs(military) > 2.0 {
            let magnitude = abs(military)
            if military > 0 {
                implications.append(PolicyImplication(target: "fiscal.spendingMilitary", delta: min(magnitude * 1.2, inferredCap)))
                implications.append(PolicyImplication(target: "policy.defenseSpending", delta: min(magnitude * 1.5, inferredCap)))
            } else {
                implications.append(PolicyImplication(target: "fiscal.spendingMilitary", delta: max(-magnitude * 1.0, -inferredCap)))
                implications.append(PolicyImplication(target: "policy.defenseSpending", delta: max(-magnitude * 1.0, -inferredCap)))
            }
        }

        if let environment = effectsByMetric["metric_environment"], abs(environment) > magnitudeThreshold {
            let magnitude = abs(environment)
            let delta = environment > 0 ? min(magnitude * 1.5, inferredCap) : max(-magnitude * 1.0, -inferredCap)
            implications.append(PolicyImplication(target: "policy.environmentalPolicy", delta: delta))
        }

        if let health = effectsByMetric["metric_health"], abs(health) > 2.0 {
            let magnitude = abs(health)
            let delta = health > 0 ? min(magnitude * 1.0, inferredCap) : max(-magnitude * 1.0, -inferredCap)
            implications.append(PolicyImplication(target: "policy.healthcareAccess", delta: delta))
        }

        if let education = effectsByMetric["metric_education"], abs(education) > 2.0 {
            let magnitude = abs(education)
            let delta = education > 0 ? min(magnitude * 1.0, inferredCap) : max(-magnitude * 1.0, -inferredCap)
            implications.append(PolicyImplication(target: "policy.educationFunding", delta: delta))
        }

        if let equality = effectsByMetric["metric_equality"], equality > magnitudeThreshold,
           let economy = effectsByMetric["metric_economy"], economy < 0 {
            implications.append(PolicyImplication(target: "policy.socialSpending", delta: min(3.0, inferredCap)))
            implications.append(PolicyImplication(target: "fiscal.spendingSocial", delta: min(abs(equality), inferredCap)))
        }

        if let trade = effectsByMetric["metric_trade"], abs(trade) > 2.0 {
            let magnitude = abs(trade)
            let delta = trade > 0 ? min(magnitude * 1.2, inferredCap) : max(-magnitude * 1.0, -inferredCap)
            implications.append(PolicyImplication(target: "policy.tradeOpenness", delta: delta))
        }

        if let infra = effectsByMetric["metric_infrastructure"], abs(infra) > 2.0 {
            let magnitude = abs(infra)
            let delta = infra > 0 ? min(magnitude * 1.2, inferredCap) : max(-magnitude * 1.0, -inferredCap)
            implications.append(PolicyImplication(target: "fiscal.spendingInfrastructure", delta: delta))
        }

        return implications
    }

    private static func clampValue(_ value: Double, _ minVal: Double, _ maxVal: Double) -> Double {
        min(max(value, minVal), maxVal)
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

        // ── Organic Metric Drift ───────────────────────────────────────────────────
        // Continuous cross-metric coupling applied every turn after active effects.
        // All metric values are snapshotted before any drift is written to prevent
        // cascading reads within a single turn. Magnitudes are calibrated to be
        // background pressure — scenarios and player decisions remain the primary driver.
        let economy          = newState.metrics["metric_economy"]           ?? INITIAL_METRIC_VALUE
        let inflation        = newState.metrics["metric_inflation"]         ?? INITIAL_METRIC_VALUE
        let publicOrder      = newState.metrics["metric_public_order"]      ?? INITIAL_METRIC_VALUE
        let corruption       = newState.metrics["metric_corruption"]        ?? INITIAL_METRIC_VALUE
        let foreignRelations = newState.metrics["metric_foreign_relations"] ?? INITIAL_METRIC_VALUE
        let crime            = newState.metrics["metric_crime"]             ?? INITIAL_METRIC_VALUE
        let unrest           = newState.metrics["metric_unrest"]            ?? INITIAL_METRIC_VALUE
        let equality         = newState.metrics["metric_equality"]          ?? INITIAL_METRIC_VALUE
        let foreignInfluence = newState.metrics["metric_foreign_influence"] ?? INITIAL_METRIC_VALUE
        let housing          = newState.metrics["metric_housing"]           ?? INITIAL_METRIC_VALUE
        let liberty          = newState.metrics["metric_liberty"]           ?? INITIAL_METRIC_VALUE
        let democracy        = newState.metrics["metric_democracy"]         ?? INITIAL_METRIC_VALUE
        let innovation       = newState.metrics["metric_innovation"]        ?? INITIAL_METRIC_VALUE
        let energyVal        = newState.metrics["metric_energy"]            ?? INITIAL_METRIC_VALUE
        let budget           = newState.metrics["metric_budget"]            ?? INITIAL_METRIC_VALUE
        let military         = newState.metrics["metric_military"]          ?? INITIAL_METRIC_VALUE
        let employment       = newState.metrics["metric_employment"]        ?? INITIAL_METRIC_VALUE
        let trade            = newState.metrics["metric_trade"]             ?? INITIAL_METRIC_VALUE
        let infra            = newState.metrics["metric_infrastructure"]    ?? INITIAL_METRIC_VALUE

        // ── UNREST ──────────────────────────────────────────────────────────────
        // Thresholds at 40 (not 30/35) so cascade becomes visible in medium games.
        // Each driver adds a scaled increment; decay fires only when no drivers are active.
        var unrestDrift = 0.0
        if publicOrder < 40  { unrestDrift += 1.5 }
        if inflation > 70    { unrestDrift += 0.75 }
        if economy < 35      { unrestDrift += 0.5 }
        if housing < 40      { unrestDrift += (40 - housing) * 0.015 }   // max ~0.6 at housing=0
        if equality < 40     { unrestDrift += (40 - equality) * 0.010 }  // max ~0.4 at equality=0
        if unrestDrift == 0  { unrestDrift = -0.75 }
        newState.metrics["metric_unrest"] = clampMetricInt(unrest + unrestDrift)

        // ── LIBERTY ─────────────────────────────────────────────────────────────
        // Corruption captures institutions. Liberty below 35 erodes democracy (authoritarian loop).
        if corruption > 60 {
            let current = newState.metrics["metric_liberty"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_liberty"] = clampMetricInt(current - 1.0)
        }

        // ── DEMOCRACY ───────────────────────────────────────────────────────────
        // Restricted liberty → democratic backsliding. Low democracy → corruption grows.
        if liberty < 35 {
            let democracyDrag = (35 - liberty) * 0.015
            let current = newState.metrics["metric_democracy"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_democracy"] = clampMetricInt(current - democracyDrag)
        }
        if democracy < 35 {
            let corruptionGrowth = (35 - democracy) * 0.015
            let current = newState.metrics["metric_corruption"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_corruption"] = clampMetricInt(current + corruptionGrowth)
        }

        // ── ECONOMY ─────────────────────────────────────────────────────────────
        // Drags from: diplomatic isolation, corruption, disorder, hyperinflation.
        // Slow boost from: innovation compounding (R&D lag), strong trade partnerships.
        var ecoDrift = 0.0
        if foreignRelations < 35 { ecoDrift -= (35 - foreignRelations) * 0.02 }
        if corruption > 55       { ecoDrift -= (corruption - 55) * 0.025 }
        if publicOrder < 35      { ecoDrift -= (35 - publicOrder) * 0.02 }
        if inflation > 75        { ecoDrift -= (inflation - 75) * 0.02 }
        if innovation > 65       { ecoDrift += (innovation - 65) * 0.003 }  // long-lag R&D payoff
        if ecoDrift != 0 {
            let current = newState.metrics["metric_economy"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_economy"] = clampMetricInt(current + ecoDrift)
        }

        // ── INFLATION ───────────────────────────────────────────────────────────
        // Demand-pull from overheating economy (0.025 — raised from 0.007 so populist
        // economics show inflation consequences within ~30-40 turns in medium games).
        // Energy crisis is a primary supply-shock inflation driver.
        var inflationDrift = 0.0
        if economy > 65 { inflationDrift += (economy - 65) * 0.025 }  // demand-pull
        if economy < 35 { inflationDrift -= (35 - economy) * 0.008 }  // demand collapse → deflation
        if energyVal < 35 { inflationDrift += (35 - energyVal) * 0.015 }  // supply-shock
        if inflationDrift != 0 {
            let current = newState.metrics["metric_inflation"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_inflation"] = clampMetricInt(current + inflationDrift)
        }

        // ── ECONOMIC BUBBLE ─────────────────────────────────────────────────────
        // Overheating economy and easy-money inflation both build systemic risk.
        // Cools slowly when economy is at moderate levels (no overheating, no crisis).
        var bubbleDrift = 0.0
        if economy > 70   { bubbleDrift += (economy - 70) * 0.04 }   // rapid growth → asset inflation
        if inflation > 55 { bubbleDrift += (inflation - 55) * 0.025 }  // loose money fuels speculation
        if economy < 55 && inflation < 55 { bubbleDrift -= 0.4 }       // gradual deflation when cool
        if bubbleDrift != 0 {
            let current = newState.metrics["metric_economic_bubble"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_economic_bubble"] = clampMetricInt(current + bubbleDrift)
        }

        // ── PUBLIC ORDER ────────────────────────────────────────────────────────
        var orderDrift = 0.0
        if unrest > 50 { orderDrift -= (unrest - 50) * 0.025 }
        if crime > 65  { orderDrift -= (crime - 65) * 0.025 }
        if orderDrift != 0 {
            let current = newState.metrics["metric_public_order"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_public_order"] = clampMetricInt(current + orderDrift)
        }

        // ── HOUSING ─────────────────────────────────────────────────────────────
        // Economic stress erodes housing affordability and maintenance investment.
        // This seeds the housing → equality → crime → unrest cascade in neglect scenarios.
        if economy < 45 {
            let housingDrag = (45 - economy) * 0.012
            let current = newState.metrics["metric_housing"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_housing"] = clampMetricInt(current - housingDrag)
        }

        // ── CRIME ───────────────────────────────────────────────────────────────
        // Thresholds lowered to 45/40 so inequality/housing pressures manifest in medium games.
        var crimeDrift = 0.0
        if equality < 45 { crimeDrift += (45 - equality) * 0.015 }
        if housing < 40  { crimeDrift += (40 - housing) * 0.012 }
        if crimeDrift != 0 {
            let current = newState.metrics["metric_crime"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_crime"] = clampMetricInt(current + crimeDrift)
        }

        // ── EQUALITY ────────────────────────────────────────────────────────────
        // Housing affordability collapse widens wealth gap. Threshold lowered to 40.
        if housing < 40 {
            let equalityDrag = (40 - housing) * 0.015
            let current = newState.metrics["metric_equality"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_equality"] = clampMetricInt(current - equalityDrag)
        }

        // ── FOREIGN RELATIONS ───────────────────────────────────────────────────
        var frDrift = 0.0
        if corruption > 60 { frDrift -= (corruption - 60) * 0.02 }
        if unrest > 65     { frDrift -= (unrest - 65) * 0.02 }
        if frDrift != 0 {
            let current = newState.metrics["metric_foreign_relations"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_foreign_relations"] = clampMetricInt(current + frDrift)
        }

        // ── SOVEREIGNTY ─────────────────────────────────────────────────────────
        if foreignInfluence > 60 {
            let sovDrag = (foreignInfluence - 60) * 0.02
            let current = newState.metrics["metric_sovereignty"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_sovereignty"] = clampMetricInt(current - sovDrag)
        }

        // ── HEALTH ──────────────────────────────────────────────────────────────
        // Strong economy slowly improves health investment (long lag). Economic collapse
        // starves healthcare funding — the reverse effect fires below threshold 35.
        let currentHealth = newState.metrics["metric_health"] ?? INITIAL_METRIC_VALUE
        if economy > 65 {
            newState.metrics["metric_health"] = clampMetricInt(currentHealth + (economy - 65) * 0.005)
        } else if economy < 35 {
            newState.metrics["metric_health"] = clampMetricInt(currentHealth - (35 - economy) * 0.010)
        }

        // ── EMPLOYMENT ────────────────────────────────────────────────────────
        // Tracks GDP with a lag (Okun's Law). Innovation displaces jobs short-term.
        var employmentDrift = 0.0
        if economy > 60 { employmentDrift += (economy - 60) * 0.012 }
        if economy < 40 { employmentDrift -= (40 - economy) * 0.018 }
        if innovation > 70 { employmentDrift -= (innovation - 70) * 0.005 }
        if employmentDrift != 0 {
            let current = newState.metrics["metric_employment"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_employment"] = clampMetricInt(current + employmentDrift)
        }

        // ── BUDGET ────────────────────────────────────────────────────────────
        // Revenue depends on economic health; high military spending drains fiscal space.
        var budgetDrift = 0.0
        if economy > 60 { budgetDrift += (economy - 60) * 0.010 }
        if economy < 40 { budgetDrift -= (40 - economy) * 0.015 }
        if military > 70 { budgetDrift -= (military - 70) * 0.008 }
        if budgetDrift != 0 {
            let current = newState.metrics["metric_budget"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_budget"] = clampMetricInt(current + budgetDrift)
        }

        // ── TRADE ─────────────────────────────────────────────────────────────
        // Diplomatic isolation hurts trade; strong diplomacy opens markets.
        var tradeDrift = 0.0
        if foreignRelations < 35 { tradeDrift -= (35 - foreignRelations) * 0.015 }
        if foreignRelations > 65 { tradeDrift += (foreignRelations - 65) * 0.008 }
        if economy < 35 { tradeDrift -= (35 - economy) * 0.010 }
        if tradeDrift != 0 {
            let current = newState.metrics["metric_trade"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_trade"] = clampMetricInt(current + tradeDrift)
        }

        // ── INFRASTRUCTURE ────────────────────────────────────────────────────
        // Degrades without budget funding. Already-poor infra accelerates decay
        // (deferred maintenance costs grow nonlinearly).
        var infraDrift = 0.0
        if budget < 40 { infraDrift -= (40 - budget) * 0.010 }
        if economy < 35 { infraDrift -= (35 - economy) * 0.008 }
        if infra < 35 { infraDrift -= 0.3 }
        if infraDrift != 0 {
            let current = newState.metrics["metric_infrastructure"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_infrastructure"] = clampMetricInt(current + infraDrift)
        }

        // ── EDUCATION ─────────────────────────────────────────────────────────
        // Requires sustained funding — degrades slowly without it.
        var educationDrift = 0.0
        if budget < 35 { educationDrift -= (35 - budget) * 0.008 }
        if economy > 65 { educationDrift += (economy - 65) * 0.003 }
        if educationDrift != 0 {
            let current = newState.metrics["metric_education"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_education"] = clampMetricInt(current + educationDrift)
        }

        // ── IMMIGRATION ───────────────────────────────────────────────────────
        // Economic magnet and open society attract; unrest creates backlash.
        var immigrationDrift = 0.0
        if economy > 65 { immigrationDrift += (economy - 65) * 0.006 }
        if economy < 35 { immigrationDrift -= (35 - economy) * 0.008 }
        if liberty > 65 { immigrationDrift += (liberty - 65) * 0.004 }
        if unrest > 55 { immigrationDrift -= (unrest - 55) * 0.008 }
        if immigrationDrift != 0 {
            let current = newState.metrics["metric_immigration"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_immigration"] = clampMetricInt(current + immigrationDrift)
        }

        // ── ENVIRONMENT ───────────────────────────────────────────────────────
        // Growth without green policy degrades environment (Environmental Kuznets Curve).
        // Energy policy and innovation directly affect environmental outcomes.
        var envDrift = 0.0
        if economy > 70 { envDrift -= (economy - 70) * 0.008 }
        if energyVal < 40 { envDrift -= (40 - energyVal) * 0.006 }
        if innovation > 70 { envDrift += (innovation - 70) * 0.004 }
        if envDrift != 0 {
            let current = newState.metrics["metric_environment"] ?? INITIAL_METRIC_VALUE
            newState.metrics["metric_environment"] = clampMetricInt(current + envDrift)
        }

        // ── DIPLOMATIC SHOCK DECAY ──────────────────────────────────────────────
        // 45% per-turn decay. Cleared when |shock| < 0.2.
        var hidden = newState.hiddenMetrics ?? [:]
        if let shock = hidden["diplomaticShock"], abs(shock) > 0.1 {
            let decayed = shock * 0.55
            hidden["diplomaticShock"] = abs(decayed) > 0.2 ? decayed : nil
        }
        newState.hiddenMetrics = hidden

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
        // Two-tier approval model grounded in political science research
        // (Hibbs "Bread and Peace", Fiorina retrospective voting, Mueller rally effects).
        //
        // Tier 1 — Core public-facing drivers. Weights sum to 1.0.
        // Economy remains dominant (Hibbs "Bread and Peace") but reduced from 0.38
        // to 0.30 now that employment is tracked independently rather than proxied.
        // Employment added at 0.14 — top-3 voter concern per Okun's misery index.
        let coreWeights: [(key: String, weight: Double)] = [
            ("metric_economy",      0.30),
            ("metric_inflation",    0.20),  // inverse
            ("metric_employment",   0.14),
            ("metric_health",       0.14),
            ("metric_public_order", 0.12),
            ("metric_crime",        0.10),  // inverse
        ]

        var coreSum = 0.0
        var coreTotal = 0.0
        for entry in coreWeights {
            let value = state.metrics[entry.key] ?? 50.0
            let adjusted = isInverseMetric(entry.key) ? (100 - value) : value
            coreSum += adjusted * entry.weight
            coreTotal += entry.weight
        }
        // Compress tier 1 deviation from neutral by 0.5.
        // A weighted average of all core metrics at ~65 (well-governed country) otherwise
        // compounds to ~78% approval before tier 2 — historically unprecedented as a starting
        // position. Compression maps "strong country" → ~58–65%, "exceptional country" → ~70–75%,
        // matching sustained real-world approval ranges for leaders who inherit good conditions.
        let rawBase = coreTotal > 0 ? coreSum / coreTotal : 50.0
        var base = 50.0 + (rawBase - 50.0) * 0.5

        // Tier 2 — Secondary pressures. Each metric's deviation from neutral (50)
        // pushes approval up or down. Total contribution capped at ±20, then compressed by 0.5.
        // Housing, environment, and infrastructure added as growing voter concerns.
        let secondaryFactors: [(key: String, factor: Double)] = [
            ("metric_unrest",            0.12),  // inverse — civil disorder signal
            ("metric_foreign_relations", 0.12),  // diplomatic standing
            ("metric_equality",          0.09),  // wealth distribution
            ("metric_housing",           0.08),  // affordability is a core daily concern
            ("metric_liberty",           0.07),  // ideologically polarized, dampened net impact
            ("metric_foreign_influence", 0.06),  // inverse — election interference, cyber
            ("metric_economic_bubble",   0.06),  // inverse — systemic financial risk
            ("metric_environment",       0.06),  // growing climate salience
            ("metric_military",          0.05),  // peacetime baseline
            ("metric_bureaucracy",       0.04),  // inverse — chronic frustration
            ("metric_innovation",        0.04),  // longest lag; R&D felt years later
            ("metric_infrastructure",    0.04),  // visible quality of life impact
        ]

        var secondaryPressure = 0.0
        for entry in secondaryFactors {
            let value = state.metrics[entry.key] ?? 50.0
            let adjusted = isInverseMetric(entry.key) ? (100 - value) : value
            secondaryPressure += (adjusted - 50.0) * entry.factor
        }
        base += max(-20.0, min(20.0, secondaryPressure)) * 0.5

        // Player trait modifiers
        if let playerStats = state.player?.stats {
            let compassionBase = (playerStats.compassion - 50) * 0.15
            let integrityBase = (playerStats.integrity - 50) * 0.1
            let compassionJitter = (Double.random(in: 0...1) * 0.06) - 0.03
            let integrityJitter = (Double.random(in: 0...1) * 0.04) - 0.02
            base += (compassionBase + compassionJitter + integrityBase + integrityJitter)
        }

        // Corruption penalty — nonlinear threshold effect, applied separately.
        // Below 40: within tolerance, no penalty. Above 40: each point costs 0.45 approval.
        // Reflects research showing minor ethics issues are tolerated but major scandals
        // (Watergate, Lewinsky) cause catastrophic nonlinear approval collapses.
        let corruption = state.metrics["metric_corruption"] ?? 0
        if corruption > 40 {
            let corruptionPenalty = (corruption - 40) * 0.45
            let penaltyJitter = (Double.random(in: 0...1) * 0.05) - 0.025
            base -= (corruptionPenalty + penaltyJitter) * 0.5
        }

        // Foreign relations nonlinear threshold — below 35 is diplomatic collapse territory.
        // Each point below 35 adds an extra 0.30 penalty beyond the secondary factor contribution.
        // At 29: (35-29)*0.30 = 1.8 extra points → combined with secondary factor gives ~5-7 total
        // approval drag, which better reflects real political cost of diplomatic isolation.
        let foreignRelations = state.metrics["metric_foreign_relations"] ?? 50
        if foreignRelations < 35 {
            let foreignPenalty = (35 - foreignRelations) * 0.30
            let fJitter = (Double.random(in: 0...1) * 0.04) - 0.02
            base -= (foreignPenalty + fJitter) * 0.5
        }

        // Diplomatic/military shock — persistent approval pressure from hostile diplomatic or
        // military actions (e.g. attacking an ally), accumulated in hiddenMetrics["diplomaticShock"]
        // and decaying 45% per turn. Prevents calculateApproval() from fully erasing the political
        // cost of aggressive foreign policy between scenario turns.
        if let shock = state.hiddenMetrics?["diplomaticShock"], abs(shock) > 0.1 {
            base += max(-20.0, min(20.0, shock)) * 0.5
        }

        // Political saturation — sustained approval above ~80 is historically exceptional.
        // High approval attracts opposition coalitions, press scrutiny, and rising expectations.
        // Compression above 80 asymptotically caps the ceiling around 88–90 for any governance
        // profile, matching historical peaks (Bush post-9/11 ~90%, sustained ~85% is extraordinary).
        // Without this, consistently positive metric states compound toward 100 over long games.
        if base > 80 {
            let excess = base - 80
            base = 80 + excess * 0.55
        }

        state.metrics["metric_approval"] = clampMetricInt(base)
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

        if finalApproval < 30 {
            performanceGrade = "COLLAPSE"
            overallAssessment = "Complete systemic failure. The administration lost all public confidence and control, leading to immediate termination of the term."
        } else if Double(finalApproval) >= Double(75 + approvalThresholdBase) && averageChange >= (5 + changeThresholdBase) {
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
        } else if finalApproval >= 30 && averageChange >= 3 {
            performanceGrade = "D"
            overallAssessment = "The administration ended with low public confidence but showed meaningful improvement across key policy areas, suggesting a late-term recovery trajectory not yet reflected in public opinion."
        } else {
            performanceGrade = "F"
            overallAssessment = "Catastrophic performance with widespread deterioration across critical systems. The administration failed to address fundamental challenges."
        }

        // Status-aware grade cap: removal or resignation cannot produce a passing grade.
        switch state.status {
        case .impeached:
            if performanceGrade == "A" || performanceGrade == "B" || performanceGrade == "C" { performanceGrade = "F" }
            overallAssessment = "The administration was removed from office by the legislature. Systemic failures across core governance domains eroded the mandate to govern before the term concluded."
        case .resigned:
            let termFraction = state.maxTurns > 0 ? Double(state.turn) / Double(state.maxTurns) : 0
            if termFraction < 0.5 {
                if performanceGrade == "A" || performanceGrade == "B" || performanceGrade == "C" { performanceGrade = "D" }
                overallAssessment = "The administration chose to resign before the midpoint of its term, citing irreconcilable political pressures. An early voluntary exit preserves institutional order, though the policy record remains incomplete."
            } else {
                overallAssessment = "The administration tendered resignation in the final half of its term. The policy record stands on its own merits against the full scope of decisions made."
            }
        default:
            break
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

        let title: String
        let description: String
        switch state.status {
        case .impeached:
            title = "REMOVAL FROM OFFICE"
            description = "Briefing generated following the legislature's vote to remove the administration from office. Metric performance, cabinet record, and key decisions are archived for the historical record."
        case .resigned:
            title = "RESIGNATION OF OFFICE"
            description = "Briefing generated following the administration's formal resignation. Metric performance, cabinet record, and key decisions are archived for the historical record."
        default:
            title = performanceGrade == "COLLAPSE" ? "TERM COLLAPSE BRIEFING" : "END OF TERM REVIEW"
            description = "Summary briefing generated at the conclusion of the administration's term, combining metric performance, cabinet actions, and key strategic decisions."
        }

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
