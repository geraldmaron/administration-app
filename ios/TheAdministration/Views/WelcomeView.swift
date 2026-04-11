import SwiftUI

struct WelcomeView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var showWelcome: Bool

    @State private var titleVisible = false
    @State private var subtitleVisible = false
    @State private var ctasVisible = false
    @State private var showLoadSheet = false
    @State private var showHowToPlay = false
    @State private var showTerms = false
    @State private var showPrivacy = false
    @State private var hasSaves = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            GlobeBackgroundView()
                .ignoresSafeArea()
                .opacity(0.75)

            GeometryReader { geo in
                RadialGradient(
                    colors: [.clear, .black.opacity(0.55)],
                    center: .center,
                    startRadius: geo.size.width * 0.3,
                    endRadius: geo.size.width * 1.1
                )
            }
            .ignoresSafeArea()

            VStack {
                HStack {
                    Text("SCI // TK // NOFORN")
                        .font(.system(size: 8, weight: .medium))
                        .tracking(1.5)
                        .foregroundColor(AppColors.accentPrimary.opacity(0.22))
                        .padding(.leading, 24)
                        .padding(.top, 16)
                    Spacer()
                    Text("CLEARANCE LEVEL ALPHA")
                        .font(.system(size: 9, weight: .medium))
                        .tracking(2)
                        .foregroundColor(AppColors.accentPrimary.opacity(0.3))
                        .padding(.trailing, 24)
                        .padding(.top, 16)
                }
                Spacer()
                HStack {
                    Spacer()
                    Text("SECURE CHANNEL ESTABLISHED")
                        .font(.system(size: 8, weight: .regular))
                        .tracking(1.5)
                        .foregroundColor(AppColors.foregroundSubtle.opacity(0.25))
                        .padding(.trailing, 24)
                        .padding(.bottom, 12)
                }
            }

            VStack(spacing: 0) {
                Spacer()

                GeometryReader { geo in
                    let titleSize = min(geo.size.width * 0.125, 52.0)
                    VStack(spacing: 4) {
                        Text("THE")
                            .font(.system(size: max(titleSize * 0.23, 10), weight: .medium))
                            .tracking(8)
                            .foregroundColor(AppColors.foregroundMuted)

                        Text("ADMINISTRATION")
                            .font(.system(size: titleSize, weight: .black))
                            .tracking(titleSize * 0.077)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [
                                        AppColors.accentSecondary,
                                        AppColors.accentPrimary,
                                        AppColors.accentTertiary
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)
                }
                .frame(height: 80)
                .padding(.horizontal, 40)
                .opacity(titleVisible ? 1 : 0)
                .offset(y: titleVisible ? 0 : 12)
                .animation(.easeOut(duration: 0.5), value: titleVisible)

                VStack(spacing: 0) {
                    GeometryReader { geometry in
                        Rectangle()
                            .fill(AppColors.accentPrimary.opacity(0.4))
                            .frame(width: subtitleVisible ? geometry.size.width : 0, height: 1)
                            .animation(.easeOut(duration: 0.5), value: subtitleVisible)
                    }
                    .frame(height: 1)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)

                    Text("POLITICAL STRATEGY SIMULATION")
                        .font(.system(size: 11, weight: .medium))
                        .tracking(4)
                        .foregroundColor(AppColors.accentPrimary.opacity(0.5))
                }
                .opacity(subtitleVisible ? 1 : 0)
                .animation(.easeOut(duration: 0.4), value: subtitleVisible)

                Spacer()

                VStack(spacing: 12) {
                    Rectangle()
                        .fill(AppColors.accentPrimary.opacity(0.25))
                        .frame(height: 1)
                        .padding(.bottom, 8)

                    Button(action: {
                        HapticEngine.shared.medium()
                        gameStore.resetGame()
                        withAnimation(AppMotion.standard) {
                            showWelcome = false
                        }
                    }) {
                        Text("BEGIN")
                    }
                    .buttonStyle(CommandButtonStyle(isEnabled: true))

                    if hasSaves {
                        Button(action: {
                            HapticEngine.shared.medium()
                            showLoadSheet = true
                        }) {
                            Text("LOAD SAVE")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .sheet(isPresented: $showLoadSheet) {
                            LoadGameSheet(gameStore: gameStore, onLoad: {
                                withAnimation(AppMotion.standard) { showWelcome = false }
                            })
                        }
                    }

                    Button(action: {
                        HapticEngine.shared.light()
                        showHowToPlay = true
                    }) {
                        Text("HOW TO PLAY")
                    }
                    .buttonStyle(GhostButtonStyle())
                    .sheet(isPresented: $showHowToPlay) {
                        HowToPlaySheet()
                    }

                    HStack(spacing: AppSpacing.xs) {
                        Button("Terms of Service") { showTerms = true }
                        Text("·")
                            .foregroundColor(AppColors.foregroundSubtle.opacity(0.4))
                        Button("Privacy & Data") { showPrivacy = true }
                    }
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle.opacity(0.5))
                    .sheet(isPresented: $showTerms) { TermsOfServiceSheet() }
                    .sheet(isPresented: $showPrivacy) { PrivacySheet() }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 52)
                .opacity(ctasVisible ? 1 : 0)
                .offset(y: ctasVisible ? 0 : 16)
                .animation(.easeOut(duration: 0.4), value: ctasVisible)
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { titleVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { subtitleVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) { ctasVisible = true }
            hasSaves = PersistenceService.shared.hasAutoSave ||
                       PersistenceService.shared.listSlots().contains { $0 != nil }
        }
    }
}
