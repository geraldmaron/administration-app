import SwiftUI

struct CabinetView: View {
    @ObservedObject var gameStore: GameStore
    @State private var hiringRole: Role? = nil
    @State private var replacingRole: Role? = nil
    @State private var fireConfirmRole: Role? = nil
    @State private var dossierCandidate: Candidate? = nil
    @State private var dossierRoleTitle: String? = nil

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    headerSection

                    VStack(spacing: 12) {
                        if let player = gameStore.state.player {
                            Button {
                                HapticEngine.shared.light()
                                dossierRoleTitle = gameStore.playerCountry?.leaderTitle ?? "President"
                                dossierCandidate = candidateFromPlayer(player)
                            } label: {
                                PlayerLeaderCard(
                                    player: player,
                                    country: gameStore.playerCountry
                                )
                            }
                            .buttonStyle(.plain)
                        }

                        ForEach(Array(CabinetRoles.DEFAULT_ROLES.enumerated()), id: \.element.id) { index, role in
                            let member = gameStore.state.cabinet.first { $0.roleId == role.id }
                            CabinetCard(
                                role: role,
                                member: member,
                                country: gameStore.playerCountry,
                                onHire: { hiringRole = role },
                                onReplace: { replacingRole = role },
                                onFire: { fireConfirmRole = role },
                                onDossier: {
                                    if let member = member, !member.isVacant {
                                        dossierRoleTitle = CabinetRoles.title(for: role.id, country: gameStore.playerCountry)
                                        dossierCandidate = member.candidate ?? minimalCandidate(from: member)
                                    }
                                }
                            )
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, AppSpacing.tabBarClearance)
            }
        }
        .sheet(item: $hiringRole) { role in
            CandidateSelectionSheet(
                role: role, gameStore: gameStore, isReplacing: false,
                onSelect: { gameStore.hireCabinetMember(roleId: role.id, candidate: $0); hiringRole = nil },
                onDismiss: { hiringRole = nil }
            )
        }
        .sheet(item: $replacingRole) { role in
            CandidateSelectionSheet(
                role: role, gameStore: gameStore, isReplacing: true,
                onSelect: { gameStore.hireCabinetMember(roleId: role.id, candidate: $0); replacingRole = nil },
                onDismiss: { replacingRole = nil }
            )
        }
        .sheet(item: $dossierCandidate) { candidate in
            PersonDossierView(candidate: candidate, roleTitle: dossierRoleTitle)
        }
        .alert("Confirm Dismissal", isPresented: Binding(
            get: { fireConfirmRole != nil },
            set: { if !$0 { fireConfirmRole = nil } }
        )) {
            Button("Dismiss", role: .destructive) {
                if let role = fireConfirmRole { gameStore.fireCabinetMember(roleId: role.id) }
                fireConfirmRole = nil
                HapticEngine.shared.heavy()
            }
            Button("Cancel", role: .cancel) { fireConfirmRole = nil }
        } message: {
            if let role = fireConfirmRole,
               let member = gameStore.state.cabinet.first(where: { $0.roleId == role.id }) {
                Text("Remove \(member.name) from \(CabinetRoles.title(for: role.id, country: gameStore.playerCountry))?")
            } else {
                Text("Remove this cabinet member?")
            }
        }
    }

    private func candidateFromPlayer(_ player: PlayerProfile) -> Candidate {
        let stats = player.stats ?? PlayerStats(diplomacy: 50, economics: 50, military: 50, management: 50, compassion: 50, integrity: 50)
        return Candidate(
            id: "player",
            name: player.name,
            party: player.party,
            background: player.background ?? "Head of State",
            education: "—",
            experience: "—",
            institution: nil,
            age: nil,
            yearsOfExperience: nil,
            stats: stats,
            traits: player.traits ?? [],
            analysisBullets: nil,
            strengths: player.strengths,
            weaknesses: player.weaknesses,
            degreeType: nil,
            degreeField: nil,
            skills: player.skills?.map { $0.name },
            careerHistory: nil,
            potentialScore: nil,
            cost: nil
        )
    }

    private func minimalCandidate(from member: CabinetMember) -> Candidate {
        Candidate(
            id: member.id,
            name: member.name,
            party: "—",
            background: "No profile available.",
            education: "—",
            experience: "—",
            institution: nil,
            age: nil,
            yearsOfExperience: nil,
            stats: PlayerStats(
                diplomacy: Double(member.skillLevel),
                economics: Double(member.skillLevel),
                military: Double(member.skillLevel),
                management: Double(member.skillLevel),
                compassion: Double(member.skillLevel),
                integrity: Double(member.skillLevel)
            ),
            traits: [],
            analysisBullets: nil,
            strengths: nil,
            weaknesses: nil,
            degreeType: nil,
            degreeField: nil,
            skills: nil,
            careerHistory: nil,
            potentialScore: nil,
            cost: member.cost
        )
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenHeader(
                protocolLabel: "CABINET_COMMAND_LINK_V8",
                title: "Cabinet",
                subtitle: "\(gameStore.state.cabinet.filter { !$0.isVacant }.count) of \(CabinetRoles.DEFAULT_ROLES.count) positions filled"
            )

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Political Capital")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundMuted)
                    Spacer()
                    Text("\(gameStore.state.personnelSpent ?? 0) / \(gameStore.state.totalBudget ?? 0)")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundMuted)
                        .monospacedDigit()
                }

                GeometryReader { geo in
                    let ratio = Double(gameStore.state.personnelSpent ?? 0) / Double(max(1, gameStore.state.totalBudget ?? 1))
                    let barColor = ratio > 0.9 ? AppColors.error : ratio > 0.7 ? AppColors.warning : AppColors.success
                    ZStack(alignment: .leading) {
                        Rectangle().fill(AppColors.backgroundMuted)
                        Rectangle()
                            .fill(barColor)
                            .frame(width: min(geo.size.width, geo.size.width * CGFloat(ratio)))
                            .animation(AppMotion.standard, value: ratio)
                    }
                }
                .frame(height: 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - CabinetCard

struct CabinetCard: View {
    let role: Role
    let member: CabinetMember?
    let country: Country?
    let onHire: () -> Void
    let onReplace: () -> Void
    let onFire: () -> Void
    let onDossier: () -> Void

    private var isFilled: Bool { member != nil && !(member?.isVacant ?? true) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 12) {
                PersonSilhouette(name: member?.candidate?.name, isFilled: isFilled, size: 48)

                VStack(alignment: .leading, spacing: 3) {
                    Text(role.category.uppercased())
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                    Text(CabinetRoles.title(for: role.id, country: country))
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundMuted)
                        .lineLimit(1)
                    Text(isFilled ? (member?.name ?? "Vacant") : "Vacant")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(isFilled ? AppColors.foreground : AppColors.foregroundSubtle)
                        .italic(!isFilled)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if isFilled, let stats = member?.candidate?.stats {
                    let overall = (stats.diplomacy + stats.economics + stats.military + stats.management + stats.integrity) / 5
                    let color = AppColors.metricColor(for: CGFloat(overall))
                    VStack(spacing: 2) {
                        Text("\(Int(overall))")
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                            .foregroundColor(color)
                        Text("OVR")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(color.opacity(0.7))
                            .tracking(2)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }

            if isFilled, let stats = member?.candidate?.stats {
                MiniStatBars(stats: stats)
            }

            if isFilled {
                HStack(spacing: 8) {
                    Button(action: onDossier) {
                        HStack(spacing: 5) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 11, weight: .medium))
                            Text("File")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(AppColors.accentPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(AppColors.accentPrimary.opacity(0.10), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open dossier for \(member?.name ?? role.title)")

                    Button(action: onReplace) {
                        HStack(spacing: 5) {
                            Image(systemName: "arrow.left.arrow.right")
                                .font(.system(size: 11, weight: .medium))
                            Text("Replace")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(AppColors.foreground.opacity(0.75))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Replace \(role.title)")

                    Button(action: onFire) {
                        HStack(spacing: 5) {
                            Image(systemName: "xmark")
                                .font(.system(size: 11, weight: .medium))
                            Text("Dismiss")
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(AppColors.error)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(AppColors.error.opacity(0.10), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Dismiss \(member?.name ?? role.title)")
                }
            } else {
                Button(action: onHire) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .semibold))
                        Text("Appoint")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(AppColors.accentPrimary, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Appoint to \(role.title)")
            }
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(isFilled ? 0.05 : 0.03))
        )
        .overlay {
            if !isFilled {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                    .foregroundColor(AppColors.border)
            }
        }
    }
}

// MARK: - PersonSilhouette

struct PersonSilhouette: View {
    let name: String?
    let isFilled: Bool
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .fill(isFilled ? AppColors.accentPrimary.opacity(0.15) : AppColors.backgroundElevated)
                .frame(width: size, height: size)

            if let name = name, isFilled {
                Text(name.prefix(2).uppercased())
                    .font(.system(size: size * 0.34, weight: .semibold))
                    .foregroundColor(AppColors.accentPrimary)
            } else {
                Image(systemName: "person.fill")
                    .font(.system(size: size * 0.45, weight: .light))
                    .foregroundColor(AppColors.foregroundSubtle)
            }
        }
    }
}

// MARK: - MiniStatBars

struct MiniStatBars: View {
    let stats: PlayerStats

    private var pairs: [(label: String, value: Double)] {
        [
            ("INT", Double(stats.integrity)),
            ("DIP", Double(stats.diplomacy)),
            ("ECO", Double(stats.economics)),
            ("MIL", Double(stats.military)),
            ("MGT", Double(stats.management))
        ]
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(pairs, id: \.label) { pair in
                VStack(spacing: 3) {
                    GeometryReader { geo in
                        ZStack(alignment: .bottom) {
                            Rectangle().fill(AppColors.border)
                            Rectangle()
                                .fill(AppColors.metricColor(for: pair.value))
                                .frame(height: geo.size.height * CGFloat(pair.value / 100))
                        }
                    }
                    .frame(height: 20)

                    Text(pair.label)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - CandidateSelectionSheet

struct CandidateSelectionSheet: View {
    let role: Role
    @ObservedObject var gameStore: GameStore
    let isReplacing: Bool
    let onSelect: (Candidate) -> Void
    let onDismiss: () -> Void

    @State private var candidates: [Candidate] = []

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(isReplacing ? "REPLACE" : "APPOINT")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.accentPrimary)
                            .tracking(3)
                        Text(CabinetRoles.title(for: role.id, country: gameStore.playerCountry).uppercased())
                            .font(AppTypography.title)
                            .foregroundColor(AppColors.foreground)
                    }
                    Spacer()
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    .accessibilityLabel("Close")
                }
                .padding(20)
                .background(AppColors.backgroundMuted)

                Rectangle().fill(AppColors.border).frame(height: 1)

                if candidates.isEmpty {
                    VStack(spacing: 12) {
                        ProgressView().tint(AppColors.accentPrimary)
                        Text("Loading candidates...")
                            .font(AppTypography.label)
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(Array(candidates.enumerated()), id: \.element.id) { index, candidate in
                                CandidateRow(candidate: candidate, onSelect: { onSelect(candidate) })
                                    .staggerEntrance(index: index)
                            }
                        }
                        .padding(16)
                    }
                }
            }
        }
        .onAppear { generateCandidates() }
    }

    private func generateCandidates() {
        let country = gameStore.availableCountries.first { $0.id == gameStore.state.countryId }
        let partyNames = gameStore.countryParties.isEmpty ? nil : gameStore.countryParties.map { $0.name }
        candidates = CandidateGenerator.generateMinisters(
            roleId: role.id, category: role.category,
            region: country?.region, countryId: gameStore.state.countryId,
            count: 4, config: gameStore.appConfig, partyNames: partyNames
        )
    }
}

