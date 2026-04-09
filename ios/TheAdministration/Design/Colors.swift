import SwiftUI

struct AppColors {
    // MARK: - Base Colors

    static let background = Color(red: 0, green: 0, blue: 0)
    static let backgroundElevated = Color(red: 0.047, green: 0.055, blue: 0.078)
    static let backgroundMuted = Color(red: 0.078, green: 0.086, blue: 0.11)
    static let backgroundPanel = Color(red: 0.092, green: 0.100, blue: 0.130)
    static let backgroundSurface = Color(red: 0.120, green: 0.130, blue: 0.168)

    // MARK: - Foreground Colors

    static let foreground = Color(white: 0.92)
    static let foregroundMuted = Color(white: 0.56)
    static let foregroundSubtle = Color(white: 0.36)

    // MARK: - Borders

    static let border = Color(white: 1.0).opacity(0.10)
    static let borderStrong = Color(white: 1.0).opacity(0.16)

    // MARK: - Accent Colors — Presidential Gold

    static let accentPrimary = Color(red: 0.77, green: 0.58, blue: 0.16)
    static let accentSecondary = Color(red: 0.50, green: 0.44, blue: 0.35)
    static let accentTertiary = Color(red: 0.83, green: 0.69, blue: 0.42)
    static let accentMuted = Color(red: 0.77, green: 0.58, blue: 0.16).opacity(0.12)

    // MARK: - Semantic Status Colors

    static let success = Color(red: 0.24, green: 0.63, blue: 0.54)
    static let warning = Color(red: 0.78, green: 0.50, blue: 0.25)
    static let error = Color(red: 0.75, green: 0.25, blue: 0.25)
    static let info = Color(red: 0.30, green: 0.54, blue: 0.72)

    // MARK: - Metric Status Colors

    static let metricCritical = error
    static let metricLow = warning
    static let metricHealthy = info
    static let metricHigh = accentPrimary

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

    static var accentGradient: LinearGradient {
        LinearGradient(
            colors: [accentPrimary, accentTertiary, accentSecondary],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    static func contrastText(for background: Color) -> Color {
        return foreground
    }

    // MARK: - Glow and Gradient Helpers

    static var accentGlow: LinearGradient {
        LinearGradient(
            colors: [
                accentPrimary.opacity(0.15),
                accentPrimary.opacity(0.0)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static func severityGradient(for severity: Double) -> LinearGradient {
        let clamped = max(0, min(1, severity))
        let start: Color
        let end: Color

        switch clamped {
        case 0..<0.33:
            start = info
            end = accentTertiary
        case 0.33..<0.66:
            start = warning
            end = info
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

    static func cardGlow(color: Color) -> [Shadow] {
        [
            Shadow(color: color.opacity(0.4), radius: 18, x: 0, y: 0),
            Shadow(color: color.opacity(0.2), radius: 32, x: 0, y: 0)
        ]
    }
}

// MARK: - SwiftUI Color Extension

extension Color {
    static let appBackground = AppColors.background
    static let appBackgroundElevated = AppColors.backgroundElevated
    static let appBackgroundMuted = AppColors.backgroundMuted
    static let appBackgroundPanel = AppColors.backgroundPanel
    static let appBackgroundSurface = AppColors.backgroundSurface
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

struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}
