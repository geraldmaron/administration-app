import Foundation

class ScenarioNavigator {
    static let shared = ScenarioNavigator()

    private var scenarios: [Scenario] = []
    private var isLoaded = false

    private init() {}

    // MARK: - Public API

    /// Load all scenarios from Firebase
    func loadScenarios() async {
        if isLoaded {
            AppLogger.info("[ScenarioNavigator] Scenarios already loaded")
            return
        }

        AppLogger.info("[ScenarioNavigator] Loading scenarios from Firebase...")
        scenarios = await FirebaseDataService.shared.getAllScenarios()
        isLoaded = !scenarios.isEmpty
        AppLogger.info("[ScenarioNavigator] Loaded \(scenarios.count) scenarios")
    }

    /// Force reload scenarios from Firebase (clears cache)
    func reloadScenarios() async {
        FirebaseDataService.shared.clearCache()
        isLoaded = false
        await loadScenarios()
    }

    /// Get a scenario by ID with token resolution
    func getScenario(
        id: String,
        country: Country,
        gameState: GameState
    ) async -> Scenario? {
        // Ensure scenarios are loaded
        if !isLoaded {
            await loadScenarios()
        }

        guard let scenario = scenarios.first(where: { $0.id == id }) else {
            AppLogger.warning("[ScenarioNavigator] Scenario not found: \(id)")
            return nil
        }

        // Resolve tokens using TemplateEngine
        let resolved = TemplateEngine.shared.resolveScenario(
            scenario,
            country: country,
            gameState: gameState
        )

        return resolved
    }

    /// Find scenarios matching conditions
    func findMatchingScenarios(
        conditions: [ScenarioCondition],
        gameState: GameState
    ) async -> [Scenario] {
        // Ensure scenarios are loaded
        if !isLoaded {
            await loadScenarios()
        }

        return scenarios.filter { scenario in
            matchesConditions(scenario, conditions: conditions, gameState: gameState)
        }
    }

    /// Find scenarios by tags
    func findScenariosByTags(
        _ tags: [String],
        requireAll: Bool = false
    ) async -> [Scenario] {
        // Ensure scenarios are loaded
        if !isLoaded {
            await loadScenarios()
        }

        return scenarios.filter { scenario in
            guard let scenarioTags = scenario.tags else { return false }

            if requireAll {
                // All tags must be present
                return tags.allSatisfy { scenarioTags.contains($0) }
            } else {
                // At least one tag must be present
                return tags.contains(where: { scenarioTags.contains($0) })
            }
        }
    }

    /// Find scenarios by category
    func findScenariosByCategory(_ category: String) async -> [Scenario] {
        // Ensure scenarios are loaded
        if !isLoaded {
            await loadScenarios()
        }

        return scenarios.filter { $0.category == category }
    }

    /// Find scenarios by severity level
    func findScenariosBySeverity(_ severity: SeverityLevel) async -> [Scenario] {
        // Ensure scenarios are loaded
        if !isLoaded {
            await loadScenarios()
        }

        return scenarios.filter { $0.severity == severity }
    }

    /// Get a random scenario from available scenarios with optional filtering
    func getRandomScenario(
        country: Country,
        gameState: GameState,
        conditions: [ScenarioCondition]? = nil,
        tags: [String]? = nil,
        category: String? = nil
    ) async -> Scenario? {
        var candidates = scenarios

        // Apply filters
        if let conditions = conditions {
            candidates = candidates.filter {
                matchesConditions($0, conditions: conditions, gameState: gameState)
            }
        }

        if let tags = tags {
            candidates = candidates.filter { scenario in
                guard let scenarioTags = scenario.tags else { return false }
                return tags.contains(where: { scenarioTags.contains($0) })
            }
        }

        if let category = category {
            candidates = candidates.filter { $0.category == category }
        }

        // Select random scenario
        guard let scenario = candidates.randomElement() else {
            return nil
        }

        // Resolve tokens
        return TemplateEngine.shared.resolveScenario(
            scenario,
            country: country,
            gameState: gameState
        )
    }

    /// Get total scenario count
    func getScenarioCount() async -> Int {
        if !isLoaded {
            await loadScenarios()
        }
        return scenarios.count
    }

    // MARK: - Private Methods

