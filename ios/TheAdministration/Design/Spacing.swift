/// AppSpacing
/// Provides a 4pt-based spacing scale and common layout constants
/// for The Administration design system.
import SwiftUI

struct AppSpacing {
    // MARK: - Base scale (4pt grid)
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40

    // MARK: - Layout constants
    /// Standard card inner padding
    static let cardPadding: CGFloat = 16
    /// Standard section horizontal padding
    static let sectionPadding: CGFloat = 24
    /// Bottom padding to clear the custom tab bar
    static let tabBarClearance: CGFloat = 100
}
