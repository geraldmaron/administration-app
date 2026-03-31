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
        displayName: "Monochrome",
        subtitle: "White on black",
        accentPrimary: Color(white: 0.90),
        accentSecondary: Color(white: 0.60),
        accentTertiary: Color(white: 0.75),
        accentMuted: Color(white: 0.90).opacity(0.15)
    )

    static let all: [AppTheme] = [.monochrome]
}
