/// CandidateGeneratorTests
/// Tests that CandidateGenerator produces well-formed candidates with correct
/// roleAffinity, cost, and stat ranges.
import XCTest
@testable import TheAdministration

final class CandidateGeneratorTests: XCTestCase {

    // MARK: - Role Affinity

    func testRoleAffinityIsPopulated() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 3, gender: nil, config: nil)
        for candidate in candidates {
            XCTAssertNotNil(candidate.roleAffinity, "roleAffinity should be set for all candidates")
            XCTAssertEqual(candidate.roleAffinity?.count, 3, "roleAffinity should contain top 3 roles")
        }
    }

    func testRoleAffinityContainsValidRoles() {
        let validRoles = ["defense", "diplomacy", "economy", "executive", "social", "justice"]
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 5, gender: nil, config: nil)
        for candidate in candidates {
            for affinity in candidate.roleAffinity ?? [] {
                XCTAssertTrue(validRoles.contains(affinity), "Unexpected role affinity value: \(affinity)")
            }
        }
    }

    func testRoleAffinityIsOrderedByStatDominance() {
        // Generate ministers in Economy category — their economics stat should rank first
        let ministers = CandidateGenerator.generateMinisters(
            roleId: "finance",
            category: "Economy",
            region: "north_america",
            countryId: nil,
            seed: 1,
            count: 10,
            gender: nil,
            config: nil
        )
        let economyFirstCount = ministers.filter { $0.roleAffinity?.first == "economy" }.count
        XCTAssertGreaterThan(economyFirstCount, ministers.count / 2, "Economy ministers should predominantly have 'economy' as top affinity")
    }

    func testDefenseMinistersHaveDefenseAffinity() {
        let ministers = CandidateGenerator.generateMinisters(
            roleId: "defense",
            category: "Defense",
            region: nil,
            countryId: nil,
            seed: 7,
            count: 10,
            gender: nil,
            config: nil
        )
        let defenseFirstCount = ministers.filter { ($0.roleAffinity ?? []).contains("defense") }.count
        XCTAssertGreaterThan(defenseFirstCount, ministers.count / 2, "Defense ministers should have 'defense' in their affinity list")
    }

    // MARK: - Cost

    func testCostIsAlwaysSet() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 5, gender: nil, config: nil)
        for candidate in candidates {
            XCTAssertNotNil(candidate.cost, "Cost should be set for all generated candidates")
        }
    }

    func testMinisterCostIsSet() {
        let ministers = CandidateGenerator.generateMinisters(
            roleId: "state",
            category: "Diplomacy",
            region: "europe",
            countryId: nil,
            seed: 55,
            count: 3,
            gender: nil,
            config: nil
        )
        for minister in ministers {
            XCTAssertNotNil(minister.cost, "Minister cost should be set")
        }
    }

    // MARK: - Stats

    func testGeneratedCandidatesHaveReasonableStats() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 10, gender: nil, config: nil)
        for candidate in candidates {
            XCTAssertGreaterThanOrEqual(candidate.stats.diplomacy, 10)
            XCTAssertLessThanOrEqual(candidate.stats.diplomacy, 100)
            XCTAssertGreaterThanOrEqual(candidate.stats.military, 10)
            XCTAssertLessThanOrEqual(candidate.stats.military, 100)
            XCTAssertGreaterThanOrEqual(candidate.stats.economics, 10)
            XCTAssertLessThanOrEqual(candidate.stats.economics, 100)
        }
    }

    func testAllCandidatesHaveNames() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 5, gender: nil, config: nil)
        for candidate in candidates {
            XCTAssertFalse(candidate.name.isEmpty, "Candidate should have a non-empty name")
        }
    }

    func testCandidateSortedByName() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 8, gender: nil, config: nil)
        let names = candidates.map { $0.name }
        XCTAssertEqual(names, names.sorted(), "Candidates should be sorted by name")
    }

    // MARK: - Gender

    func testMaleGenderIsRespected() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 5, gender: .male, config: nil)
        for candidate in candidates {
            XCTAssertEqual(candidate.gender, PersonGender.male, "All candidates should be male when gender is specified")
        }
    }

    func testFemaleGenderIsRespected() {
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: 5, gender: .female, config: nil)
        for candidate in candidates {
            XCTAssertEqual(candidate.gender, PersonGender.female, "All candidates should be female when gender is specified")
        }
    }

    // MARK: - Count

    func testGeneratesExactCount() {
        let count = 7
        let candidates = CandidateGenerator.generateCandidates(country: makeCountry(), count: count, gender: nil, config: nil)
        XCTAssertEqual(candidates.count, count)
    }

    func testMinistersGeneratesExactCount() {
        let count = 4
        let ministers = CandidateGenerator.generateMinisters(
            roleId: "interior",
            category: "Security",
            region: nil,
            countryId: nil,
            seed: 5,
            count: count,
            gender: nil,
            config: nil
        )
        XCTAssertEqual(ministers.count, count)
    }

    // MARK: - Helpers

    private func makeCountry() -> Country {
        Country(
            id: "test",
            name: "Testland",
            governmentProfileId: nil,
            attributes: CountryAttributes(population: 10_000_000, gdp: 500_000),
            military: MilitaryStats(strength: 50, nuclearCapable: false, posture: nil, navyPower: 0, cyberCapability: 0, description: nil),
            diplomacy: DiplomaticStats(relationship: 0, alignment: "Neutral", tradeAgreements: [], tradeRelationships: nil),
            region: "north_america",
            leaderTitle: nil, leader: nil, difficulty: nil, termLengthYears: nil,
            currentPopulation: nil, population: nil, gdp: nil, description: nil,
            subdivisions: nil, blocs: nil, analysisBullets: nil, strengths: nil,
            weaknesses: nil, vulnerabilities: nil, uniqueCapabilities: nil,
            tokens: nil, code: "ts", flagUrl: nil, alliances: nil, economy: nil,
            geopoliticalProfile: nil, gameplayProfile: nil
        )
    }
}
