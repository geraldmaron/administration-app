import SwiftUI

struct PrivacySheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerView
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        overviewSection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        storedLocallySection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        notCollectedSection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        aiSection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        thirdPartySection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        rightsSection
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        contactSection

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

    private var headerView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("DATA_PROTOCOL")
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)

            Text("Privacy & Data")
                .font(.system(size: 22, weight: .black))
                .foregroundColor(AppColors.foreground)

            Text("Last updated: March 2025")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.foregroundSubtle)
        }
        .padding(.horizontal, AppSpacing.cardPadding)
        .padding(.top, AppSpacing.cardPadding)
        .padding(.bottom, AppSpacing.lg)
    }

    private var overviewSection: some View {
        sectionBlock(
            label: "OVERVIEW",
            title: "Your Data Stays on Your Device",
            body: "The Administration is designed with privacy as a default. There are no accounts. No sign-in required. Your game saves, preferences, and play history are stored exclusively on your device and are never uploaded to any server.\n\nWe do not collect behavioral data, analytics, or any information that could be used to identify you."
        )
    }

    private var storedLocallySection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            sectionLabel("ON-DEVICE STORAGE")
            Text("What Is Stored Locally")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, AppSpacing.cardPadding)

            VStack(spacing: AppSpacing.xs) {
                storageRow(
                    icon: "internaldrive",
                    title: "Game Saves",
                    detail: "JSON files stored in your device's Documents directory. Up to 10 manual save slots plus one auto-save. All data remains on-device."
                )
                Rectangle().fill(AppColors.border).frame(height: 1).padding(.horizontal, AppSpacing.cardPadding)
                storageRow(
                    icon: "slider.horizontal.3",
                    title: "Preferences",
                    detail: "App theme and last-used save slot, stored in UserDefaults. No personal information."
                )
            }
            .padding(.top, AppSpacing.xs)
            .padding(.bottom, AppSpacing.lg)
        }
    }

    private var notCollectedSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            sectionLabel("COLLECTION POLICY")
            Text("What We Do Not Collect")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, AppSpacing.cardPadding)

            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                notCollectedRow(
                    title: "No analytics or usage tracking",
                    detail: "No session tracking, no behavioral telemetry, no crash reporting services."
                )
                notCollectedRow(
                    title: "No advertising identifiers",
                    detail: "No IDFA, no ad SDKs, no tracking pixels."
                )
                notCollectedRow(
                    title: "No personal data",
                    detail: "No name, email, location, or device fingerprinting."
                )
                notCollectedRow(
                    title: "No cloud game sync",
                    detail: "Game state never leaves your device. Deleting the app deletes everything."
                )
            }
            .padding(.horizontal, AppSpacing.cardPadding)
            .padding(.top, AppSpacing.xs)
            .padding(.bottom, AppSpacing.lg)
        }
    }

    private var aiSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            sectionLabel("AI FEATURES")
            Text("Scenario Analysis & Action Resolution")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, AppSpacing.cardPadding)

            Text("When you consult your Advisor or use Trust Your Gut, the game sends a request to Firebase Cloud Functions, which routes it to the OpenAI API to generate the analysis or resolve your action.\n\nWhat is sent:\n• The current scenario description and available options\n• Basic game context (current turn, active crises, cabinet roles)\n\nWhat is NOT sent:\n• Your name, player identity, or any personal information\n• Your full game history or save data\n• Any device identifier or location information\n\nAll AI requests are stateless. Each request is processed independently with no persistent user session or profile on any server.")
                .font(AppTypography.body)
                .foregroundColor(AppColors.foregroundMuted)
                .lineSpacing(4)
                .padding(.horizontal, AppSpacing.cardPadding)
                .padding(.top, AppSpacing.xs)
                .padding(.bottom, AppSpacing.lg)
        }
    }

    private var thirdPartySection: some View {
        sectionBlock(
            label: "THIRD PARTIES",
            title: "Services Used",
            body: "Firebase Cloud Functions — used solely to route AI requests for Advisor analysis and Trust Your Gut resolution. Firebase does not store your game data or any personal information in connection with this app.\n\nOpenAI API — used to generate scenario analysis and resolve free-text actions. Requests contain only game context, not personally identifiable information. OpenAI's data handling is governed by their own privacy policy.\n\nNo other third-party SDKs, analytics tools, or data brokers are integrated."
        )
    }

    private var rightsSection: some View {
        sectionBlock(
            label: "YOUR RIGHTS",
            title: "Control Over Your Data",
            body: "Because all game data is stored locally on your device, you have complete control:\n\n• Delete the app to permanently remove all game saves and preferences\n• Manage individual save slots from within the game\n• No server-side deletion request is necessary — there is nothing stored remotely to delete"
        )
    }

    private var contactSection: some View {
        sectionBlock(
            label: "CONTACT",
            title: "Questions",
            body: "If you have questions or concerns about privacy, please reach out via the App Store support contact or the feedback channel provided in the app."
        )
    }

    private func sectionBlock(label: String, title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            sectionLabel(label)
            Text(title)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foreground)
                .padding(.horizontal, AppSpacing.cardPadding)
            Text(body)
                .font(AppTypography.body)
                .foregroundColor(AppColors.foregroundMuted)
                .lineSpacing(4)
                .padding(.horizontal, AppSpacing.cardPadding)
                .padding(.bottom, AppSpacing.lg)
        }
        .padding(.top, AppSpacing.lg)
    }

    private func sectionLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .foregroundColor(AppColors.foregroundSubtle)
            .tracking(2)
            .padding(.horizontal, AppSpacing.cardPadding)
            .padding(.top, AppSpacing.lg)
    }

    private func storageRow(icon: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(AppColors.accentSecondary)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foreground)
                Text(detail)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineSpacing(3)
            }
        }
        .padding(.horizontal, AppSpacing.cardPadding)
    }

    private func notCollectedRow(title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: AppSpacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(AppColors.success)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foreground)
                Text(detail)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineSpacing(3)
            }
        }
    }
}
