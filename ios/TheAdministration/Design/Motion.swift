/// AppMotion
/// Defines consistent animation timing constants for The Administration.
/// Standard iOS easing — no dramatic or staggered animations.
import SwiftUI

enum AppMotion {
    /// Quick response — button presses, toggles
    static let quickSnap = Animation.easeOut(duration: 0.15)

    /// Standard transition — content reveals, tab switches
    static let standard = Animation.easeOut(duration: 0.2)

    /// Sheet presentation spring
    static let dramatic = Animation.spring(duration: 0.4, bounce: 0.1)

    /// Fade crossfade duration
    static let fadeDuration: Double = 0.2

    /// Stagger delay — returns 0; stagger animations removed per design direction.
    static func staggerDelay(for index: Int, base: Double = 0.05) -> Double {
        0
    }
}
