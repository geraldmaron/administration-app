import Foundation

enum WorldEventEngine {

    struct WorldEventResult {
        let headline: String
        let summary: String
        let actorId: String
        let actorName: String
        let targetId: String?
        let targetName: String?
        let type: String
        let severity: String
        let playerMetricDeltas: [String: Double]
        let playerRelationshipDeltas: [String: Double]
        let conflictKey: String?
        let resolvesConflict: Bool
        let isAlert: Bool
    }

    private struct EventTemplate {
        let type: String
        let severity: String
        let needsTarget: Bool
        let requiresHostile: Bool
        let requiresAllied: Bool
        let baseProbability: Double
        let headlines: [String]
        let summaries: [String]
        let basePlayerDeltas: [String: Double]
        let allyTargetAmplifier: Double
        let hostileActorReducer: Double
        let createsConflict: Bool
        let resolvesConflict: Bool
        let isAlert: Bool
    }

    // MARK: - Templates

    private static let templates: [EventTemplate] = [
        EventTemplate(
            type: "military_tension",
            severity: "moderate",
            needsTarget: true,
            requiresHostile: true,
            requiresAllied: false,
            baseProbability: 0.18,
            headlines: [
                "{actor} Deploys Forces Along {target} Border",
                "{actor} and {target} Exchange Fire in Border Skirmish",
                "{actor} Places Military on High Alert Amid {target} Standoff"
            ],
            summaries: [
                "{actor} has moved armored units toward its border with {target}, citing defensive precautions. Regional commanders on both sides have been placed on elevated readiness.",
                "A skirmish at the {actor}-{target} border has left both sides claiming provocation. Both militaries have moved to forward deployment postures.",
                "Tensions between {actor} and {target} have escalated after aerial incursions and naval confrontations. International observers are urging restraint."
            ],
            basePlayerDeltas: ["metric_foreign_relations": -0.6, "metric_unrest": 0.3],
            allyTargetAmplifier: 2.0,
            hostileActorReducer: 0.4,
            createsConflict: true,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "diplomatic_crisis",
            severity: "minor",
            needsTarget: true,
            requiresHostile: true,
            requiresAllied: false,
            baseProbability: 0.22,
            headlines: [
                "{actor} Recalls Ambassador From {target} Over Espionage Claims",
                "{actor} Expels {target} Diplomats Amid Spy Scandal",
                "{actor} Suspends Diplomatic Ties With {target}"
            ],
            summaries: [
                "{actor} has recalled its ambassador to {target} and summoned {target}'s chargé d'affaires to deliver a formal protest following accusations of intelligence interference.",
                "{actor} has ordered {target} diplomats expelled, citing activities incompatible with diplomatic status. {target} has vowed a proportional response.",
                "{actor} announced the suspension of all formal diplomatic channels with {target}, the most serious rupture in bilateral relations in decades."
            ],
            basePlayerDeltas: ["metric_foreign_relations": -0.4],
            allyTargetAmplifier: 1.6,
            hostileActorReducer: 0.3,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "sanctions",
            severity: "moderate",
            needsTarget: true,
            requiresHostile: true,
            requiresAllied: false,
            baseProbability: 0.14,
            headlines: [
                "{actor} Announces Sweeping Economic Sanctions Against {target}",
                "{actor} Freezes {target} Assets, Cuts Financial Access",
                "{actor} Targets {target} With Comprehensive Trade Embargo"
            ],
            summaries: [
                "{actor} has enacted broad economic sanctions targeting {target}'s banking sector and energy exports. Markets in both countries have responded sharply.",
                "{actor} has frozen an estimated $40 billion in {target} financial assets. The action marks one of the most aggressive economic campaigns in recent history.",
                "{actor} has moved to cut off {target} from global trade networks, banning the export of semiconductors, machinery, and financial instruments."
            ],
            basePlayerDeltas: ["metric_economy": -0.4, "metric_trade": -0.6],
            allyTargetAmplifier: 1.5,
            hostileActorReducer: 0.5,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "territorial_dispute",
            severity: "major",
            needsTarget: true,
            requiresHostile: true,
            requiresAllied: false,
            baseProbability: 0.06,
            headlines: [
                "{actor} Claims Sovereignty Over Contested Territory Near {target}",
                "{actor} Moves to Annex Disputed Region Bordering {target}",
                "Crisis Erupts as {actor} Forces Enter {target}-Claimed Territory"
            ],
            summaries: [
                "{actor} has formally asserted sovereignty over a disputed region claimed by {target}, triggering emergency sessions at the UN Security Council.",
                "{actor} has begun a formal annexation process, issuing residency documents and deploying administrative officials. {target} has declared the action illegal.",
                "{actor} military units have crossed into territory claimed by {target}, setting off rapid mobilization on both sides."
            ],
            basePlayerDeltas: ["metric_foreign_relations": -1.2, "metric_unrest": 0.5, "metric_approval": -0.4],
            allyTargetAmplifier: 2.5,
            hostileActorReducer: 0.3,
            createsConflict: true,
            resolvesConflict: false,
            isAlert: true
        ),
        EventTemplate(
            type: "alliance_formation",
            severity: "moderate",
            needsTarget: true,
            requiresHostile: false,
            requiresAllied: true,
            baseProbability: 0.11,
            headlines: [
                "{actor} and {target} Sign Landmark Mutual Defense Treaty",
                "{actor}–{target} Security Pact Reshapes Regional Balance",
                "{actor} and {target} Formalize Military Alliance"
            ],
            summaries: [
                "{actor} and {target} have concluded a landmark mutual defense treaty committing each to the other's security, including joint exercises, intelligence sharing, and coordinated response protocols.",
                "After months of negotiations, {actor} and {target} have formalized a security partnership with a mutual defense clause obligating both to respond to attacks on either nation.",
                "The {actor}–{target} defense agreement includes provisions for joint air defense, naval cooperation, and a new bilateral military command structure."
            ],
            basePlayerDeltas: ["metric_foreign_relations": 0.25, "metric_military": 0.15],
            allyTargetAmplifier: 0.8,
            hostileActorReducer: -0.6,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "trade_agreement",
            severity: "minor",
            needsTarget: true,
            requiresHostile: false,
            requiresAllied: true,
            baseProbability: 0.20,
            headlines: [
                "{actor} and {target} Conclude Comprehensive Free Trade Deal",
                "{actor}–{target} Trade Pact Opens New Economic Corridor",
                "{actor} and {target} Remove Remaining Trade Barriers"
            ],
            summaries: [
                "{actor} and {target} have completed negotiations on a free trade agreement covering goods, services, and digital commerce, eliminating tariffs on over 90% of traded goods.",
                "The {actor}–{target} trade accord creates one of the world's largest preferential trade zones. Analysts forecast significant gains for manufacturers and the financial services sector.",
                "{actor} and {target} have agreed to remove the remaining trade barriers between their economies, completing a decade-long negotiation process."
            ],
            basePlayerDeltas: ["metric_trade": 0.35, "metric_economy": 0.15],
            allyTargetAmplifier: 0.7,
            hostileActorReducer: -0.3,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "military_exercise",
            severity: "minor",
            needsTarget: true,
            requiresHostile: false,
            requiresAllied: true,
            baseProbability: 0.24,
            headlines: [
                "{actor} and {target} Launch Large-Scale Joint Military Exercises",
                "{actor}–{target} Drills Signal Strengthening Defense Partnership",
                "Combined {actor}–{target} Forces Conduct Multi-Domain War Games"
            ],
            summaries: [
                "{actor} and {target} have commenced joint military exercises involving over 40,000 troops, naval vessels, and air assets across multiple domains.",
                "Thousands of troops from {actor} and {target} are participating in combined-arms exercises covering land, sea, air, and cyber domains.",
                "{actor} and {target} joint forces are conducting coordinated war game scenarios involving simulated hybrid warfare threats."
            ],
            basePlayerDeltas: ["metric_military": 0.15, "metric_foreign_relations": 0.10],
            allyTargetAmplifier: 0.6,
            hostileActorReducer: -0.2,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "internal_crisis",
            severity: "major",
            needsTarget: false,
            requiresHostile: false,
            requiresAllied: false,
            baseProbability: 0.07,
            headlines: [
                "Political Crisis Deepens in {actor} as Coalition Fractures",
                "Mass Protests Paralyze {actor} Capital",
                "{actor} Government on Brink as No-Confidence Vote Looms"
            ],
            summaries: [
                "The government of {actor} is facing its gravest challenge in years after the collapse of its ruling coalition. Emergency sessions have failed to produce a viable alternative.",
                "Hundreds of thousands of protesters have converged on {actor}'s capital following the collapse of austerity talks and accusations of high-level corruption.",
                "{actor}'s prime minister faces a critical no-confidence vote after key coalition partners withdrew support over a series of corruption scandals."
            ],
            basePlayerDeltas: ["metric_foreign_relations": -0.4, "metric_unrest": 0.3],
            allyTargetAmplifier: 1.4,
            hostileActorReducer: 0.6,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: false
        ),
        EventTemplate(
            type: "coup",
            severity: "major",
            needsTarget: false,
            requiresHostile: false,
            requiresAllied: false,
            baseProbability: 0.03,
            headlines: [
                "Military Coup Topples Government in {actor}",
                "Armed Soldiers Seize Power in {actor} Capital",
                "{actor} General Takes Control in Pre-Dawn Coup"
            ],
            summaries: [
                "A military coup has overthrown the elected government of {actor}. Armored vehicles are stationed at key government buildings and state media has been seized.",
                "In the early hours, soldiers loyal to {actor}'s special forces commander seized the presidential palace and key government ministries.",
                "{actor}'s general has dissolved the parliament and suspended the constitution. International condemnation is swift."
            ],
            basePlayerDeltas: ["metric_foreign_relations": -1.2, "metric_approval": -0.5, "metric_unrest": 0.4],
            allyTargetAmplifier: 1.8,
            hostileActorReducer: 0.5,
            createsConflict: false,
            resolvesConflict: false,
            isAlert: true
        ),
        EventTemplate(
            type: "conflict_resolution",
            severity: "moderate",
            needsTarget: true,
            requiresHostile: false,
            requiresAllied: false,
            baseProbability: 0.30,
            headlines: [
                "{actor} and {target} Announce Ceasefire After Weeks of Fighting",
                "Peace Talks Between {actor} and {target} Yield Preliminary Agreement",
                "{actor}–{target} Hostilities Suspended Under UN Mediation"
            ],
            summaries: [
                "{actor} and {target} have agreed to an immediate ceasefire following direct negotiations mediated by a neutral third party. Both sides will withdraw forward-deployed forces.",
                "Negotiators from {actor} and {target} have initialed a preliminary peace agreement, pausing a conflict that has claimed thousands of lives.",
                "UN Secretary-General announced that {actor} and {target} have accepted a monitored ceasefire. International peacekeepers will be deployed within 72 hours."
            ],
            basePlayerDeltas: ["metric_foreign_relations": 0.7, "metric_approval": 0.25, "metric_unrest": -0.35],
            allyTargetAmplifier: 1.2,
            hostileActorReducer: 0.7,
            createsConflict: false,
            resolvesConflict: true,
            isAlert: false
        )
    ]

