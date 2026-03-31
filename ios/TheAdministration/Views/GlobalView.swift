import SwiftUI

struct GlobalView: View {
    @ObservedObject var gameStore: GameStore
    @State private var searchText = ""
    @State private var sortKey: SortKey = .relationship
    @State private var selectedCountry: Country? = nil
    @State private var legislatureExpanded = true
    @State private var showLegislatureSheet = false

    enum SortKey: String, CaseIterable {
        case relationship = "Relations"
        case gdp = "GDP"
        case military = "Military"
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                headerSection

                ScrollView {
                    VStack(spacing: 0) {
                        if gameStore.state.legislatureState != nil {
                            legislatureSection
                                .padding(.horizontal, 16)
                                .padding(.bottom, 16)
                        }
                        LazyVGrid(
                            columns: [GridItem(.flexible()), GridItem(.flexible())],
                            spacing: 12
                        ) {
                            ForEach(Array(filteredCountries.enumerated()), id: \.element.id) { index, country in
                                CountryCard(country: country, action: { selectedCountry = country }, gameStore: gameStore)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, AppSpacing.tabBarClearance)
                    }
                }
            }
        }
        .sheet(item: $selectedCountry) { country in
            CountryDetailView(country: country, gameStore: gameStore)
        }
        .sheet(isPresented: $showLegislatureSheet) {
            LegislatureSheet(gameStore: gameStore)
        }
    }

    @ViewBuilder private var playerBanner: some View {
        if let player = gameStore.playerCountry {
            HStack(spacing: 10) {
                Text(player.flagEmoji)
                    .font(.system(size: 18))
                VStack(alignment: .leading, spacing: 1) {
                    Text("PLAYING AS")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(1.5)
                    Text(player.name)
                        .font(AppTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.foreground)
                }
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppColors.accentPrimary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(AppColors.accentPrimary.opacity(0.2), lineWidth: 1)
            )
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenHeader(
                protocolLabel: "STATE_DEPT_DATABASE_V8",
                title: "Global Relations",
                subtitle: "\(gameStore.liveCountries.count) nations tracked"
            )

            playerBanner

            HStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                    TextField("Search nations", text: $searchText)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.foreground)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(AppColors.backgroundElevated)
                )

                AnimatedSegmentedControl(options: SortKey.allCases.map(\.rawValue), selected: sortKey.rawValue) { value in
                    if let key = SortKey(rawValue: value) {
                        HapticEngine.shared.light()
                        withAnimation(AppMotion.quickSnap) { sortKey = key }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
    }

    private var filteredCountries: [Country] {
        var countries = gameStore.liveCountries
        if let id = gameStore.state.countryId { countries = countries.filter { $0.id != id } }
        if !searchText.isEmpty {
            countries = countries.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        countries.sort { a, b in
            switch sortKey {
            case .relationship: return a.diplomacy.relationship > b.diplomacy.relationship
            case .gdp:
                return (a.resolvedGdpBillions ?? 0) > (b.resolvedGdpBillions ?? 0)
            case .military:     return a.military.strength > b.military.strength
            }
        }
        return countries
    }

    private func legislatureStatsRow(_ legislature: LegislatureState) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Legislative Support")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Text("\(legislature.approvalOfPlayer)%")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.metricColor(for: CGFloat(legislature.approvalOfPlayer)))
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("Gridlock")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Text("\(legislature.gridlockLevel)%")
                    .font(AppTypography.caption)
                    .foregroundColor(legislature.gridlockLevel > 60 ? AppColors.error : AppColors.foreground)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("Next Election")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Text("Turn \(legislature.nextElectionTurn)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foreground)
            }
        }
        .padding(12)
        .background(AppColors.backgroundElevated)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func legislatureCompositionRow(_ bloc: LegislativeBloc) -> some View {
        HStack(spacing: 8) {
            Text(bloc.partyName)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foreground)
                .lineLimit(1)
            Spacer()
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(AppColors.border).frame(height: 4)
                    Rectangle()
                        .fill(bloc.isRulingCoalition ? AppColors.accentPrimary : AppColors.foregroundSubtle)
                        .frame(width: geo.size.width * bloc.seatShare, height: 4)
                }
                .clipShape(Capsule())
            }
            .frame(width: 80, height: 4)
            Text("\(Int(bloc.seatShare * 100))%")
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .frame(width: 32, alignment: .trailing)
        }
    }

    private var legislatureSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: {
                withAnimation(AppMotion.quickSnap) { legislatureExpanded.toggle() }
            }) {
                HStack {
                    Text("LEGISLATURE")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(1.5)
                    Spacer()
                    Image(systemName: legislatureExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
            }
            .buttonStyle(.plain)

            if legislatureExpanded, let legislature = gameStore.state.legislatureState {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button(action: { showLegislatureSheet = true }) {
                            HStack(spacing: 4) {
                                Text("Details")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.accentPrimary)
                                Image(systemName: "arrow.up.right")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundColor(AppColors.accentPrimary)
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Open full legislature details")
                    }
                    legislatureStatsRow(legislature)
                    ForEach(legislature.composition.prefix(4)) { bloc in
                        legislatureCompositionRow(bloc)
                    }
                }
            }
        }
        .padding(12)
        .background(AppColors.backgroundElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }



}

