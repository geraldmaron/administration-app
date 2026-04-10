/// TheAdministrationApp
/// Entry point for The Administration iOS app.
/// Configures Firebase on launch and ensures anonymous auth is established
/// before the game UI loads.
import SwiftUI
import FirebaseCore
import FirebaseFirestore
import FirebaseCrashlytics

@main
struct TheAdministrationApp: App {
    init() {
        FirebaseApp.configure()
        Crashlytics.crashlytics().checkForUnsentReports { hasReports in
            if hasReports { Crashlytics.crashlytics().sendUnsentReports() }
        }
        #if DEBUG
        let settings = FirestoreSettings()
        settings.cacheSettings = MemoryCacheSettings()
        Firestore.firestore().settings = settings
        #endif
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    await AuthService.shared.ensureAuthenticated()
                }
        }
    }
}
