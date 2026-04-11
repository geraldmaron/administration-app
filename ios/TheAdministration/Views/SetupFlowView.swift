import SwiftUI

struct SetupFlowView: View {
    @ObservedObject var gameStore: GameStore
    var onCancel: () -> Void = {}

    @State private var step = 1
    @State private var selectedCountry: Country? = nil
    @State private var searchText: String = ""
    @State private var dossierCountry: Country? = nil
    @State private var playerName: String = ""
    @State private var selectedParty: String = ""
    @State private var selectedApproach: String = "Pragmatist"
    @State private var selectedSkills: Set<String> = []
    @State private var selectedGameLength: String = "medium"

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                backHeader
                SetupProgressBar(currentStep: step, totalSteps: 5)

                Group {
                    if step == 1 {
                        CountrySelectionView(
                            gameStore: gameStore,
                            selectedCountry: $selectedCountry,
                            searchText: $searchText,
                            dossierCountry: $dossierCountry,
                            step: $step
                        )
                    } else if step == 2 {
                        PlayerIdentityView(
                            playerName: $playerName,
                            selectedParty: $selectedParty,
                            selectedApproach: $selectedApproach,
                            gameStore: gameStore,
                            step: $step,
                            onContinue: applyAutofillSkills
                        )
                    } else if step == 3 {
                        SkillSelectionView(
                            selectedSkills: $selectedSkills,
                            approach: selectedApproach,
                            party: gameStore.countryParties.first(where: { $0.name == selectedParty }),
                            step: $step
                        )
                    } else if step == 4 {
                        GameLengthSelectionView(selectedGameLength: $selectedGameLength, step: $step)
                    } else if step == 5 {
                        CabinetFormationView(
                            gameStore: gameStore,
                            selectedGameLength: selectedGameLength,
                            selectedSkills: selectedSkills,
                            selectedApproach: selectedApproach,
                            step: $step
                        )
                    }
                }
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .animation(AppMotion.standard, value: step)
            }
        }
    }

    private var backHeader: some View {
        HStack {
            Button {
                HapticEngine.shared.light()
                if step == 1 {
                    onCancel()
                } else {
                    withAnimation(AppMotion.standard) { step -= 1 }
                }
            } label: {
                Image(systemName: step == 1 ? "xmark" : "chevron.left")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.foregroundMuted)
                    .frame(width: 36, height: 36)
                    .background(AppColors.backgroundMuted)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
    }

    private func applyAutofillSkills() {
        var suggested: [String] = []
        if let party = gameStore.countryParties.first(where: { $0.name == selectedParty }) {
            suggested += party.suggestedSkills ?? []
        }
        let approachDefaults = PlayerSkillCatalogue.defaultSkills(for: selectedApproach)
        for id in approachDefaults where !suggested.contains(id) && suggested.count < 5 {
            suggested.append(id)
        }
        withAnimation(AppMotion.quickSnap) {
            selectedSkills = Set(suggested.prefix(5))
        }
    }
}

// MARK: - Setup Progress Bar

struct SetupProgressBar: View {
    let currentStep: Int
    let totalSteps: Int

    private let stepLabels = ["NATION", "IDENTITY", "SKILLS", "DURATION", "CABINET"]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(1...totalSteps, id: \.self) { step in
                    HStack(spacing: 0) {
                        ZStack {
                            Circle()
                                .fill(step <= currentStep ? AppColors.accentPrimary : AppColors.border)
                                .frame(width: 8, height: 8)
                        }

                        if step < totalSteps {
                            Rectangle()
                                .fill(step < currentStep ? AppColors.accentPrimary : AppColors.border)
                                .frame(height: 1)
                                .animation(AppMotion.standard, value: currentStep)
                        }
                    }
                    .frame(maxWidth: step < totalSteps ? .infinity : nil)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 8)

