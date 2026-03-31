import SwiftUI

private struct LegalSection: Identifiable {
    let id: String
    let title: String
    let body: String
}

private let termsSections: [LegalSection] = [
    LegalSection(
        id: "earlyaccess",
        title: "Early Access Notice",
        body: "The Administration is currently in active development. Features, mechanics, and content may change, be removed, or behave unexpectedly without prior notice. Game saves may not be compatible across updates. We appreciate your patience as the game continues to evolve."
    ),
    LegalSection(
        id: "acceptance",
        title: "1. Acceptance of Terms",
        body: "By downloading, installing, or using The Administration, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the app. We reserve the right to update these terms at any time. Continued use of the app after changes are posted constitutes acceptance of the revised terms."
    ),
    LegalSection(
        id: "license",
        title: "2. License to Use",
        body: "We grant you a limited, non-exclusive, non-transferable, revocable license to use The Administration for personal, non-commercial purposes on devices you own or control. This license does not include the right to sublicense, sell, resell, transfer, or exploit any portion of the app or its content for any commercial purpose."
    ),
    LegalSection(
        id: "prohibited",
        title: "3. Prohibited Conduct",
        body: "You agree not to:\n\n• Reverse engineer, decompile, or disassemble any part of the app\n• Attempt to gain unauthorized access to any systems connected to the app\n• Use the app to transmit malicious code or interfere with its operation\n• Reproduce or redistribute any app content without explicit written permission\n• Use automated tools to interact with the app outside of normal gameplay"
    ),
    LegalSection(
        id: "ip",
        title: "4. Intellectual Property",
        body: "All content within The Administration — including but not limited to gameplay mechanics, scenario text, visual design, sound, and underlying code — is the exclusive property of the developer and is protected by applicable intellectual property laws. Nothing in these terms transfers any intellectual property rights to you."
    ),
    LegalSection(
        id: "disclaimer",
        title: "5. Disclaimer of Warranties",
        body: "The Administration is provided \"as is\" and \"as available\" without warranties of any kind, express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of harmful components. Gameplay scenarios, AI-generated analysis, and metric outcomes are fictional and for entertainment purposes only. They do not constitute political, financial, or policy advice."
    ),
    LegalSection(
        id: "liability",
        title: "6. Limitation of Liability",
        body: "To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the app — including but not limited to loss of data, loss of game progress, or device-related issues. Our total liability to you for any claim shall not exceed the amount you paid for the app."
    ),
    LegalSection(
        id: "changes",
        title: "7. Changes to These Terms",
        body: "We may revise these Terms of Service from time to time. When we do, we will update the \"Last Updated\" date below. Material changes will be communicated through an in-app notice. Your continued use of The Administration after any such changes constitutes your acceptance of the new terms."
    ),
    LegalSection(
        id: "contact",
        title: "8. Contact",
        body: "If you have questions about these Terms of Service, please contact us through the app's support channel or reach out via the contact information provided on the App Store listing."
    )
]

struct TermsOfServiceSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        headerView
                        Rectangle().fill(AppColors.border).frame(height: 1)

                        ForEach(Array(termsSections.enumerated()), id: \.element.id) { index, section in
                            sectionBlock(section)
                            if index < termsSections.count - 1 {
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

    private var headerView: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            Text("LEGAL_FRAMEWORK")
                .font(.system(size: 9, weight: .black, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)

            Text("Terms of Service")
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

    private func sectionBlock(_ section: LegalSection) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(section.title)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.foreground)

            Text(section.body)
                .font(AppTypography.body)
                .foregroundColor(AppColors.foregroundMuted)
                .lineSpacing(4)
        }
        .padding(.horizontal, AppSpacing.cardPadding)
        .padding(.vertical, AppSpacing.lg)
    }
}
