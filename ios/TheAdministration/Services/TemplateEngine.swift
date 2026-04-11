import Foundation

/// Template Engine for iOS
/// Swift port of web/src/lib/services/template-engine.ts
/// Provides token replacement and scenario text resolution with support for
/// template variants and severity-based text generation.
class TemplateEngine {
    static let shared = TemplateEngine()

    private static let placeholderPattern = #"\{+([a-zA-Z_]+)\}+"#
    private static let unresolvedPlaceholderPattern = #"\{+[a-zA-Z_]+\}+"#
    private static let optionalBranchTokens: Set<String> = [
        "marine_branch", "space_branch", "paramilitary_branch",
        "coast_guard_branch", "intel_branch", "cyber_branch",
        "sovereign_fund", "special_forces", "strategic_nuclear_branch",
    ]

    private var countries: [Country] = []

    private init() {}

    // MARK: - Public API

    /// Resolve all tokens in a scenario using country and game state context
    func resolveScenario(
        _ scenario: Scenario,
        country: Country,
        gameState: GameState
    ) -> Scenario {
        let context = buildContext(
            country: country,
            scenario: scenario,
            gameState: gameState
        )

        var resolved = scenario

        // Resolve title
        resolved = Scenario(
            id: scenario.id,
            title: resolveTokens(in: scenario.title, with: context),
            description: resolveTokens(in: scenario.description, with: context),
            conditions: scenario.conditions,
            relationshipConditions: scenario.relationshipConditions,
            phase: scenario.phase,
            actIndex: scenario.actIndex,
            severity: scenario.severity,
            chainId: scenario.chainId,
            options: scenario.options.map { resolveOption($0, with: context) },
            chainsTo: scenario.chainsTo,
            actor: scenario.actor,
            location: scenario.location,
            tags: scenario.tags,
            cooldown: scenario.cooldown,
            classification: scenario.classification,
            behavior: scenario.behavior,
            weight: scenario.weight,
            tier: scenario.tier,
            category: scenario.category,
            triggerConditions: scenario.triggerConditions,
            oncePerGame: scenario.oncePerGame,
            titleTemplate: scenario.titleTemplate,
            descriptionTemplate: scenario.descriptionTemplate,
            tokenMap: scenario.tokenMap,
            storagePath: scenario.storagePath,
            metadata: scenario.metadata,
            legislatureRequirement: scenario.legislatureRequirement,
            dynamicProfile: scenario.dynamicProfile
        )

        return resolved
    }

    /// Resolve tokens in a single option
    func resolveOption(_ option: Option, with context: [String: String]) -> Option {
        let resolvedAdvisorFeedback: [AdvisorFeedback]? = option.advisorFeedback.map { feedbackArray in
            feedbackArray.map { feedback in
                AdvisorFeedback(
                    roleId: feedback.roleId,
                    stance: feedback.stance,
                    feedback: resolveTokens(in: feedback.feedback, with: context)
                )
            }
        }
        
        return Option(
            id: option.id,
            text: resolveTokens(in: option.text, with: context),
            label: option.label,
            advisorFeedback: resolvedAdvisorFeedback,
            effects: option.effects,
            effectsMap: option.effectsMap,
            nextScenarioId: option.nextScenarioId,
            impactText: option.impactText,
            impactMap: option.impactMap,
            relationshipImpact: option.relationshipImpact,
            relationshipEffects: option.relationshipEffects,
            populationImpact: option.populationImpact,
            economicImpact: option.economicImpact,
            humanCost: option.humanCost,
            actor: option.actor,
            location: option.location,
            severity: option.severity,
            tags: option.tags,
            cooldown: option.cooldown,
            oncePerGame: option.oncePerGame,
            outcome: option.outcome.map { resolveTokens(in: $0, with: context) },
            outcomeHeadline: option.outcomeHeadline.map { resolveTokens(in: $0, with: context) },
            outcomeSummary: option.outcomeSummary.map { resolveTokens(in: $0, with: context) },
            outcomeContext: option.outcomeContext.map { resolveTokens(in: $0, with: context) },
            isAuthoritarian: option.isAuthoritarian,
            moralWeight: option.moralWeight,
            consequenceScenarioIds: option.consequenceScenarioIds,
            consequenceDelay: option.consequenceDelay
        )
    }