            HStack {
                ForEach(1...totalSteps, id: \.self) { step in
                    Text(stepLabels[safe: step - 1] ?? "")
                        .font(AppTypography.micro)
                        .foregroundColor(step == currentStep ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                        .frame(maxWidth: .infinity, alignment: step == 1 ? .leading : step == totalSteps ? .trailing : .center)
                        .animation(AppMotion.quickSnap, value: currentStep)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 8)

            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// MARK: - Country Selection

struct CountrySelectionView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var selectedCountry: Country?
    @Binding var searchText: String
    @Binding var dossierCountry: Country?
    @Binding var step: Int

    private var filteredCountries: [Country] {
        let sorted = gameStore.availableCountries.sorted { $0.name < $1.name }
        if searchText.isEmpty { return sorted }
        return sorted.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var globeTarget: GlobeTarget? {
        guard let id = selectedCountry?.id else { return nil }
        return GlobeBackgroundView.capitalCoordinates[id]
    }

    var body: some View {
        ZStack {
            GlobeBackgroundView(target: globeTarget, showPulse: globeTarget != nil)
                .ignoresSafeArea()
                .opacity(0.35)

            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("STEP 1 OF 5")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(2)
                    Text("Select Nation")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                    Text("Choose the jurisdiction for your administration.")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(AppColors.foregroundMuted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 16)

                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(AppColors.foregroundMuted)
                    TextField("Search countries\u{2026}", text: $searchText)
                        .font(AppTypography.bodySmall)
                        .foregroundColor(AppColors.foreground)
                        .textFieldStyle(PlainTextFieldStyle())
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 13))
                                .foregroundColor(AppColors.foregroundMuted)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppColors.backgroundMuted)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

                ScrollView {
                    VStack(spacing: 0) {
                        if gameStore.availableCountries.isEmpty {
                            VStack(spacing: 12) {
                                ProgressView().tint(AppColors.foreground)
                                Text("Loading countries\u{2026}")
                                    .font(.system(size: 13, weight: .regular, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundMuted)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 48)
                        } else {
                            ForEach(filteredCountries, id: \.id) { country in
                                HStack(spacing: 0) {
                                    Button(action: {
                                        HapticEngine.shared.light()
                                        selectedCountry = country
                                        gameStore.setCountry(country.id)
                                    }) {
                                        HStack(spacing: 12) {
                                            Text(country.flagEmoji)
                                                .font(.system(size: 22))
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(country.name)
                                                    .font(AppTypography.bodySmall)
                                                    .foregroundColor(AppColors.foreground)
                                                if selectedCountry?.id == country.id, let legislature = country.legislatureProfile {
                                                    HStack(spacing: 6) {
                                                        Image(systemName: legislatureIcon(for: legislature.type))
                                                            .font(.caption)
                                                            .foregroundStyle(.secondary)
                                                        Text(legislatureLabel(for: legislature))
                                                            .font(.caption)
                                                            .foregroundStyle(.secondary)
                                                    }
                                                } else {
                                                    Text(country.region ?? "")
                                                        .font(AppTypography.micro)
                                                        .foregroundColor(AppColors.foregroundMuted)
                                                }
                                            }
                                            Spacer()
                                            if selectedCountry?.id == country.id {
                                                Circle()
                                                    .fill(AppColors.foreground)
                                                    .frame(width: 8, height: 8)
                                            } else {
                                                Circle()
                                                    .stroke(AppColors.borderStrong, lineWidth: 1)
                                                    .frame(width: 8, height: 8)
                                            }
                                        }
                                        .padding(.leading, 16)
                                        .padding(.trailing, 8)
                                        .padding(.vertical, 14)
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)

                                    Button(action: {
                                        HapticEngine.shared.light()
                                        dossierCountry = country
                                    }) {
                                        Image(systemName: "info.circle")
                                            .font(.system(size: 15, weight: .regular))
                                            .foregroundColor(AppColors.foregroundSubtle)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 14)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                }
                                .background(selectedCountry?.id == country.id ? AppColors.backgroundElevated : Color.clear)
                                .overlay(
                                    Rectangle()
                                        .frame(height: 1)
                                        .foregroundColor(AppColors.backgroundElevated),
                                    alignment: .bottom
                                )
                            }
                        }
                    }
                    .padding(.bottom, 24)
                }
                .sheet(item: $dossierCountry) { country in
                    CountryDetailView(country: country, gameStore: nil)
                }

                Button(action: {
                    guard selectedCountry != nil else { return }
                    HapticEngine.shared.medium()
                    withAnimation(AppMotion.standard) { step = 2 }
                }) {
                    Text("CONTINUE")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(selectedCountry != nil ? AppColors.background : AppColors.foregroundSubtle)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(selectedCountry != nil ? AppColors.foreground : AppColors.backgroundMuted)
                }
                .disabled(selectedCountry == nil)
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private func legislatureIcon(for type: LegislatureType) -> String {
        switch type {
        case .bicameral: return "building.columns"
        case .unicameral: return "building.columns.fill"
        case .noLegislature: return "xmark.circle"
        case .rubberStamp: return "seal"
        }
    }

    private func legislatureLabel(for legislature: LegislatureProfile) -> String {
        switch legislature.type {
        case .bicameral:
            let upper = legislature.upperHouse?.name ?? "Upper House"
            let lower = legislature.lowerHouse?.name ?? "Lower House"
            return "\(upper) · \(lower)"
        case .unicameral:
            return legislature.singleChamber?.name ?? "Unicameral Legislature"
        case .noLegislature:
            return "No Legislature"
        case .rubberStamp:
            return legislature.singleChamber?.name ?? "Nominal Legislature"
        }
    }
}

// MARK: - Game Length Selection

struct GameLengthSelectionView: View {
    @Binding var selectedGameLength: String
    @Binding var step: Int

    private struct LengthOption: Identifiable {
        let id: String
        let code: String
        let label: String
        let turns: String
        let realTime: String
        let description: String
    }

    private let options: [LengthOption] = [
        LengthOption(id: "short",  code: "SHT-030", label: "Short Campaign",  turns: "~30 Turns",
                     realTime: "Crisis Pace",
                     description: "Compressed decisions with amplified consequences. Limited recovery window — every turn carries outsized weight."),
        LengthOption(id: "medium", code: "MED-060", label: "Standard Term",   turns: "~60 Turns",
                     realTime: "Standard Pace",
                     description: "Cascading effects develop meaningfully. Coalitions shift, feedback loops emerge. The recommended starting point."),
        LengthOption(id: "long",   code: "LNG-120", label: "Full Mandate",    turns: "~120 Turns",
                     realTime: "Full Pace",
                     description: "Every system has time to evolve or collapse. Diplomatic drift, domestic entropy, and long-term consequences fully develop."),
    ]

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 4 OF 5")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Campaign Duration")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
                Text("Define the operational timeframe for your administration.")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 24)

