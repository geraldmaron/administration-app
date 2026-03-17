import Foundation

/// CandidateGenerator
/// Generates random candidates and ministers for the administration.
/// Uses Firebase-loaded AppConfig for all data pools (names, traits, parties,
/// universities, backgrounds, approaches). Mirrors web candidateUtils.ts.
class CandidateGenerator {

    private final class RNG {
        private var state: UInt64?

        init(seed: Int?) {
            if let seed = seed {
                self.state = UInt64(bitPattern: Int64(seed))
            }
        }

        func next() -> Double {
            if var state = state {
                state = (state &* 9301 &+ 49297) % 233280
                self.state = state
                return Double(state) / 233280.0
            }
            return Double.random(in: 0...1)
        }

        func range(_ min: Int, _ max: Int) -> Int {
            return Int(floor(next() * Double(max - min + 1))) + min
        }

        func float(_ min: Double, _ max: Double) -> Double {
            let val = next() * (max - min) + min
            return (val * 100).rounded() / 100
        }

        func pick<T>(_ array: [T]) -> T? {
            guard !array.isEmpty else { return nil }
            return array[range(0, array.count - 1)]
        }

        func pickMultiple<T>(_ array: [T], _ count: Int) -> [T] {
            guard !array.isEmpty else { return [] }
            let shuffled = array.sorted { _, _ in next() < 0.5 }
            return Array(shuffled.prefix(count))
        }
    }

    // MARK: - Local fallback degree templates (used when Firebase education_pool unavailable)

    private struct DegreeTemplate {
        let degree: String
        let fields: [String]
    }

    private struct DegreeInfo {
        let text: String
        let type: String
        let field: String
    }

    private static let FALLBACK_DEGREE_TEMPLATES: [DegreeTemplate] = [
        DegreeTemplate(degree: "B.A.", fields: ["Political Science", "Economics", "History", "International Relations", "Public Policy"]),
        DegreeTemplate(degree: "B.S.", fields: ["Economics", "Computer Science", "Engineering", "Statistics", "Public Health"]),
        DegreeTemplate(degree: "M.A.", fields: ["International Relations", "Economics", "Public Administration", "Political Science"]),
        DegreeTemplate(degree: "M.S.", fields: ["Economics", "Public Policy", "Computer Science", "Data Science", "Public Health"]),
        DegreeTemplate(degree: "M.P.A.", fields: ["Public Administration"]),
        DegreeTemplate(degree: "M.P.P.", fields: ["Public Policy"]),
        DegreeTemplate(degree: "M.B.A.", fields: ["Business Administration"]),
        DegreeTemplate(degree: "J.D.", fields: ["Law"]),
        DegreeTemplate(degree: "Ph.D.", fields: ["Economics", "Political Science", "Public Policy", "Sociology"])
    ]

    // MARK: - Name picking

    private static func pickNameForRegion(_ rng: RNG, region: String?, config: AppConfig?, gender: PersonGender, excludedFirstNames: Set<String> = [], excludedLastNames: Set<String> = []) -> String {
        let regionKey = region ?? "north_america"
        let pool = config?.namePoolsByRegion[regionKey] ?? config?.namePoolsByRegion["north_america"] ?? config?.fallbackNamePool
        let firstPool: [String]
        switch gender {
        case .male:      firstPool = pool?.firstMale    ?? []
        case .female:    firstPool = pool?.firstFemale  ?? []
        case .nonbinary: firstPool = pool?.firstNeutral ?? pool?.firstMale ?? []
        }
        let lastPool = pool?.last ?? []
        let availableFirst = firstPool.filter { !excludedFirstNames.contains($0) }
        let availableLast = lastPool.filter { !excludedLastNames.contains($0) }
        let first = rng.pick(availableFirst.isEmpty ? firstPool : availableFirst) ?? "Alex"
        let last = rng.pick(availableLast.isEmpty ? lastPool : availableLast) ?? "Smith"
        return "\(first) \(last)"
    }

    // MARK: - Institution picking

