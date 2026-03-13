import SwiftUI

struct SetupFlowView: View {
    @ObservedObject var gameStore: GameStore
    @State private var step = 1
    @State private var selectedCountry: Country? = nil
    @State private var selectedGameLength: String = "medium"
    @State private var playerName: String = ""
    @State private var selectedParty: String = "Unity Coalition"
    @State private var selectedApproach: String = "Pragmatist"

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                SetupProgressBar(currentStep: step, totalSteps: 4)

                Group {
                    if step == 1 {
                        CountrySelectionView(gameStore: gameStore, selectedCountry: $selectedCountry, step: $step)
                    } else if step == 2 {
                        PlayerIdentityView(
                            playerName: $playerName,
                            selectedParty: $selectedParty,
                            selectedApproach: $selectedApproach,
                            gameStore: gameStore,
                            step: $step
                        )
                    } else if step == 3 {
                        GameLengthSelectionView(selectedGameLength: $selectedGameLength, step: $step)
                    } else if step == 4 {
                        CabinetFormationView(gameStore: gameStore, selectedGameLength: selectedGameLength, step: $step)
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
}

// MARK: - Setup Progress Bar

struct SetupProgressBar: View {
    let currentStep: Int
    let totalSteps: Int

    private let stepLabels = ["NATION", "IDENTITY", "DURATION", "CABINET"]

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(1...totalSteps, id: \.self) { step in
                    HStack(spacing: 0) {
                        // Step dot
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

struct CountrySelectionView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var selectedCountry: Country?
    @Binding var step: Int

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 1 OF 3")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Select Nation")
                    .font(.system(size: 24, weight: .semibold, design: .default))
                    .foregroundColor(AppColors.foreground)
                Text("Choose the jurisdiction for your administration.")
                    .font(.system(size: 14, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 24)

            ScrollView {
                VStack(spacing: 0) {
                    if gameStore.availableCountries.isEmpty {
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(AppColors.foreground)
                            Text("Loading countries...")
                                .font(.system(size: 13, weight: .regular, design: .monospaced))
                                .foregroundColor(AppColors.foregroundMuted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 48)
                    } else {
                        ForEach(gameStore.availableCountries.sorted(by: { $0.name < $1.name }), id: \.id) { country in
                            Button(action: {
                                selectedCountry = country
                                gameStore.setCountry(country.id)
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(country.name)
                                            .font(.system(size: 16, weight: .medium, design: .default))
                                            .foregroundColor(AppColors.foreground)
                                        Text("GDP \(formatGDP(country.attributes.gdp))")
                                            .font(.system(size: 11, weight: .regular, design: .monospaced))
                                            .foregroundColor(AppColors.foregroundMuted)
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
                                .padding(.horizontal, 16)
                                .padding(.vertical, 16)
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
                }
            }

            Spacer()

            Button(action: {
                if selectedCountry != nil {
                    step = 2
                }
            }) {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold, design: .default))
                    .foregroundColor(AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(selectedCountry != nil ? AppColors.foreground : AppColors.foregroundSubtle)
            }
            .disabled(selectedCountry == nil)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private func formatGDP(_ gdp: Int) -> String {
        if gdp >= 1_000_000_000_000 {
            return String(format: "%.1fT", Double(gdp) / 1_000_000_000_000.0)
        } else if gdp >= 1_000_000_000 {
            return String(format: "%.1fB", Double(gdp) / 1_000_000_000.0)
        }
        return "\(gdp)"
    }
}

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
        LengthOption(id: "short",  code: "SHT-030", label: "Short Campaign", turns: "~30 Turns", realTime: "6–9 months in-game",    description: "Rapid crisis response. Every decision carries amplified weight with limited time for recovery."),
        LengthOption(id: "medium", code: "MED-060", label: "Standard Term",  turns: "~60 Turns", realTime: "1.5–2 years in-game",  description: "Balanced governance. Cascading effects develop meaningfully. The recommended starting point."),
        LengthOption(id: "long",   code: "LNG-120", label: "Full Mandate",   turns: "~120 Turns", realTime: "3–4 years in-game",   description: "Complete simulation. Entropy, feedback loops, and diplomatic shifts fully develop over an extended term."),
    ]

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 3 OF 4")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Campaign Duration")
                    .font(.system(size: 24, weight: .semibold, design: .default))
                    .foregroundColor(AppColors.foreground)
                Text("Define the operational timeframe for your administration.")
                    .font(.system(size: 14, weight: .regular, design: .default))
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
                                    .font(.system(size: 12, weight: .regular, design: .default))
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

            Button(action: { step = 4 }) {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold, design: .default))
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

struct CabinetFormationView: View {
    @ObservedObject var gameStore: GameStore
    let selectedGameLength: String
    @Binding var step: Int

    @State private var candidatesByRole: [String: [Candidate]] = [:]
    @State private var selections: [String: Candidate] = [:]
    @State private var isGenerating = true

    private var country: Country? {
        gameStore.availableCountries.first(where: { $0.id == gameStore.state.countryId })
    }

    private var totalCost: Int {
        selections.values.reduce(0) { $0 + ($1.cost ?? 0) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 4 OF 4")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Form Cabinet")
                    .font(.system(size: 24, weight: .semibold, design: .default))
                    .foregroundColor(AppColors.foreground)
                Text("Select your ministers. Each candidate brings different skills and approaches.")
                    .font(.system(size: 13, weight: .regular, design: .default))
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
                    Text("Generating candidates...")
                        .font(.system(size: 12, weight: .regular, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                }
                Spacer()
            } else {
                // Budget header
                HStack {
                    Text("TOTAL CABINET COST")
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(2)
                    Spacer()
                    Text("$\(totalCost)k")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(AppColors.accentPrimary)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 12)

                ScrollView {
                    VStack(spacing: 14) {
                        ForEach(CabinetRoles.DEFAULT_ROLES, id: \.id) { role in
                            RoleCandidateRow(
                                role: role,
                                candidates: candidatesByRole[role.id] ?? [],
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
                    .font(.system(size: 14, weight: .semibold, design: .default))
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

        DispatchQueue.global(qos: .userInitiated).async {
            var byRole: [String: [Candidate]] = [:]
            var sel: [String: Candidate] = [:]
            for role in CabinetRoles.DEFAULT_ROLES {
                let candidates = CandidateGenerator.generateMinisters(
                    roleId: role.id,
                    category: role.category,
                    region: region,
                    countryId: countryId,
                    count: 3,
                    config: config
                )
                byRole[role.id] = candidates
                if let first = candidates.first {
                    sel[role.id] = first
                }
            }
            DispatchQueue.main.async {
                self.candidatesByRole = byRole
                self.selections = sel
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

    private let parties: [(name: String, desc: String)] = [
        ("Unity Coalition",      "Centrist, pragmatic governance"),
        ("Progressive Front",    "Social reform and equality"),
        ("Conservative Bloc",    "Stability and tradition"),
        ("Technocratic Alliance","Data-driven policy making")
    ]

    private let approaches: [String] = ["Pragmatist", "Ideologue", "Technocrat"]

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("STEP 2 OF 4")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Executive Identity")
                    .font(.system(size: 24, weight: .semibold, design: .default))
                    .foregroundColor(AppColors.foreground)
                Text("Define who you are before you take office.")
                    .font(.system(size: 14, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 40)
            .padding(.bottom, 24)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Name
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

                    // Party
                    VStack(alignment: .leading, spacing: 8) {
                        Text("POLITICAL PARTY")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)

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

                    // Approach
                    VStack(alignment: .leading, spacing: 8) {
                        Text("GOVERNING STYLE")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)

                        HStack(spacing: 8) {
                            ForEach(approaches, id: \.self) { approach in
                                let isSelected = selectedApproach == approach
                                Button {
                                    HapticEngine.shared.light()
                                    withAnimation(AppMotion.quickSnap) {
                                        selectedApproach = approach
                                    }
                                } label: {
                                    Text(approach.uppercased())
                                        .font(AppTypography.micro)
                                        .foregroundColor(isSelected ? AppColors.background : AppColors.foregroundMuted)
                                        .tracking(1)
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 14)
                                        .background(isSelected ? AppColors.accentPrimary : AppColors.backgroundMuted)
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 24)
            }

            Spacer()

            Button {
                guard !playerName.isEmpty else { return }
                gameStore.setPlayer(name: playerName, party: selectedParty, approach: selectedApproach)
                step = 3
            } label: {
                Text("CONTINUE")
                    .font(.system(size: 14, weight: .semibold, design: .default))
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

// MARK: - RoleCandidateRow

struct RoleCandidateRow: View {
    let role: Role
    let candidates: [Candidate]
    @Binding var selection: Candidate?

    private func categoryColor(_ category: String) -> Color {
        switch category {
        case "Executive":    return AppColors.accentPrimary
        case "Diplomacy":    return Color.blue
        case "Defense":      return AppColors.accentSecondary
        case "Economy":      return Color.green
        case "Justice":      return Color.purple
        case "Health":       return Color.teal
        case "Commerce":     return Color.orange
        case "Labor":        return Color.yellow
        default:             return AppColors.foregroundMuted
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Role header
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

            // Candidate horizontal scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(candidates) { candidate in
                        CandidateSelectionCard(
                            candidate: candidate,
                            isSelected: selection?.id == candidate.id
                        ) {
                            selection = candidate
                        }
                    }
                }
            }
        }
    }
}

// MARK: - CandidateSelectionCard

struct CandidateSelectionCard: View {
    let candidate: Candidate
    let isSelected: Bool
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
                    .font(.system(size: 12, weight: .semibold, design: .default))
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

                // Two key stat bars
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
