import SwiftUI

private struct GuideSection: Identifiable {
    let id: String
    let label: String
    let title: String
    let body: String
}

private let guideSections: [GuideSection] = [
    GuideSection(
        id: "mission",
        label: "BRIEFING",
        title: "The Mission",
        body: "You are the head of government of a real country. Your administration inherits that country's institutions, history, economy, geopolitical relationships, and current conditions — not a blank canvas.\n\nYour task is to navigate the pressures of office: manage a complex web of national metrics, respond to crises as they emerge, and survive your term without losing political legitimacy. There are no correct answers — only trade-offs with consequences that persist and compound over time."
    ),
    GuideSection(
        id: "loop",
        label: "CORE LOOP",
        title: "How Each Turn Works",
        body: "Each turn, a scenario is surfaced — a crisis, a policy decision, a diplomatic situation, or an internal challenge appropriate to your country and current conditions.\n\nYou read the situation and choose one of three options. You do not see exact metric impacts before choosing. After you decide, you receive the outcome as a news report: a headline, a summary of what happened, and then the gameplay reveal showing how your metrics moved.\n\nYour decision is locked before you see the results. Every consequence carries forward."
    ),
    GuideSection(
        id: "decisions",
        label: "DECISIONS",
        title: "Options & the Advisor",
        body: "Every scenario offers exactly three options representing distinct governing approaches. Each option has different trade-offs — there is rarely a dominant choice.\n\nBefore deciding, you can consult your Advisor: an AI-powered briefing that analyzes the scenario from political, economic, social, and strategic angles. The advisor surfaces likely consequences and trade-offs. You still choose.\n\nThe Advisor helps you think. It does not tell you what to do, and it does not guarantee a good outcome."
    ),
    GuideSection(
        id: "trustyourgut",
        label: "OVERRIDE",
        title: "Trust Your Gut",
        body: "Once per several turns, instead of choosing from the authored options, you can write your own policy response in free text. This is Trust Your Gut.\n\nYou have a limited number of uses per run (between 3 and 6, depending on your cabinet size). Each use carries a small upfront cost to approval, foreign relations, and the economy — improvisation has a price.\n\nTrust Your Gut lets you govern outside the authored playbook. Your input is processed by the game's AI layer and resolved into real consequences, subject to the same realism rules as everything else. It is powerful, but scarce — use it when none of the provided options fit your strategy."
    ),
    GuideSection(
        id: "metrics",
        label: "INDICATORS",
        title: "The Metric System",
        body: "Your nation is tracked across 26 metrics, organized in three layers:\n\nCore metrics (19) — Economy, Public Order, Healthcare, Education, Infrastructure, Environment, Foreign Relations, Military, Liberty, Equality, Employment, Innovation, Trade, Energy, Housing, Democracy, Sovereignty, Immigration, Budget. Higher values are better.\n\nInverse metrics (7) — Corruption, Inflation, Crime, Bureaucracy, Unrest, Economic Bubble, Foreign Influence. Lower values are better. These are easy to let drift upward unnoticed.\n\nHidden metrics (3) — Unrest, Economic Bubble, and Foreign Influence begin hidden and only appear on your dashboard once they breach a reveal threshold. By then, they are already a problem.\n\nApproval is derived — it is not a metric you can directly control. It is recalculated every turn from a weighted formula across your core indicators, with economy, inflation, employment, and healthcare carrying the most weight.\n\nMetrics are not independent. Economic decline spreads to employment, housing, unrest, and public order. High corruption erodes liberty and foreign relations. Neglect long enough in the wrong areas, and cascade effects become very hard to reverse."
    ),
    GuideSection(
        id: "cabinet",
        label: "PERSONNEL",
        title: "Your Cabinet",
        body: "Your cabinet ministers are not decoration. Each occupies one of up to 13 roles — including Finance, Defence, Foreign Affairs, Justice, Health, Interior, Labour, Energy, Environment, Transport, Education, Commerce, and Executive.\n\nFull setup lets you choose your cabinet. Quick Start creates four ministers automatically (Executive, Diplomacy, Defence, Economy).\n\nCabinet members:\n• Provide per-role advisor stances on relevant scenarios\n• Apply a performance modifier to metric outcomes in their domain — a skilled Economy minister amplifies positive economic effects and cushions negative ones\n• Can be removed from office by scenario consequences — resignations, scandals, or deaths change your cabinet mid-run and affect both future advice and your Trust Your Gut capacity\n\nYour cabinet reflects your governing style. A hawkish Defence Minister will frame military scenarios differently than a diplomat. Their biases are real."
    ),
    GuideSection(
        id: "crises",
        label: "ESCALATION",
        title: "Crises",
        body: "Four crisis types can activate when specific metrics breach their thresholds:\n\nCivil Unrest — Unrest metric reaches 70. Grows organically from low public order, high inflation, economic distress, and inequality. Resolves only when Unrest falls back below 50.\n\nMarket Crash — Economic Bubble reaches 80. Builds when the economy overheats and inflation runs high. Resolves when the bubble deflates below 40.\n\nSovereignty Crisis — Foreign Influence reaches 75. Accumulates from diplomatic drift. Resolves when influence is pushed back below 40.\n\nApproval Collapse — Approval falls below 20. This is a direct existential threat to your administration.\n\nActive crises apply additional metric penalties every turn they remain unresolved and can surface reactive scenarios that lock your agenda. Address them before they compound."
    ),
    GuideSection(
        id: "gamelength",
        label: "TIMELINE",
        title: "Game Length",
        body: "At setup, you choose a mode: Short, Medium, or Long. This sets the approximate length of your term.\n\nShort: roughly 27–33 turns\nMedium: roughly 54–66 turns\nLong: roughly 108–132 turns\n\nThe exact turn count has some variance — it is fixed at the start of the run, not at a round number. Scenario phases (Early, Mid, Late, Endgame) shift as you move through your term, changing the types of scenarios that surface.\n\nYour run can end before the final turn. If your approval falls below 15, or if three or more of the core stability metrics — Approval, Economy, Foreign Relations, and Public Order — simultaneously fall below 20, your administration collapses. You do not have to reach the last turn to trigger the end-game review."
    ),
    GuideSection(
        id: "endgame",
        label: "LEGACY",
        title: "Endgame & Scoring",
        body: "When your term ends — whether by reaching the final turn or by collapse — your administration is evaluated.\n\nYour Legacy Score weighs two things: your final approval rating, and the average change in metrics across your full term. A high approval built on a declining country will not earn top marks. A technically improved nation that lost political legitimacy along the way will also be penalized.\n\nGrade outcomes:\nCOLLAPSE — approval below 30, regardless of everything else\nA — strong approval and a genuinely improved country\nB — solid performance, modest overall improvement\nC — survived, held most ground\nD — significant deterioration or political fragility\nF — everything else\n\nThe record you leave is your legacy."
    )
]

