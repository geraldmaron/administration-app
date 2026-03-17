/// FinanceView
/// Fiscal authority screen. Contains three tabs — taxation, spending,
/// and market forecast. Animated tab indicator, gradient slider tracks,
/// sparkline-style forecast cards, and clearly labeled slider endpoints.
import SwiftUI

struct FinanceView: View {
    @ObservedObject var gameStore: GameStore
    @State private var activeTab = 0
    @Namespace private var tabIndicator

    private var fiscal: FiscalSettings {
        gameStore.state.fiscalSettings ?? .defaults
    }

    private let tabs = ["Taxation", "Spending", "Forecast"]

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    ScreenHeader(
                        protocolLabel: "ECONOMIC_COMMAND_LINK_V8",
                        title: "Finance"
                    )
                    .padding(.horizontal, 16)

                    // Animated tab indicator
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
                    .padding(.horizontal, 16)
                    .transition(.opacity)
                    .animation(AppMotion.quickSnap, value: activeTab)
                }
                .padding(.bottom, AppSpacing.tabBarClearance)
            }
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
        .padding(.horizontal, 16)
    }

    // MARK: - Taxation

    private var taxationView: some View {
        VStack(spacing: 16) {
            FiscalSliderCard(
                label: "Personal Income Tax",
                subtitle: "Impacts consumer spending and social stability",
                icon: "person.3",
                value: fiscal.taxIncome,
                range: 0...60,
                unit: "%",
                helpTitle: "Income Tax",
                helpText: "Higher rates fund public services but reduce disposable income and consumer spending.",
                onChange: { var f = fiscal; f.taxIncome = $0; gameStore.updateFiscalSettings(f) }
            )

            FiscalSliderCard(
                label: "Corporate Tax Rate",
                subtitle: "Impacts business investment and economic growth",
                icon: "building.2",
                value: fiscal.taxCorporate,
                range: 0...60,
                unit: "%",
                helpTitle: "Corporate Tax",
                helpText: "Lower rates attract investment but reduce government revenue available for social programs.",
                onChange: { var f = fiscal; f.taxCorporate = $0; gameStore.updateFiscalSettings(f) }
            )
        }
    }

    // MARK: - Spending

    private var spendingView: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Categories must sum to 100%")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                Spacer()
                InfoButton(title: "Budget Allocation", helpText: "When you adjust one category, the others are proportionally redistributed to maintain 100%.")
            }

            BudgetSliderCard(
                label: "Military & National Security",
                icon: "shield",
                value: fiscal.spendingMilitary,
                color: AppColors.accentPrimary,
                helpTitle: "Military Spending",
                helpText: "Directly affects military strength metric. Higher spending deters adversaries but strains other services.",
                onChange: { newValue in
                    var updated = fiscal
                    let delta = newValue - updated.spendingMilitary
                    updated.spendingMilitary = newValue
                    updated = redistributeBudget(updated, changed: .military, delta: delta)
                    gameStore.updateFiscalSettings(updated)
                }
            )

            BudgetSliderCard(
                label: "Public Welfare & Services",
                icon: "heart",
                value: fiscal.spendingSocial,
                color: AppColors.accentSecondary,
                helpTitle: "Welfare Spending",
                helpText: "Raises equality, health, and approval. Essential for long-term political survival.",
                onChange: { newValue in
                    var updated = fiscal
                    let delta = newValue - updated.spendingSocial
                    updated.spendingSocial = newValue
                    updated = redistributeBudget(updated, changed: .social, delta: delta)
                    gameStore.updateFiscalSettings(updated)
                }
            )

            BudgetSliderCard(
                label: "Infrastructure & Technology",
                icon: "building.columns",
                value: fiscal.spendingInfrastructure,
                color: AppColors.accentTertiary,
                helpTitle: "Infrastructure Spending",
                helpText: "Boosts economy and innovation metrics over time. Lower immediate impact but compounds.",
                onChange: { newValue in
                    var updated = fiscal
                    let delta = newValue - updated.spendingInfrastructure
                    updated.spendingInfrastructure = newValue
                    updated = redistributeBudget(updated, changed: .infrastructure, delta: delta)
                    gameStore.updateFiscalSettings(updated)
                }
            )

            let total = fiscal.spendingMilitary + fiscal.spendingSocial + fiscal.spendingInfrastructure
            HStack {
                Text("TOTAL ALLOCATION")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(2)
                Spacer()
                Text("\(Int(total.rounded()))%")
                    .font(AppTypography.data)
                    .foregroundColor(abs(total - 100) < 1 ? AppColors.success : AppColors.error)
                    .monospacedDigit()
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Forecast

    private var forecastView: some View {
        let metrics = gameStore.state.metrics
        let metricHistory = gameStore.state.metricHistory
        let econ = gameStore.state.countryEconomicState
        let pop = gameStore.state.countryPopulationState
        return VStack(spacing: 16) {
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

    private enum BudgetCategory { case military, social, infrastructure }

    private func redistributeBudget(_ s: FiscalSettings, changed: BudgetCategory, delta: Double) -> FiscalSettings {
        var result = s
        let remaining = -delta / 2.0
        switch changed {
        case .military:
            result.spendingSocial       = max(0, s.spendingSocial + remaining)
            result.spendingInfrastructure = max(0, s.spendingInfrastructure + remaining)
        case .social:
            result.spendingMilitary     = max(0, s.spendingMilitary + remaining)
            result.spendingInfrastructure = max(0, s.spendingInfrastructure + remaining)
        case .infrastructure:
            result.spendingMilitary     = max(0, s.spendingMilitary + remaining)
            result.spendingSocial       = max(0, s.spendingSocial + remaining)
        }
        return result
    }

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
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(sliderColor.opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(sliderColor)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(label)
                        .font(AppTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.foreground)
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

            VStack(alignment: .leading, spacing: 6) {
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
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(color)
                    .frame(width: 20)
                Text(label)
                    .font(AppTypography.caption)
                    .fontWeight(.bold)
                    .foregroundColor(AppColors.foreground)
                    .tracking(0.5)
                Spacer()
                HStack(spacing: 4) {
                    Text("\(Int(value.rounded()))%")
                        .font(AppTypography.data)
                        .foregroundColor(AppColors.foreground)
                        .monospacedDigit()
                    InfoButton(title: helpTitle, helpText: helpText)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
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
            }

            // Sparkline bar
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
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(trendColor)
                    Text(title)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.foregroundMuted)
                }
                Spacer()
                Text(trend)
                    .font(AppTypography.micro)
                    .foregroundColor(trendColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(trendColor.opacity(0.12))
                    )
            }

            Text(value)
                .font(AppTypography.dataLarge)
                .foregroundColor(trendColor)
                .monospacedDigit()

            ZStack {
                SparklineArea(values: chartPoints)
                    .fill(
                        LinearGradient(
                            colors: [trendColor.opacity(0.20), trendColor.opacity(0.0)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                SparklinePath(values: chartPoints)
                    .trim(from: 0, to: chartProgress)
                    .stroke(trendColor, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            }
            .frame(height: 48)
            .animation(AppMotion.dramatic, value: chartProgress)

            HStack {
                Text("T-\(min(chartPoints.count - 1, 11))")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle.opacity(0.5))
                Spacer()
                Text("NOW")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.foregroundSubtle.opacity(0.5))
                    .tracking(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
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

// MARK: - FinanceTabButton (kept for compatibility)

struct FinanceTabButton: View {
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.micro)
                .foregroundColor(isActive ? AppColors.background : AppColors.foregroundSubtle)
                .tracking(2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(isActive ? AppColors.accentPrimary : Color.clear)
        }
        .buttonStyle(.plain)
    }
}
