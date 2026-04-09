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

    static let monochrome = AppTheme(
        id: "monochrome",
        displayName: "Executive",
        subtitle: "Presidential gold",
        accentPrimary: Color(red: 0.77, green: 0.58, blue: 0.16),
        accentSecondary: Color(red: 0.50, green: 0.44, blue: 0.35),
        accentTertiary: Color(red: 0.83, green: 0.69, blue: 0.42),
        accentMuted: Color(red: 0.77, green: 0.58, blue: 0.16).opacity(0.12)
    )

    static let all: [AppTheme] = [.monochrome]
}
