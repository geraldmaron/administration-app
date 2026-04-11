import Foundation

enum PlayerSkillCatalogue {
    static let all: [PlayerSkill] = [
        PlayerSkill(id: "skill_economist", name: "Economist", description: "Deep understanding of fiscal policy and market dynamics.", statBonuses: [TraitStatBonus(stat: "economics", value: 1.5)], iconName: "chart.line.uptrend.xyaxis"),
        PlayerSkill(id: "skill_diplomat", name: "Master Diplomat", description: "Skilled in negotiation and international relations.", statBonuses: [TraitStatBonus(stat: "diplomacy", value: 1.5)], iconName: "globe"),
        PlayerSkill(id: "skill_military_tactician", name: "Military Tactician", description: "Expert in defense strategy and armed forces.", statBonuses: [TraitStatBonus(stat: "military", value: 1.5)], iconName: "shield.fill"),
        PlayerSkill(id: "skill_orator", name: "Orator", description: "Compelling public speaker who commands attention.", statBonuses: [TraitStatBonus(stat: "charisma", value: 2.0)], iconName: "mic.fill"),
        PlayerSkill(id: "skill_technocrat", name: "Technocrat", description: "Data-driven governance with analytical precision.", statBonuses: [TraitStatBonus(stat: "competency", value: 1.5)], iconName: "cpu"),
        PlayerSkill(id: "skill_populist", name: "Populist", description: "Natural connection with ordinary citizens.", statBonuses: [TraitStatBonus(stat: "charisma", value: 1.0), TraitStatBonus(stat: "compassion", value: 1.0)], iconName: "person.3.fill"),
        PlayerSkill(id: "skill_integrity", name: "Incorruptible", description: "Unwavering ethical standards and transparency.", statBonuses: [TraitStatBonus(stat: "integrity", value: 2.0)], iconName: "checkmark.seal.fill"),
        PlayerSkill(id: "skill_crisis_manager", name: "Crisis Manager", description: "Thrives under pressure, decisive in emergencies.", statBonuses: [TraitStatBonus(stat: "management", value: 1.5)], iconName: "exclamationmark.triangle.fill"),
        PlayerSkill(id: "skill_environmental", name: "Environmentalist", description: "Champion of sustainability and green policy.", statBonuses: [TraitStatBonus(stat: "compassion", value: 1.0)], iconName: "leaf.fill"),
        PlayerSkill(id: "skill_trade_expert", name: "Trade Expert", description: "Deep expertise in international commerce.", statBonuses: [TraitStatBonus(stat: "economics", value: 1.0), TraitStatBonus(stat: "diplomacy", value: 0.5)], iconName: "arrow.left.arrow.right"),
        PlayerSkill(id: "skill_intelligence", name: "Intelligence Background", description: "Experience in intelligence and counterintelligence.", statBonuses: [TraitStatBonus(stat: "military", value: 0.5), TraitStatBonus(stat: "integrity", value: 0.5)], iconName: "eye.fill"),
        PlayerSkill(id: "skill_legal_mind", name: "Legal Mind", description: "Constitutional and legal expertise.", statBonuses: [TraitStatBonus(stat: "integrity", value: 1.0), TraitStatBonus(stat: "management", value: 0.5)], iconName: "scalemass.fill"),
        PlayerSkill(id: "skill_media_savvy", name: "Media Savvy", description: "Expert at managing public narrative and press.", statBonuses: [TraitStatBonus(stat: "charisma", value: 1.5)], iconName: "tv.fill"),
        PlayerSkill(id: "skill_social_reformer", name: "Social Reformer", description: "Committed to equity and progressive social change.", statBonuses: [TraitStatBonus(stat: "compassion", value: 2.0)], iconName: "person.crop.circle.badge.plus"),
        PlayerSkill(id: "skill_fiscal_hawk", name: "Fiscal Hawk", description: "Disciplined steward of national finances.", statBonuses: [TraitStatBonus(stat: "economics", value: 2.0)], iconName: "banknote.fill"),
    ]

