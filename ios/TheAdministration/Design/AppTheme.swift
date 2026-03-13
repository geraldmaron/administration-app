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

    /// Aurora Command — default aurora borealis aesthetic
    static let auroraCommand = AppTheme(
        id: "aurora_command",
        displayName: "Aurora Command",
        subtitle: "Strategic aurora aesthetic",
        accentPrimary: Color(red: 0.0, green: 0.768, blue: 0.655),      // #00C4A7
        accentSecondary: Color(red: 0.486, green: 0.227, blue: 0.929),  // #7C3AED
        accentTertiary: Color(red: 0.231, green: 0.513, blue: 0.956),   // #3B82F6
        accentMuted: Color(red: 0.0, green: 0.768, blue: 0.655).opacity(0.15)
    )

    /// Gold Standard — executive authority, deliberate power
    static let goldStandard = AppTheme(
        id: "gold_standard",
        displayName: "Gold Standard",
        subtitle: "Executive authority",
        accentPrimary: Color(red: 0.961, green: 0.651, blue: 0.137),    // #F5A623
        accentSecondary: Color(red: 0.937, green: 0.267, blue: 0.141),
        accentTertiary: Color(red: 0.024, green: 0.714, blue: 0.839),
        accentMuted: Color(red: 0.961, green: 0.651, blue: 0.137).opacity(0.15)
    )

    /// Cerulean Command — diplomatic clarity, tactical precision
    static let ceruleanCommand = AppTheme(
        id: "cerulean_command",
        displayName: "Cerulean Command",
        subtitle: "Tactical precision",
        accentPrimary: Color(red: 0.098, green: 0.612, blue: 1.000),    // #199CFF
        accentSecondary: Color(red: 0.937, green: 0.267, blue: 0.141),
        accentTertiary: Color(red: 0.961, green: 0.651, blue: 0.137),
        accentMuted: Color(red: 0.098, green: 0.612, blue: 1.000).opacity(0.15)
    )

    /// Crimson Authority — hard power, decisive action
    static let crimsonAuthority = AppTheme(
        id: "crimson_authority",
        displayName: "Crimson Authority",
        subtitle: "Hard power, decisive action",
        accentPrimary: Color(red: 0.937, green: 0.267, blue: 0.141),    // #EF4444
        accentSecondary: Color(.displayP3, red: 0.402, green: 0.438, blue: 0.995),
        accentTertiary: Color(red: 0.961, green: 0.651, blue: 0.137),
        accentMuted: Color(red: 0.937, green: 0.267, blue: 0.141).opacity(0.15)
    )

    /// Operative Green — field operations, ground-level governance
    static let operativeGreen = AppTheme(
        id: "operative_green",
        displayName: "Operative Green",
        subtitle: "Ground-level governance",
        accentPrimary: Color(red: 0.063, green: 0.725, blue: 0.506),    // #10B981
        accentSecondary: Color(red: 0.937, green: 0.267, blue: 0.141),
        accentTertiary: Color(red: 0.024, green: 0.714, blue: 0.839),
        accentMuted: Color(red: 0.063, green: 0.725, blue: 0.506).opacity(0.15)
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
