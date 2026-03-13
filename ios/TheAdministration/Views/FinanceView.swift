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

    private let tabs = ["TAXATION", "SPENDING", "FORECAST"]

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    ScreenHeader(
                        protocolLabel: "ECONOMIC_COMMAND_LINK_V8",
                        title: "FISCAL AUTHORITY"
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
        HStack(spacing: 0) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                Button(action: {
                    HapticEngine.shared.light()
                    withAnimation(AppMotion.quickSnap) { activeTab = index }
                }) {
                    VStack(spacing: 0) {
                        Text(title)
                            .font(AppTypography.micro)
                            .foregroundColor(activeTab == index ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                            .tracking(2)
                            .padding(.vertical, 12)
                            .frame(maxWidth: .infinity)

                        Rectangle()
                            .fill(activeTab == index ? AppColors.accentPrimary : Color.clear)
                            .frame(height: 2)
                            .animation(AppMotion.quickSnap, value: activeTab)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .background(AppColors.border)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
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
                color: AppColors.error,
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
                color: AppColors.success,
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
                color: AppColors.info,
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
        return VStack(spacing: 16) {
            ForecastCard(
                title: "Economic Strength",
                icon: "chart.line.uptrend.xyaxis",
                value: formatMetric(metrics["metric_economy"]),
                rawValue: metrics["metric_economy"] ?? 50,
                trend: trendLabel(metrics["metric_economy"]),
                trendColor: trendColor(metrics["metric_economy"])
            )
            ForecastCard(
                title: "Public Approval",
                icon: "person.3.fill",
                value: formatMetric(metrics["metric_approval"]),
                rawValue: metrics["metric_approval"] ?? 50,
                trend: trendLabel(metrics["metric_approval"]),
                trendColor: trendColor(metrics["metric_approval"])
            )
            ForecastCard(
                title: "Foreign Relations",
                icon: "globe",
                value: formatMetric(metrics["metric_foreign_relations"]),
                rawValue: metrics["metric_foreign_relations"] ?? 50,
                trend: trendLabel(metrics["metric_foreign_relations"]),
                trendColor: trendColor(metrics["metric_foreign_relations"])
            )
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

    private var sliderColor: Color { AppColors.metricColor(for: value / range.upperBound * 100) }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Rectangle()
                        .fill(sliderColor.opacity(0.1))
                        .frame(width: 40, height: 40)
                        .overlay(Rectangle().stroke(sliderColor.opacity(0.3), lineWidth: 1))
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(sliderColor)
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(label)
                        .font(AppTypography.caption)
                        .fontWeight(.bold)
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
                Text("ADJUSTMENT RANGE")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(2)

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
        .background(AppColors.border)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
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
                        .frame(width: geo.size.width * CGFloat(value / 100))
                        .animation(AppMotion.quickSnap, value: value)
                }
            }
            .frame(height: 3)
        }
        .padding(20)
        .background(AppColors.border)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
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

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(trendColor)
                    Text(title.uppercased())
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(2)
                }
                Spacer()
                Text(trend)
                    .font(AppTypography.micro)
                    .foregroundColor(trendColor)
                    .tracking(1)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(trendColor.opacity(0.1))
                    .overlay(Rectangle().stroke(trendColor.opacity(0.3), lineWidth: 0.5))
            }

            Text(value)
                .font(AppTypography.dataLarge)
                .foregroundColor(trendColor)
                .monospacedDigit()

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(AppColors.border)
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [trendColor.opacity(0.8), trendColor.opacity(0.2)],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(rawValue / 100))
                        .animation(AppMotion.standard, value: rawValue)
                }
            }
            .frame(height: 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(AppColors.border)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
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
