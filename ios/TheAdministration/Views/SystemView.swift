import SwiftUI

struct SystemView: View {
    @ObservedObject var gameStore: GameStore
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var godMode = false
    @State private var activeSection: String? = nil
    @State private var slotListVersion = UUID()  // forces refresh when slots change
    
    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            
            if !godMode {
                godModeLock
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        headerSection

                        statsGrid

                        SectionCard(
                            title: "Appearance",
                            subtitle: "Visual theme selection",
                            icon: "paintpalette",
                            isExpanded: activeSection == "appearance"
                        ) {
                            activeSection = activeSection == "appearance" ? nil : "appearance"
                        } content: {
                            ThemeSelectorView(themeManager: themeManager)
                        }

                        SectionCard(
                            title: "God Mode Settings",
                            subtitle: "Advanced game rule overrides",
                            icon: "crown",
                            isExpanded: activeSection == "god_settings"
                        ) {
                            activeSection = activeSection == "god_settings" ? nil : "god_settings"
                        } content: {
                            GodModeSettingsView(gameStore: gameStore)
                        }
                        
                        SectionCard(
                            title: "Metric Editor",
                            subtitle: "Direct metric manipulation",
                            icon: "chart.line.uptrend.xyaxis",
                            isExpanded: activeSection == "metrics"
                        ) {
                            activeSection = activeSection == "metrics" ? nil : "metrics"
                        } content: {
                            MetricEditorView(gameStore: gameStore)
                        }
                        
                        SectionCard(
                            title: "Scenario Control",
                            subtitle: "Trigger scenarios manually",
                            icon: "bolt",
                            isExpanded: activeSection == "scenarios"
                        ) {
                            activeSection = activeSection == "scenarios" ? nil : "scenarios"
                        } content: {
                            ScenarioControlView(gameStore: gameStore)
                        }
                        
                        SectionCard(
                            title: "Game State",
                            subtitle: "Turn and game controls",
                            icon: "calendar",
                            isExpanded: activeSection == "game"
                        ) {
                            activeSection = activeSection == "game" ? nil : "game"
                        } content: {
                            GameStateView(gameStore: gameStore)
                        }

                        SectionCard(
                            title: "Diplomacy Editor",
                            subtitle: "Override country relationships",
                            icon: "globe.americas",
                            isExpanded: activeSection == "diplomacy"
                        ) {
                            activeSection = activeSection == "diplomacy" ? nil : "diplomacy"
                        } content: {
                            DiplomacyEditorView(gameStore: gameStore)
                        }

                        SectionCard(
                            title: "News Feed",
                            subtitle: "Inject custom news articles",
                            icon: "newspaper",
                            isExpanded: activeSection == "news"
                        ) {
                            activeSection = activeSection == "news" ? nil : "news"
                        } content: {
                            NewsEditorView(gameStore: gameStore)
                        }

                        SectionCard(
                            title: "Save Slots",
                            subtitle: "Manage save files",
                            icon: "square.and.arrow.down.on.square",
                            isExpanded: activeSection == "saves"
                        ) {
                            activeSection = activeSection == "saves" ? nil : "saves"
                        } content: {
                            SaveSlotsView(gameStore: gameStore, version: slotListVersion) {
                                slotListVersion = UUID()
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100)
                }
            }
        }
        .onAppear {
            // Sync local godMode state with game state on appear
            godMode = gameStore.state.godMode ?? false
        }
        .onChange(of: godMode) { _, newValue in
            // Sync game state with local godMode state
            gameStore.state.godMode = newValue
        }
    }
    
    private var godModeLock: some View {
        VStack(spacing: 24) {
            ZStack {
                Rectangle()
                    .fill(AppColors.success.opacity(0.1))
                    .frame(width: 64, height: 64)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.success.opacity(0.2), lineWidth: 1)
                    )
                
                Image(systemName: "shield")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundColor(AppColors.success)
            }
            
            VStack(spacing: 8) {
                Text("System Access Restricted")
                    .font(.system(size: 24, weight: .bold, design: .default))
                    .foregroundColor(AppColors.foreground)
                
                Text("Clearance Level 5 Required")
                    .font(.system(size: 14, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundMuted)
                
                Text("Press to enable God Mode")
                    .font(.system(size: 11, weight: .regular, design: .monospaced))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
            }
            
            Button(action: {
                godMode = true
            }) {
                HStack {
                    Image(systemName: "eye")
                        .font(.system(size: 14, weight: .medium))
                    Text("ENABLE GOD MODE")
                        .font(.system(size: 14, weight: .bold, design: .default))
                        .tracking(1)
                }
                .foregroundColor(AppColors.background)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(AppColors.accentPrimary)
            }
        }
        .padding(32)
    }
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 12) {
                    ZStack {
                        Rectangle()
                            .fill(AppColors.success.opacity(0.1))
                            .frame(width: 40, height: 40)
                            .overlay(
                                Rectangle()
                                    .stroke(AppColors.success.opacity(0.2), lineWidth: 1)
                            )
                        
                        Image(systemName: "gearshape")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(AppColors.success)
                    }
                    
                    Text("System Control")
                        .font(.system(size: 24, weight: .bold, design: .default))
                        .foregroundColor(AppColors.foreground)
                    
                    Text("GOD MODE ACTIVE")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(AppColors.success)
                        .tracking(1)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppColors.success.opacity(0.1))
                        .overlay(
                            Rectangle()
                                .stroke(AppColors.success.opacity(0.3), lineWidth: 1)
                        )
                }
                
                Text("Administrative override enabled. Direct state manipulation available.")
                    .font(.system(size: 13, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundMuted)
            }
            
            Spacer()
            
            Button(action: {
                godMode = false
            }) {
                HStack {
                    Image(systemName: "eye.slash")
                        .font(.system(size: 14, weight: .medium))
                    Text("DISABLE")
                        .font(.system(size: 12, weight: .bold, design: .default))
                        .tracking(1)
                }
                .foregroundColor(AppColors.success)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(AppColors.success.opacity(0.1))
                .overlay(
                    Rectangle()
                        .stroke(AppColors.success.opacity(0.3), lineWidth: 1)
                )
            }
        }
        .padding(.top, 20)
    }
    
    private var statsGrid: some View {
        HStack(spacing: 12) {
            StatCard(label: "Current Turn", value: "\(gameStore.state.turn)")
            StatCard(label: "Country", value: gameStore.state.countryId ?? "None")
            StatCard(label: "Setup Status", value: gameStore.state.isSetup ? "Active" : "Inactive")
            StatCard(label: "Metrics Tracked", value: "\(gameStore.state.metrics.count)")
        }
    }
}

