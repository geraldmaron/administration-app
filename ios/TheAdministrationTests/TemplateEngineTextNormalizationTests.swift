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
}