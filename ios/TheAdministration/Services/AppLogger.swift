/// AppLogger
/// Centralised logging using os_log (unified system logging).
/// In DEBUG builds, messages are visible in Xcode console and Console.app.
/// In RELEASE builds, os_log persists to the system log at the appropriate
/// level; debug/info messages are compiled out entirely.
///
/// Usage:
///   AppLogger.info("Loaded 42 scenarios")
///   AppLogger.warning("Bundle manifest missing")
///   AppLogger.error("Firebase auth failed: \(error)")
import Foundation
import os.log

enum AppLogger {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.theadministration"

    private static let general   = Logger(subsystem: subsystem, category: "General")
    private static let firebase  = Logger(subsystem: subsystem, category: "Firebase")
    private static let scenarios = Logger(subsystem: subsystem, category: "Scenarios")
    private static let game      = Logger(subsystem: subsystem, category: "Game")
    private static let ui        = Logger(subsystem: subsystem, category: "UI")

    // MARK: - Public API

    static func debug(_ message: String, category: Category = .general) {
#if DEBUG
        logger(for: category).debug("\(message, privacy: .public)")
#endif
    }

    static func info(_ message: String, category: Category = .general) {
        logger(for: category).info("\(message, privacy: .public)")
    }

    static func warning(_ message: String, category: Category = .general) {
        logger(for: category).warning("\(message, privacy: .public)")
    }

    static func error(_ message: String, category: Category = .general) {
        logger(for: category).error("\(message, privacy: .public)")
    }

    // MARK: - Categories

    enum Category {
        case general, firebase, scenarios, game, ui
    }

    private static func logger(for category: Category) -> Logger {
        switch category {
        case .general:   return general
        case .firebase:  return firebase
        case .scenarios: return scenarios
        case .game:      return game
        case .ui:        return ui
        }
    }
}
