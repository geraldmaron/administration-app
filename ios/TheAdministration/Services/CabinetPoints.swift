import Foundation

/// CabinetPointsService
/// Calculates point costs for candidates and cabinet members based on their
/// stats and traits, mirroring the web application's point system.
class CabinetPointsService {
    static let BASE_COST = 10
    static let COST_PER_STAT_POINT = 1
    static let COST_PER_TRAIT = 5
    static let TARGET_AVG_COST_PER_SLOT = 75
    
    static func calculateCandidateCost(candidate: Candidate) -> Int {
        let stats = candidate.stats
        // Baseline is 50 for 6 core stats = 300
        // We exclude corruption from the point-cost baseline if it's meant to be a negative stat,
        // but for now let's just sum the core 6.
        let coreStatSum = stats.diplomacy +
                         stats.economics +
                         stats.military +
                         stats.management +
                         stats.compassion +
                         stats.integrity
        
        let netStatPoints = Int(coreStatSum - 300)
        
        let traitCount = candidate.traits.count
        let traitCost = traitCount * COST_PER_TRAIT
        
        let cost = BASE_COST + (netStatPoints * COST_PER_STAT_POINT) + traitCost
        
        return max(5, cost)
    }
    
    static func calculatePersonnelBudget(numRoles: Int) -> Int {
        return numRoles * TARGET_AVG_COST_PER_SLOT
    }
}
