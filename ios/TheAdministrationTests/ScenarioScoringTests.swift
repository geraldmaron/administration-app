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
            neighborEventChance: 0.0,
            metricSensitivities: nil,
            crisisProbabilities: nil
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
        regionalBoost: [String: Double]? = nil,
        regionTags: [String]? = nil,
        applicability: ScenarioApplicability? = nil
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
            involvedCountries: nil,
            regionTags: regionTags
        )

        return Scenario(
            id: id,
            title: "Test Scenario",
            description: "Description",
            applicability: applicability,
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

    func testRegionTagsGateMismatchedCountry() {
        let country = makeCountry(region: "North America", bundleOverrides: ["economy": 2.0])
        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy", regionTags: ["Middle East"])
        let state = makeDummyState()

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: state)
        XCTAssertEqual(score, 0.0, accuracy: 0.0001, "Scenarios tagged for a different region should be ineligible")
    }

    func testRegionTagsAcceptCanonicalOrDisplayForms() {
        let country = makeCountry(region: "North America", bundleOverrides: ["economy": 2.0])
        let displayTagged = makeScenario(baseWeight: 1.0, bundle: "economy", regionTags: ["North America"])
        let canonicalTagged = makeScenario(baseWeight: 1.0, bundle: "economy", regionTags: ["north_america"])
        let state = makeDummyState()

        XCTAssertGreaterThan(ScenarioNavigator.shared.scoreScenario(displayTagged, for: country, gameState: state), 0.0)
        XCTAssertGreaterThan(ScenarioNavigator.shared.scoreScenario(canonicalTagged, for: country, gameState: state), 0.0)
    }

    func testApplicabilityCountryAllowListGatesScenarioEligibility() {
        let country = makeCountry(region: "Europe", bundleOverrides: ["economy": 2.0])
        let state = makeDummyState()
        let applicability = ScenarioApplicability(
            archetypes: nil,
            requires: nil,
            metricGates: [],
            relationshipGates: nil,
            applicableCountryIds: ["other_country"]
        )
        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy", applicability: applicability)

        let score = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: state)

        XCTAssertEqual(score, 0.0, accuracy: 0.0001, "Scenario should be ineligible when the player country is not allow-listed in applicability.applicableCountryIds")
    }

    func testApplicabilityMetricGatesControlScenarioEligibility() {
        let country = makeCountry(region: "Europe", bundleOverrides: ["economy": 2.0])
        let failingState = makeDummyState()
        let passingState = GameState(
            isSetup: false,
            countryId: "test_country",
            turn: 1,
            maxTurns: 10,
            phase: .early,
            status: .active,
            gameLength: "short",
            metrics: ["metric_approval": 50, "metric_economy": 20],
            metricHistory: ["metric_approval": [50], "metric_economy": [20]],
            cabinet: [],
            activeEffects: []
        )
        let applicability = ScenarioApplicability(
            archetypes: nil,
            requires: nil,
            metricGates: [
                MetricGate(metric: "metric_economy", min: nil, max: 30)
            ],
            relationshipGates: nil,
            applicableCountryIds: nil
        )
        let scenario = makeScenario(baseWeight: 1.0, bundle: "economy", applicability: applicability)

        let failingScore = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: failingState)
        let passingScore = ScenarioNavigator.shared.scoreScenario(scenario, for: country, gameState: passingState)

        XCTAssertEqual(failingScore, 0.0, accuracy: 0.0001, "Scenario should be ineligible when a metric gate fails")
        XCTAssertGreaterThan(passingScore, 0.0, "Scenario should remain eligible when applicability.metricGates pass")
    }
}

final class TemplateEngineTests: XCTestCase {

    private func makeCountry(
        id: String,
        name: String,
        definiteArticle: String? = nil,
        tokens: [String: String]? = nil,
        geopoliticalProfile: GeopoliticalProfile? = nil,
        gameplayProfile: CountryGameplayProfile? = nil
    ) -> Country {
        Country(
            id: id,
            name: name,
            definiteArticle: definiteArticle,
            governmentProfileId: nil,
            attributes: CountryAttributes(population: 1_000_000, gdp: 1_000_000),
            military: MilitaryStats(
                strength: 50,
                nuclearCapable: false,
                posture: nil,
                navyPower: 0,
                cyberCapability: 0,
                description: nil
            ),
            diplomacy: DiplomaticStats(
                relationship: 0,
                alignment: "neutral",
                tradeAgreements: [],
                tradeRelationships: nil
            ),
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
            tokens: tokens,
            code: nil,
            flagUrl: nil,
            alliances: nil,
            economy: nil,
            geopoliticalProfile: geopoliticalProfile,
            gameplayProfile: gameplayProfile
        )
    }