    // MARK: - Main API

    static func processWorldEvents(state: GameState) -> [WorldEventResult] {
        let countries = state.countries
        guard countries.count >= 2 else { return [] }

        let roll = Double.random(in: 0...1)
        guard roll > 0.30 else { return [] }
        let maxEvents = roll > 0.75 ? 2 : 1

        var results: [WorldEventResult] = []
        var firedTypes = Set<String>()

        let actorPool = buildActorPool(countries: countries, state: state)
        guard actorPool.count >= 1 else { return [] }

        var attempts = 0
        while results.count < maxEvents && attempts < 24 {
            attempts += 1

            guard let actorIdx = weightedPick(from: actorPool) else { continue }
            let actor = countries[actorIdx]

            let existingConflict = state.worldConflicts?.first {
                $0.actorCountryId == actor.id || $0.targetCountryId == actor.id
            }

            guard let template = selectTemplate(
                actor: actor,
                state: state,
                existingConflict: existingConflict,
                firedTypes: firedTypes
            ) else { continue }

            if template.needsTarget {
                guard let targetIdx = selectTarget(
                    actor: actor,
                    actorPool: actorPool,
                    template: template,
                    countries: countries,
                    state: state
                ) else { continue }
                let target = countries[targetIdx]
                let result = buildResult(template: template, actor: actor, target: target, state: state)
                results.append(result)
            } else {
                let result = buildResult(template: template, actor: actor, target: nil, state: state)
                results.append(result)
            }

            firedTypes.insert(template.type)
        }

        return results
    }

