import SwiftUI

/// Dossier views for people and countries, presenting analysis-style intelligence panels
/// with strengths, weaknesses, background, and key stats for The Administration iOS client.
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
                Text("PERSON DOSSIER")
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.accentPrimary)
                    .tracking(3)
                Text(roleTitle ?? "Cabinet Candidate")
                    .font(.system(size: 20, weight: .black, design: .default))
                    .foregroundColor(AppColors.foreground)
                    .tracking(-0.5)
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
                if !candidate.education.isEmpty {
                    pill(label: "EDUCATION", value: candidate.education)
                }
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
                        .foregroundColor(AppColors.accentSecondary)
                        .tracking(3)
                    ForEach(strengths, id: \.self) { item in
                        HStack(alignment: .top, spacing: 6) {
                            Circle()
                                .fill(AppColors.accentSecondary)
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
                        .foregroundColor(AppColors.accentTertiary)
                        .tracking(3)
                    ForEach(weaknesses, id: \.self) { item in
                        HStack(alignment: .top, spacing: 6) {
                            Circle()
                                .fill(AppColors.accentTertiary)
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
        VStack(alignment: .leading, spacing: 8) {
            Text("BACKGROUND SUMMARY")
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundMuted)
                .tracking(3)
            
            let paragraphs = buildBackgroundParagraphs()
            ForEach(paragraphs.indices, id: \.self) { idx in
                Text(paragraphs[idx])
                    .font(.system(size: 13, weight: .regular, design: .default))
                    .foregroundColor(AppColors.foregroundMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
    
    private func buildBackgroundParagraphs() -> [String] {
        var parts: [String] = []
        if !candidate.background.isEmpty {
            parts.append(candidate.background)
        }
        if let career = candidate.careerHistory, !career.isEmpty {
            parts.append(career.joined(separator: " "))
        }
        if let analysis = candidate.analysisBullets, !analysis.isEmpty {
            parts.append(analysis.joined(separator: " "))
        }
        return parts.isEmpty ? ["Initial intelligence incomplete. Awaiting synchronization from world database."] : parts
    }
    
    private func scoreColor(_ value: Double) -> Color {
        if value >= 75 { return AppColors.success }
        if value >= 50 { return AppColors.info }
        if value >= 30 { return AppColors.warning }
        return AppColors.error
    }
}

