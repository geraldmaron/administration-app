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

    @State private var selectedCrisis: ActiveCrisis? = nil
    @State private var scrollProxy: ScrollViewProxy? = nil
    @State private var selectedInfoContext: MetricInfoContext? = nil

    enum ViewMode { case focus, grid }
    private enum OutcomePhase { case hidden, loading, revealed }
    @State private var outcomePhase: OutcomePhase = .hidden
    @State private var scanProgress: CGFloat = 0
    @State private var loadingStartTime: Date = .now

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            GlobeBackgroundView(
                target: GlobeBackgroundView.capitalCoordinates[gameStore.state.countryId ?? ""],
                showPulse: true
            )
            .opacity(0.35)

            VStack(spacing: 0) {
                NewsTickerView(gameStore: gameStore)

                if !gameStore.state.activeCrises.isEmpty {
                    crisiBanner
                }

                 ScrollViewReader { proxy in
                     ScrollView {
                         VStack(spacing: AppSpacing.xxl) {
                             headerSection
                                 .id("deskTop")

                             if viewMode == .focus {
                                 focusView
                             } else {
                                 gridView
                             }

                             metricSelector

                             scenarioCard
                         }
                         .padding(.horizontal, AppSpacing.sectionPadding)
                         .padding(.bottom, AppSpacing.tabBarClearance)
                     }
                     .onAppear { scrollProxy = proxy }
                 }
            }

            if gameStore.showOutcome {
                outcomeOverlay
                    .transition(.opacity)
                    .zIndex(5)
                    .onAppear { startOutcomeLoading() }
            }
        }
        .onAppear {
            withAnimation(AppMotion.standard.delay(0.1)) { contentAppeared = true }
        }
        .onChange(of: gameStore.showOutcome) { _, newValue in
            if newValue {
                loadingStartTime = .now
            } else {
                outcomePhase = .hidden
                scanProgress = 0
            }
        }
        .onChange(of: gameStore.outcomeBriefingReady) { _, newValue in
            guard newValue, gameStore.showOutcome else { return }
            let elapsed = Date.now.timeIntervalSince(loadingStartTime)
            let remaining = max(0, 1.2 - elapsed)
            DispatchQueue.main.asyncAfter(deadline: .now() + remaining) {
                guard gameStore.showOutcome else { return }
                withAnimation(AppMotion.standard) { outcomePhase = .revealed }
            }
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
        .sheet(item: $selectedCrisis) { activeCrisis in
            CrisisDetailSheet(activeCrisis: activeCrisis)
        }
        .sheet(item: $selectedInfoContext) { ctx in
            MetricInfoSheet(context: ctx)
                .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Crisis Banner

    private var crisiBanner: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(gameStore.state.activeCrises, id: \.crisis.id) { activeCrisis in
                    Button(action: { selectedCrisis = activeCrisis }) {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(activeCrisis.crisis.severity == .critical ? AppColors.error : AppColors.warning)
                            Text(activeCrisis.crisis.name)
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foreground)
                                .lineLimit(1)
                            Text("T+\(activeCrisis.currentDuration)")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.backgroundElevated)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .strokeBorder(
                                            activeCrisis.crisis.severity == .critical ? AppColors.error.opacity(0.5) : AppColors.warning.opacity(0.5),
                                            lineWidth: 1
                                        )
                                )
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(AppColors.backgroundElevated.opacity(0.6))
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .top) {
            ScreenHeader(
                protocolLabel: "EXECUTIVE_COMMAND_LINK",
                title: "Desk",
                subtitle: "Turn \(gameStore.state.turn)"
            )

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                if let country = gameStore.playerCountry {
                    HStack(spacing: 6) {
                        Text(country.flagEmoji)
                            .font(.system(size: 16))
                        Text(country.name)
                            .font(AppTypography.caption)
                            .fontWeight(.medium)
                            .foregroundColor(AppColors.foregroundMuted)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(AppColors.backgroundElevated)
                    )
                }
                HStack(spacing: 6) {
                    Button(action: {
                        HapticEngine.shared.light()
                        gameStore.setScoreDisplayFormat(
                            gameStore.scoreDisplayFormat == .percentage ? .letter : .percentage
                        )
                    }) {
                        Text(gameStore.scoreDisplayFormat == .percentage ? "%" : "A")
                            .font(.system(size: 13, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.foregroundMuted)
                            .frame(width: 32, height: 32)
                            .background(AppColors.backgroundMuted)
                            .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                    }
                    .accessibilityLabel(gameStore.scoreDisplayFormat == .percentage ? "Switch to letter grade display" : "Switch to percentage display")

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
        }
    }

    // MARK: - Focus View

    private var focusView: some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: 24) {
                AnimatedCircularGraphView(
                    value: gameStore.state.metrics[activeMetric] ?? 50,
                    label: metricLabels[activeMetric] ?? "Metric",
                    subLabel: "Current Standing",
                    isInverse: ScoringEngine.isInverseMetric(activeMetric),
                    format: gameStore.scoreDisplayFormat,
                    metricId: activeMetric
                )
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)

            Button(action: {
                HapticEngine.shared.light()
                selectedInfoContext = MetricInfoContext(
                    metricId: activeMetric,
                    value: gameStore.state.metrics[activeMetric] ?? 50,
                    history: gameStore.state.metricHistory[activeMetric] ?? []
                )
            }) {
                Image(systemName: "info.circle")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.foregroundSubtle.opacity(0.6))
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(8)
            .accessibilityLabel("Metric info")
        }
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Color.white.opacity(0.08))
        )
        .overlay(
            HUDCornerBrackets()
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
                let inverse = ScoringEngine.isInverseMetric(metricId)
                let isCritical = inverse ? value > 75 : value < 25
                let color = AppColors.metricColor(for: CGFloat(value), metricId: metricId, isInverse: inverse)

                Button(action: {
                    HapticEngine.shared.light()
                    selectedInfoContext = MetricInfoContext(
                        metricId: metricId,
                        value: value,
                        history: gameStore.state.metricHistory[metricId] ?? []
                    )
                }) {
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .trim(from: 0, to: 0.75)
                                .stroke(AppColors.border, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .rotationEffect(.degrees(135))
                            Circle()
                                .trim(from: 0, to: CGFloat(max(0, min(0.75, (value / 100) * 0.75))))
                                .stroke(
                                    LinearGradient(
                                        colors: [color.opacity(0.5), color],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    ),
                                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                                )
                                .rotationEffect(.degrees(135))
                        }
                        .frame(width: 32, height: 32)

                        let displayVal = MetricFormatting.metricDisplayValue(value: value, format: gameStore.scoreDisplayFormat, metricId: metricId)
                        Text(gameStore.scoreDisplayFormat == .percentage ? "\(displayVal)%" : displayVal)
                            .font(AppTypography.data)
                            .foregroundColor(AppColors.foreground)
                            .monospacedDigit()

                        Text(metricLabels[metricId] ?? metricId)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .textCase(.uppercase)
                            .lineLimit(1)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(isCritical ? color.opacity(0.10) : Color.white.opacity(0.08))
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(metricLabels[metricId] ?? metricId): \(Int(value)) percent. Tap for details.")
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
                        isInverse: ScoringEngine.isInverseMetric(metricId),
                        metricId: metricId,
                        format: gameStore.scoreDisplayFormat,
                        onInfo: { selectedInfoContext = MetricInfoContext(metricId: metricId, value: gameStore.state.metrics[metricId] ?? 50, history: gameStore.state.metricHistory[metricId] ?? []) },
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
            HStack(spacing: 8) {
                if let scenario = gameStore.currentScenario {
                    severityBadge(for: scenario)

                    if let category = scenario.category {
                        Text(category)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(AppColors.backgroundMuted)
                            )
                    }
                } else {
                    Text("Incoming directive")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.error.opacity(0.8))
                }

                Spacer()

                    if gameStore.getRemainingTrustYourGutUses() > 0 {
                        Button {
                            showTrustYourGut = true
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "bolt.fill")
                                    .font(.system(size: 9))
                                Text("Trust Your Gut")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundColor(AppColors.background)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(AppColors.accentPrimary)
                            )
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Trust Your Gut — override the scenario")
                    }
            }

            if gameStore.isLoading {
                Text("Situation Room")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.foreground)

                Text("Compiling briefing materials. Secure channel active.")
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundMuted)
                    .shimmerLoading()
            } else if let scenario = gameStore.currentScenario {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(scenario.title)
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.foreground)
                    if scenario.chainId != nil, let act = scenario.actIndex {
                        Text("Part \(act)")
                            .font(AppTypography.micro)
                            .fontWeight(.semibold)
                            .foregroundColor(AppColors.foregroundMuted)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule().fill(AppColors.backgroundElevated.opacity(0.9))
                            )
                            .accessibilityLabel("Multi-part storyline, act \(act)")
                    }
                }

                Text(displayDescription(for: scenario))
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foreground)
                    .italic()
                    .fixedSize(horizontal: false, vertical: true)

                VStack(spacing: 8) {
                    ForEach(Array(scenario.options.enumerated()), id: \.element.id) { index, option in
                        ScenarioOptionCard(
                            option: option,
                            index: index,
                            isSelected: selectedOptionId == option.id,
                            isDimmed: !dimmedOptionIds.isEmpty && dimmedOptionIds.contains(option.id),
                            onSelect: {
                                selectOption(option, scenario: scenario)
                            },
                            onAdvisor: !(option.advisorFeedback?.isEmpty ?? true)
                                ? { advisorOption = option }
                                : nil
                        )
                    }
                }
            } else {
                Text("Situation Room")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.foreground)

                Text("Establishing secure connection to Situation Room...")
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundMuted)
                    .shimmerLoading()
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Color.white.opacity(0.16))
        )
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(AppColors.accentPrimary)
                .frame(width: 2)
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 6, bottomLeadingRadius: 6))
        }
    }

    // MARK: - Outcome Overlay

    private var outcomeOverlay: some View {
        ZStack {
            AppColors.background.opacity(0.85)
                .ignoresSafeArea()
                .onTapGesture { closeOutcome() }

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("THE ADMINISTRATION DISPATCH")
                                    .font(.system(size: 8, weight: .black, design: .monospaced))
                                    .foregroundColor(AppColors.accentSecondary)
                                    .tracking(3)
                                Text("TURN \(gameStore.state.turn) · OFFICIAL RECORD")
                                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundSubtle)
                                    .tracking(1)
                            }
                            Spacer()
                            Button(action: closeOutcome) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .padding(8)
                                    .background(AppColors.backgroundElevated)
                                    .clipShape(Circle())
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        .padding(.bottom, 10)

                        Rectangle().fill(AppColors.accentPrimary).frame(height: 2).padding(.horizontal, 20)
                        Rectangle().fill(AppColors.accentSecondary).frame(height: 1).padding(.horizontal, 20).padding(.top, 2)

                        if outcomePhase == .loading {
                            VStack(spacing: 20) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("DECRYPTING INTELLIGENCE DISPATCH")
                                        .font(.system(size: 9, weight: .black, design: .monospaced))
                                        .foregroundColor(AppColors.accentPrimary)
                                        .tracking(2)
                                    Rectangle()
                                        .fill(AppColors.accentGradient)
                                        .frame(height: 2)
                                        .scaleEffect(x: scanProgress, anchor: .leading)
                                        .animation(.easeInOut(duration: 1.0), value: scanProgress)
                                }
                                .padding(.horizontal, 20)

                                Text("STAND BY")
                                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundSubtle)
                                    .tracking(3)
                            }
                            .padding(40)
                        } else if outcomePhase == .revealed {
                            if let briefing = gameStore.lastBriefing {
                            VStack(alignment: .leading, spacing: 14) {
                                Text(briefing.title)
                                    .font(.system(size: 20, weight: .black))
                                    .foregroundColor(AppColors.foreground)
                                    .fixedSize(horizontal: false, vertical: true)

                                HStack(spacing: 6) {
                                    Text("BY THE ADMINISTRATION PRESS BUREAU")
                                        .font(.system(size: 8, weight: .black, design: .monospaced))
                                        .foregroundColor(AppColors.accentPrimary)
                                        .tracking(1)
                                    Text("·")
                                        .foregroundColor(AppColors.foregroundSubtle)
                                    Text(gameStore.state.formattedDate(forTurn: gameStore.state.turn))
                                        .font(.system(size: 8, weight: .medium, design: .monospaced))
                                        .foregroundColor(AppColors.foregroundSubtle)
                                        .tracking(1)
                                }

                                Rectangle().fill(AppColors.border).frame(height: 1)

                                Text(briefing.description)
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(AppColors.foreground.opacity(0.9))
                                    .fixedSize(horizontal: false, vertical: true)
                                    .lineSpacing(5)

                                if let cost = briefing.humanCost,
                                   (cost.civilian ?? 0) > 0 || (cost.military ?? 0) > 0 || (cost.displaced ?? 0) > 0 {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Officials confirm the decision carries significant human consequences.")
                                            .font(.system(size: 13, weight: .regular))
                                            .foregroundColor(AppColors.error.opacity(0.9))
                                            .italic()
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }

                                Rectangle().fill(AppColors.border).frame(height: 1)

                                let residualsByMetric: [String: Double] = {
                                    var sums: [String: Double] = [:]
                                    for ae in gameStore.state.activeEffects where ae.baseEffect.delay != nil {
                                        let key = ae.baseEffect.targetMetricId
                                        sums[key] = (sums[key] ?? 0) + ae.baseEffect.value
                                    }
                                    return sums
                                }()
                                let directMetricIds = Set(briefing.metrics.map(\.id))
                                let sortedMetrics = briefing.metrics.sorted { a, b in
                                    if a.id == "metric_approval" { return true }
                                    if b.id == "metric_approval" { return false }
                                    return abs(a.delta) > abs(b.delta)
                                }
                                let carryForwardItems = sortedMetrics.compactMap { m -> (ScoringEngine.MetricDelta, Double)? in
                                    guard let r = residualsByMetric[m.id] else { return nil }
                                    return (m, r)
                                }
                                let pendingOnlyIds = residualsByMetric.keys.filter { !directMetricIds.contains($0) }.sorted()

                                // Zone 1 — THIS TURN
                                if !sortedMetrics.isEmpty {
                                    dispatchSection(
                                        title: "THIS TURN",
                                        subtitle: "Applied immediately"
                                    ) {
                                        ForEach(Array(sortedMetrics.enumerated()), id: \.element.id) { _, metric in
                                            let deltaColor: Color = metric.delta >= 0 ? AppColors.success : AppColors.error
                                            dispatchRow(
                                                name: metric.name,
                                                deltaString: MetricFormatting.metricDeltaString(metric.delta),
                                                color: deltaColor,
                                                icon: metric.delta >= 0 ? "arrow.up.right" : "arrow.down.right"
                                            )
                                        }
                                    }
                                }

                                // Zone 2 — CARRY-FORWARD (metrics that also have residuals)
                                if !carryForwardItems.isEmpty {
                                    dispatchSection(
                                        title: "CARRY-FORWARD",
                                        subtitle: "Momentum arriving in coming turns"
                                    ) {
                                        ForEach(carryForwardItems, id: \.0.id) { metric, residual in
                                            dispatchRow(
                                                name: metric.name,
                                                deltaString: MetricFormatting.metricDeltaString(residual),
                                                color: AppColors.warning,
                                                icon: "clock.arrow.circlepath"
                                            )
                                        }
                                    }
                                }

                                // Zone 3 — PENDING (residuals on metrics not directly changed)
                                if !pendingOnlyIds.isEmpty {
                                    dispatchSection(
                                        title: "PENDING",
                                        subtitle: "Delayed effects on unrelated metrics"
                                    ) {
                                        ForEach(pendingOnlyIds, id: \.self) { mId in
                                            let val = residualsByMetric[mId] ?? 0
                                            let mName = MetricCatalogue.info[mId].map { _ in
                                                mId.replacingOccurrences(of: "metric_", with: "")
                                                    .replacingOccurrences(of: "_", with: " ")
                                                    .split(separator: " ")
                                                    .map { $0.prefix(1).uppercased() + $0.dropFirst() }
                                                    .joined(separator: " ")
                                            } ?? mId.replacingOccurrences(of: "metric_", with: "")
                                                .replacingOccurrences(of: "_", with: " ")
                                                .capitalized
                                            dispatchRow(
                                                name: mName,
                                                deltaString: MetricFormatting.metricDeltaString(val),
                                                color: AppColors.warning,
                                                icon: "clock.arrow.circlepath"
                                            )
                                        }
                                    }
                                }

                                Button("Continue →") { closeOutcome() }
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(AppColors.background)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(AppColors.accentPrimary)
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                            .padding(20)
                            .transition(.opacity)
                            } // if let briefing
                        }
                    }
                }
                .background(AppColors.backgroundElevated)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .padding(.horizontal, 16)
                .padding(.top, 40)
                .padding(.bottom, AppSpacing.tabBarClearance + 20)
                .transition(.scale(scale: 0.96).combined(with: .opacity))
        }
    }

    // MARK: - Dispatch Helpers

    @ViewBuilder
    private func dispatchSection<Content: View>(
        title: String,
        subtitle: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Rectangle()
                    .fill(title == "THIS TURN" ? AppColors.accentSecondary : AppColors.warning)
                    .frame(width: 3, height: 12)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 8, weight: .black, design: .monospaced))
                        .foregroundColor(title == "THIS TURN" ? AppColors.accentSecondary : AppColors.warning)
                        .tracking(2)
                    Text(subtitle)
                        .font(.system(size: 8, weight: .regular, design: .monospaced))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            VStack(spacing: 4) {
                content()
            }
        }
    }

    private func dispatchRow(name: String, deltaString: String, color: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Rectangle().fill(color).frame(width: 2, height: 28)
            Text(name)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
            Spacer()
            HStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 8, weight: .bold))
                Text(deltaString)
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .monospacedDigit()
            }
            .foregroundColor(color)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(RoundedRectangle(cornerRadius: 4, style: .continuous).fill(color.opacity(0.06)))
        .overlay(RoundedRectangle(cornerRadius: 4, style: .continuous).stroke(color.opacity(0.18), lineWidth: 1))
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

    private func startOutcomeLoading() {
        loadingStartTime = .now
        outcomePhase = .loading
        scanProgress = 0
        withAnimation(.easeInOut(duration: 1.0)) { scanProgress = 1 }
    }

    private func closeOutcome() {
        withAnimation(AppMotion.standard) { gameStore.showOutcome = false }
        gameStore.outcomeBriefingReady = false
        outcomePhase = .hidden
        HapticEngine.shared.light()
        withAnimation(AppMotion.standard) {
            scrollProxy?.scrollTo("deskTop", anchor: .top)
        }
    }

    @ViewBuilder
    private func severityBadge(for scenario: Scenario) -> some View {
        let (color, label) = severityStyle(scenario.severity)
        Text(label)
            .font(AppTypography.micro)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(color.opacity(0.12))
            )
    }

    private func severityStyle(_ severity: SeverityLevel?) -> (Color, String) {
        switch severity {
        case .extreme, .critical: return (AppColors.error, "CRITICAL")
        case .high:               return (AppColors.warning, "URGENT")
        case .low:                return (AppColors.success, "ROUTINE")
        default:                  return (AppColors.foregroundSubtle, "DIRECTIVE")
        }
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

// MARK: - Cabinet Feedback View

private struct CabinetFeedbackView: View {
    let scenario: Scenario
    @ObservedObject var gameStore: GameStore

    private struct CabinetSignal: Identifiable {
        let id: String
        let name: String
        let roleTitle: String
        let stance: String
        let quote: String
    }

    private var signals: [CabinetSignal] {
        // Gather all feedback across all options, keeping the strongest signal per member
        var seen = Set<String>()
        var result: [CabinetSignal] = []

        for option in scenario.options {
            guard let feedbacks = option.advisorFeedback else { continue }
            for fb in feedbacks {
                guard !seen.contains(fb.roleId) else { continue }
                guard let member = gameStore.state.cabinet.first(where: {
                    $0.roleId == fb.roleId && !$0.isVacant
                }) else { continue }
                seen.insert(fb.roleId)
                let name = member.candidate?.name ?? member.name
                let roleTitle = fb.roleId
                    .replacingOccurrences(of: "_", with: " ")
                    .split(separator: " ")
                    .map { $0.prefix(1).uppercased() + $0.dropFirst() }
                    .joined(separator: " ")
                let truncated = fb.feedback.count > 80
                    ? String(fb.feedback.prefix(80)).trimmingCharacters(in: .whitespaces) + "…"
                    : fb.feedback
                result.append(CabinetSignal(
                    id: fb.roleId,
                    name: name,
                    roleTitle: roleTitle,
                    stance: fb.stance,
                    quote: truncated
                ))
            }
        }
        return Array(result.prefix(4))
    }

    private func stanceColor(_ stance: String) -> Color {
        switch stance.lowercased() {
        case "support", "approve", "positive": return AppColors.success
        case "oppose", "reject", "negative":   return AppColors.error
        default: return AppColors.foregroundSubtle
        }
    }

    private func stanceIcon(_ stance: String) -> String {
        switch stance.lowercased() {
        case "support", "approve", "positive": return "checkmark"
        case "oppose", "reject", "negative":   return "xmark"
        default: return "minus"
        }
    }

    var body: some View {
        if signals.isEmpty { EmptyView() } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("Cabinet")
                    .font(AppTypography.label)
                    .foregroundColor(AppColors.foregroundSubtle)

                VStack(spacing: 6) {
                    ForEach(signals) { signal in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: stanceIcon(signal.stance))
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(stanceColor(signal.stance))
                                .frame(width: 18, height: 18)
                                .background(stanceColor(signal.stance).opacity(0.12), in: Circle())

                            VStack(alignment: .leading, spacing: 2) {
                                Text(signal.name)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppColors.foreground)
                                Text(signal.quote)
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.white.opacity(0.08))
                )
            }
        }
    }
}

