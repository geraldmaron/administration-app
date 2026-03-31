import SwiftUI

struct AppSpacing {
    // MARK: - Responsive Base scale (4pt grid)
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40

    // MARK: - Layout constants - Enhanced for heavier weight
    /// Standard card inner padding - increased for heavier feel
    static let cardPadding: CGFloat = 20
    /// Standard section horizontal padding - increased for better spacing
    static let sectionPadding: CGFloat = 28
    /// Bottom padding to clear the custom tab bar - reduced for better mobile fit
    static let tabBarClearance: CGFloat = 80
    
    // MARK: - Responsive modifiers
    /// Responsive padding for horizontal layouts
    static func horizontalPadding(_ multiplier: CGFloat = 1.0) -> CGFloat {
        return sectionPadding * multiplier
    }
    
    /// Responsive padding for vertical layouts
    static func verticalPadding(_ multiplier: CGFloat = 1.0) -> CGFloat {
        return cardPadding * multiplier
    }
}