// MARK: - CandidateRow

struct CandidateRow: View {
    let candidate: Candidate
    let onSelect: () -> Void

    private var suitabilityScore: Double {
        (candidate.stats.diplomacy + candidate.stats.economics + candidate.stats.military +
         candidate.stats.management + candidate.stats.integrity) / 5
    }
    private var suitabilityColor: Color { AppColors.metricColor(for: CGFloat(suitabilityScore)) }
    private var strongestStatLabel: String {
        let pairs: [(String, Double)] = [
            ("DIP", candidate.stats.diplomacy),
            ("ECO", candidate.stats.economics),
            ("MIL", candidate.stats.military),
            ("MGT", candidate.stats.management),
            ("INT", candidate.stats.integrity)
        ]
        return pairs.max(by: { $0.1 < $1.1 })?.0 ?? "—"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                PersonSilhouette(name: candidate.name, isFilled: true, size: 44)

                VStack(alignment: .leading, spacing: 3) {
                    Text(candidate.name)
                        .font(AppTypography.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.foreground)
                    Text(candidate.party)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foreground.opacity(0.55))
                    Text(candidate.background)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("SUITABILITY")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                    Text("\(Int(suitabilityScore))")
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                        .foregroundColor(suitabilityColor)
                    Text("PTS")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                    Text("\(candidate.cost ?? 0)")
                        .font(AppTypography.caption)
                        .fontWeight(.bold)
                        .foregroundColor(AppColors.accentPrimary)
                        .monospacedDigit()
                }
            }

            Rectangle()
                .fill(AppColors.border)
                .frame(height: 1)

            HStack(spacing: 6) {
                StatPill(label: "DIP", value: Int(candidate.stats.diplomacy))
                StatPill(label: "ECO", value: Int(candidate.stats.economics))
                StatPill(label: "MIL", value: Int(candidate.stats.military))
                StatPill(label: "MGT", value: Int(candidate.stats.management))
                StatPill(label: "INT", value: Int(candidate.stats.integrity))
            }

            HStack {
                HStack(spacing: 8) {
                    Rectangle()
                        .fill(suitabilityColor)
                        .frame(width: 2, height: 20)
                    Text("Strongest: \(strongestStatLabel)")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }

                Spacer()

                Button(action: onSelect) {
                    HStack(spacing: 6) {
                        Text("Appoint")
                            .font(.system(size: 13, weight: .semibold))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(suitabilityColor)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(suitabilityColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .background(AppColors.backgroundElevated, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(AppColors.border, lineWidth: 1)
        }
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(suitabilityColor)
                .frame(width: 3)
                .clipShape(
                    UnevenRoundedRectangle(topLeadingRadius: 12, bottomLeadingRadius: 12)
                )
        }
    }
}

// MARK: - StatPill

struct StatPill: View {
    let label: String
    let value: Int

    private var color: Color {
        if value >= 75 { return AppColors.success }
        if value >= 50 { return AppColors.foreground }
        return AppColors.error.opacity(0.8)
    }

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(AppTypography.caption)
                .fontWeight(.black)
                .foregroundColor(color)
                .monospacedDigit()
            Text(label)
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
    }
}

// MARK: - Player Leader Card

struct PlayerLeaderCard: View {
    let player: PlayerProfile
    let country: Country?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(AppColors.accentPrimary.opacity(0.15))
                        .frame(width: 48, height: 48)
                    if let emoji = country?.flagEmoji {
                        Text(emoji)
                            .font(.system(size: 22))
                    } else {
                        Image(systemName: "star.fill")
                            .font(.system(size: 18))
                            .foregroundColor(AppColors.accentPrimary)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text("HEAD OF STATE")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.accentPrimary)
                        .tracking(2)
                    Text(country?.leaderTitle ?? "President")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundMuted)
                    Text(player.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(spacing: 2) {
                    Text(player.party)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(AppColors.foregroundMuted)
                    Text(player.approach)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }

            if let stats = player.stats {
                MiniStatBars(stats: stats)
            }
        }
        .padding(AppSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.accentPrimary.opacity(0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(AppColors.accentPrimary.opacity(0.2), lineWidth: 1)
        )
    }
}