    static func defaultSkills(for approach: String) -> [String] {
        switch approach.lowercased() {
        case "pragmatist":  return ["skill_crisis_manager", "skill_diplomat", "skill_trade_expert", "skill_media_savvy"]
        case "ideologue":   return ["skill_orator", "skill_populist", "skill_social_reformer", "skill_environmental"]
        case "technocrat":  return ["skill_technocrat", "skill_economist", "skill_fiscal_hawk", "skill_intelligence"]
        case "nationalist": return ["skill_military_tactician", "skill_intelligence", "skill_fiscal_hawk", "skill_crisis_manager"]
        case "populist":    return ["skill_orator", "skill_populist", "skill_media_savvy", "skill_social_reformer"]
        default:            return []
        }
    }

    // MARK: - Strengths

    static func generateStrengths(from skills: [PlayerSkill], approach: String, party: PoliticalParty? = nil) -> [String] {
        var pool: [String] = []
        let skillIds = Set(skills.map(\.id))
        let lowerApproach = approach.lowercased()

        for skill in skills {
            switch skill.id {
            case "skill_economist":
                pool.append("Strong command of macroeconomic policy and fiscal levers")
                if lowerApproach == "technocrat" { pool.append("Can model economic trade-offs with precision few rivals match") }
            case "skill_fiscal_hawk":
                pool.append("Rigorous budget discipline that sustains long-term fiscal health")
                pool.append("Credibility with financial markets and international lenders")
            case "skill_diplomat":
                pool.append("Respected interlocutor in multilateral forums and bilateral talks")
                pool.append("Ability to de-escalate crises before they become conflicts")
                if skillIds.contains("skill_trade_expert") { pool.append("Trade diplomacy reach that opens markets and strengthens alliances") }
            case "skill_military_tactician":
                pool.append("Sound strategic judgment in defense policy and force deployment")
                pool.append("Earns trust and loyalty from military leadership")
            case "skill_orator":
                pool.append("Ability to inspire, unify, and mobilize public opinion at scale")
                pool.append("Narrative command that shapes how policy is received")
            case "skill_technocrat":
                pool.append("Evidence-based governance that avoids ideologically driven mistakes")
                pool.append("Respected by technocratic institutions, central banks, and regulators")
            case "skill_populist":
                pool.append("Genuine grassroots resonance that keeps coalition energized")
                pool.append("Instinctive understanding of what ordinary citizens need from government")
            case "skill_integrity":
                pool.append("High ethical standards that insulate against corruption scandals")
                pool.append("Trust premium that enables unpopular but necessary decisions")
                if skillIds.contains("skill_legal_mind") { pool.append("Rule-of-law credibility that reassures democratic institutions") }
            case "skill_crisis_manager":
                pool.append("Decisive and calm authority during acute crises")
                pool.append("Operational discipline that prevents manageable problems from spiraling")
            case "skill_environmental":
                pool.append("Long-term sustainability thinking embedded in core policy")
                pool.append("Access to climate-conscious investment and international green frameworks")
            case "skill_trade_expert":
                pool.append("Deep expertise in negotiating and structuring trade agreements")
                pool.append("Understanding of supply-chain vulnerabilities before they become crises")
            case "skill_intelligence":
                pool.append("Acute awareness of security threats and geopolitical maneuvers")
                pool.append("Ability to act on strategic intelligence before opponents anticipate it")
            case "skill_legal_mind":
                pool.append("Constitutional credibility that strengthens democratic governance")
                pool.append("Ability to navigate legal constraints that stymie less careful leaders")
            case "skill_media_savvy":
                pool.append("Expert management of public narrative and news cycles")
                pool.append("Rapid-response capability that limits reputational damage")
            case "skill_social_reformer":
                pool.append("Championing equity generates lasting coalition loyalty")
                pool.append("Policy vision that attracts progressive civic organisations and NGOs")
            default: break
            }
        }

        switch lowerApproach {
        case "pragmatist":
            pool.append("Pragmatic deal-making that builds durable cross-party consensus")
            pool.append("Ability to absorb political pressure without abandoning governance")
        case "ideologue":
            pool.append("Ideological clarity that inspires deep loyalty among the base")
            pool.append("Long-term vision that outlasts short-term political cycles")
        case "technocrat":
            pool.append("Data-driven decisions that systematically reduce policy error rates")
            pool.append("Institutional credibility with international bodies and rating agencies")
        case "nationalist":
            pool.append("Commanding national resolve that consolidates domestic cohesion")
            pool.append("Strategic clarity on sovereignty that deters opportunistic rivals")
        case "populist":
            pool.append("Direct electoral mandate with unmatched public resonance")
            pool.append("Ability to mobilise passive or disenchanted voters behind the agenda")
        default: break
        }

        if let party {
            let label = party.ideologyLabel
            let intensity = abs(party.ideology - 5) >= 3 ? "strong" : "clear"
            let sortedBiases = (party.metricBiases ?? [:])
                .sorted { abs($0.value) > abs($1.value) }
                .prefix(3)
            for (metricId, bias) in sortedBiases where bias > 0 {
                if skillMetricAligned(skillIds: skillIds, metricId: metricId) {
                    pool.append(partyStrengthString(metricId: metricId, label: label, intensity: intensity))
                }
            }
            if let topPolicy = party.keyPolicies.first, !topPolicy.isEmpty {
                if skillIds.contains("skill_orator") || skillIds.contains("skill_media_savvy") {
                    pool.append("Vocal advocate for \(topPolicy), giving your \(label) party a credible champion")
                }
            }
        }

        return Array(OrderedUniqueFilter.apply(to: pool).prefix(3))
    }