    private static func pickInstitutionForRegion(_ rng: RNG, region: String?, config: AppConfig?) -> String {
        let regionKey = region ?? "North America"
        let pool = config?.institutions(for: regionKey) ?? []
        if pool.isEmpty {
            return rng.pick(config?.allUniversities ?? []) ?? "University"
        }
        return rng.pick(pool) ?? "University"
    }

    // MARK: - Education generation

    private static func generateEducationWithTracking(_ rng: RNG, institution: String, config: AppConfig?) -> DegreeInfo {
        let templates: [DegreeTemplate]
        if let firebaseTemplates = config?.degreeTemplates, !firebaseTemplates.isEmpty {
            templates = firebaseTemplates.compactMap { t in
                guard let degree = t["degree"] as? String,
                      let fields = t["fields"] as? [String] else { return nil }
                return DegreeTemplate(degree: degree, fields: fields)
            }
        } else {
            templates = FALLBACK_DEGREE_TEMPLATES
        }

        guard let primary = rng.pick(templates) else {
            return DegreeInfo(text: "Degree, \(institution)", type: "Degree", field: "General")
        }
        guard let field = rng.pick(primary.fields) else {
            return DegreeInfo(text: "\(primary.degree), \(institution)", type: primary.degree, field: "General")
        }

        let includeSecond = rng.next() < 0.35
        if !includeSecond {
            return DegreeInfo(text: "\(primary.degree) \(field), \(institution)", type: primary.degree, field: field)
        }

        let secondaryPool = templates.filter { $0.degree != primary.degree }
        let secondary = rng.pick(secondaryPool) ?? primary
        let field2 = rng.pick(secondary.fields) ?? field
        let allUnis = config?.allUniversities ?? []
        let inst2 = rng.next() < 0.6 ? institution : (rng.pick(allUnis) ?? institution)
        return DegreeInfo(
            text: "\(primary.degree) \(field), \(institution); \(secondary.degree) \(field2), \(inst2)",
            type: primary.degree, field: field
        )
    }

    private static func categoryToEducationWithTracking(_ rng: RNG, category: String, institution: String, config: AppConfig?) -> DegreeInfo {
        let c = category.lowercased()

        // Try Firebase category mappings first
        if let mappings = config?.categoryMappings {
            var options: [DegreeInfo] = []
            for (key, opts) in mappings {
                if c.contains(key.lowercased()) {
                    for opt in opts {
                        if let type_ = opt["type"], let field = opt["field"] {
                            options.append(DegreeInfo(text: "\(type_) \(field), \(institution)", type: type_, field: field))
                        }
                    }
                }
            }
            if !options.isEmpty, let chosen = rng.pick(options) { return chosen }
        }

        // Fallback: hardcoded category mappings
        var options: [DegreeInfo] = []
        if c.contains("executive") || c.contains("state") || c.contains("diplomacy") {
            options = [
                DegreeInfo(text: "M.P.A. Public Administration, \(institution)", type: "M.P.A.", field: "Public Administration"),
                DegreeInfo(text: "M.A. International Relations, \(institution)", type: "M.A.", field: "International Relations"),
                DegreeInfo(text: "M.P.P. Public Policy, \(institution)", type: "M.P.P.", field: "Public Policy"),
                DegreeInfo(text: "J.D. Law, \(institution)", type: "J.D.", field: "Law"),
            ]
        } else if c.contains("economy") || c.contains("treasury") || c.contains("finance") {
            options = [
                DegreeInfo(text: "M.B.A. Business Administration, \(institution)", type: "M.B.A.", field: "Business Administration"),
                DegreeInfo(text: "M.S. Economics, \(institution)", type: "M.S.", field: "Economics"),
                DegreeInfo(text: "Ph.D. Economics, \(institution)", type: "Ph.D.", field: "Economics"),
            ]
        } else if c.contains("defense") || c.contains("security") || c.contains("military") {
            options = [
                DegreeInfo(text: "M.A. Security Studies, \(institution)", type: "M.A.", field: "Security Studies"),
                DegreeInfo(text: "B.S. Engineering, \(institution)", type: "B.S.", field: "Engineering"),
            ]
        } else if c.contains("health") {
            options = [
                DegreeInfo(text: "M.S. Public Health, \(institution)", type: "M.S.", field: "Public Health"),
                DegreeInfo(text: "Ph.D. Public Policy, \(institution)", type: "Ph.D.", field: "Public Policy"),
            ]
        } else if c.contains("education") {
            options = [
                DegreeInfo(text: "M.P.P. Public Policy, \(institution)", type: "M.P.P.", field: "Public Policy"),
                DegreeInfo(text: "Ph.D. Education Policy, \(institution)", type: "Ph.D.", field: "Education Policy"),
            ]
        }

        return options.isEmpty ? generateEducationWithTracking(rng, institution: institution, config: config) : (rng.pick(options) ?? options[0])
    }

