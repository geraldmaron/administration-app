/// ScoringParityTests
/// Verifies iOS ScoringEngine produces outputs consistent with the web
/// scoring.ts implementation for identical deterministic inputs. Stochastic
/// functions are tested with statistical range assertions.

import XCTest
@testable import TheAdministration

final class ScoringParityTests: XCTestCase {

    // MARK: - Helpers

    /// Build a minimal GameState with default 50-valued metrics.
    private func makeBaseState(
        gameLength: String = "medium",
        turn: Int = 1,
        maxTurns: Int = 60,
        metricOverrides: [String: Double] = [:]
    ) -> GameState {
        var metrics: [String: Double] = [
            "metric_approval": 50,
            "metric_economy": 50,
            "metric_foreign_relations": 50,
            "metric_public_order": 50,
            "metric_health": 50,
            "metric_education": 50,
            "metric_infrastructure": 50,
            "metric_environment": 50,
            "metric_military": 50,
            "metric_liberty": 50,
            "metric_equality": 50,
            "metric_corruption": 30,
            "metric_employment": 50,
            "metric_inflation": 30,
            "metric_innovation": 50,
            "metric_trade": 50,
            "metric_energy": 50,
            "metric_housing": 50,
            "metric_crime": 30,
            "metric_bureaucracy": 45,
        ]
        for (key, val) in metricOverrides {
            metrics[key] = val
        }

        var metricHistory: [String: [Double]] = [:]
        for (key, val) in metrics {
            metricHistory[key] = [val]
        }

        return GameState(
            isSetup: false,
            countryId: "us",
            turn: turn,
            maxTurns: maxTurns,
            phase: .early,
            status: .active,
            gameLength: gameLength,
            metrics: metrics,
            metricHistory: metricHistory,
            cabinet: [],
            activeEffects: []
        )
    }

    // MARK: - Metric ID Mapping

