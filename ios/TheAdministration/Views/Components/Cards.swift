/// Cards
/// Reusable card components for The Administration design system.
/// Clean, minimal surfaces — whitespace over decoration.
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
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.05))
        )
    }
}

// MARK: - MetricCard

struct MetricCard: View {
    let label: String
    let value: Double
    let icon: String
    let isActive: Bool
    let onTap: () -> Void

    private var color: Color { AppColors.metricColor(for: CGFloat(value)) }

    var body: some View {
        Button(action: {
            HapticEngine.shared.light()
            onTap()
        }) {
            VStack(spacing: 6) {
                Text("\(Int(value))")
                    .font(AppTypography.data)
                    .foregroundColor(color)

                Text(label)
                    .font(AppTypography.micro)
                    .foregroundColor(isActive ? color : AppColors.foregroundSubtle)
                    .textCase(.uppercase)
                    .multilineTextAlignment(.center)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)

                ZStack {
                    Circle()
                        .trim(from: 0, to: 0.75)
                        .stroke(AppColors.border, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                        .rotationEffect(.degrees(135))
                    Circle()
                        .trim(from: 0, to: CGFloat(max(0, min(0.75, (value / 100) * 0.75))))
                        .stroke(
                            LinearGradient(
                                colors: [color.opacity(0.5), color],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            style: StrokeStyle(lineWidth: 3.5, lineCap: .round)
                        )
                        .rotationEffect(.degrees(135))
                }
                .frame(width: 28, height: 28)
                .animation(AppMotion.standard, value: value)
            }
            .padding(AppSpacing.sm)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(isActive ? color.opacity(0.08) : Color.white.opacity(0.04))
            )
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
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(isHighlighted ? AppColors.accentPrimary.opacity(0.08) : Color.white.opacity(0.05))
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
                Spacer()
                if let detail = detail {
                    Text(detail)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }

            Text(title)
                .font(AppTypography.headline)
                .foregroundColor(AppColors.foreground)

            content
        }
        .padding(AppSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
        ZStack(alignment: .topTrailing) {
            Button(action: {
                HapticEngine.shared.medium()
                onSelect()
            }) {
                HStack(alignment: .top, spacing: 10) {
                    Text(Self.optionLetters[safe: index] ?? "")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(isSelected ? .white : AppColors.accentPrimary)
                        .frame(width: 22, height: 22)
                        .background(isSelected ? AppColors.accentPrimary : AppColors.accentPrimary.opacity(0.12), in: Circle())

                    VStack(alignment: .leading, spacing: 6) {
                        Text(option.text)
                            .font(AppTypography.bodySmall)
                            .fontWeight(.medium)
                            .foregroundColor(isDimmed ? AppColors.foregroundSubtle : AppColors.foreground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.trailing, onAdvisor != nil ? 28 : 0)

                        if let feedback = option.advisorFeedback, !feedback.isEmpty {
                            let supports = feedback.filter { ["support", "approve", "positive"].contains($0.stance.lowercased()) }.count
                            let opposes = feedback.filter { ["oppose", "reject", "negative"].contains($0.stance.lowercased()) }.count
                            if supports > 0 || opposes > 0 {
                                HStack(spacing: 10) {
                                    if supports > 0 {
                                        HStack(spacing: 3) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 9))
                                                .foregroundColor(AppColors.success)
                                            Text("\(supports)")
                                                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                                .foregroundColor(AppColors.success)
                                        }
                                    }
                                    if opposes > 0 {
                                        HStack(spacing: 3) {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.system(size: 9))
                                                .foregroundColor(AppColors.error)
                                            Text("\(opposes)")
                                                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                                .foregroundColor(AppColors.error)
                                        }
                                    }
                                    Text("cabinet")
                                        .font(.system(size: 9))
                                        .foregroundColor(AppColors.foregroundSubtle)
                                }
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(
                            isSelected ? AppColors.accentPrimary.opacity(0.10) :
                            isDimmed ? Color.white.opacity(0.02) : Color.white.opacity(0.05)
                        )
                )
            }
            .buttonStyle(.plain)

            if let onAdvisor = onAdvisor {
                Button(action: onAdvisor) {
                    Image(systemName: "person.text.rectangle")
                        .font(.system(size: 13))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .padding(8)
                }
                .accessibilityLabel("View cabinet briefing for this option")
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