    // MARK: - Background picking

    private static func pickBackgroundForStats(_ rng: RNG, stats: PlayerStats, country: Country?, config: AppConfig?) -> String {
        let countryId = country?.id
        let backgroundPool = config?.backgrounds(for: countryId) ?? []
        if !backgroundPool.isEmpty, let picked = rng.pick(backgroundPool) { return picked }

        let entries: [(String, Double)] = [
            ("military", stats.military), ("diplomacy", stats.diplomacy),
            ("economics", stats.economics), ("integrity", stats.integrity),
            ("compassion", stats.compassion), ("management", stats.management)
        ]
        let top = entries.sorted { $0.1 > $1.1 }.first?.0 ?? "management"

        // Get country-specific role tokens
        let tokens = country?.tokens ?? [:]
        let defenseRole = tokens["defense_role"] ?? "Defense Minister"
        let financeRole = tokens["finance_role"] ?? "Finance Minister"
        let foreignRole = tokens["foreign_affairs_role"] ?? "Foreign Minister"

        switch top {
        case "military":  return rng.pick(["Retired Army General", "Former \(defenseRole)", "Naval Admiral", "Military Command Advisor"]) ?? "Military Advisor"
        case "diplomacy": return rng.pick(["Former Ambassador to the UN", "Veteran Treaty Negotiator", "Career Diplomat", "Former \(foreignRole)"]) ?? "Diplomat"
        case "economics": return rng.pick(["Director of the Central Bank", "Former \(financeRole)", "IMF Senior Official", "World Bank Director"]) ?? "Economist"
        case "integrity": return rng.pick(["Anti-Corruption Prosecutor", "Ethics Watchdog Commissioner", "Senior Judge", "Inspector General"]) ?? "Legal Expert"
        case "compassion": return rng.pick(["Head of a Major Humanitarian NGO", "Public Health Campaigner", "UNICEF Director", "Social Policy Advocate"]) ?? "Humanitarian"
        default: return rng.pick(["State Governor for 8 years", "Senior civil service administrator", "Federal agency director", "University president"]) ?? "Senior Administrator"
        }
    }

    // MARK: - Analysis generation

    private static func generateAnalysis(stats: PlayerStats, traits: [PlayerTrait]) -> [String] {
        var bullets: [String] = []
        if stats.diplomacy > 80 { bullets.append("Highly effective in international mediation and alliance building.") }
        if stats.economics > 80 { bullets.append("Demonstrated expertise in macroeconomic stability and fiscal policy.") }
        if stats.military > 80  { bullets.append("Deep background in strategic defense and military doctrine.") }
        if stats.integrity > 85 { bullets.append("Unimpeachable record of public service and ethical conduct.") }
        if stats.management > 80 { bullets.append("Exceptional administrative efficiency and organizational leadership.") }
        if stats.compassion > 80 { bullets.append("Strong advocate for social safety nets and humanitarian causes.") }
        if stats.diplomacy > 75 && stats.compassion > 70 { bullets.append("Known for building consensus across diverse stakeholder groups.") }
        if stats.integrity > 75 && stats.management > 75 { bullets.append("Proven ability to establish trust and credibility with institutional leaders.") }
        if stats.economics > 75 && stats.management > 75 { bullets.append("Track record of implementing complex policy reforms successfully.") }

        traits.forEach { trait in
            switch trait.name {
            case "Iron Will": bullets.append("Known for decisive action under extreme political pressure.")
            case "Technocrat": bullets.append("Prioritizes empirical evidence over partisan sentiment.")
            case "Orator": bullets.append("Capable of swaying public opinion through compelling rhetoric.")
            case "Fiscal Hawk": bullets.append("Maintains a strict disciplined approach to budgetary oversight.")
            case "Diplomat": bullets.append("Skilled negotiator with experience resolving international disputes.")
            case "Grand Strategist": bullets.append("Renowned for long-term strategic planning and implementation.")
            case "Senior Statesman": bullets.append("Widely respected figure with decades of diplomatic experience.")
            default: break
            }
        }

        let fallbacks = [
            "Consistent track record of professional achievement in senior leadership roles.",
            "Recognized for strategic foresight in complex institutional environments.",
            "Maintains a robust network of domestic and international stakeholders.",
            "Expertise in navigating high-stakes legislative and executive processes.",
        ]
        var idx = 0
        while bullets.count < 4 && idx < fallbacks.count {
            if !bullets.contains(fallbacks[idx]) { bullets.append(fallbacks[idx]) }
            idx += 1
        }
        return Array(bullets.prefix(4))
    }

