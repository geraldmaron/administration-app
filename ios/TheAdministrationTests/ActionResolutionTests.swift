import XCTest
@testable import TheAdministration

final class ActionResolutionTests: XCTestCase {

    func testResponsePayloadDecoding() throws {
        let json = """
        {
            "success": true,
            "result": {
                "headline": "Trade Deal Signed",
                "summary": "A bilateral trade agreement was reached.",
                "context": "Economic analysts expect growth.",
                "metricDeltas": [
                    {"metricId": "metric_economy", "delta": 2.5},
                    {"metricId": "metric_foreign_relations", "delta": 3.0}
                ],
                "relationshipDelta": 10.0,
                "targetMilitaryStrengthDelta": -5.0,
                "targetCyberCapabilityDelta": null,
                "newsCategory": "diplomacy",
                "newsTags": ["trade"],
                "isAtrocity": false
            }
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(ActionResolutionResult.self, from: json)
        XCTAssertTrue(decoded.success)
        XCTAssertNotNil(decoded.result)
        XCTAssertEqual(decoded.result?.headline, "Trade Deal Signed")
        XCTAssertEqual(decoded.result?.metricDeltas.count, 2)
        XCTAssertEqual(decoded.result?.metricDeltas[0].metricId, "metric_economy")
        XCTAssertEqual(decoded.result?.metricDeltas[0].delta, 2.5)
        XCTAssertEqual(decoded.result?.relationshipDelta, 10.0)
        XCTAssertEqual(decoded.result?.targetMilitaryStrengthDelta, -5.0)
        XCTAssertNil(decoded.result?.targetCyberCapabilityDelta)
        XCTAssertEqual(decoded.result?.newsCategory, "diplomacy")
        XCTAssertEqual(decoded.result?.isAtrocity, false)
    }

    func testFallbackResultDecoding() throws {
        let json = """
        {
            "success": false,
            "error": "AI generation failed",
            "fallback": true
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(ActionResolutionResult.self, from: json)
        XCTAssertFalse(decoded.success)
        XCTAssertNil(decoded.result)
        XCTAssertEqual(decoded.error, "AI generation failed")
        XCTAssertEqual(decoded.fallback, true)
    }

    func testRequestEncoding() throws {
        let request = ActionResolutionRequest(
            actionCategory: "diplomatic",
            actionType: "trade_agreement",
            targetCountryId: "fr",
            severity: nil,
            freeFormCommand: nil,
            countryId: "us",
            countryName: "United States",
            leaderTitle: "President",
            targetCountryName: "France",
            turn: 5,
            maxTurns: 30,
            phase: "early",
            metrics: ["metric_economy": 60.0, "metric_approval": 55.0],
            relationship: 40.0,
            relationshipType: "strategic_partner",
            recentActions: ["diplomatic:sanctions"],
            governmentCategory: "liberal_democracy",
            playerApproach: nil,
            targetMilitaryStrength: 70.0,
            targetCyberCapability: 50.0,
            targetNuclearCapable: true,
            targetGovernmentCategory: nil,
            targetGeopoliticalTags: nil,
            targetRegion: nil,
            targetGdpTier: nil,
            targetVulnerabilities: nil,
            comparativePower: nil
        )

        let data = try JSONEncoder().encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        XCTAssertNotNil(dict)
        XCTAssertEqual(dict?["actionCategory"] as? String, "diplomatic")
        XCTAssertEqual(dict?["actionType"] as? String, "trade_agreement")
        XCTAssertEqual(dict?["countryId"] as? String, "us")
        XCTAssertEqual(dict?["turn"] as? Int, 5)
        XCTAssertEqual(dict?["targetNuclearCapable"] as? Bool, true)
    }

    func testMinimalResponseDecoding() throws {
        let json = """
        {
            "success": true,
            "result": {
                "headline": "Test",
                "summary": "Summary text",
                "context": "Context text",
                "metricDeltas": [],
                "relationshipDelta": 0,
                "newsCategory": "executive",
                "newsTags": []
            }
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(ActionResolutionResult.self, from: json)
        XCTAssertTrue(decoded.success)
        XCTAssertEqual(decoded.result?.metricDeltas.count, 0)
        XCTAssertNil(decoded.result?.isAtrocity)
        XCTAssertNil(decoded.result?.targetMilitaryStrengthDelta)
    }
}