    /// Build token context from country data and scenario token_map
    func buildContext(
        country: Country,
        scenario: Scenario,
        gameState: GameState
    ) -> [String: String] {
        var context: [String: String] = [:]

        // Type A: Global country tokens
        if let tokens = country.tokens {
            context.merge(tokens) { _, new in new }
        }

        // Add computed tokens
        context["country"] = country.name
        context["player_country"] = country.name
        context["the_player_country"] = country.nameWithDefiniteArticle
        context["leader"] = country.leader ?? "the Leader"

        if let leaderTitle = country.leaderTitle {
            context["leader_title"] = leaderTitle
        }

        if let player = gameState.player {
            context["player_name"] = player.name
        }

        // Type B: Scenario-specific tokens (with nested resolution)
        if let tokenMap = scenario.tokenMap {
            for (key, value) in tokenMap {
                context[key] = resolveNestedToken(value, in: context)
            }
        }

        // Ensure neighbor tokens provide both bare and definite forms
        if let neighborName = context["neighbor"], !neighborName.isEmpty {
            if context["the_neighbor"] == nil || context["the_neighbor"]?.isEmpty == true {
                if let neighborCountry = countries.first(where: { $0.name.lowercased() == neighborName.lowercased() }) {
                    context["the_neighbor"] = neighborCountry.nameWithDefiniteArticle
                } else if let article = Country.defaultDefiniteArticle(for: neighborName) {
                    context["the_neighbor"] = "\(article) \(neighborName)"
                } else {
                    context["the_neighbor"] = neighborName
                }
            }
        }

        // Resolve party tokens from countryParties — prefer player's party as ruling over static isRuling flag
        let playerPartyName = gameState.player?.party
        let rulingParty = playerPartyName.flatMap { name in
            gameState.countryParties.first(where: { $0.name == name || $0.shortName == name })
        } ?? gameState.countryParties.first(where: { $0.isRuling })
        let coalitionParty = gameState.countryParties.first(where: { $0.isCoalitionMember && $0.id != rulingParty?.id })
        let oppositionParty =
            gameState.countryParties.first(where: { ($0.isMainOpposition == true) && $0.id != rulingParty?.id }) ??
            gameState.countryParties.first(where: { $0.id != rulingParty?.id && $0.id != coalitionParty?.id })

        if let ruling = rulingParty {
            context["governing_party"] = ruling.name
            context["governing_party_leader"] = ruling.currentLeader
                ?? CandidateGenerator.generateLeaderName(forRegion: country.region, config: FirebaseDataService.shared.config)
            context["governing_party_ideology"] = ruling.ideologyLabel
            if let short = ruling.shortName {
                context["governing_party_short"] = short
            }
        }
        if let coalition = coalitionParty {
            context["coalition_party"] = coalition.name
        }
        if let opposition = oppositionParty {
            context["opposition_party"] = opposition.name
            let leaderName = opposition.currentLeader
                ?? CandidateGenerator.generateLeaderName(forRegion: country.region, config: FirebaseDataService.shared.config)
            context["opposition_party_leader"] = leaderName
            context["opposition_leader"] = leaderName
        }

        // Resolve locale tokens if an active locale is set
        if let locale = gameState.activeLocale {
            context["locale_name"] = locale.localeTokens.localeName
            context["locale_type"] = locale.localeTokens.localeType
            context["region_type"] = locale.localeTokens.regionType
            context["terrain"] = locale.localeTokens.terrain
            context["city_name"] = locale.name
            context["state_name"] = locale.name
        }

        // Derive relationship tokens from geopoliticalProfile when not already set via country.tokens
        if let geo = country.geopoliticalProfile {
            func isMissing(_ key: String) -> Bool {
                guard let value = context[key] else { return true }
                return value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }

            func strongestHostileRelationship(_ relationships: [CountryRelationship]) -> CountryRelationship? {
                relationships.max { lhs, rhs in
                    abs(lhs.strength) < abs(rhs.strength)
                }
            }

            func resolveRelationship(_ rel: CountryRelationship) -> (bare: String, definite: String)? {
                guard let relCountry = self.countries.first(where: { $0.id == rel.countryId }) else { return nil }
                return (relCountry.name, relCountry.nameWithDefiniteArticle)
            }

            // Pre-seed relationship tokens from chain bindings for multi-act consistency.
            // Slots filled here will be skipped by the dynamic resolution below (isMissing guard).
            if let chainId = scenario.chainId,
               let bindings = gameState.chainTokenBindings?[chainId] {
                for (role, countryId) in bindings {
                    if let boundCountry = self.countries.first(where: { $0.id == countryId }) {
                        if context[role] == nil { context[role] = boundCountry.name }
                        if context["the_\(role)"] == nil { context["the_\(role)"] = boundCountry.nameWithDefiniteArticle }
                    }
                }
            }

            // adversary / the_adversary
            if let top = strongestHostileRelationship(geo.adversaries),
               let names = resolveRelationship(top) {
                if isMissing("adversary") { context["adversary"] = names.bare }
                if isMissing("the_adversary") { context["the_adversary"] = names.definite }
            }

            // ally / the_ally — formal allies sorted by strength
            if let top = geo.allies.filter({ $0.type == "formal_ally" })
                .sorted(by: { $0.strength > $1.strength }).first,
               let names = resolveRelationship(top) {
                if isMissing("ally") { context["ally"] = names.bare }
                if isMissing("the_ally") { context["the_ally"] = names.definite }
            }

            // trade_partner / the_trade_partner + partner / the_partner — strategic partners
            if let top = geo.allies.filter({ $0.type == "strategic_partner" })
                .sorted(by: { $0.strength > $1.strength }).first,
               let names = resolveRelationship(top) {
                if isMissing("trade_partner") { context["trade_partner"] = names.bare }
                if isMissing("the_trade_partner") { context["the_trade_partner"] = names.definite }
                if isMissing("partner") { context["partner"] = names.bare }
                if isMissing("the_partner") { context["the_partner"] = names.definite }
            }

            // rival / the_rival — adversaries typed "rival", fallback to neighbor typed "rival"
            let rivalFromAdversaries = strongestHostileRelationship(geo.adversaries.filter({ $0.type == "rival" }))
            let rivalFromNeighbors = strongestHostileRelationship(geo.neighbors.filter({ $0.type == "rival" }))
            if let top = rivalFromAdversaries ?? rivalFromNeighbors,
               let names = resolveRelationship(top) {
                if isMissing("rival") { context["rival"] = names.bare }
                if isMissing("the_rival") { context["the_rival"] = names.definite }
            }

            // border_rival / the_border_rival — neighbors typed "rival"
            if let top = strongestHostileRelationship(geo.neighbors.filter({ $0.type == "rival" })),
               let names = resolveRelationship(top) {
                if isMissing("border_rival") { context["border_rival"] = names.bare }
                if isMissing("the_border_rival") { context["the_border_rival"] = names.definite }
            }

            // regional_rival / the_regional_rival — adversaries typed "rival"
            if let top = strongestHostileRelationship(geo.adversaries.filter({ $0.type == "rival" })),
               let names = resolveRelationship(top) {
                if isMissing("regional_rival") { context["regional_rival"] = names.bare }
                if isMissing("the_regional_rival") { context["the_regional_rival"] = names.definite }
            }

            // neutral / the_neutral — allies or neighbors typed "neutral"
            let neutralFromAllies = geo.allies.filter({ $0.type == "neutral" })
                .sorted(by: { $0.strength > $1.strength }).first
            let neutralFromNeighbors = geo.neighbors.filter({ $0.type == "neutral" })
                .sorted(by: { $0.strength > $1.strength }).first
            if let top = neutralFromAllies ?? neutralFromNeighbors,
               let names = resolveRelationship(top) {
                if context["neutral"] == nil { context["neutral"] = names.bare }
                if context["the_neutral"] == nil { context["the_neutral"] = names.definite }
            }

            // nation / the_nation — generic fallback, use first neighbor
            if let top = geo.neighbors.first,
               let names = resolveRelationship(top) {
                if context["nation"] == nil { context["nation"] = names.bare }
                if context["the_nation"] == nil { context["the_nation"] = names.definite }
            }
        }

        // Derive the_* article forms for role/institution/party tokens that don't already have a value.
        // Geo-relationship article forms (the_adversary, the_ally, etc.) are handled above.
        let articleFormPairs: [(bare: String, article: String)] = [
            ("leader_title", "the_leader_title"),
            ("vice_leader", "the_vice_leader"),
            ("finance_role", "the_finance_role"),
            ("defense_role", "the_defense_role"),
            ("interior_role", "the_interior_role"),
            ("foreign_affairs_role", "the_foreign_affairs_role"),
            ("justice_role", "the_justice_role"),
            ("health_role", "the_health_role"),
            ("education_role", "the_education_role"),
            ("commerce_role", "the_commerce_role"),
            ("labor_role", "the_labor_role"),
            ("energy_role", "the_energy_role"),
            ("environment_role", "the_environment_role"),
            ("transport_role", "the_transport_role"),
            ("agriculture_role", "the_agriculture_role"),
            ("prosecutor_role", "the_prosecutor_role"),
            ("governing_party", "the_governing_party"),
            ("opposition_party", "the_opposition_party"),
            ("opposition_leader", "the_opposition_leader"),
            ("intelligence_agency", "the_intelligence_agency"),
            ("domestic_intelligence", "the_domestic_intelligence"),
            ("security_council", "the_security_council"),
            ("police_force", "the_police_force"),
            ("central_bank", "the_central_bank"),
            ("legislature", "the_legislature"),
            ("upper_house", "the_upper_house"),
            ("lower_house", "the_lower_house"),
            ("judicial_role", "the_judicial_role"),
            ("state_media", "the_state_media"),
            ("press_role", "the_press_role"),
            ("armed_forces_name", "the_armed_forces_name"),
            ("military_chief_title", "the_military_chief_title"),
            ("capital_mayor", "the_capital_mayor"),
            ("regional_governor", "the_regional_governor"),
            ("major_industry", "the_major_industry"),
            ("regional_bloc", "the_regional_bloc"),
            ("ground_forces_branch", "the_ground_forces_branch"),
            ("maritime_branch", "the_maritime_branch"),
            ("air_branch", "the_air_branch"),
            ("cyber_branch", "the_cyber_branch"),
            ("strategic_nuclear_branch", "the_strategic_nuclear_branch"),
            ("coalition_name", "the_coalition_name"),
        ]
        for (bare, article) in articleFormPairs {
            guard let value = context[bare], !value.isEmpty else { continue }
            if context[article] == nil || context[article]?.isEmpty == true {
                context[article] = "the \(value)"
            }
        }

        return context
    }

