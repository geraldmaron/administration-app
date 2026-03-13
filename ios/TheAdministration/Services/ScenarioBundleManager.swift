/// ScenarioBundleManager
/// Replaces full Firestore collection scans with versioned JSON bundles served
/// from Firebase Storage. Reduces scenario loading from 20k reads + 67 round
/// trips + ~60 MB to: 1 Firestore read (manifest) + at most 14 Storage GETs
/// (~2–4 MB each, cached on disk after first download).
///
/// Flow per app launch:
///   1. Fetch world_state/scenario_manifest  (1 Firestore read, ~1 KB)
///   2. For each bundle where manifest.version > local cache version:
///        download scenario-bundles/{bundleId}.json via Storage REST API
///   3. Write each bundle JSON to Application Support/scenario-bundles/
///   4. Decode all local bundle files → return merged [Scenario] array
///   5. On subsequent launches: steps 1 + 2 are skipped if nothing changed
import Foundation
import FirebaseAuth
import FirebaseFirestore

actor ScenarioBundleManager {
    static let shared = ScenarioBundleManager()
    private init() {}

    // MARK: - Constants

    private let bucket = "the-administration-3a072.firebasestorage.app"
    private let bundlePrefix = "scenario-bundles"
    private let manifestPath = "world_state/scenario_manifest"
    private let versionsKey = "scenario_bundle_versions_v2"

    // In-memory pool — populated once and reused within a session.
    private var pool: [Scenario] = []
    private var loaded = false

    // MARK: - Public API

    /// Returns all scenarios. Downloads only changed bundles; serves from disk
    /// otherwise. Call once at app launch then re-use the result.
    func scenarios(forceRefresh: Bool = false) async throws -> [Scenario] {
        if loaded && !forceRefresh { return pool }

        let manifest = try await fetchManifest()
        let updatedBundles = try await syncChangedBundles(manifest: manifest, force: forceRefresh)
        let all = try decodeFromDisk()
        pool = all
        loaded = true

        let total = all.count
        AppLogger.info("[ScenarioBundleManager] \(total) scenarios ready (\(updatedBundles) bundle(s) refreshed)")
        return all
    }

    /// Force a full re-download on the next call to `scenarios()`.
    func invalidate() {
        loaded = false
        pool = []
    }

    // MARK: - Manifest

    private struct Manifest {
        let manifestVersion: Int
        let bundles: [String: BundleEntry]

        struct BundleEntry {
            let version: Int
            let count: Int
        }

        init(data: [String: Any]) {
            self.manifestVersion = data["manifestVersion"] as? Int ?? 0
            var b: [String: BundleEntry] = [:]
            if let raw = data["bundles"] as? [String: [String: Any]] {
                for (id, entry) in raw {
                    b[id] = BundleEntry(
                        version: entry["version"] as? Int ?? 0,
                        count: entry["count"] as? Int ?? 0
                    )
                }
            }
            self.bundles = b
        }
    }

    private func fetchManifest() async throws -> Manifest {
        let parts = manifestPath.split(separator: "/")
        guard parts.count == 2 else { throw BundleError.badConfig }
        let db = Firestore.firestore()
        let snap = try await db.collection(String(parts[0])).document(String(parts[1])).getDocument()
        guard snap.exists, let data = snap.data() else {
            throw BundleError.manifestMissing
        }
        return Manifest(data: data)
    }

    // MARK: - Sync

    @discardableResult
    private func syncChangedBundles(manifest: Manifest, force: Bool) async throws -> Int {
        let localVersions = loadLocalVersions()
        var updatedCount = 0

        // Collect bundles that need downloading.
        let stale = manifest.bundles.filter { id, entry in
            force || (localVersions[id] ?? -1) < entry.version
        }

        guard !stale.isEmpty else { return 0 }

        // Download in parallel (up to all 14 bundles).
        try await withThrowingTaskGroup(of: String.self) { group in
            for (bundleId, entry) in stale {
                group.addTask {
                    try await self.downloadBundle(id: bundleId, expectedCount: entry.count)
                    return bundleId
                }
            }
            for try await _ in group { updatedCount += 1 }
        }

        // Persist the new versions for all bundles in the manifest.
        var updated = localVersions
        for (id, entry) in manifest.bundles { updated[id] = entry.version }
        saveLocalVersions(updated)

        return updatedCount
    }

    // MARK: - Download

    private func downloadBundle(id: String, expectedCount: Int) async throws {
        guard let token = try await authToken() else {
            throw BundleError.authRequired
        }

        let encodedPath = "\(bundlePrefix)%2F\(id).json"
        let urlStr = "https://firebasestorage.googleapis.com/v0/b/\(bucket)/o/\(encodedPath)?alt=media"
        guard let url = URL(string: urlStr) else { throw BundleError.badURL(urlStr) }

        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard status == 200 else { throw BundleError.httpError(bundleId: id, code: status) }

        try writeToDisk(bundleId: id, data: data)
        AppLogger.info("[ScenarioBundleManager] Downloaded '\(id)': \(data.count / 1024) KB, ~\(expectedCount) scenarios")
    }

    private func authToken() async throws -> String? {
        guard let user = Auth.auth().currentUser else { return nil }
        return try await user.getIDToken()
    }

    // MARK: - Disk Cache

    private var cacheDir: URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return appSupport.appendingPathComponent("scenario-bundles", isDirectory: true)
    }

    private func writeToDisk(bundleId: String, data: Data) throws {
        try FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
        try data.write(to: cacheDir.appendingPathComponent("\(bundleId).json"), options: .atomic)
    }

    private func decodeFromDisk() throws -> [Scenario] {
        guard FileManager.default.fileExists(atPath: cacheDir.path) else { return [] }
        let files = try FileManager.default.contentsOfDirectory(
            at: cacheDir,
            includingPropertiesForKeys: nil
        ).filter { $0.pathExtension == "json" }

        let decoder = JSONDecoder()
        var all: [Scenario] = []
        for file in files {
            let data = try Data(contentsOf: file)
            if let scenarios = try? decoder.decode([Scenario].self, from: data) {
                all.append(contentsOf: scenarios)
            } else {
                AppLogger.warning("[ScenarioBundleManager] Failed to decode \(file.lastPathComponent) — skipping")
            }
        }
        return all
    }

    // MARK: - Version Persistence (UserDefaults)

    private func loadLocalVersions() -> [String: Int] {
        UserDefaults.standard.dictionary(forKey: versionsKey) as? [String: Int] ?? [:]
    }

    private func saveLocalVersions(_ v: [String: Int]) {
        UserDefaults.standard.set(v, forKey: versionsKey)
    }
}

// MARK: - Errors

private enum BundleError: LocalizedError {
    case badConfig
    case manifestMissing
    case authRequired
    case badURL(String)
    case httpError(bundleId: String, code: Int)

    var errorDescription: String? {
        switch self {
        case .badConfig:       return "Bad manifest path configuration"
        case .manifestMissing: return "world_state/scenario_manifest not found in Firestore"
        case .authRequired:    return "Firebase Auth token required to download scenario bundles"
        case .badURL(let u):   return "Invalid Storage URL: \(u)"
        case .httpError(let id, let code):
            return "Bundle '\(id)' HTTP \(code) — bundle may not be exported yet"
        }
    }
}