    // MARK: - Strengths & Weaknesses

    private static func generateStrengthsWeaknesses(stats: PlayerStats, traits: [PlayerTrait], background: String?) -> (strengths: [String], weaknesses: [String]) {
        var strengths: [String] = []
        var weaknesses: [String] = []

        if stats.diplomacy >= 80 { strengths.append("Master Negotiator") } else if stats.diplomacy >= 70 { strengths.append("Skilled Diplomat") }
        if stats.economics >= 80 { strengths.append("Economic Visionary") } else if stats.economics >= 70 { strengths.append("Fiscal Expert") }
        if stats.military >= 80 { strengths.append("Military Strategist") } else if stats.military >= 70 { strengths.append("Defense Expert") }
        if stats.management >= 80 { strengths.append("Efficient Administrator") } else if stats.management >= 70 { strengths.append("Capable Manager") }
        if stats.integrity >= 80 { strengths.append("Uncorruptible") } else if stats.integrity >= 70 { strengths.append("Ethical Standard") }
        if stats.compassion >= 80 { strengths.append("Humanitarian Leader") } else if stats.compassion >= 70 { strengths.append("Empathetic") }

        if stats.diplomacy <= 30 { weaknesses.append("Undiplomatic") } else if stats.diplomacy <= 45 { weaknesses.append("Poor Negotiator") }
        if stats.economics <= 30 { weaknesses.append("Economically Illiterate") } else if stats.economics <= 45 { weaknesses.append("Fiscal Novice") }
        if stats.military <= 30 { weaknesses.append("Pacifist Naivety") } else if stats.military <= 45 { weaknesses.append("Weak on Defense") }
        if stats.management <= 30 { weaknesses.append("Disorganized") } else if stats.management <= 45 { weaknesses.append("Micromanager") }
        if stats.integrity <= 30 { weaknesses.append("Corruptible") } else if stats.integrity <= 45 { weaknesses.append("Ethically Flexible") }
        if stats.compassion <= 30 { weaknesses.append("Ruthless") } else if stats.compassion <= 45 { weaknesses.append("Detached") }

        traits.forEach { trait in
            switch trait.name {
            case "Iron Will": strengths.append("Unshakeable Resolve")
            case "Technocrat": strengths.append("Data-Driven"); weaknesses.append("Disconnect from Public")
            case "Orator": strengths.append("Charismatic Speaker")
            case "Fiscal Hawk": strengths.append("Debt Reducer"); weaknesses.append("Austerity Drive")
            case "Diplomat": strengths.append("Conflict Resolver")
            case "Grand Strategist": strengths.append("Long-term Planning")
            case "Populist": strengths.append("Public Appeal"); weaknesses.append("Short-termism")
            case "Whistleblower": strengths.append("Transparency"); weaknesses.append("Institutional Enemy")
            default: break
            }
        }

        if let bg = background {
            if bg.contains("General") || bg.contains("Military") { strengths.append("Chain of Command") }
            if bg.contains("Business") || bg.contains("CEO") { strengths.append("Corporate Efficiency") }
            if bg.contains("Academic") || bg.contains("Professor") { strengths.append("Deep Knowledge") }
            if bg.contains("Activist") { strengths.append("Grassroots Support"); weaknesses.append("Radicalism") }
        }

        if strengths.isEmpty { strengths.append("Competent") }
        if weaknesses.isEmpty { weaknesses.append("None Notable") }
        return (Array(strengths.prefix(3)), Array(weaknesses.prefix(3)))
    }

