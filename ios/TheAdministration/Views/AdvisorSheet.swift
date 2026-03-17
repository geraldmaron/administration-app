/// AdvisorSheet
/// Full-screen sheet showing advisor briefing for a scenario option.
/// Presents each cabinet member's position and reasoning before the
/// player commits to a decision. Mirrors the web AdvisorModal.
import SwiftUI

struct AdvisorSheet: View {
    let scenario: Scenario
    let option: Option
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss
    let onConfirm: () -> Void

    private var cabinetFeedback: [(member: CabinetMember, feedback: AdvisorFeedback)] {
        guard let feedbacks = option.advisorFeedback else { return [] }
        var seen = Set<String>()
        return feedbacks.compactMap { fb in
            guard let member = gameStore.state.cabinet.first(where: {
                $0.roleId == fb.roleId && !$0.isVacant
            }) else { return nil }
            // Deduplicate by the unique cabinet member id (member.id)
            guard !seen.contains(member.id) else { return nil }
            seen.insert(member.id)
            return (member: member, feedback: fb)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        scenarioHeader
                        Divider().background(AppColors.border)
                        advisorsList
                        Divider().background(AppColors.border)
                        confirmButton
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Cabinet Briefing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundColor(AppColors.foregroundMuted)
                }
            }
        }
    }

    // MARK: - Scenario Header
    private var scenarioHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(scenario.title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(AppColors.foreground)
            Text("Option: \(option.text)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(AppColors.foregroundMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: - Advisors
    private var advisorsList: some View {
        VStack(spacing: 12) {
            Text("CABINET FEEDBACK")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            if cabinetFeedback.isEmpty {
                Text("No advisors available.")
                    .font(.system(size: 13))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .italic()
            } else {
                ForEach(cabinetFeedback, id: \.member.id) { item in
                    AdvisorFeedbackCard(member: item.member, feedback: item.feedback, country: gameStore.playerCountry)
                }
            }

        }
    }

    // MARK: - Confirm
    private var confirmButton: some View {
        Button {
            onConfirm()
            dismiss()
        } label: {
            Text("PROCEED WITH THIS OPTION")
                .font(.system(size: 13, weight: .black))
                .tracking(1)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppColors.accentPrimary)
                .foregroundColor(AppColors.background)
        }
        .accessibilityLabel("Confirm decision: \(option.text)")
    }
}

// MARK: - AdvisorFeedbackCard
private struct AdvisorFeedbackCard: View {
    let member: CabinetMember
    let feedback: AdvisorFeedback
    let country: Country?

    private var stanceColor: Color {
        switch feedback.stance.lowercased() {
        case "support", "approve", "positive": return AppColors.success
        case "oppose", "reject", "negative":   return AppColors.error
        default: return AppColors.foregroundSubtle
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(stanceColor.opacity(0.2))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String((member.candidate?.name ?? member.name).prefix(1)))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(stanceColor)
                )
                .overlay(Circle().stroke(stanceColor.opacity(0.5), lineWidth: 1))

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(member.candidate?.name ?? member.name)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(AppColors.foreground)
                    Spacer()
                    Text(feedback.stance.uppercased())
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(stanceColor)
                        .tracking(1)
                }
                Text(CabinetRoles.title(for: member.roleId, country: country))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(AppColors.foregroundSubtle)
                Text(feedback.feedback)
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.foregroundMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(stanceColor.opacity(0.2), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(member.candidate?.name ?? member.name), \(CabinetRoles.title(for: member.roleId, country: country)). Stance: \(feedback.stance). \(feedback.feedback)")
    }
}
