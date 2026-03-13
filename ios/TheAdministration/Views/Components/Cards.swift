/// Cards
/// Reusable card components for The Administration design system.
/// Consolidates the many inline card patterns across all view files.
import SwiftUI

// MARK: - CommandCard

struct CommandCard<Content: View>: View {
    let title: String?
    let subtitle: String?
    @ViewBuilder let content: Content

    init(
        title: String? = nil,
        subtitle: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title = title {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                        .textCase(.uppercase)
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(AppTypography.bodySmall)
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }
            }
            content
        }
        .padding(AppSpacing.cardPadding)
        .cardStyle(.elevated)
    }
}

// MARK: - MetricCard

struct MetricCard: View {
    let label: String
    let value: Double
    let icon: String
    let isActive: Bool
    let onTap: () -> Void

    private var color: Color { AppColors.metricColor(for: value) }

    var body: some View {
        Button(action: {
            HapticEngine.shared.light()
            onTap()
        }) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(isActive ? color.opacity(0.15) : AppColors.backgroundElevated)
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(isActive ? color : AppColors.foregroundSubtle)
                }

                Text("\(Int(value))")
                    .font(AppTypography.data)
                    .foregroundColor(color)

                Text(label)
                    .font(AppTypography.micro)
                    .foregroundColor(isActive ? color : AppColors.foregroundSubtle)
                    .textCase(.uppercase)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(AppColors.border)
                        Rectangle()
                            .fill(color)
                            .frame(width: geometry.size.width * CGFloat(value / 100))
                    }
                }
                .frame(height: 2)
            }
            .padding(AppSpacing.md)
            .background(isActive ? color.opacity(0.08) : AppColors.border)
            .overlay(Rectangle().stroke(isActive ? color.opacity(0.4) : AppColors.border, lineWidth: isActive ? 1 : 0.5))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - InteractiveCard

struct InteractiveCard<Content: View>: View {
    var isHighlighted: Bool = false
    let onTap: () -> Void
    @ViewBuilder let content: Content

    init(isHighlighted: Bool = false, onTap: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.isHighlighted = isHighlighted
        self.onTap = onTap
        self.content = content()
    }

    var body: some View {
        Button(action: {
            HapticEngine.shared.light()
            onTap()
        }) {
            content
                .padding(AppSpacing.md)
        }
        .buttonStyle(.plain)
        .background(isHighlighted ? AppColors.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
        .overlay(
            Rectangle()
                .stroke(isHighlighted ? AppColors.accentPrimary.opacity(0.4) : AppColors.border, lineWidth: 1)
        )
    }
}

// MARK: - DossierCard

struct DossierCard<Content: View>: View {
    let category: String
    let title: String
    let detail: String?
    @ViewBuilder let content: Content

    init(category: String, title: String, detail: String? = nil, @ViewBuilder content: () -> Content) {
        self.category = category
        self.title = title
        self.detail = detail
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(category.uppercased())
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.accentPrimary)
                    .tracking(3)
                Spacer()
                if let detail = detail {
                    Text(detail)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }

            Rectangle()
                .fill(AppColors.accentPrimary)
                .frame(height: 1)

            Text(title)
                .font(AppTypography.headline)
                .foregroundColor(AppColors.foreground)

            content
        }
        .padding(AppSpacing.md)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.2), lineWidth: 1))
    }
}

// MARK: - ScenarioOptionCard

struct ScenarioOptionCard: View {
    let option: Option
    let index: Int
    let isSelected: Bool
    let isDimmed: Bool
    let onSelect: () -> Void
    let onAdvisor: (() -> Void)?

    private static let optionLetters = ["A", "B", "C", "D"]

    private var impactBadges: [(metricId: String, value: Double)] {
        Array(option.effects.prefix(4).map { ($0.targetMetricId, $0.value) })
    }

    private func metricShortLabel(_ id: String) -> String {
        String(id.replacingOccurrences(of: "metric_", with: "").prefix(3).uppercased())
    }

    var body: some View {
        HStack(spacing: 8) {
            Button(action: {
                HapticEngine.shared.medium()
                onSelect()
            }) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .top, spacing: 8) {
                        Text(Self.optionLetters[safe: index] ?? "")
                            .font(AppTypography.micro)
                            .foregroundColor(isSelected ? AppColors.background : AppColors.accentPrimary)
                            .frame(width: 20, height: 20)
                            .background(isSelected ? AppColors.accentPrimary : AppColors.accentPrimary.opacity(0.12))
                            .clipShape(Circle())

                        Text(option.text)
                            .font(AppTypography.bodySmall)
                            .fontWeight(.semibold)
                            .foregroundColor(isDimmed ? AppColors.foregroundSubtle : AppColors.foreground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if !impactBadges.isEmpty {
                        HStack(spacing: 6) {
                            ForEach(impactBadges, id: \.metricId) { badge in
                                HStack(spacing: 3) {
                                    Text(metricShortLabel(badge.metricId))
                                        .font(AppTypography.micro)
                                    Text(badge.value >= 0 ? "+\(Int(badge.value))" : "\(Int(badge.value))")
                                        .font(AppTypography.micro)
                                }
                                .foregroundColor(badge.value >= 0 ? AppColors.success : AppColors.error)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background((badge.value >= 0 ? AppColors.success : AppColors.error).opacity(0.1))
                                .overlay(
                                    Rectangle().stroke(
                                        (badge.value >= 0 ? AppColors.success : AppColors.error).opacity(0.3),
                                        lineWidth: 0.5
                                    )
                                )
                            }
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    isSelected ? AppColors.accentPrimary.opacity(0.1) :
                    isDimmed ? AppColors.background : AppColors.border
                )
                .overlay(
                    Rectangle().stroke(
                        isSelected ? AppColors.accentPrimary.opacity(0.5) : AppColors.borderStrong,
                        lineWidth: 1
                    )
                )
            }
            .buttonStyle(.plain)

            if let onAdvisor = onAdvisor {
                Button(action: onAdvisor) {
                    Image(systemName: "person.text.rectangle")
                        .font(.system(size: 16))
                        .foregroundColor(AppColors.foregroundMuted)
                        .padding(12)
                        .background(AppColors.backgroundElevated)
                        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                }
                .accessibilityLabel("View advisor briefing for this option")
            }
        }
    }
}

// MARK: - Safe Array Subscript

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
