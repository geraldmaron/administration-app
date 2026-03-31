import SwiftUI

struct PersonDossierView: View {
    let candidate: Candidate
    let roleTitle: String?
    
    @Environment(\.dismiss) private var dismiss
    
    private var statsPairs: [(label: String, value: Double)] {
        [
            ("Integrity",  candidate.stats.integrity),
            ("Diplomacy",  candidate.stats.diplomacy),
            ("Economics",  candidate.stats.economics),
            ("Military",   candidate.stats.military),
            ("Management", candidate.stats.management),
            ("Compassion", candidate.stats.compassion)
        ]
    }
    
    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    headerSection
                    identitySection
                    statsSection
                    strengthsWeaknessesSection
                    traitsSection
                    backgroundSection
                }
                .padding(24)
            }
        }
    }
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("DOSSIER")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.accentPrimary)
                    .tracking(3)
                if let role = roleTitle {
                    Text(role)
                        .font(.system(size: 20, weight: .black, design: .default))
                        .foregroundColor(AppColors.foreground)
                        .tracking(-0.5)
                }
            }
            
            Spacer()
            
            Button(action: { dismiss() }) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(AppColors.foregroundMuted)
                    .padding(8)
                    .background(AppColors.backgroundElevated)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.border, lineWidth: 1)
                    )
            }
            .accessibilityLabel("Close dossier")
        }
    }
    
    private var identitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(candidate.name)
                .font(.system(size: 28, weight: .black, design: .default))
                .foregroundColor(AppColors.foreground)

            HStack(spacing: 12) {
                if let age = candidate.age {
                    pill(label: "AGE", value: "\(age)")
                }
                pill(label: "PARTY", value: candidate.party)
            }

            if !candidate.education.isEmpty {
                HStack(alignment: .top, spacing: 10) {
                    Text("EDUCATION")
                        .font(.system(size: 9, weight: .black, design: .monospaced))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                        .padding(.top, 1)
                    Text(candidate.education)
                        .font(.system(size: 12, weight: .regular, design: .default))
                        .foregroundColor(AppColors.foreground)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.backgroundElevated)
                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            }
        }
    }
    
    private func pill(label: String, value: String) -> some View {
        HStack(spacing: 6) {
            Text(label)
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)
            Text(value)
                .font(.system(size: 11, weight: .regular, design: .monospaced))
                .foregroundColor(AppColors.foreground)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(AppColors.backgroundElevated)
        .overlay(
            Rectangle()
                .stroke(AppColors.border, lineWidth: 1)
        )
    }
    
    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CAPABILITY PROFILE")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
                .tracking(3)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(statsPairs, id: \.label) { stat in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(stat.label.uppercased())
                            .font(.system(size: 8, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        
                        Text("\(Int(stat.value.rounded()))")
                            .font(.system(size: 22, weight: .black, design: .monospaced))
                            .foregroundColor(scoreColor(stat.value))
                        
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(AppColors.border)
                                Rectangle()
                                    .fill(scoreColor(stat.value))
                                    .frame(width: geometry.size.width * CGFloat(max(0, min(100, stat.value)) / 100))
                            }
                        }
                        .frame(height: 3)
                    }
                    .padding(10)
                    .background(AppColors.backgroundElevated)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                }
            }
        }
    }
    
    private var strengthsWeaknessesSection: some View {
        HStack(alignment: .top, spacing: 16) {
            if let strengths = candidate.strengths, !strengths.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("STRENGTHS")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(AppColors.success)
                        .tracking(3)
                    ForEach(strengths, id: \.self) { item in
                        HStack(alignment: .top, spacing: 6) {
                            Circle()
                                .fill(AppColors.success)
                                .frame(width: 4, height: 4)
                                .padding(.top, 5)
                            Text(item)
                                .font(.system(size: 12, weight: .regular, design: .default))
                                .foregroundColor(AppColors.foreground)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            if let weaknesses = candidate.weaknesses, !weaknesses.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("WEAKNESSES")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(AppColors.error)
                        .tracking(3)
                    ForEach(weaknesses, id: \.self) { item in
                        HStack(alignment: .top, spacing: 6) {
                            Circle()
                                .fill(AppColors.error)
                                .frame(width: 4, height: 4)
                                .padding(.top, 5)
                            Text(item)
                                .font(.system(size: 12, weight: .regular, design: .default))
                                .foregroundColor(AppColors.foreground)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
    
    private var traitsSection: some View {
        guard let traits = candidate.traits as [PlayerTrait]?, !traits.isEmpty else {
            return AnyView(EmptyView())
        }
        
        return AnyView(
            VStack(alignment: .leading, spacing: 8) {
                Text("TRAIT PROFILE")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.foregroundMuted)
                    .tracking(3)
                
                ForEach(traits, id: \.name) { trait in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(trait.name.uppercased())
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.accentPrimary)
                            .tracking(2)
                        Text(trait.description)
                            .font(.system(size: 12, weight: .regular, design: .default))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    .padding(10)
                    .background(AppColors.backgroundElevated)
                    .overlay(
                        Rectangle()
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                }
            }
        )
    }
    
    private var backgroundSection: some View {
        let (careerItems, narrativeItems) = buildBackgroundItems()
        return VStack(alignment: .leading, spacing: 12) {
            Text("BACKGROUND SUMMARY")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
                .tracking(3)

            if careerItems.isEmpty && narrativeItems.isEmpty {
                Text("Initial intelligence incomplete. Awaiting synchronization from world database.")
                    .font(.system(size: 13, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                if !careerItems.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(careerItems, id: \.self) { item in
                            HStack(alignment: .top, spacing: 8) {
                                Text("–")
                                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundSubtle)
                                Text(item)
                                    .font(.system(size: 12, weight: .regular, design: .default))
                                    .foregroundColor(AppColors.foreground)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.backgroundElevated)
                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                }

                if !narrativeItems.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(narrativeItems, id: \.self) { item in
                            HStack(alignment: .top, spacing: 8) {
                                Text("·")
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundColor(AppColors.accentPrimary)
                                    .padding(.top, 0.5)
                                Text(item)
                                    .font(.system(size: 13, weight: .regular, design: .default))
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
            }
        }
    }

    private func buildBackgroundItems() -> (career: [String], narrative: [String]) {
        func deduplicated(_ items: [String]) -> [String] {
            var seen = Set<String>()
            return items.filter { seen.insert($0.lowercased().trimmingCharacters(in: .whitespaces)).inserted }
        }

        var career: [String] = []
        if let c = candidate.careerHistory, !c.isEmpty {
            career = deduplicated(c)
        }

        var narrative: [String] = []
        if !candidate.background.isEmpty {
            narrative.append(candidate.background)
        }
        if let bullets = candidate.analysisBullets, !bullets.isEmpty {
            narrative.append(contentsOf: bullets)
        }
        narrative = deduplicated(narrative)

        return (career, narrative)
    }
    
    private func scoreColor(_ value: Double) -> Color {
        AppColors.metricColor(for: CGFloat(value))
    }
}

