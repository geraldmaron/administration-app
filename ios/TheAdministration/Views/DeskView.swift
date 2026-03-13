/// DeskView
/// Main executive desk — the player's primary HQ for reviewing metrics,
/// reading scenarios, and making decisions. Includes animated circular
/// metric display, scenario card with severity indicators and impact
/// preview badges, decision flow choreography, and outcome overlay.
import SwiftUI

struct DeskView: View {
    @ObservedObject var gameStore: GameStore
    @State private var activeMetric = "metric_approval"
    @State private var viewMode: ViewMode = .focus
    @State private var isSimulating = false
    @State private var showTrustYourGut = false
    @State private var advisorOption: Option? = nil
    @State private var selectedOptionId: String? = nil
    @State private var dimmedOptionIds: Set<String> = []
    @State private var contentAppeared = false

    enum ViewMode { case focus, grid }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                NewsTickerView(gameStore: gameStore)

                ScrollView {
                    VStack(spacing: 24) {
                        headerSection

                        if viewMode == .focus {
                            focusView
                        } else {
                            gridView
                        }

                        metricSelector

                        scenarioCard
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, AppSpacing.tabBarClearance)
                }
            }

            if gameStore.showOutcome {
                outcomeOverlay
                    .transition(.opacity)
                    .zIndex(5)
            }
        }
        .onAppear {
            withAnimation(AppMotion.standard.delay(0.1)) { contentAppeared = true }
        }
        .sheet(isPresented: $showTrustYourGut) {
            TrustYourGutSheet(gameStore: gameStore)
        }
        .sheet(item: $advisorOption) { opt in
            if let scenario = gameStore.currentScenario {
                AdvisorSheet(
                    scenario: scenario,
                    option: opt,
                    gameStore: gameStore,
                    onConfirm: {
                        commitDecision(optionId: opt.id)
                    }
                )
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            ScreenHeader(
                protocolLabel: "EXECUTIVE_COMMAND_LINK",
                title: "DESK",
                subtitle: "Turn \(gameStore.state.turn)"
            )

            Spacer()

            Button(action: {
                HapticEngine.shared.light()
                withAnimation(AppMotion.quickSnap) {
                    viewMode = viewMode == .focus ? .grid : .focus
                }
            }) {
                Image(systemName: viewMode == .focus ? "square.grid.2x2" : "chart.pie")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.foregroundMuted)
                    .padding(8)
                    .background(AppColors.backgroundMuted)
                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            }
            .accessibilityLabel(viewMode == .focus ? "Switch to grid view" : "Switch to focus view")
        }
    }

    // MARK: - Focus View

    private var focusView: some View {
        VStack(spacing: 24) {
            AnimatedCircularGraphView(
                value: gameStore.state.metrics[activeMetric] ?? 50,
                label: metricLabels[activeMetric] ?? "Metric",
                subLabel: "Current Standing"
            )
            .frame(width: 300, height: 300)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(AppColors.border)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(AppColors.borderStrong, lineWidth: 1)
        )
        .opacity(contentAppeared ? 1 : 0)
    }

    // MARK: - Grid View

    private var gridView: some View {
        LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())],
            spacing: 12
        ) {
            ForEach(Array(metricLabels.keys.sorted().enumerated()), id: \.element) { index, metricId in
                let value = gameStore.state.metrics[metricId] ?? 50
                let isCritical = value < 25

                VStack(spacing: 8) {
                    Text(metricLabels[metricId] ?? metricId)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .textCase(.uppercase)
                        .lineLimit(1)

                    Text("\(Int(value))%")
                        .font(AppTypography.data)
                        .foregroundColor(AppColors.metricColor(for: value))

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle().fill(AppColors.border)
                            Rectangle()
                                .fill(AppColors.metricColor(for: value))
                                .frame(width: geometry.size.width * CGFloat(value / 100))
                        }
                    }
                    .frame(height: 2)
                }
                .padding(12)
                .background(isCritical ? AppColors.error.opacity(0.06) : AppColors.border)
                .overlay(Rectangle().stroke(isCritical ? AppColors.error.opacity(0.3) : AppColors.border, lineWidth: isCritical ? 1 : 0.5))
                .staggerEntrance(index: index, offset: 12)
            }
        }
    }

    // MARK: - Metric Selector

    private var metricSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(metricLabels.keys.sorted()), id: \.self) { metricId in
                    MetricCard(
                        label: metricLabels[metricId] ?? "",
                        value: gameStore.state.metrics[metricId] ?? 50,
                        icon: iconForMetric(metricId),
                        isActive: activeMetric == metricId,
                        onTap: {
                            withAnimation(AppMotion.quickSnap) { activeMetric = metricId }
                        }
                    )
                    .frame(width: 80)
                }
            }
            .padding(.horizontal, 2)
        }
    }

    // MARK: - Scenario Card

    private var scenarioCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header row
            HStack(spacing: 8) {
                if let scenario = gameStore.currentScenario {
                    // Severity badge
                    severityBadge(for: scenario)

                    // Category badge
                    if let category = scenario.category {
                        Text(category.uppercased())
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(1)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(AppColors.backgroundMuted)
                            .overlay(Rectangle().stroke(AppColors.border, lineWidth: 0.5))
                    }
                } else {
                    Text("INCOMING DIRECTIVE")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.error.opacity(0.8))
                        .tracking(2)
                }

                Spacer()

                if gameStore.getRemainingTrustYourGutUses() > 0 {
                    Button {
                        showTrustYourGut = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 9))
                            Text("TRUST YOUR GUT")
                                .font(AppTypography.micro)
                                .tracking(1)
                        }
                        .foregroundColor(AppColors.background)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppColors.accentPrimary)
                        .accentGlow(color: AppColors.accentPrimary, radius: 8)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Trust Your Gut — override the scenario")
                }
            }

            if let scenario = gameStore.currentScenario {
                // Severity color bar
                Rectangle()
                    .fill(severityColor(for: scenario))
                    .frame(height: 2)

                Text(scenario.title)
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.foreground)

                Text(displayDescription(for: scenario))
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundMuted)
                    .italic()
                    .fixedSize(horizontal: false, vertical: true)

                // "Understanding this decision" expandable section
                if !scenario.options.isEmpty {
                    DecisionContextView(scenario: scenario, gameStore: gameStore)
                }

                VStack(spacing: 8) {
                    ForEach(Array(scenario.options.enumerated()), id: \.element.id) { index, option in
                        ScenarioOptionCard(
                            option: option,
                            index: index,
                            isSelected: selectedOptionId == option.id,
                            isDimmed: !dimmedOptionIds.isEmpty && !dimmedOptionIds.contains(option.id) == false,
                            onSelect: {
                                selectOption(option, scenario: scenario)
                            },
                            onAdvisor: !(option.advisorFeedback?.isEmpty ?? true) || option.advisorFeedbackString != nil
                                ? { advisorOption = option }
                                : nil
                        )
                        .staggerEntrance(index: index, offset: 8)
                    }
                }
            } else {
                Text("System Initialization")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.foreground)

                Text("Establishing secure connection to Situation Room...")
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundMuted)
                    .shimmerLoading()
            }
        }
        .padding(20)
        .background(AppColors.border)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
    }

    // MARK: - Outcome Overlay

    private var outcomeOverlay: some View {
        ZStack {
            AppColors.background.opacity(0.75)
                .ignoresSafeArea()
                .onTapGesture { closeOutcome() }

            if let briefing = gameStore.lastBriefing {
                VStack(alignment: .leading, spacing: 20) {
                    // Outcome header
                    VStack(alignment: .leading, spacing: 6) {
                        Text("DECISION OUTCOME")
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.accentPrimary)
                            .tracking(3)

                        Text(briefing.title)
                            .font(AppTypography.headline)
                            .foregroundColor(AppColors.foreground)

                        Text(briefing.description)
                            .font(AppTypography.bodySmall)
                            .foregroundColor(AppColors.foregroundMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    // Metric deltas
                    if !briefing.metrics.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("METRIC IMPACT")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)

                            ForEach(Array(briefing.metrics.enumerated()), id: \.element.id) { index, metric in
                                HStack {
                                    Text(metric.name)
                                        .font(AppTypography.caption)
                                        .foregroundColor(AppColors.foregroundMuted)
                                    Spacer()
                                    Text(metric.delta >= 0
                                         ? "+\(String(format: "%.1f", metric.delta))%"
                                         : "\(String(format: "%.1f", metric.delta))%")
                                        .font(AppTypography.caption)
                                        .fontWeight(.bold)
                                        .monospacedDigit()
                                        .foregroundColor(metric.delta >= 0 ? AppColors.success : AppColors.error)
                                }
                                .staggerEntrance(index: index, offset: 6)
                            }
                        }
                    }

                    Button("CONTINUE") { closeOutcome() }
                        .buttonStyle(CommandButtonStyle())
                        .accessibilityLabel("Continue to next decision")
                }
                .padding(24)
                .background(AppColors.backgroundElevated)
                .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.2), lineWidth: 1))
                .padding(.horizontal, 24)
                .transition(.scale(scale: 0.95).combined(with: .opacity))
            }
        }
    }

    // MARK: - Helpers

    private func selectOption(_ option: Option, scenario: Scenario) {
        withAnimation(AppMotion.quickSnap) {
            selectedOptionId = option.id
            dimmedOptionIds = Set(scenario.options.map(\.id).filter { $0 != option.id })
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            commitDecision(optionId: option.id)
        }
    }

    private func commitDecision(optionId: String) {
        isSimulating = true
        gameStore.makeDecision(optionId: optionId)
        withAnimation(AppMotion.quickSnap) {
            selectedOptionId = nil
            dimmedOptionIds = []
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { isSimulating = false }
    }

    private func closeOutcome() {
        withAnimation(AppMotion.standard) { gameStore.showOutcome = false }
        HapticEngine.shared.light()
    }

    @ViewBuilder
    private func severityBadge(for scenario: Scenario) -> some View {
        let (color, label) = severityStyle(scenario.severity)
        Text(label)
            .font(AppTypography.micro)
            .foregroundColor(color)
            .tracking(1)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color.opacity(0.1))
            .overlay(Rectangle().stroke(color.opacity(0.4), lineWidth: 0.5))
    }

    private func severityStyle(_ severity: SeverityLevel?) -> (Color, String) {
        switch severity {
        case .extreme, .critical: return (AppColors.error, "CRITICAL")
        case .high:               return (AppColors.warning, "URGENT")
        case .low:                return (AppColors.success, "ROUTINE")
        default:                  return (AppColors.info, "DIRECTIVE")
        }
    }

    private func severityColor(for scenario: Scenario) -> Color {
        severityStyle(scenario.severity).0
    }

    private func iconForMetric(_ metricId: String) -> String {
        switch metricId {
        case "metric_approval":         return "person.3.fill"
        case "metric_economy":          return "chart.line.uptrend.xyaxis"
        case "metric_foreign_relations": return "globe"
        case "metric_public_order":     return "scalemass"
        case "metric_corruption":       return "eye.slash"
        case "metric_liberty":          return "lock.open"
        case "metric_inflation":        return "arrow.up.right"
        case "metric_military":         return "shield.fill"
        case "metric_innovation":       return "lightbulb"
        case "metric_health":           return "heart.fill"
        case "metric_equality":         return "equal.circle"
        default:                        return "chart.bar.fill"
        }
    }

    private func displayDescription(for scenario: Scenario) -> String {
        replaceMetricTokens(in: rewriteTriggerDescription(scenario.description))
    }

    private func rewriteTriggerDescription(_ text: String) -> String {
        let pattern = "^(Critical consequence scenario triggered when|Scenario triggered when)\\s+(metric_[a-z_]+)\\s+(falls below|exceeds)\\s+(\\d+)\\.?$"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return text }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        guard let match = regex.firstMatch(in: text, options: [], range: range), match.numberOfRanges == 5 else { return text }
        guard
            let prefixRange = Range(match.range(at: 1), in: text),
            let metricRange = Range(match.range(at: 2), in: text),
            let verbRange   = Range(match.range(at: 3), in: text),
            let threshRange = Range(match.range(at: 4), in: text)
        else { return text }

        let isCritical = String(text[prefixRange]).lowercased().contains("critical")
        let metricLabel = humanizeMetricId(String(text[metricRange]))
        let verb = String(text[verbRange]).lowercased()
        let threshold = String(text[threshRange])
        return isCritical
            ? "Critical consequences as \(metricLabel) \(verb) \(threshold)."
            : "Triggered when \(metricLabel) \(verb) \(threshold)."
    }

    private func replaceMetricTokens(in text: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: "metric_[a-z_]+", options: [.caseInsensitive]) else { return text }
        let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
        var result = text
        for match in regex.matches(in: text, range: nsRange).reversed() {
            guard let matchRange = Range(match.range, in: result) else { continue }
            result.replaceSubrange(matchRange, with: humanizeMetricId(String(result[matchRange])))
        }
        return result
    }

    private func humanizeMetricId(_ metricId: String) -> String {
        if let label = metricLabels[metricId] { return label }
        return metricId.replacingOccurrences(of: "metric_", with: "")
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }

    private var metricLabels: [String: String] {
        [
            "metric_approval":          "Approval",
            "metric_economy":           "Economy",
            "metric_foreign_relations": "Diplomacy",
            "metric_public_order":      "Order",
            "metric_corruption":        "Corruption",
            "metric_liberty":           "Liberty",
            "metric_inflation":         "Inflation",
            "metric_military":          "Military",
            "metric_innovation":        "Innovation",
            "metric_health":            "Health",
            "metric_equality":          "Equality"
        ]
    }

}

