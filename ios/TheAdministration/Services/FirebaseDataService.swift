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
    var namePoolsByRegion: [String: RegionNamePool] = [:]
    var fallbackNamePool: RegionNamePool? = nil
    var genericParties: [String] = []
    var countryParties: [String: [String]] = [:]
    var traitPool: [PlayerTrait] = []
    var universitiesByRegion: [String: [String]] = [:]
    var allUniversities: [String] = []
    var genericBackgrounds: [String] = []
    var countryBackgrounds: [String: [String]] = [:]
    var governmentalApproaches: [String] = []
    var degreeTemplates: [[String: Any]] = []
    var categoryMappings: [String: [[String: String]]] = [:]

    func firstName(for region: String, gender: PersonGender) -> String {
        let pool = namePoolsByRegion[region] ?? namePoolsByRegion["north_america"] ?? fallbackNamePool
        let names: [String]
        switch gender {
        case .male:      names = pool?.firstMale    ?? []
        case .female:    names = pool?.firstFemale  ?? []
        case .nonbinary: names = pool?.firstNeutral ?? pool?.firstMale ?? []
        }
        return names.randomElement() ?? "Alex"
    }

    func lastName(for region: String) -> String {
        let pool = namePoolsByRegion[region] ?? namePoolsByRegion["north_america"] ?? fallbackNamePool
        return pool?.last.randomElement() ?? "Smith"
    }

    func fullName(for region: String, gender: PersonGender) -> String {
        "\(firstName(for: region, gender: gender)) \(lastName(for: region))"
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

    var config: AppConfig?

    static func decodeCountryProfiles(from data: [String: Any]) -> (
        geopoliticalProfile: GeopoliticalProfile?,
        gameplayProfile: CountryGameplayProfile?
    ) {
        func decodeProfile<T: Decodable>(_ type: T.Type, from dict: [String: Any]?) -> T? {
            guard let dict,
                  let data = try? JSONSerialization.data(withJSONObject: dict) else { return nil }
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            return try? decoder.decode(type, from: data)
        }

        let geopoliticalProfile = decodeProfile(
            GeopoliticalProfile.self,
            from: data["geopolitical"] as? [String: Any]
        )
        let gameplayProfile = decodeProfile(
            CountryGameplayProfile.self,
            from: data["gameplay"] as? [String: Any]
        )

        return (geopoliticalProfile, gameplayProfile)
    }

    private let cacheQueue = DispatchQueue(label: "FirebaseDataService.cache")
    private var _cache: [String: Any] = [:]

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
    /// Queries the countries/ collection where each document ID is a country ISO code
    func getCountries() async -> [Country] {
        if let cached = cacheQueue.sync(execute: { _cache["countries"] as? [Country] }) {
            AppLogger.info("[FirebaseDataService] Returning cached countries")
            return cached
        }

        #if canImport(FirebaseFirestore)
        guard let db = db else {
            AppLogger.warning("[FirebaseDataService] Firebase not available - returning empty countries")
            return []
        }

        do {
            let snapshot = try await db.collection("countries").getDocuments()
            let countries: [Country] = snapshot.documents.compactMap { doc in
                mapCountry(from: doc.data(), id: doc.documentID)
            }

            cacheQueue.sync { _cache["countries"] = countries }
            AppLogger.info("[FirebaseDataService] countries/ collection returned \(countries.count) countries")
            return countries
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
        return cacheQueue.sync { _cache["countries"] as? [Country] ?? [] }
    }

    /// Load all scenarios via the bundle manager.
    ///
    /// At 20k+ scenarios the old approach (full Firestore collection scan) cost
    /// 20,000 reads + ~60 MB bandwidth per user load.  The bundle manager reduces
    /// that to 1 Firestore read (manifest) + Storage GETs only for changed bundles
    /// (~2–4 MB each), with the payload cached to disk across sessions.
    func getAllScenarios() async -> [Scenario] {
        if let cached = cacheQueue.sync(execute: { _cache["all_scenarios"] as? [Scenario] }), !cached.isEmpty {
            AppLogger.info("[FirebaseDataService] Returning \(cached.count) in-session cached scenarios")
            return cached
        }

        do {
            let scenarios = try await ScenarioBundleManager.shared.scenarios()
            if !scenarios.isEmpty {
                cacheQueue.sync { _cache["all_scenarios"] = scenarios }
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
            let scenarios = snapshot.documents.compactMap { doc -> Scenario? in
                var data = doc.data()
                if data["id"] == nil { data["id"] = doc.documentID }
                return mapScenario(from: data)
            }
            AppLogger.info("[FirebaseDataService] Fallback: loaded \(scenarios.count) scenarios from Firestore")
            cacheQueue.sync { _cache["all_scenarios"] = scenarios }
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
        _ = cacheQueue.sync { _cache.removeValue(forKey: "all_scenarios") }
        Task { await ScenarioBundleManager.shared.invalidate() }
    }

    /// Load scenarios filtered by bundle name
    func getScenariosByBundle(_ bundleName: String) async -> [Scenario] {
        let cacheKey = "bundle_\(bundleName)"
        if let cached = cacheQueue.sync(execute: { _cache[cacheKey] as? [Scenario] }) {
            return cached
        }

        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }

        do {
            let snapshot = try await db.collection("scenarios")
                .whereField("metadata.bundle", isEqualTo: bundleName)
                .whereField("is_active", isEqualTo: true)
                .limit(to: 500)
                .getDocuments()
            let scenarios = snapshot.documents.compactMap { mapScenario(from: $0.data()) }
            cacheQueue.sync { _cache[cacheKey] = scenarios }
            return scenarios
        } catch {
            AppLogger.warning("[FirebaseDataService] Error fetching bundle \(bundleName): \(error)")
        }
        #endif

        return []
    }

    /// Clear all caches (useful for refreshing data)
    func clearCache() {
        cacheQueue.sync { _cache.removeAll() }
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

        // Names: parse new "regions" key or fall back to old flat structure
        if let namesDoc = namesData {
            if let regionsData = namesDoc["regions"] as? [String: [String: Any]] {
                var pools: [String: RegionNamePool] = [:]
                for (regionId, regionData) in regionsData {
                    let pool = RegionNamePool(
                        firstMale: (regionData["first_male"] as? [String]) ?? [],
                        firstFemale: (regionData["first_female"] as? [String]) ?? [],
                        firstNeutral: (regionData["first_neutral"] as? [String]) ?? [],
                        last: (regionData["last"] as? [String]) ?? [],
                        honorifics: nil
                    )
                    pools[regionId] = pool
                }
                config.namePoolsByRegion = pools
                config.fallbackNamePool = pools["north_america"]
            } else {
                // Backward compat: old flat {region: {first:[...], last:[...]}} structure
                var pools: [String: RegionNamePool] = [:]
                for (regionId, value) in namesDoc {
                    guard let regionData = value as? [String: Any] else { continue }
                    let firstList = (regionData["first"] as? [String]) ?? []
                    pools[regionId] = RegionNamePool(
                        firstMale: firstList,
                        firstFemale: firstList,
                        firstNeutral: [],
                        last: (regionData["last"] as? [String]) ?? [],
                        honorifics: nil
                    )
                }
                config.namePoolsByRegion = pools
                config.fallbackNamePool = pools["North America"] ?? pools["north_america"]
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

        AppLogger.info("[FirebaseDataService] AppConfig loaded: \(config.namePoolsByRegion.count) name regions, \(config.traitPool.count) traits, \(config.allUniversities.count) universities")
        self.config = config
        return config
        #else
        return AppConfig()
        #endif
    }

    // MARK: - Subcollection fetchers

    func getPoliticalParties(for countryId: String) async -> [PoliticalParty] {
        let cacheKey = "parties_\(countryId)"
        if let cached = cacheQueue.sync(execute: { _cache[cacheKey] as? [PoliticalParty] }) { return cached }
        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }
        do {
            let snapshot = try await db
                .collection("countries")
                .document(countryId)
                .collection("parties")
                .getDocuments()
            let parties = snapshot.documents.compactMap { doc -> PoliticalParty? in
                var data = doc.data()
                data["id"] = doc.documentID
                guard let jsonData = try? JSONSerialization.data(withJSONObject: data),
                      let party = try? JSONDecoder().decode(PoliticalParty.self, from: jsonData)
                else { return nil }
                return party
            }
            cacheQueue.sync { _cache[cacheKey] = parties }
            return parties
        } catch {
            AppLogger.warning("[FirebaseDataService] Failed to fetch parties for \(countryId): \(error)")
            return []
        }
        #else
        return []
        #endif
    }

    func getLocales(for countryId: String) async -> [SubLocale] {
        let cacheKey = "locales_\(countryId)"
        if let cached = cacheQueue.sync(execute: { _cache[cacheKey] as? [SubLocale] }) { return cached }
        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }
        do {
            let snapshot = try await db
                .collection("countries")
                .document(countryId)
                .collection("locales")
                .getDocuments()
            let locales = snapshot.documents.compactMap { doc -> SubLocale? in
                var data = doc.data()
                data["id"] = doc.documentID
                guard let jsonData = try? JSONSerialization.data(withJSONObject: data),
                      let locale = try? JSONDecoder().decode(SubLocale.self, from: jsonData)
                else { return nil }
                return locale
            }
            cacheQueue.sync { _cache[cacheKey] = locales }
            return locales
        } catch {
            AppLogger.warning("[FirebaseDataService] Failed to fetch locales for \(countryId): \(error)")
            return []
        }
        #else
        return []
        #endif
    }

    func getMilitaryState(for countryId: String) async -> CountryMilitaryState? {
        let cacheKey = "military_\(countryId)"
        if let cached = cacheQueue.sync(execute: { _cache[cacheKey] as? CountryMilitaryState }) { return cached }
        #if canImport(FirebaseFirestore)
        guard let db = db else { return nil }
        do {
            let doc = try await db
                .collection("countries")
                .document(countryId)
                .collection("military_state")
                .document("current")
                .getDocument()
            guard doc.exists, let data = doc.data() else { return nil }
            guard let jsonData = try? JSONSerialization.data(withJSONObject: data),
                  let milState = try? JSONDecoder().decode(CountryMilitaryState.self, from: jsonData)
            else { return nil }
            cacheQueue.sync { _cache[cacheKey] = milState }
            return milState
        } catch {
            AppLogger.warning("[FirebaseDataService] Failed to fetch military state for \(countryId): \(error)")
            return nil
        }
        #else
        return nil
        #endif
    }

    // MARK: - Data Mapping

    private func decode<T: Decodable>(_ type: T.Type, from dict: [String: Any]) -> T? {
        guard let data = try? JSONSerialization.data(withJSONObject: dict) else { return nil }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try? decoder.decode(type, from: data)
    }

    /// Map Firestore country data to Country model
    /// - Parameters:
    ///   - data: The raw Firestore document data for the country
    ///   - id: The country ID from the document key (overrides any id field in data)
    private func mapCountry(from data: [String: Any], id countryId: String) -> Country? {
        guard let name = data["name"] as? String else { return nil }

        let facts: CountryFacts? = (data["facts"] as? [String: Any]).flatMap { decode(CountryFacts.self, from: $0) }
        let amounts: CountryAmountValues? = (data["amounts"] as? [String: Any]).flatMap { decode(CountryAmountValues.self, from: $0) }

        // Extract tokens
        var tokens: [String: String]?
        if let tokensData = data["tokens"] as? [String: String] {
            tokens = tokensData.isEmpty ? nil : tokensData
        } else if let tokensData = data["tokens"] as? [String: Any] {
            let compactTokens = tokensData.compactMapValues { $0 as? String }
            tokens = compactTokens.isEmpty ? nil : compactTokens
        }

        // Read population directly from raw Firestore dict as primary source to avoid
        // JSONSerialization failures with Firestore's Int64 types swallowing via try?
        let rawFactsData = data["facts"] as? [String: Any]
        let rawDemographics = rawFactsData?["demographics"] as? [String: Any]
        let rawPopulation: Int? = {
            if let v = rawDemographics?["population_total"] as? Int { return v }
            if let v = rawDemographics?["population_total"] as? Int64 { return Int(v) }
            if let v = rawDemographics?["population_total"] as? Double { return Int(v) }
            return nil
        }()
        let population = rawPopulation ?? facts?.demographics?.populationTotal ?? 0
        let gdp = facts.map { Int(($0.economy?.gdpNominalUsd ?? 0).rounded()) } ?? 0
        let attributes = CountryAttributes(population: population, gdp: gdp)

        let militaryData = data["military"] as? [String: Any]
        let military = MilitaryStats(
            strength: militaryData?["strength"] as? Double ?? 50.0,
            nuclearCapable: militaryData?["nuclearCapabilities"] as? Bool ?? militaryData?["nuclearCapable"] as? Bool ?? false,
            posture: militaryData?["posture"] as? String,
            navyPower: militaryData?["navyPower"] as? Double ?? 50.0,
            cyberCapability: militaryData?["cyberCapability"] as? Double ?? 50.0,
            description: militaryData?["description"] as? String
        )

        let militaryProfile: MilitaryProfile? = militaryData.flatMap { decode(MilitaryProfile.self, from: $0) }

        let profiles = Self.decodeCountryProfiles(from: data)
        let geopoliticalProfile = profiles.geopoliticalProfile
        let gameplayProfile = profiles.gameplayProfile

        let legislatureProfile: LegislatureProfile? = (data["legislature"] as? [String: Any]).flatMap { decode(LegislatureProfile.self, from: $0) }

        let legislatureInitialState: LegislatureState? = (data["legislature_initial_state"] as? [String: Any]).flatMap { decode(LegislatureState.self, from: $0) }

        let countryTraits: [CountryTrait]? = {
            guard let arr = data["traits"] as? [[String: Any]],
                  let traitsData = try? JSONSerialization.data(withJSONObject: arr) else { return nil }
            return try? JSONDecoder().decode([CountryTrait].self, from: traitsData)
        }()

        let populationMillions = rawPopulation.map { Double($0) / 1_000_000 }
            ?? facts.flatMap { $0.demographics?.populationTotal }.map { Double($0) / 1_000_000 }
        let rawEconomy = (data["facts"] as? [String: Any])?["economy"] as? [String: Any]
        let gdpBillions = facts.flatMap { $0.economy?.gdpNominalUsd.map { $0 / 1_000_000_000 } }
            ?? (rawEconomy?["gdp_nominal_usd"] as? Double).map { $0 / 1_000_000_000 }

        let diplomacyData = data["diplomacy"] as? [String: Any]
        let diplomacy = DiplomaticStats(
            relationship: diplomacyData?["relationship"] as? Double ?? 50.0,
            alignment: diplomacyData?["alignment"] as? String ?? "neutral",
            tradeAgreements: diplomacyData?["tradeAgreements"] as? [String] ?? [],
            tradeRelationships: diplomacyData?["tradeRelationships"] as? [String: Double]
        )

        let definiteArticle = (data["definiteArticle"] as? String) ?? (data["definite_article"] as? String)

        return Country(
            id: countryId,
            name: name,
            definiteArticle: definiteArticle,
            governmentProfileId: data["governmentProfileId"] as? String,
            attributes: attributes,
            military: military,
            diplomacy: diplomacy,
            region: data["region"] as? String,
            leaderTitle: facts?.institutions?.executive?.leaderTitle
                ?? facts?.institutions?.executive?.headOfStateTitle
                ?? tokens?["leader_title"],
            leader: nil,
            difficulty: data["difficulty"] as? String,
            termLengthYears: data["termLengthYears"] as? Int,
            currentPopulation: rawPopulation ?? facts?.demographics?.populationTotal,
            population: nil,
            gdp: nil,
            description: data["description"] as? String,
            subdivisions: nil,
            blocs: data["blocs"] as? [String],
            analysisBullets: data["analysisBullets"] as? [String],
            strengths: data["strengths"] as? [String],
            weaknesses: data["weaknesses"] as? [String],
            vulnerabilities: data["vulnerabilities"] as? [String],
            uniqueCapabilities: data["uniqueCapabilities"] as? [String],
            tokens: tokens,
            code: data["code"] as? String,
            flagUrl: data["flagUrl"] as? String,
            alliances: nil,
            economy: nil,
            geopoliticalProfile: geopoliticalProfile,
            gameplayProfile: gameplayProfile,
            militaryProfile: militaryProfile,
            legislatureProfile: legislatureProfile,
            legislatureInitialState: legislatureInitialState,
            countryTraits: countryTraits,
            populationMillions: populationMillions,
            gdpBillions: gdpBillions,
            facts: facts,
            amounts: amounts
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

        let tokenMap = data["token_map"] as? [String: String]
        let titleTemplate = data["title_template"] as? String
        let descriptionTemplate = data["description_template"] as? String
        let storagePath = data["storage_path"] as? String

        let conditions: [ScenarioCondition]? = (data["conditions"] as? [[String: Any]])?.compactMap { cond in
            guard let metricId = cond["metricId"] as? String else { return nil }
            return ScenarioCondition(metricId: metricId, min: (cond["min"] as? NSNumber)?.doubleValue, max: (cond["max"] as? NSNumber)?.doubleValue)
        }

        let relationshipConditions: [RelationshipCondition]? = (data["relationship_conditions"] as? [[String: Any]])?.compactMap { cond in
            guard let relationshipId = cond["relationshipId"] as? String else { return nil }
            return RelationshipCondition(relationshipId: relationshipId, min: (cond["min"] as? NSNumber)?.doubleValue, max: (cond["max"] as? NSNumber)?.doubleValue)
        }

        var metadata: ScenarioMetadata?
        if let meta = data["metadata"] as? [String: Any] {
            metadata = ScenarioMetadata(
                applicableCountries: meta["applicable_countries"] as? [String],
                requiresTags: meta["requires_tags"] as? [String],
                excludesTags: meta["excludes_tags"] as? [String],
                requiredGeopoliticalTags: meta["requiredGeopoliticalTags"] as? [String],
                excludedGeopoliticalTags: meta["excludedGeopoliticalTags"] as? [String],
                requiredGovernmentCategories: meta["requiredGovernmentCategories"] as? [String],
                excludedGovernmentCategories: meta["excludedGovernmentCategories"] as? [String],
                regionalBoost: (meta["regionalBoost"] as? [String: Any])?.compactMapValues { ($0 as? NSNumber)?.doubleValue },
                isNeighborEvent: meta["isNeighborEvent"] as? Bool,
                involvedCountries: meta["involvedCountries"] as? [String],
                regionTags: meta["region_tags"] as? [String],
                theme: meta["theme"] as? String,
                scopeTier: meta["scopeTier"] as? String,
                scopeKey: meta["scopeKey"] as? String,
                sourceKind: meta["sourceKind"] as? String,
                requires: {
                    guard let req = meta["requires"] as? [String: Any],
                          let reqData = try? JSONSerialization.data(withJSONObject: req) else { return nil }
                    return try? JSONDecoder().decode(ScenarioRequirements.self, from: reqData)
                }(),
                primaryMetrics: meta["primary_metrics"] as? [String]
            )
        }

        var legislatureRequirement: LegislatureRequirement?
        if let legReq = data["legislature_requirement"] as? [String: Any],
           let minApproval = legReq["min_approval"] as? Int {
            legislatureRequirement = LegislatureRequirement(minApproval: minApproval, chamber: legReq["chamber"] as? String)
        }

        var dynamicProfile: ScenarioDynamicProfile?
        if let dp = data["dynamic_profile"] as? [String: Any] {
            dynamicProfile = ScenarioDynamicProfile(
                stateTriggers: (dp["state_triggers"] as? [[String: Any]])?.compactMap { st in
                    guard let metricId = st["metric_id"] as? String,
                          let condition = st["condition"] as? String,
                          let threshold = (st["threshold"] as? NSNumber)?.doubleValue,
                          let weightBoost = (st["weight_boost"] as? NSNumber)?.doubleValue else { return nil }
                    return StateTrigger(metricId: metricId, condition: condition, threshold: threshold, weightBoost: weightBoost)
                },
                actorPattern: dp["actor_pattern"] as? String,
                narrativeFingerprint: dp["narrative_fingerprint"] as? [String],
                pressureSources: dp["pressure_sources"] as? [String],
                governingLens: dp["governing_lens"] as? String,
                followUpHooks: dp["follow_up_hooks"] as? [String],
                recurrenceGroup: dp["recurrence_group"] as? String,
                suppressionTags: dp["suppression_tags"] as? [String]
            )
        }

        return Scenario(
            id: id,
            title: title,
            description: description,
            conditions: conditions,
            relationshipConditions: relationshipConditions,
            phase: data["phase"] as? String,
            severity: mapSeverityLevel(from: data["severity"] as? String),
            chainId: data["chain_id"] as? String,
            options: options,
            chainsTo: data["chains_to"] as? [String],
            actor: data["actor"] as? String,
            tags: data["tags"] as? [String],
            cooldown: data["cooldown"] as? Int,
            weight: (data["weight"] as? NSNumber)?.doubleValue,
            tier: data["tier"] as? String,
            category: data["category"] as? String,
            oncePerGame: data["once_per_game"] as? Bool,
            titleTemplate: titleTemplate,
            descriptionTemplate: descriptionTemplate,
            tokenMap: tokenMap,
            storagePath: storagePath,
            metadata: metadata,
            legislatureRequirement: legislatureRequirement,
            dynamicProfile: dynamicProfile
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
            advisorFeedback: (data["advisorFeedback"] as? [[String: Any]])?.compactMap { item in
                guard let roleId = item["roleId"] as? String,
                      let stance = item["stance"] as? String,
                      let feedback = item["feedback"] as? String else { return nil }
                return AdvisorFeedback(roleId: roleId, stance: stance, feedback: feedback)
            },
            effects: effects,
            effectsMap: (data["effects"] as? [String: Any])?.compactMapValues { ($0 as? NSNumber)?.doubleValue },
            nextScenarioId: data["nextScenarioId"] as? String ?? data["next_scenario_id"] as? String,
            impactText: nil,
            impactMap: (data["impact"] as? [String: Any])?.compactMapValues { ($0 as? NSNumber)?.doubleValue },
            relationshipImpact: (data["relationship_impact"] as? [String: Any])?.compactMapValues { ($0 as? NSNumber)?.doubleValue },
            relationshipEffects: {
                let raw = data["relationshipEffects"] as? [[String: Any]] ?? data["relationship_effects"] as? [[String: Any]]
                return raw?.compactMap { d -> RelationshipEffect? in
                    guard let roleId = d["relationshipId"] as? String,
                          let delta = (d["delta"] as? NSNumber)?.doubleValue else { return nil }
                    return RelationshipEffect(relationshipId: roleId, delta: delta, probability: (d["probability"] as? NSNumber)?.doubleValue)
                }
            }(),
            populationImpact: {
                let raw = data["population_impact"] as? [[String: Any]] ?? data["populationImpact"] as? [[String: Any]]
                return raw?.compactMap { d -> PopulationImpact? in
                    guard let cid = d["country_id"] as? String ?? d["countryId"] as? String else { return nil }
                    return PopulationImpact(
                        countryId: cid,
                        casualties: (d["casualties"] as? NSNumber)?.doubleValue,
                        displaced: (d["displaced"] as? NSNumber)?.doubleValue,
                        severity: SeverityLevel(rawValue: d["severity"] as? String ?? "")
                    )
                }
            }(),
            economicImpact: {
                let raw = data["economic_impact"] as? [[String: Any]] ?? data["economicImpact"] as? [[String: Any]]
                return raw?.compactMap { d -> EconomicImpact? in
                    return EconomicImpact(
                        countryId: d["country_id"] as? String ?? d["countryId"] as? String,
                        gdpDelta: (d["gdp_delta"] as? NSNumber)?.doubleValue ?? (d["gdpDelta"] as? NSNumber)?.doubleValue,
                        tradeDelta: (d["trade_delta"] as? NSNumber)?.doubleValue ?? (d["tradeDelta"] as? NSNumber)?.doubleValue,
                        energyDelta: (d["energy_delta"] as? NSNumber)?.doubleValue ?? (d["energyDelta"] as? NSNumber)?.doubleValue
                    )
                }
            }(),
            humanCost: {
                let d = data["human_cost"] as? [String: Any] ?? data["humanCost"] as? [String: Any]
                guard let d else { return nil }
                return HumanCost(
                    civilian: (d["civilian"] as? NSNumber)?.doubleValue,
                    military: (d["military"] as? NSNumber)?.doubleValue,
                    displaced: (d["displaced"] as? NSNumber)?.doubleValue,
                    casualtyConfidence: (d["casualty_confidence"] as? NSNumber)?.doubleValue ?? (d["casualtyConfidence"] as? NSNumber)?.doubleValue
                )
            }(),
            actor: data["actor"] as? String,
            location: {
                let d = data["location"] as? [String: Any]
                guard let d else { return nil }
                return ScenarioLocation(
                    countryId: d["countryId"] as? String ?? d["country_id"] as? String,
                    region: d["region"] as? String,
                    city: d["city"] as? String,
                    site: d["site"] as? String,
                    cityId: d["cityId"] as? String ?? d["city_id"] as? String,
                    cityIds: d["cityIds"] as? [String] ?? d["city_ids"] as? [String],
                    regionId: d["regionId"] as? String ?? d["region_id"] as? String,
                    siteId: d["siteId"] as? String ?? d["site_id"] as? String,
                    localeTemplate: d["localeTemplate"] as? String ?? d["locale_template"] as? String
                )
            }(),
            severity: mapSeverityLevel(from: data["severity"] as? String),
            tags: data["tags"] as? [String],
            cooldown: data["cooldown"] as? Int,
            oncePerGame: data["oncePerGame"] as? Bool ?? data["once_per_game"] as? Bool,
            outcome: data["outcome"] as? String,
            outcomeHeadline: data["outcomeHeadline"] as? String ?? data["outcome_headline"] as? String,
            outcomeSummary: data["outcomeSummary"] as? String ?? data["outcome_summary"] as? String,
            outcomeContext: data["outcomeContext"] as? String ?? data["outcome_context"] as? String,
            isAuthoritarian: data["is_authoritarian"] as? Bool,
            moralWeight: (data["moral_weight"] as? NSNumber)?.doubleValue,
            consequenceScenarioIds: data["consequence_scenario_ids"] as? [String],
            consequenceDelay: data["consequence_delay"] as? Int
        )
    }

    /// Map Firestore effect data to Effect model
    private func mapEffect(from data: [String: Any]) -> Effect? {
        guard let targetMetricId = data["target_metric_id"] as? String ?? data["targetMetricId"] as? String,
              let value = (data["value"] as? NSNumber)?.doubleValue else {
            return nil
        }

        return Effect(
            targetMetricId: targetMetricId,
            value: value,
            duration: data["duration"] as? Int ?? 1,
            probability: (data["probability"] as? NSNumber)?.doubleValue ?? 1.0,
            delay: data["delay"] as? Int,
            type: data["type"] as? String
        )
    }

    /// Map string to SeverityLevel enum
    private func mapSeverityLevel(from string: String?) -> SeverityLevel? {
        guard let string = string else { return nil }
        return SeverityLevel(rawValue: string)
    }

    // MARK: - World Events

    func fetchRecentWorldEvents(since: Date? = nil, limit: Int = 20) async -> [FirebaseWorldEvent] {
        #if canImport(FirebaseFirestore)
        guard let db = db else { return [] }
        do {
            var query: Query = db.collection("world_events")
                .order(by: "timestamp", descending: true)
                .limit(to: limit)
            if let since = since {
                let iso = ISO8601DateFormatter().string(from: since)
                query = db.collection("world_events")
                    .whereField("timestamp", isGreaterThan: iso)
                    .order(by: "timestamp", descending: true)
                    .limit(to: limit)
            }
            let snap = try await query.getDocuments()
            return snap.documents.compactMap { doc -> FirebaseWorldEvent? in
                let data = doc.data()
                guard let jsonData = try? JSONSerialization.data(withJSONObject: data) else { return nil }
                return try? JSONDecoder().decode(FirebaseWorldEvent.self, from: jsonData)
            }
        } catch {
            AppLogger.warning("[FirebaseDataService] fetchRecentWorldEvents failed: \(error)")
            return []
        }
        #else
        return []
        #endif
    }

    func fetchCountryWorldStates(countryIds: [String]) async -> [String: CountryWorldState] {
        #if canImport(FirebaseFirestore)
        guard let db = db, !countryIds.isEmpty else { return [:] }
        var result: [String: CountryWorldState] = [:]
        let chunks = stride(from: 0, to: countryIds.count, by: 30).map {
            Array(countryIds[$0..<min($0 + 30, countryIds.count)])
        }
        for chunk in chunks {
            do {
                let snap = try await db.collection("country_world_state")
                    .whereField(FieldPath.documentID(), in: chunk)
                    .getDocuments()
                for doc in snap.documents {
                    let data = doc.data()
                    if let jsonData = try? JSONSerialization.data(withJSONObject: data),
                       let state = try? JSONDecoder().decode(CountryWorldState.self, from: jsonData) {
                        result[state.countryId] = state
                    }
                }
            } catch {
                AppLogger.warning("[FirebaseDataService] fetchCountryWorldStates chunk failed: \(error)")
            }
        }
        return result
        #else
        return [:]
        #endif
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
