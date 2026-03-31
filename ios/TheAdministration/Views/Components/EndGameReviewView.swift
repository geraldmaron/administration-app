import SwiftUI

struct EndGameReviewView: View {
    let review: ScoringEngine.EndGameReview
    let onRestart: () -> Void

    @State private var gradeRevealed = false
    @State private var gradeScale: CGFloat = 0.3
    @State private var headerVisible = false
    @State private var metricsVisible = false
    @State private var achievementsVisible = false

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    headerSection
                    gradeSection
                    if metricsVisible { metricsSection }
                    if achievementsVisible {
                        achievementsSection
                        failuresSection
                        decisionsSection
                    }

                    Spacer(minLength: 16)

                    Button(action: onRestart) {
                        Text("START NEW CAMPAIGN")
                    }
                    .buttonStyle(CommandButtonStyle())
                    .opacity(achievementsVisible ? 1 : 0)
                }
                .padding(24)
            }
        }
        .onAppear { runRevealSequence() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("END OF TERM")
                .font(AppTypography.micro)
                .foregroundColor(AppColors.accentPrimary)
                .tracking(3)
                .opacity(headerVisible ? 1 : 0)

            Text(review.title)
                .font(AppTypography.displayMedium)
                .foregroundColor(AppColors.foreground)
                .tracking(-1)
                .fixedSize(horizontal: false, vertical: true)
                .opacity(headerVisible ? 1 : 0)
                .offset(y: headerVisible ? 0 : 10)

            Text(review.description)
                .font(AppTypography.body)
                .foregroundColor(AppColors.foregroundMuted)
                .fixedSize(horizontal: false, vertical: true)
                .opacity(headerVisible ? 1 : 0)
        }
        .animation(AppMotion.standard, value: headerVisible)
    }

    // MARK: - Grade

    private var gradeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .bottom, spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PERFORMANCE GRADE")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(3)
                        .opacity(headerVisible ? 1 : 0)

                    Text(review.performanceGrade)
                        .font(.system(size: 96, weight: .black, design: .monospaced))
                        .foregroundColor(gradeColor(review.performanceGrade))
                        .scaleEffect(gradeScale, anchor: .bottomLeading)
                        .shadow(color: gradeColor(review.performanceGrade).opacity(0.4), radius: 20)
                        .animation(AppMotion.dramatic, value: gradeRevealed)
                }

                Spacer()
            }

            Text(review.overallAssessment)
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foreground)
                .fixedSize(horizontal: false, vertical: true)
                .opacity(gradeRevealed ? 1 : 0)
                .animation(AppMotion.standard.delay(0.4), value: gradeRevealed)
        }
        .padding(20)
        .background(gradeColor(review.performanceGrade).opacity(0.06))
        .overlay(Rectangle().stroke(gradeColor(review.performanceGrade).opacity(0.25), lineWidth: 1))
    }

    // MARK: - Metrics

    private var metricsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("METRIC TRAJECTORY")
                .font(AppTypography.label)
                .foregroundColor(AppColors.foregroundMuted)
                .tracking(3)

            ForEach(Array(review.metrics.prefix(6).enumerated()), id: \.element.id) { index, metric in
                MetricDeltaRow(metric: metric)
                    .staggerEntrance(index: index, offset: 10)
            }
        }
    }

    // MARK: - Achievements

    private var achievementsSection: some View {
        Group {
            if review.achievements.isEmpty { EmptyView() }
            else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("ACHIEVEMENTS")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.success)
                        .tracking(3)

                    ForEach(Array(review.achievements.prefix(4).enumerated()), id: \.offset) { index, item in
                        HStack(spacing: 12) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 18))
                                .foregroundColor(AppColors.success)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.title)
                                    .font(AppTypography.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(AppColors.foreground)
                                Text(item.description)
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        .padding(12)
                        .background(AppColors.success.opacity(0.06))
                        .overlay(Rectangle().stroke(AppColors.success.opacity(0.25), lineWidth: 1))
                        .staggerEntrance(index: index, offset: 8)
                    }
                }
            }
        }
    }

    // MARK: - Failures

    private var failuresSection: some View {
        Group {
            if review.failures.isEmpty { EmptyView() }
            else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("FAILURE POINTS")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.error)
                        .tracking(3)

                    ForEach(Array(review.failures.prefix(4).enumerated()), id: \.offset) { index, item in
                        HStack(spacing: 12) {
                            Image(systemName: "xmark.seal.fill")
                                .font(.system(size: 18))
                                .foregroundColor(AppColors.error)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.title)
                                    .font(AppTypography.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(AppColors.foreground)
                                Text(item.description)
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        .padding(12)
                        .background(AppColors.error.opacity(0.06))
                        .overlay(Rectangle().stroke(AppColors.error.opacity(0.25), lineWidth: 1))
                        .staggerEntrance(index: index, offset: 8)
                    }
                }
            }
        }
    }

    // MARK: - Decisions

    private var decisionsSection: some View {
        Group {
            if review.keyDecisions.isEmpty { EmptyView() }
            else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("KEY DECISIONS")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(3)

                    ForEach(Array(review.keyDecisions.prefix(5).enumerated()), id: \.offset) { index, item in
                        VStack(alignment: .leading, spacing: 5) {
                            Text("TURN \(item.turn) — \(item.scenario)")
                                .font(AppTypography.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(AppColors.foreground)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("Decision: \(item.decision)")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundMuted)
                            Text(item.impact)
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(12)
                        .background(AppColors.backgroundElevated)
                        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                        .staggerEntrance(index: index, offset: 8)
                    }
                }
            }
        }
    }

    // MARK: - Reveal Sequence

    private func runRevealSequence() {
        withAnimation(AppMotion.standard) { headerVisible = true }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            HapticEngine.shared.heavy()
            gradeRevealed = true
            withAnimation(AppMotion.dramatic) { gradeScale = 1.0 }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            withAnimation(AppMotion.standard) { metricsVisible = true }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
            withAnimation(AppMotion.standard) { achievementsVisible = true }
        }
    }

    private func gradeColor(_ grade: String) -> Color {
        AppColors.gradeColor(for: grade)
    }

    private func changeLabel(for metric: ScoringEngine.EndGameMetricChange) -> String {
        if metric.netChange > 0 { return "Improved \(metric.netChange)pts" }
        if metric.netChange < 0 { return "Declined \(abs(metric.netChange))pts" }
        return "No net change"
    }
}

// MARK: - MetricDeltaRow

private struct MetricDeltaRow: View {
    let metric: ScoringEngine.EndGameMetricChange

    private var deltaColor: Color {
        metric.netChange > 0 ? AppColors.success : metric.netChange < 0 ? AppColors.error : AppColors.foregroundSubtle
    }

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(metric.name)
                    .font(AppTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.foreground)
                Text("\(metric.startValue) → \(metric.endValue)")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundMuted)
                    .monospacedDigit()
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text(metric.netChange >= 0 ? "+\(metric.netChange)" : "\(metric.netChange)")
                    .font(AppTypography.data)
                    .foregroundColor(deltaColor)
                    .monospacedDigit()

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(AppColors.border)
                        Rectangle()
                            .fill(AppColors.accentPrimary.opacity(0.8))
                            .frame(width: geo.size.width * CGFloat(min(1.0, abs(Double(metric.netChange)) / 20.0)))
                    }
                }
                .frame(width: 60, height: 2)
            }
        }
        .padding(14)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
    }
}
