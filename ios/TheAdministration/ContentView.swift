/// ContentView
/// Root view for The Administration. Handles the three top-level flows:
/// Welcome → Setup → Main Game. Hosts a custom frosted-glass tab bar
/// replacing the default system TabView chrome. Also overlays the
/// end-game review and first-run onboarding when triggered.
import SwiftUI

struct ContentView: View {
    @StateObject private var gameStore = GameStore()
    @State private var selectedTab = 0
    @State private var showWelcome = true
    @State private var showOnboarding = false

var body: some View {
    ZStack {
        Group {
            if showWelcome {
                WelcomeView(gameStore: gameStore, showWelcome: $showWelcome)
            } else if !gameStore.state.isSetup {
                SetupFlowView(gameStore: gameStore, onCancel: {
                    withAnimation(AppMotion.standard) { showWelcome = true }
                })
                    .onDisappear {
                        if gameStore.state.isSetup {
                            let done = UserDefaults.standard.bool(forKey: "onboarding_complete")
                            if !done { showOnboarding = true }
                        }
                    }
            } else {
                MainTabView(gameStore: gameStore, selectedTab: $selectedTab) {
                    showWelcome = true
                }
            }
        }
        .animation(AppMotion.standard, value: showWelcome)
        .animation(AppMotion.standard, value: gameStore.state.isSetup)

        if let review = gameStore.endGameReview {
            EndGameReviewView(review: review) {
                gameStore.resetGame()
                showWelcome = false
                selectedTab = 0
            }
            .transition(.opacity)
            .zIndex(10)
        }

        if showOnboarding {
            OnboardingOverlay(isVisible: $showOnboarding)
                .zIndex(20)
        }

    }
    .screenBackground()
}
}

// MARK: - MainTabView

struct MainTabView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var selectedTab: Int
    let onQuitToMain: () -> Void
    @State private var tabBarVisible = true
    @State private var showMenu = false

    private let tabs: [TabItem] = [
        TabItem(id: 0, label: "Desk",    icon: "rectangle.grid.2x2.fill",     activeIcon: "rectangle.grid.2x2.fill"),
        TabItem(id: 1, label: "World",   icon: "globe",                        activeIcon: "globe.americas.fill"),
        TabItem(id: 2, label: "Cabinet", icon: "person.3",                     activeIcon: "person.3.fill"),
        TabItem(id: 3, label: "Econ",    icon: "chart.line.uptrend.xyaxis",    activeIcon: "chart.line.uptrend.xyaxis"),
        TabItem(id: 4, label: "System",  icon: "slider.horizontal.3",         activeIcon: "slider.horizontal.3")
    ]

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case 0: DeskView(gameStore: gameStore)
                case 1: GlobalView(gameStore: gameStore)
                case 2: CabinetView(gameStore: gameStore)
                case 3: FinanceView(gameStore: gameStore)
                case 4: SystemHubView(gameStore: gameStore)
                default: DeskView(gameStore: gameStore)
                }
            }
            .ignoresSafeArea(edges: .bottom)

            CustomTabBar(tabs: tabs, selectedTab: $selectedTab)
                .overlay(alignment: .topTrailing) {
                    Button {
                        HapticEngine.shared.light()
                        showMenu = true
                    } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(AppColors.foregroundMuted)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(AppColors.backgroundMuted.opacity(0.9))
                            .clipShape(Capsule())
                    }
                    .padding(.trailing, 16)
                    .offset(y: -40)
                }
        }
        .onChange(of: gameStore.requestedTab) { _, newTab in
            if let tab = newTab {
                withAnimation(AppMotion.quickSnap) { selectedTab = tab }
                gameStore.requestedTab = nil
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .sheet(isPresented: $showMenu) {
            GameMenuSheet(gameStore: gameStore) {
                onQuitToMain()
            }
        }
    }
}

// MARK: - Custom Tab Bar

struct CustomTabBar: View {
    let tabs: [TabItem]
    @Binding var selectedTab: Int

    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(AppColors.accentPrimary.opacity(0.2))
                .frame(height: 1)

            HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    tabButton(tab)
                }
            }
            .padding(.horizontal, 4)
            .padding(.top, 8)
            .padding(.bottom, max(safeAreaBottom, 12))
            .background(AppColors.backgroundElevated)
        }
    }

    @ViewBuilder
    private func tabButton(_ tab: TabItem) -> some View {
        let isActive = selectedTab == tab.id

        Button(action: {
            if selectedTab != tab.id {
                HapticEngine.shared.light()
                withAnimation(AppMotion.quickSnap) { selectedTab = tab.id }
            }
        }) {
            VStack(spacing: 4) {
                if isActive {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(AppColors.accentPrimary)
                        .frame(width: 16, height: 2)
                } else {
                    Color.clear.frame(width: 16, height: 2)
                }

                Image(systemName: isActive ? tab.activeIcon : tab.icon)
                    .font(.system(size: 16, weight: isActive ? .semibold : .regular))
                    .foregroundColor(isActive ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                    .shadow(color: isActive ? AppColors.accentPrimary.opacity(0.3) : .clear, radius: 4)

                Text(tab.label)
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.3)
                    .textCase(.uppercase)
                    .foregroundColor(isActive ? AppColors.accentPrimary : AppColors.foregroundSubtle)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.label)
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }

    private var safeAreaBottom: CGFloat {
        (UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.bottom) ?? 0
    }
}

// MARK: - Tab Item Model

struct TabItem: Identifiable {
    let id: Int
    let label: String
    let icon: String
    let activeIcon: String
}

// MARK: - System Hub

struct SystemHubView: View {
    @ObservedObject var gameStore: GameStore

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 0) {
                        ScreenHeader(
                            protocolLabel: "SYSTEM_COMMAND_LINK_V8",
                            title: "System",
                            subtitle: "Administration controls"
                        )
                        .padding(.horizontal, 16)

                        VStack(spacing: 1) {
                            navRow(
                                label: "Policy",
                                subtitle: "Strategic posture & resource allocation",
                                icon: "doc.plaintext.fill",
                                destination: AnyView(PolicyView(gameStore: gameStore))
                            )
                            navRow(
                                label: "Archive",
                                subtitle: "Decision history",
                                icon: "archivebox.fill",
                                destination: AnyView(ArchiveView(gameStore: gameStore))
                            )
                            navRow(
                                label: "God Mode",
                                subtitle: "Administrative overrides",
                                icon: "eye.fill",
                                destination: AnyView(SystemView(gameStore: gameStore))
                            )
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, AppSpacing.lg)
                    }
                    .padding(.bottom, AppSpacing.tabBarClearance)
                }
            }
            .navigationBarHidden(true)
        }
    }

    @ViewBuilder
    private func navRow(label: String, subtitle: String, icon: String, destination: AnyView) -> some View {
        NavigationLink(destination: destination.navigationBarHidden(true)) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(AppColors.accentPrimary.opacity(0.1))
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(AppColors.accentPrimary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                    Text(subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundMuted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(AppColors.foregroundSubtle)
            }
            .padding(16)
            .background(AppColors.backgroundElevated)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ContentView()
}