            ScrollView {
                VStack(spacing: 12) {
                    ForEach(options) { opt in
                        let isSelected = selectedGameLength == opt.id
                        Button(action: { selectedGameLength = opt.id }) {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text(opt.code)
                                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foregroundMuted)
                                        .tracking(3)
                                    Spacer()
                                    if isSelected {
                                        Circle()
                                            .fill(AppColors.accentPrimary)
                                            .frame(width: 7, height: 7)
                                    }
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(opt.label.uppercased())
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foreground)
                                        .tracking(2)
                                    Text(opt.turns)
                                        .font(.system(size: 22, weight: .black, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foreground)
                                    Text(opt.realTime)
                                        .font(.system(size: 10, weight: .regular, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary.opacity(0.7) : AppColors.foregroundMuted)
                                }

                                Text(opt.description)
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundColor(isSelected ? AppColors.foreground.opacity(0.8) : AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(isSelected ? AppColors.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
                            .overlay(
                                Rectangle()
                                    .stroke(isSelected ? AppColors.accentPrimary : AppColors.border, lineWidth: isSelected ? 1 : 0.5)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
            }

            Spacer()

            Button(action: { step = 5 }) {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppColors.foreground)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Cabinet Formation

struct CabinetFormationView: View {
    @ObservedObject var gameStore: GameStore
    let selectedGameLength: String
    let selectedSkills: Set<String>
    let selectedApproach: String
    @Binding var step: Int

    @State private var candidatesByRole: [String: [Candidate]] = [:]
    @State private var selections: [String: Candidate] = [:]
    @State private var isGenerating = true
    @State private var totalBudget: Int = 0

    private var country: Country? {
        gameStore.availableCountries.first(where: { $0.id == gameStore.state.countryId })
    }

    private var totalCost: Int {
        selections.values.reduce(0) { $0 + ($1.cost ?? 0) }
    }

    private func remainingForRole(_ roleId: String) -> Int {
        let otherCost = selections
            .filter { $0.key != roleId }
            .values.reduce(0) { $0 + ($1.cost ?? 0) }
        return totalBudget - otherCost
    }

    private var budgetColor: Color {
        guard totalBudget > 0 else { return AppColors.accentPrimary }
        let ratio = Double(totalCost) / Double(totalBudget)
        if ratio >= 1.0 { return AppColors.error }
        if ratio >= 0.9 { return AppColors.warning }
        return AppColors.success
    }

    private func autoFill() {
        var scratch = selections
        for role in CabinetRoles.DEFAULT_ROLES {
            guard let candidates = candidatesByRole[role.id] else { continue }
            let otherCost = scratch
                .filter { $0.key != role.id }
                .values.reduce(0) { $0 + ($1.cost ?? 0) }
            let rem = totalBudget - otherCost
            let affordable = candidates.filter { ($0.cost ?? 0) <= rem }
            let pick = affordable.min(by: {
                abs(($0.cost ?? 0) - CabinetPointsService.TARGET_AVG_COST_PER_SLOT) <
                abs(($1.cost ?? 0) - CabinetPointsService.TARGET_AVG_COST_PER_SLOT)
            })
            if let pick { scratch[role.id] = pick }
        }
        selections = scratch
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 5 OF 5")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Form Cabinet")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
                Text("Select your ministers. Each candidate brings different skills and approaches.")
                    .font(.system(size: 13, weight: .regular))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 16)

            if isGenerating {
                Spacer()
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(AppColors.accentPrimary)
                    Text("Generating candidates\u{2026}")
                        .font(.system(size: 12, weight: .regular, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                }
                Spacer()
            } else {
                VStack(spacing: 8) {
                    HStack(alignment: .center, spacing: 8) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("PERSONNEL BUDGET")
                                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .tracking(2)
                                Spacer()
                                Text("\(totalCost) / \(totalBudget)")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundColor(budgetColor)
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(AppColors.backgroundMuted)
                                        .frame(height: 3)
                                    Rectangle()
                                        .fill(budgetColor)
                                        .frame(width: totalBudget > 0 ? max(0, geo.size.width * CGFloat(min(1, Double(totalCost) / Double(totalBudget)))) : 0, height: 3)
                                }
                            }
                            .frame(height: 3)
                        }

                        Button(action: autoFill) {
                            Text("AUTO-FILL")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(AppColors.accentPrimary)
                                .tracking(1)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.5), lineWidth: 0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

                ScrollView {
                    VStack(spacing: 14) {
                        ForEach(CabinetRoles.DEFAULT_ROLES, id: \.id) { role in
                            RoleCandidateRow(
                                role: role,
                                candidates: candidatesByRole[role.id] ?? [],
                                remainingPoints: remainingForRole(role.id),
                                selection: Binding(
                                    get: { selections[role.id] },
                                    set: { selections[role.id] = $0 }
                                )
                            )
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)
                }
            }

            Button(action: beginTerm) {
                Text("BEGIN TERM")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isGenerating ? AppColors.foregroundSubtle : AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(isGenerating ? AppColors.backgroundMuted : AppColors.foreground)
            }
            .disabled(isGenerating)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .onAppear(perform: generateCandidates)
    }

    private func generateCandidates() {
        isGenerating = true
        let region = country?.region
        let countryId = gameStore.state.countryId
        let config = gameStore.appConfig
        let partyNames = gameStore.countryParties.isEmpty ? nil : gameStore.countryParties.map { $0.name }

        DispatchQueue.global(qos: .userInitiated).async {
            var byRole: [String: [Candidate]] = [:]
            var sel: [String: Candidate] = [:]
            let numRoles = CabinetRoles.DEFAULT_ROLES.count
            var usedFirstNames = Set<String>()
            var usedLastNames = Set<String>()
            for role in CabinetRoles.DEFAULT_ROLES {
                let candidates = CandidateGenerator.generateMinisters(
                    roleId: role.id,
                    category: role.category,
                    region: region,
                    countryId: countryId,
                    count: 10,
                    config: config,
                    partyNames: partyNames,
                    excludedFirstNames: usedFirstNames,
                    excludedLastNames: usedLastNames
                )
                byRole[role.id] = candidates
                let mid = candidates.min(by: {
                    abs(($0.cost ?? 0) - CabinetPointsService.TARGET_AVG_COST_PER_SLOT) <
                    abs(($1.cost ?? 0) - CabinetPointsService.TARGET_AVG_COST_PER_SLOT)
                })
                let chosen = mid ?? candidates.first
                sel[role.id] = chosen
                if let pick = chosen {
                    let parts = pick.name.split(separator: " ", maxSplits: 1)
                    if let fn = parts.first { usedFirstNames.insert(String(fn)) }
                    if parts.count > 1 { usedLastNames.insert(String(parts[1])) }
                }
            }
            DispatchQueue.main.async {
                self.candidatesByRole = byRole
                self.selections = sel
                self.totalBudget = CabinetPointsService.calculatePersonnelBudget(numRoles: numRoles)
                self.isGenerating = false
            }
        }
    }

    private func beginTerm() {
        for role in CabinetRoles.DEFAULT_ROLES {
            if let candidate = selections[role.id] {
                gameStore.hireCabinetMember(roleId: role.id, candidate: candidate)
            }
        }
        gameStore.setGameLength(selectedGameLength)
        let skillObjects = PlayerSkillCatalogue.all.filter { selectedSkills.contains($0.id) }
        let partyObj = gameStore.countryParties.first(where: { $0.name == (gameStore.state.player?.party ?? "") })
        let strengths = PlayerSkillCatalogue.generateStrengths(from: skillObjects, approach: selectedApproach, party: partyObj)
        let weaknesses = PlayerSkillCatalogue.generateWeaknesses(from: skillObjects, approach: selectedApproach, party: partyObj)
        gameStore.setPlayerSkills(skillObjects, strengths: strengths, weaknesses: weaknesses)
        gameStore.finalizeSetup()
    }
}

// MARK: - Player Identity View

struct PlayerIdentityView: View {
    @Binding var playerName: String
    @Binding var selectedParty: String
    @Binding var selectedApproach: String
    @ObservedObject var gameStore: GameStore
    @Binding var step: Int
    var onContinue: (() -> Void)? = nil

    private var parties: [(name: String, desc: String)] {
        if !gameStore.countryParties.isEmpty {
            return gameStore.countryParties.map { ($0.name, $0.description) }
        }
        if !gameStore.partiesLoaded {
            return []
        }
        if let config = gameStore.appConfig {
            let names = config.parties(for: gameStore.state.countryId)
            if !names.isEmpty {
                return names.map { ($0, "") }
            }
        }
        return []
    }

    private var isLoadingParties: Bool {
        !gameStore.partiesLoaded && !gameStore.availableCountries.isEmpty
    }

    private let approaches: [(name: String, tagline: String, icon: String)] = [
        ("Pragmatist",  "Results over ideology. Coalition-building keeps the machine moving.", "handshake"),
        ("Ideologue",   "Conviction-first governance. Your values are your mandate.",           "star.fill"),
        ("Technocrat",  "Evidence-based governance. Let the data decide.",                     "chart.bar.fill"),
        ("Nationalist", "Sovereignty above all. Strength at home, strength abroad.",           "shield.fill"),
        ("Populist",    "Lead from the crowd. Approval is your mandate.",                      "person.3.fill")
    ]

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 2 OF 5")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Executive Identity")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
                Text("Define who you are before you take office.")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 24)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("HEAD OF GOVERNMENT")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)

                        TextField("ENTER NAME", text: $playerName)
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.foreground)
                            .textFieldStyle(PlainTextFieldStyle())

