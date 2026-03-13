/// AppMotion
/// Defines consistent animation timing constants for The Administration.
/// All motion in the app references these tokens for visual coherence.
import SwiftUI

enum AppMotion {
    /// Quick snappy response — button presses, toggles (0.2s spring)
    static let quickSnap = Animation.spring(response: 0.2, dampingFraction: 0.8)

    /// Standard reveal — card reveals, sheet presentations (0.35s spring)
    static let standard = Animation.spring(response: 0.35, dampingFraction: 0.75)

    /// Dramatic entrance — scenario reveals, outcome presentations (0.6s spring)
    static let dramatic = Animation.spring(response: 0.6, dampingFraction: 0.7)

    /// Fade crossfade duration
    static let fadeDuration: Double = 0.25

    /// Returns the stagger delay for list/grid item at given index.
    static func staggerDelay(for index: Int, base: Double = 0.05) -> Double {
        Double(index) * base
    }
}
