import SwiftUI

struct ArchiveView: View {
    @ObservedObject var gameStore: GameStore
    @State private var searchText = ""
    @State private var selectedTurn: TurnRecord? = nil

    private var records: [TurnRecord] {
        let all = gameStore.state.archive
        if searchText.isEmpty { return all }
        let lower = searchText.lowercased()
        return all.filter {
            $0.scenarioTitle.lowercased().contains(lower) ||
            $0.decisionLabel.lowercased().contains(lower)
        }
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            VStack(spacing: 0) {
                header
                searchBar
                if records.isEmpty {
                    emptyState
                } else {
                    recordList
                }
            }
        }
        .sheet(item: $selectedTurn) { turn in
            TurnDetailSheet(turn: turn)
        }
    }

    // MARK: - Header
    private var header: some View {
        ScreenHeader(
            protocolLabel: "DECISION_ARCHIVE_LINK_V8",
            title: "Archive",
            subtitle: "\(gameStore.state.archive.count) recorded decision\(gameStore.state.archive.count == 1 ? "" : "s")"
        )
        .padding(.horizontal, 16)
        .accessibilityLabel("Decision archive. \(gameStore.state.archive.count) records.")
    }

    // MARK: - Search
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.foregroundSubtle)
                .font(.system(size: 14))
            TextField("Search decisions…", text: $searchText)
                .font(AppTypography.body)
                .foregroundColor(AppColors.foreground)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .accessibilityLabel("Search decisions")
    }

    // MARK: - Record List
    private var recordList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(records.reversed().enumerated()), id: \.element.id) { index, turn in
                    ArchiveCard(turn: turn, action: { selectedTurn = turn })
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, AppSpacing.tabBarClearance)
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.badge.questionmark")
                .font(.system(size: 40))
                .foregroundColor(AppColors.foregroundSubtle)
            Text("No decisions recorded yet.")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(AppColors.foregroundMuted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 80)
        .accessibilityLabel("No decisions recorded yet")
    }
}

// MARK: - ArchiveCard
struct ArchiveCard: View {
    let turn: TurnRecord
    let action: () -> Void

    private var outcomeColor: Color {
        guard !turn.metricDeltas.isEmpty else { return AppColors.foregroundSubtle }
        let avg = turn.metricDeltas.map(\.delta).reduce(0, +) / Double(turn.metricDeltas.count)
        if avg > 2 { return AppColors.success }
        if avg > 0 { return AppColors.info }
        if avg < -2 { return AppColors.error }
        return AppColors.warning
    }

    var body: some View {
        Button(action: { HapticEngine.shared.light(); action() }) {
            rowContent
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Turn \(turn.turn): \(turn.scenarioTitle). Decision: \(turn.decisionLabel).")
        .accessibilityHint("Tap for full details")
    }

    private var rowContent: some View {
        HStack(alignment: .top, spacing: 0) {
            timelineColumn
            contentColumn
        }
    }

    private var timelineColumn: some View {
        VStack(spacing: 0) {
            Rectangle().fill(AppColors.border).frame(width: 1).frame(maxHeight: .infinity)
            ZStack {
                Circle().fill(outcomeColor.opacity(0.2)).frame(width: 14, height: 14)
                Circle().stroke(outcomeColor, lineWidth: 1.5).frame(width: 14, height: 14)
            }
            Rectangle().fill(AppColors.border).frame(width: 1).frame(maxHeight: .infinity)
        }
        .frame(width: 32)
    }

    private var contentColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                Text("T\(turn.turn)")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .frame(width: 24)
                    .monospacedDigit()

                VStack(alignment: .leading, spacing: 5) {
                    Text(turn.scenarioTitle)
                        .font(AppTypography.caption)
                        .fontWeight(.bold)
                        .foregroundColor(AppColors.foreground)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(turn.decisionLabel)
                        .font(AppTypography.bodySmall)
                        .foregroundColor(AppColors.foregroundMuted)
                        .lineLimit(1)

                    deltaRow
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .padding(.top, 2)
            }
            .padding(.vertical, 14)
            .padding(.trailing, 14)
            .padding(.leading, 8)

            Rectangle().fill(AppColors.border).frame(height: 0.5)
        }
    }

    @ViewBuilder
    private var deltaRow: some View {
        if !turn.metricDeltas.isEmpty {
            HStack(spacing: 5) {
                ForEach(turn.metricDeltas.prefix(4)) { delta in
                    let color: Color = delta.delta > 0 ? AppColors.success : (delta.delta < 0 ? AppColors.error : AppColors.foregroundSubtle)
                    HStack(spacing: 2) {
                        Text(String(delta.name.prefix(3)))
                        Text(MetricFormatting.metricDeltaString(delta.delta))
                    }
                    .font(AppTypography.micro)
                    .foregroundColor(color)
                    .monospacedDigit()
                }
            }
        }
    }
}

// MARK: - TurnDetailSheet
struct TurnDetailSheet: View {
    let turn: TurnRecord
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Group {
                            HStack {
                                Text("Turn \(turn.turn)")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                    .monospacedDigit()
                                Spacer()
                                if let ts = turn.timestamp {
                                    Text(ts)
                                        .font(AppTypography.micro)
                                        .foregroundColor(AppColors.foregroundSubtle)
                                }
                            }
                            Text(turn.scenarioTitle)
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(AppColors.foreground)
                            Text("Decision: \(turn.decisionLabel)")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(AppColors.foregroundMuted)
                        }
                        Divider().background(AppColors.border)

                        if !turn.metricDeltas.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Metric Changes")
                                    .font(AppTypography.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                ForEach(turn.metricDeltas) { delta in
                                    HStack {
                                        Text(delta.name)
                                            .font(.system(size: 13))
                                            .foregroundColor(AppColors.foreground)
                                        Spacer()
                                        Text(MetricFormatting.metricDeltaString(delta.delta))
                                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                            .foregroundColor(delta.delta > 0 ? AppColors.success : (delta.delta < 0 ? AppColors.error : AppColors.foregroundSubtle))
                                    }
                                }
                            }
                            Divider().background(AppColors.border)
                        }

                        if !turn.cabinetFeedback.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Cabinet Response")
                                    .font(AppTypography.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                ForEach(turn.cabinetFeedback, id: \.memberName) { fb in
                                    HStack(alignment: .top, spacing: 8) {
                                        Circle()
                                            .fill(AppColors.border)
                                            .frame(width: 32, height: 32)
                                            .overlay(
                                                Text(fb.memberName.prefix(1))
                                                    .font(.system(size: 12, weight: .bold))
                                                    .foregroundColor(AppColors.foreground)
                                            )
                                        VStack(alignment: .leading, spacing: 2) {
                                            HStack {
                                                Text(fb.memberName)
                                                    .font(.system(size: 12, weight: .semibold))
                                                    .foregroundColor(AppColors.foreground)
                                                Text("·  \(fb.role)")
                                                    .font(.system(size: 10))
                                                    .foregroundColor(AppColors.foregroundSubtle)
                                            }
                                            Text(fb.contribution)
                                                .font(.system(size: 11))
                                                .foregroundColor(AppColors.foregroundMuted)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Archive Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(AppColors.accentPrimary)
                        .accessibilityLabel("Close archive entry")
                }
            }
        }
    }
}
