import SwiftUI

struct FinanceView: View {
    @ObservedObject var gameStore: GameStore
    @State private var activeTab = 0
    @Namespace private var tabIndicator
    @State private var draftFiscal: FiscalSettings = .defaults
    @State private var activeReview: ImpactReview?

    private var fiscal: FiscalSettings {
        gameStore.state.fiscalSettings ?? .defaults
    }

    private var hasTaxChanges: Bool {
        abs(draftFiscal.taxIncome - fiscal.taxIncome) > 0.001 ||
        abs(draftFiscal.taxCorporate - fiscal.taxCorporate) > 0.001
    }

    private var hasSpendingChanges: Bool {
        abs(draftFiscal.spendingMilitary - fiscal.spendingMilitary) > 0.001 ||
        abs(draftFiscal.spendingSocial - fiscal.spendingSocial) > 0.001 ||
        abs(draftFiscal.spendingInfrastructure - fiscal.spendingInfrastructure) > 0.001
    }

    private let tabs = ["Taxation", "Spending", "Forecast"]

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: AppSpacing.xl) {
                    ScreenHeader(
                        protocolLabel: "ECONOMIC_COMMAND_LINK_V8",
                        title: "Finance",
                        subtitle: "Fiscal policy and economic outlook"
                    )

                    animatedTabBar

                    Group {
                        if activeTab == 0 {
                            taxationView
                        } else if activeTab == 1 {
                            spendingView
                        } else {
                            forecastView
                        }
                    }
                    .transition(.opacity)
                    .animation(AppMotion.quickSnap, value: activeTab)
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.tabBarClearance)
            }
        }
        .onAppear { draftFiscal = fiscal }
        .onChange(of: gameStore.state.fiscalSettings) { _, _ in
            if !hasTaxChanges && !hasSpendingChanges { draftFiscal = fiscal }
        }
        .sheet(item: $activeReview) { review in
            PolicyChangesSheet(review: review)
                .presentationDetents([.medium])
        }
    }

    // MARK: - Animated Tab Bar

    private var animatedTabBar: some View {
        HStack(spacing: 2) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                Button(action: {
                    HapticEngine.shared.light()
                    withAnimation(AppMotion.quickSnap) { activeTab = index }
                }) {
                    Text(title)
                        .font(AppTypography.micro)
                        .foregroundColor(activeTab == index ? AppColors.background : AppColors.foregroundSubtle)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(activeTab == index ? AppColors.accentPrimary : Color.clear)
                        )
                        .animation(AppMotion.quickSnap, value: activeTab)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    // MARK: - Taxation

    private var taxationView: some View {
        VStack(spacing: AppSpacing.sm) {
            FiscalSliderCard(
                label: "PERSONAL INCOME TAX",
                subtitle: "Impacts consumer spending and social stability",
                icon: "person.3",
                value: draftFiscal.taxIncome,
                range: 0...60,
                unit: "%",
                helpTitle: "Income Tax",
                helpText: "Higher rates fund public services but reduce disposable income and consumer spending.",
                onChange: { draftFiscal.taxIncome = $0 }
            )

            FiscalSliderCard(
                label: "CORPORATE TAX RATE",
                subtitle: "Impacts business investment and economic growth",
                icon: "building.2",
                value: draftFiscal.taxCorporate,
                range: 0...60,
                unit: "%",
                helpTitle: "Corporate Tax",
                helpText: "Lower rates attract investment but reduce government revenue available for social programs.",
                onChange: { draftFiscal.taxCorporate = $0 }
            )

            Group {
                if hasTaxChanges {
                    Button("Review Tax Changes") {
                        let old = fiscal
                        let new = draftFiscal
                        activeReview = ImpactReview(
                            title: "Tax Impact",
                            impacts: gameStore.computeFiscalMetricImpacts(from: old, to: new),
                            onConfirm: {
                                gameStore.applyFiscalMetricImpacts(from: old, to: new)
                                gameStore.updateFiscalSettings(new)
                            }
                        )
                    }
                    .buttonStyle(CommandButtonStyle())
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.8), value: hasTaxChanges)
        }
    }

    // MARK: - Spending

    private var spendingView: some View {
        VStack(spacing: AppSpacing.sm) {
            HStack {
                Text("Allocate revenue across categories")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                Spacer()
                InfoButton(title: "Budget Allocation", helpText: "Allocate less than 100% to run a surplus (strengthens budget health). Allocate more to deficit-spend (funds programs but strains fiscal stability).")
            }

            BudgetSliderCard(
                label: "MILITARY & NATIONAL SECURITY",
                icon: "shield",
                value: draftFiscal.spendingMilitary,
                color: AppColors.accentPrimary,
                helpTitle: "Military Spending",
                helpText: "Directly affects military strength metric. Higher spending deters adversaries but strains other services.",
                onChange: { draftFiscal.spendingMilitary = $0 }
            )

            BudgetSliderCard(
                label: "PUBLIC WELFARE & SERVICES",
                icon: "heart",
                value: draftFiscal.spendingSocial,
                color: AppColors.accentSecondary,
                helpTitle: "Welfare Spending",
                helpText: "Raises equality, health, and approval. Essential for long-term political survival.",
                onChange: { draftFiscal.spendingSocial = $0 }
            )

            BudgetSliderCard(
                label: "INFRASTRUCTURE & TECHNOLOGY",
                icon: "building.columns",
                value: draftFiscal.spendingInfrastructure,
                color: AppColors.accentTertiary,
                helpTitle: "Infrastructure Spending",
                helpText: "Boosts economy and innovation metrics over time. Lower immediate impact but compounds.",
                onChange: { draftFiscal.spendingInfrastructure = $0 }
            )

            let total = draftFiscal.spendingMilitary + draftFiscal.spendingSocial + draftFiscal.spendingInfrastructure
            let balance = 100 - total
            HStack {
                Text("TOTAL ALLOCATION")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Spacer()
                HStack(spacing: 8) {
                    Text("\(Int(total.rounded()))%")
                        .font(AppTypography.data)
                        .foregroundColor(AppColors.foreground)
                        .monospacedDigit()
                    if abs(balance) >= 1 {
                        Text(balance > 0 ? "SURPLUS" : "DEFICIT")
                            .font(AppTypography.micro)
                            .foregroundColor(balance > 0 ? AppColors.success : AppColors.error)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                (balance > 0 ? AppColors.success : AppColors.error).opacity(0.12),
                                in: RoundedRectangle(cornerRadius: 4, style: .continuous)
                            )
                    }
                }
            }
            .padding(.horizontal, 4)

            Group {
                if hasSpendingChanges {
                    Button("Review Budget Changes") {
                        let old = fiscal
                        let new = draftFiscal
                        activeReview = ImpactReview(
                            title: "Budget Impact",
                            impacts: gameStore.computeFiscalMetricImpacts(from: old, to: new),
                            onConfirm: {
                                gameStore.applyFiscalMetricImpacts(from: old, to: new)
                                gameStore.updateFiscalSettings(new)
                            }
                        )
                    }
                    .buttonStyle(CommandButtonStyle())
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.8), value: hasSpendingChanges)
        }
    }

    // MARK: - Forecast

    private var forecastView: some View {
        let metrics = gameStore.state.metrics
        let metricHistory = gameStore.state.metricHistory
        let econ = gameStore.state.countryEconomicState
        let pop = gameStore.state.countryPopulationState
        return VStack(spacing: AppSpacing.sm) {
            ForecastCard(
                title: "Economic Strength",
                icon: "chart.line.uptrend.xyaxis",
                value: formatMetric(metrics["metric_economy"]),
                rawValue: metrics["metric_economy"] ?? 50,
                trend: trendLabel(metrics["metric_economy"]),
                trendColor: trendColor(metrics["metric_economy"]),
                history: metricHistory["metric_economy"] ?? []
            )
            ForecastCard(
                title: "Public Approval",
                icon: "person.3.fill",
                value: formatMetric(metrics["metric_approval"]),
                rawValue: metrics["metric_approval"] ?? 50,
                trend: trendLabel(metrics["metric_approval"]),
                trendColor: trendColor(metrics["metric_approval"]),
                history: metricHistory["metric_approval"] ?? []
            )
            ForecastCard(
                title: "Foreign Relations",
                icon: "globe",
                value: formatMetric(metrics["metric_foreign_relations"]),
                rawValue: metrics["metric_foreign_relations"] ?? 50,
                trend: trendLabel(metrics["metric_foreign_relations"]),
                trendColor: trendColor(metrics["metric_foreign_relations"]),
                history: metricHistory["metric_foreign_relations"] ?? []
            )
            if let econ {
                let gdpNormalized = min(100, max(0, econ.gdpIndex))
                ForecastCard(
                    title: "GDP Index",
                    icon: "building.columns",
                    value: String(format: "$%.1fB", econ.currentGdpBillions),
                    rawValue: gdpNormalized,
                    trend: econ.gdpGrowthRate >= 0 ? String(format: "+%.2f%%/turn", econ.gdpGrowthRate) : String(format: "%.2f%%/turn", econ.gdpGrowthRate),
                    trendColor: econ.gdpGrowthRate >= 0 ? AppColors.success : AppColors.error
                )
            }
            if let pop {
                ForecastCard(
                    title: "Population",
                    icon: "person.2",
                    value: String(format: "%.2fM", pop.populationMillions),
                    rawValue: min(100, max(0, pop.populationMillions / 10)),
                    trend: pop.growthRatePerTurn >= 0 ? "GROWING" : "DECLINING",
                    trendColor: pop.growthRatePerTurn >= 0 ? AppColors.success : AppColors.warning
                )
            }
        }
    }

    // MARK: - Helpers

    private func formatMetric(_ value: Double?) -> String {
        guard let v = value else { return "—" }
        return String(format: "%.1f", v)
    }

    private func trendLabel(_ value: Double?) -> String {
        guard let v = value else { return "NO DATA" }
        if v >= 65 { return "STABLE HIGH" }
        if v >= 45 { return "STABLE" }
        if v >= 30 { return "DECLINING" }
        return "CRITICAL"
    }

    private func trendColor(_ value: Double?) -> Color {
        guard let v = value else { return AppColors.foregroundMuted }
        if v >= 65 { return AppColors.success }
        if v >= 45 { return AppColors.info }
        if v >= 30 { return AppColors.warning }
        return AppColors.error
    }
}