    static func tickWorldConflicts(state: inout GameState) {
        guard var conflicts = state.worldConflicts, !conflicts.isEmpty else { return }
        conflicts = conflicts.filter { _ in Double.random(in: 0...1) > 0.15 }
        state.worldConflicts = conflicts.isEmpty ? nil : conflicts
    }

    // MARK: - Private Helpers

    private static func buildActorPool(countries: [Country], state: GameState) -> [(index: Int, weight: Double)] {
        var pool: [(index: Int, weight: Double)] = []
        for (i, country) in countries.enumerated() {
            let milWeight = min(country.military.strength / 50.0, 2.0)
            let relWeight = abs(country.diplomacy.relationship) / 100.0 + 0.2
            let weight = (milWeight * 0.6 + relWeight * 0.4) * Double.random(in: 0.7...1.3)
            if weight > 0.1 { pool.append((index: i, weight: weight)) }
        }
        return pool.sorted { $0.weight > $1.weight }.prefix(15).map { $0 }
    }

    private static func weightedPick(from pool: [(index: Int, weight: Double)]) -> Int? {
        guard !pool.isEmpty else { return nil }
        let total = pool.map(\.weight).reduce(0, +)
        guard total > 0 else { return pool.randomElement()?.index }
        var roll = Double.random(in: 0...total)
        for item in pool {
            roll -= item.weight
            if roll <= 0 { return item.index }
        }
        return pool.last?.index
    }

