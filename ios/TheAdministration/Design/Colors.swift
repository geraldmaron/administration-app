import SwiftUI

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
    
    // MARK: - Accent Colors (fixed grayscale)

    static let accentPrimary = Color(white: 0.90)
    static let accentSecondary = Color(white: 0.60)
    static let accentTertiary = Color(white: 0.75)
    static let accentMuted = Color(white: 0.90).opacity(0.15)
    
    // MARK: - Semantic Status Colors

    static let success = Color(red: 0.35, green: 0.78, blue: 0.48)
    static let warning = Color(red: 0.85, green: 0.72, blue: 0.40)
    static let error = Color(red: 0.85, green: 0.45, blue: 0.40)
    static let info = Color(red: 0.45, green: 0.65, blue: 0.82)

    // MARK: - Metric Status Colors

    static let metricCritical = error
    static let metricLow = warning
    static let metricHealthy = success
    static let metricHigh = Color(red: 0.42, green: 0.90, blue: 0.55)

    // MARK: - Helper Methods

    static func metricColor(for value: CGFloat) -> Color {
        switch value {
        case 0...20:   return metricCritical
        case 20..<40:  return metricLow
        case 40..<70:  return metricHealthy
        default:       return metricHigh
        }
    }

    static func metricColor(for value: CGFloat, isInverse: Bool) -> Color {
        metricColor(for: isInverse ? (100 - value) : value)
    }

    static let metricThresholds: [String: (critical: CGFloat, low: CGFloat, high: CGFloat)] = [
        "metric_approval":          (25, 40, 62),
        "metric_economy":           (25, 42, 63),
        "metric_foreign_relations": (25, 42, 65),
        "metric_public_order":      (25, 42, 65),
        "metric_liberty":           (25, 45, 68),
        "metric_military":          (22, 42, 65),
        "metric_innovation":        (25, 45, 68),
        "metric_health":            (25, 45, 68),
        "metric_equality":          (25, 45, 68),
        "metric_corruption":        (25, 45, 68),
        "metric_inflation":         (25, 45, 72),
        "metric_unrest":            (25, 42, 65),
        "metric_bureaucracy":       (25, 45, 68),
        "metric_economic_bubble":   (25, 45, 68),
        "metric_foreign_influence": (25, 45, 68),
        "metric_crime":             (25, 42, 65),
        "metric_employment":        (25, 42, 63),
        "metric_budget":            (20, 40, 65),
        "metric_trade":             (22, 42, 65),
        "metric_energy":            (22, 40, 65),
        "metric_housing":           (25, 40, 62),
        "metric_infrastructure":    (22, 40, 65),
        "metric_education":         (22, 42, 68),
        "metric_democracy":         (25, 42, 65),
        "metric_sovereignty":       (25, 42, 68),
        "metric_immigration":       (22, 40, 65),
        "metric_environment":       (22, 42, 68),
    ]

    static func metricColor(for value: CGFloat, metricId: String, isInverse: Bool = false) -> Color {
        let effective = isInverse ? (100 - value) : value
        let t = metricThresholds[metricId] ?? (critical: 20, low: 40, high: 70)
        switch effective {
        case ..<t.critical: return metricCritical
        case t.critical..<t.low: return metricLow
        case t.low..<t.high: return metricHealthy
        default: return metricHigh
        }
    }

    static func gridlockColor(for value: Int) -> Color {
        switch value {
        case 60...: return error
        case 40..<60: return warning
        default: return success
        }
    }

    static func gradeColor(for grade: String) -> Color {
        switch grade {
        case "A+", "A", "A-":       return metricHigh
        case "B+", "B", "B-":       return metricHealthy
        case "C+", "C", "C-":       return warning
        case "D+", "D", "D-", "F":  return error
        default:                    return foregroundMuted
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
    static let appAccentPrimary = AppColors.accentPrimary
    static let appAccentSecondary = AppColors.accentSecondary
    static let appAccentTertiary = AppColors.accentTertiary
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

