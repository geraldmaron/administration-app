import Foundation
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

// MARK: - AppConfig

/// AppConfig
/// All dynamic application configuration data fetched from Firebase.
/// Swift equivalent of the web app's per-document Firebase pools
/// (world_state/names, parties_pool, traits_pool, university_pool, etc.).
struct AppConfig {
    // Names by region: region → { "first": [...], "last": [...] }
    var namesByRegion: [String: [String: [String]]] = [:]
    // Parties
    var genericParties: [String] = []
    var countryParties: [String: [String]] = [:]
    // Traits
    var traitPool: [PlayerTrait] = []
    // Universities
    var universitiesByRegion: [String: [String]] = [:]
    var allUniversities: [String] = []
    // Backgrounds
    var genericBackgrounds: [String] = []
    var countryBackgrounds: [String: [String]] = [:]
    // Backstory / Approaches
    var governmentalApproaches: [String] = []
    // Degree education templates: [{degree, fields}]
    var degreeTemplates: [[String: Any]] = []
    // Category-level education mappings: category → [{type, field}]
    var categoryMappings: [String: [[String: String]]] = [:]

    /// Resolve names for a given region, falling back to North America
    func names(for region: String) -> (first: [String], last: [String]) {
        let key = namesByRegion[region] ?? namesByRegion["North America"] ?? [:]
        return (first: key["first"] ?? [], last: key["last"] ?? [])
    }

    /// Resolve parties for a given countryId, falling back to generic list
    func parties(for countryId: String?) -> [String] {
        if let cid = countryId, let specific = countryParties[cid], !specific.isEmpty {
            return specific
        }
        return genericParties
    }

    /// Resolve institution list for a given region
    func institutions(for region: String) -> [String] {
        return universitiesByRegion[region] ?? universitiesByRegion["North America"] ?? []
    }

    /// Resolve backgrounds for a given countryId
    func backgrounds(for countryId: String?) -> [String] {
        if let cid = countryId, let specific = countryBackgrounds[cid], !specific.isEmpty {
            return specific
        }
        return genericBackgrounds
    }
}

// MARK: - Firebase Data Service

/// Firebase Data Service for iOS
/// Swift port of web/src/lib/services/FirebaseDataService.ts
/// Provides async access to Firestore data for scenarios, countries, and templates.
class FirebaseDataService {
    static let shared = FirebaseDataService()

    private var cache: [String: Any] = [:]

    #if canImport(FirebaseFirestore)
    private var db: Firestore?
    #endif

    private init() {
        #if canImport(FirebaseFirestore)
        db = Firestore.firestore()
        #endif
    }

    // MARK: - Public API

    /// Load countries from Firebase
    /// Matches web WorldDataManager: fetches world_state/countries document
    /// where each top-level key is a country ID mapping to country data
    func getCountries() async -> [Country] {
        if let cached = cache["countries"] as? [Country] {
            AppLogger.info("[FirebaseDataService] Returning cached countries")
            return cached
        }

        #if canImport(FirebaseFirestore)
        guard let db = db else {
            AppLogger.warning("[FirebaseDataService] Firebase not available - returning empty countries")
            return []
        }

        do {
            let docRef = db.collection("world_state").document("countries")
            let snapshot = try await docRef.getDocument()

            if snapshot.exists, let data = snapshot.data() {
                var countries: [Country] = []

                for (countryId, value) in data {
                    if let countryData = value as? [String: Any] {
                        if let country = mapCountry(from: countryData, id: countryId) {
                            countries.append(country)
                        }
                    }
                }

                cache["countries"] = countries
                AppLogger.info("[FirebaseDataService] Loaded \(countries.count) countries from Firebase")
                return countries
            }
        } catch {
            AppLogger.warning("[FirebaseDataService] Error fetching countries: \(error)")
        }
        #else
        AppLogger.warning("[FirebaseDataService] Firebase SDK not available")
        #endif

        return []
    }

    /// Synchronous accessor for countries already in cache
    var cachedCountries: [Country] {
        return cache["countries"] as? [Country] ?? []
    }

