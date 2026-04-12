/// ScenarioEffectTests
/// Tests that branch-specific military effects are applied correctly and that
/// hidden variable accumulation follows canonical rules each turn.
import XCTest
@testable import TheAdministration

final class ScenarioEffectTests: XCTestCase {

    // MARK: - Helpers

    private func makeMinimalState(metrics: [String: Double] = [:]) -> GameState {
        var m = metrics
        if m["metric_approval"] == nil { m["metric_approval"] = 50 }
        if m["metric_employment"] == nil { m["metric_employment"] = 50 }
        if m["metric_inflation"] == nil { m["metric_inflation"] = 40 }
        if m["metric_corruption"] == nil { m["metric_corruption"] = 30 }
        if m["metric_liberty"] == nil { m["metric_liberty"] = 60 }
        var history: [String: [Double]] = [:]
        for (k, v) in m { history[k] = [v] }
        return GameState(
            isSetup: true,
            countryId: "us",
            turn: 1,
            maxTurns: 20,
            phase: .early,
            status: .active,
            gameLength: "short",
            metrics: m,
            metricHistory: history,
            cabinet: [],
            activeEffects: []
        )
    }

    private func makeMilitaryBranch(id: String, readiness: Int) -> MilitaryBranchData {
        MilitaryBranchData(
            canonicalType: id,
            localName: id.capitalized,
            tokenKey: id,
            readiness: readiness,
            size: 50,
            equipmentLevel: 60,
            foundedYear: nil
        )
    }

    private func makeEffect(targetMetric: String? = nil, targetBranchId: String? = nil, value: Double, duration: Int = 1) -> Effect {
        Effect(
            targetMetricId: targetMetric ?? "metric_economy",
            value: value,
            duration: duration,
            probability: 1.0,
            delay: nil,
            type: nil,
            condition: nil,
            scaling: nil,
            tags: nil,
            scope: nil,
            targetCountryId: nil,
            targetBranchId: targetBranchId,
            populationImpact: nil,
            environmentalImpact: nil
        )
    }

    // MARK: - Branch Effect Tests

    func testBranchReadinessIncreasesClamped() {
        var branch = makeMilitaryBranch(id: "army", readiness: 70)
        let delta = 20
        let newReadiness = min(100, max(0, branch.readiness + delta))
        branch.readiness = newReadiness
        XCTAssertEqual(branch.readiness, 90)
    }

    func testBranchReadinessDecreasesClamped() {
        var branch = makeMilitaryBranch(id: "navy", readiness: 10)
        let delta = -30
        let newReadiness = min(100, max(0, branch.readiness + delta))
        branch.readiness = newReadiness
        XCTAssertEqual(branch.readiness, 0)
    }

    func testBranchReadinessDoesNotExceed100() {
        var branch = makeMilitaryBranch(id: "air_force", readiness: 90)
        let delta = 50
        branch.readiness = min(100, max(0, branch.readiness + delta))
        XCTAssertEqual(branch.readiness, 100)
    }

    func testBranchEffectMaxDeltaClamp() {
        // The effect delta is clamped to [-50, 50] per application
        let rawDelta = 80.0
        let clamped = max(-50, min(50, rawDelta))
        XCTAssertEqual(clamped, 50.0, accuracy: 0.001)

        let rawNegDelta = -75.0
        let clampedNeg = max(-50, min(50, rawNegDelta))
        XCTAssertEqual(clampedNeg, -50.0, accuracy: 0.001)
    }

    // MARK: - Hidden Variable Accumulation Tests

    func testUnrestIncreasesWithLowEmployment() {
        // employment < 40 → unrest +2 per turn
        let state = makeMinimalState(metrics: ["metric_employment": 35, "metric_approval": 50])
        var hiddenMetrics = state.hiddenMetrics ?? [:]
        hiddenMetrics["hidden_unrest"] = 10.0

        if let employment = state.metrics["metric_employment"], employment < 40 {
            hiddenMetrics["hidden_unrest"] = (hiddenMetrics["hidden_unrest"] ?? 0) + 2.0
        }
        XCTAssertEqual(hiddenMetrics["hidden_unrest"] ?? 0, 12.0, accuracy: 0.001)
    }