    func testMapMetricNameToId_prefixed() {
        // Already prefixed names should pass through unchanged.
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("metric_economy"), "metric_economy")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("metric_approval"), "metric_approval")
    }

    func testMapMetricNameToId_unprefixed() {
        // Common short names used in scenario effects.
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("economy"), "metric_economy")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("approval"), "metric_approval")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("relations"), "metric_foreign_relations")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("foreign_relations"), "metric_foreign_relations")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("control"), "metric_public_order")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("public_order"), "metric_public_order")
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("order"), "metric_public_order")
    }

    func testMapMetricNameToId_unknown() {
        // Unknown names get generic prefix.
        XCTAssertEqual(ScoringEngine.mapMetricNameToId("magic"), "metric_magic")
    }

    // MARK: - Inverse Metrics

    func testInverseMetrics() {
        // Web and iOS agree on which metrics are inverse.
        let inverseIds = ["metric_corruption", "metric_inflation", "metric_pollution", "metric_inequality", "metric_crime"]
        for id in inverseIds {
            XCTAssertTrue(ScoringEngine.isInverseMetric(id), "\(id) should be inverse")
        }

        let normalIds = ["metric_economy", "metric_approval", "metric_health", "metric_education"]
        for id in normalIds {
            XCTAssertFalse(ScoringEngine.isInverseMetric(id), "\(id) should NOT be inverse")
        }
    }

    // MARK: - Calculate Max Turns

    func testCalculateMaxTurns_short() {
        let state = makeBaseState(gameLength: "short")
        // short target = 30, ±10%  → 27..33
        for _ in 0..<50 {
            let turns = ScoringEngine.calculateMaxTurns(state)
            XCTAssertGreaterThanOrEqual(turns, 27, "Short mode min")
            XCTAssertLessThanOrEqual(turns, 33, "Short mode max")
        }
    }

    func testCalculateMaxTurns_medium() {
        let state = makeBaseState(gameLength: "medium")
        // medium target = 60, ±10%  → 54..66
        for _ in 0..<50 {
            let turns = ScoringEngine.calculateMaxTurns(state)
            XCTAssertGreaterThanOrEqual(turns, 54, "Medium mode min")
            XCTAssertLessThanOrEqual(turns, 66, "Medium mode max")
        }
    }

    func testCalculateMaxTurns_long() {
        let state = makeBaseState(gameLength: "long")
        // long target = 120, ±10%  → 108..132
        for _ in 0..<50 {
            let turns = ScoringEngine.calculateMaxTurns(state)
            XCTAssertGreaterThanOrEqual(turns, 108, "Long mode min")
            XCTAssertLessThanOrEqual(turns, 132, "Long mode max")
        }
    }

    // MARK: - Apply Jitter

    func testApplyJitter_rangePreserved() {
        // Jitter should keep values roughly in the same ballpark.
        // For a value of 3.0 the output should be within ~±1.5 after all variance.
        for _ in 0..<200 {
            let result = ScoringEngine.applyJitter(3.0, isProcessing: false)
            XCTAssertGreaterThan(result, 0.5, "Jittered 3.0 too low")
            XCTAssertLessThan(result, 6.0, "Jittered 3.0 too high")
        }
    }

    func testApplyJitter_zeroInput() {
        // Zero input should produce very small noise.
        for _ in 0..<100 {
            let result = ScoringEngine.applyJitter(0.0, isProcessing: false)
            XCTAssertGreaterThan(result, -1.0, "Jittered 0 too low")
            XCTAssertLessThan(result, 1.0, "Jittered 0 too high")
        }
    }

    func testApplyJitter_processingMode() {
        // Processing variance multiplier is 0.86–1.14 vs normal 0.88–1.12.
        var processingResults: [Double] = []
        var normalResults: [Double] = []
        let testValue = 2.5
        for _ in 0..<500 {
            processingResults.append(ScoringEngine.applyJitter(testValue, isProcessing: true))
            normalResults.append(ScoringEngine.applyJitter(testValue, isProcessing: false))
        }
        // Processing mode has slightly wider variance bounds.
        let processingRange = processingResults.max()! - processingResults.min()!
        let normalRange = normalResults.max()! - normalResults.min()!
        // Both should produce reasonable ranges (not degenerate).
        XCTAssertGreaterThan(processingRange, 0.3, "Processing variance too narrow")
        XCTAssertGreaterThan(normalRange, 0.3, "Normal variance too narrow")
    }

    // MARK: - Derive Secondary Impacts

    func testDeriveSecondaryImpacts_militaryTrigger() {
        // Large military change (>2) should cascade to economy and relations.
        let primary: [String: Double] = ["metric_military": 4.0]
        var economyHits = 0
        var relationsHits = 0
        for _ in 0..<100 {
            let secondary = ScoringEngine.deriveSecondaryImpacts(primary)
            if secondary["metric_economy"] != nil { economyHits += 1 }
            if secondary["metric_foreign_relations"] != nil { relationsHits += 1 }
        }
        // Should trigger most of the time (may occasionally be filtered by granularThreshold).
        XCTAssertGreaterThan(economyHits, 60, "Military should cascade to economy >60% of the time")
        XCTAssertGreaterThan(relationsHits, 60, "Military should cascade to relations >60% of the time")
    }

    func testDeriveSecondaryImpacts_smallChange_noCascade() {
        // Change <= 2 should NOT trigger secondary impacts.
        let primary: [String: Double] = ["metric_military": 1.5]
        for _ in 0..<50 {
            let secondary = ScoringEngine.deriveSecondaryImpacts(primary)
            XCTAssertTrue(secondary.isEmpty, "Small military change should not cascade")
        }
    }

    func testDeriveSecondaryImpacts_economyToApproval() {
        // Economy change >2 should cascade to approval.
        let primary: [String: Double] = ["metric_economy": -3.5]
        var approvalHits = 0
        for _ in 0..<100 {
            let secondary = ScoringEngine.deriveSecondaryImpacts(primary)
            if let approvalDelta = secondary["metric_approval"] {
                XCTAssertLessThan(approvalDelta, 0, "Negative economy should hurt approval")
                approvalHits += 1
            }
        }
        XCTAssertGreaterThan(approvalHits, 50, "Economy should cascade to approval often")
    }

    // MARK: - Calculate Approval

    func testCalculateApproval_baselineAllFifty() {
        // When all core metrics are 50, approval should be ~50 (no corruption penalty since corruption=30 < 40).
        var state = makeBaseState()
        ScoringEngine.calculateApproval(&state)
        let approval = state.metrics["metric_approval"] ?? 0
        XCTAssertGreaterThanOrEqual(approval, 45, "Baseline approval too low")
        XCTAssertLessThanOrEqual(approval, 55, "Baseline approval too high")
    }

    func testCalculateApproval_highCorruptionPenalty() {
        // Corruption above 40 should penalize approval.
        // Penalty = (corruption - 40) * 0.5
        // With corruption=80: penalty = 20 which would drag 50 → ~30.
        var state = makeBaseState(metricOverrides: ["metric_corruption": 80])
        ScoringEngine.calculateApproval(&state)
        let approval = state.metrics["metric_approval"] ?? 0
        XCTAssertLessThan(approval, 40, "High corruption should drag approval well below 50")
    }

    func testCalculateApproval_lowCorruptionNoEffect() {
        // Corruption at or below 40 should not apply penalty.
        var state = makeBaseState(metricOverrides: ["metric_corruption": 30])
        ScoringEngine.calculateApproval(&state)
        let approval = state.metrics["metric_approval"] ?? 0
        XCTAssertGreaterThanOrEqual(approval, 45, "Low corruption should not penalize")
    }

    // MARK: - End Game Review Grading

    func testEndGameReview_gradeA() {
        // Grade A: approval >= 75, averageChange >= 5 (medium game, no threshold adjustment).
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 80
        // Set all core metrics to 60 (started at 50 → netChange = 10).
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 60
            state.metricHistory[key] = [50, 60]
        }
        state.metricHistory["metric_approval"] = [50, 80]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "A", "Should get grade A with approval 80 and +10 average change")
    }

    func testEndGameReview_gradeB() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 68
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 53
            state.metricHistory[key] = [50, 53]
        }
        state.metricHistory["metric_approval"] = [50, 68]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "B", "Should get grade B")
    }

    func testEndGameReview_gradeC() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 55
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 49
            state.metricHistory[key] = [50, 49]
        }
        state.metricHistory["metric_approval"] = [50, 55]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "C", "Should get grade C")
    }

    func testEndGameReview_gradeD() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 42
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 46
            state.metricHistory[key] = [50, 46]
        }
        state.metricHistory["metric_approval"] = [50, 42]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "D", "Should get grade D")
    }

    func testEndGameReview_collapse() {
        var state = makeBaseState(turn: 30, maxTurns: 60)
        state.metrics["metric_approval"] = 22
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 25
            state.metricHistory[key] = [50, 25]
        }
        state.metricHistory["metric_approval"] = [50, 22]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "COLLAPSE", "Should trigger COLLAPSE at <30 approval")
    }

    func testEndGameReview_gradeF() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 32
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 35
            state.metricHistory[key] = [50, 35]
        }
        state.metricHistory["metric_approval"] = [50, 32]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "F", "Should get grade F for approval >=30 but poor metrics")
    }

    // MARK: - Game Length Grade Threshold Adjustment

    func testEndGameReview_longMode_tighterThresholds() {
        // Long mode adds +3 to approval threshold and +1.5 to change threshold.
        // So grade A needs approval >= 78 and averageChange >= 6.5.
        var state = makeBaseState(gameLength: "long", turn: 120, maxTurns: 120)
        // Approval 76 with average change 5.5 would pass medium A but not long A.
        state.metrics["metric_approval"] = 76
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 55.5
            state.metricHistory[key] = [50, 55.5]
        }
        state.metricHistory["metric_approval"] = [50, 76]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertNotEqual(review.performanceGrade, "A", "Long mode should tighten A threshold — 76 approval not enough")
        XCTAssertEqual(review.performanceGrade, "B", "Should fall to B grade in long mode")
    }

    func testEndGameReview_shortMode_relaxedThresholds() {
        // Short mode subtracts 3 from approval threshold and 1.0 from change threshold.
        // So grade A needs approval >= 72 and averageChange >= 4.
        var state = makeBaseState(gameLength: "short", turn: 30, maxTurns: 30)
        state.metrics["metric_approval"] = 73
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 54.5
            state.metricHistory[key] = [50, 54.5]
        }
        state.metricHistory["metric_approval"] = [50, 73]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertEqual(review.performanceGrade, "A", "Short mode should relax A threshold — 73 approval + 4.5 change enough")
    }

    // MARK: - Achievements & Failures

    func testEndGameReview_achievementsForLargeGains() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 80
        state.metrics["metric_economy"] = 65
        state.metricHistory["metric_economy"] = [50, 65]
        state.metrics["metric_health"] = 62
        state.metricHistory["metric_health"] = [50, 62]

        // Set remaining core metrics to modest improvement
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" && key != "metric_economy" && key != "metric_health" {
            state.metrics[key] = 55
            state.metricHistory[key] = [50, 55]
        }
        state.metricHistory["metric_approval"] = [50, 80]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertFalse(review.achievements.isEmpty, "Should have achievements for +15 economy, +12 health")

        let achievementTitles = review.achievements.map { $0.title }
        let hasEconomyAchievement = achievementTitles.contains { $0.lowercased().contains("economy") }
        let hasHealthAchievement = achievementTitles.contains { $0.lowercased().contains("health") }
        XCTAssertTrue(hasEconomyAchievement, "Should have economy achievement")
        XCTAssertTrue(hasHealthAchievement, "Should have health achievement")
    }

    func testEndGameReview_failuresForLargeDrops() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 35
        state.metrics["metric_economy"] = 30
        state.metricHistory["metric_economy"] = [50, 30]
        state.metrics["metric_health"] = 38
        state.metricHistory["metric_health"] = [50, 38]

        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" && key != "metric_economy" && key != "metric_health" {
            state.metrics[key] = 45
            state.metricHistory[key] = [50, 45]
        }
        state.metricHistory["metric_approval"] = [50, 35]

        let review = ScoringEngine.generateEndGameReview(state: state)
        XCTAssertFalse(review.failures.isEmpty, "Should have failures for -20 economy, -12 health")
    }

    func testEndGameReview_highApprovalAchievement() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 75
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 56
            state.metricHistory[key] = [50, 56]
        }
        state.metricHistory["metric_approval"] = [50, 75]

        let review = ScoringEngine.generateEndGameReview(state: state)
        let hasApprovalAchievement = review.achievements.contains { $0.title.lowercased().contains("public support") }
        XCTAssertTrue(hasApprovalAchievement, "Approval >= 70 should trigger Strong Public Support achievement")
    }

    func testEndGameReview_lowApprovalFailure() {
        var state = makeBaseState(turn: 60, maxTurns: 60)
        state.metrics["metric_approval"] = 35
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 45
            state.metricHistory[key] = [50, 45]
        }
        state.metricHistory["metric_approval"] = [50, 35]

        let review = ScoringEngine.generateEndGameReview(state: state)
        let hasLowApprovalFailure = review.failures.contains { $0.title.lowercased().contains("confidence") || $0.title.lowercased().contains("approval") }
        XCTAssertTrue(hasLowApprovalFailure, "Approval < 40 should trigger Low Public Confidence failure")
    }

    func testEndGameReview_marathonAchievementLongMode() {
        var state = makeBaseState(gameLength: "long", turn: 120, maxTurns: 120)
        state.metrics["metric_approval"] = 60
        for key in state.metrics.keys where key != "metric_approval" && key != "metric_corruption" {
            state.metrics[key] = 50
            state.metricHistory[key] = [50, 50]
        }
        state.metricHistory["metric_approval"] = [50, 60]

        let review = ScoringEngine.generateEndGameReview(state: state)
        let hasMarathon = review.achievements.contains { $0.title.lowercased().contains("marathon") }
        XCTAssertTrue(hasMarathon, "Long mode non-collapse should earn Marathon Administration")
    }

    // MARK: - Clamp Human Impact

    func testClampHumanImpact_highSeverity() {
        // High severity: multiplier = 0.005
        // Population 39M → baseline ~195K (with 80%–120% variance)
        // Repeated runs should stay in a reasonable range.
        for _ in 0..<50 {
            let result = ScoringEngine.clampHumanImpact(
                population: 39_000_000,
                requested: nil,
                severity: .high,
                kind: "casualty"
            )
            XCTAssertGreaterThan(result, 100_000, "High severity 39M pop should produce >100K casualties")
            XCTAssertLessThan(result, 1_000_000, "Should be capped well below 1M")
        }
    }

    func testClampHumanImpact_displaced4xMultiplier() {
        // Displaced has 4x the casualty multiplier.
        var casualtyResults: [Double] = []
        var displacedResults: [Double] = []
        for _ in 0..<100 {
            casualtyResults.append(ScoringEngine.clampHumanImpact(population: 10_000_000, requested: nil, severity: .medium, kind: "casualty"))
            displacedResults.append(ScoringEngine.clampHumanImpact(population: 10_000_000, requested: nil, severity: .medium, kind: "displaced"))
        }
        let avgCas = casualtyResults.reduce(0, +) / Double(casualtyResults.count)
        let avgDis = displacedResults.reduce(0, +) / Double(displacedResults.count)
        // Displaced should average ~4x casualties.
        XCTAssertGreaterThan(avgDis / avgCas, 2.5, "Displaced should be significantly larger than casualties")
        XCTAssertLessThan(avgDis / avgCas, 6.0, "Ratio should be roughly 4x")
    }

    // MARK: - Apply Decision Smoke Test

    func testApplyDecision_metricsDrift() throws {
        // Applying a decision with effects should change metrics.
        let state = makeBaseState()
        let optionJSON = """
        {
            "id": "opt_test",
            "text": "Test option with economy boost and order penalty",
            "effects": [
                {"targetMetricId": "metric_economy", "value": 3.0, "duration": 1, "probability": 1},
                {"targetMetricId": "metric_public_order", "value": -2.0, "duration": 1, "probability": 1}
            ]
        }
        """.data(using: .utf8)!
        let option = try JSONDecoder().decode(Option.self, from: optionJSON)

        let newState = ScoringEngine.applyDecision(state: state, option: option)

        // Metrics should have changed from initial values.
        let economyBefore = state.metrics["metric_economy"] ?? 50
        let economyAfter = newState.metrics["metric_economy"] ?? 50
        // Due to normalization + jitter, we can't predict exact values, but economy should differ.
        XCTAssertNotEqual(economyBefore, economyAfter, "Economy should change after decision")
    }

    // MARK: - Constants Parity

    func testInitialMetricValue_matchesWeb() {
        // Web: INITIAL_METRIC_VALUE = 50
        XCTAssertEqual(ScoringEngine.INITIAL_METRIC_VALUE, 50.0, "iOS INITIAL_METRIC_VALUE should match web's 50")
    }

    func testMaxMetricChangeBase_matchesWeb() {
        // Web: MAX_METRIC_CHANGE_BASE = 4.5
        XCTAssertEqual(ScoringEngine.MAX_METRIC_CHANGE_BASE, 4.5, "iOS MAX_METRIC_CHANGE_BASE should match web's 4.5")
    }
}