struct StatCard: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .regular, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .textCase(.uppercase)
                .tracking(1)
            
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .default))
                .foregroundColor(AppColors.foreground)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppColors.border)
        .overlay(
            Rectangle()
                .stroke(AppColors.borderStrong, lineWidth: 1)
        )
    }
}

struct SectionCard<Content: View>: View {
    let title: String
    let subtitle: String
    let icon: String
    let isExpanded: Bool
    let toggle: () -> Void
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(spacing: 0) {
            Button(action: toggle) {
                HStack {
                    ZStack {
                        Rectangle()
                            .fill(AppColors.success.opacity(0.1))
                            .frame(width: 40, height: 40)
                            .overlay(
                                Rectangle()
                                    .stroke(AppColors.success.opacity(0.2), lineWidth: 1)
                            )
                        
                        Image(systemName: icon)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(AppColors.success)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 20, weight: .bold, design: .default))
                            .foregroundColor(AppColors.foreground)
                        
                        Text(subtitle)
                            .font(.system(size: 13, weight: .regular, design: .default))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .padding(24)
                .background(AppColors.border)
            }
            
            if isExpanded {
                Rectangle()
                    .fill(AppColors.backgroundMuted.opacity(0.5))
                    .frame(height: 1)
                
                content
                    .padding(24)
            }
        }
        .background(AppColors.border)
        .overlay(
            Rectangle()
                .stroke(AppColors.borderStrong, lineWidth: 1)
        )
    }
}

struct MetricEditorView: View {
    @ObservedObject var gameStore: GameStore
    @State private var searchText = ""
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TextField("Search metrics...", text: $searchText)
                .font(.system(size: 14, weight: .regular, design: .monospaced))
                .foregroundColor(AppColors.foreground)
                .padding(12)
                .background(AppColors.backgroundElevated)
                .overlay(
                    Rectangle()
                        .stroke(AppColors.borderStrong, lineWidth: 1)
                )
            
            ForEach(Array(gameStore.state.metrics.keys.sorted()), id: \.self) { metricId in
                MetricEditorRow(
                    metricId: metricId,
                    value: gameStore.state.metrics[metricId] ?? 50,
                    gameStore: gameStore
                )
            }
        }
    }
}