    // MARK: - Weaknesses

    static func generateWeaknesses(from skills: [PlayerSkill], approach: String, party: PoliticalParty? = nil) -> [String] {
        let skillIds = Set(skills.map(\.id))
        let lowerApproach = approach.lowercased()
        var pool: [String] = []

        if !skillIds.contains("skill_diplomat") {
            pool.append("Limited track record in complex multilateral diplomacy")
            if !skillIds.contains("skill_trade_expert") {
                pool.append("Both diplomatic and trade expertise are absent — vulnerable to external pressure")
            }
        }
        if !skillIds.contains("skill_economist") && !skillIds.contains("skill_fiscal_hawk") && !skillIds.contains("skill_trade_expert") {
            pool.append("No core economic or fiscal skills — budget crises could overwhelm the administration")
        } else if !skillIds.contains("skill_economist") && !skillIds.contains("skill_fiscal_hawk") {
            pool.append("Fiscal management is not a personal strength; heavy reliance on Finance Minister")
        }
        if !skillIds.contains("skill_military_tactician") && !skillIds.contains("skill_intelligence") {
            pool.append("Defense and security decisions will depend heavily on advisers with little personal oversight")
        }
        if !skillIds.contains("skill_orator") && !skillIds.contains("skill_media_savvy") {
            pool.append("Public communication and narrative management are significant gaps")
        }
        if !skillIds.contains("skill_crisis_manager") {
            pool.append("Acute crises may reveal an absence of decisive operational authority")
        }
        if !skillIds.contains("skill_populist") && !skillIds.contains("skill_social_reformer") && !skillIds.contains("skill_orator") {
            pool.append("Perceived distance from ordinary constituents is a persistent political liability")
        }
        if !skillIds.contains("skill_integrity") && !skillIds.contains("skill_legal_mind") {
            pool.append("Without clear ethical anchors, corruption risks may be underestimated")
        }
        if !skillIds.contains("skill_environmental") {
            pool.append("Environmental pressures may catch the administration unprepared for green-policy demands")
        }

        switch lowerApproach {
        case "technocrat":
            pool.append("Can appear cold or detached from the human cost of policy decisions")
            pool.append("Risks losing popular support when expert consensus conflicts with public intuition")
        case "ideologue":
            pool.append("Ideological conviction can lead to politically costly stances in a centrist legislature")
            pool.append("Coalition partners may resist the ideological direction when it diverges from their base")
        case "pragmatist":
            pool.append("Base voters may view pragmatism as lacking conviction or betraying core values")
            pool.append("Opponents can frame flexibility as opportunism or absence of principle")
        case "nationalist":
            pool.append("Isolationist instincts may fracture vital international alliances")
            pool.append("Nationalist framing risks alienating minority communities and investor confidence")
        case "populist":
            pool.append("Governing by approval incentivises short-term thinking over durable structural policy")
            pool.append("Populist rhetoric can trigger backlash from institutional actors — judiciary, central bank, press")
        default: break
        }

        if let party {
            let label = party.ideologyLabel
            let sortedBiases = (party.metricBiases ?? [:])
                .sorted { abs($0.value) > abs($1.value) }
                .prefix(3)
            for (metricId, bias) in sortedBiases where bias > 0 {
                if !skillMetricAligned(skillIds: skillIds, metricId: metricId) {
                    pool.append(partyWeaknessString(metricId: metricId, label: label))
                }
            }
            if party.ideology <= 2 || party.ideology >= 9 {
                pool.append("Your \(label) stance may alienate the centrist swing voters needed to hold a governing majority")
            }
            if let coalitionWillingness = party.coalitionWillingness, coalitionWillingness < 0.4 {
                pool.append("Your \(label) party's low coalition appetite limits the legislative alliances available to you")
            }
        }

        return Array(OrderedUniqueFilter.apply(to: pool).prefix(3))
    }

