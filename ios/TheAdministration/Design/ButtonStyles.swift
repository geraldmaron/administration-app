/// ButtonStyles
/// Implements the 7 design system button variants for The Administration.
/// Each style includes press animation and haptic feedback.
import SwiftUI

// MARK: - CommandButtonStyle (primary CTA)

struct CommandButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.background)
            .tracking(2)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Group {
                    if isEnabled {
                        AppColors.accentGradient
                    } else {
                        AppColors.foregroundSubtle
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.88 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.medium() }
            }
    }
}

// MARK: - TacticalButtonStyle (secondary action)

struct TacticalButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.accentPrimary)
            .tracking(2)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(AppColors.backgroundMuted)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppColors.accentPrimary.opacity(0.4), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - AccentButtonStyle (accent colored with glow)

struct AccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.background)
            .tracking(1)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(AppColors.accentPrimary)
            .shadow(color: AppColors.accentPrimary.opacity(0.5), radius: 10)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.medium() }
            }
    }
}

// MARK: - GhostButtonStyle (text only)

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.foregroundMuted)
            .tracking(1)
            .opacity(configuration.isPressed ? 0.6 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
    }
}

// MARK: - OutlineButtonStyle (border only)

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.foreground)
            .tracking(1)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(AppColors.borderStrong, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
    }
}

// MARK: - SecondaryButtonStyle (muted background)

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.foregroundMuted)
            .tracking(1)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(AppColors.backgroundMuted)
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(AppColors.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
    }
}

// MARK: - DestructiveButtonStyle (danger)

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.label)
            .foregroundColor(AppColors.error)
            .tracking(1)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(AppColors.error.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(AppColors.error.opacity(0.3), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.heavy() }
            }
    }
}