    // MARK: - Degree stat bonus mapping

    static func getStatBonusForDegree(degreeType: String?, field: String?) -> String {
        let mapping: [String: String] = [
            "J.D.": "integrity", "Law": "integrity",
            "M.B.A.": "economics", "Business Administration": "economics",
            "M.S.": "economics", "Ph.D.": "competency",
            "Economics": "economics", "Public Policy": "management",
            "M.P.P.": "management", "M.P.A.": "management",
            "Public Administration": "management", "International Relations": "diplomacy",
            "M.A.": "diplomacy", "Political Science": "ideology", "History": "ideology",
            "Security Studies": "military", "Engineering": "military",
            "Computer Science": "competency", "Statistics": "competency",
            "Data Science": "competency", "Public Health": "compassion",
            "Education": "compassion", "Sociology": "compassion"
        ]
        if let t = degreeType, let mapped = mapping[t] { return mapped }
        if let f = field, let mapped = mapping[f] { return mapped }
        return "management"
    }

    // MARK: - Public API

    /// Generate election candidates for a country using Firebase AppConfig data.
    static func generateCandidates(country: Country, count: Int = 10, gender: PersonGender? = nil, config: AppConfig?, partyNames: [String]? = nil) -> [Candidate] {
        let rng = RNG(seed: seedFromString(country.id + String(Date().timeIntervalSince1970)))
        let parties = partyNames?.isEmpty == false ? partyNames! : (config?.parties(for: country.id) ?? ["Independent"])
        let traitPool = config?.traitPool ?? []
        var candidates: [Candidate] = []

        for i in 0..<count {
            let resolvedGender: PersonGender = gender ?? PersonGender.allCases.randomElement() ?? .male
            var stats = PlayerStats(
                diplomacy: rng.float(15, 85), economics: rng.float(15, 85),
                military: rng.float(15, 85), management: rng.float(25, 90),
                compassion: rng.float(15, 95), integrity: rng.float(5, 99),
                charisma: nil, competency: nil, ideology: nil, corruption: nil
            )
            if let spikeStat = rng.pick(["diplomacy", "economics", "military", "management", "compassion", "integrity"]) {
                stats = boostedStats(stats: stats, key: spikeStat, boost: rng.float(20, 40))
            }

            let age = rng.range(38, 72)
            let yearsOfExperience = Int(Double(age - 22) * (Double(rng.range(60, 90)) / 100.0))
            let institution = pickInstitutionForRegion(rng, region: country.region, config: config)
            let traits = rng.pickMultiple(traitPool, rng.range(0, 2))
            let analysis = generateAnalysis(stats: stats, traits: traits)
            let background = pickBackgroundForStats(rng, stats: stats, country: country, config: config)
            let degreeInfo = generateEducationWithTracking(rng, institution: institution, config: config)
            let party = rng.pick(parties) ?? "Independent"
            let sw = generateStrengthsWeaknesses(stats: stats, traits: traits, background: background)
            let skills = rng.pickMultiple(["Negotiation", "Crisis Management", "Public Speaking", "Fiscal Oversight", "Strategic Planning", "International Relations", "Intelligence Analysis", "Cyber Defense", "Healthcare Policy", "Economic Reform"], rng.range(2, 4))
            let potentialScore = rng.float(40, 95)
            let careerHistory = [background] + (rng.next() < 0.5 ? ["Senior Advisor", "Research Fellow"] : ["Regional Director", "Municipal Leader"])

            var candidate = Candidate(
                id: "cand_\(country.id)_\(i)", name: pickNameForRegion(rng, region: country.region, config: config, gender: resolvedGender),
                party: party, background: background, education: degreeInfo.text,
                experience: "\(yearsOfExperience) Years Tenure", institution: institution,
                age: age, yearsOfExperience: yearsOfExperience, stats: stats, traits: traits,
                analysisBullets: analysis, strengths: sw.strengths, weaknesses: sw.weaknesses,
                degreeType: degreeInfo.type, degreeField: degreeInfo.field, skills: skills,
                careerHistory: careerHistory, potentialScore: potentialScore, cost: nil, gender: resolvedGender
            )
            candidate.cost = CabinetPointsService.calculateCandidateCost(candidate: candidate)
            candidate.roleAffinity = deriveRoleAffinity(degreeField: candidate.degreeField, skills: candidate.skills)
            candidates.append(candidate)
        }
        return candidates.sorted { $0.name < $1.name }
    }

