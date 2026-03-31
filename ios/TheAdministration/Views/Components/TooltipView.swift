import SwiftUI

// MARK: - TooltipView

struct TooltipView: View {
    let title: String
    let helpText: String
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title.uppercased())
                    .font(AppTypography.micro)
                    .foregroundColor(AppColors.accentPrimary)
                    .tracking(2)
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .accessibilityLabel("Dismiss help")
            }

            Text(helpText)
                .font(AppTypography.bodySmall)
                .foregroundColor(AppColors.foregroundMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .background(AppColors.backgroundMuted)
        .overlay(Rectangle().stroke(AppColors.accentPrimary.opacity(0.3), lineWidth: 1))
        .shadow(color: AppColors.background.opacity(0.8), radius: 20)
        .transition(.opacity.combined(with: .scale(scale: 0.95, anchor: .topLeading)))
        .zIndex(100)
    }
}

// MARK: - InfoButton

/// A small (i) button that shows a floating tooltip when tapped.
struct InfoButton: View {
    let title: String
    let helpText: String
    @State private var showTooltip = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            Button(action: {
                withAnimation(AppMotion.quickSnap) {
                    showTooltip.toggle()
                }
                HapticEngine.shared.light()
            }) {
                Image(systemName: "info.circle")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(AppColors.foregroundSubtle)
            }
            .accessibilityLabel("Help: \(title)")

            if showTooltip {
                TooltipView(title: title, helpText: helpText) {
                    withAnimation(AppMotion.quickSnap) { showTooltip = false }
                }
                .frame(width: 260)
                .offset(x: 0, y: 24)
            }
        }
    }
}
