/// CabinetView
/// Cabinet management screen. Shows all 13 ministry roles with person
/// silhouette portraits, competency stat bars, pulsing vacant positions,
/// animated political capital bar, and dramatic fire confirmation.
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

                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        spacing: 16
                    ) {
                        ForEach(Array(CabinetRoles.DEFAULT_ROLES.enumerated()), id: \.element.id) { index, role in
                            let member = gameStore.state.cabinet.first { $0.roleId == role.id }
                            CabinetCard(
                                role: role,
                                member: member,
                                onHire: { hiringRole = role },
                                onReplace: { replacingRole = role },
                                onFire: { fireConfirmRole = role },
                                onDossier: {
                                    if let candidate = member?.candidate {
                                        dossierRoleTitle = role.title
                                        dossierCandidate = candidate
                                    }
                                }
                            )
                            .staggerEntrance(index: index, offset: 14)
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
                Text("Remove \(member.name) from \(role.title)?")
            } else {
                Text("Remove this cabinet member?")
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenHeader(
                protocolLabel: "CABINET_COMMAND_LINK_V8",
                title: "CABINET",
                subtitle: "\(gameStore.state.cabinet.filter { !$0.isVacant }.count) of \(CabinetRoles.DEFAULT_ROLES.count) positions filled"
            )

            // Political capital bar
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("POLITICAL CAPITAL")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(2)
                    Spacer()
                    Text("\(gameStore.state.personnelSpent ?? 0) / \(gameStore.state.totalBudget ?? 0) PTS")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foreground)
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
    let onHire: () -> Void
    let onReplace: () -> Void
    let onFire: () -> Void
    let onDossier: () -> Void

    @State private var pulseVacant = false

    private var isFilled: Bool { member != nil && !(member?.isVacant ?? true) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Portrait + category
            HStack(alignment: .top) {
                PersonSilhouette(
                    name: member?.candidate?.name,
                    isFilled: isFilled,
                    size: 48
                )

                Spacer()

                Text(role.category.uppercased())
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(AppColors.backgroundMuted)
                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 0.5))
            }

            // Role + name
            VStack(alignment: .leading, spacing: 4) {
                Text(role.title.uppercased())
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)

                Text(isFilled ? (member?.name ?? "VACANT") : "VACANT")
                    .font(AppTypography.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(isFilled ? AppColors.foreground : AppColors.foregroundSubtle)
                    .italic(!isFilled)
            }

            // Competency bars (when filled)
            if isFilled, let stats = member?.candidate?.stats {
                MiniStatBars(stats: stats)
            }

            // Actions
            if isFilled {
                HStack(spacing: 6) {
                    Button("REPLACE") { onReplace() }
                        .buttonStyle(SecondaryButtonStyle())
                        .accessibilityLabel("Replace \(role.title)")

                    Button("FIRE") { onFire() }
                        .buttonStyle(DestructiveButtonStyle())
                        .accessibilityLabel("Dismiss \(member?.name ?? role.title)")

                    Button("FILE") { onDossier() }
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.info)
                        .tracking(1)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 6)
                        .background(AppColors.backgroundElevated)
                        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                        .accessibilityLabel("Open dossier for \(member?.name ?? role.title)")
                }
            } else {
                Button(action: onHire) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                        Text("APPOINT")
                            .font(AppTypography.micro)
                            .tracking(2)
                    }
                    .foregroundColor(AppColors.background)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(AppColors.success)
                    .accentGlow(color: AppColors.success, radius: 6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Hire for \(role.title)")
            }
        }
        .padding(16)
        .background(AppColors.backgroundMuted.opacity(isFilled ? 0.5 : 0.2))
        .overlay(
            Rectangle()
                .stroke(
                    isFilled ? AppColors.success.opacity(0.4) :
                    (pulseVacant ? AppColors.accentPrimary.opacity(0.5) : AppColors.border),
                    style: StrokeStyle(lineWidth: isFilled ? 2 : 1, dash: isFilled ? [] : [4, 4])
                )
        )
        .onAppear {
            if !isFilled {
                withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                    pulseVacant = true
                }
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
            Rectangle()
                .fill(isFilled ? AppColors.accentPrimary.opacity(0.15) : AppColors.backgroundElevated)
                .frame(width: size, height: size)
                .overlay(Rectangle().stroke(isFilled ? AppColors.accentPrimary.opacity(0.3) : AppColors.border, lineWidth: 1))

            if let name = name, isFilled {
                Text(name.prefix(2).uppercased())
                    .font(.system(size: size * 0.34, weight: .black, design: .monospaced))
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
                        Text(role.title.uppercased())
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
        candidates = CandidateGenerator.generateMinisters(
            roleId: role.id, category: role.category,
            region: country?.region, countryId: gameStore.state.countryId,
            count: 4, config: gameStore.appConfig
        )
    }
}

// MARK: - CandidateRow

struct CandidateRow: View {
    let candidate: Candidate
    let onSelect: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                PersonSilhouette(name: candidate.name, isFilled: true, size: 40)

                VStack(alignment: .leading, spacing: 3) {
                    Text(candidate.name)
                        .font(AppTypography.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppColors.foreground)
                    Text("\(candidate.party) · \(candidate.background)")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundMuted)
                        .lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(candidate.cost ?? 0)")
                        .font(AppTypography.caption)
                        .fontWeight(.black)
                        .foregroundColor(AppColors.accentPrimary)
                        .monospacedDigit()
                    Text("PTS")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                }
            }

            HStack(spacing: 6) {
                StatPill(label: "DIP", value: Int(candidate.stats.diplomacy))
                StatPill(label: "ECO", value: Int(candidate.stats.economics))
                StatPill(label: "MIL", value: Int(candidate.stats.military))
                StatPill(label: "MGT", value: Int(candidate.stats.management))
                StatPill(label: "INT", value: Int(candidate.stats.integrity))
            }

            Button(action: onSelect) {
                Text("SELECT CANDIDATE")
            }
            .buttonStyle(CommandButtonStyle())
        }
        .padding(16)
        .background(AppColors.backgroundMuted)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
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
