/// GlobalView
/// World relations screen. Displays all nations as cards with relationship
/// color bars, ally/adversary badges, animated segmented sort control,
/// and a detailed dossier sheet on tap.
import SwiftUI

struct GlobalView: View {
    @ObservedObject var gameStore: GameStore
    @State private var searchText = ""
    @State private var sortKey: SortKey = .relationship
    @State private var selectedCountry: Country? = nil

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
                    LazyVGrid(
                        columns: [GridItem(.flexible()), GridItem(.flexible())],
                        spacing: 12
                    ) {
                        ForEach(Array(filteredCountries.enumerated()), id: \.element.id) { index, country in
                            CountryCard(country: country) {
                                selectedCountry = country
                            }
                            .staggerEntrance(index: index, offset: 16)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, AppSpacing.tabBarClearance)
                }
            }
        }
        .sheet(item: $selectedCountry) { country in
            CountryDetailView(country: country)
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScreenHeader(
                protocolLabel: "STATE_DEPT_DATABASE_V8",
                title: "GLOBAL RELATIONS",
                subtitle: "\(gameStore.availableCountries.count) nations tracked"
            )

            HStack(spacing: 8) {
                // Search
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                    TextField("SEARCH NATIONS...", text: $searchText)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foreground)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(AppColors.backgroundElevated)
                .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))

                // Animated segmented sort
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
        var countries = gameStore.availableCountries
        if let id = gameStore.state.countryId { countries = countries.filter { $0.id != id } }
        if !searchText.isEmpty {
            countries = countries.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        countries.sort { a, b in
            switch sortKey {
            case .relationship: return a.diplomacy.relationship > b.diplomacy.relationship
            case .gdp:          return a.attributes.gdp > b.attributes.gdp
            case .military:     return a.military.strength > b.military.strength
            }
        }
        return countries
    }

}

// MARK: - Animated Segmented Control

struct AnimatedSegmentedControl: View {
    let options: [String]
    let selected: String
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                Button(action: { onSelect(option) }) {
                    Text(option)
                        .font(AppTypography.micro)
                        .tracking(1)
                        .foregroundColor(selected == option ? AppColors.background : AppColors.foregroundSubtle)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(selected == option ? AppColors.accentPrimary : Color.clear)
                        .animation(AppMotion.quickSnap, value: selected)
                }
                .buttonStyle(.plain)
            }
        }
        .background(AppColors.backgroundMuted)
        .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
    }
}

// MARK: - CountryCard

struct CountryCard: View {
    let country: Country
    let action: () -> Void

    private var relationshipColor: Color {
        switch country.diplomacy.relationship {
        case 70...:  return AppColors.success
        case 40..<70: return AppColors.info
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
                // Relationship color bar at top
                Rectangle()
                    .fill(relationshipColor)
                    .frame(height: 3)

                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(country.name)
                                .font(AppTypography.caption)
                                .fontWeight(.bold)
                                .foregroundColor(AppColors.foreground)
                                .lineLimit(1)

                            Text(country.region?.uppercased() ?? "")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(1)
                        }

                        Spacer()

                        if let badge = statusBadge {
                            Text(badge.label)
                                .font(AppTypography.micro)
                                .foregroundColor(badge.color)
                                .tracking(1)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(badge.color.opacity(0.1))
                                .overlay(Rectangle().stroke(badge.color.opacity(0.4), lineWidth: 0.5))
                        }
                    }

                    // Relationship bar
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

                    // GDP + Military
                    HStack(spacing: 8) {
                        statMini(label: "GDP", value: formatGDP(Double(country.attributes.gdp)))
                        statMini(label: "MIL", value: "\(Int(country.military.strength))")
                    }
                }
                .padding(12)
            }
            .background(AppColors.backgroundElevated)
            .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
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
        .background(AppColors.backgroundMuted)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 0.5))
    }

    private func formatGDP(_ gdp: Double) -> String {
        if gdp >= 1_000_000 { return String(format: "%.1fT", gdp / 1_000_000) }
        if gdp >= 1_000 { return String(format: "%.0fB", gdp / 1_000) }
        return String(format: "%.0fM", gdp)
    }
}