    private static func selectTemplate(
        actor: Country,
        state: GameState,
        existingConflict: WorldConflict?,
        firedTypes: Set<String>
    ) -> EventTemplate? {
        var candidates = templates.filter { t in
            !firedTypes.contains(t.type)
        }

        if existingConflict != nil {
            if let resolutionTemplate = candidates.first(where: { $0.type == "conflict_resolution" }) {
                if Double.random(in: 0...1) < 0.35 { return resolutionTemplate }
            }
            candidates = candidates.filter { $0.type != "trade_agreement" && $0.type != "military_exercise" }
        }

        if existingConflict == nil {
            candidates = candidates.filter { $0.type != "conflict_resolution" }
        }

        for template in candidates.shuffled() {
            if Double.random(in: 0...1) < template.baseProbability { return template }
        }
        return candidates.first
    }

    private static func selectTarget(
        actor: Country,
        actorPool: [(index: Int, weight: Double)],
        template: EventTemplate,
        countries: [Country],
        state: GameState
    ) -> Int? {
        var candidates: [Int] = []
        for item in actorPool {
            let candidate = countries[item.index]
            guard candidate.id != actor.id else { continue }
            let isAllied = areAllied(actor, candidate)
            let isHostile = areHostile(actor, candidate, state: state)
            if template.requiresHostile && !isHostile { continue }
            if template.requiresAllied && !isAllied { continue }
            candidates.append(item.index)
        }
        return candidates.randomElement()
    }

    private static func areAllied(_ a: Country, _ b: Country) -> Bool {
        guard let blocsA = a.blocs, let blocsB = b.blocs, !blocsA.isEmpty, !blocsB.isEmpty else { return false }
        return !Set(blocsA).isDisjoint(with: Set(blocsB))
    }

    private static func areHostile(_ a: Country, _ b: Country, state: GameState) -> Bool {
        let relA = a.diplomacy.relationship
        let relB = b.diplomacy.relationship
        let divergence = abs(relA - relB)
        if divergence > 60 { return true }
        if relA < -20 && relB < -20 && !areAllied(a, b) { return Double.random(in: 0...1) > 0.5 }
        return false
    }

    private static func buildResult(
        template: EventTemplate,
        actor: Country,
        target: Country?,
        state: GameState
    ) -> WorldEventResult {
        let headline = (template.headlines.randomElement() ?? template.headlines[0])
            .replacingOccurrences(of: "{actor}", with: actor.name)
            .replacingOccurrences(of: "{target}", with: target?.name ?? "")

        let summary = (template.summaries.randomElement() ?? template.summaries[0])
            .replacingOccurrences(of: "{actor}", with: actor.name)
            .replacingOccurrences(of: "{target}", with: target?.name ?? "")

        let actorRel = actor.diplomacy.relationship
        let targetRel = target?.diplomacy.relationship ?? 0

        var playerDeltas = template.basePlayerDeltas.mapValues { base -> Double in
            let actorNorm = actorRel / 100.0
            let targetNorm = targetRel / 100.0
            var delta = base
            if base < 0 {
                let targetAllyBoost = max(0, targetNorm) * template.allyTargetAmplifier * 0.5
                let actorHostileReduction = max(0, -actorNorm) * template.hostileActorReducer * 0.5
                delta = base * (1.0 + targetAllyBoost - actorHostileReduction)
            } else {
                let allyBoost = (max(0, actorNorm) + max(0, targetNorm)) * 0.25
                delta = base * (1.0 + allyBoost)
            }
            return delta * (0.75 + Double.random(in: 0...0.5))
        }

        playerDeltas = playerDeltas.filter { abs($0.value) >= 0.05 }

        var relDeltas: [String: Double] = [:]
        if template.requiresHostile, targetRel > 40 {
            relDeltas[actor.id] = -Double.random(in: 1...3)
        }

        let conflictKey: String?
        if template.createsConflict, let targetId = target?.id {
            conflictKey = "\(actor.id)|\(targetId)"
        } else {
            conflictKey = nil
        }

        return WorldEventResult(
            headline: headline,
            summary: summary,
            actorId: actor.id,
            actorName: actor.name,
            targetId: target?.id,
            targetName: target?.name,
            type: template.type,
            severity: template.severity,
            playerMetricDeltas: playerDeltas,
            playerRelationshipDeltas: relDeltas,
            conflictKey: conflictKey,
            resolvesConflict: template.resolvesConflict,
            isAlert: template.isAlert
        )
    }
}
