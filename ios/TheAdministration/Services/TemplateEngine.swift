import Foundation

/// Template Engine for iOS
/// Swift port of web/src/lib/services/template-engine.ts
/// Provides token replacement and scenario text resolution with support for
/// template variants and severity-based text generation.
class TemplateEngine {
    static let shared = TemplateEngine()

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
            phase: scenario.phase,
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
            storagePath: scenario.storagePath
        )

        return resolved
    }

    /// Resolve tokens in a single option
    func resolveOption(_ option: Option, with context: [String: String]) -> Option {
        // Handle both array and string formats for advisorFeedback
        let resolvedAdvisorFeedback: [AdvisorFeedback]?
        let resolvedAdvisorFeedbackString: String?
        
        if let feedbackArray = option.advisorFeedback {
            resolvedAdvisorFeedback = feedbackArray.map { feedback in
                AdvisorFeedback(
                    roleId: feedback.roleId,
                    stance: feedback.stance,
                    feedback: resolveTokens(in: feedback.feedback, with: context)
                )
            }
            resolvedAdvisorFeedbackString = nil
        } else if let feedbackString = option.advisorFeedbackString {
            resolvedAdvisorFeedback = nil
            resolvedAdvisorFeedbackString = resolveTokens(in: feedbackString, with: context)
        } else {
            resolvedAdvisorFeedback = nil
            resolvedAdvisorFeedbackString = nil
        }
        
        return Option(
            id: option.id,
            text: resolveTokens(in: option.text, with: context),
            label: option.label,
            advisorFeedback: resolvedAdvisorFeedback,
            advisorFeedbackString: resolvedAdvisorFeedbackString,
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
        context["leader"] = country.leader ?? "the Leader"

        if let leaderTitle = country.leaderTitle {
            context["leader_title"] = leaderTitle
        }

        // Merge scenario data
        context.merge(scenarioData) { _, new in new }

        return context
    }

    /// Set countries list for context creation
    func setCountries(_ countries: [Country]) {
        self.countries = countries
    }

    // MARK: - Token Replacement

    /// Replace all tokens in text with values from context
    /// Supports both {token} and {{token}} formats
    /// Validates token casing and logs warnings for incorrect casing
    func resolveTokens(in text: String, with context: [String: String]) -> String {
        var result = text

        // Pattern matches both {token} and {{token}}
        let pattern = #"\{\{?([a-zA-Z_]+)\}?\}"#

        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            print("⚠️ [TemplateEngine] Failed to create regex pattern")
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
                print("⚠️ [TemplateEngine] Token casing error: {\(tokenName)} should be {\(tokenLower)}")
            }

            // Try both the original case and lowercase version
            if let value = context[tokenName] ?? context[tokenLower] {
                result.replaceSubrange(fullRange, with: value)
            } else {
                #if DEBUG
                print("⚠️ [TemplateEngine] Unresolved token: {\(tokenName)}")
                #endif
                // Leave token unchanged in text for debugging
            }
        }

        return result
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
}

// Scenario and Option canonical inits are defined in Models.swift
