import SwiftUI

// MARK: - CommandButtonStyle (primary CTA — gold)

struct CommandButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .bold))
            .tracking(1.2)
            .textCase(.uppercase)
            .foregroundColor(isEnabled ? AppColors.background : AppColors.foregroundSubtle)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(
                        isEnabled
                            ? LinearGradient(
                                colors: [AppColors.accentTertiary, AppColors.accentPrimary],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                            : LinearGradient(
                                colors: [AppColors.foregroundSubtle.opacity(0.3)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(configuration.isPressed ? Color.black.opacity(0.15) : Color.clear)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(
                        isEnabled ? AppColors.accentPrimary.opacity(0.4) : Color.clear,
                        lineWidth: 1
                    )
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
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color.white.opacity(configuration.isPressed ? 0.16 : 0.06), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - TacticalButtonStyle

struct TacticalButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.light() }
            }
    }
}

// MARK: - AccentButtonStyle

struct AccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .bold))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundColor(AppColors.background)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
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
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.5)
            .foregroundColor(AppColors.foregroundMuted)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .opacity(configuration.isPressed ? 0.5 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
    }
}

// MARK: - OutlineButtonStyle

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundColor(AppColors.foreground)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.white.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(AppColors.border, lineWidth: 1)
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
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundColor(AppColors.error)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(AppColors.error.opacity(0.12))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(AppColors.error.opacity(0.25), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(AppMotion.quickSnap, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                if pressed { HapticEngine.shared.heavy() }
            }
    }
}
