import SwiftUI

struct OnboardingOverlay: View {
    @Binding var isVisible: Bool
    @State private var currentStep = 0

    private let steps: [OnboardingStep] = [
        OnboardingStep(
            title: "Your Executive Desk",
            body: "Command center for your administration. Track 27 metrics across your nation and respond to scenarios each turn.",
            icon: "rectangle.grid.2x2"
        ),
        OnboardingStep(
            title: "Scenarios & Decisions",
            body: "Each turn presents a scenario. Look for colored badges on each option — they show which metrics are affected and by how much.",
            icon: "bolt.fill"
        ),
        OnboardingStep(
            title: "Cabinet Advisors",
            body: "Tap the advisor icon on any option to consult your cabinet before deciding. Their expertise level affects outcomes.",
            icon: "person.text.rectangle"
        ),
        OnboardingStep(
            title: "Trust Your Gut",
            body: "When none of the authored options fit, write your own policy directive. The AI resolves it into real consequences. You have limited uses for the entire run — spend them where they count.",
            icon: "brain.head.profile"
        ),
        OnboardingStep(
            title: "Watch Your Metrics",
            body: "Approval is derived from all other metrics. Red means crisis. Keep economy, order, and health strong to survive your term.",
            icon: "chart.bar.fill"
        )
    ]

    var body: some View {
        ZStack {
            Color.black.opacity(0.88)
                .ignoresSafeArea()
                .onTapGesture { advance() }

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 28) {
                    ZStack {
                        Circle()
                            .fill(AppColors.accentPrimary.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Circle()
                            .stroke(AppColors.accentPrimary.opacity(0.2), lineWidth: 1)
                            .frame(width: 80, height: 80)
                        Image(systemName: steps[currentStep].icon)
                            .font(.system(size: 30, weight: .medium))
                            .foregroundColor(AppColors.accentPrimary)
                    }
                    .accentGlow(color: AppColors.accentPrimary, radius: 24)

                    VStack(spacing: 12) {
                        Text(steps[currentStep].title)
                            .font(AppTypography.headline)
                            .foregroundColor(AppColors.foreground)
                            .multilineTextAlignment(.center)

                        Text(steps[currentStep].body)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.foregroundMuted)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal, 8)

                    HStack(spacing: 8) {
                        ForEach(0..<steps.count, id: \.self) { i in
                            Circle()
                                .fill(i == currentStep ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                                .frame(
                                    width: i == currentStep ? 8 : 5,
                                    height: i == currentStep ? 8 : 5
                                )
                                .animation(AppMotion.quickSnap, value: currentStep)
                        }
                    }
                }
                .padding(AppSpacing.sectionPadding)
                .background(AppColors.backgroundElevated)
                .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
                .padding(.horizontal, 24)

                HStack(spacing: 12) {
                    Button("Skip") { dismiss() }
                        .buttonStyle(GhostButtonStyle())

                    Button(currentStep < steps.count - 1 ? "NEXT" : "LET'S GO") { advance() }
                        .buttonStyle(CommandButtonStyle())
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)

                Spacer(minLength: 48)
            }
        }
        .transition(.opacity)
    }

    private func advance() {
        if currentStep < steps.count - 1 {
            withAnimation(AppMotion.standard) { currentStep += 1 }
            HapticEngine.shared.light()
        } else {
            dismiss()
        }
    }

    private func dismiss() {
        UserDefaults.standard.set(true, forKey: "onboarding_complete")
        withAnimation(AppMotion.standard) { isVisible = false }
        HapticEngine.shared.success()
    }
}

struct OnboardingStep {
    let title: String
    let body: String
    let icon: String
}
