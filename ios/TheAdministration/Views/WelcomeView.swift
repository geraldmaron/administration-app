/// WelcomeView
/// Brand-only landing screen for The Administration. Presents the title mark
/// with strategic emphasis and two clear entry paths (standard setup or quick start).
import SwiftUI

struct WelcomeView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var showWelcome: Bool

    @State private var titleVisible = false
    @State private var subtitleVisible = false

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // MARK: Brand
                VStack(spacing: 18) {
                    VStack(spacing: 4) {
                        Text("THE")
                            .font(AppTypography.displayMedium)
                            .foregroundColor(AppColors.foreground)
                            .tracking(-1)
                            .opacity(titleVisible ? 1 : 0)
                            .offset(y: titleVisible ? 0 : 8)

                        HStack(spacing: 0) {
                            Text("admini")
                                .foregroundColor(AppColors.foregroundMuted)
                            Text("STRAT")
                                .foregroundColor(AppColors.accentPrimary)
                            Text("ion")
                                .foregroundColor(AppColors.foregroundMuted)
                        }
                        .font(AppTypography.displayLarge)
                        .tracking(-1)
                        .opacity(titleVisible ? 1 : 0)
                        .offset(y: titleVisible ? 0 : 12)
                    }

                    Text("Secure Channel Established // Awaiting Executive Input")
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(1)
                        .opacity(subtitleVisible ? 1 : 0)
                }

                Spacer(minLength: 24)

                // MARK: CTAs
                VStack(spacing: 12) {
                    Button(action: {
                        HapticEngine.shared.medium()
                        withAnimation(AppMotion.dramatic) {
                            showWelcome = false
                        }
                    }) {
                        Text("BEGIN ADMINISTRATION")
                    }
                    .buttonStyle(CommandButtonStyle(isEnabled: true))

                    Button(action: {
                        HapticEngine.shared.medium()
                        gameStore.quickStart(name: "", party: "Independent", approach: "Pragmatist")
                        withAnimation(AppMotion.dramatic) {
                            showWelcome = false
                        }
                    }) {
                        Text("QUICK START — RANDOMIZED")
                    }
                    .buttonStyle(TacticalButtonStyle())
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .onAppear { runEntrance() }
    }

    // MARK: - Actions

    private func runEntrance() {
        withAnimation(AppMotion.dramatic) { titleVisible = true }
        withAnimation(AppMotion.standard.delay(0.4)) { subtitleVisible = true }
    }
}