struct HowToPlaySheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var expandedIds: Set<String> = ["mission"]

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerView
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        devNotice
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        ForEach(Array(guideSections.enumerated()), id: \.element.id) { index, section in
                            sectionRow(section)
                            if index < guideSections.count - 1 {
                                Rectangle().fill(AppColors.border).frame(height: 1)
                            }
                        }

                        Spacer().frame(height: AppSpacing.tabBarClearance)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(AppColors.accentPrimary)
                }
            }
        }
    }

    private var devNotice: some View {
        HStack(alignment: .top, spacing: AppSpacing.sm) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 12))
                .foregroundColor(AppColors.warning)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 2) {
                Text("ACTIVE DEVELOPMENT")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundColor(AppColors.warning)
                    .tracking(2)
                Text("This game is in active development. Features, mechanics, and content may change without notice. Some things may not work as described.")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineSpacing(3)
            }
        }
        .padding(.horizontal, AppSpacing.cardPadding)
        .padding(.vertical, AppSpacing.md)
        .background(AppColors.warning.opacity(0.06))
    }

    private var headerView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("OPERATIONS_MANUAL")
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)

            Text("How to Play")
                .font(.system(size: 22, weight: .black))
                .foregroundColor(AppColors.foreground)

            Text("A guide to your administration")
                .font(AppTypography.body)
                .foregroundColor(AppColors.foregroundMuted)
        }
        .padding(.horizontal, AppSpacing.cardPadding)
        .padding(.top, AppSpacing.cardPadding)
        .padding(.bottom, AppSpacing.lg)
    }

    private func sectionRow(_ section: GuideSection) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: {
                HapticEngine.shared.light()
                withAnimation(AppMotion.quickSnap) {
                    if expandedIds.contains(section.id) {
                        expandedIds.remove(section.id)
                    } else {
                        expandedIds.insert(section.id)
                    }
                }
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(section.label)
                            .font(.system(size: 9, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        Text(section.title)
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.foreground)
                    }
                    Spacer()
                    Image(systemName: expandedIds.contains(section.id) ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .padding(.horizontal, AppSpacing.cardPadding)
                .padding(.vertical, AppSpacing.md)
            }
            .buttonStyle(.plain)

            if expandedIds.contains(section.id) {
                Text(section.body)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineSpacing(4)
                    .padding(.horizontal, AppSpacing.cardPadding)
                    .padding(.bottom, AppSpacing.lg)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}
