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

    static func generateStrengths(from skills: [PlayerSkill], approach: String) -> [String] {
        var pool: [String] = []
        for skill in skills {
            switch skill.id {
            case "skill_economist", "skill_fiscal_hawk": pool.append("Strong command of macroeconomic policy")
            case "skill_diplomat": pool.append("Respected voice in international negotiations")
            case "skill_military_tactician": pool.append("Sound strategic judgment in defense matters")
            case "skill_orator", "skill_media_savvy": pool.append("Ability to inspire and mobilize public support")
            case "skill_technocrat": pool.append("Evidence-based approach to governance")
            case "skill_populist": pool.append("Genuine connection to grassroots concerns")
            case "skill_integrity": pool.append("High ethical standards that resist corruption")
            case "skill_crisis_manager": pool.append("Calm and effective under extreme pressure")
            case "skill_environmental": pool.append("Long-term thinking on sustainability")
            case "skill_trade_expert": pool.append("Expertise in forging beneficial trade partnerships")
            case "skill_intelligence": pool.append("Keen awareness of security and geopolitical threats")
            case "skill_legal_mind": pool.append("Respected for constitutional integrity")
            case "skill_social_reformer": pool.append("Championing equity earns broad coalition support")
            default: break
            }
        }
        if approach.lowercased() == "pragmatist" { pool.append("Pragmatic bipartisan deal-making ability") }
        if approach.lowercased() == "idealist" { pool.append("Visionary leadership that inspires long-term loyalty") }
        if approach.lowercased() == "technocrat" { pool.append("Data-driven decisions that minimize policy errors") }
        return Array(pool.prefix(3))
    }

    static func generateWeaknesses(from skills: [PlayerSkill], approach: String) -> [String] {
        let skillIds = Set(skills.map(\.id))
        var pool: [String] = []
        if !skillIds.contains("skill_diplomat") { pool.append("Limited experience in complex multilateral diplomacy") }
        if !skillIds.contains("skill_economist") && !skillIds.contains("skill_fiscal_hawk") { pool.append("Fiscal management is not a core strength") }
        if !skillIds.contains("skill_military_tactician") && !skillIds.contains("skill_intelligence") { pool.append("Defense and security decisions may require heavier expert reliance") }
        if !skillIds.contains("skill_orator") && !skillIds.contains("skill_media_savvy") { pool.append("Public communication and narrative management is a gap") }
        if !skillIds.contains("skill_crisis_manager") { pool.append("May struggle to project calm authority during acute crises") }
        if !skillIds.contains("skill_populist") && !skillIds.contains("skill_social_reformer") { pool.append("Perceived distance from ordinary constituents") }
        if approach.lowercased() == "technocrat" { pool.append("Can appear cold or detached from human impact of policy") }
        if approach.lowercased() == "idealist" { pool.append("Pursuing ideals can lead to politically costly stances") }
        if approach.lowercased() == "pragmatist" { pool.append("Principled voters may view pragmatism as lacking conviction") }
        return Array(pool.prefix(3))
    }
}
