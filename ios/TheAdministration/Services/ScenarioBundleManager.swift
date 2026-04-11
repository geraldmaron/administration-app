/// ScenarioBundleManager
/// Downloads versioned JSON chunk files from Firebase Storage.
/// Each bundle is split into 250-scenario chunks stored at:
///   scenario-bundles/{bundleId}/chunk-{0000}.json
///
/// Flow per app launch:
///   1. Fetch world_state/scenario_manifest  (1 Firestore read)
///   2. For each bundle, diff remote scenarioHashes against local to find changed scenario IDs.
///      Any chunk whose version has advanced OR whose content hash changed is marked stale.
///   3. Download only stale chunks via Storage REST API.
///   4. After decoding a refreshed chunk, replace only changed scenarios in the local pool
///      by scenarioId rather than replacing all chunks.
///   5. Persist received scenarioHashes per bundle for the next launch diff.
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
    private let scenarioHashesKey = "scenario_bundle_hashes_v1"

    private var pool: [Scenario] = []
    private var loaded = false

    // MARK: - Public API

    func scenarios(forceRefresh: Bool = false) async throws -> [Scenario] {
        if loaded && !forceRefresh { return pool }

        let manifest = try await fetchManifest()
        let (updatedChunks, refreshedScenarios) = try await syncChangedChunks(manifest: manifest, force: forceRefresh)

        if !pool.isEmpty && !refreshedScenarios.isEmpty && !forceRefresh {
            pool = mergeScenarios(base: pool, updated: refreshedScenarios)
        } else {
            pool = try await decodeFromDisk()
        }

        loaded = true
        AppLogger.info("[ScenarioBundleManager] \(pool.count) scenarios ready (\(updatedChunks) chunk(s) refreshed, \(refreshedScenarios.count) scenario(s) updated)")
        return pool
    }

    func invalidate() {
        loaded = false
        pool = []
        try? FileManager.default.removeItem(at: cacheDir)
        UserDefaults.standard.removeObject(forKey: versionsKey)
        UserDefaults.standard.removeObject(forKey: scenarioHashesKey)
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
            let scenarioHashes: [String: String]
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
                    let hashes = entry["scenarioHashes"] as? [String: String] ?? [:]
                    b[id] = BundleEntry(
                        version: entry["version"] as? Int ?? 0,
                        chunks: chunks,
                        scenarioHashes: hashes
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

    private func syncChangedChunks(manifest: Manifest, force: Bool) async throws -> (chunkCount: Int, refreshedScenarios: [Scenario]) {
        let localVersions = loadLocalVersions()
        let localHashes = loadLocalScenarioHashes()

        struct StaleChunk {
            let bundleId: String
            let chunkIdx: Int
            let versionKey: String
        }

        var stale: [StaleChunk] = []
        for (bundleId, entry) in manifest.bundles {
            let changedIds = changedScenarioIds(
                localHashes: localHashes[bundleId] ?? [:],
                remoteHashes: entry.scenarioHashes
            )
            for chunk in entry.chunks {
                let key = versionKey(bundleId: bundleId, chunkIdx: chunk.idx)
                let versionStale = force || (localVersions[key] ?? -1) < chunk.version
                let hashStale = !changedIds.isEmpty && entry.scenarioHashes.isEmpty == false
                if versionStale || hashStale {
                    stale.append(StaleChunk(bundleId: bundleId, chunkIdx: chunk.idx, versionKey: key))
                }
            }
        }

        guard !stale.isEmpty else { return (0, []) }

        struct DownloadResult {
            let versionKey: String
            let bundleId: String
            let chunkIdx: Int
            let success: Bool
        }

        var results: [DownloadResult] = []
        await withTaskGroup(of: DownloadResult.self) { group in
            for item in stale {
                group.addTask {
                    do {
                        try await self.downloadChunk(bundleId: item.bundleId, chunkIdx: item.chunkIdx)
                        return DownloadResult(versionKey: item.versionKey, bundleId: item.bundleId, chunkIdx: item.chunkIdx, success: true)
                    } catch {
                        AppLogger.warning("[ScenarioBundleManager] Failed to download \(item.bundleId)/chunk-\(item.chunkIdx): \(error.localizedDescription)")
                        return DownloadResult(versionKey: item.versionKey, bundleId: item.bundleId, chunkIdx: item.chunkIdx, success: false)
                    }
                }
            }
            for await result in group {
                results.append(result)
            }
        }

        let succeeded = results.filter { $0.success }

        var updatedVersions = localVersions
        for result in succeeded {
            if let entry = manifest.bundles[result.bundleId],
               let chunk = entry.chunks.first(where: { $0.idx == result.chunkIdx }) {
                updatedVersions[result.versionKey] = chunk.version
            }
        }
        saveLocalVersions(updatedVersions)

        var updatedHashes = localHashes
        for (bundleId, entry) in manifest.bundles where !entry.scenarioHashes.isEmpty {
            if succeeded.contains(where: { $0.bundleId == bundleId }) {
                updatedHashes[bundleId] = entry.scenarioHashes
            }
        }
        saveLocalScenarioHashes(updatedHashes)

        let refreshedScenarios = decodeRefreshedScenarios(from: succeeded.map { ($0.bundleId, $0.chunkIdx) })
        return (succeeded.count, refreshedScenarios)
    }

    private func changedScenarioIds(
        localHashes: [String: String],
        remoteHashes: [String: String]
    ) -> Set<String> {
        var changed: Set<String> = []
        for (id, remoteHash) in remoteHashes {
            if localHashes[id] != remoteHash { changed.insert(id) }
        }
        return changed
    }

    private func mergeScenarios(base: [Scenario], updated: [Scenario]) -> [Scenario] {
        let updatedById = Dictionary(uniqueKeysWithValues: updated.map { ($0.id, $0) })
        var merged = base.map { updatedById[$0.id] ?? $0 }
        let existingIds = Set(base.map { $0.id })
        let newScenarios = updated.filter { !existingIds.contains($0.id) }
        merged.append(contentsOf: newScenarios)
        return merged
    }

    private func decodeRefreshedScenarios(from pairs: [(bundleId: String, chunkIdx: Int)]) -> [Scenario] {
        let decoder = JSONDecoder()
        var scenarios: [Scenario] = []
        for (bundleId, chunkIdx) in pairs {
            let filename = String(format: "chunk-%04d.json", chunkIdx)
            let file = bundleCacheDir(for: bundleId).appendingPathComponent(filename)
            guard let data = try? Data(contentsOf: file) else { continue }
            if let decoded = try? decoder.decode([Scenario].self, from: data) {
                scenarios.append(contentsOf: decoded)
            } else {
                scenarios.append(contentsOf: decodeScenariosFallback(from: data, file: file, decoder: decoder))
            }
        }
        return scenarios
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

    private func loadLocalScenarioHashes() -> [String: [String: String]] {
        UserDefaults.standard.dictionary(forKey: scenarioHashesKey) as? [String: [String: String]] ?? [:]
    }

    private func saveLocalScenarioHashes(_ v: [String: [String: String]]) {
        UserDefaults.standard.set(v, forKey: scenarioHashesKey)
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
