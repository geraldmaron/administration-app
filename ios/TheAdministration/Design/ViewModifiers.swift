/// ViewModifiers
/// Reusable SwiftUI ViewModifiers for The Administration design system.
/// Replaces hundreds of inline style applications across all view files.
import SwiftUI
import UIKit

// MARK: - Safe SF Symbol

/// Returns an SF Symbol name that exists on this OS, or a fallback to avoid "No symbol named '…' found" console errors.
func safeSystemImageName(_ name: String, fallback: String = "star.fill") -> String {
    guard !name.isEmpty, UIImage(systemName: name) != nil else { return fallback }
    return name
}

// MARK: - Card Variant

enum CardVariant {
    case `default`
    case elevated
    case interactive
    case metric
    case accent
}

// MARK: - Card Style Modifier

struct CardStyleModifier: ViewModifier {
    let variant: CardVariant
    var padding: CGFloat = AppSpacing.cardPadding

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: borderLineWidth)
            )
    }

    private var background: Color {
        switch variant {
        case .default: return AppColors.border
        case .elevated: return AppColors.backgroundElevated
        case .interactive: return AppColors.backgroundElevated
        case .metric: return AppColors.backgroundMuted
        case .accent: return AppColors.backgroundElevated
        }
    }

    private var borderColor: Color {
        switch variant {
        case .default:
            return AppColors.borderStrong
        case .elevated:
            return AppColors.border
        case .interactive:
            return AppColors.borderStrong
        case .metric:
            return AppColors.borderStrong
        case .accent:
            return AppColors.accentPrimary.opacity(0.3)
        }
    }

    private var borderLineWidth: CGFloat {
        1
    }
}

// MARK: - Label Style Modifier

struct AppLabelModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(AppTypography.label)
            .foregroundColor(AppColors.foregroundSubtle)
            .textCase(.uppercase)
            .tracking(2)
    }
}

// MARK: - Screen Background Modifier

struct ScreenBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            content
        }
    }
}

// MARK: - Accent Glow Modifier

struct AccentGlowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.2), radius: min(radius, 6), x: 0, y: 0)
    }
}

// MARK: - Shimmer Loading Modifier

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { _ in
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0),
                            Color.white.opacity(0.06),
                            Color.white.opacity(0)
                        ],
                        startPoint: UnitPoint(x: phase, y: 0),
                        endPoint: UnitPoint(x: phase + 1, y: 0)
                    )
                }
            )
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - Stagger Entrance Modifier

struct StaggerEntranceModifier: ViewModifier {
    let index: Int
    let offset: CGFloat
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .onAppear {
                withAnimation(AppMotion.standard) {
                    appeared = true
                }
            }
    }
}

// MARK: - View Extension

extension View {
    func cardStyle(_ variant: CardVariant = .default, padding: CGFloat = AppSpacing.cardPadding) -> some View {
        modifier(CardStyleModifier(variant: variant, padding: padding))
    }

    func appLabelStyle() -> some View {
        modifier(AppLabelModifier())
    }

    func screenBackground() -> some View {
        modifier(ScreenBackgroundModifier())
    }

    func accentGlow(color: Color, radius: CGFloat = 12) -> some View {
        modifier(AccentGlowModifier(color: color, radius: radius))
    }

    func shimmerLoading() -> some View {
        modifier(ShimmerModifier())
    }

    func staggerEntrance(index: Int, offset: CGFloat = 20) -> some View {
        modifier(StaggerEntranceModifier(index: index, offset: offset))
    }
}
