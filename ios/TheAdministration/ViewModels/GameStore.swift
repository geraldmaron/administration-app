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
    @Published var state: GameState
    @Published var currentScenario: Scenario?
    @Published var lastBriefing: ScoringEngine.Briefing?
    @Published var pendingNewsArticle: NewsArticle? = nil
    @Published var showOutcome: Bool = false
    @Published var endGameReview: ScoringEngine.EndGameReview?
    @Published var isLoading: Bool = false
    @Published var availableCountries: [Country] = []
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
    private let maxRecentScenarios = 20
    private let maxRecentTags = 8
    
    private let aiService = AIService()
    
    private static var testMode: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
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
            if FirebaseDataService.shared.isFirebaseAvailable() {
                await ScenarioNavigator.shared.loadScenarios()
                let count = await ScenarioNavigator.shared.getScenarioCount()
                print("✓ Loaded \(count) scenarios from Firebase")
            } else {
                print("⚠️  Firebase not available - scenarios won't load")
            }

            async let countriesFetch = FirebaseDataService.shared.getCountries()
            async let configFetch = FirebaseDataService.shared.getAppConfig()

            let (countries, config) = await (countriesFetch, configFetch)
            TemplateEngine.shared.setCountries(countries)
            print("✓ Loaded \(countries.count) countries with token data")

            await MainActor.run {
                self.availableCountries = countries
                self.appConfig = config
            }
        }
    }
    
    func setCountry(_ countryId: String) {
        state.countryId = countryId
        saveGame()
    }

    func setPlayer(name: String, party: String, approach: String) {
        state.player = PlayerProfile(name: name, party: party, approach: approach)
        saveGame()
    }
    
    func quickStart(name: String, party: String, approach: String) {
        let countries = availableCountries.isEmpty
            ? FirebaseDataService.shared.cachedCountries
            : availableCountries
        let randomCountry = countries.randomElement() ?? Country(
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
        
        // Core metrics tracked at game start
        let metricIds = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order", "metric_corruption"]
        
        var initialMetrics: [String: Double] = [:]
        var metricOffsets: [String: Double] = [:]

        if let gameplay = randomCountry.gameplayProfile,
           let starting = gameplay.startingMetrics,
           !starting.isEmpty {
            // Use calibrated starting metrics from gameplay profile when available
            initialMetrics = starting
            metricOffsets = [:]
        } else {
            // Legacy baseline for early countries without gameplay profiles
            for metricId in metricIds {
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
        }
        
        let roles = [
            (id: "role_executive", cat: "Executive"),
            (id: "role_diplomacy", cat: "Diplomacy"),
            (id: "role_defense", cat: "Defense"),
            (id: "role_economy", cat: "Economy")
        ]
        
        var cabinet: [CabinetMember] = []
        for role in roles {
            if let candidate = CandidateGenerator.generateMinisters(roleId: role.id, category: role.cat, region: randomCountry.region, config: appConfig).first {
                cabinet.append(CabinetMember(
                    id: "cm_\(role.id)",
                    name: candidate.name,
                    roleId: role.id,
                    skillLevel: Int(candidate.stats.management),
                    isVacant: false,
                    cost: candidate.cost
                ))
            }
        }
        
        let personnelSpent = cabinet.reduce(0) { $0 + ($1.cost ?? 0) }
        let totalBudget = CabinetPointsService.calculatePersonnelBudget(numRoles: cabinet.count + 4)
        
        var history: [String: [Double]] = [:]
        for metricId in metricIds {
            history[metricId] = [initialMetrics[metricId] ?? 50]
        }
        
        let initialMaxTurns = Self.testMode ? 10 : 30
        
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
            player: PlayerProfile(name: finalName, party: party, approach: approach),
            personnelSpent: personnelSpent,
            totalBudget: totalBudget,
            metricOffsets: metricOffsets
        )
        
        Task {
            await generateNextScenario()
        }
        
        saveGame()
    }
    
    func finalizeSetup() {
        var initialMetrics: [String: Double] = [:]
        var metricOffsets: [String: Double] = [:]
        let metricIds = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order", "metric_corruption"]
        
        for metricId in metricIds {
            // Increased baseline from 50 to 62 for healthier starting position
            // This changes approval from ~40% (crisis) to ~55% (strong but vulnerable)
            let variance = (Double.random(in: 0...1) * 16) - 8
            let baselineValue: Double = metricId == "metric_corruption" ? 25.0 : 62.0
            let val = baselineValue + variance
            
            // Ensure player starts with minimum rating
            let minRating: Double = metricId == "metric_corruption" ? 20.0 : 58.0
            if val < minRating {
                metricOffsets[metricId] = minRating - val
                initialMetrics[metricId] = minRating
            } else {
                metricOffsets[metricId] = 0.0
                initialMetrics[metricId] = (val * 100).rounded() / 100
            }
        }
        
        var history: [String: [Double]] = [:]
        for metricId in metricIds {
            history[metricId] = [initialMetrics[metricId] ?? 50]
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
        
        currentScenario = initialScenario
        
        Task {
            await generateNextScenario()
        }
        
        saveGame()
    }
    
    func makeDecision(optionId: String) {
        guard let scenario = currentScenario,
              let option = scenario.options.first(where: { $0.id == optionId }) else { return }
        
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
        } else if let feedbackString = option.advisorFeedbackString {
            cabinetFeedback.append(CabinetContribution(
                memberName: "Executive Advisor",
                role: "Analysis",
                contribution: feedbackString
            ))
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
            cabinetFeedback: cabinetFeedback,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )
        
        let metricsBefore = state.metrics
        state = ScoringEngine.applyDecision(state: state, option: option)

        // Update game phase based on turn progression
        updateGamePhase()

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

        // Generate news article for this decision
        let headline = option.outcomeHeadline ?? (scenario.title.isEmpty ? "Executive Decision Issued" : scenario.title)
        let summary = option.outcomeSummary ?? option.outcome ?? "The administration has acted on this matter."
        let article = NewsArticle(
            id: "news_\(state.turn)_\(option.id)",
            title: headline,
            headline: headline,
            summary: summary,
            content: option.outcomeContext,
            turn: state.turn,
            impact: nil,
            tags: scenario.tags,
            category: scenario.tags?.first ?? "general",
            relatedScenarioId: scenario.id,
            isAlert: nil
        )
        state.newsHistory = ([article] + state.newsHistory).prefix(30).map { $0 }

        // Add turn record to archive
        state.archive.append(turnRecord)
        
        // Register scenario usage for cooldown/recency tracking
        registerScenarioUsage(scenario)
        
        // Check for failure conditions (approval collapse or multi-metric collapse)
        let approvalVal = state.metrics["metric_approval"] ?? 50
        let coreMetrics = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order"]
        let collapsedCount = coreMetrics.filter { (state.metrics[$0] ?? 50) < 20 }.count
        if approvalVal < 15 || collapsedCount >= 3 {
            var finalState = state
            finalState.status = .ended
            let review = ScoringEngine.generateEndGameReview(state: finalState)
            endGameReview = review
            state = finalState
            saveGame()
            return
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
        // Load scenarios from Firebase via ScenarioNavigator
        await ScenarioNavigator.shared.loadScenarios()
        let scenarioCount = await ScenarioNavigator.shared.getScenarioCount()
        print("🎯 [GameStore] Firebase scenario count: \(scenarioCount)")
        
        let allScenarios = await FirebaseDataService.shared.getAllScenarios()
        
        print("🎯 [GameStore] Total scenarios available: \(allScenarios.count)")
        
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
                    // If scenario restricts applicable countries, respect it
                    if let ac = scenario.metadata?.applicableCountries, !ac.isEmpty {
                        let matches = ac.contains { $0.lowercased() == cid.lowercased() }
                        if !matches { return false }
                    }
                    return true
                }

                if let picked = pickNeighborScenario(from: neighborPool, for: country, gameState: state) {
                    nextScenario = picked
                    print("🎯 [GameStore] Selected neighbor event scenario: \(picked.id)")
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
            // Applicable countries filter
            if let ac = scenario.metadata?.applicableCountries, !ac.isEmpty {
                guard let countryId = state.countryId else { return false }
                let matches = ac.contains(where: { $0.lowercased() == countryId.lowercased() })
                if !matches { return false }
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

        print("🎯 [GameStore] Filtered pool size: \(pool.count)")

        if nextScenario == nil, !pool.isEmpty {
            // Tag-diversity + geopolitical weighted pick
            nextScenario = weightedPick(from: pool, recentTagQueue: recentTagSet)
            print("🎯 [GameStore] Selected Firebase scenario: \(nextScenario?.id ?? "none")")
        }
        
        // 2. Check AI Scenario Queue
        if nextScenario == nil {
            if var queue = state.aiScenarioQueue, !queue.readyChains.isEmpty {
                let chain = queue.readyChains.removeFirst()
                nextScenario = chain.scenarios.first
                state.aiScenarioQueue = queue
                print("🎯 [GameStore] Using queued AI scenario: \(nextScenario?.id ?? "none")")
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
        return Scenario(
            id: "scenario_fallback_\(Int(Date().timeIntervalSince1970))",
            title: "Administrative Decision",
            description: "A routine administrative matter requires your attention on turn \(state.turn).",
            conditions: nil,
            phase: nil,
            severity: nil,
            chainId: nil,
            options: [
                Option(id: "opt_1", text: "Approve",
                       advisorFeedbackString: "A straightforward sign-off that keeps the machinery of government moving.",
                       effects: [Effect(targetMetricId: "metric_approval", value: 1.0, duration: 1, probability: 0.9)]),
                Option(id: "opt_2", text: "Review Further",
                       advisorFeedbackString: "A cautious review that may slow things down but avoids surprises.",
                       effects: [Effect(targetMetricId: "metric_approval", value: 0.5, duration: 1, probability: 0.8)]),
                Option(id: "opt_3", text: "Delay and Gather More Input",
                       advisorFeedbackString: "A low-impact choice that buys time while you collect more information.",
                       effects: [])
            ],
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

    func saveGame() {
        PersistenceService.shared.save(state: state)
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

        let weights = candidates.map { s -> Double in
            let baseScore = ScenarioNavigator.shared.scoreScenario(s, for: activeCountry, gameState: state)
            if baseScore <= 0 {
                return 0
            }
            let tagPenalty = s.tags?.contains(where: { recentTagQueue.contains($0) }) == true ? 0.4 : 1.0
            return baseScore * tagPenalty
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
        if let pop = population { state.countries[idx].attributes.population = pop }
        if let g = gdp { state.countries[idx].attributes.gdp = g }
        if let ms = militaryStrength { state.countries[idx].military.strength = ms }
        saveGame()
    }

    func executeDiplomaticAction(type: String, targetCountryId: String) async -> (success: Bool, message: String) {
        guard let idx = state.countries.firstIndex(where: { $0.id == targetCountryId }) else {
            return (false, "Country not found")
        }
        let rel = state.countries[idx].diplomacy.relationship
        switch type {
        case "trade_agreement":
            state.countries[idx].diplomacy.relationship = min(100, rel + 10)
            modifyMetricBy("metric_economy", delta: 2.0)
            modifyMetricBy("metric_foreign_relations", delta: 3.0)
        case "impose_sanctions":
            state.countries[idx].diplomacy.relationship = max(-100, rel - 20)
            modifyMetricBy("metric_economy", delta: -2.0)
            modifyMetricBy("metric_foreign_relations", delta: -5.0)
        case "request_alliance":
            if rel >= 30 {
                state.countries[idx].diplomacy.relationship = min(100, rel + 15)
                modifyMetricBy("metric_foreign_relations", delta: 5.0)
            } else {
                return (false, "Relationship not strong enough for alliance")
            }
        default:
            return (false, "Unknown diplomatic action")
        }
        let countryName = state.countries[idx].name
        saveGame()
        return (true, "Diplomatic action '\(type)' executed against \(countryName)")
    }

    func executeMilitaryAction(type: String, targetCountryId: String, severity: String = "medium") async -> (success: Bool, message: String) {
        guard let idx = state.countries.firstIndex(where: { $0.id == targetCountryId }) else {
            return (false, "Country not found")
        }
        let sm: Double = severity == "high" ? 2.0 : severity == "low" ? 0.5 : 1.0
        switch type {
        case "covert_ops":
            state.countries[idx].military.cyberCapability = max(0, state.countries[idx].military.cyberCapability - 5 * sm)
            modifyMetricBy("metric_foreign_relations", delta: -3.0 * sm)
        case "special_ops":
            state.countries[idx].military.strength = max(0, state.countries[idx].military.strength - 5 * sm)
            modifyMetricBy("metric_public_order", delta: -2.0 * sm)
            modifyMetricBy("metric_foreign_relations", delta: -5.0 * sm)
        case "military_strike":
            state.countries[idx].military.strength = max(0, state.countries[idx].military.strength - 15 * sm)
            modifyMetricBy("metric_foreign_relations", delta: -15.0 * sm)
            modifyMetricBy("metric_approval", delta: -5.0 * sm)
        case "nuclear_strike":
            state.countries[idx].military.strength = 0
            modifyMetricBy("metric_foreign_relations", delta: -50.0)
            modifyMetricBy("metric_approval", delta: -30.0)
        case "cyberattack":
            state.countries[idx].military.cyberCapability = max(0, state.countries[idx].military.cyberCapability - 20 * sm)
            modifyMetricBy("metric_foreign_relations", delta: -8.0 * sm)
        case "naval_blockade":
            modifyMetricBy("metric_economy", delta: 2.0 * sm)
            modifyMetricBy("metric_foreign_relations", delta: -10.0 * sm)
        default:
            return (false, "Unknown military action")
        }
        let countryName = state.countries[idx].name
        saveGame()
        return (true, "Military action '\(type)' [\(severity)] executed against \(countryName)")
    }

    // MARK: - Policy

    func updatePolicySettings(_ settings: PolicySettings) {
        state.policySettings = settings
        saveGame()
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
            isAlert: nil
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
        let isAtrocity = isAtrocityCommand(command)
        if isAtrocity {
            let penaltyArticle = NewsArticle(
                id: "tyg_atrocity_\(state.turn)",
                title: "International Community Condemns Executive Order",
                headline: "International Community Condemns Executive Order",
                summary: "World leaders react with shock to the latest directive from the administration.",
                content: "International watchdogs and allied nations have issued urgent condemnations after the administration's latest executive directive was leaked to global media.",
                turn: state.turn,
                impact: nil,
                tags: ["diplomacy", "crisis"],
                category: "crisis",
                relatedScenarioId: nil,
                isAlert: nil
            )
            modifyMetricBy("metric_approval", delta: -15.0)
            modifyMetricBy("metric_foreign_relations", delta: -20.0)
            modifyMetricBy("metric_public_order", delta: -10.0)
            addNewsArticle(penaltyArticle)
            state.trustYourGutUsed += 1
            saveGame()
            return
        }
        
        guard getRemainingTrustYourGutUses() > 0 else { return }
        
        isLoading = true
        state.trustYourGutUsed += 1

        // Apply modest balanced effects for executive directives
        let baseline: [String: Double] = [
            "metric_approval": -3.0,
            "metric_foreign_relations": -2.0,
            "metric_economy": -1.0,
            "metric_public_order": 0.0
        ]
        for (metricId, value) in baseline {
            modifyMetricBy(metricId, delta: value)
        }

        let headline = "Administration Issues Executive Directive"
        let summary = "Acting on direct orders, government departments began implementing the executive command: \"\(command)\"."
        let content: String? = "Following the executive directive, state departments are coordinating implementation. The policy's long-term implications remain under assessment by institutional advisors."
        
        let article = NewsArticle(
            id: "tyg_\(state.turn)_\(Int(Date().timeIntervalSince1970))",
            title: headline,
            headline: headline,
            summary: summary,
            content: content,
            turn: state.turn,
            impact: nil,
            tags: ["executive"],
            category: "executive",
            relatedScenarioId: nil,
                isAlert: nil
        )
        addNewsArticle(article)
        isLoading = false
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
}

// MARK: - CabinetMemberUpdate helper
struct CabinetMemberUpdate {
    var name: String?
    var skillLevel: Int?
}
