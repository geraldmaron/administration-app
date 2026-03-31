import Foundation

enum CabinetAutoDecisionEngine {

    struct CabinetAutoDecisionResult {
        let memberName: String
        let roleId: String
        let scenarioId: String
        let scenario: Scenario
        let chosenOption: Option
        let headline: String
        let summary: String
        let isAlert: Bool
    }

    private static let roleDomainKeywords: [String: [String]?] = [
        "role_economy":        ["economy", "economic", "trade", "fiscal", "finance", "budget", "tax", "market"],
        "role_treasury":       ["economy", "economic", "trade", "fiscal", "finance", "budget", "tax", "market"],
        "role_defense":        ["military", "defense", "armed", "security", "weapon", "war", "army", "nuclear"],
        "role_diplomacy":      ["diplomacy", "diplomatic", "foreign", "international", "relations", "treaty", "alliance"],
        "role_state":          ["diplomacy", "diplomatic", "foreign", "international", "relations", "treaty", "alliance"],
        "role_health":         ["health", "healthcare", "medical", "hospital", "disease", "pandemic", "welfare"],
        "role_hhs":            ["health", "healthcare", "medical", "hospital", "disease", "pandemic", "welfare"],
        "role_justice":        ["justice", "legal", "law", "crime", "corruption", "judiciary", "civil", "liberty"],
        "role_ag":             ["justice", "legal", "law", "crime", "corruption", "judiciary", "civil", "liberty"],
        "role_environment":    ["environment", "climate", "energy", "environmental", "green", "pollution"],
        "role_epa":            ["environment", "climate", "energy", "environmental", "green", "pollution"],
        "role_executive":      nil,
        "role_chief_of_staff": nil,
    ]

    private static let inverseMetrics: Set<String> = [
        "metric_corruption", "metric_inflation", "metric_crime",
        "metric_bureaucracy", "metric_unrest", "metric_economic_bubble", "metric_foreign_influence"
    ]

    static func processAutoDecisions(
        state: GameState,
        allScenarios: [Scenario],
        scenarioCooldowns: [String: Int]
    ) -> [CabinetAutoDecisionResult] {
        let activeCabinet = state.cabinet.filter { !$0.isVacant }
        guard !activeCabinet.isEmpty, !allScenarios.isEmpty else { return [] }

        var results: [CabinetAutoDecisionResult] = []
        var usedScenarioIds = Set<String>()

        for member in activeCabinet.shuffled() {
            guard results.count < 2 else { break }
            guard Double.random(in: 0...1) < 0.28 else { continue }

            let eligible = allScenarios.filter { scenario in
                guard scenario.options.count >= 2 else { return false }
                guard !state.playedScenarioIds.contains(scenario.id) else { return false }
                if let readyTurn = scenarioCooldowns[scenario.id], state.turn < readyTurn { return false }
                if scenario.classification?.category == "crisis" { return false }
                if scenario.classification?.category == "consequence" { return false }
                if scenario.category == "crisis" { return false }
                if usedScenarioIds.contains(scenario.id) { return false }
                return matchesDomain(scenario: scenario, roleId: member.roleId)
            }

            guard let scenario = eligible.randomElement() else { continue }

            let option = selectOption(from: scenario.options, skillLevel: member.skillLevel)

            let memberName = member.candidate?.name ?? member.roleId
                .replacingOccurrences(of: "role_", with: "")
                .split(separator: "_").map { $0.capitalized }.joined(separator: " ")

            let isAlert = optionScore(option) < 0 && member.skillLevel < 50

            let headline = option.outcomeHeadline ?? "Cabinet: \(scenario.title)"
            let baseBody = option.outcomeSummary ?? option.outcome
            let summary: String
            if let body = baseBody, !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
                let endsWithPunctuation = trimmed.last.map { ".!?".contains($0) } ?? false
                summary = endsWithPunctuation ? "\(trimmed) Directed by \(memberName)." : "\(trimmed). Directed by \(memberName)."
            } else {
                summary = "\(memberName) addressed \(scenario.title) on behalf of the administration."
            }

            results.append(CabinetAutoDecisionResult(
                memberName: memberName,
                roleId: member.roleId,
                scenarioId: scenario.id,
                scenario: scenario,
                chosenOption: option,
                headline: headline,
                summary: summary,
                isAlert: isAlert
            ))
            usedScenarioIds.insert(scenario.id)
        }

        return results
    }

    // MARK: - Private

    private static func matchesDomain(scenario: Scenario, roleId: String) -> Bool {
        guard let entry = roleDomainKeywords[roleId] else { return true }
        guard let keywords = entry else { return true }

        let domains = (scenario.classification?.domain ?? []).map { $0.lowercased() }
        let tags = (scenario.tags ?? []).map { $0.lowercased() }
        let category = (scenario.category ?? "").lowercased()

        return keywords.contains { kw in
            domains.contains { $0.contains(kw) }
                || tags.contains { $0.contains(kw) }
                || category.contains(kw)
        }
    }

    private static func optionScore(_ option: Option) -> Double {
        var score = 0.0
        if let em = option.effectsMap {
            for (metricId, v) in em {
                score += inverseMetrics.contains(metricId) ? -v : v
            }
        }
        for e in option.effects {
            score += inverseMetrics.contains(e.targetMetricId) ? -e.value : e.value
        }
        return score
    }

    private static func selectOption(from options: [Option], skillLevel: Int) -> Option {
        let jitter = Int.random(in: -10...10)
        let effective = skillLevel + jitter
        let sorted = options.sorted { optionScore($0) > optionScore($1) }
        if effective >= 68 { return sorted.first ?? options[0] }
        if effective >= 42 { return options.randomElement() ?? options[0] }
        return sorted.last ?? options[0]
    }
}