    /// Load all scenarios via the bundle manager.
    ///
    /// At 20k+ scenarios the old approach (full Firestore collection scan) cost
    /// 20,000 reads + ~60 MB bandwidth per user load.  The bundle manager reduces
    /// that to 1 Firestore read (manifest) + Storage GETs only for changed bundles
    /// (~2–4 MB each), with the payload cached to disk across sessions.
    func getAllScenarios() async -> [Scenario] {
        if let cached = cache["all_scenarios"] as? [Scenario], !cached.isEmpty {
            AppLogger.info("[FirebaseDataService] Returning \(cached.count) in-session cached scenarios")
            return cached
        }

        do {
            let scenarios = try await ScenarioBundleManager.shared.scenarios()
            if !scenarios.isEmpty {
                cache["all_scenarios"] = scenarios
                return scenarios
            }
        } catch {
            AppLogger.warning("[FirebaseDataService] Bundle manager failed (\(error.localizedDescription)) — falling back to direct Firestore query")
        }

        // Fallback: direct Firestore query (used during initial setup before first bundle export,
        // or when the Storage manifest doesn't exist yet). Limited to 500 docs to avoid
        // loading the full collection before bundles have been built.
        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }
        do {
            let snapshot = try await db.collection("scenarios")
                .whereField("is_active", isEqualTo: true)
                .limit(to: 500)
                .getDocuments()
            let scenarios = snapshot.documents.compactMap { mapScenario(from: $0.data()) }
            AppLogger.info("[FirebaseDataService] Fallback: loaded \(scenarios.count) scenarios from Firestore")
            cache["all_scenarios"] = scenarios
            return scenarios
        } catch {
            AppLogger.warning("[FirebaseDataService] Fallback Firestore query failed: \(error)")
        }
        #endif