    /// Generate minister candidates for a specific cabinet role using Firebase AppConfig.
    static func generateMinisters(roleId: String, category: String, region: String?, countryId: String? = nil, seed: Int? = nil, count: Int = 1, gender: PersonGender? = nil, config: AppConfig?, partyNames: [String]? = nil, excludedFirstNames: Set<String> = [], excludedLastNames: Set<String> = []) -> [Candidate] {
        let rng = RNG(seed: seed ?? Int(Date().timeIntervalSince1970))
        let parties = partyNames?.isEmpty == false ? partyNames! : (config?.parties(for: countryId) ?? ["Independent"])
        let traitPool = config?.traitPool ?? []
        var candidates: [Candidate] = []
        var usedFirst = excludedFirstNames
        var usedLast = excludedLastNames

        for i in 0..<count {
            let resolvedGender: PersonGender = gender ?? PersonGender.allCases.randomElement() ?? .male
            let categoryIdeology: Double
            switch category {
            case "Defense", "Security", "Military": categoryIdeology = rng.float(6, 9)
            case "Diplomacy", "State":              categoryIdeology = rng.float(3, 6)
            case "Economy", "Treasury":             categoryIdeology = rng.float(4, 7)
            case "Environment", "Health", "Labor":  categoryIdeology = rng.float(2, 5)
            default:                                categoryIdeology = rng.float(3, 7)
            }
            var stats = PlayerStats(
                diplomacy: rng.float(40, 85), economics: rng.float(40, 85),
                military: rng.float(40, 85), management: rng.float(45, 92),
                compassion: rng.float(40, 85), integrity: rng.float(38, 85),
                charisma: nil, competency: nil, ideology: nil, corruption: nil
            )

            switch category {
            case "Diplomacy", "State":
                stats = PlayerStats(diplomacy: rng.float(50, 95), economics: stats.economics, military: stats.military, management: stats.management, compassion: stats.compassion, integrity: rng.float(40, 90), charisma: nil, competency: nil, ideology: categoryIdeology, corruption: nil)
            case "Economy", "Treasury":
                stats = PlayerStats(diplomacy: stats.diplomacy, economics: rng.float(50, 95), military: stats.military, management: rng.float(40, 90), compassion: stats.compassion, integrity: stats.integrity, charisma: nil, competency: nil, ideology: categoryIdeology, corruption: nil)
            case "Defense", "Security":
                stats = PlayerStats(diplomacy: stats.diplomacy, economics: stats.economics, military: rng.float(55, 95), management: rng.float(35, 90), compassion: stats.compassion, integrity: rng.float(35, 85), charisma: nil, competency: nil, ideology: categoryIdeology, corruption: nil)
            case "Executive":
                stats = PlayerStats(diplomacy: stats.diplomacy, economics: stats.economics, military: stats.military, management: rng.float(55, 95), compassion: stats.compassion, integrity: rng.float(35, 90), charisma: nil, competency: nil, ideology: categoryIdeology, corruption: nil)
            default: break
            }

            if rng.float(0, 100) < 20 {
                stats = PlayerStats(diplomacy: rng.float(20, 55), economics: rng.float(20, 55), military: rng.float(20, 55), management: rng.float(25, 60), compassion: rng.float(20, 60), integrity: rng.float(20, 60), charisma: nil, competency: nil, ideology: categoryIdeology, corruption: nil)
            }

            let traits = rng.pickMultiple(traitPool, rng.range(0, 2))
            let institution = pickInstitutionForRegion(rng, region: region, config: config)
            let age = rng.range(42, 68)
            let yearsOfExperience = Int(Double(age - 24) * (Double(rng.range(70, 95)) / 100.0))
            let background = pickBackgroundForStats(rng, stats: stats, country: nil, config: config)
            let degreeInfo = categoryToEducationWithTracking(rng, category: category, institution: institution, config: config)
            let sw = generateStrengthsWeaknesses(stats: stats, traits: traits, background: background)
            let skills = rng.pickMultiple(["Negotiation", "Crisis Management", "Public Speaking", "Fiscal Oversight", "Strategic Planning", "International Relations", "Intelligence Analysis", "Cyber Defense", "Healthcare Policy", "Economic Reform"], rng.range(2, 4))
            let potentialScore = rng.float(50, 98)
            let careerHistory = [background] + (rng.next() < 0.5 ? ["Cabinet Liaison", "Senior Technocrat"] : ["Department Head", "Deputy Minister"])

            let generatedName = pickNameForRegion(rng, region: region, config: config, gender: resolvedGender, excludedFirstNames: usedFirst, excludedLastNames: usedLast)
            let nameParts = generatedName.split(separator: " ", maxSplits: 1)
            if let fn = nameParts.first { usedFirst.insert(String(fn)) }
            if nameParts.count > 1 { usedLast.insert(String(nameParts[1])) }
            var candidate = Candidate(
                id: "minister_\(category)_\(i)", name: generatedName,
                party: rng.pick(parties) ?? "Independent", background: background, education: degreeInfo.text,
                experience: "\(yearsOfExperience) Years Industry Experience", institution: institution,
                age: age, yearsOfExperience: yearsOfExperience, stats: stats, traits: traits,
                analysisBullets: generateAnalysis(stats: stats, traits: traits), strengths: sw.strengths,
                weaknesses: sw.weaknesses, degreeType: degreeInfo.type, degreeField: degreeInfo.field,
                skills: skills, careerHistory: careerHistory, potentialScore: potentialScore, cost: nil, gender: resolvedGender
            )
            candidate.cost = CabinetPointsService.calculateCandidateCost(candidate: candidate)
            candidate.roleAffinity = deriveRoleAffinity(degreeField: candidate.degreeField, skills: candidate.skills)
            candidates.append(candidate)
        }
        return candidates
    }

