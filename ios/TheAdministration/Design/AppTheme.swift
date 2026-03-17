/// AppTheme
/// Defines the 5 visual themes for The Administration.
/// Each theme overrides the accent palette while keeping the dark command-center base.
import SwiftUI

struct AppTheme: Identifiable, Equatable {
    let id: String
    let displayName: String
    let subtitle: String
    let accentPrimary: Color
    let accentSecondary: Color
    let accentTertiary: Color
    let accentMuted: Color

    static func == (lhs: AppTheme, rhs: AppTheme) -> Bool { lhs.id == rhs.id }

    // MARK: - Built-in themes

    /// Statesman — default presidential blue and gold
    static let auroraCommand = AppTheme(
        id: "aurora_command",
        displayName: "Statesman",
        subtitle: "Presidential blue and gold",
        accentPrimary: Color(red: 0.098, green: 0.412, blue: 0.863),    // #1969DC — deep presidential blue
        accentSecondary: Color(red: 0.831, green: 0.667, blue: 0.173),  // #D4AA2C — gold
        accentTertiary: Color(red: 0.298, green: 0.557, blue: 0.922),   // #4C8EEB — lighter presidential blue
        accentMuted: Color(red: 0.098, green: 0.412, blue: 0.863).opacity(0.15)
    )

    /// Gold & Blue — gold primary with blue secondary
    static let goldStandard = AppTheme(
        id: "gold_standard",
        displayName: "Gold & Blue",
        subtitle: "Executive authority",
        accentPrimary: Color(red: 0.831, green: 0.667, blue: 0.173),    // #D4AA2C — gold
        accentSecondary: Color(red: 0.231, green: 0.510, blue: 0.965),  // #3B82F6 — blue
        accentTertiary: Color(red: 0.941, green: 0.812, blue: 0.376),   // #F0CF60 — pale gold
        accentMuted: Color(red: 0.831, green: 0.667, blue: 0.173).opacity(0.15)
    )

    /// Royal Blue — deep blue with silver-white accents
    static let ceruleanCommand = AppTheme(
        id: "cerulean_command",
        displayName: "Royal Blue",
        subtitle: "Deep navy and white",
        accentPrimary: Color(red: 0.098, green: 0.412, blue: 0.863),    // #1969DC
        accentSecondary: Color(red: 0.831, green: 0.667, blue: 0.173),  // gold
        accentTertiary: Color(red: 0.588, green: 0.733, blue: 0.980),   // pale steel blue
        accentMuted: Color(red: 0.098, green: 0.412, blue: 0.863).opacity(0.15)
    )

    /// Crimson — red primary with gold accent
    static let crimsonAuthority = AppTheme(
        id: "crimson_authority",
        displayName: "Crimson",
        subtitle: "Hard power, decisive action",
        accentPrimary: Color(red: 0.863, green: 0.196, blue: 0.196),    // #DC3232
        accentSecondary: Color(red: 0.831, green: 0.667, blue: 0.173),  // gold
        accentTertiary: Color(red: 0.980, green: 0.502, blue: 0.447),   // pale red
        accentMuted: Color(red: 0.863, green: 0.196, blue: 0.196).opacity(0.15)
    )

    /// Monochrome — white accents on black
    static let operativeGreen = AppTheme(
        id: "operative_green",
        displayName: "Monochrome",
        subtitle: "White on black",
        accentPrimary: Color(white: 0.90),
        accentSecondary: Color(white: 0.60),
        accentTertiary: Color(white: 0.75),
        accentMuted: Color(white: 0.90).opacity(0.15)
    )

    // MARK: - All themes list

    static let all: [AppTheme] = [
        .auroraCommand,
        .goldStandard,
        .ceruleanCommand,
        .crimsonAuthority,
        .operativeGreen
    ]
}
