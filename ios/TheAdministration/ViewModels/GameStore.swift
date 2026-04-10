/// GameStore
/// ObservableObject that manages core game state, turn flow, scenarios,
/// scoring, persistence, diplomacy, policy, trust-your-gut, and god-mode
/// for The Administration iOS client. Mirrors web/src/store/gameStore.ts.
import SwiftUI
import Foundation

// Score display format matching web scoreDisplayFormat
enum ScoreDisplayFormat: String, CaseIterable {
    case percentage
    case letter
}

class GameStore: ObservableObject {
        @MainActor
        func reconcileLegislatureWithCountryParties() {
            guard var legislature = state.legislatureState else { return }
            let parties = countryParties
            let playerParty = state.player?.party ?? ""
            let playerPartyObj = parties.first(where: { $0.name == playerParty })
            let playerIdeology = playerPartyObj?.ideology ?? 5

            legislature.composition = legislature.composition.map { bloc in
                var updated = bloc
                if let party = parties.first(where: { $0.id == bloc.partyId }) {
                    updated.partyName = party.name
                    updated.isRulingCoalition = party.name == playerParty
                        || party.isCoalitionMember
                        || abs(party.ideology - playerIdeology) <= 2
                    return updated
                }
                if bloc.partyId == "ruling" {
                    if let party = parties.first(where: { $0.name == playerParty }) ?? parties.first(where: { $0.isRuling }) {
                        updated.partyId = party.id
                        updated.partyName = party.name
                        updated.isRulingCoalition = true
                        return updated
                    }
                } else if bloc.partyId == "coalition" {
                    if let party = parties.first(where: { $0.isCoalitionMember }) {
                        updated.partyId = party.id
                        updated.partyName = party.name
                        updated.isRulingCoalition = true
                        return updated
                    }
                } else if bloc.partyId == "opposition" {
                    if let party = parties.first(where: { !$0.isRuling && !$0.isCoalitionMember && $0.name != playerParty }) {
                        updated.partyId = party.id
                        updated.partyName = party.name
                        updated.isRulingCoalition = false
                        return updated
                    }
                }
                return updated
            }
            state.legislatureState = legislature
        }
    @Published var state: GameState
    @Published var currentScenario: Scenario?
    @Published var lastBriefing: ScoringEngine.Briefing?
    @Published var pendingNewsArticle: NewsArticle? = nil
    @Published var showOutcome: Bool = false
    @Published var outcomeBriefingReady: Bool = false
    @Published var requestedTab: Int? = nil
    @Published var scenarioLoadError: String? = nil
    @Published var endGameReview: ScoringEngine.EndGameReview?
    @Published var isLoading: Bool = false
    @Published var countryParties: [PoliticalParty] = []
    @Published var partiesLoaded: Bool = false
    @Published var activeLocale: SubLocale? = nil
    @Published var countryMilitaryState: CountryMilitaryState? = nil
    @Published var availableCountries: [Country] = []
    var liveCountries: [Country] {
        state.countries.isEmpty ? availableCountries : state.countries
    }
    var playerCountry: Country? {
        liveCountries.first { $0.id == state.countryId }
    }
    @Published var appConfig: AppConfig?
    @Published var scoreDisplayFormat: ScoreDisplayFormat = {
        if let raw = UserDefaults.standard.string(forKey: "score_display_format"),
           let fmt = ScoreDisplayFormat(rawValue: raw) { return fmt }
        return .percentage
    }()
    
    // Recent scenario tracking for cooldown/similarity filtering
    private var recentScenarioQueue: [String] = []
    private var recentTagQueue: [String] = []
    private var scenarioCooldowns: [String: Int] = [:]
    private var cachedScenarios: [Scenario] = []
    private let maxRecentScenarios = 20
    private let maxRecentTags = 8

    /// Turn cooldown between mood updates. Tasks, reminders, quests should use the same throttle pattern (playerActionLastUsedTurn) to avoid conflicts.
    private let moodUpdateCooldownTurns = 3
    
    private let aiService = AIService()
    
    private static var testMode: Bool {
        ProcessInfo.processInfo.environment["GAME_TEST_MODE"] == "1"
    }
    
    init() {
        self.state = GameState(
            schemaVersion: "5.0",
            isSetup: false,
            countryId: nil,
            turn: 1,
            maxTurns: Self.testMode ? 10 : 30,
            phase: .early,
            status: .setup,
            metrics: [:],
            metricHistory: [:],
            cabinet: [],
            activeEffects: [],
            currentScenario: nil,
            player: nil
        )
        
        loadScenarios()
        _ = loadGame()
    }
    
    private func loadScenarios() {
        // Load scenarios, countries, and app config from Firebase
        Task {
            await AuthService.shared.ensureAuthenticated()

            if FirebaseDataService.shared.isFirebaseAvailable() {
                await ScenarioNavigator.shared.loadScenarios()
                let count = await ScenarioNavigator.shared.getScenarioCount()
                AppLogger.info("Loaded \(count) scenarios from Firebase", category: .scenarios)
                if count == 0 {
                    await MainActor.run {
                        self.scenarioLoadError = "No scenarios available. Check your connection."
                    }
                }
            } else {
                AppLogger.warning("Firebase not available - scenarios won't load", category: .firebase)
                await MainActor.run {
                    self.scenarioLoadError = "Firebase not available"
                }
            }

            async let countriesFetch = FirebaseDataService.shared.getCountries()
            async let configFetch = FirebaseDataService.shared.getAppConfig()

            let (countries, config) = await (countriesFetch, configFetch)
            TemplateEngine.shared.setCountries(countries)
            AppLogger.info("Loaded \(countries.count) countries with token data", category: .firebase)

            await MainActor.run {
                self.availableCountries = countries
                self.state.countries = countries
                self.appConfig = config
            }
        }
    }
    
    func setCountry(_ countryId: String) {
        state.countryId = countryId
        saveGame()
        loadCountryData(for: countryId)
    }

    func setActiveLocale(_ locale: SubLocale?) {
        activeLocale = locale
    }

    private func loadCountryData(for countryId: String) {
        partiesLoaded = false
        countryParties = []
        Task {
            async let partiesFetch = FirebaseDataService.shared.getPoliticalParties(for: countryId)
            async let militaryFetch = FirebaseDataService.shared.getMilitaryState(for: countryId)
            let (parties, military) = await (partiesFetch, militaryFetch)
            await MainActor.run {
                self.countryParties = parties
                self.countryMilitaryState = military
                self.state.countryParties = parties
                if let mil = military {
                    self.state.countryMilitaryState = mil
                }
                self.partiesLoaded = true
                self.reconcileLegislatureWithCountryParties()
                #if DEBUG
                if parties.isEmpty {
                    AppLogger.warning("[GameStore] No parties loaded for \(countryId) — candidates will use pool/generic fallback")
                } else if parties.count > 10 {
                    AppLogger.warning("[GameStore] Unexpected party count for \(countryId): \(parties.count) (expected ≤ 10)")
                }
                #endif
            }
        }
    }

    func setPlayer(name: String, party: String, approach: String) {
        state.player = PlayerProfile(name: name, party: party, approach: approach)
        saveGame()
    }
    