// MARK: - Decision Context View

private struct DecisionContextView: View {
    let scenario: Scenario
    @ObservedObject var gameStore: GameStore
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: {
                withAnimation(AppMotion.quickSnap) { isExpanded.toggle() }
                HapticEngine.shared.light()
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 12))
                    Text("Understanding this decision")
                        .font(AppTypography.micro)
                        .tracking(1)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 10))
                }
                .foregroundColor(AppColors.foregroundSubtle)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 6) {
                    let affectedMetrics = scenario.options
                        .flatMap { $0.effects ?? [] }
                        .map(\.targetMetricId)
                        .uniqued()
                        .prefix(6)

                    ForEach(Array(affectedMetrics), id: \.self) { metricId in
                        let value = gameStore.state.metrics[metricId] ?? 50
                        HStack(spacing: 8) {
                            Circle()
                                .fill(AppColors.metricColor(for: value))
                                .frame(width: 6, height: 6)
                            Text(metricId.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundMuted)
                            Spacer()
                            Text("\(Int(value))")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.metricColor(for: value))
                                .monospacedDigit()
                        }
                    }
                }
                .padding(10)
                .background(AppColors.backgroundMuted)
                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 0.5))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - Animated Circular Graph View

struct AnimatedCircularGraphView: View {
    let value: Double
    let label: String
    let subLabel: String