// MARK: - CountryDetailView

struct CountryDetailView: View {
    let country: Country
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("COUNTRY DOSSIER")
                                .font(AppTypography.micro)
                                .foregroundColor(AppColors.accentPrimary)
                                .tracking(3)
                            Text(country.name)
                                .font(AppTypography.displayMedium)
                                .foregroundColor(AppColors.foreground)
                        }
                        Spacer()
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(AppColors.foregroundMuted)
                                .padding(8)
                                .background(AppColors.backgroundElevated)
                                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                        }
                        .accessibilityLabel("Close")
                    }

                    Rectangle().fill(AppColors.accentPrimary).frame(height: 2)

                    // Relationship
                    sectionBlock(title: "DIPLOMATIC STATUS") {
                        let rel = country.diplomacy.relationship
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Relationship")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.foregroundMuted)
                                Spacer()
                                Text("\(Int(rel))%")
                                    .font(AppTypography.data)
                                    .foregroundColor(relationshipColor(rel))
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle().fill(AppColors.border)
                                    Rectangle()
                                        .fill(relationshipColor(rel))
                                        .frame(width: geo.size.width * CGFloat(rel / 100))
                                }
                            }
                            .frame(height: 4)

                            if let economic = country.alliances?.economic, !economic.isEmpty {
                                statRow(label: "Economic Allies", value: economic.joined(separator: ", "))
                            }
                            if let military = country.alliances?.military, !military.isEmpty {
                                statRow(label: "Military Allies", value: military.joined(separator: ", "))
                            }
                        }
                    }

                    // Economics
                    sectionBlock(title: "ECONOMIC PROFILE") {
                        VStack(spacing: 8) {
                            statRow(label: "GDP", value: formatGDP(Double(country.attributes.gdp)))
                            statRow(label: "Population", value: formatPop(Double(country.attributes.population)))
                        }
                    }

                    // Military
                    sectionBlock(title: "MILITARY CAPABILITY") {
                        let str = country.military.strength
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Strength")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.foregroundMuted)
                                Spacer()
                                Text("\(Int(str))")
                                    .font(AppTypography.data)
                                    .foregroundColor(AppColors.metricColor(for: str))
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle().fill(AppColors.border)
                                    Rectangle()
                                        .fill(AppColors.metricColor(for: str))
                                        .frame(width: geo.size.width * CGFloat(str / 100))
                                }
                            }
                            .frame(height: 4)
                        }
                    }
                }
                .padding(24)
            }
        }
    }

    @ViewBuilder
    private func sectionBlock<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(AppTypography.label)
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)
            content()
        }
        .padding(16)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
    }

    private func statRow(label: String, value: String, valueColor: Color = AppColors.foregroundMuted) -> some View {
        HStack {
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundMuted)
            Spacer()
            Text(value)
                .font(AppTypography.caption)
                .foregroundColor(valueColor)
                .multilineTextAlignment(.trailing)
        }
    }

    private func relationshipColor(_ rel: Double) -> Color {
        switch rel {
        case 70...:  return AppColors.success
        case 40..<70: return AppColors.info
        case 20..<40: return AppColors.warning
        default:      return AppColors.error
        }
    }

    private func formatGDP(_ gdp: Double) -> String {
        if gdp >= 1_000_000 { return String(format: "$%.1fT", gdp / 1_000_000) }
        if gdp >= 1_000 { return String(format: "$%.0fB", gdp / 1_000) }
        return String(format: "$%.0fM", gdp)
    }

    private func formatPop(_ pop: Double) -> String {
        if pop >= 1_000_000 { return String(format: "%.1fB", pop / 1_000_000) }
        if pop >= 1_000 { return String(format: "%.0fM", pop / 1_000) }
        return String(format: "%.0fK", pop)
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
