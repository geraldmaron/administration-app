import XCTest
@testable import TheAdministration

final class LegislatureMappingTests: XCTestCase {
    func testReconcileLegislatureWithCountryParties_basicMapping() async {
        let parties = [
            PoliticalParty(id: "p1", countryId: "c1", name: "Alpha Party", shortName: nil, ideology: 5, foundingYear: nil, isRuling: true, isCoalitionMember: false, currentLeader: nil, color: nil, keyPolicies: [], description: ""),
            PoliticalParty(id: "p2", countryId: "c1", name: "Beta Bloc", shortName: nil, ideology: 3, foundingYear: nil, isRuling: false, isCoalitionMember: true, currentLeader: nil, color: nil, keyPolicies: [], description: ""),
            PoliticalParty(id: "p3", countryId: "c1", name: "Gamma Group", shortName: nil, ideology: 7, foundingYear: nil, isRuling: false, isCoalitionMember: false, currentLeader: nil, color: nil, keyPolicies: [], description: "")
        ]
        let blocs = [
            LegislativeBloc(partyId: "p1", partyName: "", ideologicalPosition: 5, seatShare: 0.5, approvalOfPlayer: 60, chamber: "lower", isRulingCoalition: true),
            LegislativeBloc(partyId: "coalition", partyName: "", ideologicalPosition: 3, seatShare: 0.3, approvalOfPlayer: 40, chamber: "lower", isRulingCoalition: true),
            LegislativeBloc(partyId: "opposition", partyName: "", ideologicalPosition: 7, seatShare: 0.2, approvalOfPlayer: 30, chamber: "lower", isRulingCoalition: false)
        ]
        var legislature = LegislatureState(composition: blocs, approvalOfPlayer: 50, lastElectionTurn: 0, nextElectionTurn: 10, gridlockLevel: 0, notableMembers: [])
        let store = GameStore()
        store.countryParties = parties
        store.state.legislatureState = legislature
        await MainActor.run {
            store.reconcileLegislatureWithCountryParties()
        }
        let mapped = store.state.legislatureState!.composition
        XCTAssertEqual(mapped[0].partyName, "Alpha Party")
        XCTAssertEqual(mapped[1].partyName, "Beta Bloc")
        XCTAssertEqual(mapped[2].partyName, "Gamma Group")
    }

    func testReconcileLegislatureWithCountryParties_unmatched() async {
        let parties = [
            PoliticalParty(id: "p1", countryId: "c1", name: "Alpha Party", shortName: nil, ideology: 5, foundingYear: nil, isRuling: true, isCoalitionMember: false, currentLeader: nil, color: nil, keyPolicies: [], description: "")
        ]
        let blocs = [
            LegislativeBloc(partyId: "unknown", partyName: "Mystery", ideologicalPosition: 5, seatShare: 1.0, approvalOfPlayer: 50, chamber: "lower", isRulingCoalition: false)
        ]
        var legislature = LegislatureState(composition: blocs, approvalOfPlayer: 50, lastElectionTurn: 0, nextElectionTurn: 10, gridlockLevel: 0, notableMembers: [])
        let store = GameStore()
        store.countryParties = parties
        store.state.legislatureState = legislature
        await MainActor.run {
            store.reconcileLegislatureWithCountryParties()
        }
        let mapped = store.state.legislatureState!.composition
        XCTAssertEqual(mapped[0].partyName, "Mystery") // unchanged
    }

    func testQuickStartFallbackLegislatureUsesCountryParties() async {
        let parties = [
            PoliticalParty(id: "p1", countryId: "c1", name: "Alpha Party", shortName: nil, ideology: 5, foundingYear: nil, isRuling: true, isCoalitionMember: false, currentLeader: nil, color: nil, keyPolicies: [], description: ""),
            PoliticalParty(id: "p2", countryId: "c1", name: "Beta Bloc", shortName: nil, ideology: 3, foundingYear: nil, isRuling: false, isCoalitionMember: true, currentLeader: nil, color: nil, keyPolicies: [], description: ""),
            PoliticalParty(id: "p3", countryId: "c1", name: "Gamma Group", shortName: nil, ideology: 7, foundingYear: nil, isRuling: false, isCoalitionMember: false, currentLeader: nil, color: nil, keyPolicies: [], description: "")
        ]
        let store = GameStore()
        store.countryParties = parties
        // Simulate quickStart fallback
        await MainActor.run {
            store.state.legislatureState = nil
            store.quickStart(name: "Test", party: "p1", approach: "pragmatic")
        }
        let comp = store.state.legislatureState!.composition
        XCTAssertEqual(comp.count, 3)
        XCTAssertEqual(comp[0].partyName, "Alpha Party")
        XCTAssertEqual(comp[1].partyName, "Beta Bloc")
        XCTAssertEqual(comp[2].partyName, "Gamma Group")
    }
}
