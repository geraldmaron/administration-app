import SwiftUI

/// AppTypography
/// Centralizes semantic typography tokens for The Administration.
/// Maps existing font usages onto a consistent type scale.
struct AppTypography {
    // Display
    static let displayLarge = Font.system(size: 38, weight: .bold, design: .default)
    static let displayMedium = Font.system(size: 26, weight: .bold, design: .default)

    // Titles
    static let title = Font.system(size: 22, weight: .semibold, design: .default)
    static let headline = Font.system(size: 18, weight: .semibold, design: .default)
    static let subheadline = Font.system(size: 16, weight: .medium, design: .default)

    // Body
    static let body = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 13, weight: .regular, design: .default)

    // Captions & labels
    static let caption = Font.system(size: 12, weight: .semibold, design: .default)
    static let label = Font.system(size: 11, weight: .semibold, design: .monospaced)
    static let micro = Font.system(size: 9, weight: .medium, design: .monospaced)

    // Data
    static let data = Font.system(size: 24, weight: .black, design: .monospaced)
    static let dataLarge = Font.system(size: 48, weight: .black, design: .monospaced)
}

