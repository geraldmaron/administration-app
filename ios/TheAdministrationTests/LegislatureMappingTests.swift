import XCTest
@testable import TheAdministration

@MainActor
final class LegislatureMappingTests: XCTestCase {
    private func makeParty(
        id: String,
        name: String,
        ideology: Int,
        isRuling: Bool,
        isCoalitionMember: Bool,
        isMainOpposition: Bool? = nil
    ) -> PoliticalParty {
        PoliticalParty(
            id: id,
            countryId: "c1",
            name: name,
            shortName: nil,
            ideology: ideology,
            foundingYear: nil,
            isRuling: isRuling,
            isCoalitionMember: isCoalitionMember,
            isMainOpposition: isMainOpposition,
            currentLeader: nil,
            color: nil,
            keyPolicies: [],
            description: "",
            metricBiases: nil,
            popularBase: nil,
            coalitionWillingness: nil,
            suggestedSkills: nil
        )
    }

    func testReconcileLegislatureWithCountryParties_basicMapping() async {
        let parties = [
            makeParty(id: "p1", name: "Alpha Party", ideology: 5, isRuling: true, isCoalitionMember: false),
            makeParty(id: "p2", name: "Beta Bloc", ideology: 3, isRuling: false, isCoalitionMember: true),
            makeParty(id: "p3", name: "Gamma Group", ideology: 7, isRuling: false, isCoalitionMember: false, isMainOpposition: true)
        ]
        let blocs = [
            LegislativeBloc(partyId: "p1", partyName: "", ideologicalPosition: 5, seatShare: 0.5, approvalOfPlayer: 60, chamber: "lower", isRulingCoalition: true),
            LegislativeBloc(partyId: "coalition", partyName: "", ideologicalPosition: 3, seatShare: 0.3, approvalOfPlayer: 40, chamber: "lower", isRulingCoalition: true),
            LegislativeBloc(partyId: "opposition", partyName: "", ideologicalPosition: 7, seatShare: 0.2, approvalOfPlayer: 30, chamber: "lower", isRulingCoalition: false)
        ]
        let legislature = LegislatureState(composition: blocs, approvalOfPlayer: 50, lastElectionTurn: 0, nextElectionTurn: 10, gridlockLevel: 0, notableMembers: [])
        let store = GameStore()
        store.countryParties = parties
        store.state.legislatureState = legislature
        store.reconcileLegislatureWithCountryParties()
        let mapped = store.state.legislatureState!.composition
        XCTAssertEqual(mapped[0].partyName, "Alpha Party")
        XCTAssertEqual(mapped[1].partyName, "Beta Bloc")
        XCTAssertEqual(mapped[2].partyName, "Gamma Group")
    }

    func testReconcileLegislatureWithCountryParties_unmatched() async {
        let parties = [
            makeParty(id: "p1", name: "Alpha Party", ideology: 5, isRuling: true, isCoalitionMember: false)
        ]
        let blocs = [
            LegislativeBloc(partyId: "unknown", partyName: "Mystery", ideologicalPosition: 5, seatShare: 1.0, approvalOfPlayer: 50, chamber: "lower", isRulingCoalition: false)
        ]
        let legislature = LegislatureState(composition: blocs, approvalOfPlayer: 50, lastElectionTurn: 0, nextElectionTurn: 10, gridlockLevel: 0, notableMembers: [])
        let store = GameStore()
        store.countryParties = parties
        store.state.legislatureState = legislature
        store.reconcileLegislatureWithCountryParties()
        let mapped = store.state.legislatureState!.composition
        XCTAssertEqual(mapped[0].partyName, "Mystery") // unchanged
    }

    func testQuickStartFallbackLegislatureUsesCountryParties() async {
        let parties = [
            makeParty(id: "p1", name: "Alpha Party", ideology: 5, isRuling: true, isCoalitionMember: false),
            makeParty(id: "p2", name: "Beta Bloc", ideology: 3, isRuling: false, isCoalitionMember: true),
            makeParty(id: "p3", name: "Gamma Group", ideology: 7, isRuling: false, isCoalitionMember: false, isMainOpposition: true)
        ]
        let store = GameStore()
        store.countryParties = parties
        // Simulate quickStart fallback
        store.state.legislatureState = nil
        store.quickStart(name: "Test", party: "p1", approach: "pragmatic")
        let comp = store.state.legislatureState!.composition
        XCTAssertEqual(comp.count, 3)
        XCTAssertEqual(comp[0].partyName, "Alpha Party")
        XCTAssertEqual(comp[1].partyName, "Beta Bloc")
        XCTAssertEqual(comp[2].partyName, "Gamma Group")
    }
}
