import SwiftUI

struct MilitarySheet: View {
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                if let mil = gameStore.countryMilitaryState {
                    ScrollView {
                        VStack(spacing: 20) {
                            overallReadinessCard(mil.overallReadiness)
                            if !mil.activeConflicts.isEmpty {
                                activeConflictsSection(mil.activeConflicts)
                            }
                            branchReadinessSection(mil.branches)
                            cyberProfileSection(mil.cyberProfile)
                            if let nuclear = mil.nuclearProfile {
                                nuclearProfileSection(nuclear)
                            }
                        }
                        .padding(20)
                        .padding(.bottom, 12)
                    }
                } else {
                    placeholderView
                }
            }
            .navigationTitle("Military Briefing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(AppColors.accentPrimary)
                }
            }
        }
    }

    // MARK: - Overall Readiness

    private func overallReadinessCard(_ value: Int) -> some View {
        HStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 4) {
                Text("OVERALL READINESS")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(2)
                Text("\(value)")
                    .font(AppTypography.dataLarge)
                    .foregroundColor(AppColors.metricColor(for: CGFloat(value)))
                    .monospacedDigit()
                Text("/ 100")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foregroundSubtle)
            }
            Spacer()
            ZStack {
                Circle()
                    .stroke(AppColors.border, lineWidth: 6)
                    .frame(width: 80, height: 80)
                Circle()
                    .trim(from: 0, to: CGFloat(value) / 100)
                    .stroke(AppColors.metricColor(for: CGFloat(value)), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(-90))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Overall military readiness: \(value) out of 100")
    }

    // MARK: - Active Conflicts

    private func activeConflictsSection(_ conflicts: [String]) -> some View {
        sectionCard(label: "ACTIVE CONFLICTS") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(conflicts, id: \.self) { conflict in
                    HStack(spacing: 10) {
                        Circle()
                            .fill(AppColors.error)
                            .frame(width: 6, height: 6)
                        Text(conflict)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.foreground)
                    }
                    .accessibilityLabel("Active conflict: \(conflict)")
                }
            }
        }
    }

    // MARK: - Branch Readiness

    private func branchReadinessSection(_ branches: [MilitaryBranchData]) -> some View {
        sectionCard(label: "BRANCH READINESS") {
            VStack(spacing: 14) {
                ForEach(branches, id: \.tokenKey) { branch in
                    branchRow(branch)
                }
            }
        }
    }

    private func branchRow(_ branch: MilitaryBranchData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(branch.localName)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.foreground)
                    Text(branch.canonicalType.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                Spacer()
                Text("\(branch.readiness)")
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.metricColor(for: CGFloat(branch.readiness)))
                    .monospacedDigit()
            }
            readinessBar(value: branch.readiness)
            HStack(spacing: 16) {
                statPill(label: "PERSONNEL", value: "\(branch.size)k")
                statPill(label: "EQUIP", value: "\(branch.equipmentLevel)")
            }
        }
        .padding(.bottom, 6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(branch.localName), \(branch.canonicalType). Readiness: \(branch.readiness). Personnel: \(branch.size) thousand. Equipment level: \(branch.equipmentLevel).")
    }

    // MARK: - Cyber Profile

    private func cyberProfileSection(_ cyber: CyberCapabilityData) -> some View {
        sectionCard(label: "CYBER OPERATIONS") {
            VStack(spacing: 12) {
                capabilityBar(label: "READINESS", value: cyber.readiness)
                capabilityBar(label: "OFFENSIVE", value: cyber.offensiveCapability)
                capabilityBar(label: "DEFENSIVE", value: cyber.defensiveCapability)
                if cyber.hasApt, let groups = cyber.knownAptGroups, !groups.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Text("APT GROUPS")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1.5)
                            .frame(width: 80, alignment: .leading)
                        Text(groups.joined(separator: ", "))
                            .font(AppTypography.bodySmall)
                            .foregroundColor(AppColors.foregroundMuted)
                            .accessibilityLabel("Known APT groups: \(groups.joined(separator: ", "))")
                    }
                }
            }
        }
    }

    // MARK: - Nuclear Profile

    private func nuclearProfileSection(_ nuclear: NuclearCapabilityData) -> some View {
        sectionCard(label: "NUCLEAR PROFILE") {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("WARHEADS")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1.5)
                        Text("\(nuclear.warheads)")
                            .font(AppTypography.data)
                            .foregroundColor(AppColors.foreground)
                            .monospacedDigit()
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("TRIAD")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1.5)
                        Text(nuclear.triad ? "YES" : "NO")
                            .font(AppTypography.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(nuclear.triad ? AppColors.success : AppColors.foregroundMuted)
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("DOCTRINE")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(1.5)
                    Text(nuclear.doctrine)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.foreground)
                }
                if !nuclear.systems.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("DELIVERY SYSTEMS")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1.5)
                        FlowLayout(spacing: 6) {
                            ForEach(nuclear.systems, id: \.self) { system in
                                Text(system)
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        Capsule().fill(AppColors.backgroundMuted)
                                    )
                            }
                        }
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Nuclear profile: \(nuclear.warheads) warheads. Triad: \(nuclear.triad ? "yes" : "no"). Doctrine: \(nuclear.doctrine).")
    }

    // MARK: - Placeholder

    private var placeholderView: some View {
        VStack(spacing: 12) {
            Image(systemName: "shield.slash")
                .font(.system(size: 40))
                .foregroundColor(AppColors.foregroundSubtle)
            Text("No military data available")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foregroundMuted)
            Text("Military data loads after country selection.")
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foregroundSubtle)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("No military data available. Military data loads after country selection.")
    }

    // MARK: - Shared Building Blocks

    private func sectionCard<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(label)
                .font(.system(size: 10, weight: .black))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)
            content()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    private func readinessBar(value: Int) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(AppColors.border)
                Rectangle()
                    .fill(AppColors.metricColor(for: CGFloat(value)))
                    .frame(width: geo.size.width * (CGFloat(value) / 100))
            }
            .clipShape(Capsule())
        }
        .frame(height: 4)
    }

    private func capabilityBar(label: String, value: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1.5)
                Spacer()
                Text("\(value)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.metricColor(for: CGFloat(value)))
                    .monospacedDigit()
            }
            readinessBar(value: value)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value) out of 100")
    }

    private func statPill(label: String, value: String) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .black))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(1)
            Text(value)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundMuted)
        )
    }
}

// MARK: - FlowLayout (tag-cloud wrapping layout)

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? 0
        var height: CGFloat = 0
        var rowX: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > maxWidth, rowX > 0 {
                height += rowHeight + spacing
                rowX = 0
                rowHeight = 0
            }
            rowX += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        height += rowHeight
        return CGSize(width: maxWidth, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var rowX: CGFloat = bounds.minX
        var rowY: CGFloat = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > bounds.maxX, rowX > bounds.minX {
                rowY += rowHeight + spacing
                rowX = bounds.minX
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: rowX, y: rowY), proposal: ProposedViewSize(size))
            rowX += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
