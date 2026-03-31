import UIKit

final class HapticEngine {
    static let shared = HapticEngine()
    private init() {}

    // MARK: - Impact Feedback

    /// Light impact — tab switches, toggles, selector taps
    func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// Medium impact — option selection, card interactions
    func medium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Heavy impact — decision confirmation, fire cabinet member
    func heavy() {
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }

    // MARK: - Notification Feedback

    /// Success notification — positive outcomes, achievements
    func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    /// Warning notification — negative outcomes, metric critical thresholds
    func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    /// Error notification — failures, game over
    func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }

    /// Selection changed — sliders, pickers
    func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
}
