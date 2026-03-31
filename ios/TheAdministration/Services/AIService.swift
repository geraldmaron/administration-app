import Foundation

private let MIN_SCENARIO_OPTIONS = 3

protocol AIServiceProtocol {
    func generateScenario(context: ScenarioContext) async -> Scenario?
    func getAdvisorFeedback(scenarioId: String, optionId: String) async -> String
}

struct ScenarioContext {
    let turn: Int
    let metrics: [String: Double]
    let activeEffectsLength: Int
    let recentEvents: [String]
}

class AIService: AIServiceProtocol {
    init() {}

    func generateScenario(context: ScenarioContext) async -> Scenario? {
        // All scenarios come from Firebase
        return nil
    }

    func getAdvisorFeedback(scenarioId: String, optionId: String) async -> String {
        return "Consider the long-term implications of this decision for your administration's standing."
    }
}

let aiService = AIService()