    /// Create context from country ID (for templates)
    func createContext(
        countryId: String,
        scenarioData: [String: String] = [:]
    ) -> [String: String] {
        guard let country = countries.first(where: { $0.id == countryId }) else {
            return scenarioData
        }

        var context: [String: String] = [:]

        // Country tokens
        if let tokens = country.tokens {
            context.merge(tokens) { _, new in new }
        }

        // Computed tokens
        context["country"] = country.name
        context["player_country"] = country.name
        context["the_player_country"] = country.nameWithDefiniteArticle
        context["leader"] = country.leader ?? "the Leader"

        if let leaderTitle = country.leaderTitle {
            context["leader_title"] = leaderTitle
        }

        // Merge scenario data
        context.merge(scenarioData) { _, new in new }

        // Derive the_* article forms for role/institution/party tokens that don't already have a value.
        // Geo-relationship article forms (the_adversary, the_ally, etc.) are handled above.
        let articleFormPairs: [(bare: String, article: String)] = [
            ("leader_title", "the_leader_title"),
            ("vice_leader", "the_vice_leader"),
            ("finance_role", "the_finance_role"),
            ("defense_role", "the_defense_role"),
            ("interior_role", "the_interior_role"),
            ("foreign_affairs_role", "the_foreign_affairs_role"),
            ("justice_role", "the_justice_role"),
            ("health_role", "the_health_role"),
            ("education_role", "the_education_role"),
            ("commerce_role", "the_commerce_role"),
            ("labor_role", "the_labor_role"),
            ("energy_role", "the_energy_role"),
            ("environment_role", "the_environment_role"),
            ("transport_role", "the_transport_role"),
            ("agriculture_role", "the_agriculture_role"),
            ("prosecutor_role", "the_prosecutor_role"),
            ("governing_party", "the_governing_party"),
            ("opposition_party", "the_opposition_party"),
            ("opposition_leader", "the_opposition_leader"),
            ("intelligence_agency", "the_intelligence_agency"),
            ("domestic_intelligence", "the_domestic_intelligence"),
            ("security_council", "the_security_council"),
            ("police_force", "the_police_force"),
            ("central_bank", "the_central_bank"),
            ("legislature", "the_legislature"),
            ("upper_house", "the_upper_house"),
            ("lower_house", "the_lower_house"),
            ("judicial_role", "the_judicial_role"),
            ("state_media", "the_state_media"),
            ("press_role", "the_press_role"),
            ("armed_forces_name", "the_armed_forces_name"),
            ("military_chief_title", "the_military_chief_title"),
            ("capital_mayor", "the_capital_mayor"),
            ("regional_governor", "the_regional_governor"),
            ("major_industry", "the_major_industry"),
            ("regional_bloc", "the_regional_bloc"),
            ("ground_forces_branch", "the_ground_forces_branch"),
            ("maritime_branch", "the_maritime_branch"),
            ("air_branch", "the_air_branch"),
            ("cyber_branch", "the_cyber_branch"),
            ("strategic_nuclear_branch", "the_strategic_nuclear_branch"),
            ("coalition_name", "the_coalition_name"),
        ]
        for (bare, article) in articleFormPairs {
            guard let value = context[bare], !value.isEmpty else { continue }
            if context[article] == nil || context[article]?.isEmpty == true {
                context[article] = "the \(value)"
            }
        }

        return context
    }

