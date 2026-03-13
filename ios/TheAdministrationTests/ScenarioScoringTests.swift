/// ScenarioScoringTests
/// Verifies that geopolitical scoring (bundle + region multipliers)
/// behaves deterministically and safely for different configurations.
import XCTest
@testable import TheAdministration

final class ScenarioScoringTests: XCTestCase {

    private func makeCountry(
        region: String? = "europe",
        bundleOverrides: [String: Double]? = nil
    ) -> Country {
        let attributes = CountryAttributes(population: 1_000_000, gdp: 1_000_000)
        let military = MilitaryStats(
            strength: 50,
            nuclearCapable: false,
            posture: nil,
            navyPower: 0,
            cyberCapability: 0,
            description: nil
        )
        let diplomacy = DiplomaticStats(
            relationship: 0,
            alignment: "Neutral",
            tradeAgreements: [],
            tradeRelationships: nil
        )

        let gameplay = CountryGameplayProfile(
            startingMetrics: [:],
            metricEquilibria: [:],
            bundleWeightOverrides: bundleOverrides,
            priorityTags: [],
            suppressedTags: [],
            neighborEventChance: 0.0
        )

        return Country(
            id: "test_country",
            name: "Testland",
            governmentProfileId: nil,
            attributes: attributes,
            military: military,
            diplomacy: diplomacy,
            region: region,
            leaderTitle: nil,
            leader: nil,
            difficulty: nil,
            termLengthYears: nil,
            currentPopulation: nil,
            population: nil,
            gdp: nil,
            description: nil,
            subdivisions: nil,
            blocs: nil,
            analysisBullets: nil,
            strengths: nil,
            weaknesses: nil,
            vulnerabilities: nil,
            uniqueCapabilities: nil,
            tokens: nil,
            code: nil,
            flagUrl: nil,
            alliances: nil,
            economy: nil,
            geopoliticalProfile: nil,
            gameplayProfile: gameplay
        )
    }

    private func makeScenario(
        id: String = "sc_test",
        baseWeight: Double = 1.0,
        bundle: String? = nil,
        regionalBoost: [String: Double]? = nil
    ) -> Scenario {
        let metadata = ScenarioMetadata(
            applicableCountries: nil,
            requiresTags: nil,
            excludesTags: nil,
            requiredGeopoliticalTags: nil,
            excludedGeopoliticalTags: nil,
            requiredGovernmentCategories: nil,
            excludedGovernmentCategories: nil,
            regionalBoost: regionalBoost,
            isNeighborEvent: nil,
            involvedCountries: nil
        )

        return Scenario(
            id: id,
            title: "Test Scenario",
            description: "Description",
            conditions: nil,
            phase: nil,
            severity: nil,
            chainId: nil,
            options: [],
            chainsTo: nil,
            actor: nil,
            location: nil,
            tags: nil,
            cooldown: nil,
            classification: nil,
            behavior: nil,
            weight: baseWeight,
            tier: nil,
            category: bundle,
            triggerConditions: nil,
            oncePerGame: nil,
            titleTemplate: nil,
            descriptionTemplate: nil,
            tokenMap: nil,
            storagePath: nil,
            metadata: metadata
        )
    }

    private func makeDummyState() -> GameState {
        var metrics: [String: Double] = [:]
        var history: [String: [Double]] = [:]
        metrics["metric_approval"] = 50
        history["metric_approval"] = [50]

        return GameState(
            isSetup: false,
            countryId: "test_country",
            turn: 1,
            maxTurns: 10,
            phase: .early,
            status: .active,
            gameLength: "short",
            metrics: metrics,
            metricHistory: history,
            cabinet: [],
            activeEffects: []
        )
    }

    func testBundleMultiplierApplied() {
        let country = makeCountry(bundleOverrides: ["economy": 2.0])
        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy")
        let state = makeDummyState()

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: state)
        XCTAssertEqual(score, 2.0, accuracy: 0.0001, "Bundle multiplier should double the base weight")
    }

    func testUnknownBundleDoesNotChangeScore() {
        let country = makeCountry(bundleOverrides: ["economy": 2.0])
        let scenario = makeScenario(baseWeight: 1.0, bundle: "unknown_bundle")
        let state = makeDummyState()

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: state)
        XCTAssertEqual(score, 1.0, accuracy: 0.0001, "Unknown bundle should leave score unchanged")
    }

    func testRegionalBoostApplied() {
        let country = makeCountry(region: "europe", bundleOverrides: ["economy": 2.0])
        let regionalBoost = ["europe": 1.5]
        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy", regionalBoost: regionalBoost)
        let state = makeDummyState()

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: state)
        XCTAssertEqual(score, 3.0, accuracy: 0.0001, "Bundle and region multipliers should both apply (1.0 * 2.0 * 1.5)")
    }

    func testNilProfilesDoNotCrash() {
        // Country without gameplayProfile should still produce a non-negative score.
        let attributes = CountryAttributes(population: 1_000_000, gdp: 1_000_000)
        let military = MilitaryStats(
            strength: 50,
            nuclearCapable: false,
            posture: nil,
            navyPower: 0,
            cyberCapability: 0,
            description: nil
        )
        let diplomacy = DiplomaticStats(
            relationship: 0,
            alignment: "Neutral",
            tradeAgreements: [],
            tradeRelationships: nil
        )

        let bareCountry = Country(
            id: "bare",
            name: "Bareland",
            governmentProfileId: nil,
            attributes: attributes,
            military: military,
            diplomacy: diplomacy,
            region: nil,
            leaderTitle: nil,
            leader: nil,
            difficulty: nil,
            termLengthYears: nil,
            currentPopulation: nil,
            population: nil,
            gdp: nil,
            description: nil,
            subdivisions: nil,
            blocs: nil,
            analysisBullets: nil,
            strengths: nil,
            weaknesses: nil,
            vulnerabilities: nil,
            uniqueCapabilities: nil,
            tokens: nil,
            code: nil,
            flagUrl: nil,
            alliances: nil,
            economy: nil,
            geopoliticalProfile: nil,
            gameplayProfile: nil
        )

        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy")
        let state = makeDummyState()

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: bareCountry, gameState: state)
        XCTAssertGreaterThanOrEqual(score, 0.0, "Score should be non-negative even without profiles")
    }
}

