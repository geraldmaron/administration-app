/// TrustYourGutSheet
/// Sheet that lets the player issue a "Trust Your Gut" command — an AI-assisted
/// decision that overrides the current scenario options. Mirrors the web
/// TrustYourGutModal and related flow.
import SwiftUI

struct TrustYourGutSheet: View {
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss
    @State private var command = ""
    @State private var isSubmitting = false

    private var remaining: Int { gameStore.getRemainingTrustYourGutUses() }
    private var max: Int { gameStore.getMaxTrustYourGutUses() }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()
                VStack(spacing: 24) {
                    headerSection
                    usageIndicator
                    commandField
                    Spacer()
                    actionButtons
                }
                .padding(20)
            }
            .navigationTitle("Trust Your Gut")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.foregroundMuted)
                }
            }
        }
    }

    // MARK: - Header
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Override the briefing.")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(AppColors.foreground)
            Text("Issue a direct command. The administration will act on your instinct — but uses are limited.")
                .font(.system(size: 13))
                .foregroundColor(AppColors.foregroundMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Usage Indicator
    private var usageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<max, id: \.self) { idx in
                Circle()
                    .fill(idx < remaining ? AppColors.accentPrimary : AppColors.border)
                    .frame(width: 12, height: 12)
            }
            Spacer()
            Text("\(remaining)/\(max) remaining")
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundColor(remaining > 0 ? AppColors.foreground : AppColors.error)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(remaining) of \(max) Trust Your Gut uses remaining")
    }

    // MARK: - Command Field
    private var commandField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("YOUR COMMAND")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(AppColors.foregroundSubtle)
                .tracking(2)
            ZStack(alignment: .topLeading) {
                if command.isEmpty {
                    Text("e.g. Impose emergency economic controls")
                        .font(.system(size: 13))
                        .foregroundColor(AppColors.foregroundSubtle)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 14)
                }
                TextEditor(text: $command)
                    .font(.system(size: 13))
                    .foregroundColor(AppColors.foreground)
                    .frame(minHeight: 120)
                    .padding(8)
                    .scrollContentBackground(.hidden)
                    .background(Color.clear)
            }
            .background(AppColors.backgroundElevated)
            .overlay(Rectangle().stroke(AppColors.borderStrong, lineWidth: 1))
        }
        .accessibilityLabel("Your gut command input field")
    }

    // MARK: - Buttons
    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                guard !command.trimmingCharacters(in: .whitespaces).isEmpty,
                      remaining > 0 else { return }
                isSubmitting = true
                let cmd = command
                Task {
                    await gameStore.trustYourGut(command: cmd)
                    dismiss()
                }
            } label: {
                HStack {
                    if isSubmitting {
                        ProgressView().tint(AppColors.background)
                    } else {
                        Text("EXECUTE COMMAND")
                            .font(.system(size: 13, weight: .black))
                            .tracking(1)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(remaining > 0 && !command.isEmpty ? AppColors.accentPrimary : AppColors.border)
                .foregroundColor(remaining > 0 && !command.isEmpty ? AppColors.background : AppColors.foregroundSubtle)
            }
            .disabled(remaining == 0 || command.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
            .accessibilityLabel("Execute gut command")
            .accessibilityHint(remaining == 0 ? "No uses remaining" : "Execute your command")

            if remaining == 0 {
                Text("No Trust Your Gut uses remaining this game.")
                    .font(.system(size: 11))
                    .foregroundColor(AppColors.error)
                    .multilineTextAlignment(.center)
            }
        }
    }
}