    /// Set countries list for context creation
    func setCountries(_ countries: [Country]) {
        self.countries = countries
    }

    private static let fallbackTokenValues: [String: String] = [
        "the_player_country": "the country",
        "player_country": "the country",
        "country": "the country",
        "the_adversary": "the opposing state",
        "adversary": "an opposing state",
        "the_ally": "the allied state",
        "ally": "an allied state",
        "the_neighbor": "the neighboring state",
        "neighbor": "a neighboring state",
        "the_border_rival": "the border rival",
        "border_rival": "a border rival",
        "the_regional_rival": "the regional rival",
        "regional_rival": "a regional rival",
        "the_rival": "the rival state",
        "rival": "a rival state",
        "the_trade_partner": "the trade partner",
        "trade_partner": "a trade partner",
        "the_partner": "the partner state",
        "partner": "a partner state",
        "the_nation": "the nation",
        "nation": "a nation",
        "leader_title": "national leader",
        "the_leader_title": "the national leader",
        "legislature": "legislature",
        "the_legislature": "the legislature",
        "governing_party": "governing party",
        "the_governing_party": "the governing party"
    ]

    private func titleCaseToken(_ token: String) -> String {
        token
            .split(separator: "_")
            .map { $0.capitalized }
            .joined(separator: " ")
    }

    private func fallbackValue(for tokenLower: String, context: [String: String]) -> String {
        if let exact = TemplateEngine.fallbackTokenValues[tokenLower] {
            return exact
        }

        if tokenLower.hasPrefix("the_") {
            let bare = String(tokenLower.dropFirst(4))
            if let fromContext = context[bare], !fromContext.isEmpty {
                return "the \(fromContext)"
            }
            if let exactBare = TemplateEngine.fallbackTokenValues[bare] {
                return exactBare.hasPrefix("the ") ? exactBare : "the \(exactBare)"
            }
            if bare.hasSuffix("_role") {
                return "the \(titleCaseToken(bare.replacingOccurrences(of: "_role", with: ""))) Minister"
            }
            return "the \(titleCaseToken(bare).lowercased())"
        }

        if tokenLower.hasSuffix("_role") {
            return "\(titleCaseToken(tokenLower.replacingOccurrences(of: "_role", with: ""))) Minister"
        }

        return titleCaseToken(tokenLower).lowercased()
    }

    // MARK: - Token Replacement

    /// Replace all tokens in text with values from context
    /// Supports both {token} and {{token}} formats
    /// Validates token casing and logs warnings for incorrect casing
    func resolveTokens(in text: String, with context: [String: String]) -> String {
        // Lowercase the first word after each token closing brace so that verbs/adjectives
        // stored as capitalized in templates (per drafter convention) don't produce
        // spurious mid-sentence capitals after multi-word token substitution.
        var result = lowercaseAfterTokenBoundaries(in: text)

        // Pattern matches both {token} and {{token}}
        let pattern = TemplateEngine.placeholderPattern

        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            AppLogger.warning("[TemplateEngine] Failed to create regex pattern")
            return text
        }

        let range = NSRange(text.startIndex..., in: text)
        let matches = regex.matches(in: text, options: [], range: range).reversed()

        for match in matches {
            guard match.numberOfRanges >= 2,
                  let tokenRange = Range(match.range(at: 1), in: text),
                  let fullRange = Range(match.range(at: 0), in: text) else {
                continue
            }

            let tokenName = String(text[tokenRange])
            let tokenLower = tokenName.lowercased()
            
            // Validate token casing - should be all lowercase with underscores
            if tokenName != tokenLower {
                AppLogger.warning("[TemplateEngine] Token casing error: {\(tokenName)} should be {\(tokenLower)}")
            }

            // Try both the original case and lowercase version
            if let value = context[tokenName] ?? context[tokenLower] {
                result.replaceSubrange(fullRange, with: value)
            } else if TemplateEngine.optionalBranchTokens.contains(tokenLower) {
                result.replaceSubrange(fullRange, with: "")
            } else {
                let fallback = fallbackValue(for: tokenLower, context: context)
                result.replaceSubrange(fullRange, with: fallback)
                #if DEBUG
                AppLogger.warning("[TemplateEngine] Unresolved token: {\(tokenName)}")
                #endif
            }
        }