struct MetricEditorRow: View {
    let metricId: String
    @State var value: Double
    @ObservedObject var gameStore: GameStore
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(metricId)
                .font(.system(size: 12, weight: .regular, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
            
            HStack {
                TextField("", value: $value, format: .number)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundColor(AppColors.foreground)
                    .keyboardType(.decimalPad)
                    .frame(width: 80)
                    .padding(8)
                    .background(AppColors.backgroundElevated)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.borderStrong, lineWidth: 1)
                    )
                
                Text("\(Int(value))")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(getScoreColor(value))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(getScoreColor(value).opacity(0.1))
                    .overlay(
                        Rectangle()
                            .stroke(getScoreColor(value).opacity(0.3), lineWidth: 1)
                    )
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(AppColors.backgroundElevated)
                        .frame(height: 4)
                    
                    Rectangle()
                        .fill(getScoreColor(value))
                        .frame(width: geometry.size.width * CGFloat(value / 100), height: 4)
                }
            }
            .frame(height: 4)
        }
        .padding(16)
        .background(AppColors.border)
        .overlay(
            Rectangle()
                .stroke(AppColors.borderStrong, lineWidth: 1)
        )
        .onChange(of: value) { _, newValue in
            gameStore.setMetric(metricId, value: newValue)
        }
    }
    
    private func getScoreColor(_ value: Double) -> Color {
        if value >= 75 {
            return .green
        } else if value >= 50 {
            return .yellow
        } else if value >= 25 {
            return .orange
        } else {
            return .red
        }
    }
}

struct ScenarioControlView: View {
    @ObservedObject var gameStore: GameStore
    
    var body: some View {
        Text("Scenario Control")
            .font(.system(size: 14, weight: .regular, design: .default))
            .foregroundColor(AppColors.foregroundMuted)
    }
}

struct GameStateView: View {
    @ObservedObject var gameStore: GameStore
    @State private var turnValue: Int = 1
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Current Turn")
                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .textCase(.uppercase)
                
                Spacer()
                
                TextField("", value: $turnValue, format: .number)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundColor(AppColors.foreground)
                    .keyboardType(.numberPad)
                    .frame(width: 80)
                    .padding(8)
                    .background(AppColors.backgroundMuted)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.borderStrong, lineWidth: 1)
                    )
            }
            
            HStack(spacing: 12) {
                Button(action: {
                    gameStore.saveGame()
                }) {
                    HStack {
                        Image(systemName: "square.and.arrow.down")
                            .font(.system(size: 12, weight: .medium))
                        Text("SAVE")
                            .font(.system(size: 12, weight: .bold, design: .default))
                            .tracking(1)
                    }
                    .foregroundColor(AppColors.foreground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(AppColors.backgroundMuted)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.borderStrong, lineWidth: 1)
                    )
                }
                
                Button(action: {
                    gameStore.resetGame()
                }) {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 12, weight: .medium))
                        Text("RESET")
                            .font(.system(size: 12, weight: .bold, design: .default))
                            .tracking(1)
                    }
                    .foregroundColor(AppColors.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(AppColors.error.opacity(0.1))
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.error.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
        .onAppear {
            turnValue = gameStore.state.turn
        }
        .onChange(of: turnValue) { _, newValue in
            gameStore.setTurn(newValue)
        }
    }
}

struct GodModeSettingsView: View {
    @ObservedObject var gameStore: GameStore

