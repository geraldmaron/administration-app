/// TheAdministrationApp
/// Entry point for The Administration iOS app.
/// Configures Firebase on launch and ensures anonymous auth is established
/// before the game UI loads.
import SwiftUI
import FirebaseCore

@main
struct TheAdministrationApp: App {
    init() {
        FirebaseApp.configure()
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