    /// Check if a scenario matches the given conditions
    private func matchesConditions(
        _ scenario: Scenario,
        conditions: [ScenarioCondition],
        gameState: GameState
    ) -> Bool {
        // If scenario has its own conditions, check those first
        if let scenarioConditions = scenario.conditions {
            for condition in scenarioConditions {
                if !matchesCondition(condition, gameState: gameState) {
                    return false
                }
            }
        }

        // Then check provided conditions
        for condition in conditions {
            if !matchesCondition(condition, gameState: gameState) {
                return false
            }
        }

        return true
    }

    /// Check if a single condition is met
    private func matchesCondition(
        _ condition: ScenarioCondition,
        gameState: GameState
    ) -> Bool {
        guard let metricValue = gameState.metrics[condition.metricId] else {
            return false
        }

        if let min = condition.min, metricValue < min {
            return false
        }

        if let max = condition.max, metricValue > max {
            return false
        }

        return true
    }
}

// MARK: - Scenario Selection Utilities

extension ScenarioNavigator {
    /// Select scenarios with weighted random selection
    func selectWeightedScenario(
        from scenarios: [Scenario],
        country: Country,
        gameState: GameState
    ) -> Scenario? {
        // Calculate total weight
        let totalWeight = scenarios.reduce(0.0) { $0 + ($1.weight ?? 1.0) }

        guard totalWeight > 0 else {
            return scenarios.randomElement()
        }

        // Random selection based on weight
        let random = Double.random(in: 0..<totalWeight)
        var accumulated = 0.0

        for scenario in scenarios {
            accumulated += scenario.weight ?? 1.0
            if random < accumulated {
                return TemplateEngine.shared.resolveScenario(
                    scenario,
                    country: country,
                    gameState: gameState
                )
            }
        }

        return scenarios.last.map {
            TemplateEngine.shared.resolveScenario(
                $0,
                country: country,
                gameState: gameState
            )
        }
    }

    /// Filter scenarios by phase
    func filterByPhase(_ phase: GamePhase) -> [Scenario] {
        scenarios.filter { scenario in
            guard let scenarioPhase = scenario.phase else { return true }

            switch phase {
            case .early:
                return scenarioPhase == "early" || scenarioPhase == "root"
            case .mid:
                return scenarioPhase == "mid"
            case .late:
                return scenarioPhase == "late"
            case .endgame:
                return scenarioPhase == "endgame" || scenarioPhase == "final"
            }
        }
    }

    /// Filter scenarios that haven't been used (once_per_game check)
    func filterUnused(usedScenarioIds: Set<String>) -> [Scenario] {
        scenarios.filter { scenario in
            // If scenario is marked once_per_game, check if it's been used
            if scenario.oncePerGame == true {
                return !usedScenarioIds.contains(scenario.id)
            }
            return true
        }
    }

        /// Apply cooldown filtering
    func filterByCooldown(
        lastUsedTurns: [String: Int],
        currentTurn: Int
    ) -> [Scenario] {
        scenarios.filter { scenario in
            guard let cooldown = scenario.cooldown,
                  let lastUsedTurn = lastUsedTurns[scenario.id] else {
                return true
            }
            return currentTurn - lastUsedTurn >= cooldown
        }
    }

    /// Filter by applicable_countries — skips scenarios restricted to other countries
    func filterByCountry(_ countryId: String) -> [Scenario] {
        scenarios.filter { scenario in
            guard let ac = scenario.metadata?.applicableCountries, !ac.isEmpty else { return true }
            return ac.contains(where: { $0.lowercased() == countryId.lowercased() })
        }
    }

    /// Filter by country profile tags (requires_tags / excludes_tags)
    func filterByCountryTags(_ countryTags: Set<String>) -> [Scenario] {
        scenarios.filter { scenario in
            if let requires = scenario.metadata?.requiresTags, !requires.isEmpty {
                guard requires.allSatisfy({ countryTags.contains($0) }) else { return false }
            }
            if let excludes = scenario.metadata?.excludesTags, !excludes.isEmpty {
                guard !excludes.contains(where: { countryTags.contains($0) }) else { return false }
            }
            return true
        }
    }

