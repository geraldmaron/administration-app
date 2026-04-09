import XCTest
@testable import TheAdministration

final class TemplateEngineTextNormalizationTests: XCTestCase {

    private func makeCountry() -> Country {
        Country(
            id: "us",
            name: "United States",
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
                alignment: "Neutral",
                tradeAgreements: [],
                tradeRelationships: nil
            ),
            leaderTitle: "President",
            tokens: [
                "adversary": "hostile power",
                "the_adversary": "the hostile power"
            ]
        )
    }

    private func makeGameState() -> GameState {
        GameState(
            isSetup: false,
            countryId: "us",
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

    func testResolveScenarioCleansDuplicatedTextAndCapitalizesAfterTokens() {
        let engine = TemplateEngine.shared
        engine.setCountries([makeCountry()])

        let scenario = Scenario(
            id: "scenario_1",
            title: "budget budget crisis",
            description: "{the_player_country} faces a significant a significant deficit. {the_player_country} faces a significant deficit.",
            options: [
                Option(
                    id: "option_a",
                    text: "{The_Player_Country} faces a significant a significant budget shock.",
                    outcomeHeadline: "{leader_title} announces emergency measures",
                    outcomeSummary: "markets react. {the_player_country} braces for austerity. {the_player_country} braces for austerity.",
                    outcomeContext: nil
                )
            ]
        )

        let resolved = engine.resolveScenario(scenario, country: makeCountry(), gameState: makeGameState())

        XCTAssertEqual(resolved.title, "Budget crisis")
        XCTAssertEqual(resolved.description, "The United States Faces a significant deficit.")
        XCTAssertEqual(resolved.options[0].text, "The United States Faces a significant budget shock.")
        XCTAssertEqual(resolved.options[0].outcomeHeadline, "President Announces emergency measures")
        XCTAssertEqual(resolved.options[0].outcomeSummary, "Markets react. The United States Braces for austerity.")
    }

    func testSingleBraceRoleTokensResolve() {
        let engine = TemplateEngine.shared
        let country = Country(
            id: "us",
            name: "United States",
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
                alignment: "Neutral",
                tradeAgreements: [],
                tradeRelationships: nil
            ),
            tokens: [
                "environment_role": "EPA Administrator",
                "finance_role": "Treasury Secretary",
                "interior_role": "Secretary of the Interior"
            ]
        )
        engine.setCountries([country])

        let scenario = Scenario(
            id: "test_role_tokens",
            title: "Emission Limits",
            description: "The {environment_role} has proposed new limits. The {finance_role} flagged costs. The {interior_role} is monitoring unrest.",
            options: []
        )

        let resolved = engine.resolveScenario(scenario, country: country, gameState: makeGameState())

        XCTAssertFalse(resolved.description.contains("{environment_role}"), "environment_role token should be resolved")
        XCTAssertFalse(resolved.description.contains("{finance_role}"), "finance_role token should be resolved")
        XCTAssertFalse(resolved.description.contains("{interior_role}"), "interior_role token should be resolved")
        XCTAssertTrue(resolved.description.contains("EPA Administrator"))
        XCTAssertTrue(resolved.description.contains("Treasury Secretary"))
        XCTAssertTrue(resolved.description.contains("Secretary of the Interior"))
    }

    func testDoubleBraceRoleTokensResolve() {
        let engine = TemplateEngine.shared
        let country = Country(
            id: "us",
            name: "United States",
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
                alignment: "Neutral",
                tradeAgreements: [],
                tradeRelationships: nil
            ),
            tokens: [
                "environment_role": "EPA Administrator",
                "finance_role": "Treasury Secretary"
            ]
        )
        engine.setCountries([country])

        let scenario = Scenario(
            id: "test_double_brace",
            title: "Policy Review",
            description: "The {{environment_role}} and {{finance_role}} held talks.",
            options: []
        )

        let resolved = engine.resolveScenario(scenario, country: country, gameState: makeGameState())

        XCTAssertFalse(resolved.description.contains("{{environment_role}}"), "double-brace environment_role should be resolved")
        XCTAssertFalse(resolved.description.contains("{{finance_role}}"), "double-brace finance_role should be resolved")
        XCTAssertTrue(resolved.description.contains("EPA Administrator"))
        XCTAssertTrue(resolved.description.contains("Treasury Secretary"))
    }
}