    private func makeGameState(countryId: String) -> GameState {
        GameState(
            isSetup: false,
            countryId: countryId,
            turn: 1,
            maxTurns: 10,
            phase: .early,
            status: .active,
            gameLength: "short",
            metrics: ["metric_approval": 50],
            metricHistory: ["metric_approval": [50]],
            cabinet: [],
            activeEffects: []
        )
    }

    func testDecodeCountryProfilesSupportsFirestoreAliases() {
        let data: [String: Any] = [
            "geopolitical": [
                "neighbors": [
                    [
                        "country_id": "mexico",
                        "type": "neutral",
                        "strength": 15.0,
                        "shared_border": true,
                        "treaty": "Border Accord"
                    ]
                ],
                "allies": [
                    [
                        "country_id": "uk",
                        "type": "formal_ally",
                        "strength": 80.0,
                        "shared_border": false,
                        "treaty": "NATO"
                    ]
                ],
                "adversaries": [
                    [
                        "country_id": "russia",
                        "type": "adversary",
                        "strength": 90.0,
                        "shared_border": false,
                        "treaty": "Sanctions"
                    ]
                ],
                "tags": ["regional_power"],
                "government_category": "liberal_democracy",
                "regime_stability": 72.0
            ],
            "gameplay": [
                "starting_metrics": ["economy": 55.0],
                "metric_equilibria": ["approval": 50.0],
                "bundle_weight_overrides": ["diplomacy": 1.5],
                "priority_tags": ["trade"],
                "suppressed_tags": ["war"],
                "neighbor_event_chance": 0.25
            ]
        ]

        let profiles = FirebaseDataService.decodeCountryProfiles(from: data)

        XCTAssertEqual(profiles.geopoliticalProfile?.adversaries.first?.countryId, "russia")
        XCTAssertEqual(profiles.geopoliticalProfile?.neighbors.first?.sharedBorder, true)
        XCTAssertEqual(profiles.geopoliticalProfile?.governmentCategory, .liberalDemocracy)
        XCTAssertEqual(profiles.gameplayProfile?.bundleWeightOverrides?["diplomacy"], 1.5)
        XCTAssertEqual(profiles.gameplayProfile?.neighborEventChance, 0.25)
    }

    func testResolveScenarioUsesGeopoliticalRelationshipsWhenTokensAreBlank() {
        let playerCountry = makeCountry(
            id: "player",
            name: "Test Republic",
            tokens: [
                "adversary": "",
                "the_adversary": "",
                "ally": "",
                "the_ally": "",
                "trade_partner": "",
                "the_trade_partner": "",
                "partner": "",
                "the_partner": ""
            ],
            geopoliticalProfile: GeopoliticalProfile(
                neighbors: [],
                allies: [
                    CountryRelationship(countryId: "uk", type: "formal_ally", strength: 80.0, treaty: "Alliance", sharedBorder: false),
                    CountryRelationship(countryId: "eu", type: "strategic_partner", strength: 70.0, treaty: "Trade Pact", sharedBorder: false)
                ],
                adversaries: [
                    CountryRelationship(countryId: "us", type: "adversary", strength: 90.0, treaty: "Sanctions", sharedBorder: false)
                ],
                tags: [],
                governmentCategory: .liberalDemocracy,
                regimeStability: 60.0
            )
        )
        let adversary = makeCountry(id: "us", name: "United States")
        let ally = makeCountry(id: "uk", name: "United Kingdom")
        let partner = makeCountry(id: "eu", name: "European Union", definiteArticle: "the")
        let scenario = Scenario(
            id: "sc_relationships",
            title: "Summit with {the_adversary}",
            description: "{ally} and {the_trade_partner} responded.",
            options: [Option(id: "option_1", text: "Brief {adversary} and {partner}.")]
        )

        TemplateEngine.shared.setCountries([playerCountry, adversary, ally, partner])
        defer { TemplateEngine.shared.setCountries([]) }

        let resolved = TemplateEngine.shared.resolveScenario(
            scenario,
            country: playerCountry,
            gameState: makeGameState(countryId: playerCountry.id)
        )

        XCTAssertEqual(resolved.title, "Summit with the United States")
        XCTAssertEqual(resolved.description, "United Kingdom and the European Union responded.")
        XCTAssertEqual(resolved.options.first?.text, "Brief United States and European Union.")
    }