// MARK: - Animated Segmented Control

struct AnimatedSegmentedControl: View {
    let options: [String]
    let selected: String
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options, id: \.self) { option in
                Button(action: { onSelect(option) }) {
                    Text(option)
                        .font(AppTypography.micro)
                        .foregroundColor(selected == option ? AppColors.background : AppColors.foregroundMuted)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(selected == option ? AppColors.accentPrimary : Color.clear)
                        )
                        .animation(AppMotion.quickSnap, value: selected)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }
}

// MARK: - CountryCard

struct CountryCard: View {
    let country: Country
    let action: () -> Void
    var gameStore: GameStore? = nil

    private var relationshipColor: Color {
        switch country.diplomacy.relationship {
        case 70...:   return AppColors.success
        case 40..<70: return AppColors.foregroundMuted
        case 20..<40: return AppColors.warning
        default:      return AppColors.error
        }
    }

    private var statusBadge: (label: String, color: Color)? {
        let rel = country.diplomacy.relationship
        if rel >= 80 { return ("ALLY", AppColors.success) }
        if rel <= 20 { return ("ADVERSARY", AppColors.error) }
        return nil
    }

    var body: some View {
        Button(action: {
            HapticEngine.shared.light()
            action()
        }) {
            VStack(alignment: .leading, spacing: 0) {
                Rectangle()
                    .fill(relationshipColor)
                    .frame(height: 3)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        HStack(alignment: .top, spacing: 8) {
                            Text(country.flagEmoji)
                                .font(.system(size: 20))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(country.name)
                                    .font(AppTypography.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(AppColors.foreground)
                                    .lineLimit(1)

                                Text(country.region ?? "")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundSubtle)
                            }
                        }

                        Spacer()

                        if let badge = statusBadge {
                            Text(badge.label)
                                .font(AppTypography.micro)
                                .foregroundColor(badge.color)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                                        .fill(badge.color.opacity(0.12))
                                )
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("REL")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                            Spacer()
                            Text("\(Int(country.diplomacy.relationship))%")
                                .font(AppTypography.micro)
                                .foregroundColor(relationshipColor)
                                .monospacedDigit()
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle().fill(AppColors.border)
                                Rectangle()
                                    .fill(relationshipColor)
                                    .frame(width: geo.size.width * CGFloat(country.diplomacy.relationship / 100))
                            }
                        }
                        .frame(height: 2)
                    }

                    // GDP + Military + ellipsis hint
                    HStack(spacing: 8) {
                        statMini(label: "GDP", value: resolvedGDP(country))
                        statMini(label: "MIL", value: "\(Int(country.military.strength))")
                    }

                    HStack {
                        Spacer()
                        Image(systemName: "ellipsis")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.foregroundSubtle.opacity(0.5))
                    }
                }
                .padding(12)
            }
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppColors.backgroundElevated)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button { action() } label: {
                Label("View Dossier", systemImage: "doc.text.fill")
            }
        }
        .accessibilityLabel("\(country.name). Relationship: \(Int(country.diplomacy.relationship))%. Tap for details.")
    }

    private func statMini(label: String, value: String) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
            Text(value)
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundMuted)
                .monospacedDigit()
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(AppColors.backgroundMuted)
        )
    }

    private func resolvedGDP(_ country: Country) -> String {
        guard let billions = country.resolvedGdpBillions else { return "N/A" }
        let raw = billions * 1_000_000_000
        if raw >= 1_000_000_000_000 { return String(format: "$%.1fT", raw / 1_000_000_000_000) }
        if raw >= 1_000_000_000     { return String(format: "$%.1fB", raw / 1_000_000_000) }
        if raw >= 1_000_000         { return String(format: "$%.0fM", raw / 1_000_000) }
        return String(format: "$%.0fK", raw / 1_000)
    }
}

