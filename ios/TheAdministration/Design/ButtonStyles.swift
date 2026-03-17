/// ButtonStyles
/// Button variants for The Administration design system.
/// Clean and solid — no gradients, glows, or aggressive tracking.
import SwiftUI

// MARK: - CommandButtonStyle (primary CTA)

struct CommandButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .tracking(1)
            .foregroundColor(isEnabled ? AppColors.background : AppColors.foregroundSubtle)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isEnabled ? AppColors.accentPrimary : AppColors.foregroundSubtle.opacity(0.3))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(configuration.isPressed ? Color.white.opacity(0.12) : Color.clear)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(isEnabled ? AppColors.accentPrimary.opacity(0.3) : Color.clear, lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.medium() }
            }
    }
}

// MARK: - SecondaryButtonStyle (flat fill)

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .tracking(0.5)
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.white.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(Color.white.opacity(configuration.isPressed ? 0.12 : 0), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - TacticalButtonStyle — alias for SecondaryButtonStyle

struct TacticalButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - AccentButtonStyle — maps to CommandButtonStyle behavior

struct AccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(AppColors.background)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppColors.accentPrimary)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
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
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(AppColors.foregroundMuted)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .opacity(configuration.isPressed ? 0.5 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
    }
}

// MARK: - OutlineButtonStyle — flat secondary style

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - DestructiveButtonStyle (danger)

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(.white)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(AppColors.error.opacity(0.18))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.heavy() }
            }
    }
}