    func testMissingRequiredTokensFlagsBorderRivalScenarioWhenCountryHasNoBorderRival() {
        let playerCountry = makeCountry(
            id: "player",
            name: "United States",
            geopoliticalProfile: GeopoliticalProfile(
                neighbors: [
                    CountryRelationship(countryId: "canada", type: "neutral", strength: 40.0, treaty: nil, sharedBorder: true),
                    CountryRelationship(countryId: "mexico", type: "neutral", strength: 35.0, treaty: nil, sharedBorder: true)
                ],
                allies: [],
                adversaries: [],
                tags: [],
                governmentCategory: .liberalDemocracy,
                regimeStability: 70.0
            )
        )
        let canada = makeCountry(id: "canada", name: "Canada")
        let mexico = makeCountry(id: "mexico", name: "Mexico")
        let scenario = Scenario(
            id: "sc_border_rival",
            title: "Responding To Neighbor Tariffs",
            description: "{the_border_rival} has imposed significant tariffs on key exports.",
            options: [Option(id: "option_1", text: "Call {the_border_rival}.")]
        )

        TemplateEngine.shared.setCountries([playerCountry, canada, mexico])
        defer { TemplateEngine.shared.setCountries([]) }

        let missing = TemplateEngine.shared.missingRequiredTokens(
            for: scenario,
            country: playerCountry,
            gameState: makeGameState(countryId: playerCountry.id)
        )

        XCTAssertEqual(missing, ["the_border_rival"])
        XCTAssertFalse(
            TemplateEngine.shared.canResolveScenarioWithoutFallback(
                scenario,
                country: playerCountry,
                gameState: makeGameState(countryId: playerCountry.id)
            )
        )
    }

    func testMissingRequiredTokensAllowsScenarioWhenBorderRivalExists() {
        let playerCountry = makeCountry(
            id: "player",
            name: "Test Republic",
            geopoliticalProfile: GeopoliticalProfile(
                neighbors: [
                    CountryRelationship(countryId: "neighbor_rival", type: "rival", strength: 80.0, treaty: nil, sharedBorder: true)
                ],
                allies: [],
                adversaries: [],
                tags: [],
                governmentCategory: .liberalDemocracy,
                regimeStability: 70.0
            )
        )
        let borderRival = makeCountry(id: "neighbor_rival", name: "Hostile Neighbor")
        let scenario = Scenario(
            id: "sc_border_rival_present",
            title: "Border Incident",
            description: "{the_border_rival} has moved troops closer to the frontier.",
            options: [Option(id: "option_1", text: "Warn {the_border_rival}.")]
        )

        TemplateEngine.shared.setCountries([playerCountry, borderRival])
        defer { TemplateEngine.shared.setCountries([]) }

        XCTAssertTrue(
            TemplateEngine.shared.canResolveScenarioWithoutFallback(
                scenario,
                country: playerCountry,
                gameState: makeGameState(countryId: playerCountry.id)
            )
        )
    }

    func testResolveScenarioPrefersMostHostileAdversary() {
        let playerCountry = makeCountry(
            id: "player",
            name: "Test Republic",
            tokens: [
                "adversary": "",
                "the_adversary": ""
            ],
            geopoliticalProfile: GeopoliticalProfile(
                neighbors: [],
                allies: [],
                adversaries: [
                    CountryRelationship(countryId: "china", type: "rival", strength: -55.0, treaty: nil, sharedBorder: false),
                    CountryRelationship(countryId: "russia", type: "adversary", strength: -75.0, treaty: nil, sharedBorder: false)
                ],
                tags: [],
                governmentCategory: .liberalDemocracy,
                regimeStability: 60.0
            )
        )
        let china = makeCountry(id: "china", name: "China")
        let russia = makeCountry(id: "russia", name: "Russia")
        let scenario = Scenario(
            id: "sc_adversary_priority",
            title: "Briefing on {the_adversary}",
            description: "{the_adversary} has escalated the crisis.",
            options: [Option(id: "option_1", text: "Confront {the_adversary}.")]
        )

        TemplateEngine.shared.setCountries([playerCountry, china, russia])
        defer { TemplateEngine.shared.setCountries([]) }

        let resolved = TemplateEngine.shared.resolveScenario(
            scenario,
            country: playerCountry,
            gameState: makeGameState(countryId: playerCountry.id)
        )

        XCTAssertEqual(resolved.title, "Briefing on Russia")
        XCTAssertEqual(resolved.description, "Russia has escalated the crisis.")
        XCTAssertEqual(resolved.options.first?.text, "Confront Russia.")
    }
}