    // MARK: - Private helpers

    private static func skillMetricAligned(skillIds: Set<String>, metricId: String) -> Bool {
        switch metricId {
        case "metric_economy", "metric_employment", "metric_trade", "metric_budget", "metric_inflation":
            return skillIds.contains("skill_economist") || skillIds.contains("skill_fiscal_hawk") || skillIds.contains("skill_trade_expert")
        case "metric_environment", "metric_climate":
            return skillIds.contains("skill_environmental")
        case "metric_equality", "metric_health", "metric_welfare":
            return skillIds.contains("skill_social_reformer") || skillIds.contains("skill_populist")
        case "metric_military", "metric_sovereignty", "metric_security":
            return skillIds.contains("skill_military_tactician") || skillIds.contains("skill_intelligence")
        case "metric_foreign_relations", "metric_diplomacy":
            return skillIds.contains("skill_diplomat") || skillIds.contains("skill_trade_expert")
        case "metric_democracy", "metric_liberty", "metric_corruption":
            return skillIds.contains("skill_integrity") || skillIds.contains("skill_legal_mind")
        case "metric_approval", "metric_media", "metric_popularity":
            return skillIds.contains("skill_orator") || skillIds.contains("skill_media_savvy") || skillIds.contains("skill_populist")
        default:
            return false
        }
    }

    private static func partyStrengthString(metricId: String, label: String, intensity: String) -> String {
        switch metricId {
        case "metric_economy", "metric_budget", "metric_employment", "metric_inflation":
            return "Your fiscal expertise reinforces your \(label) party's \(intensity) economic mandate"
        case "metric_environment", "metric_climate":
            return "Your environmental credentials align directly with your \(label) party's green platform"
        case "metric_equality", "metric_health", "metric_welfare":
            return "Your social commitment resonates with your \(label) party's equality and welfare coalition"
        case "metric_military", "metric_sovereignty", "metric_security":
            return "Your security background fortifies your \(label) party's defense priorities"
        case "metric_foreign_relations", "metric_diplomacy", "metric_trade":
            return "Your diplomatic reach advances your \(label) party's international agenda"
        case "metric_democracy", "metric_liberty", "metric_corruption":
            return "Your legal integrity anchors your \(label) party's democratic and rule-of-law credentials"
        case "metric_approval", "metric_media", "metric_popularity":
            return "Your public communication skills amplify your \(label) party's outreach and base mobilisation"
        default:
            return "Your background aligns with your \(label) party's core policy priorities"
        }
    }

    private static func partyWeaknessString(metricId: String, label: String) -> String {
        switch metricId {
        case "metric_economy", "metric_budget", "metric_employment", "metric_inflation":
            return "Lacking fiscal expertise may undermine your \(label) party's economic credibility with markets"
        case "metric_environment", "metric_climate":
            return "Weak environmental credentials risk disappointing your \(label) party's green activist base"
        case "metric_equality", "metric_health", "metric_welfare":
            return "Limited social policy depth may cost the support of key blocs within your \(label) coalition"
        case "metric_military", "metric_sovereignty", "metric_security":
            return "Thin security credentials may erode confidence among your \(label) party's defense hardliners"
        case "metric_foreign_relations", "metric_diplomacy", "metric_trade":
            return "Weak diplomatic standing limits your \(label) party's effectiveness in international negotiations"
        case "metric_democracy", "metric_liberty", "metric_corruption":
            return "Governance integrity gaps conflict with your \(label) party's rule-of-law platform"
        default:
            return "A skills gap conflicts with what your \(label) party's base expects of its leader"
        }
    }
}

// Preserves insertion order while deduplicating — avoids Set reordering.
private enum OrderedUniqueFilter {
    static func apply(to array: [String]) -> [String] {
        var seen = Set<String>()
        return array.filter { seen.insert($0).inserted }
    }
}