    /// Score a scenario for a given country and game state using geopolitical signals.
    /// Returns 0 for ineligible scenarios.
    func scoreScenario(
        _ scenario: Scenario,
        for country: Country?,
        gameState: GameState
    ) -> Double {
        // Legislature approval gate
        if let req = scenario.legislatureRequirement {
            let legislatureApproval = gameState.legislatureState?.approvalOfPlayer ?? 100
            if legislatureApproval < req.minApproval {
                return 0
            }
        }

        // Base weight — zero or negative means disabled
        var score = scenario.weight ?? 1.0
        if score <= 0 {
            return 0
        }

        let geoProfile = country?.geopoliticalProfile

        if !matchesRegionalScope(scenario, for: country) {
            return 0
        }

        // Government category gating
        if let requiredCats = scenario.metadata?.requiredGovernmentCategories,
           !requiredCats.isEmpty,
           let govCat = geoProfile?.governmentCategory.rawValue {
            if !requiredCats.contains(govCat) {
                return 0
            }
        }
        if let excludedCats = scenario.metadata?.excludedGovernmentCategories,
           !excludedCats.isEmpty,
           let govCat = geoProfile?.governmentCategory.rawValue,
           excludedCats.contains(govCat) {
            return 0
        }

        // Structural preconditions (requires block)
        if let req = scenario.metadata?.requires, !passesRequirements(req, for: country) {
            return 0
        }

        // Geopolitical tag requirements / exclusions
        if let requiredGeo = scenario.metadata?.requiredGeopoliticalTags,
           !requiredGeo.isEmpty {
            guard let countryTags = geoProfile?.tags else {
                return 0
            }
            let requiredSet = Set(requiredGeo)
            let countrySet = Set(countryTags)
            let matchCount = requiredSet.intersection(countrySet).count
            if matchCount == 0 {
                return 0
            }
            // Reward more overlap, with a reasonable cap
            let boost = 1.0 + min(Double(matchCount) * 0.75, 3.0)
            score *= boost
        }

        if let excludedGeo = scenario.metadata?.excludedGeopoliticalTags,
           !excludedGeo.isEmpty,
           let countryTags = geoProfile?.tags {
            let excludedSet = Set(excludedGeo)
            let countrySet = Set(countryTags)
            if !excludedSet.intersection(countrySet).isEmpty {
                return 0
            }
        }

        // Bundle multiplier from gameplay profile
        if let bundleId = scenario.category,
           let overrides = country?.gameplayProfile?.bundleWeightOverrides,
           let rawMult = overrides[bundleId] {
            // Clamp to a sane range to avoid extreme misconfiguration
            let bundleMult = max(0.1, min(rawMult, 3.0))
            score *= bundleMult
        }

        // Regional boost: normalize display region (e.g. "North America") to id ("north_america")
        if let regionDisplay = country?.region {
            let regionId = regionDisplay
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
                .replacingOccurrences(of: " ", with: "_")
            if let rawBoost = scenario.metadata?.regionalBoost?[regionId] {
                let regionBoost = max(0.1, min(rawBoost, 3.0))
                score *= regionBoost
            }
        }

        // StateTrigger weight boosts — multiply score when current metric conditions match
        if let triggers = scenario.dynamicProfile?.stateTriggers {
            for trigger in triggers {
                let metricValue = gameState.metrics[trigger.metricId] ?? 50.0
                let conditionMet: Bool
                switch trigger.condition.lowercased() {
                case "above", "gt": conditionMet = metricValue > trigger.threshold
                case "below", "lt": conditionMet = metricValue < trigger.threshold
                case "gte", ">=":   conditionMet = metricValue >= trigger.threshold
                case "lte", "<=":   conditionMet = metricValue <= trigger.threshold
                default:            conditionMet = false
                }
                if conditionMet {
                    score *= max(0.1, min(trigger.weightBoost, 5.0))
                }
            }
        }

        return max(score, 0)
    }

    func filterByRelationshipGates(_ scenarios: [Scenario], for country: Country?) -> [Scenario] {
        guard let geo = country?.geopoliticalProfile else { return scenarios }
        return scenarios.filter { scenario in
            guard let gates = scenario.metadata?.relationshipGates, !gates.isEmpty else { return true }
            return gates.allSatisfy { gate in passesRelationshipGate(gate, geo: geo) }
        }
    }

    private func passesRelationshipGate(_ gate: RelationshipGate, geo: GeopoliticalProfile) -> Bool {
        let allRelationships: [CountryRelationship] = geo.neighbors + geo.allies + geo.adversaries

        let candidates: [CountryRelationship]
        switch gate.kind {
        case "ally":
            candidates = allRelationships.filter { ["formal_ally", "strategic_partner"].contains($0.type) }
        case "rival":
            candidates = allRelationships.filter { $0.type == "rival" }
        case "adversary":
            candidates = allRelationships.filter { ["adversary", "conflict"].contains($0.type) }
        case "neighbor":
            candidates = geo.neighbors
        case "trade_partner":
            candidates = allRelationships.filter { $0.type == "strategic_partner" }
        default:
            return true
        }

        if let targetId = gate.targetId {
            guard let match = candidates.first(where: { $0.countryId == targetId }) else { return false }
            return passesRelationshipState(gate.state, strength: match.strength)
        }

        return candidates.contains { passesRelationshipState(gate.state, strength: $0.strength) }
    }