    @State private var animatedValue: Double = 0

    private var color: Color { AppColors.metricColor(for: animatedValue) }

    var body: some View {
        ZStack {
            ring
            centerContent
        }
        .onAppear {
            withAnimation(AppMotion.dramatic) { animatedValue = value }
        }
        .onChange(of: value) { _, newVal in
            withAnimation(AppMotion.standard) { animatedValue = newVal }
        }
    }

    private var ring: some View {
        ZStack {
            Circle()
                .stroke(AppColors.border, lineWidth: 18)
                .frame(width: 260, height: 260)

            Circle()
                .trim(from: 0, to: CGFloat(max(0, min(1, animatedValue / 100))))
                .stroke(
                    AppColors.accentGradient,
                    style: StrokeStyle(lineWidth: 18, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: 260, height: 260)
                .shadow(color: color.opacity(0.4), radius: 8)

            // Critical pulse
            if animatedValue < 25 {
                Circle()
                    .stroke(AppColors.error.opacity(0.2), lineWidth: 2)
                    .frame(width: 280, height: 280)
            }
        }
    }

    private var centerContent: some View {
        VStack(spacing: 8) {
            Text(label.uppercased())
                .font(AppTypography.label)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)

            Text("\(Int(animatedValue))%")
                .font(AppTypography.dataLarge)
                .foregroundColor(color)
                .monospacedDigit()
                .contentTransition(.numericText())

            Text(subLabel.uppercased())
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(1)
        }
        .padding(40)
        .background(AppColors.background.opacity(0.8))
        .clipShape(Circle())
    }
}

// MARK: - Sequence Uniqued helper

private extension Sequence where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
