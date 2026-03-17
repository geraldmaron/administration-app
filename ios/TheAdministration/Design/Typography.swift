import SwiftUI

/// AppTypography
/// Centralizes semantic typography tokens for The Administration.
/// SF Pro exclusively — monospaced only for literal numeric data values.
struct AppTypography {
    // Display
    static let displayLarge = Font.system(size: 40, weight: .bold, design: .default)
    static let displayMedium = Font.system(size: 28, weight: .semibold, design: .default)

    // Titles
    static let title = Font.system(size: 24, weight: .semibold, design: .default)
    static let headline = Font.system(size: 18, weight: .semibold, design: .default)
    static let subheadline = Font.system(size: 16, weight: .medium, design: .default)

    // Body
    static let body = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 14, weight: .regular, design: .default)

    // Captions & labels — SF Pro, not monospaced
    static let caption = Font.system(size: 13, weight: .medium, design: .default)
    static let label = Font.system(size: 12, weight: .medium, design: .default)
    static let micro = Font.system(size: 11, weight: .regular, design: .default)

    // Data — monospaced only for numeric values
    static let data = Font.system(size: 24, weight: .semibold, design: .monospaced)
    static let dataLarge = Font.system(size: 48, weight: .bold, design: .monospaced)

    // Brand — for title mark, all-caps BLACK weight
    static let brand = Font.system(size: 52, weight: .black, design: .default)
    static let brandSmall = Font.system(size: 36, weight: .black, design: .default)
    // Screen titles — all caps authority
    static let screenTitle = Font.system(size: 22, weight: .heavy, design: .default)
}