    var body: some View {
        VStack(spacing: 20) {
            Toggle(isOn: Binding(
                get: { gameStore.state.dickMode?.enabled ?? false },
                set: { enabled in
                    var config = gameStore.state.dickMode ?? DickModeConfig(enabled: false, active: true, authoritarianBias: 0.7, moralPenaltyMultiplier: 1.5)
                    config.enabled = enabled
                    gameStore.state.dickMode = config
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("DICK MODE")
                        .font(.system(size: 14, weight: .bold, design: .default))
                    Text("70% scenario bias towards scandalous content.")
                        .font(.system(size: 11, weight: .regular, design: .default))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .green))
            
            Toggle(isOn: Binding(
                get: { gameStore.state.infinitePulseEnabled ?? false },
                set: { enabled in
                    gameStore.state.infinitePulseEnabled = enabled
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("INFINITE PULSE")
                        .font(.system(size: 14, weight: .bold, design: .default))
                    Text("Remove AI intervention limits.")
                        .font(.system(size: 11, weight: .regular, design: .default))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .green))
            
            VStack(alignment: .leading, spacing: 12) {
                Text("METRIC LOCK")
                    .font(.system(size: 14, weight: .bold, design: .default))
                Text("Lock specific indicators to prevent drift.")
                    .font(.system(size: 11, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundSubtle)
                
                let allMetrics = Array(gameStore.state.metrics.keys.sorted())
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(allMetrics, id: \.self) { metricId in
                        Button(action: {
                            var locked = gameStore.state.lockedMetricIds ?? []
                            if locked.contains(metricId) {
                                locked.removeAll { $0 == metricId }
                            } else {
                                locked.append(metricId)
                            }
                            gameStore.state.lockedMetricIds = locked
                        }) {
                            Text(metricId.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .padding(8)
                                .frame(maxWidth: .infinity)
                                .background((gameStore.state.lockedMetricIds?.contains(metricId) ?? false) ? AppColors.success.opacity(0.2) : AppColors.backgroundMuted)
                                .foregroundColor((gameStore.state.lockedMetricIds?.contains(metricId) ?? false) ? AppColors.success : AppColors.foregroundMuted)
                                .overlay(
                                    Rectangle()
                                        .stroke((gameStore.state.lockedMetricIds?.contains(metricId) ?? false) ? AppColors.success.opacity(0.5) : AppColors.borderStrong, lineWidth: 1)
                                )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - ThemeSelectorView

struct ThemeSelectorView: View {
    @ObservedObject var themeManager: ThemeManager

    var body: some View {
        VStack(spacing: 10) {
            ForEach(AppTheme.all) { theme in
                let isSelected = themeManager.current == theme
                Button(action: { themeManager.setTheme(theme) }) {
                    HStack(spacing: 12) {
                        // Color swatch
                        Circle()
                            .fill(theme.accentPrimary)
                            .frame(width: 24, height: 24)
                            .overlay(
                                Circle().stroke(AppColors.border, lineWidth: 1)
                            )

                        VStack(alignment: .leading, spacing: 2) {
                            Text(theme.displayName)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(isSelected ? theme.accentPrimary : AppColors.foreground)
                            Text(theme.subtitle)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(AppColors.foregroundMuted)
                        }

                        Spacer()

                        if isSelected {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(theme.accentPrimary)
                        }
                    }
                    .padding(12)
                    .background(isSelected ? theme.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
                    .overlay(
                        Rectangle()
                            .stroke(isSelected ? theme.accentPrimary : AppColors.border,
                                    lineWidth: isSelected ? 1 : 0.5)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - SaveSlotsView

struct SaveSlotsView: View {
    @ObservedObject var gameStore: GameStore
    let version: UUID
    let onRefresh: () -> Void

    @State private var slots: [SaveSlotMetadata?] = []
    @State private var showDeleteConfirm = false
    @State private var slotToDelete: Int? = nil

    var body: some View {
        VStack(spacing: 12) {
            ForEach(1...PersistenceService.totalSlots, id: \.self) { slot in
                saveSlotRow(slot: slot, meta: slots.count >= slot ? slots[slot - 1] : nil)
            }
        }
        .onAppear { loadSlots() }
        .onChange(of: version) { _, _ in loadSlots() }
        .alert("Delete Save Slot \(slotToDelete ?? 0)?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                if let slot = slotToDelete {
                    PersistenceService.shared.deleteSlot(slot)
                    onRefresh()
                    loadSlots()
                }
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    @ViewBuilder
    private func saveSlotRow(slot: Int, meta: SaveSlotMetadata?) -> some View {
        let isActive = PersistenceService.shared.activeSlot == slot
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("SLOT \(slot)")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(isActive ? AppColors.accentPrimary : AppColors.foregroundMuted)
                            .tracking(2)
                        if isActive {
                            Text("ACTIVE")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(AppColors.accentPrimary)
                                .padding(.horizontal, 4).padding(.vertical, 2)
                                .background(AppColors.accentPrimary.opacity(0.1))
                                .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.3), lineWidth: 0.5))
                        }
                    }
                    if let meta = meta {
                        Text(meta.displayName)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(AppColors.foreground)
                        Text(meta.subtitle)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(AppColors.foregroundMuted)
                    } else {
                        Text("Empty slot")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }
                Spacer()
                // Action buttons
                HStack(spacing: 8) {
                    if meta != nil, !isActive {
                        Button("LOAD") {
                            gameStore.loadFromSlot(slot)
                            onRefresh()
                        }
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(AppColors.foreground)
                        .padding(.horizontal, 8).padding(.vertical, 5)
                        .background(AppColors.backgroundMuted)
                        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 0.5))
                    }
                    if !isActive {
                        Button("USE") {
                            PersistenceService.shared.switchToSlot(slot)
                            onRefresh()
                            loadSlots()
                        }
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(AppColors.accentPrimary)
                        .padding(.horizontal, 8).padding(.vertical, 5)
                        .background(AppColors.accentPrimary.opacity(0.08))
                        .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.3), lineWidth: 0.5))
                    }
                    if meta != nil {
                        Button(action: {
                            slotToDelete = slot
                            showDeleteConfirm = true
                        }) {
                            Image(systemName: "trash")
                                .font(.system(size: 11))
                                .foregroundColor(AppColors.accentSecondary)
                        }
                        .padding(5)
                        .background(AppColors.accentSecondary.opacity(0.08))
                        .overlay(Rectangle().stroke(AppColors.accentSecondary.opacity(0.3), lineWidth: 0.5))
                    }
                }
            }

            // Save current game to this slot shortcut
            if gameStore.state.isSetup {
                Button("SAVE CURRENT GAME HERE") {
                    gameStore.saveToSlot(slot)
                    PersistenceService.shared.switchToSlot(slot)
                    onRefresh()
                    loadSlots()
                }
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(AppColors.backgroundMuted)
                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 0.5))
            }
        }
        .padding(12)
        .background(isActive ? AppColors.accentPrimary.opacity(0.04) : AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(isActive ? AppColors.accentPrimary.opacity(0.3) : AppColors.border, lineWidth: isActive ? 1 : 0.5))
    }

    private func loadSlots() {
        slots = PersistenceService.shared.listSlots()
    }
}

// MARK: - DiplomacyEditorView
struct DiplomacyEditorView: View {
    @ObservedObject var gameStore: GameStore

    var body: some View {
        VStack(spacing: 10) {
            ForEach(Array(gameStore.availableCountries.prefix(10))) { country in
                DiplomacyRow(country: country, gameStore: gameStore)
            }
            bulkControls
        }
        .padding(.top, 8)
    }

    private var bulkControls: some View {
        HStack(spacing: 8) {
            Button("SET ALL TO 50") { gameStore.setAllCountryRelationships(50) }
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(AppColors.backgroundMuted)
                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            Button("MAX ALL") { gameStore.setAllCountryRelationships(100) }
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(AppColors.success)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(AppColors.success.opacity(0.08))
                .overlay(Rectangle().stroke(AppColors.success.opacity(0.3), lineWidth: 1))
            Button("MIN ALL") { gameStore.setAllCountryRelationships(0) }
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(AppColors.error)
                .padding(.horizontal, 10).padding(.vertical, 6)
                .background(AppColors.error.opacity(0.08))
                .overlay(Rectangle().stroke(AppColors.error.opacity(0.3), lineWidth: 1))
        }
    }
}

private struct DiplomacyRow: View {
    let country: Country
    @ObservedObject var gameStore: GameStore

    var body: some View {
        HStack {
            Text(country.name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(AppColors.foreground)
                .frame(maxWidth: .infinity, alignment: .leading)
            Slider(
                value: Binding(
                    get: { country.diplomacy.relationship },
                    set: { gameStore.setCountryRelationship(country.id, relationship: $0) }
                ),
                in: 0...100, step: 1
            )
            .accentColor(AppColors.accentPrimary)
            .frame(width: 120)
            Text(String(format: "%.0f", country.diplomacy.relationship))
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
                .frame(width: 30, alignment: .trailing)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(country.name) relationship: \(Int(country.diplomacy.relationship))")
    }
}

// MARK: - NewsEditorView
struct NewsEditorView: View {
    @ObservedObject var gameStore: GameStore
    @State private var headline = ""
    @State private var summary = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Inject a news article into the ticker.")
                .font(.system(size: 11))
                .foregroundColor(AppColors.foregroundSubtle)

            VStack(alignment: .leading, spacing: 6) {
                Text("HEADLINE")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                TextField("Breaking: …", text: $headline)
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.foreground)
                    .padding(8)
                    .background(AppColors.backgroundMuted)
                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("SUMMARY")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(1)
                TextField("Short summary…", text: $summary)
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.foreground)
                    .padding(8)
                    .background(AppColors.backgroundMuted)
                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            }
            Button("INJECT ARTICLE") {
                guard !headline.isEmpty else { return }
                gameStore.addNewsArticle(
                    title: headline,
                    summary: summary.isEmpty ? headline : summary,
                    impact: "neutral"
                )
                headline = ""
                summary = ""
            }
            .disabled(headline.isEmpty)
            .font(.system(size: 10, weight: .black))
            .foregroundColor(AppColors.background)
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(headline.isEmpty ? AppColors.border : AppColors.accentPrimary)
            .accessibilityLabel("Inject news article")

            Divider().background(AppColors.border)
            Button("CLEAR ALL NEWS") {
                gameStore.clearNewsHistory()
            }
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(AppColors.error)
            .accessibilityLabel("Clear all news")
        }
        .padding(.top, 8)
    }
}