    private func passesRelationshipState(_ state: String, strength: Double) -> Bool {
        switch state {
        case "friendly": return strength >= 40
        case "hostile": return strength <= -40
        case "tense": return strength > -40 && strength < 0
        case "neutral": return strength >= -20 && strength <= 20
        default: return true
        }
    }

    func matchesRegionalScope(_ scenario: Scenario, for country: Country?) -> Bool {
        guard let regionTags = scenario.metadata?.regionTags, !regionTags.isEmpty else {
            return true
        }
        guard let countryRegion = normalizedRegionId(country?.region) else {
            return false
        }
        return regionTags.contains { normalizedRegionId($0) == countryRegion }
    }

    private func passesRequirements(_ req: ScenarioRequirements, for country: Country?) -> Bool {
        let geo = country?.geopoliticalProfile
        let tags = Set(geo?.tags ?? [])
        let powerTierOrder = ["small_state", "middle_power", "regional_power", "great_power", "superpower"]

        if let needed = req.landBorderAdversary {
            let has = (geo?.neighbors ?? []).contains { $0.sharedBorder && ["rival", "adversary", "conflict"].contains($0.type) }
            if has != needed { return false }
        }
        if let needed = req.formalAlly {
            let has = (geo?.allies ?? []).contains { $0.type == "formal_ally" }
            if has != needed { return false }
        }
        if let needed = req.adversary {
            let has = !(geo?.adversaries ?? []).isEmpty
            if has != needed { return false }
        }
        if let needed = req.tradePartner {
            let has = (geo?.allies ?? []).contains { $0.type == "strategic_partner" }
            if has != needed { return false }
        }
        if let needed = req.nuclearState {
            if tags.contains("nuclear_state") != needed { return false }
        }
        if let needed = req.islandNation {
            if tags.contains("island_nation") != needed { return false }
        }
        if let needed = req.landlocked {
            if tags.contains("landlocked") != needed { return false }
        }
        if let needed = req.coastal {
            if tags.contains("coastal") != needed { return false }
        }
        if let minTier = req.minPowerTier,
           let minIndex = powerTierOrder.firstIndex(of: minTier) {
            let countryTier = tags.first(where: { powerTierOrder.contains($0) }) ?? "small_state"
            let countryIndex = powerTierOrder.firstIndex(of: countryTier) ?? 0
            if countryIndex < minIndex { return false }
        }
        if let needed = req.cyberCapable {
            let offensiveCyber = country?.militaryProfile?.cyber.offensive ?? 0
            if (offensiveCyber > 50) != needed { return false }
        }
        if let needed = req.powerProjection {
            let doctrine = country?.militaryProfile?.doctrine.rawValue ?? ""
            if (doctrine == "power_projection") != needed { return false }
        }
        if let needed = req.largeMilitary {
            let branchCount = country?.militaryProfile?.branches.count ?? 0
            let readiness = country?.militaryProfile?.overallReadiness ?? 0
            if (branchCount >= 4 && readiness >= 60) != needed { return false }
        }
        if let needed = req.authoritarianRegime {
            let authCategories: Set<String> = ["authoritarian", "totalitarian", "absolute_monarchy"]
            let govCat = country?.geopoliticalProfile?.governmentCategory.rawValue ?? ""
            if authCategories.contains(govCat) != needed { return false }
        }
        if let needed = req.democraticRegime {
            let demoCategories: Set<String> = ["liberal_democracy", "constitutional_monarchy"]
            let govCat = country?.geopoliticalProfile?.governmentCategory.rawValue ?? ""
            if demoCategories.contains(govCat) != needed { return false }
        }
        if let needed = req.fragileState {
            let stability = country?.geopoliticalProfile?.regimeStability ?? 50
            if (stability < 35) != needed { return false }
        }
        return true
    }

    private func normalizedRegionId(_ rawRegion: String?) -> String? {
        guard let rawRegion else { return nil }
        let trimmed = rawRegion.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return trimmed
            .lowercased()
            .replacingOccurrences(of: "-", with: "_")
            .replacingOccurrences(of: " ", with: "_")
    }
}
