/// ScenarioBundleManager
/// Downloads versioned JSON chunk files from Firebase Storage.
/// Each bundle is split into 250-scenario chunks stored at:
///   scenario-bundles/{bundleId}/chunk-{0000}.json
///
/// Flow per app launch:
///   1. Fetch world_state/scenario_manifest  (1 Firestore read)
///   2. For each chunk where manifest chunk version > local cache version:
///        download chunk file via Storage REST API
///   3. Write each chunk to Application Support/scenario-bundles/{bundleId}/
///   4. Decode all local chunk files in parallel → return merged [Scenario] array
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
    private let versionsKey = "scenario_bundle_versions_v3"

    private var pool: [Scenario] = []
    private var loaded = false

    // MARK: - Public API

    func scenarios(forceRefresh: Bool = false) async throws -> [Scenario] {
        if loaded && !forceRefresh { return pool }

        let manifest = try await fetchManifest()
        let updatedChunks = await syncChangedChunks(manifest: manifest, force: forceRefresh)
        let all = try await decodeFromDisk()
        pool = all
        loaded = true

        AppLogger.info("[ScenarioBundleManager] \(all.count) scenarios ready (\(updatedChunks) chunk(s) refreshed)")
        return all
    }

    func invalidate() {
        loaded = false
        pool = []
        try? FileManager.default.removeItem(at: cacheDir)
        UserDefaults.standard.removeObject(forKey: versionsKey)
    }

    // MARK: - Manifest

    private struct Manifest {
        let manifestVersion: Int
        let bundles: [String: BundleEntry]

        struct ChunkEntry {
            let idx: Int
            let version: Int
        }

        struct BundleEntry {
            let version: Int
            let chunks: [ChunkEntry]
        }

        init(data: [String: Any]) {
            self.manifestVersion = data["manifestVersion"] as? Int ?? 0
            var b: [String: BundleEntry] = [:]
            if let raw = data["bundles"] as? [String: [String: Any]] {
                for (id, entry) in raw {
                    let rawChunks = entry["chunks"] as? [[String: Any]] ?? []
                    let chunks = rawChunks.compactMap { c -> ChunkEntry? in
                        guard let idx = c["idx"] as? Int else { return nil }
                        return ChunkEntry(
                            idx: idx,
                            version: c["version"] as? Int ?? 0
                        )
                    }
                    b[id] = BundleEntry(
                        version: entry["version"] as? Int ?? 0,
                        chunks: chunks
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
    private func syncChangedChunks(manifest: Manifest, force: Bool) async -> Int {
        let localVersions = loadLocalVersions()
        var updatedCount = 0

        struct StaleChunk {
            let bundleId: String
            let chunkIdx: Int
            let versionKey: String
        }

        var stale: [StaleChunk] = []
        for (bundleId, entry) in manifest.bundles {
            for chunk in entry.chunks {
                let key = versionKey(bundleId: bundleId, chunkIdx: chunk.idx)
                if force || (localVersions[key] ?? -1) < chunk.version {
                    stale.append(StaleChunk(
                        bundleId: bundleId,
                        chunkIdx: chunk.idx,
                        versionKey: key
                    ))
                }
            }
        }

        guard !stale.isEmpty else { return 0 }

        var succeededKeys: Set<String> = []

        await withTaskGroup(of: (String, Int?, Bool).self) { group in
            for item in stale {
                group.addTask {
                    do {
                        try await self.downloadChunk(
                            bundleId: item.bundleId,
                            chunkIdx: item.chunkIdx
                        )
                        return (item.versionKey, nil, true)
                    } catch {
                        AppLogger.warning("[ScenarioBundleManager] Failed to download \(item.bundleId)/chunk-\(item.chunkIdx): \(error.localizedDescription)")
                        return (item.versionKey, nil, false)
                    }
                }
            }
            for await (key, _, success) in group {
                if success {
                    updatedCount += 1
                    succeededKeys.insert(key)
                }
            }
        }

        var updated = localVersions
        for (bundleId, entry) in manifest.bundles {
            for chunk in entry.chunks {
                let key = versionKey(bundleId: bundleId, chunkIdx: chunk.idx)
                if succeededKeys.contains(key) {
                    updated[key] = chunk.version
                }
            }
        }
        saveLocalVersions(updated)

        return updatedCount
    }

    // MARK: - Download

    private func downloadChunk(bundleId: String, chunkIdx: Int) async throws {
        guard let token = try await authToken() else {
            throw BundleError.authRequired
        }

        let filename = String(format: "chunk-%04d.json", chunkIdx)
        let encodedPath = "\(bundlePrefix)%2F\(bundleId)%2F\(filename)"
        let urlStr = "https://firebasestorage.googleapis.com/v0/b/\(bucket)/o/\(encodedPath)?alt=media"
        guard let url = URL(string: urlStr) else { throw BundleError.badURL(urlStr) }

        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard status == 200 else { throw BundleError.httpError(bundleId: bundleId, chunkIdx: chunkIdx, code: status) }

        try writeChunkToDisk(bundleId: bundleId, chunkIdx: chunkIdx, data: data)
        AppLogger.info("[ScenarioBundleManager] Downloaded '\(bundleId)/\(filename)': \(data.count / 1024) KB")
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

    private func bundleCacheDir(for bundleId: String) -> URL {
        cacheDir.appendingPathComponent(bundleId, isDirectory: true)
    }

    private func writeChunkToDisk(bundleId: String, chunkIdx: Int, data: Data) throws {
        let dir = bundleCacheDir(for: bundleId)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let filename = String(format: "chunk-%04d.json", chunkIdx)
        try data.write(to: dir.appendingPathComponent(filename), options: .atomic)
    }

    private func decodeFromDisk() async throws -> [Scenario] {
        guard FileManager.default.fileExists(atPath: cacheDir.path) else { return [] }

        let bundleDirs = try FileManager.default.contentsOfDirectory(
            at: cacheDir,
            includingPropertiesForKeys: [.isDirectoryKey]
        ).filter { url in
            (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true
        }

        guard !bundleDirs.isEmpty else { return [] }

        let decoder = JSONDecoder()
        var allScenarios: [Scenario] = []

        await withTaskGroup(of: [Scenario].self) { group in
            for bundleDir in bundleDirs {
                group.addTask {
                    guard let chunkFiles = try? FileManager.default.contentsOfDirectory(
                        at: bundleDir,
                        includingPropertiesForKeys: nil
                    ).filter({ $0.pathExtension == "json" }).sorted(by: { $0.lastPathComponent < $1.lastPathComponent })
                    else { return [] }

                    var bundleScenarios: [Scenario] = []
                    for file in chunkFiles {
                        guard let data = try? Data(contentsOf: file) else { continue }
                        if let decoded = try? decoder.decode([Scenario].self, from: data) {
                            bundleScenarios.append(contentsOf: decoded)
                        } else {
                            bundleScenarios.append(contentsOf: self.decodeScenariosFallback(from: data, file: file, decoder: decoder))
                        }
                    }
                    return bundleScenarios
                }
            }
            for await scenarios in group {
                allScenarios.append(contentsOf: scenarios)
            }
        }

        return allScenarios
    }

    nonisolated private func decodeScenariosFallback(from data: Data, file: URL, decoder: JSONDecoder) -> [Scenario] {
        guard let rawArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            AppLogger.warning("[ScenarioBundleManager] Failed to decode \(file.lastPathComponent) — skipping")
            return []
        }
        var decoded: [Scenario] = []
        var failCount = 0
        for element in rawArray {
            guard let elementData = try? JSONSerialization.data(withJSONObject: element),
                  let scenario = try? decoder.decode(Scenario.self, from: elementData) else {
                failCount += 1
                continue
            }
            decoded.append(scenario)
        }
        if failCount > 0 {
            AppLogger.warning("[ScenarioBundleManager] \(file.lastPathComponent): decoded \(decoded.count)/\(rawArray.count), skipped \(failCount)")
        }
        return decoded
    }

    // MARK: - Version Persistence

    private func versionKey(bundleId: String, chunkIdx: Int) -> String {
        "\(bundleId):\(chunkIdx)"
    }

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
    case httpError(bundleId: String, chunkIdx: Int, code: Int)

    var errorDescription: String? {
        switch self {
        case .badConfig:       return "Bad manifest path configuration"
        case .manifestMissing: return "world_state/scenario_manifest not found in Firestore"
        case .authRequired:    return "Firebase Auth token required to download scenario bundles"
        case .badURL(let u):   return "Invalid Storage URL: \(u)"
        case .httpError(let id, let idx, let code):
            return "Bundle '\(id)' chunk \(idx) HTTP \(code)"
        }
    }
}
