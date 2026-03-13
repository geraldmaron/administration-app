/// ThemeManager
/// Singleton that persists the active theme to UserDefaults and publishes
/// theme changes so the app reactively updates accent colors.
import SwiftUI
import Combine

class ThemeManager: ObservableObject {

    static let shared = ThemeManager()

    private static let userDefaultsKey = "app_theme_id"

    @Published private(set) var current: AppTheme {
        didSet {
            UserDefaults.standard.set(current.id, forKey: Self.userDefaultsKey)
        }
    }

    private init() {
        let savedId = UserDefaults.standard.string(forKey: Self.userDefaultsKey) ?? "aurora_command"
        self.current = AppTheme.all.first(where: { $0.id == savedId }) ?? .auroraCommand
    }

    func setTheme(_ theme: AppTheme) {
        current = theme
    }
}