    private static func deriveRoleAffinity(degreeField: String?, skills: [String]?) -> [String] {
        var affinities: [String] = []
        let field = (degreeField ?? "").lowercased()
        let skillSet = (skills ?? []).map { $0.lowercased() }

        let combined = field + " " + skillSet.joined(separator: " ")

        if combined.contains("economics") || combined.contains("finance") || combined.contains("business") {
            affinities.append(contentsOf: ["role_economy", "role_trade"])
        }
        if combined.contains("law") || combined.contains("legal") || combined.contains("justice") {
            affinities.append(contentsOf: ["role_justice", "role_intelligence"])
        }
        if combined.contains("medicine") || combined.contains("health") || combined.contains("medical") {
            affinities.append("role_health")
        }
        if combined.contains("engineering") || combined.contains("infrastructure") || combined.contains("technology") {
            affinities.append(contentsOf: ["role_infrastructure", "role_science"])
        }
        if combined.contains("military") || combined.contains("defense") || combined.contains("security") {
            affinities.append("role_defense")
        }
        if combined.contains("public policy") || combined.contains("administration") || combined.contains("social") {
            affinities.append(contentsOf: ["role_interior", "role_labor"])
        }
        if combined.contains("international") || combined.contains("diplomacy") || combined.contains("foreign") {
            affinities.append("role_diplomacy")
        }
        if combined.contains("environment") || combined.contains("ecology") || combined.contains("climate") {
            affinities.append("role_environment")
        }
        if combined.contains("science") || combined.contains("research") || combined.contains("physics") {
            affinities.append("role_science")
        }

        return Array(Set(affinities))
    }

    private static func computeRoleAffinity(stats: PlayerStats) -> [String] {
        let ranked: [(String, Double)] = [
            ("defense",   stats.military),
            ("diplomacy", stats.diplomacy),
            ("economy",   stats.economics),
            ("executive", stats.management),
            ("social",    stats.compassion),
            ("justice",   stats.integrity),
        ]
        return ranked.sorted { $0.1 > $1.1 }.prefix(3).map { $0.0 }
    }

