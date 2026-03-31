import SwiftUI

struct PolicyChangesSheet: View {
    let review: ImpactReview

    @Environment(\.dismiss) private var dismiss
    @State private var confirmed = false
    @State private var visibleCount = 0

    private var impacts: [MetricImpact] { review.impacts }
    private var title: String { review.title }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    statusBanner
                    if impacts.isEmpty {
                        Spacer()
                        Text(confirmed ? "No changes recorded" : "No measurable impact projected")
                            .font(AppTypography.bodySmall)
                            .foregroundColor(AppColors.foregroundSubtle)
                            .italic()
                        Spacer()
                    } else {
                        ScrollView {
                            VStack(spacing: 1) {
                                ForEach(Array(impacts.enumerated()), id: \.offset) { index, impact in
                                    if confirmed {
                                        ImpactRow(impact: impact, projected: false)
                                            .opacity(index < visibleCount ? 1 : 0)
                                            .offset(y: index < visibleCount ? 0 : 6)
                                    } else {
                                        ImpactRow(impact: impact, projected: true)
                                    }
                                }
                            }
                            .padding(.top, AppSpacing.md)
                        }
                    }

                    if !confirmed {
                        VStack(spacing: AppSpacing.sm) {
                            Button("Confirm") {
                                review.onConfirm()
                                withAnimation(AppMotion.standard) { confirmed = true }
                            }
                            .buttonStyle(CommandButtonStyle())

                            Button("Cancel") { dismiss() }
                                .buttonStyle(GhostButtonStyle())
                                .frame(maxWidth: .infinity)
                        }
                        .padding(AppSpacing.md)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
            }
            .navigationTitle(confirmed ? "Changes Applied" : title)
            .navigationBarTitleDisplayMode(.inline)
            .animation(AppMotion.standard, value: confirmed)
        }
        .task(id: confirmed) {
            guard confirmed else { return }
            for i in impacts.indices {
                try? await Task.sleep(for: .milliseconds(150 + 110 * i))
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                    visibleCount = i + 1
                }
            }
            let holdMs = 150 + 110 * max(impacts.count, 1) + 3000
            try? await Task.sleep(for: .milliseconds(holdMs))
            dismiss()
        }
    }

    @ViewBuilder
    private var statusBanner: some View {
        HStack(spacing: 6) {
            if confirmed {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(AppColors.success)
                Text("APPLIED — METRICS UPDATED")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.success)
                    .tracking(1)
            } else {
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 11, weight: .medium))
                Text("PROJECTED — ACTUAL RESULTS MAY VARY")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .tracking(1)
            }
            Spacer()
        }
        .foregroundColor(confirmed ? AppColors.success : AppColors.foregroundSubtle)
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(confirmed ? AppColors.success.opacity(0.08) : AppColors.backgroundMuted)
        .animation(AppMotion.standard, value: confirmed)
    }
}

private struct ImpactRow: View {
    let impact: MetricImpact
    let projected: Bool

    private var deltaColor: Color {
        impact.delta >= 0 ? AppColors.success : AppColors.error
    }

    private var deltaText: String {
        let formatted = String(format: "%.1f", abs(impact.delta))
        let signed = impact.delta >= 0 ? "+\(formatted)" : "-\(formatted)"
        return projected ? "~\(signed)" : signed
    }

    var body: some View {
        HStack {
            Text(impact.name)
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foreground)
            Spacer()
            HStack(spacing: 4) {
                if !projected {
                    Image(systemName: impact.delta >= 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(deltaColor)
                }
                Text(deltaText)
                    .font(AppTypography.data)
                    .foregroundColor(projected ? deltaColor.opacity(0.75) : deltaColor)
                    .monospacedDigit()
                    .italic(projected)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 12)
        .background(AppColors.backgroundElevated)
    }
}