// MARK: - FiscalSliderCard

struct FiscalSliderCard: View {
    let label: String
    let subtitle: String
    let icon: String
    let value: Double
    let range: ClosedRange<Double>
    let unit: String
    let helpTitle: String
    let helpText: String
    let onChange: (Double) -> Void

    private var sliderColor: Color { AppColors.accentPrimary }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: icon)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(sliderColor)
                        Text(label)
                            .font(AppTypography.caption)
                            .fontWeight(.medium)
                            .foregroundColor(AppColors.foreground)
                    }
                    Text(subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                Spacer()
                HStack(spacing: 4) {
                    Text("\(Int(value.rounded()))\(unit)")
                        .font(AppTypography.data)
                        .foregroundColor(AppColors.foreground)
                        .monospacedDigit()
                    InfoButton(title: helpTitle, helpText: helpText)
                }
            }

            Slider(
                value: Binding(get: { value }, set: { onChange($0) }),
                in: range, step: 1
            )
            .tint(sliderColor)
            .onChange(of: value) { _, _ in HapticEngine.shared.selection() }

            HStack {
                Text("\(Int(range.lowerBound))\(unit)")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Spacer()
                Text("\(Int(range.upperBound))\(unit)")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label). Current value: \(Int(value.rounded()))\(unit).")
    }
}