    /// Generate the player's initial profile using Firebase AppConfig.
    static func generatePlayerProfile(countryId: String? = nil, config: AppConfig?, partyNames: [String]? = nil) -> PlayerProfile {
        let rng = RNG(seed: Int(Date().timeIntervalSince1970))
        var stats = PlayerStats(
            diplomacy: rng.float(30, 80), economics: rng.float(30, 80),
            military: rng.float(30, 80), management: rng.float(30, 80),
            compassion: rng.float(30, 80), integrity: rng.float(30, 80),
            charisma: nil, competency: nil, ideology: nil, corruption: nil
        )
        if let spikeStat = rng.pick(["diplomacy", "economics", "military", "management", "compassion", "integrity"]) {
            stats = boostedStats(stats: stats, key: spikeStat, boost: rng.float(75, 95) - 50)
        }

        let traitPool = config?.traitPool ?? []
        let traits = rng.pickMultiple(traitPool, 2)
        let parties = partyNames?.isEmpty == false ? partyNames! : (config?.parties(for: countryId) ?? ["Independent"])
        let backgrounds = config?.backgrounds(for: nil) ?? ["Career Politician", "Business Tycoon"]
        let background = rng.pick(backgrounds) ?? "Career Politician"
        let approaches = config?.governmentalApproaches ?? ["Pragmatist", "Idealist"]
        let sw = generateStrengthsWeaknesses(stats: stats, traits: traits, background: background)

        return PlayerProfile(
            name: pickNameForRegion(rng, region: nil, config: config, gender: .male),
            party: rng.pick(parties) ?? "Independent",
            approach: rng.pick(approaches) ?? "Pragmatist",
            stats: stats, traits: traits, background: background,
            strengths: sw.strengths, weaknesses: sw.weaknesses
        )
    }

    /// Pick a random name for a region using AppConfig.
    public static func pickName(region: String?, gender: PersonGender = .male, config: AppConfig?) -> String {
        let rng = RNG(seed: nil)
        return pickNameForRegion(rng, region: region, config: config, gender: gender)
    }

    // MARK: - Helpers

    private static func seedFromString(_ str: String) -> Int {
        var hash = 0
        for scalar in str.unicodeScalars {
            hash = ((hash << 5) - hash) + Int(scalar.value)
        }
        return abs(hash)
    }

    private static func boostedStats(stats: PlayerStats, key: String, boost: Double) -> PlayerStats {
        func clamp(_ v: Double) -> Double { min(99, max(0, v)) }
        let d = stats.diplomacy, ec = stats.economics, mi = stats.military
        let ma = stats.management, co = stats.compassion, i = stats.integrity
        let ch = stats.charisma, comp = stats.competency, id = stats.ideology, cr = stats.corruption
        switch key {
        case "diplomacy":  return PlayerStats(diplomacy: clamp(d+boost), economics: ec, military: mi, management: ma, compassion: co, integrity: i, charisma: ch, competency: comp, ideology: id, corruption: cr)
        case "economics":  return PlayerStats(diplomacy: d, economics: clamp(ec+boost), military: mi, management: ma, compassion: co, integrity: i, charisma: ch, competency: comp, ideology: id, corruption: cr)
        case "military":   return PlayerStats(diplomacy: d, economics: ec, military: clamp(mi+boost), management: ma, compassion: co, integrity: i, charisma: ch, competency: comp, ideology: id, corruption: cr)
        case "management": return PlayerStats(diplomacy: d, economics: ec, military: mi, management: clamp(ma+boost), compassion: co, integrity: i, charisma: ch, competency: comp, ideology: id, corruption: cr)
        case "compassion": return PlayerStats(diplomacy: d, economics: ec, military: mi, management: ma, compassion: clamp(co+boost), integrity: i, charisma: ch, competency: comp, ideology: id, corruption: cr)
        case "integrity":  return PlayerStats(diplomacy: d, economics: ec, military: mi, management: ma, compassion: co, integrity: clamp(i+boost), charisma: ch, competency: comp, ideology: id, corruption: cr)
        default: return stats
        }
    }
}