                        Rectangle()
                            .fill(playerName.isEmpty ? AppColors.foregroundSubtle.opacity(0.4) : AppColors.accentPrimary)
                            .frame(height: 1)
                            .animation(AppMotion.quickSnap, value: playerName.isEmpty)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("POLITICAL PARTY")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)

                        if isLoadingParties {
                            HStack(spacing: 10) {
                                ProgressView()
                                    .tint(AppColors.foreground)
                                    .scaleEffect(0.8)
                                Text("Loading parties\u{2026}")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundMuted)
                            }
                            .padding(.vertical, 8)
                        } else {
                            VStack(spacing: 10) {
                                ForEach(parties, id: \.name) { party in
                                    Button {
                                        HapticEngine.shared.light()
                                        withAnimation(AppMotion.quickSnap) {
                                            selectedParty = party.name
                                        }
                                    } label: {
                                        HStack(spacing: 10) {
                                            Rectangle()
                                                .fill(selectedParty == party.name ? AppColors.accentPrimary : AppColors.border)
                                                .frame(width: 3, height: 32)

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(party.name)
                                                    .font(AppTypography.bodySmall)
                                                    .foregroundColor(AppColors.foreground)
                                                Text(party.desc)
                                                    .font(AppTypography.micro)
                                                    .foregroundColor(AppColors.foregroundSubtle)
                                            }
                                            Spacer()
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 10)
                                        .background(AppColors.backgroundMuted)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    GoverningStylePicker(approaches: approaches, selectedApproach: $selectedApproach)
                }
                .padding(.horizontal, 24)
            }

            Spacer()

            Button {
                guard !playerName.isEmpty else { return }
                gameStore.setPlayer(name: playerName, party: selectedParty, approach: selectedApproach)
                onContinue?()
                withAnimation(AppMotion.standard) { step = 3 }
            } label: {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(playerName.isEmpty ? AppColors.foregroundSubtle : AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(playerName.isEmpty ? AppColors.backgroundMuted : AppColors.foreground)
            }
            .disabled(playerName.isEmpty)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Governing Style Picker

private struct GoverningStylePicker: View {
    let approaches: [(name: String, tagline: String, icon: String)]
    @Binding var selectedApproach: String
    @State private var hasSwipedStyle = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("GOVERNING STYLE")
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)

            TabView(selection: Binding(
                get: { selectedApproach },
                set: { newValue in
                    HapticEngine.shared.light()
                    withAnimation(AppMotion.quickSnap) { selectedApproach = newValue }
                    hasSwipedStyle = true
                }
            )) {
                ForEach(approaches, id: \.name) { approach in
                    GoverningStyleCard(
                        approach: approach,
                        isSelected: selectedApproach == approach.name,
                        showSwipeHint: !hasSwipedStyle && approach.name == approaches.first?.name
                    )
                    .tag(approach.name)
                    .padding(.horizontal, 2)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .frame(height: 148)
            .tint(AppColors.accentPrimary)
        }
    }
}

private struct GoverningStyleCard: View {
    let approach: (name: String, tagline: String, icon: String)
    let isSelected: Bool
    let showSwipeHint: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Image(systemName: approach.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foregroundMuted)
                Text(approach.name.uppercased())
                    .font(AppTypography.micro)
                    .foregroundColor(isSelected ? AppColors.foreground : AppColors.foregroundMuted)
                    .tracking(1.5)
                Spacer()
                if showSwipeHint {
                    HStack(spacing: 2) {
                        Image(systemName: "chevron.left")
                        Text("SWIPE")
                        Image(systemName: "chevron.right")
                    }
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                }
            }
            Text(approach.tagline)
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foregroundMuted)
                .fixedSize(horizontal: false, vertical: true)
                .lineLimit(3)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(AppColors.backgroundMuted)
        .overlay(
            Rectangle()
                .fill(isSelected ? AppColors.accentPrimary : AppColors.border)
                .frame(height: 2),
            alignment: .top
        )
    }
}

