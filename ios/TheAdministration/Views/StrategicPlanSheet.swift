/// StrategicPlanSheet
/// Sheet for selecting and activating a Strategic Plan.
/// Mirrors the web app's StrategicPlan and related controls.
import SwiftUI

private struct BuiltInPlan: Identifiable {
    let id: String
    let name: String
    let description: String
    let durationTurns: Int
    let tags: [String]
}

private let BUILT_IN_PLANS: [BuiltInPlan] = [
    BuiltInPlan(id: "economic_growth", name: "Economic Acceleration",
                description: "Prioritise GDP growth via targeted investment and deregulation.",
                durationTurns: 8, tags: ["economy", "gdp"]),
    BuiltInPlan(id: "stability_push", name: "Stability Mandate",
                description: "Focus on internal security, reduce social unrest.",
                durationTurns: 6, tags: ["stability", "security"]),
    BuiltInPlan(id: "green_transition", name: "Green New Deal",
                description: "Accelerate renewable energy, reduce carbon output.",
                durationTurns: 10, tags: ["environment", "energy"]),
    BuiltInPlan(id: "diplomatic_outreach", name: "Diplomatic Offensive",
                description: "Build alliances, improve all bilateral relationships.",
                durationTurns: 5, tags: ["diplomacy", "relations"]),
    BuiltInPlan(id: "military_buildup", name: "Strategic Readiness",
                description: "Increase military capacity and regional deterrence.",
                durationTurns: 7, tags: ["military", "defense"]),
    BuiltInPlan(id: "welfare_state", name: "Social Contract",
                description: "Expand welfare programs and universal public services.",
                durationTurns: 8, tags: ["welfare", "social"]),
]

struct StrategicPlanSheet: View {
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss
    @State private var selectedId: String? = nil

    private var current: StrategicPlan? { gameStore.state.strategicPlan }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 16) {
                        if let active = current {
                            activeCard(active)
                        }
                        Text("AVAILABLE PLANS")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        ForEach(BUILT_IN_PLANS) { plan in
                            planCard(plan)
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Strategic Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.foregroundMuted)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Activate") {
                        guard let id = selectedId,
                              let plan = BUILT_IN_PLANS.first(where: { $0.id == id }) else { return }
                        gameStore.setStrategicPlan(
                            id: plan.id,
                            name: plan.name,
                            description: plan.description,
                            durationTurns: plan.durationTurns
                        )
                        dismiss()
                    }
                    .disabled(selectedId == nil || selectedId == current?.id)
                    .foregroundColor(selectedId == nil ? AppColors.foregroundSubtle : AppColors.accentPrimary)
                    .fontWeight(.bold)
                }
            }
        }
    }

    // MARK: - Active card
    @ViewBuilder
    private func activeCard(_ plan: StrategicPlan) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ACTIVE PLAN")
                .font(.system(size: 9, weight: .black))
                .foregroundColor(AppColors.success)
                .tracking(2)
            Text(plan.name)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(AppColors.foreground)
            Text(plan.description)
                .font(.system(size: 12))
                .foregroundColor(AppColors.foregroundMuted)
            if let dur = plan.durationTurns {
                let elapsed = gameStore.state.turn - (plan.activeTurn ?? 0)
                Text("Progress: \(elapsed)/\(dur) turns")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(AppColors.foregroundSubtle)
            }
        }
        .padding(14)
        .background(AppColors.success.opacity(0.08))
        .overlay(Rectangle().stroke(AppColors.success.opacity(0.4), lineWidth: 1))
    }

    // MARK: - Plan card
    @ViewBuilder
    private func planCard(_ plan: BuiltInPlan) -> some View {
        let isSelected = selectedId == plan.id
        let isCurrent = current?.id == plan.id
        Button {
            selectedId = isSelected ? nil : plan.id
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(plan.name)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(AppColors.foreground)
                    Spacer()
                    if isCurrent {
                        Text("ACTIVE")
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(AppColors.success)
                            .tracking(1)
                    } else if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(AppColors.accentPrimary)
                    }
                }
                Text(plan.description)
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.foregroundMuted)
                    .multilineTextAlignment(.leading)
                HStack {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                        .foregroundColor(AppColors.foregroundSubtle)
                    Text("\(plan.durationTurns) turns")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(AppColors.foregroundSubtle)
                    Spacer()
                    ForEach(plan.tags, id: \.self) { tag in
                        Text(tag.uppercased())
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                    }
                }
            }
            .padding(14)
            .background(isSelected ? AppColors.accentPrimary.opacity(0.08) : AppColors.backgroundElevated)
            .overlay(Rectangle().stroke(isSelected ? AppColors.accentPrimary : AppColors.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(plan.name). \(plan.description). \(plan.durationTurns) turns.")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