        // Resolve any remaining placeholders that slipped through with the same fallback strategy.
        let unresolvedPattern = #"\{\{?[a-zA-Z_]+\}?\}"#
        if let unresolvedRegex = try? NSRegularExpression(pattern: unresolvedPattern, options: []) {
            var unresolvedRange = NSRange(result.startIndex..., in: result)
            let unresolvedMatches = unresolvedRegex.matches(in: result, options: [], range: unresolvedRange).reversed()

            if !unresolvedMatches.isEmpty {
                #if DEBUG
                let unresolvedTokens = unresolvedMatches.compactMap { match -> String? in
                    guard let range = Range(match.range(at: 0), in: result) else { return nil }
                    return String(result[range])
                }
                AppLogger.warning("[TemplateEngine] Unresolved tokens after resolution: \(unresolvedTokens.joined(separator: ", "))")
                #endif

                for match in unresolvedMatches {
                    guard let fullRange = Range(match.range(at: 0), in: result) else { continue }
                    let raw = String(result[fullRange])
                    let token = raw
                        .replacingOccurrences(of: "{{", with: "")
                        .replacingOccurrences(of: "}}", with: "")
                        .replacingOccurrences(of: "{", with: "")
                        .replacingOccurrences(of: "}", with: "")
                        .lowercased()
                    let fallback = fallbackValue(for: token, context: context)
                    result.replaceSubrange(fullRange, with: fallback)
                }
                unresolvedRange = NSRange(result.startIndex..., in: result)
                result = unresolvedRegex.stringByReplacingMatches(in: result, options: [], range: unresolvedRange, withTemplate: "")
            }
        }

