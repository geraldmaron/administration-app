import SwiftUI

/// Centralized color design tokens for The Administration
/// Implements design system from design.md with OKLCH color space
struct AppColors {
    // MARK: - Base Colors
    
    /// Primary background - pure black
    static let background = Color(red: 0, green: 0, blue: 0)
    
    /// Slightly elevated background for cards and panels
    static let backgroundElevated = Color(red: 0.06, green: 0.06, blue: 0.06)
    
    /// Muted background for secondary surfaces
    static let backgroundMuted = Color(red: 0.10, green: 0.10, blue: 0.10)
    
    // MARK: - Foreground Colors
    
    /// Pure white for primary text
    static let foreground = Color.white
    
    /// Muted foreground for secondary text
    static let foregroundMuted = Color(white: 0.70)
    
    /// Subtle foreground for tertiary text
    static let foregroundSubtle = Color(white: 0.50)
    
    // MARK: - Borders
    
    /// Standard border color
    static let border = Color(white: 1.0).opacity(0.12)
    
    /// Strong border color
    static let borderStrong = Color(white: 1.0).opacity(0.18)
    
    // MARK: - Accent Colors (theme-adaptive, driven by ThemeManager)

    /// Primary accent — resolves from active AppTheme
    static var accentPrimary: Color { ThemeManager.shared.current.accentPrimary }

    /// Secondary accent — resolves from active AppTheme
    static var accentSecondary: Color { ThemeManager.shared.current.accentSecondary }

    /// Tertiary accent — resolves from active AppTheme
    static var accentTertiary: Color { ThemeManager.shared.current.accentTertiary }

    /// Muted accent (15% opacity of primary) — resolves from active AppTheme
    static var accentMuted: Color { ThemeManager.shared.current.accentMuted }
    
    // MARK: - Semantic Status Colors
    
    /// Success/Positive color - Modern Teal (OKLCH 0.72 0.19 150)
    static let success = Color(red: 0.059, green: 0.871, blue: 0.604)  // #0fdf9c
    
    /// Warning/Caution color - Vibrant Orange (OKLCH 0.80 0.20 65)
    static let warning = Color(red: 1.0, green: 0.584, blue: 0.098)  // #ffa500
    
    /// Error/Critical color - Bright Red (OKLCH 0.65 0.28 15)
    static let error = Color(red: 0.996, green: 0.278, blue: 0.235)  // #ff4747
    
    /// Info color - Sky Blue (OKLCH 0.70 0.20 230)
    static let info = Color(red: 0.098, green: 0.612, blue: 1.0)  // #199cff
    
    // MARK: - Metric Status Colors
    
    /// Metric critical threshold color - used for values < 20 or > 80 (inverse)
    static let metricCritical = error

    /// Metric low range - used for values 20-40
    static let metricLow = warning

    /// Metric healthy range - used for values 40-70
    static var metricHealthy: Color { accentPrimary }

    /// Metric high range - used for values 70+ (Cyan/Teal)
    static var metricHigh: Color { accentTertiary }
    
    // MARK: - Helper Methods
    
    /// Returns color based on metric value (0-100)
    /// - Parameters:
    ///   - value: Metric value (0-100)
    /// - Returns: Color appropriate for value
    static func metricColor(for value: CGFloat) -> Color {
        switch value {
        case 0...20:
            return metricCritical
        case 20..<40:
            return metricLow
        case 40..<70:
            return metricHealthy
        default:  // 70+
            return metricHigh
        }
    }
    
    /// Returns color for letter grade
    /// - Parameters:
    ///   - grade: Letter grade (A+, A, A-, B+, etc.)
    /// - Returns: Color for grade
    static func gradeColor(for grade: String) -> Color {
        switch grade {
        case "A+", "A", "A-":
            return success
        case "B+", "B", "B-":
            return metricHealthy
        case "C+", "C", "C-":
            return warning
        case "D+", "D", "D-", "F":
            return error
        default:
            return foregroundMuted
        }
    }

    /// Primary accent gradient derived from the active theme.
    static var accentGradient: LinearGradient {
        LinearGradient(
            colors: [accentPrimary, accentTertiary, accentSecondary],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
    
    /// Returns text color with appropriate contrast for given background
    /// - Parameters:
    ///   - background: The background color
    /// - Returns: Foreground color with good contrast
    static func contrastText(for background: Color) -> Color {
        // For all backgrounds in this design system, white/light text works
        return foreground
    }

    // MARK: - Glow and Gradient Helpers

    /// Subtle accent glow — near-invisible, used only for key interactive surfaces.
    static var accentGlow: LinearGradient {
        LinearGradient(
            colors: [
                accentPrimary.opacity(0.12),
                accentPrimary.opacity(0.0)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// Returns a gradient representing scenario severity.
    /// - Parameter severity: 0 (low) to 1 (critical)
    static func severityGradient(for severity: Double) -> LinearGradient {
        let clamped = max(0, min(1, severity))
        let start: Color
        let end: Color

        switch clamped {
        case 0..<0.33:
            start = success
            end = accentTertiary
        case 0.33..<0.66:
            start = warning
            end = success
        default:
            start = error
            end = warning
        }

        return LinearGradient(
            colors: [start, end],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    /// Returns a shadow array that produces a subtle glow for the given color.
    static func cardGlow(color: Color) -> [Shadow] {
        [
            Shadow(color: color.opacity(0.4), radius: 18, x: 0, y: 0),
            Shadow(color: color.opacity(0.2), radius: 32, x: 0, y: 0)
        ]
    }
}

// MARK: - SwiftUI Color Extension

extension Color {
    /// Access design system colors through Color extension
    static let appBackground = AppColors.background
    static let appBackgroundElevated = AppColors.backgroundElevated
    static let appBackgroundMuted = AppColors.backgroundMuted
    static let appForeground = AppColors.foreground
    static let appForegroundMuted = AppColors.foregroundMuted
    static let appForegroundSubtle = AppColors.foregroundSubtle
    static let appBorder = AppColors.border
    static let appBorderStrong = AppColors.borderStrong
    // Theme-adaptive: must be `var` to re-evaluate each access
    static var appAccentPrimary: Color { AppColors.accentPrimary }
    static var appAccentSecondary: Color { AppColors.accentSecondary }
    static var appAccentTertiary: Color { AppColors.accentTertiary }
    static let appSuccess = AppColors.success
    static let appWarning = AppColors.warning
    static let appError = AppColors.error
    static let appInfo = AppColors.info
}

/// Simple value type to describe a shadow, so we can return arrays from AppColors.
struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