// MARK: - BudgetSliderCard

struct BudgetSliderCard: View {
    let label: String
    let icon: String
    let value: Double
    let color: Color
    let helpTitle: String
    let helpText: String
    let onChange: (Double) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(color)
                    Text(label)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.foreground)
                }
                Spacer()
                HStack(spacing: 4) {
                    Text("\(Int(value.rounded()))%")
                        .font(AppTypography.data)
                        .foregroundColor(AppColors.foreground)
                        .monospacedDigit()
                    InfoButton(title: helpTitle, helpText: helpText)
                }
            }

            Slider(
                value: Binding(get: { value }, set: { onChange($0) }),
                in: 0...100, step: 1
            )
            .tint(color)
            .onChange(of: value) { _, _ in HapticEngine.shared.selection() }

            HStack {
                Text("0%")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Spacer()
                Text("100%")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(AppColors.border)
                    Rectangle()
                        .fill(color)
                        .frame(width: geo.size.width * CGFloat((value / 100).isNaN ? 0 : min(1, max(0, value / 100))))
                        .animation(AppMotion.quickSnap, value: value)
                }
            }
            .frame(height: 3)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label). Current allocation: \(Int(value.rounded()))%.")
    }
}

// MARK: - ForecastCard

struct ForecastCard: View {
    let title: String
    let icon: String
    let value: String
    let rawValue: Double
    let trend: String
    let trendColor: Color
    var history: [Double] = []