        result = normalizeHardcodedInstitutionPhrases(in: result, context: context)
        result = insertMissingDirectObject(in: result)
        result = normalizePresentationText(in: result)
        return result
    }

    private func normalizePresentationText(in text: String) -> String {
        var result = text
        result = collapseWhitespaceAndPunctuation(in: result)
        result = collapseAdjacentRepeatedPhrases(in: result)
        result = collapseAdjacentRepeatedWords(in: result)
        result = collapseRepeatedSentences(in: result)
        result = collapseWhitespaceAndPunctuation(in: result)
        result = capitalizeFirstNarrativeLetter(in: result)
        result = capitalizeSentenceBoundaries(in: result)
        return result
    }

    private func collapseWhitespaceAndPunctuation(in text: String) -> String {
        var result = text.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        result = result.replacingOccurrences(of: ". .", with: ".")
        result = result.replacingOccurrences(of: #"(?<!\.)\.{2}(?!\.)"#, with: ".", options: .regularExpression)
        result = result.replacingOccurrences(of: ", ,", with: ",")
        result = result.replacingOccurrences(of: #"\s+([.!?,;:])"#, with: "$1", options: .regularExpression)
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func collapseAdjacentRepeatedWords(in text: String) -> String {
        var result = text
        while true {
            let next = result.replacingOccurrences(
                of: #"\b([A-Za-z][A-Za-z'’-]{1,})\s+\1\b"#,
                with: "$1",
                options: [.regularExpression, .caseInsensitive]
            )
            if next == result { return next }
            result = next
        }
    }

    private func collapseAdjacentRepeatedPhrases(in text: String) -> String {
        var result = text
        while true {
            var changed = false
            for wordCount in stride(from: 5, through: 2, by: -1) {
                let pattern = #"\b((?:[A-Za-z][A-Za-z'’-]*\s+){WORD_COUNT}[A-Za-z][A-Za-z'’-]*)\s+\1\b"#
                    .replacingOccurrences(of: "WORD_COUNT", with: String(wordCount - 1))
                let next = result.replacingOccurrences(
                    of: pattern,
                    with: "$1",
                    options: [.regularExpression, .caseInsensitive]
                )
                if next != result {
                    result = next
                    changed = true
                }
            }
            if !changed { return result }
        }
    }

    private func collapseRepeatedSentences(in text: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: #"[^.!?]+[.!?]*"#) else {
            return text
        }

        let range = NSRange(text.startIndex..., in: text)
        let segments = regex.matches(in: text, options: [], range: range).compactMap { match -> String? in
            guard let range = Range(match.range, in: text) else { return nil }
            return String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
        }

        guard !segments.isEmpty else { return text }

        func normalized(_ segment: String) -> String {
            segment
                .lowercased()
                .replacingOccurrences(of: #"\{([a-zA-Z_]+)\}"#, with: "{$1}", options: .regularExpression)
                .replacingOccurrences(of: #"[^a-z0-9{}]+"#, with: " ", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)
        }

        var deduped: [String] = []
        var previous = ""
        for segment in segments {
            let compact = normalized(segment)
            guard !compact.isEmpty else { continue }
            if compact == previous { continue }
            deduped.append(segment)
            previous = compact
        }

        return deduped.joined(separator: " ")
    }

    private func capitalizeFirstNarrativeLetter(in text: String) -> String {
        var result = text
        var inToken = false
        var seenToken = false
        var previousBoundary = true

        for index in result.indices {
            let character = result[index]
            if character == "{" {
                inToken = true
                continue
            }
            if character == "}" {
                inToken = false
                seenToken = true
                continue
            }
            if inToken { continue }
            if seenToken { return result }
            if character.isWhitespace {
                previousBoundary = true
                continue
            }
            if character.isLetter {
                if previousBoundary, character.isLowercase {
                    result.replaceSubrange(index...index, with: String(character).uppercased())
                }
                return result
            }
            previousBoundary = false
        }

        return result
    }

    private func capitalizeSentenceBoundaries(in text: String) -> String {
        var characters = Array(text)
        var inToken = false
        var capitalizeNext = false
        var tokenClosedWhilePending = false

        for index in characters.indices {
            let character = characters[index]

            if character == "{" {
                inToken = true
                continue
            }
            if character == "}" {
                inToken = false
                if capitalizeNext {
                    tokenClosedWhilePending = true
                }
                continue
            }
            if inToken { continue }

            if capitalizeNext {
                if character.isLetter {
                    if !tokenClosedWhilePending, character.isLowercase {
                        let uppercased = Array(String(character).uppercased())
                        if let first = uppercased.first {
                            characters[index] = first
                        }
                    }
                    capitalizeNext = false
                    tokenClosedWhilePending = false
                    continue
                }
                if character.isWhitespace || character == "\"" || character == "(" || character == "[" {
                    continue
                }
                if tokenClosedWhilePending && character == "'" {
                    capitalizeNext = false
                    tokenClosedWhilePending = false
                    continue
                }
                if character == ")" || character == "}" || character == "]" || character == "”" {
                    continue
                }
                capitalizeNext = false
                tokenClosedWhilePending = false
            }

            if character == "." || character == "!" || character == "?" {
                capitalizeNext = true
                tokenClosedWhilePending = false
            }
        }

        return String(characters)
    }

    private func lowercaseAfterTokenBoundaries(in text: String) -> String {
        var chars = Array(text)
        var i = 0
        while i < chars.count {
            guard chars[i] == "}" else { i += 1; continue }
            var j = i + 1
            while j < chars.count && chars[j] == "}" { j += 1 }
            while j < chars.count && chars[j].isWhitespace { j += 1 }
            if j < chars.count && chars[j].isUppercase {
                let lowered = String(chars[j]).lowercased()
                if let first = lowered.first { chars[j] = first }
            }
            i = j + 1
        }
        return String(chars)
    }

    private func normalizeHardcodedInstitutionPhrases(
        in text: String,
        context: [String: String]
    ) -> String {
        // Article-form patterns (the X) must precede bare patterns to prevent
        // partial matching of "the Justice Ministry" by the bare "justice ministry" rule.
        let phrases: [(pattern: String, tokenKey: String)] = [
            // justice
            (#"the\s+justice\s+ministry"#, "the_justice_role"),
            (#"the\s+ministry\s+of\s+justice"#, "the_justice_role"),
            (#"the\s+(?:department\s+of\s+justice|justice\s+department)"#, "the_justice_role"),
            (#"justice\s+ministry"#, "justice_role"),
            (#"ministry\s+of\s+justice"#, "justice_role"),
            (#"(?:department\s+of\s+justice|justice\s+department)"#, "justice_role"),
            // finance
            (#"the\s+finance\s+ministry"#, "the_finance_role"),
            (#"the\s+ministry\s+of\s+finance"#, "the_finance_role"),
            (#"the\s+(?:treasury\s+department|department\s+of\s+the\s+treasury)"#, "the_finance_role"),
            (#"finance\s+ministry"#, "finance_role"),
            (#"ministry\s+of\s+finance"#, "finance_role"),
            (#"(?:treasury\s+department|department\s+of\s+the\s+treasury)"#, "finance_role"),
            // defense
            (#"the\s+(?:defense|defence)\s+ministry"#, "the_defense_role"),
            (#"the\s+ministry\s+of\s+(?:defense|defence)"#, "the_defense_role"),
            (#"the\s+department\s+of\s+(?:defense|defence)"#, "the_defense_role"),
            (#"(?:defense|defence)\s+ministry"#, "defense_role"),
            (#"ministry\s+of\s+(?:defense|defence)"#, "defense_role"),
            (#"department\s+of\s+(?:defense|defence)"#, "defense_role"),
            // interior
            (#"the\s+interior\s+ministry"#, "the_interior_role"),
            (#"the\s+ministry\s+of\s+(?:interior|the\s+interior)"#, "the_interior_role"),
            (#"the\s+home\s+office"#, "the_interior_role"),
            (#"the\s+department\s+of\s+homeland\s+security"#, "the_interior_role"),
            (#"interior\s+ministry"#, "interior_role"),
            (#"ministry\s+of\s+(?:interior|the\s+interior)"#, "interior_role"),
            (#"home\s+office"#, "interior_role"),
            (#"department\s+of\s+homeland\s+security"#, "interior_role"),
            // foreign affairs
            (#"the\s+foreign\s+ministry"#, "the_foreign_affairs_role"),
            (#"the\s+ministry\s+of\s+foreign\s+affairs"#, "the_foreign_affairs_role"),
            (#"the\s+(?:state\s+department|department\s+of\s+state)"#, "the_foreign_affairs_role"),
            (#"the\s+foreign\s+office"#, "the_foreign_affairs_role"),
            (#"foreign\s+ministry"#, "foreign_affairs_role"),
            (#"ministry\s+of\s+foreign\s+affairs"#, "foreign_affairs_role"),
            (#"(?:state\s+department|department\s+of\s+state)"#, "foreign_affairs_role"),
            (#"foreign\s+office"#, "foreign_affairs_role"),
            // health
            (#"the\s+health\s+ministry"#, "the_health_role"),
            (#"the\s+ministry\s+of\s+health"#, "the_health_role"),
            (#"the\s+department\s+of\s+health"#, "the_health_role"),
            (#"health\s+ministry"#, "health_role"),
            (#"ministry\s+of\s+health"#, "health_role"),
            (#"department\s+of\s+health"#, "health_role"),
            // education
            (#"the\s+education\s+ministry"#, "the_education_role"),
            (#"the\s+ministry\s+of\s+education"#, "the_education_role"),
            (#"the\s+department\s+of\s+education"#, "the_education_role"),
            (#"education\s+ministry"#, "education_role"),
            (#"ministry\s+of\s+education"#, "education_role"),
            (#"department\s+of\s+education"#, "education_role"),
            // commerce
            (#"the\s+commerce\s+ministry"#, "the_commerce_role"),
            (#"the\s+ministry\s+of\s+commerce"#, "the_commerce_role"),
            (#"the\s+department\s+of\s+commerce"#, "the_commerce_role"),
            (#"commerce\s+ministry"#, "commerce_role"),
            (#"ministry\s+of\s+commerce"#, "commerce_role"),
            (#"department\s+of\s+commerce"#, "commerce_role"),
            // labor
            (#"the\s+labou?r\s+ministry"#, "the_labor_role"),
            (#"the\s+ministry\s+of\s+labou?r"#, "the_labor_role"),
            (#"the\s+department\s+of\s+labor"#, "the_labor_role"),
            (#"labou?r\s+ministry"#, "labor_role"),
            (#"ministry\s+of\s+labou?r"#, "labor_role"),
            (#"department\s+of\s+labor"#, "labor_role"),
            // energy
            (#"the\s+energy\s+ministry"#, "the_energy_role"),
            (#"the\s+ministry\s+of\s+energy"#, "the_energy_role"),
            (#"the\s+department\s+of\s+energy"#, "the_energy_role"),
            (#"energy\s+ministry"#, "energy_role"),
            (#"ministry\s+of\s+energy"#, "energy_role"),
            (#"department\s+of\s+energy"#, "energy_role"),
            // environment
            (#"the\s+environment\s+ministry"#, "the_environment_role"),
            (#"the\s+ministry\s+of\s+(?:environment|the\s+environment)"#, "the_environment_role"),
            (#"the\s+environmental\s+protection\s+agency"#, "the_environment_role"),
            (#"environment\s+ministry"#, "environment_role"),
            (#"ministry\s+of\s+(?:environment|the\s+environment)"#, "environment_role"),
            (#"environmental\s+protection\s+agency"#, "environment_role"),
            // transport
            (#"the\s+transport\s+ministry"#, "the_transport_role"),
            (#"the\s+ministry\s+of\s+transportation?"#, "the_transport_role"),
            (#"the\s+department\s+of\s+transportation"#, "the_transport_role"),
            (#"transport\s+ministry"#, "transport_role"),
            (#"ministry\s+of\s+transportation?"#, "transport_role"),
            (#"department\s+of\s+transportation"#, "transport_role"),
            // agriculture
            (#"the\s+agriculture\s+ministry"#, "the_agriculture_role"),
            (#"the\s+ministry\s+of\s+agriculture"#, "the_agriculture_role"),
            (#"the\s+department\s+of\s+agriculture"#, "the_agriculture_role"),
            (#"agriculture\s+ministry"#, "agriculture_role"),
            (#"ministry\s+of\s+agriculture"#, "agriculture_role"),
            (#"department\s+of\s+agriculture"#, "agriculture_role"),
        ]
        var out = text
        for (pattern, tokenKey) in phrases {
            guard let replacement = context[tokenKey], !replacement.isEmpty else { continue }
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { continue }
            let range = NSRange(out.startIndex..., in: out)
            out = regex.stringByReplacingMatches(in: out, options: [], range: range, withTemplate: replacement)
        }
        return out
    }

    private func insertMissingDirectObject(in text: String) -> String {
        // Some legacy scenarios can resolve to "You direct to ..." without a recipient.
        // If so, we insert a default recipient to form a complete sentence.
        let pattern = #"\b(you)\s+direct\s+to\b(?!\s+(?:your|the)\s+cabinet)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
            return text
        }

        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: "$1 direct your cabinet to")
    }

    /// Resolve nested token references
    /// If a token value is itself a token reference like "{other_token}",
    /// resolve it to the actual value
    private func resolveNestedToken(_ value: String, in context: [String: String]) -> String {
        // Check if value is a token reference (starts with { and ends with })
        if value.hasPrefix("{") && value.hasSuffix("}") {
            let tokenName = String(value.dropFirst().dropLast())
            if let resolvedValue = context[tokenName] {
                // Recursively resolve in case of multiple levels of nesting
                return resolveNestedToken(resolvedValue, in: context)
            }
        }
        return value
    }

    // MARK: - Template Processing (for future use with template system)

    /// Process a template with context and optional variant/severity selection
    func processTemplate(
        format: String,
        context: [String: String],
        variant: String? = nil,
        severity: SeverityLevel? = nil,
        variants: [String: String]? = nil,
        severityVariants: [String: String]? = nil
    ) -> String {
        var selectedFormat = format

        // Select variant if specified and available
        if let variant = variant, let variants = variants, let variantFormat = variants[variant] {
            selectedFormat = variantFormat
        }

        // Select severity variant if specified and available (overrides variant)
        if let severity = severity, let severityVariants = severityVariants {
            let severityKey = severity.rawValue
            if let severityFormat = severityVariants[severityKey] {
                selectedFormat = severityFormat
            }
        }

        // Apply token replacement
        return resolveTokens(in: selectedFormat, with: context)
    }

    /// Validate that all required tokens are present in context
    func validateContext(
        _ context: [String: String],
        requiredTokens: [String]
    ) -> (valid: Bool, missing: [String]) {
        let missing = requiredTokens.filter { !context.keys.contains($0) }
        return (missing.isEmpty, missing)
    }

    func missingRequiredTokens(
        for scenario: Scenario,
        country: Country,
        gameState: GameState
    ) -> [String] {
        let context = buildContext(country: country, scenario: scenario, gameState: gameState)
        return referencedTokens(in: scenario).filter { token in
            let normalizedToken = token.lowercased()
            if TemplateEngine.optionalBranchTokens.contains(normalizedToken) {
                return false
            }

            guard let value = context[token] ?? context[normalizedToken] else {
                return true
            }

            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty {
                return true
            }

            let range = NSRange(trimmed.startIndex..., in: trimmed)
            guard let regex = try? NSRegularExpression(pattern: TemplateEngine.unresolvedPlaceholderPattern, options: []) else {
                return false
            }
            return regex.firstMatch(in: trimmed, options: [], range: range) != nil
        }
    }

    func canResolveScenarioWithoutFallback(
        _ scenario: Scenario,
        country: Country,
        gameState: GameState
    ) -> Bool {
        missingRequiredTokens(for: scenario, country: country, gameState: gameState).isEmpty
    }

    /// Resolves a relationship token role to the countryId it would bind to for the given country and game state.
    /// Mirrors the token resolution logic in buildContext. Used for relationship condition gating.
    func resolveRelationshipToCountryId(
        _ relationshipId: String,
        country: Country,
        gameState: GameState
    ) -> String? {
        guard let geo = country.geopoliticalProfile else { return nil }

        func strongest(_ rels: [CountryRelationship]) -> CountryRelationship? {
            rels.max { abs($0.strength) < abs($1.strength) }
        }

        switch relationshipId {
        case "adversary":
            return strongest(geo.adversaries)?.countryId
        case "ally":
            return geo.allies.filter { $0.type == "formal_ally" }
                .sorted { $0.strength > $1.strength }.first?.countryId
        case "trade_partner", "partner":
            return geo.allies.filter { $0.type == "strategic_partner" }
                .sorted { $0.strength > $1.strength }.first?.countryId
        case "rival":
            let fromAdversaries = strongest(geo.adversaries.filter { $0.type == "rival" })
            let fromNeighbors = strongest(geo.neighbors.filter { $0.type == "rival" })
            return (fromAdversaries ?? fromNeighbors)?.countryId
        case "border_rival":
            return strongest(geo.neighbors.filter { $0.type == "rival" })?.countryId
        case "regional_rival":
            return strongest(geo.adversaries.filter { $0.type == "rival" })?.countryId
        case "neutral":
            let fromAllies = geo.allies.filter { $0.type == "neutral" }.sorted { $0.strength > $1.strength }.first
            let fromNeighbors = geo.neighbors.filter { $0.type == "neutral" }.sorted { $0.strength > $1.strength }.first
            return (fromAllies ?? fromNeighbors)?.countryId
        case "nation":
            return geo.neighbors.first?.countryId
        default:
            return nil
        }
    }

    /// Resolves all relationship token roles to their countryIds for a given scenario.
    /// Used to record chain token bindings when the first act of a chain is presented.
    func resolveChainTokenBindings(for scenario: Scenario, country: Country, gameState: GameState) -> [String: String] {
        let roles = ["adversary", "ally", "trade_partner", "rival", "border_rival", "regional_rival", "neutral", "nation"]
        var bindings: [String: String] = [:]
        for role in roles {
            if let countryId = resolveRelationshipToCountryId(role, country: country, gameState: gameState) {
                bindings[role] = countryId
            }
        }
        return bindings
    }

    private func referencedTokens(in scenario: Scenario) -> [String] {
        let fragments = scenarioTextFragments(scenario)
        guard let regex = try? NSRegularExpression(pattern: TemplateEngine.placeholderPattern, options: []) else {
            return []
        }

        var tokens = Set<String>()
        for fragment in fragments where !fragment.isEmpty {
            let range = NSRange(fragment.startIndex..., in: fragment)
            for match in regex.matches(in: fragment, options: [], range: range) {
                guard match.numberOfRanges >= 2,
                      let tokenRange = Range(match.range(at: 1), in: fragment) else {
                    continue
                }
                tokens.insert(String(fragment[tokenRange]).lowercased())
            }
        }

        return tokens.sorted()
    }

    private func scenarioTextFragments(_ scenario: Scenario) -> [String] {
        var fragments: [String] = []
        fragments.append(scenario.title)
        fragments.append(scenario.description)
        fragments.append(scenario.titleTemplate ?? "")
        fragments.append(scenario.descriptionTemplate ?? "")
        fragments.append(scenario.actor ?? "")
        fragments.append(contentsOf: locationFragments(scenario.location))

        for option in scenario.options {
            fragments.append(option.text)
            fragments.append(option.label ?? "")
            fragments.append(option.impactText ?? "")
            fragments.append(option.outcome ?? "")
            fragments.append(option.outcomeHeadline ?? "")
            fragments.append(option.outcomeSummary ?? "")
            fragments.append(option.outcomeContext ?? "")
            fragments.append(option.actor ?? "")
            fragments.append(contentsOf: locationFragments(option.location))

            if let advisorFeedback = option.advisorFeedback {
                fragments.append(contentsOf: advisorFeedback.map(\.feedback))
            }
        }

        if let tokenMap = scenario.tokenMap {
            fragments.append(contentsOf: tokenMap.values)
        }

        return fragments
    }

    private func locationFragments(_ location: ScenarioLocation?) -> [String] {
        guard let location else {
            return []
        }

        return [
            location.countryId,
            location.region,
            location.city,
            location.site,
            location.cityId,
            location.regionId,
            location.siteId,
            location.localeTemplate,
            location.cityIds?.joined(separator: " ")
        ].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
    }
}

// Scenario and Option canonical inits are defined in Models.swift
