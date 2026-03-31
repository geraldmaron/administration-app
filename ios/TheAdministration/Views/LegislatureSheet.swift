import SwiftUI

struct LegislatureSheet: View {
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                if let legislature = gameStore.state.legislatureState {
                    ScrollView {
                        VStack(spacing: 20) {
                            headerCard(legislature)
                            compositionSection(legislature)
                            if !legislature.notableMembers.isEmpty {
                                notableMembersSection(legislature.notableMembers, composition: legislature.composition)
                            }
                            electionInfoSection(legislature)
                        }
                        .padding(20)
                        .padding(.bottom, 12)
                    }
                } else {
                    placeholderView
                }
            }
            .navigationTitle("Legislature")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(AppColors.accentPrimary)
                }
            }
        }
    }

    // MARK: - Header Card

    private func headerCard(_ legislature: LegislatureState) -> some View {
        HStack(alignment: .center, spacing: 20) {
            VStack(alignment: .leading, spacing: 4) {
                Text("APPROVAL OF PLAYER")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1.5)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(legislature.approvalOfPlayer)")
                        .font(AppTypography.dataLarge)
                        .foregroundColor(AppColors.metricColor(for: CGFloat(legislature.approvalOfPlayer)))
                        .monospacedDigit()
                    Text("/ 100")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            Spacer()
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .stroke(AppColors.border, lineWidth: 6)
                        .frame(width: 72, height: 72)
                    Circle()
                        .trim(from: 0, to: CGFloat(legislature.gridlockLevel) / 100)
                        .stroke(AppColors.gridlockColor(for: legislature.gridlockLevel), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 72, height: 72)
                        .rotationEffect(.degrees(-90))
                    Text("\(legislature.gridlockLevel)%")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundColor(AppColors.gridlockColor(for: legislature.gridlockLevel))
                }
                Text("GRIDLOCK")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1.5)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Legislature approval of player: \(legislature.approvalOfPlayer) percent. Gridlock level: \(legislature.gridlockLevel) percent.")
    }

    // MARK: - Composition

    private func compositionSection(_ legislature: LegislatureState) -> some View {
        sectionCard(label: "COMPOSITION") {
            VStack(alignment: .leading, spacing: 16) {
                let chambers = orderedChambers(legislature.composition)
                ForEach(chambers, id: \.self) { chamber in
                    let blocs = legislature.composition.filter { $0.chamber == chamber }
                    VStack(alignment: .leading, spacing: 10) {
                        if chambers.count > 1 {
                            Text(chamberLabel(chamber).uppercased())
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(1.5)
                        }
                        seatShareBar(blocs, allBlocs: legislature.composition)
                        VStack(spacing: 10) {
                            ForEach(Array(blocs.enumerated()), id: \.element.id) { index, bloc in
                                blocRow(bloc, globalIndex: globalIndex(of: bloc, in: legislature.composition))
                                if index < blocs.count - 1 {
                                    Divider().background(AppColors.border)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func seatShareBar(_ blocs: [LegislativeBloc], allBlocs: [LegislativeBloc]) -> some View {
        GeometryReader { geo in
            HStack(spacing: 2) {
                ForEach(blocs) { bloc in
                    let width = max(4, geo.size.width * CGFloat(bloc.seatShare) - 2)
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(blocColor(bloc, globalIndex: globalIndex(of: bloc, in: allBlocs)))
                        .frame(width: width)
                }
            }
        }
        .frame(height: 10)
        .accessibilityHidden(true)
    }

    private func blocRow(_ bloc: LegislativeBloc, globalIndex: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Circle()
                    .fill(blocColor(bloc, globalIndex: globalIndex))
                    .frame(width: 8, height: 8)
                Text(bloc.partyName)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.foreground)
                    .lineLimit(1)
                if bloc.isRulingCoalition {
                    Text("RULING")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(AppColors.success)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 3, style: .continuous)
                                .fill(AppColors.success.opacity(0.12))
                        )
                }
                Spacer()
                Text("\(Int(bloc.seatShare * 100))%")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("APPROVAL")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(1)
                    Spacer()
                    Text("\(bloc.approvalOfPlayer)%")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .foregroundColor(AppColors.metricColor(for: CGFloat(bloc.approvalOfPlayer)))
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(AppColors.border)
                        Rectangle()
                            .fill(AppColors.metricColor(for: CGFloat(bloc.approvalOfPlayer)))
                            .frame(width: geo.size.width * (CGFloat(bloc.approvalOfPlayer) / 100))
                    }
                    .clipShape(Capsule())
                }
                .frame(height: 4)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(bloc.partyName). Seat share: \(Int(bloc.seatShare * 100)) percent. Approval of player: \(bloc.approvalOfPlayer) percent.\(bloc.isRulingCoalition ? " Ruling coalition." : "")")
    }

    // MARK: - Notable Members

    private func notableMembersSection(_ members: [LegislativeMember], composition: [LegislativeBloc]) -> some View {
        sectionCard(label: "NOTABLE MEMBERS") {
            VStack(spacing: 0) {
                ForEach(Array(members.enumerated()), id: \.element.id) { index, member in
                    memberRow(member, composition: composition)
                    if index < members.count - 1 {
                        Divider()
                            .background(AppColors.border)
                            .padding(.vertical, 8)
                    }
                }
            }
        }
    }

    private func memberRow(_ member: LegislativeMember, composition: [LegislativeBloc]) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(member.name)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.foreground)
                HStack(spacing: 6) {
                    Text(member.title)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundMuted)
                    if let sub = member.subdivision, !sub.isEmpty {
                        Text("·")
                            .foregroundColor(AppColors.foregroundSubtle)
                            .font(AppTypography.caption)
                        Text(sub)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.foregroundSubtle)
                    }
                }
                Text(chamberLabel(member.chamber))
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("IDEOLOGY")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                ideologyDots(member.stats.ideology)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(member.name), \(member.title). Chamber: \(chamberLabel(member.chamber)). Ideology: \(member.stats.ideology) out of 10.")
    }

    private func ideologyDots(_ level: Int) -> some View {
        HStack(spacing: 3) {
            ForEach(1...10, id: \.self) { i in
                Circle()
                    .fill(i <= level ? AppColors.accentPrimary : AppColors.border)
                    .frame(width: 5, height: 5)
            }
        }
    }

    // MARK: - Election Info

    private func electionInfoSection(_ legislature: LegislatureState) -> some View {
        sectionCard(label: "ELECTION TIMELINE") {
            VStack(spacing: 14) {
                HStack(spacing: 0) {
                    electionStat(label: "LAST ELECTION", value: "TURN \(legislature.lastElectionTurn)")
                    Spacer()
                    Divider()
                        .background(AppColors.border)
                        .frame(height: 36)
                    Spacer()
                    electionStat(label: "NEXT ELECTION", value: "TURN \(legislature.nextElectionTurn)", alignment: .trailing)
                }
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("GRIDLOCK LEVEL")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1.5)
                        Spacer()
                        Text("\(legislature.gridlockLevel)%")
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundColor(AppColors.gridlockColor(for: legislature.gridlockLevel))
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle().fill(AppColors.border)
                            Rectangle()
                                .fill(AppColors.gridlockColor(for: legislature.gridlockLevel))
                                .frame(width: geo.size.width * (CGFloat(legislature.gridlockLevel) / 100))
                        }
                        .clipShape(Capsule())
                    }
                    .frame(height: 6)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Gridlock level: \(legislature.gridlockLevel) percent")
            }
        }
    }

    private func electionStat(label: String, value: String, alignment: HorizontalAlignment = .leading) -> some View {
        VStack(alignment: alignment, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .black))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(1.5)
            Text(value)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foreground)
                .monospacedDigit()
        }
    }

    // MARK: - Placeholder

    private var placeholderView: some View {
        VStack(spacing: 12) {
            Image(systemName: "building.columns")
                .font(.system(size: 40))
                .foregroundColor(AppColors.foregroundSubtle)
            Text("No legislature data available")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foregroundMuted)
            Text("Legislature data loads after country selection.")
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foregroundSubtle)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("No legislature data available. Legislature data loads after country selection.")
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
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    // MARK: - Helpers

    private func blocColor(_ bloc: LegislativeBloc, globalIndex: Int) -> Color {
        if bloc.isRulingCoalition { return AppColors.accentPrimary }
        let palette: [Color] = [AppColors.error, AppColors.warning, AppColors.info, AppColors.accentSecondary]
        return palette[globalIndex % palette.count]
    }

    private func globalIndex(of bloc: LegislativeBloc, in blocs: [LegislativeBloc]) -> Int {
        blocs.firstIndex(where: { $0.id == bloc.id }) ?? 0
    }

    private func orderedChambers(_ blocs: [LegislativeBloc]) -> [String] {
        let order = ["upper": 0, "lower": 1, "single": 0]
        var seen: [String] = []
        for bloc in blocs where !seen.contains(bloc.chamber) { seen.append(bloc.chamber) }
        return seen.sorted { (order[$0] ?? 2) < (order[$1] ?? 2) }
    }

    private func chamberLabel(_ chamber: String) -> String {
        switch chamber {
        case "upper":  return "Upper House"
        case "lower":  return "Lower House"
        case "single": return "Chamber"
        default:       return chamber.capitalized
        }
    }
}