// MARK: - Animated Circular Graph View

struct AnimatedCircularGraphView: View {
    let value: Double
    let label: String
    let subLabel: String
    var isInverse: Bool = false
    var format: ScoreDisplayFormat = .percentage
    var metricId: String = ""

    @State private var animatedValue: Double = 0

    private var gaugeColor: Color { AppColors.metricColor(for: CGFloat(animatedValue), metricId: metricId, isInverse: isInverse) }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .trim(from: 0, to: 0.75)
                    .stroke(AppColors.backgroundMuted, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(135))
                Circle()
                    .trim(from: 0, to: CGFloat(max(0, min(0.75, (animatedValue / 100) * 0.75))))
                    .stroke(
                        LinearGradient(
                            colors: [AppColors.accentPrimary.opacity(0.45), AppColors.accentPrimary],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .rotationEffect(.degrees(135))
                    .animation(AppMotion.dramatic, value: animatedValue)
                VStack(spacing: 4) {
                    if format == .letter {
                        Text(MetricFormatting.metricDisplayValue(value: animatedValue, format: .letter, metricId: metricId))
                            .font(.system(size: 56, weight: .bold, design: .monospaced))
                            .foregroundColor(AppColors.accentPrimary)
                            .contentTransition(.numericText())
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                    } else {
                        VStack(spacing: 0) {
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", animatedValue))
                                    .font(.system(size: 44, weight: .bold, design: .monospaced))
                                    .foregroundColor(AppColors.accentPrimary)
                                    .monospacedDigit()
                                    .contentTransition(.numericText())
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.6)
                                Text("%")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundColor(AppColors.accentPrimary)
                            }
                        }
                    }
                    Text(label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .frame(width: 160, height: 160)

            Text(subLabel)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundSubtle)
        }
        .padding(24)
        .onAppear {
            withAnimation(AppMotion.dramatic) { animatedValue = value }
        }
        .onChange(of: value) { _, newVal in
            withAnimation(AppMotion.standard) { animatedValue = newVal }
        }
    }
}

// MARK: - CrisisDetailSheet

struct CrisisDetailSheet: View {
    let activeCrisis: ActiveCrisis

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(activeCrisis.crisis.severity == .critical ? AppColors.error : AppColors.warning)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(activeCrisis.crisis.name)
                                .font(AppTypography.title)
                                .foregroundColor(AppColors.foreground)
                            Text("SEVERITY: \(activeCrisis.crisis.severity.rawValue.uppercased())")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(1)
                        }
                    }

                    Text(activeCrisis.crisis.description)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.foregroundMuted)

                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("STARTED").font(AppTypography.micro).foregroundColor(AppColors.foregroundSubtle).tracking(1)
                            Text("Turn \(activeCrisis.startTurn)").font(AppTypography.caption).foregroundColor(AppColors.foreground)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("DURATION").font(AppTypography.micro).foregroundColor(AppColors.foregroundSubtle).tracking(1)
                            Text("\(activeCrisis.currentDuration) turns").font(AppTypography.caption).foregroundColor(AppColors.foreground)
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous).fill(AppColors.backgroundElevated)
                    )
                }
                .padding(20)
            }
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle("Active Crisis")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Sequence Uniqued helper

private extension Sequence where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