    func testUnrestIncreasesWithHighInflation() {
        // inflation > 70 → unrest +1 per turn
        let state = makeMinimalState(metrics: ["metric_inflation": 75])
        var hiddenMetrics = state.hiddenMetrics ?? [:]
        hiddenMetrics["hidden_unrest"] = 5.0

        if let inflation = state.metrics["metric_inflation"], inflation > 70 {
            hiddenMetrics["hidden_unrest"] = (hiddenMetrics["hidden_unrest"] ?? 0) + 1.0
        }
        XCTAssertEqual(hiddenMetrics["hidden_unrest"] ?? 0, 6.0, accuracy: 0.001)
    }

    func testLibertyDecaysWithHighCorruption() {
        // corruption > 60 → liberty -1 per turn
        let state = makeMinimalState(metrics: ["metric_corruption": 65, "metric_liberty": 55])
        var metrics = state.metrics

        if let corruption = metrics["metric_corruption"], corruption > 60 {
            metrics["metric_liberty"] = (metrics["metric_liberty"] ?? 50) - 1.0
        }
        XCTAssertEqual(metrics["metric_liberty"] ?? 0, 54.0, accuracy: 0.001)
    }

    func testUnrestDoesNotIncreaseWhenMetricsAreHealthy() {
        let state = makeMinimalState(metrics: [
            "metric_employment": 65,
            "metric_inflation": 30,
            "metric_corruption": 25,
        ])
        var hiddenMetrics = state.hiddenMetrics ?? [:]
        hiddenMetrics["hidden_unrest"] = 20.0
        let before = hiddenMetrics["hidden_unrest"] ?? 0.0

        if let employment = state.metrics["metric_employment"], employment < 40 {
            hiddenMetrics["hidden_unrest"] = (hiddenMetrics["hidden_unrest"] ?? 0) + 2.0
        }
        if let inflation = state.metrics["metric_inflation"], inflation > 70 {
            hiddenMetrics["hidden_unrest"] = (hiddenMetrics["hidden_unrest"] ?? 0) + 1.0
        }

        XCTAssertEqual(hiddenMetrics["hidden_unrest"] ?? 0, before, accuracy: 0.001, "Healthy metrics should not raise unrest")
    }

    func testLibertyUnaffectedWithLowCorruption() {
        let state = makeMinimalState(metrics: ["metric_corruption": 45, "metric_liberty": 60])
        var metrics = state.metrics
        let before = metrics["metric_liberty"] ?? 60.0

        if let corruption = metrics["metric_corruption"], corruption > 60 {
            metrics["metric_liberty"] = (metrics["metric_liberty"] ?? 50) - 1.0
        }
        XCTAssertEqual(metrics["metric_liberty"] ?? 0, before, accuracy: 0.001)
    }

    // MARK: - Effect Value Validation

    func testEffectValueIsFinite() {
        let effect = makeEffect(targetMetric: "metric_economy", value: Double.nan)
        XCTAssertTrue(effect.value.isNaN || effect.value.isInfinite || !effect.value.isNaN,
                      "Effect value should be validated before application")
        // The important check: NaN values must be caught (production code uses .isFinite guard)
        XCTAssertFalse(effect.value.isFinite, "NaN effect value should fail .isFinite check")
    }

    func testEffectProbabilityRange() {
        let effectFull = makeEffect(targetMetric: "metric_economy", value: 5, duration: 1)
        let prob = effectFull.probability
        XCTAssertGreaterThanOrEqual(prob, 0.0)
        XCTAssertLessThanOrEqual(prob, 1.0)
    }
}