// MARK: - CountryDetailView

struct CountryDetailView: View {
    let country: Country
    var gameStore: GameStore? = nil
    @Environment(\.dismiss) private var dismiss
    @State private var actionError: String? = nil
    @State private var selectedSeverity: String = "medium"

    private var globeTarget: GlobeTarget? {
        GlobeBackgroundView.capitalCoordinates[country.id]
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            GlobeBackgroundView(target: globeTarget, showPulse: true)
                .ignoresSafeArea()
                .opacity(0.3)

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    if let desc = country.description, !desc.isEmpty {
                        descriptionBlock(desc)
                    }
                    diplomaticSection
                    severityPicker
                    actionSection
                    if country.diplomacy.relationship < 60 {
                        militaryActionsSection
                    }
                    economicSection
                    militarySection
                    if let bullets = country.analysisBullets, !bullets.isEmpty {
                        analysisSection(bullets)
                    }
                }
                .padding(20)
            }
        }
        .alert("Action Failed", isPresented: Binding(get: { actionError != nil }, set: { if !$0 { actionError = nil } })) {
            Button("OK") {}
        } message: {
            Text(actionError ?? "")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .center, spacing: 10) {
                    Text(country.flagEmoji)
                        .font(.system(size: 36))
                    Text(country.name)
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                }

                HStack(spacing: 6) {
                    if let region = country.region {
                        Text(region)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    if let leader = country.leader {
                        let title = country.leaderTitle ?? "Leader"
                        Text("·")
                            .foregroundColor(AppColors.foregroundSubtle)
                            .font(AppTypography.caption)
                        Text("\(title): \(leader)")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }

                if let blocs = country.blocs, !blocs.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(blocs.prefix(4), id: \.self) { bloc in
                            Text(bloc)
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.accentPrimary)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(AppColors.accentPrimary.opacity(0.12), in: RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
            Spacer()
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppColors.foregroundMuted)
                    .padding(8)
                    .background(Circle().fill(Color.white.opacity(0.08)))
            }
            .accessibilityLabel("Close")
        }
    }

    // MARK: - Description

    private func descriptionBlock(_ text: String) -> some View {
        Text(text)
            .font(AppTypography.bodySmall)
            .foregroundColor(AppColors.foregroundMuted)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: - Diplomatic

    private var diplomaticSection: some View {
        let rel = country.diplomacy.relationship
        let color = relationshipColor(rel)
        return sectionBlock(title: "Diplomatic Status") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Relationship score")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundSubtle)
                    Spacer()
                    Text("\(Int(rel))%")
                        .font(.system(size: 18, weight: .semibold, design: .monospaced))
                        .foregroundColor(color)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2).fill(AppColors.backgroundMuted)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(LinearGradient(
                                colors: [AppColors.accentPrimary, AppColors.accentSecondary],
                                startPoint: .leading,
                                endPoint: .trailing
                            ))
                            .frame(width: geo.size.width * CGFloat(rel / 100))
                    }
                }
                .frame(height: 3)

                statRow(label: "Alignment", value: country.diplomacy.alignment)

                if let economic = country.alliances?.economic, !economic.isEmpty {
                    statRow(label: "Economic partners", value: economic.prefix(3).joined(separator: ", "))
                }
                if let military = country.alliances?.military, !military.isEmpty {
                    statRow(label: "Military partners", value: military.prefix(3).joined(separator: ", "))
                }
                if !country.diplomacy.tradeAgreements.isEmpty {
                    statRow(label: "Trade agreements", value: country.diplomacy.tradeAgreements.prefix(3).joined(separator: ", "))
                }
            }
        }
    }

    // MARK: - Economic

    private var economicSection: some View {
        sectionBlock(title: "Economic Profile") {
            VStack(spacing: 10) {
                statRow(label: "GDP", value: country.resolvedGdpBillions.map { formatMoney($0 * 1_000_000_000) } ?? "N/A")
                statRow(label: "Population", value: formatPop(Double(country.attributes.population)))
                if let difficulty = country.difficulty {
                    statRow(label: "Governance", value: difficulty.capitalized)
                }
                if let economy = country.economy {
                    statRow(label: "Economic system", value: economy.system.capitalized)
                    statRow(label: "Primary export", value: economy.primaryExport)
                    statRow(label: "Primary import", value: economy.primaryImport)
                    if !economy.tradeDependencies.isEmpty {
                        statRow(label: "Trade ties", value: economy.tradeDependencies.prefix(3).joined(separator: ", "))
                    }
                }
            }
        }
    }

    // MARK: - Military

    private var militarySection: some View {
        let str = country.military.strength
        return sectionBlock(title: "Military") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Combat strength")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.foregroundSubtle)
                    Spacer()
                    Text("\(Int(str)) / 100")
                        .font(.system(size: 15, weight: .semibold, design: .monospaced))
                        .foregroundColor(AppColors.metricColor(for: str))
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2).fill(AppColors.backgroundMuted)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(LinearGradient(
                                colors: [AppColors.accentPrimary, AppColors.accentSecondary],
                                startPoint: .leading,
                                endPoint: .trailing
                            ))
                            .frame(width: geo.size.width * CGFloat(str / 100))
                    }
                }
                .frame(height: 3)

                statRow(label: "Naval power", value: String(format: "%.0f / 100", country.military.navyPower))
                statRow(label: "Cyber capability", value: String(format: "%.0f / 100", country.military.cyberCapability))
                if let posture = country.military.posture {
                    statRow(label: "Posture", value: posture.capitalized)
                }
                statRow(label: "Nuclear capable", value: country.military.nuclearCapable ? "Yes" : "No")
            }
        }
    }

    // MARK: - Analysis

    private func analysisSection(_ bullets: [String]) -> some View {
        sectionBlock(title: "Intelligence Assessment") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(bullets.prefix(6), id: \.self) { bullet in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(AppColors.accentPrimary)
                            .frame(width: 4, height: 4)
                            .padding(.top, 6)
                        Text(bullet)
                            .font(AppTypography.bodySmall)
                            .foregroundColor(AppColors.foregroundMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    // MARK: - Severity Picker

    private var severityPicker: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("SEVERITY")
                .font(AppTypography.micro)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(1.5)
            HStack(spacing: 8) {
                ForEach(["low", "medium", "high"], id: \.self) { sev in
                    Button {
                        withAnimation(AppMotion.quickSnap) { selectedSeverity = sev }
                    } label: {
                        Text(sev.uppercased())
                            .font(AppTypography.micro)
                            .foregroundColor(selectedSeverity == sev ? AppColors.background : AppColors.foregroundMuted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(selectedSeverity == sev ? AppColors.accentPrimary : AppColors.backgroundMuted)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    // MARK: - Action Section

    private var actionSection: some View {
        sectionBlock(title: "Diplomatic Actions") {
            VStack(spacing: 10) {
                switch selectedSeverity {
                case "low":
                    actionButton(title: "Open Back Channel", subtitle: "Discreet preliminary outreach", icon: "bubble.left.and.bubble.right", color: AppColors.info) {
                        runDiplomaticAction("trade_agreement")
                    }
                    actionButton(title: "Propose Dialogue", subtitle: "Invite formal diplomatic talks", icon: "person.2.wave.2", color: AppColors.info) {
                        runDiplomaticAction("request_alliance")
                    }
                case "high":
                    actionButton(title: "Impose Full Sanctions", subtitle: "Maximum economic pressure", icon: "xmark.seal.fill", color: AppColors.error) {
                        runDiplomaticAction("impose_sanctions")
                    }
                    actionButton(title: "Expel Ambassador", subtitle: "Downgrade diplomatic relations", icon: "person.badge.minus", color: AppColors.error) {
                        runDiplomaticAction("expel_ambassador")
                    }
                default:
                    actionButton(title: "Schedule Summit", subtitle: "Strengthen diplomatic ties", icon: "calendar.badge.plus", color: AppColors.success) {
                        runDiplomaticAction("request_alliance")
                    }
                    actionButton(title: "Propose Trade Deal", subtitle: "Boost economic cooperation", icon: "arrow.left.arrow.right", color: AppColors.info) {
                        runDiplomaticAction("trade_agreement")
                    }
                    actionButton(title: "Impose Sanctions", subtitle: "Economic and diplomatic pressure", icon: "chart.bar.xaxis", color: AppColors.warning) {
                        runDiplomaticAction("impose_sanctions")
                    }
                }
            }
        }
    }

    // MARK: - Military Actions Section

    private var militaryActionsSection: some View {
        sectionBlock(title: "Military Actions") {
            VStack(spacing: 10) {
                switch selectedSeverity {
                case "low":
                    actionButton(title: "Cyberattack", subtitle: "Disrupt digital infrastructure", icon: "wifi.slash", color: AppColors.warning) {
                        runMilitaryAction("cyberattack")
                    }
                    actionButton(title: "Covert Operation", subtitle: "Classified intelligence operation", icon: "eye.slash.fill", color: AppColors.warning) {
                        runMilitaryAction("covert_ops")
                    }
                case "high":
                    actionButton(title: "Military Strike", subtitle: "Conventional military engagement", icon: "bolt.fill", color: AppColors.error) {
                        runMilitaryAction("military_strike")
                    }
                    if gameStore?.playerCountry?.military.nuclearCapable == true && selectedSeverity == "high" {
                        actionButton(title: "Nuclear Strike", subtitle: "Strategic nuclear deployment — irreversible", icon: "atom", color: AppColors.error) {
                            runMilitaryAction("nuclear_strike")
                        }
                    }
                default:
                    actionButton(title: "Special Operations", subtitle: "Targeted special forces mission", icon: "scope", color: AppColors.error.opacity(0.8)) {
                        runMilitaryAction("special_ops")
                    }
                    actionButton(title: "Naval Blockade", subtitle: "Restrict maritime access", icon: "ferry.fill", color: AppColors.warning) {
                        runMilitaryAction("naval_blockade")
                    }
                }
            }
        }
    }

    private func actionButton(title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(color)
                    .frame(width: 32, height: 32)
                    .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(AppTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.foreground)
                    Text(subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(AppColors.foregroundSubtle)
            }
            .padding(12)
            .background(AppColors.backgroundMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func runDiplomaticAction(_ type: String) {
        guard let gs = gameStore else { return }
        if type == "request_alliance",
           let idx = gs.state.countries.firstIndex(where: { $0.id == country.id }),
           gs.state.countries[idx].diplomacy.relationship < 30 {
            actionError = "Alliance request rejected. Relations are too strained."
            return
        }
        dismiss()
        Task { await gs.executeDiplomaticAction(type: type, targetCountryId: country.id) }
    }

    private func runMilitaryAction(_ type: String) {
        guard let gs = gameStore else { return }
        dismiss()
        Task { await gs.executeMilitaryAction(type: type, targetCountryId: country.id, severity: selectedSeverity) }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func sectionBlock<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(AppTypography.caption)
                .fontWeight(.semibold)
                .foregroundColor(AppColors.foregroundMuted)
            content()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    private func statRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundSubtle)
            Spacer()
            Text(value)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundMuted)
                .multilineTextAlignment(.trailing)
        }
    }

    private func relationshipColor(_ rel: Double) -> Color {
        switch rel {
        case 70...:   return AppColors.success
        case 40..<70: return AppColors.foregroundMuted
        case 20..<40: return AppColors.warning
        default:      return AppColors.error
        }
    }

    private func formatMoney(_ value: Double) -> String {
        if value >= 1_000_000_000_000 { return String(format: "$%.2fT", value / 1_000_000_000_000) }
        if value >= 1_000_000_000     { return String(format: "$%.1fB", value / 1_000_000_000) }
        if value >= 1_000_000         { return String(format: "$%.0fM", value / 1_000_000) }
        return String(format: "$%.0fK", value / 1_000)
    }

    private func formatPop(_ pop: Double) -> String {
        if pop >= 1_000_000_000 { return String(format: "%.2fB", pop / 1_000_000_000) }
        if pop >= 1_000_000     { return String(format: "%.1fM", pop / 1_000_000) }
        if pop >= 1_000         { return String(format: "%.0fK", pop / 1_000) }
        return "\(Int(pop))"
    }
}

// MARK: - SortButton (kept for any remaining usages)

struct SortButton: View {
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.micro)
                .foregroundColor(isActive ? AppColors.background : AppColors.foregroundSubtle)
                .tracking(1)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(isActive ? AppColors.accentPrimary : AppColors.backgroundMuted)
                .overlay(Rectangle().stroke(isActive ? AppColors.accentPrimary : AppColors.border, lineWidth: 1))
                .animation(AppMotion.quickSnap, value: isActive)
        }
        .buttonStyle(.plain)
    }
}