    func quickStart(name: String, party: String, approach: String, skills: [PlayerSkill] = [], strengths: [String] = [], weaknesses: [String] = [], gameLength: String = "medium") {
        let countries = availableCountries.isEmpty
            ? FirebaseDataService.shared.cachedCountries
            : availableCountries
        let preselected = state.countryId.flatMap { id in countries.first(where: { $0.id == id }) }
        let randomCountry = preselected ?? countries.randomElement() ?? Country(
            id: "us",
            name: "United States",
            governmentProfileId: nil,
            attributes: CountryAttributes(population: 331000000, gdp: 21000000000000),
            military: MilitaryStats(strength: 95, nuclearCapable: true, navyPower: 90, cyberCapability: 85),
            diplomacy: DiplomaticStats(relationship: 50, alignment: "Neutral", tradeAgreements: []),
            region: "North America",
            description: "A major global power.",
            subdivisions: nil
        )
        
        // If the name is generic, give them a regional name
        var finalName = name
        if name.uppercased() == "ADMIN" || name.isEmpty {
            finalName = CandidateGenerator.pickName(region: randomCountry.region, config: appConfig)
        }
        
        let standardMetrics = [
            "metric_economy", "metric_foreign_relations", "metric_public_order",
            "metric_military", "metric_health", "metric_environment", "metric_innovation",
            "metric_equality", "metric_liberty", "metric_employment", "metric_trade",
            "metric_energy", "metric_housing", "metric_infrastructure", "metric_education",
            "metric_democracy", "metric_sovereignty", "metric_immigration", "metric_budget"
        ]
        let inverseMetrics = [
            "metric_corruption", "metric_inflation", "metric_crime", "metric_bureaucracy"
        ]
        let hiddenMetrics = [
            "metric_unrest", "metric_economic_bubble", "metric_foreign_influence"
        ]

        var initialMetrics: [String: Double] = [:]
        var metricOffsets: [String: Double] = [:]

        if let gameplay = randomCountry.gameplayProfile,
           let starting = gameplay.startingMetrics,
           !starting.isEmpty {
            initialMetrics = starting
            initialMetrics.removeValue(forKey: "metric_approval")
            for id in standardMetrics where initialMetrics[id] == nil {
                let variance = (Double.random(in: 0...1) * 16) - 8
                initialMetrics[id] = ((50.12 + variance) * 100).rounded() / 100
            }
            for id in inverseMetrics where initialMetrics[id] == nil {
                let variance = (Double.random(in: 0...1) * 10) - 5
                initialMetrics[id] = ((28.0 + variance) * 100).rounded() / 100
            }
            for id in hiddenMetrics where initialMetrics[id] == nil {
                let variance = (Double.random(in: 0...1) * 6) - 3
                initialMetrics[id] = ((15.0 + variance) * 100).rounded() / 100
            }
            metricOffsets = [:]
        } else {
            for metricId in standardMetrics {
                let variance = (Double.random(in: 0...1) * 16) - 8
                let val = 50.12 + variance
                let minRating = 48.0
                if val < minRating {
                    metricOffsets[metricId] = minRating - val
                    initialMetrics[metricId] = minRating
                } else {
                    metricOffsets[metricId] = 0.0
                    initialMetrics[metricId] = (val * 100).rounded() / 100
                }
            }
            for metricId in inverseMetrics {
                let variance = (Double.random(in: 0...1) * 10) - 5
                let val = 28.0 + variance
                let minRating = 20.0
                if val < minRating {
                    metricOffsets[metricId] = minRating - val
                    initialMetrics[metricId] = minRating
                } else {
                    metricOffsets[metricId] = 0.0
                    initialMetrics[metricId] = (val * 100).rounded() / 100
                }
            }
            for metricId in hiddenMetrics {
                let variance = (Double.random(in: 0...1) * 6) - 3
                initialMetrics[metricId] = ((15.0 + variance) * 100).rounded() / 100
                metricOffsets[metricId] = 0.0
            }
        }

        var tempState = GameState(schemaVersion: "5.0", isSetup: false, countryId: randomCountry.id, turn: 0, maxTurns: 0, phase: .early, status: .active, metrics: initialMetrics, metricHistory: [:], cabinet: [], activeEffects: [], currentScenario: nil, player: nil)
        ScoringEngine.calculateApproval(&tempState)
        initialMetrics["metric_approval"] = tempState.metrics["metric_approval"] ?? ScoringEngine.INITIAL_METRIC_VALUE

        let roles = [
            (id: "role_executive", cat: "Executive"),
            (id: "role_diplomacy", cat: "Diplomacy"),
            (id: "role_defense", cat: "Defense"),
            (id: "role_economy", cat: "Economy")
        ]
        
        var cabinet: [CabinetMember] = []
        let partyNames = countryParties.isEmpty ? nil : countryParties.map { $0.name }
        var usedFirstNames = Set<String>()
        var usedLastNames = Set<String>()
        for role in roles {
            if let candidate = CandidateGenerator.generateMinisters(
                roleId: role.id, category: role.cat,
                region: randomCountry.region, countryId: randomCountry.id,
                config: appConfig, partyNames: partyNames,
                excludedFirstNames: usedFirstNames,
                excludedLastNames: usedLastNames
            ).first {
                let nameParts = candidate.name.split(separator: " ", maxSplits: 1)
                if let fn = nameParts.first { usedFirstNames.insert(String(fn)) }
                if nameParts.count > 1 { usedLastNames.insert(String(nameParts[1])) }
                cabinet.append(CabinetMember(
                    id: "cm_\(role.id)",
                    name: candidate.name,
                    roleId: role.id,
                    skillLevel: Int(candidate.stats.management),
                    isVacant: false,
                    cost: candidate.cost,
                    candidate: candidate
                ))
            }
        }
        
        let personnelSpent = cabinet.reduce(0) { $0 + ($1.cost ?? 0) }
        let totalBudget = CabinetPointsService.calculatePersonnelBudget(numRoles: cabinet.count + 4)
        
        var history: [String: [Double]] = [:]
        for (metricId, value) in initialMetrics {
            history[metricId] = [value]
        }

        let gameLengthToUse = gameLength
        var tempTurnState = GameState(schemaVersion: "5.0", isSetup: false, countryId: nil, turn: 1, maxTurns: 0, phase: .early, status: .setup, metrics: [:], metricHistory: [:], cabinet: [], activeEffects: [], currentScenario: nil, player: nil)
        tempTurnState.gameLength = gameLengthToUse
        let initialMaxTurns = Self.testMode ? 10 : ScoringEngine.calculateMaxTurns(tempTurnState)

        state = GameState(
            schemaVersion: "5.0",
            isSetup: true,
            countryId: randomCountry.id,
            turn: 1,
            maxTurns: initialMaxTurns,
            phase: .early,
            status: .active,
            metrics: initialMetrics,
            metricHistory: history,
            cabinet: cabinet,
            activeEffects: [],
            currentScenario: nil,
            player: PlayerProfile(name: finalName, party: party, approach: approach, strengths: strengths.isEmpty ? nil : strengths, weaknesses: weaknesses.isEmpty ? nil : weaknesses, skills: skills.isEmpty ? nil : skills),
            personnelSpent: personnelSpent,
            totalBudget: totalBudget,
            metricOffsets: metricOffsets
        )
        state.gameLength = gameLengthToUse
        let startDateFmt = ISO8601DateFormatter()
        startDateFmt.formatOptions = [.withFullDate]
        state.startDate = startDateFmt.string(from: Date())
        state.countries = availableCountries.map { country in
            guard country.id != state.countryId else { return country }
            var c = country
            let jitter = Double.random(in: -8...8)
            c.diplomacy.relationship = max(-100, min(100, c.diplomacy.relationship + jitter))
            return c
        }
        
        if let initialLegislature = randomCountry.legislatureInitialState {
            var legislature = initialLegislature
            let baseFraction: Double
            if let lower = randomCountry.legislatureProfile?.lowerHouse {
                baseFraction = lower.termLengthFraction
            } else if let single = randomCountry.legislatureProfile?.singleChamber {
                baseFraction = single.termLengthFraction
            } else {
                baseFraction = 0.5
            }
            legislature.nextElectionTurn = max(5, Int(Double(state.maxTurns) * baseFraction))
            legislature.lastElectionTurn = 0
            state.legislatureState = legislature
        } else if !countryParties.isEmpty {
            let blocs = Self.buildRealisticBlocs(
                from: countryParties,
                playerParty: party
            )
            let rulingShare = blocs.filter({ $0.isRulingCoalition }).reduce(0.0) { $0 + $1.seatShare }
            let gridlock = rulingShare >= 0.50 ? Int.random(in: 15...30) : Int.random(in: 35...55)
            state.legislatureState = LegislatureState(
                composition: blocs,
                approvalOfPlayer: 55,
                lastElectionTurn: 0,
                nextElectionTurn: max(5, state.maxTurns / 4),
                gridlockLevel: gridlock,
                notableMembers: []
            )
        } else {
            state.legislatureState = LegislatureState(
                composition: [
                    LegislativeBloc(partyId: "ruling", partyName: "Ruling Coalition", ideologicalPosition: 5,
                                    seatShare: 0.52, approvalOfPlayer: 60, chamber: "lower", isRulingCoalition: true),
                    LegislativeBloc(partyId: "opposition", partyName: "Main Opposition", ideologicalPosition: 5,
                                    seatShare: 0.42, approvalOfPlayer: 35, chamber: "lower", isRulingCoalition: false),
                    LegislativeBloc(partyId: "minor", partyName: "Minor Parties", ideologicalPosition: 4,
                                    seatShare: 0.06, approvalOfPlayer: 50, chamber: "lower", isRulingCoalition: false)
                ],
                approvalOfPlayer: 55,
                lastElectionTurn: 0,
                nextElectionTurn: max(5, state.maxTurns / 4),
                gridlockLevel: 30,
                notableMembers: []
            )
        }

        if let gdpBillions = randomCountry.gdpBillions {
            let randomizedGdp = gdpBillions * (0.85 + Double.random(in: 0...0.30))
            let scaleFactor = Self.computeCountryScaleFactor(gdpBillions: randomizedGdp)
            state.countryEconomicState = CountryEconomicState(
                gdpIndex: 100.0,
                gdpGrowthRate: 0.0,
                inflationRate: 2.0,
                tradeBalance: 0.0,
                unemploymentRate: 5.0,
                fiscalReserves: 0.0,
                baseGdpBillions: gdpBillions,
                randomizedGdpBillions: randomizedGdp
            )
            state.countryScaleFactor = scaleFactor
            state.countryAmounts = Self.deriveAmountsFromGdp(gdpUsd: randomizedGdp * 1_000_000_000, currencyCode: randomCountry.amounts?.currencyCode ?? "USD")
        }
        
        if let popMillions = randomCountry.populationMillions {
            let randomizedPop = popMillions * (0.90 + Double.random(in: 0...0.20))
            state.countryPopulationState = CountryPopulationState(
                populationMillions: popMillions,
                randomizedPopulationMillions: randomizedPop,
                growthRatePerTurn: 0.0002,
                displacedMillions: 0.0,
                cumulativeCasualties: 0.0,
                emigrationRate: 0.0,
                medianAge: 35.0
            )
        }
        
        Task {
            await generateNextScenario()
        }
        
        saveGame()
        loadCountryData(for: randomCountry.id)

        let countryName = randomCountry.name
        let playerTitle = randomCountry.tokens?["leader_title"] ?? "President"
        let inceptionArticle = NewsArticle(
            id: "news_0_inauguration",
            title: "\(playerTitle) \(finalName) Takes Office",
            headline: "\(playerTitle) \(finalName) Takes Office — Administration Begins",
            summary: "The new administration has officially assumed the reins of power in \(countryName). Advisors report an orderly transition, though early indicators suggest the nation faces both opportunities and challenges on the horizon.",
            content: nil,
            turn: 0,
            impact: nil,
            tags: ["politics"],
            category: "politics",
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        let briefingArticle = NewsArticle(
            id: "news_0_briefing",
            title: "Intelligence Briefing: National Status Assessment",
            headline: "First Intelligence Briefing Delivered to \(playerTitle) \(finalName)",
            summary: "Security and economic advisors have delivered an initial assessment to the new leadership. Analysts describe the situation as manageable, with several policy areas requiring immediate executive attention.",
            content: nil,
            turn: 0,
            impact: nil,
            tags: ["intelligence"],
            category: "intelligence",
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        state.newsHistory = [inceptionArticle, briefingArticle]
    }

    func finalizeSetup() {
        var initialMetrics: [String: Double] = [:]
        var metricOffsets: [String: Double] = [:]

        let standardMetrics = [
            "metric_economy", "metric_foreign_relations", "metric_public_order",
            "metric_military", "metric_health", "metric_environment", "metric_innovation",
            "metric_equality", "metric_liberty", "metric_employment", "metric_trade",
            "metric_energy", "metric_housing", "metric_infrastructure", "metric_education",
            "metric_democracy", "metric_sovereignty", "metric_immigration", "metric_budget"
        ]
        let inverseMetrics = [
            "metric_corruption", "metric_inflation", "metric_crime", "metric_bureaucracy"
        ]
        let hiddenMetrics = [
            "metric_unrest", "metric_economic_bubble", "metric_foreign_influence"
        ]

        for metricId in standardMetrics {
            let variance = (Double.random(in: 0...1) * 16) - 8
            let val = 62.0 + variance
            let minRating = 58.0
            if val < minRating {
                metricOffsets[metricId] = minRating - val
                initialMetrics[metricId] = minRating
            } else {
                metricOffsets[metricId] = 0.0
                initialMetrics[metricId] = (val * 100).rounded() / 100
            }
        }
        for metricId in inverseMetrics {
            let variance = (Double.random(in: 0...1) * 10) - 5
            let val = 25.0 + variance
            let minRating = 20.0
            if val < minRating {
                metricOffsets[metricId] = minRating - val
                initialMetrics[metricId] = minRating
            } else {
                metricOffsets[metricId] = 0.0
                initialMetrics[metricId] = (val * 100).rounded() / 100
            }
        }
        for metricId in hiddenMetrics {
            let variance = (Double.random(in: 0...1) * 6) - 3
            initialMetrics[metricId] = ((15.0 + variance) * 100).rounded() / 100
            metricOffsets[metricId] = 0.0
        }

        var tempState = GameState(schemaVersion: "5.0", isSetup: false, countryId: state.countryId, turn: 0, maxTurns: 0, phase: .early, status: .active, metrics: initialMetrics, metricHistory: [:], cabinet: [], activeEffects: [], currentScenario: nil, player: state.player)
        ScoringEngine.calculateApproval(&tempState)
        initialMetrics["metric_approval"] = tempState.metrics["metric_approval"] ?? ScoringEngine.INITIAL_METRIC_VALUE

        var history: [String: [Double]] = [:]
        for (metricId, value) in initialMetrics {
            history[metricId] = [value]
        }

        let personnelSpent = state.cabinet.reduce(0) { $0 + ($1.cost ?? 0) }
        let totalBudget = CabinetPointsService.calculatePersonnelBudget(numRoles: state.cabinet.count)
        let initialMaxTurns = Self.testMode ? 10 : ScoringEngine.calculateMaxTurns(state)

        let initialScenario = createFallbackScenario()

        state = GameState(
            schemaVersion: "5.0",
            isSetup: true,
            countryId: state.countryId,
            turn: 1,
            maxTurns: initialMaxTurns,
            phase: .early,
            status: .active,
            metrics: initialMetrics,
            metricHistory: history,
            cabinet: state.cabinet,
            activeEffects: [],
            currentScenario: initialScenario,
            player: state.player,
            personnelSpent: personnelSpent,
            totalBudget: totalBudget,
            metricOffsets: metricOffsets,
            fiscalSettings: .defaults
        )
        
        let currentCountry = availableCountries.first(where: { $0.id == state.countryId })
        if let country = currentCountry, let initialLegislature = country.legislatureInitialState {
            var legislature = initialLegislature
            let baseFraction: Double
            if let lower = country.legislatureProfile?.lowerHouse {
                baseFraction = lower.termLengthFraction
            } else if let single = country.legislatureProfile?.singleChamber {
                baseFraction = single.termLengthFraction
            } else {
                baseFraction = 0.5
            }
            legislature.nextElectionTurn = max(5, Int(Double(state.maxTurns) * baseFraction))
            legislature.lastElectionTurn = 0
            state.legislatureState = legislature
        } else if !countryParties.isEmpty {
            let playerPartyName = state.player?.party ?? ""
            let blocs = Self.buildRealisticBlocs(from: countryParties, playerParty: playerPartyName)
            let rulingShare = blocs.filter({ $0.isRulingCoalition }).reduce(0.0) { $0 + $1.seatShare }
            let gridlock = rulingShare >= 0.50 ? Int.random(in: 15...30) : Int.random(in: 35...55)
            state.legislatureState = LegislatureState(
                composition: blocs,
                approvalOfPlayer: 55,
                lastElectionTurn: 0,
                nextElectionTurn: max(5, state.maxTurns / 4),
                gridlockLevel: gridlock,
                notableMembers: []
            )
        } else {
            state.legislatureState = LegislatureState(
                composition: [
                    LegislativeBloc(partyId: "ruling", partyName: "Ruling Coalition", ideologicalPosition: 5,
                                    seatShare: 0.52, approvalOfPlayer: 60, chamber: "lower", isRulingCoalition: true),
                    LegislativeBloc(partyId: "opposition", partyName: "Main Opposition", ideologicalPosition: 5,
                                    seatShare: 0.42, approvalOfPlayer: 35, chamber: "lower", isRulingCoalition: false),
                    LegislativeBloc(partyId: "minor", partyName: "Minor Parties", ideologicalPosition: 4,
                                    seatShare: 0.06, approvalOfPlayer: 50, chamber: "lower", isRulingCoalition: false)
                ],
                approvalOfPlayer: 55,
                lastElectionTurn: 0,
                nextElectionTurn: max(5, state.maxTurns / 4),
                gridlockLevel: 30,
                notableMembers: []
            )
        }

        if let country = currentCountry, let gdpBillions = country.gdpBillions {
            let randomizedGdp = gdpBillions * (0.85 + Double.random(in: 0...0.30))
            let scaleFactor = Self.computeCountryScaleFactor(gdpBillions: randomizedGdp)
            state.countryEconomicState = CountryEconomicState(
                gdpIndex: 100.0,
                gdpGrowthRate: 0.0,
                inflationRate: 2.0,
                tradeBalance: 0.0,
                unemploymentRate: 5.0,
                fiscalReserves: 0.0,
                baseGdpBillions: gdpBillions,
                randomizedGdpBillions: randomizedGdp
            )
            state.countryScaleFactor = scaleFactor
            state.countryAmounts = Self.deriveAmountsFromGdp(gdpUsd: randomizedGdp * 1_000_000_000, currencyCode: country.amounts?.currencyCode ?? "USD")
        }
        
        if let country = currentCountry, let popMillions = country.populationMillions {
            let randomizedPop = popMillions * (0.90 + Double.random(in: 0...0.20))
            state.countryPopulationState = CountryPopulationState(
                populationMillions: popMillions,
                randomizedPopulationMillions: randomizedPop,
                growthRatePerTurn: 0.0002,
                displacedMillions: 0.0,
                cumulativeCasualties: 0.0,
                emigrationRate: 0.0,
                medianAge: 35.0
            )
        }
        
        currentScenario = initialScenario
        
        Task {
            await generateNextScenario()
        }
        
        saveGame()
        if let cid = state.countryId {
            loadCountryData(for: cid)
        }
    }
    
    func makeDecision(optionId: String) {
        guard let scenario = currentScenario,
              let option = scenario.options.first(where: { $0.id == optionId }) else { return }

        if scenario.id == "sys_impeachment" {
            resolveImpeachmentDecision(option: option)
            return
        }

        // Track played scenario IDs
        if !state.playedScenarioIds.contains(scenario.id) {
            state.playedScenarioIds.append(scenario.id)
        }
        
        // Create cabinet feedback from advisor feedback
        var cabinetFeedback: [CabinetContribution] = []
        
        if let advisorFeedbackArray = option.advisorFeedback {
            for feedback in advisorFeedbackArray {
                if let cabinetMember = state.cabinet.first(where: { $0.roleId == feedback.roleId }),
                   let candidate = cabinetMember.candidate {
                    let roleName = feedback.roleId
                        .replacingOccurrences(of: "role_", with: "")
                        .replacingOccurrences(of: "_", with: " ")
                        .split(separator: " ").map { $0.capitalized }.joined(separator: " ")
                    cabinetFeedback.append(CabinetContribution(
                        memberName: candidate.name,
                        role: roleName,
                        contribution: feedback.feedback
                    ))
                } else {
                    let roleName = feedback.roleId
                        .replacingOccurrences(of: "role_", with: "")
                        .replacingOccurrences(of: "_", with: " ")
                        .split(separator: " ").map { $0.capitalized }.joined(separator: " ")
                    cabinetFeedback.append(CabinetContribution(
                        memberName: "\(roleName) (Vacant)",
                        role: roleName,
                        contribution: feedback.feedback
                    ))
                }
            }
        }
        
        // Create turn record before applying decision
        let turnRecord = TurnRecord(
            turn: state.turn,
            metricSnapshots: state.metrics,
            scenarioId: scenario.id,
            optionId: option.id,
            briefing: nil,
            newsArticles: nil,
            scenarioTitle: scenario.title,
            scenarioDescription: scenario.description,
            decisionLabel: option.label ?? option.text,
            decisionId: option.id,
            metricDeltas: [],
            policyShifts: nil,
            cabinetFeedback: cabinetFeedback,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )

        let metricsBefore = state.metrics
        state.turnDiplomaticActionCount = 0
        state.turnMilitaryActionCount = 0
        state = ScoringEngine.applyDecision(state: state, option: option)

        // Evaluate crisis triggers
        let newCrises = CrisisEngine.evaluateCrises(state: state)
        if !newCrises.isEmpty {
            state.activeCrises.append(contentsOf: newCrises)
        }
        CrisisEngine.resolveExpiredCrises(state: &state)

        // Update game phase based on turn progression
        updateGamePhase()

        // Apply per-turn economic and population growth
        if var econ = state.countryEconomicState {
            let growthFactor = 1.0 + (econ.gdpGrowthRate / 100.0)
            econ.gdpIndex = max(10, econ.gdpIndex * growthFactor)
            state.countryEconomicState = econ
        }
        if var pop = state.countryPopulationState {
            pop.populationMillions = max(0.001, pop.populationMillions * (1.0 + pop.growthRatePerTurn))
            state.countryPopulationState = pop
        }

        // Expire notable members whose tenure has ended
        if var legislature = state.legislatureState {
            legislature.notableMembers = legislature.notableMembers.filter { $0.tenureEndTurn > state.turn }
            state.legislatureState = legislature
        }

        // Check for legislature elections
        if var legislature = state.legislatureState, state.turn >= legislature.nextElectionTurn {
            legislature = conductLegislatureElection(legislature: legislature, state: state)
            state.legislatureState = legislature
            let rulingShare = legislature.composition.filter { $0.isRulingCoalition }.reduce(0.0) { $0 + $1.seatShare }
            let rulingPct = Int(rulingShare * 100)
            let retained = rulingShare >= 0.5
            let headline = retained
                ? "Election Results: Ruling Coalition Holds \(rulingPct)% of Legislature"
                : "Election Results: Opposition Gains — Ruling Coalition Falls to \(rulingPct)%"
            let summary = retained
                ? "Legislative elections concluded with the ruling coalition retaining its majority. Gridlock index adjusted to reflect new seat distribution."
                : "The ruling coalition lost its legislative majority following elections. Opposition gains are expected to increase gridlock and complicate legislative priorities."
            let article = NewsArticle(
                id: UUID().uuidString,
                title: "LEGISLATURE ELECTION",
                headline: headline,
                summary: summary,
                content: nil,
                turn: state.turn,
                impact: nil,
                tags: ["election", "legislature", "politics"],
                category: "POLITICS",
                relatedScenarioId: nil,
                isAlert: !retained,
                isBackgroundEvent: nil
            )
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
        }

        if var legislature = state.legislatureState {
            legislature = updateLegislatureApproval(legislature: legislature, approval: state.metrics["metric_approval"] ?? 50)
            state.legislatureState = legislature
        }

        // Calculate deltas for briefing
        var deltas: [String: Double] = [:]
        for (mId, val) in state.metrics {
            let before = metricsBefore[mId] ?? 50.0
            if abs(val - before) > 0.01 {
                deltas[mId] = val - before
            }
        }

        self.lastBriefing = ScoringEngine.generateBriefingForDecision(option: option, metricDeltas: deltas)
        self.showOutcome = true
        self.outcomeBriefingReady = true

        // Generate news article for this decision
        let headlineCandidates = [
            option.outcomeHeadline,
            option.label,
            scenario.title.isEmpty ? nil : scenario.title,
            "Executive Decision Issued"
        ]
        let headline = headlineCandidates
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first(where: { !$0.isEmpty }) ?? "Executive Decision Issued"

        let normalizedHeadline = headline
            .lowercased()
            .replacingOccurrences(of: #"[^a-z0-9]+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let summaryCandidates = [
            option.outcomeSummary,
            option.outcome,
            option.outcomeContext,
            scenario.description,
            "A government decision has been recorded."
        ]
        let summary = summaryCandidates
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first(where: {
                !$0.isEmpty &&
                $0.lowercased()
                    .replacingOccurrences(of: #"[^a-z0-9]+"#, with: " ", options: .regularExpression)
                    .trimmingCharacters(in: .whitespacesAndNewlines) != normalizedHeadline
            }) ?? "A government decision has been recorded."
        let content: String?
        if let ctx = option.outcomeContext, !ctx.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            content = ctx
        } else {
            content = nil
        }
        let article = NewsArticle(
            id: "news_\(state.turn)_\(option.id)",
            title: headline,
            headline: headline,
            summary: summary,
            content: content,
            turn: state.turn,
            impact: nil,
            tags: scenario.tags,
            category: scenario.tags?.first ?? "general",
            relatedScenarioId: scenario.id,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }

        // Add turn record to archive
        state.archive.append(turnRecord)
        
        // Register scenario usage for cooldown/recency tracking
        registerScenarioUsage(scenario)

        // Drain any retaliations that have become due this turn
        drainPendingRetaliations()

        // Process background world events and cabinet auto-decisions
        processBackgroundEvents()

        // Emit a warning news article the first time any core metric crosses into danger territory
        let dangerMetrics = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order"]
        // Band starts at 22 (above the highest impeachment floor of 20) to guarantee advance notice
        // before any legislature-configuration can trigger the collapse check.
        let approachingCollapse = dangerMetrics.filter { (state.metrics[$0] ?? 50) < 40 && (state.metrics[$0] ?? 50) >= 22 }
        let hasImpeachmentRisk = !approachingCollapse.isEmpty && !state.impeachmentSurvived
        let warningAlreadyIssued = state.newsHistory.contains(where: { $0.relatedScenarioId == "sys_impeachment_warning" })
        if hasImpeachmentRisk && !warningAlreadyIssued {
            let worstMetric = approachingCollapse
                .min(by: { (state.metrics[$0] ?? 50) < (state.metrics[$1] ?? 50) })
                .map { $0.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ") }
                ?? "governance indicators"
            let warningArticle = NewsArticle(
                id: "news_imp_warning_\(state.turn)",
                title: "Opposition Signals Readiness to Launch Formal Proceedings",
                headline: "Opposition Signals Readiness to Launch Formal Proceedings",
                summary: "Legislative leaders from opposition benches have issued a joint statement citing deteriorating \(worstMetric) figures and warning that formal no-confidence or impeachment proceedings may be initiated if conditions do not improve. The administration has not yet responded publicly.",
                content: nil,
                turn: state.turn,
                impact: nil,
                tags: ["impeachment", "warning", "politics"],
                category: "crisis",
                relatedScenarioId: "sys_impeachment_warning",
                isAlert: true,
                isBackgroundEvent: nil
            )
            state.newsHistory = ([warningArticle] + state.newsHistory).prefix(30).map { $0 }
        }

        // Check for failure conditions — impeachment proceedings before hard game-over
        let approvalVal = state.metrics["metric_approval"] ?? 50
        let coreMetrics = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order"]
        let collapsedMetricIds = coreMetrics.filter { (state.metrics[$0] ?? 50) < 20 }
        let collapsedCount = collapsedMetricIds.count
        let minimumImpeachmentTurn = max(5, state.maxTurns / 8)
        let legislatureApproval = Double(state.legislatureState?.approvalOfPlayer ?? 50)
        // Legislature approval shifts the threshold: a loyal legislature protects the player;
        // a hostile one moves faster on weaker grounds.
        let approvalFloor: Double = legislatureApproval > 65 ? 10 : legislatureApproval < 30 ? 20 : 15
        let collapseThreshold: Int = legislatureApproval > 65 ? 4 : legislatureApproval < 30 ? 2 : 3
        if (approvalVal < approvalFloor || collapsedCount >= collapseThreshold) && state.turn >= minimumImpeachmentTurn {
            if !state.impeachmentSurvived {
                injectImpeachmentScenario(approvalCollapsed: approvalVal < 15, collapsedMetricIds: collapsedMetricIds)
                saveGame()
                return
            } else {
                var finalState = state
                finalState.status = .ended
                let review = ScoringEngine.generateEndGameReview(state: finalState)
                endGameReview = review
                state = finalState
                saveGame()
                return
            }
        }

        // Check for end-of-game conditions before generating next scenario
        if state.turn >= state.maxTurns {
            var finalState = state
            finalState.turn = state.maxTurns
            finalState.status = .ended
            let review = ScoringEngine.generateEndGameReview(state: finalState)
            endGameReview = review
            state = finalState
            saveGame()
        } else {
            Task {
                await generateNextScenario()
            }
            saveGame()
            if state.turn % 3 == 0 {
                PersistenceService.shared.autoSave(state: state)
            }
        }
    }
    
    @MainActor
    private func generateNextScenario() async {
        isLoading = true
        
        let context = ScenarioContext(
            turn: state.turn,
            metrics: state.metrics,
            activeEffectsLength: state.activeEffects.count,
            recentEvents: []
        )
        
        var nextScenario: Scenario?
        
        // 1. Try to find a matching scenario from Firebase pool
        await AuthService.shared.ensureAuthenticated()
        await ScenarioNavigator.shared.loadScenarios()
        let scenarioCount = await ScenarioNavigator.shared.getScenarioCount()
        AppLogger.debug("[GameStore] Firebase scenario count: \(scenarioCount)", category: .scenarios)
        
        let allScenarios = await FirebaseDataService.shared.getAllScenarios()
        cachedScenarios = allScenarios
        let currentCountry = state.countryId.flatMap { countryId in
            state.countries.first(where: { $0.id == countryId }) ?? availableCountries.first(where: { $0.id == countryId })
        }
        
        AppLogger.debug("[GameStore] Total scenarios available: \(allScenarios.count)", category: .scenarios)

        // Check pending consequences before general pool
        if nextScenario == nil {
            var mutableState = state
            ScoringEngine.cleanupExpiredConsequences(state: &mutableState)
            if let consequence = ScoringEngine.findApplicableConsequence(state: &mutableState, availableScenarios: allScenarios) {
                state.pendingConsequences = mutableState.pendingConsequences
                nextScenario = consequence
                AppLogger.debug("[GameStore] Firing pending consequence: \(consequence.id)", category: .game)
            }
        }

        let isDickMode = (state.godMode == true) && (state.dickMode?.enabled == true) && (state.dickMode?.active == true)

        // 1a. Neighbor-triggered events (high-priority pool)
        if nextScenario == nil {
            if let cid = state.countryId,
               let country = (state.countries.first { $0.id == cid } ?? availableCountries.first { $0.id == cid }),
               let gameplay = country.gameplayProfile,
               let geo = country.geopoliticalProfile,
               !geo.neighbors.isEmpty,
               let neighborChance = gameplay.neighborEventChance,
               Double.random(in: 0.0...1.0) < neighborChance {

                let neighborPool = allScenarios.filter { scenario in
                    guard scenario.options.count >= 3 else { return false }
                    if scenario.metadata?.isNeighborEvent != true { return false }
                    if !ScenarioNavigator.shared.matchesRegionalScope(scenario, for: country) { return false }
                    // If scenario restricts applicable countries, respect it
                    if let ac = scenario.metadata?.applicableCountries, !ac.isEmpty {
                        let matches = ac.contains { $0.lowercased() == cid.lowercased() }
                        if !matches { return false }
                    }
                    // Border-rival actor pattern gate: only show border_rival scenarios
                    // to countries with an actual land-adjacent adversarial neighbor
                    if scenario.dynamicProfile?.actorPattern == "border_rival" {
                        let hasBorderAdversary = geo.neighbors.contains {
                            $0.sharedBorder && ["rival", "adversary", "conflict"].contains($0.type)
                        }
                        if !hasBorderAdversary { return false }
                    }
                    if let req = scenario.metadata?.requires {
                        if !scenarioMeetsRequirements(req, country: country, gameState: state) { return false }
                    }
                    if let currentCountry,
                       !TemplateEngine.shared.canResolveScenarioWithoutFallback(scenario, country: currentCountry, gameState: state) {
                        return false
                    }
                    return true
                }

                if let picked = pickNeighborScenario(from: neighborPool, for: country, gameState: state) {
                    nextScenario = picked
                    AppLogger.debug("[GameStore] Selected neighbor event scenario: \(picked.id)", category: .scenarios)
                }
            }
        }

        // 1b. General pool selection if neighbor event not chosen
        var pool = allScenarios.filter { scenario in
            // Require minimum 3 options
            guard scenario.options.count >= 3 else { return false }
            // Dick-mode gating
            let isDick = scenario.tags?.contains(where: { t in t.lowercased().contains("dick") || t.lowercased() == "dic" }) ?? false
            if isDick && !isDickMode { return false }
            // Cooldown check
            if let readyTurn = scenarioCooldowns[scenario.id], state.turn < readyTurn { return false }
            // Already played (once-per-game)
            if state.playedScenarioIds.contains(scenario.id) { return false }
            // Metric conditions
            if let conditions = scenario.conditions {
                for condition in conditions {
                    let metricVal = state.metrics[condition.metricId] ?? 50.0
                    if let minV = condition.min, metricVal < minV { return false }
                    if let maxV = condition.max, metricVal > maxV { return false }
                }
            }
            // Relationship conditions: gate on diplomatic score with the resolved country
            if let relConditions = scenario.relationshipConditions, !relConditions.isEmpty {
                guard let currentCountry else { return false }
                for cond in relConditions {
                    guard let countryId = TemplateEngine.shared.resolveRelationshipToCountryId(
                        cond.relationshipId, country: currentCountry, gameState: state
                    ) else { return false }
                    let score = state.countries.first(where: { $0.id == countryId })?.diplomacy.relationship ?? 0.0
                    if let minV = cond.min, score < minV { return false }
                    if let maxV = cond.max, score > maxV { return false }
                }
            }
            // Applicable countries filter
            if let ac = scenario.metadata?.applicableCountries, !ac.isEmpty {
                guard let countryId = state.countryId else { return false }
                let matches = ac.contains(where: { $0.lowercased() == countryId.lowercased() })
                if !matches { return false }
            }
            if !ScenarioNavigator.shared.matchesRegionalScope(scenario, for: currentCountry) { return false }
            // Legislature approval gate
            if let req = scenario.legislatureRequirement {
                let legislatureApproval = state.legislatureState?.approvalOfPlayer ?? 100
                if legislatureApproval < req.minApproval { return false }
            }
            // Border-rival actor pattern gate: only show border_rival scenarios
            // to countries with an actual land-adjacent adversarial neighbor
            if scenario.dynamicProfile?.actorPattern == "border_rival",
               let geo = currentCountry?.geopoliticalProfile {
                let hasBorderAdversary = geo.neighbors.contains {
                    $0.sharedBorder && ["rival", "adversary", "conflict"].contains($0.type)
                }
                if !hasBorderAdversary { return false }
            }
            // Structural requirements gate: enforce metadata.requires flags against current country state
            if let req = scenario.metadata?.requires, let country = currentCountry {
                if !scenarioMeetsRequirements(req, country: country, gameState: state) { return false }
            }
            if let currentCountry,
               !TemplateEngine.shared.canResolveScenarioWithoutFallback(scenario, country: currentCountry, gameState: state) {
                return false
            }
            return true
        }

        // Dick mode scenario bias
        if isDickMode, let dickMode = state.dickMode {
            let scandalous = pool.filter { $0.tags?.contains(where: { t in t.lowercased().contains("dick") || t.lowercased() == "dic" }) ?? false }
            let normal = pool.filter { !($0.tags?.contains(where: { t in t.lowercased().contains("dick") || t.lowercased() == "dic" }) ?? false) }
            if Double.random(in: 0...1) < dickMode.authoritarianBias && !scandalous.isEmpty {
                pool = scandalous
            } else if !normal.isEmpty {
                pool = normal
            }
        }

        // If metric conditions filtered everything out but Firebase has scenarios, relax conditions
        // so that unconditional or loosely-conditioned Firebase content always has a chance to appear.
        if pool.isEmpty && !allScenarios.isEmpty {
            pool = allScenarios.filter { scenario in
                guard scenario.options.count >= 3 else { return false }
                let isDick = scenario.tags?.contains(where: { t in t.lowercased().contains("dick") || t.lowercased() == "dic" }) ?? false
                if isDick && !isDickMode { return false }
                if state.playedScenarioIds.contains(scenario.id) { return false }
                if let ac = scenario.metadata?.applicableCountries, !ac.isEmpty {
                    guard let countryId = state.countryId else { return false }
                    if !ac.contains(where: { $0.lowercased() == countryId.lowercased() }) { return false }
                }
                return true
            }
            AppLogger.debug("[GameStore] Condition-relaxed pool size: \(pool.count)", category: .scenarios)
        }

        // De-prioritise recently seen scenarios
        let recentIds = Set(recentScenarioQueue)
        let recentTagSet = Set(recentTagQueue)
        let notRecent = pool.filter { !recentIds.contains($0.id) }
        if !notRecent.isEmpty { pool = notRecent }

        // Filter out scenarios too similar to the current one
        if let current = currentScenario {
            let distinct = pool.filter { !areScenariosToSimilar($0, current) }
            if !distinct.isEmpty { pool = distinct }
        }

        AppLogger.debug("[GameStore] Filtered pool size: \(pool.count)", category: .scenarios)

        if nextScenario == nil, !pool.isEmpty {
            // Tag-diversity + geopolitical weighted pick
            nextScenario = weightedPick(from: pool, recentTagQueue: recentTagSet)
            AppLogger.debug("[GameStore] Selected Firebase scenario: \(nextScenario?.id ?? "none")", category: .scenarios)
        }
        
        // 2. Check AI Scenario Queue
        if nextScenario == nil {
            if var queue = state.aiScenarioQueue, !queue.readyChains.isEmpty {
                let chain = queue.readyChains.removeFirst()
                nextScenario = chain.scenarios.first
                state.aiScenarioQueue = queue
                AppLogger.debug("[GameStore] Using queued AI scenario: \(nextScenario?.id ?? "none")", category: .scenarios)
            }
        }
        
        // 3. Fallback to AI Service
        if nextScenario == nil {
            AppLogger.warning("[GameStore] No Firebase scenarios available, generating with AI...")
            nextScenario = await aiService.generateScenario(context: context)
        }
        
        // 4. Last Resort Fallback
        if nextScenario == nil {
            AppLogger.warning("[GameStore] AI generation failed, using fallback scenario")
            nextScenario = createFallbackScenario()
        }

        // Apply tokenization to resolve scenario text for the player's country
        if let scenario = nextScenario, let countryId = state.countryId {
            let countries = await FirebaseDataService.shared.getCountries()
            if let country = countries.first(where: { $0.id == countryId }) {
                // Record chain token bindings on first act so all subsequent acts resolve the same countries
                if let chainId = scenario.chainId, state.chainTokenBindings?[chainId] == nil {
                    let bindings = TemplateEngine.shared.resolveChainTokenBindings(
                        for: scenario, country: country, gameState: state
                    )
                    if !bindings.isEmpty {
                        if state.chainTokenBindings == nil { state.chainTokenBindings = [:] }
                        state.chainTokenBindings?[chainId] = bindings
                    }
                }
                nextScenario = TemplateEngine.shared.resolveScenario(
                    scenario,
                    country: country,
                    gameState: state
                )
            }
        }

        currentScenario = nextScenario
        state.currentScenario = nextScenario
        isLoading = false

        saveGame()
    }
    
    private func createFallbackScenario() -> Scenario {
        let fallbacks: [(title: String, description: String, opts: [(String, String)])] = [
            (
                "Discretionary Appropriations Review",
                "The Office of Management and Budget has flagged a discretionary spending item for executive review. Your signature is required before the fiscal window closes.",
                [("Authorize", "metric_approval"), ("Request Audit", "metric_corruption"), ("Defer to Cabinet", "metric_approval")]
            ),
            (
                "Inter-Agency Protocol Dispute",
                "Two cabinet departments have escalated a jurisdictional conflict requiring executive arbitration. A ruling is needed to unblock pending operations.",
                [("Rule for lead agency", "metric_approval"), ("Establish joint task force", "metric_approval"), ("Remand for further review", "metric_approval")]
            ),
            (
                "Emergency Regulatory Waiver",
                "An emergency waiver request has reached your desk. Industry stakeholders and agency counsel are split. The clock is running.",
                [("Grant the waiver", "metric_economy"), ("Deny and uphold regulation", "metric_approval"), ("Grant partial waiver", "metric_economy")]
            ),
            (
                "Executive Order — Signature Pending",
                "Counsel has completed review of a prepared executive order. It is ready for your signature or revision before the press briefing window.",
                [("Sign as written", "metric_approval"), ("Request minor revisions", "metric_approval"), ("Withhold pending review", "metric_approval")]
            ),
        ]
        let pick = fallbacks[state.turn % fallbacks.count]
        return Scenario(
            id: "scenario_fallback_\(Int(Date().timeIntervalSince1970))",
            title: pick.title,
            description: pick.description,
            conditions: nil,
            phase: nil,
            severity: .low,
            chainId: nil,
            options: pick.opts.enumerated().map { idx, opt in
                Option(id: "opt_\(idx + 1)", text: opt.0,
                       effects: [Effect(targetMetricId: opt.1, value: 1.0, duration: 1, probability: 0.85)])
            },
            chainsTo: nil
        )
    }
    
    func setMetric(_ metricId: String, value: Double) {
        let boundedValue = max(0, min(100, value))
        state.metrics[metricId] = boundedValue
        
        if state.metricHistory[metricId] == nil {
            state.metricHistory[metricId] = []
        }
        state.metricHistory[metricId]?.append(boundedValue)
        
        saveGame()
    }
    
    func setTurn(_ turn: Int) {
        state.turn = max(1, min(state.maxTurns, turn))
        saveGame()
    }
    
    // ADDED: Strategic plan management
    func setStrategicPlan(_ plan: StrategicPlan?) {
        state.strategicPlan = plan
        if plan != nil {
            state.strategicPlan?.activeTurn = state.turn
        }
        saveGame()
    }

    func setStrategicPlan(id: String, name: String, description: String, durationTurns: Int) {
        let plan = StrategicPlan(id: id, name: name, description: description,
                                 durationTurns: durationTurns)
        setStrategicPlan(plan)
    }
    
    // ADDED: Update game length
    func setGameLength(_ length: String?) {
        state.gameLength = length
        state.maxTurns = ScoringEngine.calculateMaxTurns(state)
        saveGame()
    }
    
    func updateFiscalSettings(_ settings: FiscalSettings) {
        state.fiscalSettings = settings
        saveGame()
    }

    func fireCabinetMember(roleId: String) {
        guard let idx = state.cabinet.firstIndex(where: { $0.roleId == roleId }) else { return }
        let oldCost = state.cabinet[idx].cost ?? 0
        state.cabinet[idx] = CabinetMember(id: "cm_\(roleId)", name: "VACANT", roleId: roleId, skillLevel: 0, isVacant: true, cost: nil, candidate: nil)
        state.personnelSpent = max(0, (state.personnelSpent ?? 0) - oldCost)
        saveGame()
    }

    func hireCabinetMember(roleId: String, candidate: Candidate) {
        let member = CabinetMember(
            id: "cm_\(roleId)",
            name: candidate.name,
            roleId: roleId,
            skillLevel: Int((candidate.stats.management + candidate.stats.economics) / 2),
            isVacant: false,
            cost: candidate.cost,
            candidate: candidate
        )
        if let idx = state.cabinet.firstIndex(where: { $0.roleId == roleId }) {
            let oldCost = state.cabinet[idx].cost ?? 0
            state.cabinet[idx] = member
            state.personnelSpent = (state.personnelSpent ?? 0) - oldCost + (candidate.cost ?? 0)
        } else {
            state.cabinet.append(member)
            state.personnelSpent = (state.personnelSpent ?? 0) + (candidate.cost ?? 0)
        }
        saveGame()
    }

    func saveGame(named customName: String? = nil) {
        PersistenceService.shared.save(state: state, customName: customName)
    }

    func saveToSlot(_ slot: Int) {
        PersistenceService.shared.save(state: state, to: slot)
    }

    func loadGame() -> Bool {
        if let loadedState = PersistenceService.shared.load() {
            state = loadedState
            currentScenario = loadedState.currentScenario
            return true
        }
        return false
    }

    @discardableResult
    func loadFromSlot(_ slot: Int) -> Bool {
        guard let loadedState = PersistenceService.shared.load(from: slot) else { return false }
        PersistenceService.shared.switchToSlot(slot)
        state = loadedState
        currentScenario = loadedState.currentScenario
        return true
    }

    @discardableResult
    func loadFromAutoSave() -> Bool {
        guard let loadedState = PersistenceService.shared.loadAutoSave() else { return false }
        state = loadedState
        currentScenario = loadedState.currentScenario
        return true
    }
    
    func resetGame() {
        var newState = GameState(
            schemaVersion: "5.0",
            isSetup: false,
            countryId: nil,
            turn: 1,
            maxTurns: 0,
            phase: .early,
            status: .setup,
            metrics: [:],
            metricHistory: [:],
            cabinet: [],
            activeEffects: [],
            currentScenario: nil,
            player: nil
        )
        newState.maxTurns = ScoringEngine.calculateMaxTurns(newState)
        state = newState
        currentScenario = nil
        endGameReview = nil
        saveGame()
    }
    
    // MARK: - Game Phase Tracking

    private func updateGamePhase() {
        let progress = Double(state.turn) / Double(state.maxTurns)
        if progress < 0.25 { state.phase = .early }
        else if progress < 0.6 { state.phase = .mid }
        else if progress < 0.9 { state.phase = .late }
        else { state.phase = .endgame }
    }

    static func computeCountryScaleFactor(gdpBillions: Double) -> Double {
        if gdpBillions <= 0 { return 1.0 }
        if gdpBillions >= 20_000 { return 1.4 }
        if gdpBillions >= 5_000 { return 1.25 }
        if gdpBillions >= 1_000 { return 1.1 }
        if gdpBillions >= 100 { return 1.0 }
        if gdpBillions >= 10 { return 0.85 }
        return 0.7
    }

    static func deriveAmountsFromGdp(gdpUsd: Double, currencyCode: String) -> CountryAmountValues {
        let variance: (Double) -> Double = { $0 * (0.85 + Double.random(in: 0...0.30)) }
        return CountryAmountValues(
            graftAmount: variance(gdpUsd * 0.0175),
            infrastructureCost: variance(gdpUsd * 0.03),
            aidAmount: variance(gdpUsd * 0.0055),
            tradeValue: variance(gdpUsd * 0.1),
            militaryBudgetAmount: variance(gdpUsd * 0.0275),
            disasterCost: variance(gdpUsd * 0.0425),
            sanctionsAmount: variance(gdpUsd * 0.06),
            currencyCode: currencyCode
        )
    }

    static func buildRealisticBlocs(from parties: [PoliticalParty], playerParty: String) -> [LegislativeBloc] {
        let playerPartyObj = parties.first(where: { $0.name == playerParty })
        let playerIdeology = playerPartyObj?.ideology ?? 5

        var rawShares: [(PoliticalParty, Double)] = []
        for party in parties {
            let isPlayerParty = party.name == playerParty
            let isCoalitionAlly = !isPlayerParty && (party.isCoalitionMember || abs(party.ideology - playerIdeology) <= 2)

            let base: Double
            if isPlayerParty {
                base = Double.random(in: 0.28...0.38)
            } else if isCoalitionAlly {
                base = Double.random(in: 0.10...0.20)
            } else {
                let distance = abs(party.ideology - playerIdeology)
                let maxShare = max(0.08, 0.25 - Double(distance) * 0.02)
                base = Double.random(in: 0.05...maxShare)
            }
            rawShares.append((party, base))
        }

        let total = rawShares.reduce(0.0) { $0 + $1.1 }
        return rawShares.map { (party, share) in
            let isPlayerParty = party.name == playerParty
            let isCoalition = isPlayerParty || party.isCoalitionMember || abs(party.ideology - playerIdeology) <= 2
            let distance = abs(party.ideology - playerIdeology)
            let baseApproval: Int
            if isPlayerParty {
                baseApproval = Int.random(in: 65...80)
            } else if distance <= 1 {
                baseApproval = Int.random(in: 55...70)
            } else if distance <= 3 {
                baseApproval = Int.random(in: 40...55)
            } else {
                baseApproval = Int.random(in: 20...40)
            }
            return LegislativeBloc(
                partyId: party.id,
                partyName: party.name,
                ideologicalPosition: party.ideology,
                seatShare: share / total,
                approvalOfPlayer: baseApproval,
                chamber: "lower",
                isRulingCoalition: isCoalition
            )
        }
    }

    private func conductLegislatureElection(legislature: LegislatureState, state: GameState) -> LegislatureState {
        var updated = legislature
        let approval = state.metrics["metric_approval"] ?? 50
        let playerParty = state.player?.party ?? ""
        let playerPartyObj = countryParties.first(where: { $0.name == playerParty })
        let playerIdeology = playerPartyObj?.ideology ?? 5

        let baseSwing = (approval - 50) * 0.005
        for i in updated.composition.indices {
            let bloc = updated.composition[i]
            let distance = abs(bloc.ideologicalPosition - playerIdeology)
            let alignmentFactor = max(0.3, 1.0 - Double(distance) * 0.15)

            if bloc.isRulingCoalition {
                let swing = baseSwing * alignmentFactor
                let newShare = max(0.05, min(0.55, bloc.seatShare + swing))
                updated.composition[i].seatShare = newShare
            } else {
                let swing = baseSwing * 0.6
                let newShare = max(0.03, min(0.45, bloc.seatShare - swing))
                updated.composition[i].seatShare = newShare
            }

            let blocApproval: Int
            if bloc.partyName == playerParty {
                blocApproval = max(30, min(90, Int(approval * 0.95)))
            } else if distance <= 1 {
                blocApproval = max(25, min(80, Int(approval * 0.8)))
            } else if distance <= 3 {
                blocApproval = max(20, min(65, Int(approval * 0.6 + Double(5 - distance) * 3)))
            } else {
                blocApproval = max(10, min(50, Int((100 - approval) * 0.5 + Double(distance) * 2)))
            }
            updated.composition[i].approvalOfPlayer = blocApproval
        }

        let total = updated.composition.reduce(0.0) { $0 + $1.seatShare }
        if total > 0 {
            for i in updated.composition.indices {
                updated.composition[i].seatShare /= total
            }
        }

        updated.lastElectionTurn = state.turn
        let electionFraction: Double
        if let lower = playerCountry?.legislatureProfile?.lowerHouse {
            electionFraction = lower.termLengthFraction
        } else if let single = playerCountry?.legislatureProfile?.singleChamber {
            electionFraction = single.termLengthFraction
        } else {
            electionFraction = 0.5
        }
        updated.nextElectionTurn = state.turn + max(5, Int(Double(state.maxTurns) * electionFraction))

        let rulingShare = updated.composition.filter({ $0.isRulingCoalition }).reduce(0.0) { $0 + $1.seatShare }
        if rulingShare >= 0.50 {
            updated.gridlockLevel = max(5, min(40, Int((1.0 - rulingShare) * 80)))
        } else {
            updated.gridlockLevel = max(30, min(85, Int((1.0 - rulingShare) * 100)))
        }

        let totalSeats = updated.composition.reduce(0.0) { $0 + $1.seatShare }
        updated.approvalOfPlayer = totalSeats > 0
            ? Int(updated.composition.reduce(0.0) { $0 + Double($1.approvalOfPlayer) * $1.seatShare } / totalSeats)
            : 50

        return updated
    }

    private func updateLegislatureApproval(legislature: LegislatureState, approval: Double) -> LegislatureState {
        var updated = legislature
        let playerParty = state.player?.party ?? ""
        let playerPartyObj = countryParties.first(where: { $0.name == playerParty })
        let playerIdeology = playerPartyObj?.ideology ?? 5

        for i in updated.composition.indices {
            let bloc = updated.composition[i]
            let distance = abs(bloc.ideologicalPosition - playerIdeology)

            let blocApproval: Int
            if bloc.partyName == playerParty {
                blocApproval = max(30, min(90, Int(approval * 0.95)))
            } else if distance <= 1 {
                blocApproval = max(25, min(80, Int(approval * 0.8)))
            } else if distance <= 3 {
                blocApproval = max(20, min(65, Int(approval * 0.6 + Double(5 - distance) * 3)))
            } else {
                blocApproval = max(10, min(50, Int((100 - approval) * 0.5 + Double(distance) * 2)))
            }
            updated.composition[i].approvalOfPlayer = blocApproval
        }

        let totalSeats = updated.composition.reduce(0.0) { $0 + $1.seatShare }
        updated.approvalOfPlayer = totalSeats > 0
            ? Int(updated.composition.reduce(0.0) { $0 + Double($1.approvalOfPlayer) * $1.seatShare } / totalSeats)
            : 50
        updated.coalitionFragility = computeCoalitionFragility(updated)
        return updated
    }

    private func inferStance(from metricDeltas: [String: Double], category: String) -> Double {
        let milDelta = metricDeltas["metric_military"] ?? 0.0
        let frDelta  = metricDeltas["metric_foreign_relations"] ?? 0.0
        guard abs(milDelta) > 0.5 || abs(frDelta) > 0.5 else { return 0.0 }
        let raw = (milDelta / 15.0) * 0.6 + (-frDelta / 20.0) * 0.4
        return max(-1.0, min(1.0, raw))
    }

    private func computeCoalitionFragility(_ legislature: LegislatureState) -> Int {
        let ruling = legislature.composition.filter { $0.isRulingCoalition }
        let rulingShare = ruling.reduce(0.0) { $0 + $1.seatShare }
        let seatFragility = max(0.0, min(1.0, (0.20 - (rulingShare - 0.50)) / 0.20))
        let totalRulingSeats = ruling.reduce(0.0) { $0 + $1.seatShare }
        let avgRulingApproval: Double = totalRulingSeats > 0
            ? ruling.reduce(0.0) { $0 + Double($1.approvalOfPlayer) * $1.seatShare } / totalRulingSeats
            : 50.0
        let approvalFragility = max(0.0, min(1.0, (60.0 - avgRulingApproval) / 60.0))
        return Int(((seatFragility * 0.5 + approvalFragility * 0.5) * 100).rounded())
    }

    private func applyLegislativeStanceEffect(stance: Double, category: String) {
        guard abs(stance) > 0.05 else { return }
        guard var legislature = state.legislatureState else { return }

        let baseWeight: Double
        switch category {
        case "military":   baseWeight = 1.0
        case "diplomatic": baseWeight = 0.6
        default:           baseWeight = 0.4
        }

        for i in legislature.composition.indices {
            let bloc = legislature.composition[i]
            let blocBias = (Double(bloc.ideologicalPosition) - 5.5) / 4.5
            let alignment = stance * blocBias
            let loyaltyBonus = bloc.isRulingCoalition ? stance * 0.25 : 0.0
            let rawDelta = (alignment + loyaltyBonus) * baseWeight
            let blocDelta = max(-8.0, min(8.0, rawDelta * 8.0))
            legislature.composition[i].approvalOfPlayer = max(0, min(100,
                bloc.approvalOfPlayer + Int(blocDelta.rounded())
            ))
        }

        let totalSeats = legislature.composition.reduce(0.0) { $0 + $1.seatShare }
        legislature.approvalOfPlayer = totalSeats > 0
            ? Int(legislature.composition.reduce(0.0) {
                $0 + Double($1.approvalOfPlayer) * $1.seatShare
              } / totalSeats)
            : 50
        legislature.coalitionFragility = computeCoalitionFragility(legislature)
        state.legislatureState = legislature
    }

    // MARK: - Scenario Scheduling Helpers

    private func registerScenarioUsage(_ scenario: Scenario) {
        recentScenarioQueue.append(scenario.id)
        if recentScenarioQueue.count > maxRecentScenarios { recentScenarioQueue.removeFirst() }
        let tags = scenario.tags?.isEmpty == false ? scenario.tags! : ["general"]
        for tag in tags {
            recentTagQueue.append(tag)
            if recentTagQueue.count > maxRecentTags { recentTagQueue.removeFirst() }
        }
        if let cooldown = scenario.cooldown, cooldown > 0 {
            scenarioCooldowns[scenario.id] = state.turn + cooldown
        }
        if !state.playedScenarioIds.contains(scenario.id) {
            state.playedScenarioIds.append(scenario.id)
        }
    }

    private func scenarioMeetsRequirements(_ req: ScenarioRequirements, country: Country, gameState: GameState) -> Bool {
        guard let geo = country.geopoliticalProfile else { return true }

        // Relationship / geopolitical structure
        if req.landBorderAdversary == true {
            let ok = geo.neighbors.contains { $0.sharedBorder && ["rival", "adversary", "conflict"].contains($0.type) }
            if !ok { return false }
        }
        if req.formalAlly == true {
            if !geo.allies.contains(where: { $0.type == "formal_ally" }) { return false }
        }
        if req.adversary == true {
            if geo.adversaries.isEmpty { return false }
        }
        if req.tradePartner == true {
            if !geo.allies.contains(where: { $0.type == "strategic_partner" }) { return false }
        }

        // Geography
        if req.islandNation == true && !geo.tags.contains("island_nation") { return false }
        if req.landlocked == true && !geo.tags.contains("landlocked") { return false }
        if req.coastal == true && !geo.tags.contains("coastal") { return false }

        // Military capabilities
        if req.nuclearState == true && country.militaryProfile?.nuclear == nil { return false }
        if req.cyberCapable == true {
            let hasCyber = country.militaryProfile?.cyber != nil
                || geo.tags.contains("cyber_power") || geo.tags.contains("cyber_capable")
            if !hasCyber { return false }
        }
        if req.powerProjection == true {
            let hasPP = country.militaryProfile?.doctrine == .powerProjection
                || geo.tags.contains("power_projection") || geo.tags.contains("naval_power")
            if !hasPP { return false }
        }
        if req.largeMilitary == true {
            let readiness = country.militaryProfile?.overallReadiness ?? 0
            if readiness < 65 && !geo.tags.contains("large_military") { return false }
        }

        // Regime type
        let democraticCategories: Set<GovernmentCategory> = [.liberalDemocracy, .illiberalDemocracy, .constitutionalMonarchy]
        let authoritarianCategories: Set<GovernmentCategory> = [.authoritarian, .totalitarian, .theocracy, .absoluteMonarchy]
        if req.democraticRegime == true && !democraticCategories.contains(geo.governmentCategory) { return false }
        if req.authoritarianRegime == true && !authoritarianCategories.contains(geo.governmentCategory) { return false }
        if req.fragileState == true && geo.regimeStability >= 40 { return false }

        // Dynamic game state: legislature and opposition exist as live institutions
        if req.hasLegislature == true && gameState.legislatureState == nil { return false }
        if req.hasOppositionParty == true {
            let hasOpposition = gameState.legislatureState?.composition.contains { !$0.isRulingCoalition } ?? false
            if !hasOpposition { return false }
        }

        // Power tier minimum
        if let minTier = req.minPowerTier {
            let tierRank: [String: Int] = ["superpower": 5, "great_power": 4, "regional_power": 3, "middle_power": 2, "small_state": 1]
            let required = tierRank[minTier] ?? 0
            let current = tierRank.keys.first { geo.tags.contains($0) }.flatMap { tierRank[$0] } ?? 0
            if current < required { return false }
        }

        return true
    }

    private func areScenariosToSimilar(_ a: Scenario, _ b: Scenario) -> Bool {
        let text1 = "\(a.title) \(a.description)".lowercased()
        let text2 = "\(b.title) \(b.description)".lowercased()
        let words1 = Set(text1.components(separatedBy: .whitespacesAndNewlines).filter { $0.count > 3 })
        let words2 = Set(text2.components(separatedBy: .whitespacesAndNewlines).filter { $0.count > 3 })
        let intersection = words1.intersection(words2)
        let union = words1.union(words2)
        guard !union.isEmpty else { return false }
        let similarity = Double(intersection.count) / Double(union.count)
        let title1 = Set(a.title.lowercased().components(separatedBy: .whitespaces).filter { $0.count > 2 })
        let title2 = Set(b.title.lowercased().components(separatedBy: .whitespaces).filter { $0.count > 2 })
        let titleUnion = title1.union(title2)
        let titleSim = titleUnion.isEmpty ? 0.0 : Double(title1.intersection(title2).count) / Double(titleUnion.count)
        return similarity > 0.7 || titleSim > 0.6
    }

    private func weightedPick(from candidates: [Scenario], recentTagQueue: Set<String>) -> Scenario {
        guard !candidates.isEmpty else { return createFallbackScenario() }
        if candidates.count == 1 { return candidates[0] }

        // Determine the active country for scoring
        let activeCountry: Country? = {
            if let cid = state.countryId {
                if let fromState = state.countries.first(where: { $0.id == cid }) {
                    return fromState
                }
                if let fromAvailable = availableCountries.first(where: { $0.id == cid }) {
                    return fromAvailable
                }
            }
            return availableCountries.first
        }()

        let governingParty = state.countryParties.first(where: { $0.isRuling })
        let weights = candidates.map { s -> Double in
            let baseScore = ScenarioNavigator.shared.scoreScenario(s, for: activeCountry, gameState: state)
            if baseScore <= 0 {
                return 0
            }
            let tagPenalty = s.tags?.contains(where: { recentTagQueue.contains($0) }) == true ? 0.4 : 1.0
            let bundleBoost: Double
            if let lastAction = state.recentActions?.first {
                let preferredBundle: String?
                if lastAction.hasPrefix("military:") { preferredBundle = "bundle_military" }
                else if lastAction.hasPrefix("diplomatic:") { preferredBundle = "bundle_diplomacy" }
                else { preferredBundle = nil }
                bundleBoost = (preferredBundle != nil && s.category == preferredBundle) ? 2.0 : 1.0
            } else {
                bundleBoost = 1.0
            }
            let partyBias: Double = {
                guard let party = governingParty, let biases = party.metricBiases, let primaryMetrics = s.metadata?.primaryMetrics else { return 1.0 }
                var totalBias = 0.0
                var count = 0
                for metricId in primaryMetrics {
                    if let bias = biases[metricId] {
                        totalBias += abs(bias)
                        count += 1
                    }
                }
                guard count > 0 else { return 1.0 }
                let avgBias = totalBias / Double(count)
                return 1.0 + avgBias * 0.5
            }()
            return baseScore * tagPenalty * bundleBoost * partyBias
        }

        let positiveWeights = weights.filter { $0 > 0 }
        guard !positiveWeights.isEmpty else {
            // Fallback to previous behavior if all scores are zero
            return candidates.randomElement() ?? createFallbackScenario()
        }

        let total = weights.reduce(0, +)
        var r = Double.random(in: 0...total)
        for (i, w) in weights.enumerated() {
            r -= w
            if r <= 0 { return candidates[i] }
        }
        return candidates.last!
    }

    // MARK: - Neighbor Event Helpers

    private func pickNeighborScenario(
        from candidates: [Scenario],
        for playerCountry: Country,
        gameState: GameState
    ) -> Scenario? {
        guard !candidates.isEmpty,
              let geo = playerCountry.geopoliticalProfile,
              !geo.neighbors.isEmpty else {
            return nil
        }

        // Choose neighbor weighted by absolute relationship strength (default to 30 if 0)
        let neighbors = geo.neighbors
        let weights = neighbors.map { max(abs($0.strength), 30.0) }
        let total = weights.reduce(0, +)
        var r = Double.random(in: 0...total)
        var chosenRelationship = neighbors[0]
        for (idx, w) in weights.enumerated() {
            r -= w
            if r <= 0 {
                chosenRelationship = neighbors[idx]
                break
            }
        }

        let neighborCountry = (gameState.countries.first { $0.id == chosenRelationship.countryId }
            ?? availableCountries.first { $0.id == chosenRelationship.countryId })

        // Fallback: if we can't resolve a specific neighbor country, just pick a raw scenario
        guard let neighbor = neighborCountry else {
            return candidates.randomElement()
        }

        // Prefer scenarios whose metadata.involvedCountries includes this neighbor
        let targeted = candidates.filter { s in
            guard let involved = s.metadata?.involvedCountries, !involved.isEmpty else { return false }
            return involved.contains { $0.lowercased() == neighbor.id.lowercased() }
        }

        let pool = targeted.isEmpty ? candidates : targeted
        guard let base = pool.randomElement() else { return nil }

        return attachNeighborTokens(to: base, playerCountry: playerCountry, neighbor: neighbor, relationship: chosenRelationship)
    }

    private func attachNeighborTokens(
        to scenario: Scenario,
        playerCountry: Country,
        neighbor: Country,
        relationship: CountryRelationship
    ) -> Scenario {
        var tokenMap = scenario.tokenMap ?? [:]

        // Neighbor names and descriptors
        tokenMap["neighbor"] = neighbor.name
        tokenMap["the_neighbor"] = neighbor.nameWithDefiniteArticle

        // Generic, non-name-bearing descriptors to avoid hard-coding country names
        tokenMap["neighbor_country"] = "a neighboring state"

        if let leaderTitle = neighbor.leaderTitle {
            tokenMap["neighbor_leader_title"] = leaderTitle
        } else {
            tokenMap["neighbor_leader_title"] = "the neighboring leader"
        }

        // Border region description stays generic
        tokenMap["border_region"] = "the shared border region"

        let descriptor: String
        switch relationship.type {
        case "formal_ally":
            descriptor = "a formal ally"
        case "strategic_partner":
            descriptor = "a strategic partner"
        case "rival":
            descriptor = "a long-standing rival"
        case "adversary":
            descriptor = "an adversarial neighbor"
        case "conflict":
            descriptor = "a neighbor with an active or recent conflict"
        default:
            descriptor = "a neighboring country"
        }
        tokenMap["relationship_descriptor"] = descriptor

        return Scenario(
            id: scenario.id,
            title: scenario.title,
            description: scenario.description,
            conditions: scenario.conditions,
            phase: scenario.phase,
            severity: scenario.severity,
            chainId: scenario.chainId,
            options: scenario.options,
            chainsTo: scenario.chainsTo,
            actor: scenario.actor,
            location: scenario.location,
            tags: scenario.tags,
            cooldown: scenario.cooldown,
            classification: scenario.classification,
            behavior: scenario.behavior,
            weight: scenario.weight,
            tier: scenario.tier,
            category: scenario.category,
            triggerConditions: scenario.triggerConditions,
            oncePerGame: scenario.oncePerGame,
            titleTemplate: scenario.titleTemplate,
            descriptionTemplate: scenario.descriptionTemplate,
            tokenMap: tokenMap,
            storagePath: scenario.storagePath,
            metadata: scenario.metadata
        )
    }

    // MARK: - Metric Management

    private func injectResidualEffects(metricId: String, immediateValue: Double, scale: Double = 1.0) {
        let base = immediateValue * scale
        guard abs(base) >= 0.3 else { return }
        state.activeEffects.append(ActiveEffect(
            baseEffect: Effect(targetMetricId: metricId, value: base * 0.50, duration: 1, probability: 1.0, delay: 1),
            remainingDuration: 1
        ))
        if abs(base) >= 1.5 {
            state.activeEffects.append(ActiveEffect(
                baseEffect: Effect(targetMetricId: metricId, value: base * 0.25, duration: 1, probability: 1.0, delay: 2),
                remainingDuration: 1
            ))
        }
    }

    func modifyMetricBy(_ metricId: String, delta: Double) {
        let current = state.metrics[metricId] ?? 50.0
        setMetric(metricId, value: current + delta)
    }

    func setAllMetrics(_ value: Double) {
        let bounded = max(0, min(100, value))
        for key in state.metrics.keys {
            state.metrics[key] = bounded
            state.metricHistory[key]?.append(bounded)
        }
        saveGame()
    }

    func modifyAllMetrics(_ delta: Double) {
        for key in state.metrics.keys {
            let newVal = max(0, min(100, (state.metrics[key] ?? 50) + delta))
            state.metrics[key] = newVal
            state.metricHistory[key]?.append(newVal)
        }
        saveGame()
    }

    // MARK: - Impeachment System

    private func injectImpeachmentScenario(approvalCollapsed: Bool, collapsedMetricIds: [String]) {
        let scenario = createImpeachmentScenario(approvalCollapsed: approvalCollapsed, collapsedMetricIds: collapsedMetricIds)
        currentScenario = scenario
        state.currentScenario = scenario
    }

    private func createImpeachmentScenario(approvalCollapsed: Bool, collapsedMetricIds: [String]) -> Scenario {
        let reason: String
        if approvalCollapsed {
            reason = "a catastrophic collapse in public confidence. Approval has fallen to crisis levels, and legislative leaders argue the administration has lost its mandate to govern."
        } else {
            let names = collapsedMetricIds.map { id in
                id.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ")
            }.joined(separator: ", ")
            reason = "simultaneous failures across \(names). A legislative coalition argues the administration has demonstrated systemic inability to govern across multiple critical domains."
        }
        let approvalNow = Int((state.metrics["metric_approval"] ?? 15).rounded())
        return Scenario(
            id: "sys_impeachment",
            title: "Impeachment Proceedings Initiated",
            description: "The legislature has voted to open formal impeachment proceedings against your administration, citing \(reason) You have one opportunity to respond before the chamber convenes for the final removal vote.",
            severity: .high,
            options: [
                Option(
                    id: "imp_rally",
                    text: "Deliver a national address directly to the citizenry, bypassing the legislature and appealing to the public for support. Acknowledge failures and present a credible recovery plan. Success depends on residual public trust — with approval at \(approvalNow)%, the odds are uncertain but not beyond reach. A successful address could shift enough legislative votes to block removal.",
                    label: "Address Nation",
                    outcomeHeadline: "National Address Delivered",
                    outcomeSummary: "The administration delivered a televised national address in response to impeachment proceedings, making the case directly to the electorate and calling for support."
                ),
                Option(
                    id: "imp_negotiate",
                    text: "Open back-channel negotiations with legislative leadership and seek a compromise agreement. Agree to meaningful policy concessions — ceding ground on contested legislation, cabinet reshuffles, or independent oversight mechanisms. This path carries the highest probability of political survival, but the administration emerges constrained and weakened, with significantly reduced room to maneuver on future policy.",
                    label: "Negotiate Terms",
                    outcomeHeadline: "Compromise Negotiations Opened",
                    outcomeSummary: "The administration entered closed-door negotiations with legislative leadership in an attempt to resolve the impeachment proceedings through political compromise and policy concessions."
                ),
                Option(
                    id: "imp_contest",
                    text: "Challenge the constitutional validity of the impeachment proceedings through the judiciary and executive authority mechanisms. A high-risk, high-reward gambit — if successful, it consolidates executive power and silences the opposition. If it fails, it accelerates removal and damages the legitimacy of the remaining term. The administration's institutional and legal standing will be decisive.",
                    label: "Contest Proceedings",
                    outcomeHeadline: "Executive Authority Invoked",
                    outcomeSummary: "The administration chose to contest the impeachment proceedings through constitutional and judicial challenges, asserting procedural or substantive deficiencies in the articles of impeachment."
                ),
                Option(
                    id: "imp_resign",
                    text: "Accept the political reality and tender a formal resignation before the removal vote proceeds. A voluntary resignation preserves institutional dignity, allows for an orderly transition of power, and may protect elements of the policy legacy. The term ends — but not with the permanent stigma of forced removal from office.",
                    label: "Tender Resignation",
                    outcomeHeadline: "Resignation Tendered",
                    outcomeSummary: "Facing the prospect of formal removal, the administration chose to tender a resignation to the legislature, initiating a constitutional succession process."
                ),
            ],
            tags: ["impeachment", "crisis", "constitutional"],
            category: "crisis",
            oncePerGame: true
        )
    }

    private func resolveImpeachmentDecision(option: Option) {
        let approval = state.metrics["metric_approval"] ?? 20

        let legApproval = Double(state.legislatureState?.approvalOfPlayer ?? 50)
        let survivalProbability: Double
        switch option.id {
        case "imp_rally":
            // Public appeal: depends on player approval + partial legislature sympathy
            survivalProbability = min(0.82, 0.45 + max(0, approval - 15) * 0.012 + (legApproval - 50) * 0.002)
        case "imp_negotiate":
            // Negotiation: legislature approval is the dominant factor
            survivalProbability = min(0.85, max(0.40, 0.55 + (legApproval - 50) * 0.006))
        case "imp_contest":
            // Contest: risky regardless, but a hostile legislature makes it worse
            survivalProbability = min(0.45, max(0.15, 0.30 - (50 - legApproval) * 0.003))
        default:
            survivalProbability = 0.0
        }

        let isResignation = option.id == "imp_resign"
        let survived = !isResignation && Double.random(in: 0...1) < survivalProbability
        let metricsBefore = state.metrics

        state.turn += 1
        updateGamePhase()

        if survived {
            applyImpeachmentSurvivalEffects(optionId: option.id)
        }

        let metricDeltas: [String: Double] = survived
            ? state.metrics.reduce(into: [:]) { acc, pair in
                let before = metricsBefore[pair.key] ?? 50
                if abs(pair.value - before) > 0.01 { acc[pair.key] = pair.value - before }
            }
            : [:]

        state.archive.append(TurnRecord(
            turn: state.turn,
            metricSnapshots: state.metrics,
            scenarioId: "sys_impeachment",
            optionId: option.id,
            briefing: nil,
            newsArticles: nil,
            scenarioTitle: "Impeachment Proceedings",
            scenarioDescription: "Formal impeachment proceedings were initiated against the administration.",
            decisionLabel: option.label ?? option.text,
            decisionId: option.id,
            metricDeltas: [],
            policyShifts: nil,
            cabinetFeedback: [],
            timestamp: ISO8601DateFormatter().string(from: Date())
        ))

        let (headline, summary) = impeachmentNewsText(survived: survived, isResignation: isResignation, optionId: option.id)
        let article = NewsArticle(
            id: "news_imp_\(state.turn)",
            title: headline,
            headline: headline,
            summary: summary,
            content: nil,
            turn: state.turn,
            impact: nil,
            tags: ["impeachment", "crisis", "politics"],
            category: "crisis",
            relatedScenarioId: "sys_impeachment",
            isAlert: true,
            isBackgroundEvent: nil
        )
        state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }

        if survived {
            state.impeachmentSurvived = true
            let briefingDeltas = metricDeltas.map { id, delta in
                ScoringEngine.MetricDelta(
                    id: id,
                    delta: delta,
                    name: id.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " "),
                    cabinetOffset: nil,
                    playerOffset: nil,
                    netChange: delta
                )
            }
            self.lastBriefing = ScoringEngine.Briefing(
                title: headline,
                description: summary,
                metrics: briefingDeltas,
                boosts: [],
                humanCost: nil,
                policyShifts: []
            )
            self.showOutcome = true
            self.outcomeBriefingReady = true
            Task { await generateNextScenario() }
            saveGame()
        } else {
            var finalState = state
            finalState.status = isResignation ? .resigned : .impeached
            let review = ScoringEngine.generateEndGameReview(state: finalState)
            endGameReview = review
            state = finalState
            saveGame()
        }
    }

    private func applyImpeachmentSurvivalEffects(optionId: String) {
        func boost(_ id: String, _ amount: Double) {
            state.metrics[id] = min(100, (state.metrics[id] ?? 30) + amount)
        }
        func reduce(_ id: String, _ amount: Double) {
            state.metrics[id] = max(0, (state.metrics[id] ?? 50) - amount)
        }
        switch optionId {
        case "imp_rally":
            boost("metric_approval", 12)
            boost("metric_public_order", 8)
            boost("metric_foreign_relations", 4)
        case "imp_negotiate":
            boost("metric_approval", 6)
            reduce("metric_economy", 5)
            reduce("metric_civil_liberties", 4)
            reduce("metric_media_freedom", 3)
        case "imp_contest":
            boost("metric_approval", 18)
            boost("metric_public_order", 5)
            reduce("metric_civil_liberties", 10)
            reduce("metric_media_freedom", 6)
        default:
            boost("metric_approval", 10)
        }
    }

    private func impeachmentNewsText(survived: Bool, isResignation: Bool, optionId: String) -> (headline: String, summary: String) {
        let leaderTitle = playerCountry?.leaderTitle ?? "The Head of State"
        let countryName = playerCountry?.name ?? "The administration"
        if isResignation {
            return (
                "\(leaderTitle) Tenders Resignation Amid Impeachment Proceedings",
                "In a written statement addressed to the legislature, \(leaderTitle) formally tendered resignation, citing the need to preserve national stability and ensure an orderly transition of power. \(countryName) begins the process of constitutional succession."
            )
        }
        if survived {
            switch optionId {
            case "imp_rally":
                return (
                    "Impeachment Vote Fails After National Address",
                    "\(leaderTitle)'s televised address shifted public opinion, applying sufficient pressure on legislators to oppose the removal vote. The motion failed to secure the required majority. The administration continues with a renewed mandate to address the underlying crises."
                )
            case "imp_negotiate":
                return (
                    "Legislature Withdraws Impeachment Following Compromise Agreement",
                    "After closed-door negotiations, \(leaderTitle) reached a compromise with legislative leadership, agreeing to policy concessions in exchange for the withdrawal of impeachment articles. The administration survives, but faces a significantly constrained policy agenda."
                )
            case "imp_contest":
                return (
                    "Impeachment Proceedings Dismissed After Executive Challenge",
                    "\(leaderTitle)'s constitutional challenge succeeded, with the relevant authority ruling the articles procedurally deficient. The administration survives, though the confrontational approach has deepened political divisions within the state."
                )
            default:
                return (
                    "Impeachment Proceedings Dismissed",
                    "\(leaderTitle) survived formal impeachment proceedings after the legislature failed to secure the required votes for removal. The administration continues under heightened scrutiny."
                )
            }
        } else {
            return (
                "Legislature Votes to Remove \(leaderTitle) From Office",
                "Following formal impeachment proceedings, the legislature voted to remove \(leaderTitle) from office. Constitutional succession protocols have been activated. \(countryName) enters a period of political transition."
            )
        }
    }

    func setMaxTurns(_ maxTurns: Int) {
        state.maxTurns = max(1, maxTurns)
        saveGame()
    }

    func toggleMetricLock(_ metricId: String) {
        if var locked = state.lockedMetricIds {
            if let idx = locked.firstIndex(of: metricId) {
                locked.remove(at: idx)
            } else {
                locked.append(metricId)
            }
            state.lockedMetricIds = locked
        } else {
            state.lockedMetricIds = [metricId]
        }
        saveGame()
    }

    func clearActiveEffects() {
        state.activeEffects = []
        saveGame()
    }

    func advanceTurnBy(_ turns: Int) {
        state.turn = min(state.maxTurns, state.turn + turns)
        updateGamePhase()
        saveGame()
    }

    func advanceToMaxTurn() {
        state.turn = state.maxTurns
        updateGamePhase()
        saveGame()
    }

    func triggerGameEnd() {
        var finalState = state
        finalState.status = .ended
        let review = ScoringEngine.generateEndGameReview(state: finalState)
        endGameReview = review
        state = finalState
        saveGame()
    }

    // MARK: - Diplomacy

    func updateCountryRelationship(_ countryId: String, delta: Double) {
        guard let idx = state.countries.firstIndex(where: { $0.id == countryId }) else { return }
        let newVal = max(-100, min(100, state.countries[idx].diplomacy.relationship + delta))
        state.countries[idx].diplomacy.relationship = newVal
        saveGame()
    }

    func setCountryRelationship(_ countryId: String, relationship: Double) {
        guard let idx = state.countries.firstIndex(where: { $0.id == countryId }) else { return }
        state.countries[idx].diplomacy.relationship = max(-100, min(100, relationship))
        saveGame()
    }

    func setAllCountryRelationships(_ relationship: Double) {
        let clamped = max(-100, min(100, relationship))
        for idx in state.countries.indices {
            state.countries[idx].diplomacy.relationship = clamped
        }
        saveGame()
    }

    func modifyCountryMilitary(_ countryId: String, strengthDelta: Double = 0, navyDelta: Double = 0, cyberDelta: Double = 0) {
        guard let idx = state.countries.firstIndex(where: { $0.id == countryId }) else { return }
        state.countries[idx].military.strength = max(0, min(100, state.countries[idx].military.strength + strengthDelta))
        state.countries[idx].military.navyPower = max(0, min(100, state.countries[idx].military.navyPower + navyDelta))
        state.countries[idx].military.cyberCapability = max(0, min(100, state.countries[idx].military.cyberCapability + cyberDelta))
        saveGame()
    }

    func updateCountryStats(_ countryId: String, population: Int? = nil, gdp: Int? = nil, militaryStrength: Double? = nil) {
        guard let idx = state.countries.firstIndex(where: { $0.id == countryId }) else { return }
        if let pop = population {
            state.countries[idx].currentPopulation = pop
            state.countries[idx].attributes.population = pop
        }
        if let g = gdp { state.countries[idx].attributes.gdp = g }
        if let ms = militaryStrength { state.countries[idx].military.strength = ms }
        saveGame()
    }

    private func buildActionResolutionRequest(
        category: String,
        actionType: String?,
        targetCountryId: String?,
        severity: String? = nil,
        freeFormCommand: String? = nil
    ) -> ActionResolutionRequest {
        let playerCountry = state.countries.first(where: { $0.id == state.countryId })
        let targetCountry = targetCountryId.flatMap { tid in state.countries.first(where: { $0.id == tid }) }
        let playerMil = state.metrics["metric_military"] ?? 50.0
        let targetMil = targetCountry?.military.strength ?? 50.0
        return ActionResolutionRequest(
            actionCategory: category,
            actionType: actionType,
            targetCountryId: targetCountryId,
            severity: severity,
            freeFormCommand: freeFormCommand,
            countryId: state.countryId ?? "unknown",
            countryName: playerCountry?.name ?? "Unknown",
            leaderTitle: playerCountry?.leaderTitle,
            targetCountryName: targetCountry?.name,
            turn: state.turn,
            maxTurns: state.maxTurns,
            phase: state.phase.rawValue,
            metrics: state.metrics,
            relationship: targetCountry?.diplomacy.relationship,
            relationshipType: targetCountry?.diplomacy.alignment,
            recentActions: state.recentActions,
            governmentCategory: playerCountry?.geopoliticalProfile?.governmentCategory.rawValue,
            playerApproach: state.player?.approach,
            targetMilitaryStrength: targetCountry?.military.strength,
            targetCyberCapability: targetCountry?.military.cyberCapability,
            targetNuclearCapable: targetCountry?.military.nuclearCapable,
            targetGovernmentCategory: targetCountry?.geopoliticalProfile?.governmentCategory.rawValue,
            targetGeopoliticalTags: targetCountry?.geopoliticalProfile?.tags.isEmpty == false
                ? targetCountry?.geopoliticalProfile?.tags
                : nil,
            targetRegion: targetCountry?.region,
            targetGdpTier: targetCountry.map { c in
                let billions = c.resolvedGdpBillions ?? 0
                return gdpTier(gdpBillions: billions)
            },
            targetVulnerabilities: targetCountry?.vulnerabilities.flatMap { $0.isEmpty ? nil : Array($0.prefix(4)) },
            comparativePower: comparativePowerLabel(playerMil: playerMil, targetMil: targetMil)
        )
    }

    private func fallbackJitter(_ base: Double, variance: Double = 0.18) -> Double {
        let multiplier = 1.0 + Double.random(in: -variance...variance)
        return (base * multiplier * 10).rounded() / 10
    }

    private func gdpTier(gdpBillions: Double) -> String {
        switch gdpBillions {
        case 2_000...: return "major"
        case 500...:   return "large"
        case 50...:    return "medium"
        case 5...:     return "small"
        default:       return "micro"
        }
    }

    private func comparativePowerLabel(playerMil: Double, targetMil: Double) -> String {
        let ratio = playerMil / max(targetMil, 1.0)
        if ratio > 1.5 { return "striking_down" }
        if ratio < 0.67 { return "striking_up" }
        return "peer_conflict"
    }

    private func metricNameFromId(_ metricId: String) -> String {
        metricId
            .replacingOccurrences(of: "metric_", with: "")
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }

    func executeDiplomaticAction(type: String, targetCountryId: String) async -> (success: Bool, message: String) {
        guard let idx = state.countries.firstIndex(where: { $0.id == targetCountryId }) else {
            return (false, "Country not found")
        }

        let rel = state.countries[idx].diplomacy.relationship
        if type == "request_alliance" && rel < 30 {
            let countryName = state.countries[idx].name
            return (false, "Alliance request rejected by \(countryName). Relations are too strained.")
        }

        let metricsBefore = state.metrics
        let relBefore = rel
        let countryName = state.countries[idx].name
        state.turnDiplomaticActionCount += 1
        let diplomaticCompound = min(2.2, 1.0 + Double(state.turnDiplomaticActionCount - 1) * 0.35)

        await MainActor.run {
            self.lastBriefing = nil
            self.outcomeBriefingReady = false
            self.showOutcome = true
            self.requestedTab = 0
        }

        var headline: String
        var outcomeDescription: String
        var relDelta: Double = 0

        let aiRequest = buildActionResolutionRequest(category: "diplomatic", actionType: type, targetCountryId: targetCountryId)
        let aiResult = await ActionResolutionService.shared.resolve(aiRequest)

        if let res = aiResult, res.success, let payload = res.result {
            headline = payload.headline
            outcomeDescription = payload.summary

            for md in payload.metricDeltas {
                let scaledDelta = md.delta * diplomaticCompound
                modifyMetricBy(md.metricId, delta: scaledDelta)
                injectResidualEffects(metricId: md.metricId, immediateValue: scaledDelta)
            }
            relDelta = payload.relationshipDelta * diplomaticCompound
            state.countries[idx].diplomacy.relationship = max(-100, min(100, rel + relDelta))
        } else {
            switch type {
            case "trade_agreement":
                state.countries[idx].diplomacy.relationship = min(100, rel + fallbackJitter(10 * diplomaticCompound))
                let ecoD = fallbackJitter(2.0 * diplomaticCompound)
                let relD = fallbackJitter(3.0 * diplomaticCompound)
                modifyMetricBy("metric_economy", delta: ecoD)
                modifyMetricBy("metric_foreign_relations", delta: relD)
                injectResidualEffects(metricId: "metric_economy", immediateValue: ecoD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: relD)
            case "impose_sanctions":
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-20 * diplomaticCompound))
                let ecoD = fallbackJitter(-2.0 * diplomaticCompound)
                let relD = fallbackJitter(-5.0 * diplomaticCompound)
                modifyMetricBy("metric_economy", delta: ecoD)
                modifyMetricBy("metric_foreign_relations", delta: relD)
                injectResidualEffects(metricId: "metric_economy", immediateValue: ecoD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: relD)
            case "request_alliance":
                state.countries[idx].diplomacy.relationship = min(100, rel + fallbackJitter(15 * diplomaticCompound))
                let relD = fallbackJitter(5.0 * diplomaticCompound)
                modifyMetricBy("metric_foreign_relations", delta: relD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: relD)
            case "expel_ambassador":
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-30 * diplomaticCompound))
                let relD = fallbackJitter(-8.0 * diplomaticCompound)
                modifyMetricBy("metric_foreign_relations", delta: relD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: relD)
            default:
                return (false, "Unknown diplomatic action")
            }
            relDelta = state.countries[idx].diplomacy.relationship - relBefore

            switch type {
            case "trade_agreement":
                headline = "Trade Accord Struck with \(countryName)"
                outcomeDescription = "Formal negotiations have concluded. The United States and \(countryName) have reached a bilateral trade accord that opens new commercial channels and deepens economic interdependence. Markets are responding positively to the agreement."
            case "impose_sanctions":
                headline = "U.S. Imposes Sanctions on \(countryName)"
                outcomeDescription = "The administration has levied sweeping economic sanctions against \(countryName), restricting access to U.S. financial systems and cutting bilateral trade. \(countryName)'s economy faces immediate pressure as international partners weigh their own responses."
            case "expel_ambassador":
                headline = "U.S. Expels \(countryName) Ambassador"
                outcomeDescription = "Washington has declared \(countryName)'s ambassador persona non grata and ordered their immediate departure. The rupture marks a severe deterioration of bilateral relations. Both governments are recalling diplomatic staff and analysts warn the damage will take years to repair."
            case "request_alliance":
                headline = "U.S. Extends Alliance Proposal to \(countryName)"
                outcomeDescription = "The White House has formally proposed a mutual cooperation and defense framework with \(countryName). If accepted, the pact would anchor \(countryName) firmly within the U.S. sphere of influence and reshape the regional security balance."
            default:
                headline = "Diplomatic Action Executed"
                outcomeDescription = "The administration has taken a decisive diplomatic step affecting U.S. relations with \(countryName). The full consequences are expected to emerge over the coming weeks."
            }
        }

        let rippleEntries = applyGeopoliticalRipple(actionCategory: "diplomatic", targetCountryId: targetCountryId, directRelDelta: relDelta)

        let changedMetrics = Dictionary(uniqueKeysWithValues: state.metrics.compactMap { (k, v) in
            let before = metricsBefore[k] ?? 50.0
            let d = v - before
            return abs(d) > 0.01 ? (k, d) : nil
        })
        var scoringDeltas = changedMetrics.map { (metricId, delta) in
            ScoringEngine.MetricDelta(id: metricId, delta: delta, name: metricNameFromId(metricId), cabinetOffset: nil, playerOffset: nil, netChange: nil)
        }
        if abs(relDelta) > 0.01 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "relationship_\(targetCountryId)",
                delta: relDelta,
                name: "\(countryName) Relations",
                cabinetOffset: nil,
                playerOffset: nil,
                netChange: nil
            ))
        }
        for ripple in rippleEntries where abs(ripple.delta) >= 1.0 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "relationship_\(ripple.countryId)",
                delta: ripple.delta,
                name: "\(ripple.name) Relations",
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        let briefing = ScoringEngine.Briefing(title: headline, description: outcomeDescription, metrics: scoringDeltas, boosts: [], humanCost: nil, policyShifts: [])
        let article = NewsArticle(
            id: "news_\(state.turn)_diplomatic_\(type)",
            title: headline,
            headline: headline,
            summary: outcomeDescription,
            content: nil,
            turn: state.turn,
            impact: nil,
            tags: ["diplomacy"],
            category: "diplomacy",
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        var modelDeltas = changedMetrics.map { (metricId, delta) in
            MetricDelta(metricId: metricId, metricName: metricNameFromId(metricId), delta: delta, cabinetOffset: nil, playerOffset: nil, netChange: nil)
        }
        if abs(relDelta) > 0.01 {
            modelDeltas.append(MetricDelta(
                metricId: "relationship_\(targetCountryId)",
                metricName: "\(countryName) Relations",
                delta: relDelta,
                cabinetOffset: nil,
                playerOffset: nil,
                netChange: nil
            ))
        }
        for ripple in rippleEntries where abs(ripple.delta) >= 1.0 {
            modelDeltas.append(MetricDelta(
                metricId: "relationship_\(ripple.countryId)",
                metricName: "\(ripple.name) Relations",
                delta: ripple.delta,
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        let record = TurnRecord(
            turn: state.turn,
            metricSnapshots: state.metrics,
            scenarioId: nil,
            optionId: nil,
            briefing: nil,
            newsArticles: nil,
            scenarioTitle: headline,
            scenarioDescription: outcomeDescription,
            decisionLabel: type,
            decisionId: "diplomatic_\(type)_\(state.turn)",
            metricDeltas: modelDeltas,
            policyShifts: nil,
            cabinetFeedback: [],
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        let diplomaticStance = inferStance(from: changedMetrics, category: "diplomatic")
        applyLegislativeStanceEffect(stance: diplomaticStance, category: "diplomatic")
        saveGame()
        var recent = state.recentActions ?? []
        recent.insert("diplomatic:\(type)", at: 0)
        state.recentActions = Array(recent.prefix(5))
        await MainActor.run {
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
            state.archive.append(record)
            self.lastBriefing = briefing
            self.outcomeBriefingReady = true
        }
        return (true, "")
    }

    func executeMilitaryAction(type: String, targetCountryId: String, severity: String = "medium") async -> (success: Bool, message: String) {
        guard let idx = state.countries.firstIndex(where: { $0.id == targetCountryId }) else {
            return (false, "Country not found")
        }
        let metricsBefore = state.metrics
        let sm: Double = severity == "high" ? 2.0 : severity == "low" ? 0.5 : 1.0
        let strengthBefore = state.countries[idx].military.strength
        let cyberBefore = state.countries[idx].military.cyberCapability
        let relBefore = state.countries[idx].diplomacy.relationship
        let countryName = state.countries[idx].name
        state.turnMilitaryActionCount += 1
        let militaryCompound = min(2.5, 1.0 + Double(state.turnMilitaryActionCount - 1) * 0.45)

        await MainActor.run {
            self.lastBriefing = nil
            self.outcomeBriefingReady = false
            self.showOutcome = true
            self.requestedTab = 0
        }

        var headline: String
        var outcomeDescription: String

        let aiRequest = buildActionResolutionRequest(category: "military", actionType: type, targetCountryId: targetCountryId, severity: severity)
        let aiResult = await ActionResolutionService.shared.resolve(aiRequest)

        if let res = aiResult, res.success, let payload = res.result {
            headline = payload.headline
            outcomeDescription = payload.summary

            for md in payload.metricDeltas {
                let scaledDelta = md.delta * militaryCompound
                modifyMetricBy(md.metricId, delta: scaledDelta)
                injectResidualEffects(metricId: md.metricId, immediateValue: scaledDelta)
            }
            if let milDelta = payload.targetMilitaryStrengthDelta, abs(milDelta) > 0.01 {
                state.countries[idx].military.strength = max(0, state.countries[idx].military.strength + milDelta * militaryCompound)
            }
            if let cyDelta = payload.targetCyberCapabilityDelta, abs(cyDelta) > 0.01 {
                state.countries[idx].military.cyberCapability = max(0, state.countries[idx].military.cyberCapability + cyDelta * militaryCompound)
            }
            let rel = state.countries[idx].diplomacy.relationship
            state.countries[idx].diplomacy.relationship = max(-100, min(100, rel + payload.relationshipDelta * militaryCompound))
        } else {
            let rel = state.countries[idx].diplomacy.relationship
            let mc = militaryCompound
            switch type {
            case "covert_ops":
                state.countries[idx].military.cyberCapability = max(0, state.countries[idx].military.cyberCapability + fallbackJitter(-5 * sm * mc))
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-8 * sm * mc))
                let frD = fallbackJitter(-3.0 * sm * mc)
                modifyMetricBy("metric_foreign_relations", delta: frD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: frD)
            case "special_ops":
                state.countries[idx].military.strength = max(0, state.countries[idx].military.strength + fallbackJitter(-5 * sm * mc))
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-18 * sm * mc))
                let poD = fallbackJitter(-2.0 * sm * mc)
                let frD = fallbackJitter(-5.0 * sm * mc)
                modifyMetricBy("metric_public_order", delta: poD)
                modifyMetricBy("metric_foreign_relations", delta: frD)
                injectResidualEffects(metricId: "metric_public_order", immediateValue: poD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: frD)
            case "military_strike":
                state.countries[idx].military.strength = max(0, state.countries[idx].military.strength + fallbackJitter(-15 * sm * mc))
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-30 * sm * mc))
                let frD = fallbackJitter(-15.0 * sm * mc)
                let appD = fallbackJitter(-5.0 * sm * mc)
                modifyMetricBy("metric_foreign_relations", delta: frD)
                modifyMetricBy("metric_approval", delta: appD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: frD)
                injectResidualEffects(metricId: "metric_approval", immediateValue: appD)
            case "nuclear_strike":
                state.countries[idx].military.strength = 0
                state.countries[idx].diplomacy.relationship = -100
                modifyMetricBy("metric_foreign_relations", delta: -50.0)
                modifyMetricBy("metric_approval", delta: -30.0)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: -50.0)
                injectResidualEffects(metricId: "metric_approval", immediateValue: -30.0)
            case "cyberattack":
                state.countries[idx].military.cyberCapability = max(0, state.countries[idx].military.cyberCapability + fallbackJitter(-20 * sm * mc))
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-12 * sm * mc))
                let frD = fallbackJitter(-8.0 * sm * mc)
                modifyMetricBy("metric_foreign_relations", delta: frD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: frD)
            case "naval_blockade":
                state.countries[idx].diplomacy.relationship = max(-100, rel + fallbackJitter(-20 * sm * mc))
                let ecoD = fallbackJitter(2.0 * sm * mc)
                let frD = fallbackJitter(-10.0 * sm * mc)
                modifyMetricBy("metric_economy", delta: ecoD)
                modifyMetricBy("metric_foreign_relations", delta: frD)
                injectResidualEffects(metricId: "metric_economy", immediateValue: ecoD)
                injectResidualEffects(metricId: "metric_foreign_relations", immediateValue: frD)
            default:
                return (false, "Unknown military action")
            }

            switch type {
            case "cyberattack":
                headline = "Classified Cyber Strike Hits \(countryName)"
                outcomeDescription = "\(countryName)'s critical digital infrastructure has been compromised in a U.S. cyber operation. Power grids, financial networks, and communications are facing cascading disruptions. The operation remains officially deniable and attribution is being contested."
            case "covert_ops":
                headline = "Covert Assets Activated Inside \(countryName)"
                outcomeDescription = "U.S. intelligence assets have conducted a \(severity)-intensity classified operation inside \(countryName). Key capabilities have been degraded. The mission is fully deniable. Details remain restricted at the highest classification level."
            case "special_ops":
                headline = "U.S. Special Forces Strike \(countryName)"
                outcomeDescription = "American special operations forces have carried out a \(severity)-intensity direct action mission against \(countryName), degrading military assets and infrastructure. Regional governments are demanding answers as tensions rise sharply."
            case "naval_blockade":
                headline = "U.S. Navy Enforces Blockade on \(countryName)"
                outcomeDescription = "American naval forces have established a \(severity)-intensity maritime blockade, severing \(countryName)'s sea lanes. Shipping has halted and fuel and food imports are already constrained. Economic pressure will compound with each passing week."
            case "military_strike":
                headline = "U.S. Forces Strike \(countryName)"
                outcomeDescription = "Conventional military assets have engaged targets inside \(countryName) in a \(severity)-intensity strike package. Damage assessments are ongoing. The international community is demanding a statement and regional powers are repositioning."
            case "nuclear_strike":
                headline = "Nuclear Strike Executed Against \(countryName)"
                outcomeDescription = "A strategic nuclear weapon has been deployed against \(countryName). This is an irreversible act with no modern precedent. Global stability is fracturing. International condemnation is total. The administration must now manage the consequences of an action that cannot be undone."
            default:
                headline = "Military Action Executed Against \(countryName)"
                outcomeDescription = "The administration has authorized a \(severity)-intensity military operation against \(countryName). Damage assessments are underway and the geopolitical fallout is being monitored."
            }
        }

        let directRelDelta = state.countries[idx].diplomacy.relationship - relBefore
        let rippleEntries = applyGeopoliticalRipple(actionCategory: "military", targetCountryId: targetCountryId, directRelDelta: directRelDelta)

        let changedMetrics = Dictionary(uniqueKeysWithValues: state.metrics.compactMap { (k, v) in
            let before = metricsBefore[k] ?? 50.0
            let d = v - before
            return abs(d) > 0.01 ? (k, d) : nil
        })
        let strengthDelta = state.countries[idx].military.strength - strengthBefore
        let cyberDelta = state.countries[idx].military.cyberCapability - cyberBefore
        let relDelta = directRelDelta

        var scoringDeltas = changedMetrics.map { (metricId, delta) in
            ScoringEngine.MetricDelta(id: metricId, delta: delta, name: metricNameFromId(metricId), cabinetOffset: nil, playerOffset: nil, netChange: nil)
        }
        if abs(strengthDelta) > 0.01 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "military_strength_\(targetCountryId)",
                delta: strengthDelta,
                name: "\(countryName) Military",
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        if abs(cyberDelta) > 0.01 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "cyber_capability_\(targetCountryId)",
                delta: cyberDelta,
                name: "\(countryName) Cyber",
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        if abs(relDelta) > 0.01 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "relationship_\(targetCountryId)",
                delta: relDelta,
                name: "\(countryName) Relations",
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        for ripple in rippleEntries where abs(ripple.delta) >= 1.0 {
            scoringDeltas.append(ScoringEngine.MetricDelta(
                id: "relationship_\(ripple.countryId)",
                delta: ripple.delta,
                name: "\(ripple.name) Relations",
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        let briefing = ScoringEngine.Briefing(title: headline, description: outcomeDescription, metrics: scoringDeltas, boosts: [], humanCost: nil, policyShifts: [])
        let article = NewsArticle(
            id: "news_\(state.turn)_military_\(type)",
            title: headline,
            headline: headline,
            summary: outcomeDescription,
            content: nil,
            turn: state.turn,
            impact: nil,
            tags: ["military"],
            category: "military",
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        var modelDeltas = changedMetrics.map { (metricId, delta) in
            MetricDelta(metricId: metricId, metricName: metricNameFromId(metricId), delta: delta, cabinetOffset: nil, playerOffset: nil, netChange: nil)
        }
        if abs(strengthDelta) > 0.01 {
            modelDeltas.append(MetricDelta(
                metricId: "military_strength_\(targetCountryId)",
                metricName: "\(countryName) Military",
                delta: strengthDelta,
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        if abs(cyberDelta) > 0.01 {
            modelDeltas.append(MetricDelta(
                metricId: "cyber_capability_\(targetCountryId)",
                metricName: "\(countryName) Cyber",
                delta: cyberDelta,
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        for ripple in rippleEntries where abs(ripple.delta) >= 1.0 {
            modelDeltas.append(MetricDelta(
                metricId: "relationship_\(ripple.countryId)",
                metricName: "\(ripple.name) Relations",
                delta: ripple.delta,
                cabinetOffset: nil, playerOffset: nil, netChange: nil
            ))
        }
        let record = TurnRecord(
            turn: state.turn,
            metricSnapshots: state.metrics,
            scenarioId: nil,
            optionId: nil,
            briefing: nil,
            newsArticles: nil,
            scenarioTitle: headline,
            scenarioDescription: outcomeDescription,
            decisionLabel: type,
            decisionId: "military_\(type)_\(state.turn)",
            metricDeltas: modelDeltas,
            policyShifts: nil,
            cabinetFeedback: [],
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        let militaryStance = inferStance(from: changedMetrics, category: "military")
        applyLegislativeStanceEffect(stance: militaryStance, category: "military")
        saveGame()
        var recent = state.recentActions ?? []
        recent.insert("military:\(type)", at: 0)
        state.recentActions = Array(recent.prefix(5))
        scheduleRetaliation(for: idx, actionType: type, sm: sm)
        await MainActor.run {
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
            state.archive.append(record)
            self.lastBriefing = briefing
            self.outcomeBriefingReady = true
        }
        return (true, "")
    }

    // MARK: - Retaliation System

    private func scheduleRetaliation(for countryIdx: Int, actionType: String, sm: Double) {
        let country = state.countries[countryIdx]
        let milStrength = country.military.strength
        let relationship = country.diplomacy.relationship

        // Stronger/hostile countries hit back harder; allied/weak ones absorb more
        let strengthMod = max(0.3, milStrength / 100.0)
        let hostilityMod: Double = relationship < 30 ? 1.4 : relationship > 60 ? 0.7 : 1.0
        let s = sm * strengthMod * hostilityMod

        var metricDeltas: [String: Double] = [:]
        var relDelta: Double = 0
        let delay: Int
        let headline: String
        let summary: String
        let countryName = country.name

        switch actionType {
        case "covert_ops":
            delay = 2
            metricDeltas["metric_foreign_relations"] = -(2.0 * s)
            relDelta = -(6.0 * s)
            headline = "\(countryName) Expels Intelligence Personnel, Cites Espionage"
            summary = "\(countryName) has formally expelled several intelligence-linked personnel and lodged a diplomatic protest citing evidence of covert operations on its soil. The incident further strains bilateral communications."
        case "cyberattack":
            delay = 2
            metricDeltas["metric_foreign_relations"] = -(3.0 * s)
            metricDeltas["metric_economy"] = -(1.5 * s)
            relDelta = -(10.0 * s)
            headline = "\(countryName) Launches Retaliatory Cyber Operations"
            summary = "State-linked hackers from \(countryName) have begun probing critical infrastructure and financial networks in apparent retaliation. Attribution is contested but intelligence sources confirm the origin. Mitigation efforts are underway."
        case "special_ops":
            delay = 1
            metricDeltas["metric_foreign_relations"] = -(8.0 * s)
            metricDeltas["metric_public_order"] = -(2.5 * s)
            relDelta = -(18.0 * s)
            headline = "\(countryName) Demands Withdrawal and Threatens Escalation"
            summary = "\(countryName) has condemned the special operations raid as an act of aggression and demanded an immediate explanation. Military forces have been placed on alert along disputed border areas as regional tension rises sharply."
        case "naval_blockade":
            delay = 1
            metricDeltas["metric_economy"] = -(4.0 * s)
            metricDeltas["metric_foreign_relations"] = -(6.0 * s)
            relDelta = -(15.0 * s)
            headline = "\(countryName) Activates Emergency Economic Countermeasures"
            summary = "\(countryName) has announced emergency trade rerouting, accelerated partnerships with alternative partners, and filed a formal protest at the Security Council over the naval blockade. The economic impact is beginning to ripple outward."
        case "military_strike":
            delay = 1
            metricDeltas["metric_foreign_relations"] = -(14.0 * s)
            metricDeltas["metric_public_order"] = -(5.0 * s)
            metricDeltas["metric_approval"] = -(3.0 * s)
            relDelta = -(25.0 * s)
            headline = "\(countryName) Declares Military Alert, International Coalition Forms"
            summary = "Following the strike, \(countryName) has placed its armed forces on highest alert and issued an emergency appeal to allied nations. Regional powers are convening an emergency session. Civilian casualties are being reported and global condemnation is mounting."
        case "nuclear_strike":
            delay = 1
            metricDeltas["metric_foreign_relations"] = -45.0
            metricDeltas["metric_public_order"] = -25.0
            metricDeltas["metric_approval"] = -25.0
            metricDeltas["metric_employment"] = -10.0
            relDelta = -100.0
            headline = "Global Coalition Mobilizes Against Administration After Nuclear Strike"
            summary = "The use of nuclear weapons has triggered an immediate international response. Sanctions packages, military posturing, and emergency UN sessions are underway. Allied nations are demanding accountability and the administration faces near-total diplomatic isolation."
        default:
            return
        }

        let retaliation = PendingRetaliation(
            id: "retaliation_\(actionType)_\(state.turn)",
            triggerTurn: state.turn + delay,
            countryId: country.id,
            countryName: countryName,
            metricDeltas: metricDeltas,
            relationshipDelta: relDelta,
            headline: headline,
            summary: summary
        )
        var retals = state.pendingRetaliations ?? []
        retals.append(retaliation)
        state.pendingRetaliations = retals
    }

    private func processBackgroundEvents() {
        let worldEvents = WorldEventEngine.processWorldEvents(state: state)
        for event in worldEvents {
            for (metricId, delta) in event.playerMetricDeltas {
                modifyMetricBy(metricId, delta: delta)
            }
            for (countryId, relDelta) in event.playerRelationshipDeltas {
                if let idx = state.countries.firstIndex(where: { $0.id == countryId }) {
                    let cur = state.countries[idx].diplomacy.relationship
                    state.countries[idx].diplomacy.relationship = max(-100, min(100, cur + relDelta))
                }
            }
            if let key = event.conflictKey {
                let parts = key.split(separator: "|").map(String.init)
                if parts.count == 2 {
                    var conflicts = state.worldConflicts ?? []
                    if !conflicts.contains(where: { $0.actorCountryId == parts[0] && $0.targetCountryId == parts[1] }) {
                        conflicts.append(WorldConflict(
                            id: key,
                            actorCountryId: parts[0],
                            targetCountryId: parts[1],
                            type: event.type,
                            startTurn: state.turn
                        ))
                        state.worldConflicts = conflicts
                    }
                }
            }
            if event.resolvesConflict, let targetId = event.targetId {
                let actorId = event.actorId
                state.worldConflicts = state.worldConflicts?.filter {
                    !($0.actorCountryId == actorId && $0.targetCountryId == targetId) &&
                    !($0.actorCountryId == targetId && $0.targetCountryId == actorId)
                }
            }
            let article = NewsArticle(
                id: "world_\(state.turn)_\(event.type)_\(event.actorId)",
                title: event.headline,
                headline: event.headline,
                summary: event.summary,
                content: nil,
                turn: state.turn,
                impact: nil,
                tags: ["world", event.type],
                category: "WORLD",
                relatedScenarioId: nil,
                isAlert: event.isAlert,
                isBackgroundEvent: true
            )
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
        }
        WorldEventEngine.tickWorldConflicts(state: &state)

        let cabinetDecisions = CabinetAutoDecisionEngine.processAutoDecisions(
            state: state,
            allScenarios: cachedScenarios,
            scenarioCooldowns: scenarioCooldowns
        )
        let playerCountry = state.countryId.flatMap { cid in
            state.countries.first { $0.id == cid } ?? availableCountries.first { $0.id == cid }
        }
        for decision in cabinetDecisions {
            if !state.playedScenarioIds.contains(decision.scenarioId) {
                state.playedScenarioIds.append(decision.scenarioId)
            }
            let scale = 0.65
            if let em = decision.chosenOption.effectsMap {
                for (metricId, value) in em {
                    modifyMetricBy(metricId, delta: value * scale)
                }
            }
            for effect in decision.chosenOption.effects {
                guard effect.targetBranchType == nil else { continue }
                if Double.random(in: 0...1) <= effect.probability {
                    modifyMetricBy(effect.targetMetricId, delta: effect.value * scale)
                }
            }
            let headline: String
            let summary: String
            if let country = playerCountry {
                let ctx = TemplateEngine.shared.buildContext(country: country, scenario: decision.scenario, gameState: state)
                headline = TemplateEngine.shared.resolveTokens(in: decision.headline, with: ctx)
                summary = TemplateEngine.shared.resolveTokens(in: decision.summary, with: ctx)
            } else {
                headline = decision.headline
                summary = decision.summary
            }
            let article = NewsArticle(
                id: "cabinet_\(state.turn)_\(decision.roleId)",
                title: headline,
                headline: headline,
                summary: summary,
                content: nil,
                turn: state.turn,
                impact: nil,
                tags: ["cabinet", decision.roleId, "domestic"],
                category: "DOMESTIC",
                relatedScenarioId: decision.scenarioId,
                isAlert: decision.isAlert,
                isBackgroundEvent: true
            )
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
        }
    }

    private func drainPendingRetaliations() {
        guard let retals = state.pendingRetaliations, !retals.isEmpty else { return }
        let due = retals.filter { $0.triggerTurn <= state.turn }
        guard !due.isEmpty else { return }
        state.pendingRetaliations = retals.filter { $0.triggerTurn > state.turn }
        for retal in due {
            for (metricId, delta) in retal.metricDeltas {
                modifyMetricBy(metricId, delta: delta)
            }
            if let cidx = state.countries.firstIndex(where: { $0.id == retal.countryId }) {
                let rel = state.countries[cidx].diplomacy.relationship
                state.countries[cidx].diplomacy.relationship = max(-100, min(100, rel + retal.relationshipDelta))
            }
            let article = NewsArticle(
                id: "news_retaliation_\(retal.id)",
                title: retal.headline,
                headline: retal.headline,
                summary: retal.summary,
                content: nil,
                turn: state.turn,
                impact: nil,
                tags: ["military", "retaliation", "crisis"],
                category: "crisis",
                relatedScenarioId: nil,
                isAlert: true,
                isBackgroundEvent: nil
            )
            state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }
        }
    }

    // MARK: - Policy

    func updatePolicySettings(_ settings: PolicySettings) {
        state.policySettings = settings
        saveGame()
    }

    func computePolicyMetricImpacts(from old: PolicySettings, to new: PolicySettings) -> [MetricImpact] {
        var raw: [String: Double] = [:]

        let econDelta = (new.economicStance ?? 50) - (old.economicStance ?? 50)
        if econDelta != 0 {
            raw["metric_economy", default: 0]    += econDelta * 0.20
            raw["metric_employment", default: 0] += econDelta * 0.15
            raw["metric_budget", default: 0]     -= econDelta * 0.10
        }

        let socialDelta = (new.socialSpending ?? 50) - (old.socialSpending ?? 50)
        if socialDelta != 0 {
            raw["metric_health", default: 0]    += socialDelta * 0.20
            raw["metric_equality", default: 0]  += socialDelta * 0.20
            raw["metric_approval", default: 0]  += socialDelta * 0.10
            raw["metric_budget", default: 0]    -= socialDelta * 0.10
        }

        let defenseDelta = (new.defenseSpending ?? 50) - (old.defenseSpending ?? 50)
        if defenseDelta != 0 {
            raw["metric_military", default: 0]  += defenseDelta * 0.25
            raw["metric_budget", default: 0]    -= defenseDelta * 0.15
            raw["metric_economy", default: 0]   -= defenseDelta * 0.05
        }

        let envDelta = (new.environmentalPolicy ?? 50) - (old.environmentalPolicy ?? 50)
        if envDelta != 0 {
            raw["metric_environment", default: 0] += envDelta * 0.25
            raw["metric_economy", default: 0]     -= envDelta * 0.10
        }

        return raw.compactMap { id, delta in
            guard abs(delta) >= 0.05 else { return nil }
            return MetricImpact(metricId: id, delta: delta, name: MetricImpact.label(for: id), projected: nil)
        }.sorted {
            if $0.metricId == "metric_approval" { return true }
            if $1.metricId == "metric_approval" { return false }
            return abs($0.delta) > abs($1.delta)
        }
    }

    func computeFiscalMetricImpacts(from old: FiscalSettings, to new: FiscalSettings) -> [MetricImpact] {
        var raw: [String: Double] = [:]

        let taxIncomeDelta = new.taxIncome - old.taxIncome
        if taxIncomeDelta != 0 {
            raw["metric_budget", default: 0]    += taxIncomeDelta * 0.20
            raw["metric_economy", default: 0]   -= taxIncomeDelta * 0.10
            raw["metric_approval", default: 0]  -= taxIncomeDelta * 0.10
        }

        let taxCorpDelta = new.taxCorporate - old.taxCorporate
        if taxCorpDelta != 0 {
            raw["metric_budget", default: 0]      += taxCorpDelta * 0.20
            raw["metric_economy", default: 0]     -= taxCorpDelta * 0.15
            raw["metric_employment", default: 0]  -= taxCorpDelta * 0.10
        }

        let milDelta = new.spendingMilitary - old.spendingMilitary
        if milDelta != 0 {
            raw["metric_military", default: 0] += milDelta * 0.25
        }

        let socialDelta = new.spendingSocial - old.spendingSocial
        if socialDelta != 0 {
            raw["metric_health", default: 0]    += socialDelta * 0.20
            raw["metric_equality", default: 0]  += socialDelta * 0.15
            raw["metric_approval", default: 0]  += socialDelta * 0.10
        }

        let infraDelta = new.spendingInfrastructure - old.spendingInfrastructure
        if infraDelta != 0 {
            raw["metric_infrastructure", default: 0] += infraDelta * 0.25
            raw["metric_economy", default: 0]        += infraDelta * 0.15
        }

        let oldTotal = old.spendingMilitary + old.spendingSocial + old.spendingInfrastructure
        let newTotal = new.spendingMilitary + new.spendingSocial + new.spendingInfrastructure
        let oldBalance = 100 - oldTotal
        let newBalance = 100 - newTotal
        let balanceDelta = newBalance - oldBalance
        if abs(balanceDelta) > 0.5 {
            raw["metric_budget", default: 0] += balanceDelta * 0.15
            if newBalance < -10 {
                raw["metric_economy", default: 0] -= abs(newBalance) * 0.05
            }
        }

        return raw.compactMap { id, delta in
            guard abs(delta) >= 0.05 else { return nil }
            return MetricImpact(metricId: id, delta: delta, name: MetricImpact.label(for: id), projected: nil)
        }.sorted {
            if $0.metricId == "metric_approval" { return true }
            if $1.metricId == "metric_approval" { return false }
            return abs($0.delta) > abs($1.delta)
        }
    }

    func applyPolicyMetricImpacts(from old: PolicySettings, to new: PolicySettings) {
        for impact in computePolicyMetricImpacts(from: old, to: new) {
            modifyMetricBy(impact.metricId, delta: impact.delta)
        }
    }

    func applyFiscalMetricImpacts(from old: FiscalSettings, to new: FiscalSettings) {
        for impact in computeFiscalMetricImpacts(from: old, to: new) {
            modifyMetricBy(impact.metricId, delta: impact.delta)
        }
    }

    func setInitialPolicyPreferences(economy: Double? = nil, social: Double? = nil, defense: Double? = nil, environment: Double? = nil) {
        var settings = state.policySettings ?? PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: nil, socialSpending: nil,
            defenseSpending: nil, environmentalPolicy: nil
        )
        if let e = economy { settings.economicStance = e }
        if let s = social { settings.socialSpending = s }
        if let d = defense { settings.defenseSpending = d }
        if let env = environment { settings.environmentalPolicy = env }
        state.policySettings = settings
        saveGame()
    }

    func calculatePoliticalCapital() -> Int {
        let approval = state.metrics["metric_approval"] ?? 50
        let base = Int(approval * 0.5)
        let cabinetBonus = state.cabinet.filter { !$0.isVacant }.count * 2
        return base + cabinetBonus
    }

    func calculateTotalPolicyCost() -> Int {
        guard let policy = state.policySettings else { return 0 }
        var cost = 0
        if let eco = policy.economicStance, eco > 60 { cost += Int((eco - 60) / 10) * 5 }
        if let soc = policy.socialSpending, soc > 60 { cost += Int((soc - 60) / 10) * 5 }
        if let def = policy.defenseSpending, def > 60 { cost += Int((def - 60) / 10) * 8 }
        if let env = policy.environmentalPolicy, env > 60 { cost += Int((env - 60) / 10) * 3 }
        return cost
    }

    // MARK: - Cabinet

    func updateCabinetMember(_ memberId: String, updates: CabinetMemberUpdate) {
        if let idx = state.cabinet.firstIndex(where: { $0.id == memberId }) {
            var member = state.cabinet[idx]
            if let name = updates.name { member = CabinetMember(id: member.id, name: name, roleId: member.roleId, skillLevel: member.skillLevel, isVacant: member.isVacant, cost: member.cost, candidate: member.candidate) }
            if let skill = updates.skillLevel { member = CabinetMember(id: member.id, name: member.name, roleId: member.roleId, skillLevel: skill, isVacant: member.isVacant, cost: member.cost, candidate: member.candidate) }
            state.cabinet[idx] = member
        }
        saveGame()
    }

    // MARK: - News

    func addNewsArticle(_ article: NewsArticle) {
        state.newsHistory = ([article] + state.newsHistory).prefix(50).map { $0 }
        pendingNewsArticle = article
        saveGame()
    }

    func addNewsArticle(title: String, summary: String, impact: String = "neutral") {
        let article = NewsArticle(
            id: UUID().uuidString,
            title: title,
            headline: title,
            summary: summary,
            content: nil,
            turn: state.turn,
            impact: impact,
            tags: nil,
            category: nil,
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        addNewsArticle(article)
    }

    func clearNewsHistory() {
        state.newsHistory = []
        saveGame()
    }

    func clearPendingNewsArticle() {
        pendingNewsArticle = nil
    }

    // MARK: - Archive

    func clearArchive() {
        state.archive = []
        saveGame()
    }

    // MARK: - God Mode

    func toggleGodMode() {
        let newVal = !(state.godMode ?? false)
        state.godMode = newVal
        if !newVal { state.infinitePulseEnabled = false }
        saveGame()
    }

    func setGodMode(_ enabled: Bool) {
        state.godMode = enabled
        if !enabled { state.infinitePulseEnabled = false }
        saveGame()
    }

    func setDickMode(_ enabled: Bool) {
        state.dickMode = DickModeConfig(
            enabled: enabled,
            active: enabled,
            authoritarianBias: state.dickMode?.authoritarianBias ?? 0.7,
            moralPenaltyMultiplier: state.dickMode?.moralPenaltyMultiplier ?? 0.5
        )
        if enabled { state.godMode = true }
        saveGame()
    }

    func setDickModeConfig(authoritarianBias: Double? = nil, moralPenaltyMultiplier: Double? = nil) {
        let current = state.dickMode
        state.dickMode = DickModeConfig(
            enabled: current?.enabled ?? false,
            active: current?.active ?? false,
            authoritarianBias: authoritarianBias ?? current?.authoritarianBias ?? 0.7,
            moralPenaltyMultiplier: moralPenaltyMultiplier ?? current?.moralPenaltyMultiplier ?? 0.5
        )
        saveGame()
    }

    func toggleInfinitePulse() {
        state.infinitePulseEnabled = !(state.infinitePulseEnabled ?? false)
        saveGame()
    }

    // MARK: - Player action throttle (mood, tasks, reminders, quests)

    /// Shared action IDs for turn-based cooldowns. Use these keys with canPerformPlayerAction/recordPlayerAction so tasks, reminders, quests align and do not conflict.
    enum PlayerActionThrottleId {
        static let mood = "mood"
        static let task = "task"
        static let reminder = "reminder"
        static let quest = "quest"
    }

    /// Returns true if the player can perform the given throttled action (cooldown has elapsed since last use).
    func canPerformPlayerAction(id: String, cooldownTurns: Int) -> Bool {
        let lastTurn = state.playerActionLastUsedTurn?[id] ?? 0
        return state.turn >= lastTurn + cooldownTurns
    }

    /// Records that the player performed the given throttled action this turn. Call after performing the action.
    func recordPlayerAction(id: String) {
        var map = state.playerActionLastUsedTurn ?? [:]
        map[id] = state.turn
        state.playerActionLastUsedTurn = map
    }

    func canUpdateMood() -> Bool {
        canPerformPlayerAction(id: PlayerActionThrottleId.mood, cooldownTurns: moodUpdateCooldownTurns)
    }

    /// Turns remaining until mood can be updated again (0 if allowed now).
    func turnsUntilMoodUpdateAllowed() -> Int {
        let lastTurn = state.playerActionLastUsedTurn?[PlayerActionThrottleId.mood] ?? 0
        let readyTurn = lastTurn + moodUpdateCooldownTurns
        return max(0, readyTurn - state.turn)
    }

    /// Updates player mood if cooldown has elapsed. Returns true if updated, false if throttled.
    @discardableResult
    func updateMood(_ value: String) -> Bool {
        guard canUpdateMood() else { return false }
        state.playerMood = value.isEmpty ? nil : value
        recordPlayerAction(id: PlayerActionThrottleId.mood)
        saveGame()
        return true
    }

    // MARK: - Trust Your Gut

    func getMaxTrustYourGutUses() -> Int {
        let base = 3
        let cabinetBonus = state.cabinet.filter { !$0.isVacant }.count / 4
        return base + cabinetBonus
    }

    func getRemainingTrustYourGutUses() -> Int {
        return max(0, getMaxTrustYourGutUses() - state.trustYourGutUsed)
    }

    func trustYourGut(command: String) async {
        guard getRemainingTrustYourGutUses() > 0 || isAtrocityCommand(command) else { return }

        isLoading = true
        state.trustYourGutUsed += 1
        let tygMetricsBefore = state.metrics

        var headline: String
        var summary: String
        var content: String?
        var category: String
        var tags: [String]

        let aiRequest = buildActionResolutionRequest(
            category: "trust_your_gut",
            actionType: "freeform",
            targetCountryId: nil,
            freeFormCommand: command
        )
        let aiResult = await ActionResolutionService.shared.resolve(aiRequest)

        if let res = aiResult, res.success, let payload = res.result {
            let detectedAtrocity = payload.isAtrocity == true

            for md in payload.metricDeltas {
                modifyMetricBy(md.metricId, delta: md.delta)
            }

            headline = payload.headline
            summary = payload.summary
            content = payload.context
            category = payload.newsCategory
            tags = payload.newsTags

            if detectedAtrocity {
                category = "crisis"
                tags = ["diplomacy", "crisis"]
            }
        } else {
            let localAtrocity = isAtrocityCommand(command)
            if localAtrocity {
                modifyMetricBy("metric_approval", delta: -15.0)
                modifyMetricBy("metric_foreign_relations", delta: -20.0)
                modifyMetricBy("metric_public_order", delta: -10.0)
                headline = "International Community Condemns Executive Order"
                summary = "World leaders react with shock to the latest directive from the administration."
                content = "International watchdogs and allied nations have issued urgent condemnations after the administration's latest executive directive was leaked to global media."
                category = "crisis"
                tags = ["diplomacy", "crisis"]
            } else {
                let baseline: [String: Double] = [
                    "metric_approval": -3.0,
                    "metric_foreign_relations": -2.0,
                    "metric_economy": -1.0,
                    "metric_public_order": 0.0
                ]
                for (metricId, value) in baseline {
                    modifyMetricBy(metricId, delta: value)
                }
                headline = "Administration Issues Executive Directive"
                summary = "Acting on direct orders, government departments began implementing the executive command: \"\(command)\"."
                content = "Following the executive directive, state departments are coordinating implementation. The policy's long-term implications remain under assessment by institutional advisors."
                category = "executive"
                tags = ["executive"]
            }
        }

        let article = NewsArticle(
            id: "tyg_\(state.turn)_\(Int(Date().timeIntervalSince1970))",
            title: headline,
            headline: headline,
            summary: summary,
            content: content,
            turn: state.turn,
            impact: nil,
            tags: tags,
            category: category,
            relatedScenarioId: nil,
            isAlert: nil,
            isBackgroundEvent: nil
        )
        addNewsArticle(article)
        isLoading = false
        let tygDeltas = Dictionary(uniqueKeysWithValues: state.metrics.compactMap { (k, v) in
            let d = v - (tygMetricsBefore[k] ?? 50.0)
            return abs(d) > 0.01 ? (k, d) : nil
        })
        let tygStance = inferStance(from: tygDeltas, category: "trust_your_gut")
        applyLegislativeStanceEffect(stance: tygStance, category: "trust_your_gut")
        saveGame()
    }

    private func isAtrocityCommand(_ rawCommand: String) -> Bool {
        let command = rawCommand.lowercased()
        let hardPhrases = ["wipe out","kill them all","kill everyone","exterminate","ethnic cleansing","genocide","carpet bomb","glass them","nuke","nuclear strike","first strike","total war","level the city","indiscriminate bombing"]
        if hardPhrases.contains(where: { command.contains($0) }) { return true }
        let massTerms = ["civilians","civilian population","population centers","entire country","entire nation"]
        if command.contains("bomb") && massTerms.contains(where: { command.contains($0) }) { return true }
        return false
    }

    // MARK: - Scenario (God Mode)

    func startScenario(_ scenarioId: String, countryId: String? = nil, severity: String? = nil) {
        Task { @MainActor in
            let allScenarios = await FirebaseDataService.shared.getAllScenarios()
            if let found = allScenarios.first(where: { $0.id == scenarioId }) {
                var scenario = found
                if let resolvedCountry = countryId ?? state.countryId,
                   let country = state.countries.first(where: { $0.id == resolvedCountry }) {
                    scenario = TemplateEngine.shared.resolveScenario(scenario, country: country, gameState: state)
                }
                currentScenario = scenario
                state.currentScenario = scenario
            }
        }
    }

    // MARK: - Save / Load Parity

    func getAllSaves() -> [SaveSlotMetadata?] {
        return PersistenceService.shared.listSlots()
    }

    func deleteSave(_ slot: Int) {
        PersistenceService.shared.deleteSlot(slot)
    }

    func deleteAllSaves() {
        for slot in 1...PersistenceService.totalSlots {
            PersistenceService.shared.deleteSlot(slot)
        }
    }

    func hasSave() -> Bool {
        return PersistenceService.shared.slotHasSave(PersistenceService.shared.activeSlot)
    }

    // MARK: - Score Display

    func setScoreDisplayFormat(_ format: ScoreDisplayFormat) {
        scoreDisplayFormat = format
        UserDefaults.standard.set(format.rawValue, forKey: "score_display_format")
    }

    // MARK: - Game Phase Tracking (public)

    func setGamePhase(_ phase: GamePhase) {
        state.phase = phase
        saveGame()
    }

    // MARK: - Geopolitical Ripple

    /// Applies approval impact and relationship ripples to third-party countries after a bilateral action.
    /// Returns entries for the briefing representing significant ally relationship changes.
    @discardableResult
    private func applyGeopoliticalRipple(
        actionCategory: String,
        targetCountryId: String,
        directRelDelta: Double
    ) -> [(countryId: String, name: String, delta: Double)] {
        var ripples: [(countryId: String, name: String, delta: Double)] = []
        guard let targetIdx = state.countries.firstIndex(where: { $0.id == targetCountryId }),
              let geo = state.countries[targetIdx].geopoliticalProfile else { return ripples }

        let playerCountryId = state.countryId ?? ""
        let isMilitary = actionCategory == "military"
        let isNegative = directRelDelta < 0

        // Approval impact: contextual based on whether target is player's ally, adversary, or neither.
        // Two effects: (1) immediate visible change via modifyMetricBy for real-time UI feedback;
        // (2) shock accumulated into hiddenMetrics["diplomaticShock"] so it persists through future
        // calculateApproval() recalculations and decays naturally across turns (45% per turn).
        // Without this, calculateApproval() would restore approval on the next scenario decision,
        // erasing the political cost of repeated hostile diplomatic or military actions.
        if let playerIdx = state.countries.firstIndex(where: { $0.id == playerCountryId }),
           let playerGeo = state.countries[playerIdx].geopoliticalProfile {
            let isAlly = playerGeo.allies.contains { $0.countryId == targetCountryId }
            let isAdversary = playerGeo.adversaries.contains { $0.countryId == targetCountryId }

            let approvalDelta: Double
            if isNegative {
                if isAlly {
                    // Attacking or harming an ally is politically damaging — calibrated to
                    // real-world data: threatening NATO allies, public criticism of close partners,
                    // etc. cause 5–12 point approval swings per cycle in comparable situations.
                    approvalDelta = isMilitary ? -10.0 : -5.0
                } else if isAdversary {
                    // Voters generally support "getting tough" on adversaries
                    approvalDelta = isMilitary ? 3.5 : 2.0
                } else {
                    // Neutral country: moderate disapproval from foreign policy community
                    approvalDelta = isMilitary ? -4.0 : -2.0
                }
            } else {
                // Positive diplomatic actions have a smaller approval effect
                approvalDelta = isAlly ? 1.5 : 0.75
            }

            if abs(approvalDelta) > 0.05 {
                // Immediate visual feedback
                modifyMetricBy("metric_approval", delta: approvalDelta)
                // Persistent shock — decays 45% per turn in advanceTurn, capped at ±30
                var hidden = state.hiddenMetrics ?? [:]
                let existing = hidden["diplomaticShock"] ?? 0.0
                hidden["diplomaticShock"] = max(-30.0, min(30.0, existing + approvalDelta))
                state.hiddenMetrics = hidden
            }
        }

        // Ally ripple: target's allies see worsened relations if we acted negatively toward their partner
        let allyFactor: Double = isMilitary ? 0.25 : 0.15
        for rel in geo.allies where rel.countryId != playerCountryId {
            guard let allyIdx = state.countries.firstIndex(where: { $0.id == rel.countryId }) else { continue }
            let strengthFactor = min(1.0, abs(rel.strength) / 100.0)
            let ripple = directRelDelta * allyFactor * strengthFactor
            guard abs(ripple) >= 1.0 else { continue }
            let before = state.countries[allyIdx].diplomacy.relationship
            state.countries[allyIdx].diplomacy.relationship = max(-100, min(100, before + ripple))
            let actual = state.countries[allyIdx].diplomacy.relationship - before
            if abs(actual) >= 0.5 {
                ripples.append((rel.countryId, state.countries[allyIdx].name, actual))
            }
        }

        // Adversary ripple: target's adversaries quietly benefit when their rival is pressured
        if isNegative {
            let advFactor: Double = isMilitary ? 0.12 : 0.08
            for rel in geo.adversaries where rel.countryId != playerCountryId {
                guard let advIdx = state.countries.firstIndex(where: { $0.id == rel.countryId }) else { continue }
                let strengthFactor = min(1.0, abs(rel.strength) / 100.0)
                let ripple = abs(directRelDelta) * advFactor * strengthFactor
                guard abs(ripple) >= 1.0 else { continue }
                let before = state.countries[advIdx].diplomacy.relationship
                state.countries[advIdx].diplomacy.relationship = max(-100, min(100, before + ripple))
            }
        }

        return ripples
    }
}

// MARK: - CabinetMemberUpdate helper
struct CabinetMemberUpdate {
    var name: String?
    var skillLevel: Int?
}