        return []
    }

    /// Clears the in-memory scenario cache and forces the bundle manager to
    /// re-check the manifest on the next call. Does NOT delete disk cache.
    func invalidateScenarioCache() {
        cache.removeValue(forKey: "all_scenarios")
        Task { await ScenarioBundleManager.shared.invalidate() }
    }

    /// Load scenarios filtered by bundle name
    func getScenariosByBundle(_ bundleName: String) async -> [Scenario] {
        let cacheKey = "bundle_\(bundleName)"
        if let cached = cache[cacheKey] as? [Scenario] {
            return cached
        }

        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }

        do {
            let snapshot = try await db.collection("scenarios")
                .whereField("metadata.bundle", isEqualTo: bundleName)
                .getDocuments()
            let scenarios = snapshot.documents.compactMap { mapScenario(from: $0.data()) }
            cache[cacheKey] = scenarios
            return scenarios
        } catch {
            AppLogger.warning("[FirebaseDataService] Error fetching bundle \(bundleName): \(error)")
        }
        #endif

        return []
    }

    /// Clear all caches (useful for refreshing data)
    func clearCache() {
        cache.removeAll()
        Task { await ScenarioBundleManager.shared.invalidate() }
        AppLogger.info("[FirebaseDataService] Cache cleared (bundle manager invalidated)")
    }

    // MARK: - Config Pool Fetching

    /// Fetch all application config data from Firebase in parallel, returning an AppConfig.
    /// Matches web FirebaseDataService methods: getNames, getParties, getTraits,
    /// getUniversities, getBackstoryPool, getBackgroundMappings, getEducationData.
    func getAppConfig() async -> AppConfig {
        #if canImport(FirebaseFirestore)
        guard let db = db else {
            AppLogger.warning("[FirebaseDataService] Firebase not available for AppConfig")
            return AppConfig()
        }

        // Fetch all world_state pool documents in parallel
        async let namesSnap = db.collection("world_state").document("names").getDocument()
        async let partiesSnap = db.collection("world_state").document("parties_pool").getDocument()
        async let traitsSnap = db.collection("world_state").document("traits_pool").getDocument()
        async let universitySnap = db.collection("world_state").document("university_pool").getDocument()
        async let backstorySnap = db.collection("world_state").document("backstory_pool").getDocument()
        async let bgSnap = db.collection("world_state").document("background_mappings").getDocument()
        async let educationSnap = db.collection("world_state").document("education_pool").getDocument()

        var namesData: [String: Any]?    = nil
        var partiesData: [String: Any]?  = nil
        var traitsData: [String: Any]?   = nil
        var universityData: [String: Any]? = nil
        var backstoryData: [String: Any]?  = nil
        var bgData: [String: Any]?       = nil
        var educationData: [String: Any]?  = nil

        do { namesData = try await namesSnap.data() } catch { print("⚠️ names fetch failed: \(error)") }
        do { partiesData = try await partiesSnap.data() } catch { print("⚠️ parties fetch failed: \(error)") }
        do { traitsData = try await traitsSnap.data() } catch { print("⚠️ traits fetch failed: \(error)") }
        do { universityData = try await universitySnap.data() } catch { print("⚠️ university fetch failed: \(error)") }
        do { backstoryData = try await backstorySnap.data() } catch { print("⚠️ backstory fetch failed: \(error)") }
        do { bgData = try await bgSnap.data() } catch { print("⚠️ backgrounds fetch failed: \(error)") }
        do { educationData = try await educationSnap.data() } catch { print("⚠️ education fetch failed: \(error)") }

        var config = AppConfig()

        // Names: region → { first: [...], last: [...] }
        if let namesDoc = namesData {
            for (region, value) in namesDoc {
                guard let regionData = value as? [String: Any] else { continue }
                var first: [String] = []
                var last: [String] = []
                if let f = regionData["first"] as? [String] { first = f }
                else if let f = regionData["first"] as? [String: [String]] {
                    first = (f["male"] ?? []) + (f["female"] ?? []) + (f["non_binary"] ?? [])
                }
                if let l = regionData["last"] as? [String] { last = l }
                config.namesByRegion[region] = ["first": first, "last": last]
            }
        }

        // Parties
        if let partiesDoc = partiesData {
            config.genericParties = partiesDoc["generic_parties"] as? [String] ?? []
            config.countryParties = partiesDoc["country_parties"] as? [String: [String]] ?? [:]
        }

        // Traits
        if let traitsDoc = traitsData {
            let rawTraits = traitsDoc["traits"] as? [[String: Any]] ?? []
            config.traitPool = rawTraits.compactMap { t in
                guard let name = t["name"] as? String else { return nil }
                let statBonuses = t["stat_bonuses"] as? [[String: Any]] ?? []
                let bonus: TraitStatBonus
                if let first = statBonuses.first,
                   let stat = first["stat"] as? String,
                   let value = first["value"] as? Double {
                    bonus = TraitStatBonus(stat: stat, value: value)
                } else {
                    bonus = TraitStatBonus(stat: "management", value: 0)
                }
                return PlayerTrait(
                    name: name,
                    description: t["description"] as? String ?? "",
                    statBonus: bonus,
                    iconName: t["icon"] as? String ?? "Star"
                )
            }
        }

        // Universities
        if let uniDoc = universityData,
           let universities = uniDoc["universities"] as? [String: [String]] {
            config.universitiesByRegion = universities
            config.allUniversities = universities.values.flatMap { $0 }.sorted()
        }

        // Backgrounds
        if let bgDoc = bgData {
            config.genericBackgrounds = bgDoc["generic_backgrounds"] as? [String] ?? []
            config.countryBackgrounds = bgDoc["country_backgrounds"] as? [String: [String]] ?? [:]
        }

        // Backstory / Approaches
        if let bsDoc = backstoryData {
            let approaches = bsDoc["governmental_approaches"] as? [String]
                ?? bsDoc["governmentalApproaches"] as? [String]
                ?? []
            config.governmentalApproaches = approaches
        }

        // Education data
        if let eduDoc = educationData {
            config.degreeTemplates = eduDoc["degree_templates"] as? [[String: Any]] ?? []
            config.categoryMappings = eduDoc["category_mappings"] as? [String: [[String: String]]] ?? [:]
        }

        AppLogger.info("[FirebaseDataService] AppConfig loaded: \(config.namesByRegion.count) name regions, \(config.traitPool.count) traits, \(config.allUniversities.count) universities")
        return config
        #else
        return AppConfig()
        #endif
    }

    // MARK: - Data Mapping

    /// Map Firestore country data to Country model
    /// - Parameters:
    ///   - data: The raw Firestore document data for the country
    ///   - id: The country ID from the document key (overrides any id field in data)
    private func mapCountry(from data: [String: Any], id countryId: String) -> Country? {
        guard let name = data["name"] as? String else { return nil }

        // Extract tokens
        var tokens: [String: String]?
        if let tokensData = data["tokens"] as? [String: String] {
            tokens = tokensData
        }

        // Extract attributes
        let attributesData = data["attributes"] as? [String: Any]
        let population = attributesData?["population"] as? Int ?? 0
        let gdp = attributesData?["gdp"] as? Int ?? 0
        let attributes = CountryAttributes(population: population, gdp: gdp)

        // Extract military stats
        let militaryData = data["military"] as? [String: Any]
        let military = MilitaryStats(
            strength: militaryData?["strength"] as? Double ?? 50.0,
            nuclearCapable: militaryData?["nuclearCapable"] as? Bool ?? false,
            posture: militaryData?["posture"] as? String,
            navyPower: militaryData?["navyPower"] as? Double ?? 50.0,
            cyberCapability: militaryData?["cyberCapability"] as? Double ?? 50.0,
            description: militaryData?["description"] as? String
        )

        // Extract diplomacy stats
        let diplomacyData = data["diplomacy"] as? [String: Any]
        let diplomacy = DiplomaticStats(
            relationship: diplomacyData?["relationship"] as? Double ?? 50.0,
            alignment: diplomacyData?["alignment"] as? String ?? "neutral",
            tradeAgreements: diplomacyData?["tradeAgreements"] as? [String] ?? [],
            tradeRelationships: diplomacyData?["tradeRelationships"] as? [String: Double]
        )

        return Country(
            id: countryId,
            name: name,
            governmentProfileId: data["governmentProfileId"] as? String,
            attributes: attributes,
            military: military,
            diplomacy: diplomacy,
            region: data["region"] as? String,
            leaderTitle: data["leaderTitle"] as? String,
            leader: data["leader"] as? String,
            difficulty: data["difficulty"] as? String,
            termLengthYears: data["termLengthYears"] as? Int,
            currentPopulation: data["currentPopulation"] as? Int,
            population: data["population"] as? String,
            gdp: data["gdp"] as? String,
            description: data["description"] as? String,
            subdivisions: nil, // TODO: Map subdivisions if needed
            blocs: data["blocs"] as? [String],
            analysisBullets: data["analysisBullets"] as? [String],
            strengths: data["strengths"] as? [String],
            weaknesses: data["weaknesses"] as? [String],
            vulnerabilities: data["vulnerabilities"] as? [String],
            uniqueCapabilities: data["uniqueCapabilities"] as? [String],
            tokens: tokens,
            code: data["code"] as? String,
            flagUrl: data["flagUrl"] as? String,
            alliances: nil, // TODO: Map alliances if needed
            economy: nil // TODO: Map economy if needed
        )
    }

    /// Map Firestore scenario data to Scenario model
    private func mapScenario(from data: [String: Any]) -> Scenario? {
        guard let id = data["id"] as? String,
              let title = data["title"] as? String,
              let description = data["description"] as? String else {
            return nil
        }

        // Map options
        let optionsData = data["options"] as? [[String: Any]] ?? []
        let options = optionsData.compactMap { mapOption(from: $0) }

        // Extract optional fields
        let tokenMap = data["token_map"] as? [String: String]
        let titleTemplate = data["title_template"] as? String
        let descriptionTemplate = data["description_template"] as? String
        let storagePath = data["storage_path"] as? String

        return Scenario(
            id: id,
            title: title,
            description: description,
            conditions: nil, // TODO: Map conditions if needed
            phase: data["phase"] as? String,
            severity: mapSeverityLevel(from: data["severity"] as? String),
            chainId: data["chain_id"] as? String,
            options: options,
            chainsTo: data["chains_to"] as? [String],
            actor: data["actor"] as? String,
            location: nil, // TODO: Map location if needed
            tags: data["tags"] as? [String],
            cooldown: data["cooldown"] as? Int,
            classification: nil, // TODO: Map classification if needed
            behavior: nil, // TODO: Map behavior if needed
            weight: data["weight"] as? Double,
            tier: data["tier"] as? String,
            category: data["category"] as? String,
            triggerConditions: nil, // TODO: Map trigger conditions if needed
            oncePerGame: data["once_per_game"] as? Bool,
            titleTemplate: titleTemplate,
            descriptionTemplate: descriptionTemplate,
            tokenMap: tokenMap,
            storagePath: storagePath
        )
    }

    /// Map Firestore option data to Option model
    private func mapOption(from data: [String: Any]) -> Option? {
        guard let id = data["id"] as? String,
              let text = data["text"] as? String else {
            return nil
        }

        // Map effects
        var effects: [Effect] = []
        if let effectsData = data["effects"] as? [[String: Any]] {
            effects = effectsData.compactMap { mapEffect(from: $0) }
        }

        return Option(
            id: id,
            text: text,
            label: data["label"] as? String,
            advisorFeedback: nil,
            advisorFeedbackString: data["advisor_feedback"] as? String,
            effects: effects,
            effectsMap: data["effects"] as? [String: Double],
            nextScenarioId: data["next_scenario_id"] as? String,
            impactText: nil,
            impactMap: data["impact"] as? [String: Double],
            relationshipImpact: data["relationship_impact"] as? [String: Double],
            relationshipEffects: data["relationship_effects"] as? [String: Double],
            populationImpact: nil, // TODO: Map if needed
            economicImpact: nil, // TODO: Map if needed
            humanCost: nil, // TODO: Map if needed
            actor: data["actor"] as? String,
            location: nil, // TODO: Map location if needed
            severity: mapSeverityLevel(from: data["severity"] as? String),
            tags: data["tags"] as? [String],
            cooldown: data["cooldown"] as? Int,
            oncePerGame: data["once_per_game"] as? Bool,
            outcome: data["outcome"] as? String,
            outcomeHeadline: data["outcome_headline"] as? String,
            outcomeSummary: data["outcome_summary"] as? String,
            outcomeContext: data["outcome_context"] as? String,
            isAuthoritarian: data["is_authoritarian"] as? Bool,
            moralWeight: data["moral_weight"] as? Double,
            consequenceScenarioIds: data["consequence_scenario_ids"] as? [String],
            consequenceDelay: data["consequence_delay"] as? Int
        )
    }

    /// Map Firestore effect data to Effect model
    private func mapEffect(from data: [String: Any]) -> Effect? {
        guard let targetMetricId = data["target_metric_id"] as? String ?? data["targetMetricId"] as? String,
              let value = data["value"] as? Double else {
            return nil
        }

        return Effect(
            targetMetricId: targetMetricId,
            value: value,
            duration: data["duration"] as? Int ?? 1,
            probability: data["probability"] as? Double ?? 1.0,
            delay: data["delay"] as? Int
        )
    }

    /// Map string to SeverityLevel enum
    private func mapSeverityLevel(from string: String?) -> SeverityLevel? {
        guard let string = string else { return nil }
        return SeverityLevel(rawValue: string)
    }

    // MARK: - Firebase Availability

    /// Check if Firebase is available and initialized
    func isFirebaseAvailable() -> Bool {
        #if canImport(FirebaseFirestore)
        return db != nil
        #else
        return false
        #endif
    }
}
