/// CrisisEngine
///
/// Evaluates hidden variable thresholds each turn and triggers ActiveCrisis events.
/// Called by GameStore.makeDecision after ScoringEngine.applyDecision.
/// Checks unrest, economic_bubble, foreign_influence thresholds and pushes
/// ActiveCrisis onto state.activeCrises when conditions are met.

import Foundation

enum CrisisEngine {

    // MARK: - Threshold constants

    private static let unrestCrisisThreshold: Double = 70
    private static let economicBubbleThreshold: Double = 80
    private static let foreignInfluenceThreshold: Double = 75
    private static let approvalCollapseCrisisThreshold: Double = 20

    // MARK: - Public API

    /// Evaluates the current game state and returns any newly triggered crises.
    /// Call this after `ScoringEngine.applyDecision` each turn.
    /// The caller is responsible for appending returned crises to `state.activeCrises`.
    static func evaluateCrises(state: GameState) -> [ActiveCrisis] {
        var triggered: [ActiveCrisis] = []

        let metrics = state.metrics
        let existingIds = Set(state.activeCrises.map { $0.id })

        let unrest = metrics["metric_unrest"] ?? 0
        if unrest >= unrestCrisisThreshold {
            let crisisId = "crisis_civil_unrest_\(state.turn)"
            if !existingIds.contains(crisisId) {
                triggered.append(makeCrisis(
                    id: crisisId,
                    name: "Civil Unrest",
                    description: "Civil unrest has reached a boiling point. Public order is fracturing.",
                    severity: unrest >= 90 ? .critical : .high,
                    resolutionType: "unrest_below_50",
                    startTurn: state.turn
                ))
            }
        }

        let bubble = metrics["metric_economic_bubble"] ?? 0
        if bubble >= economicBubbleThreshold {
            let crisisId = "crisis_market_crash_\(state.turn)"
            if !existingIds.contains(crisisId) {
                triggered.append(makeCrisis(
                    id: crisisId,
                    name: "Market Crash",
                    description: "An economic bubble is on the verge of bursting. Markets are unstable.",
                    severity: bubble >= 95 ? .critical : .high,
                    resolutionType: "economic_bubble_below_40",
                    startTurn: state.turn
                ))
            }
        }

        let foreignInfluence = metrics["metric_foreign_influence"] ?? 0
        if foreignInfluence >= foreignInfluenceThreshold {
            let crisisId = "crisis_sovereignty_\(state.turn)"
            if !existingIds.contains(crisisId) {
                triggered.append(makeCrisis(
                    id: crisisId,
                    name: "Sovereignty Crisis",
                    description: "Foreign interference has reached dangerous levels, threatening national sovereignty.",
                    severity: .high,
                    resolutionType: "foreign_influence_below_40",
                    startTurn: state.turn
                ))
            }
        }

        let approval = metrics["metric_approval"] ?? 50
        if approval < approvalCollapseCrisisThreshold {
            let crisisId = "crisis_approval_collapse_\(state.turn)"
            if !existingIds.contains(crisisId) {
                triggered.append(makeCrisis(
                    id: crisisId,
                    name: "Approval Collapse",
                    description: "Your government's approval has collapsed. A constitutional crisis is imminent.",
                    severity: .critical,
                    resolutionType: "approval_above_30",
                    startTurn: state.turn
                ))
            }
        }

        return triggered
    }

    /// Filters out resolved crises from `state.activeCrises`.
    /// A crisis is considered resolved when its resolution condition is no longer met.
    static func resolveExpiredCrises(state: inout GameState) {
        let metrics = state.metrics

        state.activeCrises = state.activeCrises.filter { activeCrisis in
            let id = activeCrisis.crisis.id
            if id.hasPrefix("crisis_civil_unrest") {
                return (metrics["metric_unrest"] ?? 0) >= 50
            } else if id.hasPrefix("crisis_market_crash") {
                return (metrics["metric_economic_bubble"] ?? 0) >= 40
            } else if id.hasPrefix("crisis_sovereignty") {
                return (metrics["metric_foreign_influence"] ?? 0) >= 40
            } else if id.hasPrefix("crisis_approval_collapse") {
                return (metrics["metric_approval"] ?? 50) < 30
            }
            return true
        }
    }

    // MARK: - Private helpers

    private static func makeCrisis(
        id: String,
        name: String,
        description: String,
        severity: SeverityLevel,
        resolutionType: String,
        startTurn: Int
    ) -> ActiveCrisis {
        let crisis = Crisis(
            id: id,
            name: name,
            description: description,
            severity: severity,
            triggers: [],
            duration: Crisis.CrisisDuration(min: 1, max: 10, extensionConditions: nil),
            effects: Crisis.CrisisEffects(immediate: [], perTurn: [], resolution: []),
            resolutionConditions: [
                CrisisResolution(type: resolutionType, parameters: [:])
            ],
            escalationPath: nil,
            escalationThreshold: nil,
            relatedScenarioIds: []
        )
        return ActiveCrisis(crisis: crisis, startTurn: startTurn, currentDuration: 0)
    }
}
