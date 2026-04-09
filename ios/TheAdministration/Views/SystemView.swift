import SwiftUI

struct SystemView: View {
    @ObservedObject var gameStore: GameStore

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
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(AppColors.success.opacity(0.1))
                    .frame(width: 64, height: 64)
                
                Image(systemName: "lock")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(AppColors.success)
            }
            
            VStack(spacing: 6) {
                Text("System Access Restricted")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(AppColors.foreground)
                
                Text("God Mode required")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.foregroundMuted)
            }
            
            Button(action: {
                godMode = true
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "eye")
                        .font(.system(size: 14, weight: .medium))
                    Text("Enable God Mode")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(AppColors.background)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(AppColors.accentPrimary)
                )
            }
            .buttonStyle(.plain)
        }
        .padding(32)
    }
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(AppColors.success.opacity(0.1))
                            .frame(width: 36, height: 36)
                        
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(AppColors.success)
                    }
                    
                    Text("System Control")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                    
                    Text("God Mode")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(AppColors.success)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(AppColors.success.opacity(0.12))
                        )
                }
                
                Text("Administrative override enabled.")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.foregroundMuted)
            }
            
            Spacer()
            
            Button(action: {
                godMode = false
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "eye.slash")
                        .font(.system(size: 13, weight: .medium))
                    Text("Disable")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(AppColors.success)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(AppColors.success.opacity(0.1))
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
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .textCase(.uppercase)
            
            Text(value)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(AppColors.foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
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
                HStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(AppColors.success.opacity(0.1))
                            .frame(width: 36, height: 36)
                        
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(AppColors.success)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(AppColors.foreground)
                        
                        Text(subtitle)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .padding(16)
            }
            
            if isExpanded {
                Divider()
                    .background(AppColors.border)
                
                content
                    .padding(16)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
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
        VStack(alignment: .leading, spacing: 10) {
            Text(metricId)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundMuted)
            
            HStack(spacing: 10) {
                TextField("", value: $value, format: .number)
                    .font(.system(size: 17, weight: .semibold).monospacedDigit())
                    .foregroundColor(AppColors.foreground)
                    .keyboardType(.decimalPad)
                    .frame(width: 80)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(AppColors.backgroundMuted)
                    )
                
                Text("\(Int(value))")
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundColor(getScoreColor(value))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(getScoreColor(value).opacity(0.12))
                    )
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(AppColors.backgroundElevated)
                        .frame(height: 3)
                    
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(getScoreColor(value))
                        .frame(width: geometry.size.width * CGFloat(value / 100), height: 3)
                }
            }
            .frame(height: 3)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
        .onChange(of: value) { _, newValue in
            gameStore.setMetric(metricId, value: newValue)
        }
    }
    
    private func getScoreColor(_ value: Double) -> Color {
        AppColors.metricColor(for: CGFloat(value))
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
        VStack(spacing: 14) {
            HStack {
                Text("Current Turn")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foregroundSubtle)
                
                Spacer()
                
                TextField("", value: $turnValue, format: .number)
                    .font(.system(size: 17, weight: .semibold).monospacedDigit())
                    .foregroundColor(AppColors.foreground)
                    .keyboardType(.numberPad)
                    .frame(width: 80)
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(AppColors.backgroundMuted)
                    )
            }
            
            HStack(spacing: 10) {
                Button(action: {
                    gameStore.saveGame()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "square.and.arrow.down")
                            .font(.system(size: 12, weight: .medium))
                        Text("Save")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(AppColors.foreground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(AppColors.backgroundMuted)
                    )
                }
                .buttonStyle(.plain)
                
                Button(action: {
                    gameStore.resetGame()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 12, weight: .medium))
                        Text("Reset")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(AppColors.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(AppColors.error.opacity(0.1))
                    )
                }
                .buttonStyle(.plain)
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
                        .font(.system(size: 14, weight: .semibold))
                    Text("70% scenario bias towards scandalous content.")
                        .font(.system(size: 11, weight: .regular, design: .default))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: AppColors.accentPrimary))
            
            Toggle(isOn: Binding(
                get: { gameStore.state.infinitePulseEnabled ?? false },
                set: { enabled in
                    gameStore.state.infinitePulseEnabled = enabled
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("INFINITE PULSE")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Remove AI intervention limits.")
                        .font(.system(size: 11, weight: .regular, design: .default))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: AppColors.accentPrimary))
            
            VStack(alignment: .leading, spacing: 12) {
                Text("METRIC LOCK")
                    .font(.system(size: 14, weight: .semibold))
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
                            let isLocked = gameStore.state.lockedMetricIds?.contains(metricId) ?? false
                            Text(metricId.replacingOccurrences(of: "metric_", with: "").replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.system(size: 11, weight: .medium))
                                .padding(8)
                                .frame(maxWidth: .infinity)
                                .background(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .fill(isLocked ? AppColors.success.opacity(0.15) : AppColors.backgroundMuted)
                                )
                                .foregroundColor(isLocked ? AppColors.success : AppColors.foregroundMuted)
                        }
                    }
                }
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
            autoSaveRow
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
                        Text("Slot \(slot)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(isActive ? AppColors.accentPrimary : AppColors.foregroundMuted)
                        if isActive {
                            Text("Active")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(AppColors.accentPrimary)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(
                                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                                        .fill(AppColors.accentPrimary.opacity(0.12))
                                )
                        }
                    }
                    if let meta = meta {
                        Text(meta.displayName)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(AppColors.foreground)
                        Text(meta.subtitle)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundMuted)
                    } else {
                        Text("Empty slot")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }
                Spacer()
                HStack(spacing: 8) {
                    if meta != nil, !isActive {
                        Button("Load") {
                            gameStore.loadFromSlot(slot)
                            onRefresh()
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(AppColors.foreground)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.backgroundMuted)
                        )
                    }
                    if !isActive {
                        Button("Use") {
                            PersistenceService.shared.switchToSlot(slot)
                            onRefresh()
                            loadSlots()
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(AppColors.accentPrimary)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.accentPrimary.opacity(0.1))
                        )
                    }
                    if meta != nil {
                        Button(action: {
                            slotToDelete = slot
                            showDeleteConfirm = true
                        }) {
                            Image(systemName: "trash")
                                .font(.system(size: 11))
                                .foregroundColor(AppColors.error)
                        }
                        .padding(6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.error.opacity(0.08))
                        )
                    }
                }
            }

            if gameStore.state.isSetup {
                Button("Save current game here") {
                    gameStore.saveToSlot(slot)
                    PersistenceService.shared.switchToSlot(slot)
                    onRefresh()
                    loadSlots()
                }
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(AppColors.foregroundMuted)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(AppColors.backgroundMuted)
                )
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(isActive ? AppColors.accentPrimary.opacity(0.05) : AppColors.backgroundElevated)
        )
    }

    private func loadSlots() {
        slots = PersistenceService.shared.listSlots()
    }

    @ViewBuilder
    private var autoSaveRow: some View {
        let meta = PersistenceService.shared.autoSaveMeta
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("AUTO-SAVE")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(AppColors.foregroundMuted)
                        Text("Every 3 turns")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(AppColors.foregroundMuted)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(AppColors.foregroundMuted.opacity(0.12))
                            )
                    }
                    if let meta = meta {
                        Text(meta.displayName)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(AppColors.foreground)
                        Text(meta.subtitle)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.foregroundMuted)
                    } else {
                        Text("No auto-save yet")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }
                Spacer()
                HStack(spacing: 8) {
                    if meta != nil {
                        Button("Load") {
                            gameStore.loadFromAutoSave()
                            onRefresh()
                        }
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(AppColors.foreground)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.backgroundMuted)
                        )
                        Button(action: {
                            PersistenceService.shared.deleteAutoSave()
                            onRefresh()
                            loadSlots()
                        }) {
                            Image(systemName: "trash")
                                .font(.system(size: 11))
                                .foregroundColor(AppColors.error)
                        }
                        .padding(6)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(AppColors.error.opacity(0.08))
                        )
                    }
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
            Button("Set to 50") { gameStore.setAllCountryRelationships(50) }
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(AppColors.backgroundMuted)
                )
            Button("Max") { gameStore.setAllCountryRelationships(100) }
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(AppColors.success)
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(AppColors.success.opacity(0.1))
                )
            Button("Min") { gameStore.setAllCountryRelationships(0) }
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(AppColors.error)
                .padding(.horizontal, 10).padding(.vertical, 7)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(AppColors.error.opacity(0.1))
                )
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
                .font(.system(size: 11).monospacedDigit())
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
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundSubtle)

            VStack(alignment: .leading, spacing: 6) {
                Text("Headline")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                TextField("Breaking: …", text: $headline)
                    .font(.system(size: 13))
                    .foregroundColor(AppColors.foreground)
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(AppColors.backgroundMuted)
                    )
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Summary")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                TextField("Short summary…", text: $summary)
                    .font(.system(size: 13))
                    .foregroundColor(AppColors.foreground)
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(AppColors.backgroundMuted)
                    )
            }
            Button("Inject Article") {
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
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(AppColors.background)
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(headline.isEmpty ? AppColors.border : AppColors.accentPrimary)
            )
            .accessibilityLabel("Inject news article")

            Divider().background(AppColors.border)
            Button("Clear All News") {
                gameStore.clearNewsHistory()
            }
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(AppColors.error)
            .accessibilityLabel("Clear all news")
        }
        .padding(.top, 8)
    }
}
