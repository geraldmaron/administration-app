/// QuickStartSheet
/// Three-step quick start flow: country selection, player identity, then skills.
import SwiftUI

struct QuickStartSheet: View {
    @ObservedObject var gameStore: GameStore
    @Binding var showWelcome: Bool
    @Environment(\.dismiss) private var dismiss

    @State private var step: Int = 1
    @State private var searchText: String = ""
    @State private var selectedCountry: Country? = nil
    @State private var name: String = ""
    @State private var party: String = ""
    @State private var approach: String = ""
    @State private var selectedSkills: Set<String> = []
    @State private var selectedGameLength: String = "medium"
    @State private var localParties: [PoliticalParty] = []
    @State private var isLoadingLocalParties: Bool = false

    private var filteredCountries: [Country] {
        let sorted = gameStore.availableCountries.sorted { $0.name < $1.name }
        if searchText.isEmpty { return sorted }
        return sorted.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var displayParties: [(name: String, desc: String)] {
        if !localParties.isEmpty {
            return localParties.map { ($0.name, $0.description) }
        }
        if let config = gameStore.appConfig {
            let names = config.parties(for: selectedCountry?.id)
            if !names.isEmpty {
                return names.map { ($0, "") }
            }
        }
        return []
    }

    private var approaches: [String] {
        let list = gameStore.appConfig?.governmentalApproaches ?? []
        return list.isEmpty ? ["Pragmatist"] : list
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Button(action: {
                        HapticEngine.shared.light()
                        if step == 1 {
                            dismiss()
                        } else {
                            withAnimation(AppMotion.standard) { step -= 1 }
                        }
                    }) {
                        Image(systemName: step == 1 ? "xmark" : "chevron.left")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(AppColors.foregroundMuted)
                            .frame(width: 36, height: 36)
                            .background(AppColors.backgroundMuted)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    Text(step == 1 ? "1 OF 4" : step == 2 ? "2 OF 4" : step == 3 ? "3 OF 4" : "4 OF 4")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(2)

                    Spacer()

                    Color.clear.frame(width: 36, height: 36)
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)

                if step == 1 {
                    countryStep
                        .transition(.asymmetric(
                            insertion: .move(edge: .leading).combined(with: .opacity),
                            removal: .move(edge: .trailing).combined(with: .opacity)
                        ))
                } else if step == 2 {
                    gameLengthStep
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                } else if step == 3 {
                    identityStep
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                } else {
                    skillsStep
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                }
            }
        }
        .presentationDetents([.large])
        .onAppear { randomizeIdentity() }
        .task(id: selectedCountry?.id) {
            guard let country = selectedCountry else { return }
            isLoadingLocalParties = true
            localParties = []
            let loaded = await FirebaseDataService.shared.getPoliticalParties(for: country.id)
            localParties = loaded
            isLoadingLocalParties = false
            if loaded.isEmpty {
                party = gameStore.appConfig?.parties(for: country.id).first ?? ""
            } else if party.isEmpty || !loaded.contains(where: { $0.name == party }) {
                party = loaded.first?.name ?? ""
            }
        }
    }

    // MARK: - Step 2 — Game Length

    private var gameLengthStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("CAMPAIGN DURATION")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("How long is your term?")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            ScrollView {
                VStack(spacing: 10) {
                    ForEach([
                        ("short",  "SHT-030", "Short Campaign",  "~30 Turns",  "Crisis Pace",    "Compressed decisions with amplified consequences. Limited recovery window — every turn carries outsized weight."),
                        ("medium", "MED-060", "Standard Term",   "~60 Turns",  "Standard Pace",  "Cascading effects develop meaningfully. Coalitions shift, feedback loops emerge. The recommended starting point."),
                        ("long",   "LNG-120", "Full Mandate",    "~120 Turns", "Full Pace",      "Every system has time to evolve or collapse. Long-term consequences, diplomatic drift, and domestic entropy fully unfold."),
                    ], id: \.0) { id, code, label, turns, pace, desc in
                        let isSelected = selectedGameLength == id
                        Button(action: { selectedGameLength = id }) {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text(code)
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
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(label.uppercased())
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foreground)
                                        .tracking(2)
                                    Text(turns)
                                        .font(.system(size: 22, weight: .black, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary : AppColors.foreground)
                                    Text(pace)
                                        .font(.system(size: 10, weight: .regular, design: .monospaced))
                                        .foregroundColor(isSelected ? AppColors.accentPrimary.opacity(0.7) : AppColors.foregroundMuted)
                                }
                                Text(desc)
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundColor(isSelected ? AppColors.foreground.opacity(0.8) : AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(isSelected ? AppColors.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
                            .overlay(Rectangle().stroke(isSelected ? AppColors.accentPrimary : AppColors.border, lineWidth: isSelected ? 1 : 0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
            }

            Spacer()

            Button(action: {
                HapticEngine.shared.medium()
                withAnimation(AppMotion.standard) { step = 3 }
            }) {
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

    // MARK: - Step 1 — Country Selection

    private var countryStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("SELECT NATION")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Quick Start")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
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
                                        Text(country.region ?? "")
                                            .font(AppTypography.micro)
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
                                .padding(.vertical, 14)
                                .background(selectedCountry?.id == country.id ? AppColors.backgroundElevated : Color.clear)
                                .contentShape(Rectangle())
                                .overlay(
                                    Rectangle()
                                        .frame(height: 1)
                                        .foregroundColor(AppColors.backgroundElevated),
                                    alignment: .bottom
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
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

    // MARK: - Step 2 — Player Identity

    private var identityStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("WHO ARE YOU?")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                if let country = selectedCountry {
                    HStack(spacing: 8) {
                        Text(country.flagEmoji)
                            .font(.system(size: 22))
                        Text(country.name)
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundColor(AppColors.foreground)
                    }
                } else {
                    Text("Quick Start")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 24)

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("HEAD OF GOVERNMENT")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        TextField("ENTER NAME", text: $name)
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.foreground)
                            .textFieldStyle(PlainTextFieldStyle())
                        Rectangle()
                            .fill(name.isEmpty ? AppColors.foregroundSubtle.opacity(0.4) : AppColors.accentPrimary)
                            .frame(height: 1)
                            .animation(AppMotion.quickSnap, value: name.isEmpty)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("POLITICAL PARTY")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)

                        if isLoadingLocalParties {
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
                                ForEach(displayParties, id: \.name) { p in
                                    Button {
                                        HapticEngine.shared.light()
                                        withAnimation(AppMotion.quickSnap) { party = p.name }
                                    } label: {
                                        HStack(spacing: 10) {
                                            Rectangle()
                                                .fill(party == p.name ? AppColors.accentPrimary : AppColors.border)
                                                .frame(width: 3, height: 32)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(p.name)
                                                    .font(AppTypography.bodySmall)
                                                    .foregroundColor(AppColors.foreground)
                                                if !p.desc.isEmpty {
                                                    Text(p.desc)
                                                        .font(AppTypography.micro)
                                                        .foregroundColor(AppColors.foregroundSubtle)
                                                }
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

                    VStack(alignment: .leading, spacing: 8) {
                        Text("GOVERNING STYLE")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(approaches, id: \.self) { a in
                                    let isSelected = approach == a
                                    Button {
                                        HapticEngine.shared.light()
                                        withAnimation(AppMotion.quickSnap) { approach = a }
                                    } label: {
                                        Text(a.uppercased())
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
                }
                .padding(.horizontal, 24)
            }

            HStack(spacing: 12) {
                Button(action: {
                    HapticEngine.shared.light()
                    randomizeIdentity()
                }) {
                    Text("Randomize")
                }
                .buttonStyle(SecondaryButtonStyle())

                Button(action: {
                    guard !name.isEmpty else { return }
                    HapticEngine.shared.medium()
                    withAnimation(AppMotion.standard) { step = 4 }
                }) {
                    Text("CONTINUE")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(!name.isEmpty ? AppColors.background : AppColors.foregroundSubtle)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(!name.isEmpty ? AppColors.foreground : AppColors.backgroundMuted)
                }
                .disabled(name.isEmpty)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: - Step 3 — Skills Selection

    private var skillsStep: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("YOUR SKILLS")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Text("Select up to 5")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 4)

            HStack {
                Text("\(selectedSkills.count) / 5 selected")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(1)
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
                                    .font(AppTypography.micro)
                                    .foregroundColor(isSelected ? AppColors.background : (canSelect ? AppColors.foreground : AppColors.foregroundSubtle))
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
                    let skills = PlayerSkillCatalogue.all.filter { selectedSkills.contains($0.id) }
                    let strengths = PlayerSkillCatalogue.generateStrengths(from: skills, approach: approach)
                    let weaknesses = PlayerSkillCatalogue.generateWeaknesses(from: skills, approach: approach)

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
                }
            }

            HStack(spacing: 12) {
                Button(action: {
                    HapticEngine.shared.light()
                    randomizeIdentity()
                }) {
                    Text("Randomize")
                }
                .buttonStyle(SecondaryButtonStyle())

                Button(action: {
                    guard !name.isEmpty else { return }
                    HapticEngine.shared.medium()
                    let skillObjects = PlayerSkillCatalogue.all.filter { selectedSkills.contains($0.id) }
                    let strengths = PlayerSkillCatalogue.generateStrengths(from: skillObjects, approach: approach)
                    let weaknesses = PlayerSkillCatalogue.generateWeaknesses(from: skillObjects, approach: approach)
                    gameStore.quickStart(name: name, party: party, approach: approach, skills: skillObjects, strengths: strengths, weaknesses: weaknesses, gameLength: selectedGameLength)
                    dismiss()
                    withAnimation(AppMotion.standard) { showWelcome = false }
                }) {
                    Text("Start Game")
                }
                .buttonStyle(CommandButtonStyle(isEnabled: !name.isEmpty))
                .disabled(name.isEmpty)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private func randomizeIdentity() {
        name = CandidateGenerator.pickName(region: selectedCountry?.region, config: gameStore.appConfig)
        party = displayParties.randomElement()?.name ?? ""
        approach = approaches.randomElement() ?? "Pragmatist"
        let shuffled = PlayerSkillCatalogue.all.shuffled()
        selectedSkills = Set(shuffled.prefix(3).map(\.id))
    }
}

