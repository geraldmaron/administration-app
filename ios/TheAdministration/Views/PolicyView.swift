import SwiftUI

struct PolicyView: View {
    @ObservedObject var gameStore: GameStore
    @State private var showStrategicPlanSheet = false
    @State private var showMilitarySheet = false
    @State private var activeReview: ImpactReview?
    @State private var draftPolicy: PolicySettings = PolicySettings(
        militaryPosture: nil, tradePolicy: nil, environmentalCommitment: nil,
        socialPolicy: nil, immigration: nil, tradeOpenness: nil,
        environmentalProtection: nil, healthcareAccess: nil,
        educationFunding: nil, socialWelfare: nil,
        economicStance: 50, socialSpending: 50,
        defenseSpending: 50, environmentalPolicy: 50
    )

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

    private var hasChanges: Bool {
        (draftPolicy.economicStance ?? 50) != (policy.economicStance ?? 50) ||
        (draftPolicy.socialSpending ?? 50) != (policy.socialSpending ?? 50) ||
        (draftPolicy.defenseSpending ?? 50) != (policy.defenseSpending ?? 50) ||
        (draftPolicy.environmentalPolicy ?? 50) != (policy.environmentalPolicy ?? 50)
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
                    militaryStatusCard
                }
                .padding(.horizontal, 16)
                .padding(.bottom, AppSpacing.tabBarClearance)
            }
        }
        .onAppear { draftPolicy = policy }
        .onChange(of: gameStore.state.policySettings) { _, _ in
            if !hasChanges { draftPolicy = policy }
        }
        .sheet(item: $activeReview) { review in
            PolicyChangesSheet(review: review)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showStrategicPlanSheet) {
            StrategicPlanSheet(gameStore: gameStore)
        }
        .sheet(isPresented: $showMilitarySheet) {
            MilitarySheet(gameStore: gameStore)
        }
    }

    // MARK: - Header
    private var header: some View {
        ScreenHeader(
            protocolLabel: "POLICY_COMMAND_LINK_V8",
            title: "Policy",
            subtitle: "Strategic posture and resource allocation"
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
                Text("Political Capital")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Text("\(capital)")
                    .font(.system(size: 28, weight: .semibold, design: .monospaced))
                    .foregroundColor(AppColors.foreground)
                    .monospacedDigit()
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("Cost / Net")
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.foregroundSubtle)
                Text("\(cost) / \(net > 0 ? "+" : "")\(net)")
                    .font(.system(size: 16, weight: .semibold, design: .monospaced))
                    .foregroundColor(net >= 0 ? AppColors.success : AppColors.error)
                    .monospacedDigit()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
                    get: { draftPolicy.economicStance ?? 50 },
                    set: { draftPolicy.economicStance = $0 }
                ),
                leftLabel: "Free Market",
                rightLabel: "State-Led"
            )
            PolicySliderRow(
                label: "SOCIAL SPENDING",
                subtitle: "Minimal ← → Universal",
                value: Binding(
                    get: { draftPolicy.socialSpending ?? 50 },
                    set: { draftPolicy.socialSpending = $0 }
                ),
                leftLabel: "Minimal",
                rightLabel: "Universal"
            )
            PolicySliderRow(
                label: "DEFENCE POSTURE",
                subtitle: "Pacifist ← → Militarist",
                value: Binding(
                    get: { draftPolicy.defenseSpending ?? 50 },
                    set: { draftPolicy.defenseSpending = $0 }
                ),
                leftLabel: "Pacifist",
                rightLabel: "Militarist"
            )
            PolicySliderRow(
                label: "ENVIRONMENTAL POLICY",
                subtitle: "Growth-First ← → Green New Deal",
                value: Binding(
                    get: { draftPolicy.environmentalPolicy ?? 50 },
                    set: { draftPolicy.environmentalPolicy = $0 }
                ),
                leftLabel: "Growth-First",
                rightLabel: "Green New Deal"
            )

            Group {
                if hasChanges {
                    Button("Review Policy Changes") {
                        let old = policy
                        let new = draftPolicy
                        activeReview = ImpactReview(
                            title: "Policy Impact",
                            impacts: gameStore.computePolicyMetricImpacts(from: old, to: new),
                            onConfirm: {
                                gameStore.applyPolicyMetricImpacts(from: old, to: new)
                                gameStore.updatePolicySettings(new)
                            }
                        )
                    }
                    .buttonStyle(CommandButtonStyle())
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.8), value: hasChanges)
        }
    }

    // MARK: - Strategic Plan Card
    private var strategicPlanCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Strategic Plan")
                    .font(AppTypography.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.foregroundMuted)
                Spacer()
                Button("Set Plan") { showStrategicPlanSheet = true }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(AppColors.accentPrimary)
                    .accessibilityLabel("Set strategic plan")
            }
            if let plan = gameStore.state.strategicPlan {
                VStack(alignment: .leading, spacing: 8) {
                    Text(plan.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(AppColors.foreground)
                    Text(plan.description)
                        .font(.system(size: 13))
                        .foregroundColor(AppColors.foregroundMuted)
                    if let turns = plan.durationTurns {
                        let elapsed = (gameStore.state.turn) - (plan.activeTurn ?? 0)
                        let progress: Double = turns > 0 ? min(1.0, Double(elapsed) / Double(turns)) : 0
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("Progress")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                Spacer()
                                Text("\(elapsed)/\(turns) turns")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .monospacedDigit()
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Rectangle().fill(AppColors.border)
                                    Rectangle()
                                        .fill(AppColors.accentPrimary)
                                        .frame(width: geo.size.width * CGFloat(progress))
                                }
                            }
                            .frame(height: 3)
                        }
                    }
                }
            } else {
                Text("No active strategic plan. Set a plan to guide your administration's direction.")
                    .font(.system(size: 13))
                    .foregroundColor(AppColors.foregroundSubtle)
                    .italic()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
    }

    // MARK: - Military Status Card
    private var militaryStatusCard: some View {
        let mil = gameStore.countryMilitaryState
        let readiness = mil?.overallReadiness ?? 0
        let readinessColor = AppColors.metricColor(for: CGFloat(readiness))
        let conflictCount = mil?.activeConflicts.count ?? 0
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(readinessColor)
                    Text("MILITARY STATUS")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .tracking(2)
                }
                Spacer()
                if conflictCount > 0 {
                    Text("\(conflictCount) ACTIVE CONFLICT\(conflictCount > 1 ? "S" : "")")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.error)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(AppColors.error.opacity(0.12), in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                }
            }
            if mil != nil {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("READINESS")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        Text("\(readiness)")
                            .font(.system(size: 28, weight: .bold, design: .monospaced))
                            .foregroundColor(readinessColor)
                    }
                    ZStack {
                        Circle()
                            .stroke(AppColors.border, lineWidth: 4)
                        Circle()
                            .trim(from: 0, to: CGFloat(readiness) / 100)
                            .stroke(readinessColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    .frame(width: 44, height: 44)
                    Spacer()
                    Button {
                        showMilitarySheet = true
                    } label: {
                        HStack(spacing: 5) {
                            Text("Full Briefing")
                                .font(.system(size: 12, weight: .medium))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(AppColors.accentPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(AppColors.accentPrimary.opacity(0.10), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Open full military briefing")
                }
            } else {
                Text("No military data available")
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundSubtle)
                    .italic()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.foreground)
                    Text(subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
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
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(AppColors.backgroundElevated)
        )
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
