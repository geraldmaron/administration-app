import XCTest
@testable import TheAdministration

final class PolicyImplicationTests: XCTestCase {

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

    private func makeOption(
        effects: [Effect] = [],
        policyImplications: [PolicyImplication]? = nil
    ) -> Option {
        Option(
            id: "opt_test",
            text: "Test option",
            label: "Test",
            effects: effects,
            policyImplications: policyImplications
        )
    }

    private func makeEffect(targetMetric: String, value: Double, duration: Int = 1) -> Effect {
        Effect(
            targetMetricId: targetMetric,
            value: value,
            duration: duration,
            probability: 1.0,
            delay: nil
        )
    }

    // MARK: - applyPolicyImplications

    func testApplyFiscalImplications() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults

        let implications = [
            PolicyImplication(target: "fiscal.taxIncome", delta: 5),
            PolicyImplication(target: "fiscal.spendingMilitary", delta: -3),
        ]

        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertEqual(state.fiscalSettings?.taxIncome, 30) // 25 + 5
        XCTAssertEqual(state.fiscalSettings?.spendingMilitary, 17) // 20 - 3
    }

    func testApplyPolicyImplications() {
        var state = makeMinimalState()
        state.policySettings = PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: 50, socialSpending: 50,
            defenseSpending: 50, environmentalPolicy: 50
        )

        let implications = [
            PolicyImplication(target: "policy.defenseSpending", delta: 10),
            PolicyImplication(target: "policy.environmentalPolicy", delta: -8),
        ]

        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertEqual(state.policySettings?.defenseSpending, 60) // 50 + 10
        XCTAssertEqual(state.policySettings?.environmentalPolicy, 42) // 50 - 8
    }

    func testClampingLowerBound() {
        var state = makeMinimalState()
        state.fiscalSettings = FiscalSettings(
            budgetAllocation: nil, taxRate: nil, spending: nil,
            taxIncome: 5, taxCorporate: 15,
            spendingMilitary: 20, spendingInfrastructure: 20, spendingSocial: 30
        )

        let implications = [PolicyImplication(target: "fiscal.taxIncome", delta: -10)]
        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertEqual(state.fiscalSettings?.taxIncome, 0) // Clamped to 0, not -5
    }

    func testClampingUpperBound() {
        var state = makeMinimalState()
        state.policySettings = PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: 95, socialSpending: nil,
            defenseSpending: nil, environmentalPolicy: nil
        )

        let implications = [PolicyImplication(target: "policy.economicStance", delta: 10)]
        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertEqual(state.policySettings?.economicStance, 100) // Clamped to 100, not 105
    }

    func testNilSettingsInitializedFromDefaults() {
        var state = makeMinimalState()
        XCTAssertNil(state.fiscalSettings)

        let implications = [PolicyImplication(target: "fiscal.taxIncome", delta: 5)]
        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertNotNil(state.fiscalSettings)
        XCTAssertEqual(state.fiscalSettings?.taxIncome, 30) // defaults 25 + 5
    }

    func testNilPolicySettingsInitializedWithDefaults() {
        var state = makeMinimalState()
        XCTAssertNil(state.policySettings)

        let implications = [PolicyImplication(target: "policy.defenseSpending", delta: 5)]
        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertNotNil(state.policySettings)
        XCTAssertEqual(state.policySettings?.defenseSpending, 55) // default 50 + 5
    }

    func testEmptyImplicationsNoOp() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults

        ScoringEngine.applyPolicyImplications(state: &state, implications: [])

        XCTAssertEqual(state.fiscalSettings?.taxIncome, 25) // Unchanged
    }

    func testInvalidTargetIgnored() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults

        let implications = [PolicyImplication(target: "invalid.target", delta: 10)]
        ScoringEngine.applyPolicyImplications(state: &state, implications: implications)

        XCTAssertEqual(state.fiscalSettings?.taxIncome, 25) // Unchanged
    }

    // MARK: - inferPolicyImplications

    func testInferFromMilitaryPositive() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_military", value: 3.0)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        let spendingMilitary = inferred.first { $0.target == "fiscal.spendingMilitary" }
        let defenseSpending = inferred.first { $0.target == "policy.defenseSpending" }
        XCTAssertNotNil(spendingMilitary)
        XCTAssertNotNil(defenseSpending)
        XCTAssertGreaterThan(spendingMilitary!.delta, 0)
        XCTAssertGreaterThan(defenseSpending!.delta, 0)
    }

    func testInferFromMilitaryNegative() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_military", value: -3.0)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        let spendingMilitary = inferred.first { $0.target == "fiscal.spendingMilitary" }
        XCTAssertNotNil(spendingMilitary)
        XCTAssertLessThan(spendingMilitary!.delta, 0)
    }

    func testInferFromEnvironment() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_environment", value: 2.5)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        let envPolicy = inferred.first { $0.target == "policy.environmentalPolicy" }
        XCTAssertNotNil(envPolicy)
        XCTAssertGreaterThan(envPolicy!.delta, 0)
    }

    func testInferFromInfrastructure() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_infrastructure", value: 2.5)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        let infraSpending = inferred.first { $0.target == "fiscal.spendingInfrastructure" }
        XCTAssertNotNil(infraSpending)
        XCTAssertGreaterThan(infraSpending!.delta, 0)
    }

    func testNoInferenceForWeakEffects() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_military", value: 1.0)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        XCTAssertTrue(inferred.isEmpty, "Weak effects (< 2.0 for military) should not produce inferred implications")
    }

    func testInferredDeltasCapped() {
        let option = makeOption(effects: [makeEffect(targetMetric: "metric_military", value: 10.0)])
        let inferred = ScoringEngine.inferPolicyImplications(option: option)

        for impl in inferred {
            XCTAssertLessThanOrEqual(abs(impl.delta), 8.0, "Inferred deltas should be capped at ±8")
        }
    }

    func testExplicitOverridesInference() {
        let explicit = [PolicyImplication(target: "fiscal.spendingMilitary", delta: 2)]
        let option = makeOption(
            effects: [makeEffect(targetMetric: "metric_military", value: 4.0)],
            policyImplications: explicit
        )

        let result = option.policyImplications ?? ScoringEngine.inferPolicyImplications(option: option)

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].target, "fiscal.spendingMilitary")
        XCTAssertEqual(result[0].delta, 2) // Explicit value, not inferred
    }

    // MARK: - Integration with applyDecision

    func testApplyDecisionWithExplicitPolicyImplications() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults
        state.currentScenario = Scenario(
            id: "scenario_test", title: "Test", description: "Test scenario",
            options: []
        )

        let taxBefore = state.fiscalSettings!.taxIncome
        XCTAssertEqual(taxBefore, 25, "Precondition: taxIncome starts at default 25")

        let option = makeOption(
            effects: [makeEffect(targetMetric: "metric_economy", value: 2.0)],
            policyImplications: [
                PolicyImplication(target: "fiscal.taxIncome", delta: 5),
                PolicyImplication(target: "fiscal.spendingSocial", delta: -4),
            ]
        )

        let newState = ScoringEngine.applyDecision(state: state, option: option)

        XCTAssertEqual(newState.fiscalSettings?.taxIncome, 30, "taxIncome should be 25 + 5 = 30")
        XCTAssertEqual(newState.fiscalSettings?.spendingSocial, 26, "spendingSocial should be 30 - 4 = 26")
        XCTAssertEqual(newState.fiscalSettings?.taxCorporate, 15, "taxCorporate should be unchanged")
    }

    func testApplyDecisionWithInferredPolicyImplications() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults
        state.policySettings = PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: nil, socialSpending: nil,
            defenseSpending: 50, environmentalPolicy: nil
        )
        state.currentScenario = Scenario(
            id: "scenario_mil", title: "Military Test", description: "Test scenario",
            options: []
        )

        let spendingBefore = state.fiscalSettings!.spendingMilitary
        XCTAssertEqual(spendingBefore, 20, "Precondition: spendingMilitary starts at default 20")
        let defenseBefore = state.policySettings!.defenseSpending
        XCTAssertEqual(defenseBefore, 50, "Precondition: defenseSpending starts at 50")

        let option = makeOption(
            effects: [makeEffect(targetMetric: "metric_military", value: 3.0, duration: 3)]
        )
        XCTAssertNil(option.policyImplications, "No explicit policyImplications — inference should kick in")

        let newState = ScoringEngine.applyDecision(state: state, option: option)

        XCTAssertGreaterThan(newState.fiscalSettings!.spendingMilitary, spendingBefore,
            "spendingMilitary should increase via inference from metric_military +3.0")
        XCTAssertGreaterThan(newState.policySettings!.defenseSpending!, defenseBefore!,
            "defenseSpending should increase via inference from metric_military +3.0")
    }

    func testApplyDecisionNoImplicationsWhenEffectsWeak() {
        var state = makeMinimalState()
        state.fiscalSettings = .defaults
        state.currentScenario = Scenario(
            id: "scenario_weak", title: "Weak Test", description: "Test scenario",
            options: []
        )

        let option = makeOption(
            effects: [makeEffect(targetMetric: "metric_military", value: 1.0)]
        )

        let newState = ScoringEngine.applyDecision(state: state, option: option)

        XCTAssertEqual(newState.fiscalSettings?.spendingMilitary, 20,
            "spendingMilitary should be unchanged — effect magnitude 1.0 is below inference threshold")
    }
}
