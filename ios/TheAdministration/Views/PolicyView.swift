/// PolicyView
/// Strategic policy management view. Lets the player adjust fiscal, social,
/// environmental and defence stances; shows political capital cost and tracks
/// strategic plan progress. Mirrors web PolicyView and StrategicPlanView.
import SwiftUI

struct PolicyView: View {
    @ObservedObject var gameStore: GameStore
    @State private var showStrategicPlanSheet = false

    private var policy: PolicySettings {
        gameStore.state.policySettings ?? PolicySettings(
            militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
            socialPolicy: nil, immigration: nil, tradeOpenness: nil,
            environmentalProtection: nil, healthcareAccess: nil,
            educationFunding: nil, socialWelfare: nil,
            economicStance: 50, socialSpending: 50,
            defenseSpending: 50, environmentalPolicy: 50
        )
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 24) {
                    header
                    capitalBanner
                    policySliders
                    strategicPlanCard
                }
                .padding(.horizontal, 16)
                .padding(.bottom, AppSpacing.tabBarClearance)
            }
        }
        .sheet(isPresented: $showStrategicPlanSheet) {
            StrategicPlanSheet(gameStore: gameStore)
        }
    }

    // MARK: - Header
    private var header: some View {
        ScreenHeader(
            protocolLabel: "POLICY_COMMAND_LINK_V8",
            title: "POLICY COMMAND",
            subtitle: "Strategic Posture & Resource Allocation"
        )
        .accessibilityLabel("Policy Command — Strategic Posture and Resource Allocation")
    }

    // MARK: - Political Capital Banner
    private var capitalBanner: some View {
        let capital = gameStore.calculatePoliticalCapital()
        let cost = gameStore.calculateTotalPolicyCost()
        let net = capital - cost
        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("POLITICAL CAPITAL")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(2)
                Text("\(capital)")
                    .font(.system(size: 28, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.foreground)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("POLICY COST / NET")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(2)
                Text("\(cost) / \(net > 0 ? "+" : "")\(net)")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                    .foregroundColor(net >= 0 ? AppColors.success : AppColors.error)
            }
        }
        .padding(16)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Political capital: \(capital). Policy cost: \(cost). Net: \(net).")
    }

    // MARK: - Policy Sliders
    private var policySliders: some View {
        VStack(spacing: 20) {
            PolicySliderRow(
                label: "ECONOMIC STANCE",
                subtitle: "Free Market ← → State-Led",
                value: Binding(
                    get: { policy.economicStance ?? 50 },
                    set: { gameStore.setInitialPolicyPreferences(economy: $0) }
                ),
                leftLabel: "Free Market",
                rightLabel: "State-Led"
            )
            PolicySliderRow(
                label: "SOCIAL SPENDING",
                subtitle: "Minimal ← → Universal",
                value: Binding(
                    get: { policy.socialSpending ?? 50 },
                    set: { gameStore.setInitialPolicyPreferences(social: $0) }
                ),
                leftLabel: "Minimal",
                rightLabel: "Universal"
            )
            PolicySliderRow(
                label: "DEFENCE POSTURE",
                subtitle: "Pacifist ← → Militarist",
                value: Binding(
                    get: { policy.defenseSpending ?? 50 },
                    set: { gameStore.setInitialPolicyPreferences(defense: $0) }
                ),
                leftLabel: "Pacifist",
                rightLabel: "Militarist"
            )
            PolicySliderRow(
                label: "ENVIRONMENTAL POLICY",
                subtitle: "Growth-First ← → Green New Deal",
                value: Binding(
                    get: { policy.environmentalPolicy ?? 50 },
                    set: { gameStore.setInitialPolicyPreferences(environment: $0) }
                ),
                leftLabel: "Growth-First",
                rightLabel: "Green New Deal"
            )
        }
    }

    // MARK: - Strategic Plan Card
    private var strategicPlanCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("STRATEGIC PLAN")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .tracking(2)
                Spacer()
                Button("Set Plan") { showStrategicPlanSheet = true }
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(AppColors.accentPrimary)
                    .accessibilityLabel("Set strategic plan")
            }
            if let plan = gameStore.state.strategicPlan {
                VStack(alignment: .leading, spacing: 8) {
                    Text(plan.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(AppColors.foreground)
                    Text(plan.description)
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.foregroundMuted)
                    if let turns = plan.durationTurns {
                        let elapsed = (gameStore.state.turn) - (plan.activeTurn ?? 0)
                        let progress = min(1.0, Double(elapsed) / Double(turns))
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("Progress")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(AppColors.foregroundSubtle)
                                Spacer()
                                Text("\(elapsed)/\(turns) turns")
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .foregroundColor(AppColors.foregroundMuted)
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle().fill(AppColors.border)
                                    Rectangle()
                                        .fill(AppColors.accentPrimary)
                                        .frame(width: geo.size.width * CGFloat(progress))
                                }
                            }
                            .frame(height: 4)
                        }
                    }
                }
            } else {
                Text("No active strategic plan. Set a plan to guide your administration's direction.")
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .italic()
            }
        }
        .padding(16)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
    }
}

// MARK: - PolicySliderRow
struct PolicySliderRow: View {
    let label: String
    let subtitle: String
    @Binding var value: Double
    let leftLabel: String
    let rightLabel: String

    private var sliderColor: Color { AppColors.accentPrimary }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                    Text(subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle.opacity(0.7))
                }
                Spacer()
                Text(String(format: "%.0f", value))
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.foreground)
                    .monospacedDigit()
            }

            Slider(value: $value, in: 0...100, step: 1)
                .tint(sliderColor)
                .onChange(of: value) { _, _ in HapticEngine.shared.selection() }

            HStack {
                Text(leftLabel)
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Spacer()
                Text(rightLabel)
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
            }

            // Position indicator bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(AppColors.border)
                    Rectangle()
                        .fill(sliderColor)
                        .frame(width: geo.size.width * CGFloat(value / 100))
                        .animation(AppMotion.quickSnap, value: value)
                }
            }
            .frame(height: 2)
        }
        .padding(14)
        .background(AppColors.backgroundElevated)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label). Current value: \(Int(value)). Range from \(leftLabel) to \(rightLabel).")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: value = min(100, value + 5)
            case .decrement: value = max(0, value - 5)
            @unknown default: break
            }
        }
    }
}