    @State private var chartProgress: CGFloat = 0

    private var chartPoints: [Double] {
        if history.count >= 2 {
            return Array(history.suffix(12))
        }
        let base = rawValue
        let direction: Double = trendColor == AppColors.success ? 1.0 :
                                trendColor == AppColors.error ? -1.0 : 0.2
        return (0..<8).map { i in
            let noise = Double.random(in: -2...2)
            return min(100, max(0, base + direction * Double(i) * 0.8 + noise))
        }
    }

    var body: some View {
        HStack(spacing: AppSpacing.md) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(trendColor)
                    Text(title)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.foregroundMuted)
                }

                Text(value)
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.foreground)
                    .monospacedDigit()

                Text(trend)
                    .font(AppTypography.micro)
                    .foregroundColor(trendColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(trendColor.opacity(0.12))
                    )
            }

            Spacer()

            ZStack {
                SparklineArea(values: chartPoints)
                    .fill(
                        LinearGradient(
                            colors: [trendColor.opacity(0.15), trendColor.opacity(0.0)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                SparklinePath(values: chartPoints)
                    .trim(from: 0, to: chartProgress)
                    .stroke(trendColor, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            }
            .frame(width: 100, height: 36)
            .animation(AppMotion.dramatic, value: chartProgress)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .onAppear {
            withAnimation(AppMotion.dramatic.delay(0.1)) {
                chartProgress = 1.0
            }
        }
        .onChange(of: rawValue) { _, _ in
            chartProgress = 0
            withAnimation(AppMotion.dramatic) { chartProgress = 1.0 }
        }
    }
}

private struct SparklinePath: Shape {
    let values: [Double]

    func path(in rect: CGRect) -> Path {
        guard values.count >= 2 else { return Path() }
        var path = Path()
        let minV = (values.min() ?? 0) - 5
        let maxV = (values.max() ?? 100) + 5
        let range = max(1, maxV - minV)
        let points = values.enumerated().map { i, v -> CGPoint in
            let x = rect.width * CGFloat(i) / CGFloat(values.count - 1)
            let y = rect.height * (1 - CGFloat((v - minV) / range))
            return CGPoint(x: x, y: y)
        }
        path.move(to: points[0])
        for pt in points.dropFirst() {
            path.addLine(to: pt)
        }
        return path
    }
}

private struct SparklineArea: Shape {
    let values: [Double]

    func path(in rect: CGRect) -> Path {
        guard values.count >= 2 else { return Path() }
        var path = Path()
        let minV = (values.min() ?? 0) - 5
        let maxV = (values.max() ?? 100) + 5
        let range = max(1, maxV - minV)
        let points = values.enumerated().map { i, v -> CGPoint in
            let x = rect.width * CGFloat(i) / CGFloat(values.count - 1)
            let y = rect.height * (1 - CGFloat((v - minV) / range))
            return CGPoint(x: x, y: y)
        }
        path.move(to: CGPoint(x: 0, y: rect.height))
        path.addLine(to: points[0])
        for pt in points.dropFirst() { path.addLine(to: pt) }
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        path.closeSubpath()
        return path
    }
}