// MARK: - Skill Selection

struct SkillSelectionView: View {
    @Binding var selectedSkills: Set<String>
    let approach: String
    let party: PoliticalParty?
    @Binding var step: Int

    private var selectedSkillObjects: [PlayerSkill] {
        PlayerSkillCatalogue.all.filter { selectedSkills.contains($0.id) }
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("STEP 3 OF 5")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Your Skills")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 4)

            HStack {
                Text("\(selectedSkills.count) / 5 selected")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(1)
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)

            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(PlayerSkillCatalogue.all) { skill in
                        let isSelected = selectedSkills.contains(skill.id)
                        let canSelect = isSelected || selectedSkills.count < 5
                        Button {
                            guard canSelect else { return }
                            HapticEngine.shared.light()
                            withAnimation(AppMotion.quickSnap) {
                                if isSelected { selectedSkills.remove(skill.id) }
                                else { selectedSkills.insert(skill.id) }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: skill.iconName)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(isSelected ? AppColors.background : (canSelect ? AppColors.accentPrimary : AppColors.foregroundSubtle))
                                    .frame(width: 22, height: 22)
                                Text(skill.name)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(isSelected ? AppColors.background : (canSelect ? Color.white : AppColors.foregroundSubtle))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(AppColors.background)
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(isSelected ? AppColors.accentPrimary : (canSelect ? AppColors.backgroundMuted : AppColors.backgroundMuted.opacity(0.5)))
                            )
                        }
                        .buttonStyle(.plain)
                        .opacity(canSelect ? 1.0 : 0.5)
                    }
                }
                .padding(.horizontal, 24)

                if !selectedSkills.isEmpty {
                    let strengths = PlayerSkillCatalogue.generateStrengths(from: selectedSkillObjects, approach: approach, party: party)
                    let weaknesses = PlayerSkillCatalogue.generateWeaknesses(from: selectedSkillObjects, approach: approach, party: party)

                    VStack(alignment: .leading, spacing: 12) {
                        if !strengths.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("STRENGTHS")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.accentTertiary)
                                    .tracking(2)
                                ForEach(strengths, id: \.self) { s in
                                    HStack(alignment: .top, spacing: 8) {
                                        Image(systemName: "arrow.up.circle.fill")
                                            .font(.system(size: 11))
                                            .foregroundColor(AppColors.success)
                                        Text(s)
                                            .font(AppTypography.label)
                                            .foregroundColor(AppColors.foregroundMuted)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                        }
                        if !weaknesses.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("WEAKNESSES")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.accentSecondary)
                                    .tracking(2)
                                ForEach(weaknesses, id: \.self) { w in
                                    HStack(alignment: .top, spacing: 8) {
                                        Image(systemName: "arrow.down.circle.fill")
                                            .font(.system(size: 11))
                                            .foregroundColor(AppColors.error)
                                        Text(w)
                                            .font(AppTypography.label)
                                            .foregroundColor(AppColors.foregroundMuted)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    .background(AppColors.backgroundMuted)
                    .padding(.horizontal, 24)
                    .padding(.top, 16)
                    .padding(.bottom, 24)
                }
            }

            Button(action: { step = 4 }) {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppColors.foreground)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - RoleCandidateRow

struct RoleCandidateRow: View {
    let role: Role
    let candidates: [Candidate]
    let remainingPoints: Int
    @Binding var selection: Candidate?

    private func categoryColor(_ category: String) -> Color {
        AppColors.foregroundMuted
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Rectangle()
                    .fill(categoryColor(role.category))
                    .frame(width: 3, height: 16)
                Text(role.title.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(AppColors.foreground)
                    .tracking(1.5)
                Spacer()
                Text(role.category.uppercased())
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(1)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(candidates) { candidate in
                        CandidateSelectionCard(
                            candidate: candidate,
                            isSelected: selection?.id == candidate.id,
                            canAfford: (candidate.cost ?? 0) <= remainingPoints || selection?.id == candidate.id
                        ) {
                            selection = candidate
                        }
                    }
                }
            }

            if candidates.count > 3 {
                HStack(spacing: 0) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 7, weight: .medium))
                    Text("  \(candidates.count) CANDIDATES  ")
                        .font(.system(size: 7, weight: .medium, design: .monospaced))
                        .tracking(1)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 7, weight: .medium))
                }
                .foregroundColor(AppColors.foregroundSubtle)
            }
        }
    }
}

