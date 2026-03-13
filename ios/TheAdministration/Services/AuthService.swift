/// AuthService
/// Manages Firebase Anonymous Authentication for The Administration.
/// Signs in anonymously on first launch to satisfy Firestore security rules
/// and syncs a minimal user profile document to Firestore.
import Foundation
import FirebaseAuth
import FirebaseFirestore

class AuthService: ObservableObject {
    static let shared = AuthService()
    private init() {}

    @Published var isAuthenticated = false
    @Published var userId: String? = nil

    /// Signs in anonymously; no-op if already authenticated.
    func ensureAuthenticated() async {
        if let current = Auth.auth().currentUser {
            await MainActor.run {
                userId = current.uid
                isAuthenticated = true
            }
            return
        }
        do {
            let result = try await Auth.auth().signInAnonymously()
            let uid = result.user.uid
            await MainActor.run {
                userId = uid
                isAuthenticated = true
            }
            await syncUserProfile(uid: uid)
        } catch {
            AppLogger.error("[AuthService] Anonymous sign-in failed: \(error.localizedDescription)", category: .firebase)
        }
    }

    private func syncUserProfile(uid: String) async {
        let db = Firestore.firestore()
        let ref = db.collection("users").document(uid)
        do {
            let snap = try await ref.getDocument()
            if snap.exists {
                try await ref.setData(["lastActive": FieldValue.serverTimestamp()], merge: true)
            } else {
                try await ref.setData([
                    "uid": uid,
                    "createdAt": FieldValue.serverTimestamp(),
                    "lastActive": FieldValue.serverTimestamp(),
                    "platform": "ios",
                    "isAnonymous": true
                ])
            }
            AppLogger.info("[AuthService] User profile synced (uid: \(uid))", category: .firebase)
        } catch {
            AppLogger.warning("[AuthService] Profile sync failed: \(error.localizedDescription)", category: .firebase)
        }
    }
}