// MARK: - CandidateSelectionCard

struct CandidateSelectionCard: View {
    let candidate: Candidate
    let isSelected: Bool
    let canAfford: Bool
    let onSelect: () -> Void

    private var topStat: (String, Double) {
        let s = candidate.stats
        let all: [(String, Double)] = [
            ("DIP", s.diplomacy), ("ECO", s.economics),
            ("MIL", s.military),  ("MGT", s.management),
            ("INT", s.integrity), ("CMP", s.compassion)
        ]
        return all.max(by: { $0.1 < $1.1 }) ?? ("MGT", s.management)
    }

    private var secondStat: (String, Double) {
        let s = candidate.stats
        let all: [(String, Double)] = [
            ("DIP", s.diplomacy), ("ECO", s.economics),
            ("MIL", s.military),  ("MGT", s.management),
            ("INT", s.integrity), ("CMP", s.compassion)
        ]
        let sorted = all.sorted(by: { $0.1 > $1.1 })
        return sorted.count > 1 ? sorted[1] : sorted[0]
    }

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 5) {
                Text(candidate.name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foreground)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                Text(candidate.party)
                    .font(.system(size: 9, weight: .regular, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineLimit(1)
                    .truncationMode(.tail)

                Spacer(minLength: 4)

                VStack(alignment: .leading, spacing: 3) {
                    statBar(label: topStat.0, value: topStat.1)
                    statBar(label: secondStat.0, value: secondStat.1)
                }

                HStack {
                    if let cost = candidate.cost {
                        Text("$\(cost)k")
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundColor(isSelected ? AppColors.accentPrimary.opacity(0.9) : AppColors.foregroundMuted)
                    }
                    Spacer()
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(AppColors.accentPrimary)
                    }
                }
            }
            .padding(10)
            .frame(width: 130, alignment: .leading)
            .background(isSelected ? AppColors.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
            .overlay(
                Rectangle()
                    .stroke(isSelected ? AppColors.accentPrimary : AppColors.border,
                            lineWidth: isSelected ? 1 : 0.5)
            )
        }
        .buttonStyle(.plain)
        .disabled(!canAfford)
        .opacity(canAfford ? 1.0 : 0.35)
    }

    @ViewBuilder
    private func statBar(label: String, value: Double) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: 8, weight: .bold, design: .monospaced))
                .foregroundColor(isSelected ? AppColors.accentPrimary.opacity(0.7) : AppColors.foregroundSubtle)
                .frame(width: 22, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(AppColors.backgroundMuted)
                        .frame(height: 2)
                    Rectangle()
                        .fill(isSelected ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                        .frame(width: max(2, geo.size.width * CGFloat(value / 100)), height: 2)
                }
            }
            .frame(height: 2)
            Text("\(Int(value))")
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .foregroundColor(isSelected ? AppColors.accentPrimary.opacity(0.7) : AppColors.foregroundSubtle)
                .frame(width: 20, alignment: .trailing)
        }
    }
}
