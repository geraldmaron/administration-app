import Foundation

// MARK: - State

struct SimState {
    var metrics: [String: Double]
    var hiddenMetrics: [String: Double]
    var turn: Int

    static func baseline() -> SimState {
        SimState(
            metrics: [
                "metric_economy":           58.0,
                "metric_inflation":         32.0,
                "metric_health":            55.0,
                "metric_public_order":      58.0,
                "metric_crime":             38.0,
                "metric_unrest":             5.0,
                "metric_equality":          52.0,
                "metric_foreign_relations": 60.0,
                "metric_liberty":           58.0,
                "metric_military":          55.0,
                "metric_corruption":        22.0,
                "metric_innovation":        50.0,
                "metric_bureaucracy":       35.0,
                "metric_foreign_influence":  8.0,
                "metric_economic_bubble":    5.0,
                "metric_sovereignty":       65.0,
                "metric_housing":           52.0,
                "metric_energy":            55.0,
                "metric_democracy":         60.0,
            ],
            hiddenMetrics: [:],
            turn: 0
        )
    }
}

// MARK: - Helpers

func clamp(_ v: Double, _ lo: Double = 0, _ hi: Double = 100) -> Double {
    (max(lo, min(hi, v)) * 10).rounded() / 10
}

let inverseMetrics: Set<String> = [
    "metric_corruption", "metric_inflation", "metric_crime",
    "metric_bureaucracy", "metric_unrest", "metric_economic_bubble",
    "metric_foreign_influence"
]

func isInverse(_ id: String) -> Bool { inverseMetrics.contains(id) }

func jitter(_ range: Double = 0.5) -> Double {
    Double.random(in: -range...range)
}

// MARK: - Approval (faithful reproduction of calculateApproval)

func calculateApproval(_ state: inout SimState) {
    let coreWeights: [(String, Double)] = [
        ("metric_economy",      0.38),
        ("metric_inflation",    0.22),
        ("metric_health",       0.16),
        ("metric_public_order", 0.13),
        ("metric_crime",        0.11),
    ]

    var coreSum = 0.0
    var coreTotal = 0.0
    for (key, w) in coreWeights {
        let v = state.metrics[key] ?? 50.0
        let adj = isInverse(key) ? (100 - v) : v
        coreSum += adj * w
        coreTotal += w
    }
    var base = coreTotal > 0 ? coreSum / coreTotal : 50.0

    let secondaryFactors: [(String, Double)] = [
        ("metric_unrest",            0.13),
        ("metric_equality",          0.10),
        ("metric_foreign_relations", 0.13),
        ("metric_liberty",           0.08),
        ("metric_foreign_influence", 0.07),
        ("metric_economic_bubble",   0.07),
        ("metric_military",          0.06),
        ("metric_bureaucracy",       0.05),
        ("metric_innovation",        0.04),
    ]

    var secondaryPressure = 0.0
    for (key, factor) in secondaryFactors {
        let v = state.metrics[key] ?? 50.0
        let adj = isInverse(key) ? (100 - v) : v
        secondaryPressure += (adj - 50.0) * factor
    }
    base += max(-18.0, min(18.0, secondaryPressure))

    let corruption = state.metrics["metric_corruption"] ?? 0.0
    if corruption > 40 {
        let penalty = (corruption - 40) * 0.45
        let penaltyJitter = Double.random(in: 0...1) * 0.05 - 0.025
        base -= (penalty + penaltyJitter)
    }

    let foreignRelations = state.metrics["metric_foreign_relations"] ?? 50.0
    if foreignRelations < 35 {
        let penalty = (35 - foreignRelations) * 0.30
        let fJitter = Double.random(in: 0...1) * 0.04 - 0.02
        base -= (penalty + fJitter)
    }

    if let shock = state.hiddenMetrics["diplomaticShock"], abs(shock) > 0.1 {
        base += max(-20.0, min(20.0, shock))
    }

    // Political saturation — sustained approval above 80 is historically exceptional.
    // Compression above 80 asymptotically caps ceiling around 88-90.
    if base > 80 {
        let excess = base - 80
        base = 80 + excess * 0.55
    }

    state.metrics["metric_approval"] = clamp(base)
}

// MARK: - Organic Drift (faithful reproduction of advanceTurn drift section)

func applyOrganicDrift(_ state: inout SimState) {
    let economy          = state.metrics["metric_economy"]          ?? 50.0
    let inflation        = state.metrics["metric_inflation"]        ?? 30.0
    let publicOrder      = state.metrics["metric_public_order"]     ?? 50.0
    let corruption       = state.metrics["metric_corruption"]       ?? 25.0
    let foreignRelations = state.metrics["metric_foreign_relations"] ?? 50.0
    let crime            = state.metrics["metric_crime"]            ?? 40.0
    let unrest           = state.metrics["metric_unrest"]           ?? 0.0
    let equality         = state.metrics["metric_equality"]         ?? 50.0
    let foreignInfluence = state.metrics["metric_foreign_influence"] ?? 0.0
    let housing          = state.metrics["metric_housing"]          ?? 50.0
    let liberty          = state.metrics["metric_liberty"]          ?? 58.0
    let democracy        = state.metrics["metric_democracy"]        ?? 60.0
    let innovation       = state.metrics["metric_innovation"]       ?? 50.0
    let energyVal        = state.metrics["metric_energy"]           ?? 50.0

    // UNREST — thresholds at 40; scaled formula for housing/equality
    var unrestDrift = 0.0
    if publicOrder < 40 { unrestDrift += 1.5 }
    if inflation   > 70 { unrestDrift += 0.75 }
    if economy     < 35 { unrestDrift += 0.5 }
    if housing     < 40 { unrestDrift += (40 - housing) * 0.015 }
    if equality    < 40 { unrestDrift += (40 - equality) * 0.010 }
    if unrestDrift == 0 { unrestDrift = -0.75 }
    state.metrics["metric_unrest"] = clamp(unrest + unrestDrift)

    // LIBERTY — corruption captures institutions
    if corruption > 60 {
        let current = state.metrics["metric_liberty"] ?? 50.0
        state.metrics["metric_liberty"] = clamp(current - 1.0)
    }

    // DEMOCRACY ↔ LIBERTY ↔ CORRUPTION loop
    if liberty < 35 {
        let democracyDrag = (35 - liberty) * 0.015
        let current = state.metrics["metric_democracy"] ?? 60.0
        state.metrics["metric_democracy"] = clamp(current - democracyDrag)
    }
    if democracy < 35 {
        let corruptionGrowth = (35 - democracy) * 0.015
        let current = state.metrics["metric_corruption"] ?? 25.0
        state.metrics["metric_corruption"] = clamp(current + corruptionGrowth)
    }

    // ECONOMY — drags + innovation compounding
    var ecoDrift = 0.0
    if foreignRelations < 35 { ecoDrift -= (35 - foreignRelations) * 0.02 }
    if corruption       > 55 { ecoDrift -= (corruption - 55) * 0.025 }
    if publicOrder      < 35 { ecoDrift -= (35 - publicOrder) * 0.02 }
    if inflation        > 75 { ecoDrift -= (inflation - 75) * 0.02 }
    if innovation       > 65 { ecoDrift += (innovation - 65) * 0.003 }
    if ecoDrift != 0 {
        let currentEco = state.metrics["metric_economy"] ?? 50.0
        state.metrics["metric_economy"] = clamp(currentEco + ecoDrift)
    }

    // INFLATION — demand-pull coefficient raised to 0.025; energy supply-shock 0.015; deflation 0.008
    var inflationDrift = 0.0
    if economy   > 65 { inflationDrift += (economy - 65) * 0.025 }
    if economy   < 35 { inflationDrift -= (35 - economy) * 0.008 }
    if energyVal < 35 { inflationDrift += (35 - energyVal) * 0.015 }
    if inflationDrift != 0 {
        let currentInfl = state.metrics["metric_inflation"] ?? 30.0
        state.metrics["metric_inflation"] = clamp(currentInfl + inflationDrift)
    }

    // ECONOMIC BUBBLE — overheating + loose money build risk; cools when moderate
    var bubbleDrift = 0.0
    if economy   > 70   { bubbleDrift += (economy - 70) * 0.04 }
    if inflation > 55   { bubbleDrift += (inflation - 55) * 0.025 }
    if economy < 55 && inflation < 55 { bubbleDrift -= 0.4 }
    if bubbleDrift != 0 {
        let currentBubble = state.metrics["metric_economic_bubble"] ?? 0.0
        state.metrics["metric_economic_bubble"] = clamp(currentBubble + bubbleDrift)
    }

    // PUBLIC ORDER
    var orderDrift = 0.0
    if unrest > 50 { orderDrift -= (unrest - 50) * 0.025 }
    if crime  > 65 { orderDrift -= (crime - 65) * 0.025 }
    if orderDrift != 0 {
        let currentOrder = state.metrics["metric_public_order"] ?? 50.0
        state.metrics["metric_public_order"] = clamp(currentOrder + orderDrift)
    }

    // HOUSING — economic stress erodes housing affordability
    if economy < 45 {
        let housingDrag = (45 - economy) * 0.012
        let current = state.metrics["metric_housing"] ?? 50.0
        state.metrics["metric_housing"] = clamp(current - housingDrag)
    }

    // CRIME — thresholds 45/40
    var crimeDrift = 0.0
    if equality < 45 { crimeDrift += (45 - equality) * 0.015 }
    if housing  < 40 { crimeDrift += (40 - housing) * 0.012 }
    if crimeDrift != 0 {
        let currentCrime = state.metrics["metric_crime"] ?? 40.0
        state.metrics["metric_crime"] = clamp(currentCrime + crimeDrift)
    }

    // EQUALITY — housing cascade threshold 40
    if housing < 40 {
        let drag = (40 - housing) * 0.015
        let currentEq = state.metrics["metric_equality"] ?? 50.0
        state.metrics["metric_equality"] = clamp(currentEq - drag)
    }

    // FOREIGN RELATIONS
    var frDrift = 0.0
    if corruption > 60 { frDrift -= (corruption - 60) * 0.02 }
    if unrest     > 65 { frDrift -= (unrest - 65) * 0.02 }
    if frDrift != 0 {
        let currentFR = state.metrics["metric_foreign_relations"] ?? 50.0
        state.metrics["metric_foreign_relations"] = clamp(currentFR + frDrift)
    }

    // SOVEREIGNTY
    if foreignInfluence > 60 {
        let drag = (foreignInfluence - 60) * 0.02
        let currentSov = state.metrics["metric_sovereignty"] ?? 50.0
        state.metrics["metric_sovereignty"] = clamp(currentSov - drag)
    }

    // HEALTH — economic boost above 65; economic crisis decay below 35
    let currentHealth = state.metrics["metric_health"] ?? 50.0
    if economy > 65 {
        state.metrics["metric_health"] = clamp(currentHealth + (economy - 65) * 0.005)
    } else if economy < 35 {
        state.metrics["metric_health"] = clamp(currentHealth - (35 - economy) * 0.010)
    }

    // DIPLOMATIC SHOCK DECAY: 45% decay per turn
    if let shock = state.hiddenMetrics["diplomaticShock"], abs(shock) > 0.1 {
        let decayed = shock * 0.55
        state.hiddenMetrics["diplomaticShock"] = abs(decayed) > 0.2 ? decayed : nil
    }
}

// MARK: - Decision Profiles

typealias Delta = [String: Double]

enum Profile: CaseIterable, Equatable {
    case goodGovernance
    case badGovernance
    case authoritarian
    case economicPopulist
    case warmonger
    case neglectSpiral
    case economicBoomCrash

    var name: String {
        switch self {
        case .goodGovernance:    return "Good Governance"
        case .badGovernance:     return "Bad Governance"
        case .authoritarian:     return "Authoritarian"
        case .economicPopulist:  return "Economic Populist"
        case .warmonger:         return "Warmonger"
        case .neglectSpiral:     return "Neglect Spiral"
        case .economicBoomCrash: return "Economic Boom Crash"
        }
    }

    func deltas(turn: Int, state: SimState) -> (Delta, Double) {
        switch self {

        case .goodGovernance:
            return ([
                "metric_economy":           0.6,
                "metric_health":            0.5,
                "metric_public_order":      0.5,
                "metric_equality":          0.3,
                "metric_corruption":       -0.4,
                "metric_housing":           0.3,
                "metric_innovation":        0.2,
                "metric_liberty":           0.2,
                "metric_foreign_relations": 0.3,
                "metric_unrest":           -0.3,
                "metric_crime":            -0.2,
                "metric_bureaucracy":      -0.2,
            ], 0.0)

        case .badGovernance:
            return ([
                "metric_economy":           -0.5,
                "metric_health":            -0.4,
                "metric_public_order":      -0.4,
                "metric_equality":          -0.3,
                "metric_corruption":         0.5,
                "metric_housing":           -0.3,
                "metric_innovation":        -0.2,
                "metric_liberty":           -0.2,
                "metric_foreign_relations": -0.2,
                "metric_unrest":             0.4,
                "metric_crime":              0.3,
                "metric_bureaucracy":        0.3,
            ], 0.0)

        case .authoritarian:
            return ([
                "metric_economy":            0.3,
                "metric_liberty":           -0.8,
                "metric_equality":          -0.5,
                "metric_corruption":         0.6,
                "metric_foreign_relations": -0.5,
                "metric_democracy":         -0.7,
                "metric_public_order":       0.4,
                "metric_military":           0.4,
                "metric_unrest":             0.2,
                "metric_foreign_influence":  0.2,
            ], 0.0)

        case .economicPopulist:
            return ([
                "metric_economy":            1.2,
                "metric_inflation":          0.5,
                "metric_health":             0.1,
                "metric_foreign_relations": -0.4,
                "metric_equality":           0.2,
                "metric_housing":            0.3,
                "metric_economic_bubble":    0.6,
                "metric_democracy":         -0.1,
            ], 0.0)

        case .warmonger:
            let shockAdd = -3.5
            return ([
                "metric_military":           0.7,
                "metric_foreign_relations": -1.2,
                "metric_economy":           -0.6,
                "metric_public_order":      -0.3,
                "metric_unrest":             0.5,
                "metric_foreign_influence":  0.3,
                "metric_sovereignty":        0.2,
                "metric_liberty":           -0.3,
                "metric_health":            -0.2,
            ], shockAdd)

        case .neglectSpiral:
            return ([
                "metric_housing":           -0.3,
                "metric_innovation":        -0.1,
                "metric_bureaucracy":        0.2,
            ], 0.0)

        case .economicBoomCrash:
            // Turns 1-20: strong positive economy stimulus (boom phase)
            // Turns 21+: neutral — no active policy; bubble deflation resisted by residual inflation
            if turn <= 20 {
                return ([
                    "metric_economy":           1.5,
                    "metric_inflation":         0.3,
                    "metric_economic_bubble":   0.4,
                    "metric_housing":           0.2,
                ], 0.0)
            } else {
                return ([:], 0.0)
            }
        }
    }
}

// MARK: - Crisis Tracking

struct CrisisTrigger {
    let name: String
    let turn: Int
}

struct BubbleSnapshot {
    let turn: Int
    let value: Double
}

struct SimResult {
    let profile: Profile
    let gameLengthName: String
    let maxTurns: Int
    let approvalHistory: [(turn: Int, approval: Double)]
    let bubbleHistory: [BubbleSnapshot]
    let finalMetrics: [String: Double]
    let crises: [CrisisTrigger]
    let endedEarlyTurn: Int?
    let peakApproval: Double
    let troughApproval: Double
    let diplomaticShockHistory: [(turn: Int, shock: Double)]
}

// MARK: - Simulator

func runSimulation(profile: Profile, maxTurns: Int, gameLengthName: String) -> SimResult {
    var state = SimState.baseline()

    calculateApproval(&state)

    var approvalHistory: [(Int, Double)] = [(0, state.metrics["metric_approval"] ?? 50)]
    var bubbleHistory: [BubbleSnapshot] = []
    var crises: [CrisisTrigger] = []
    var endedEarlyTurn: Int? = nil
    var peakApproval = state.metrics["metric_approval"] ?? 50.0
    var troughApproval = state.metrics["metric_approval"] ?? 50.0
    var diplomaticShockHistory: [(Int, Double)] = []

    var unrestCrisisFired    = false
    var bubbleCrisisFired    = false
    var influenceCrisisFired = false
    var approvalCrisisFired  = false

    let bubbleCheckpoints: Set<Int> = [30, 60, 90, 120]

    for turn in 1...maxTurns {
        state.turn = turn

        let (profileDeltas, shockAccum) = profile.deltas(turn: turn, state: state)
        for (key, delta) in profileDeltas {
            let j = jitter(0.5)
            let current = state.metrics[key] ?? 50.0
            state.metrics[key] = clamp(current + delta + j)
        }

        if shockAccum != 0 {
            let current = state.hiddenMetrics["diplomaticShock"] ?? 0.0
            state.hiddenMetrics["diplomaticShock"] = current + shockAccum
        }

        applyOrganicDrift(&state)
        calculateApproval(&state)

        let approval = state.metrics["metric_approval"] ?? 50.0
        if approval > peakApproval   { peakApproval = approval }
        if approval < troughApproval { troughApproval = approval }

        if turn % 5 == 0 || turn == maxTurns {
            approvalHistory.append((turn, approval))
        }

        if bubbleCheckpoints.contains(turn) || turn == maxTurns {
            let bv = state.metrics["metric_economic_bubble"] ?? 0.0
            bubbleHistory.append(BubbleSnapshot(turn: turn, value: bv))
        }

        if profile == .warmonger {
            if let shock = state.hiddenMetrics["diplomaticShock"] {
                if turn % 5 == 0 || turn == maxTurns {
                    diplomaticShockHistory.append((turn, shock))
                }
            }
        }

        if !unrestCrisisFired, let unrest = state.metrics["metric_unrest"], unrest >= 70 {
            crises.append(CrisisTrigger(name: "UNREST CRISIS (unrest>=70)", turn: turn))
            unrestCrisisFired = true
        }
        if !bubbleCrisisFired, let bubble = state.metrics["metric_economic_bubble"], bubble >= 80 {
            crises.append(CrisisTrigger(name: "BUBBLE CRISIS (bubble>=80)", turn: turn))
            bubbleCrisisFired = true
        }
        if !influenceCrisisFired, let inf = state.metrics["metric_foreign_influence"], inf >= 75 {
            crises.append(CrisisTrigger(name: "INFLUENCE CRISIS (influence>=75)", turn: turn))
            influenceCrisisFired = true
        }
        if !approvalCrisisFired, approval < 20 {
            crises.append(CrisisTrigger(name: "APPROVAL CRISIS (approval<20)", turn: turn))
            approvalCrisisFired = true
        }

        let coreMetrics = ["metric_economy", "metric_health", "metric_public_order",
                           "metric_equality", "metric_foreign_relations"]
        let lowCoreCount = coreMetrics.filter { (state.metrics[$0] ?? 50) < 20 }.count

        if approval < 15 || lowCoreCount >= 3 {
            endedEarlyTurn = turn
            break
        }
    }

    return SimResult(
        profile: profile,
        gameLengthName: gameLengthName,
        maxTurns: maxTurns,
        approvalHistory: approvalHistory,
        bubbleHistory: bubbleHistory,
        finalMetrics: state.metrics,
        crises: crises,
        endedEarlyTurn: endedEarlyTurn,
        peakApproval: peakApproval,
        troughApproval: troughApproval,
        diplomaticShockHistory: diplomaticShockHistory
    )
}

// MARK: - Output

enum Alignment { case left, right }

func pad(_ s: String, _ width: Int, _ align: Alignment = .left) -> String {
    if s.count >= width { return String(s.prefix(width)) }
    let padding = String(repeating: " ", count: width - s.count)
    switch align {
    case .left:  return s + padding
    case .right: return padding + s
    }
}

func fmt(_ v: Double) -> String { String(format: "%.1f", v) }

func divider(_ c: Character = "=", _ n: Int = 80) -> String {
    String(repeating: c, count: n)
}

func oneLineAssessment(_ result: SimResult) -> String {
    let approval = result.finalMetrics["metric_approval"] ?? 50.0
    let ended = result.endedEarlyTurn != nil
    let prof = result.profile

    switch prof {
    case .goodGovernance:
        if approval > 65 { return "Realistic: sustained governance investment drives steady approval growth." }
        return "Plausible: good governance but randomness kept approval near median."
    case .badGovernance:
        if ended { return "Realistic: neglect compounded — cascade failure triggered before game end." }
        if approval < 40 { return "Realistic: chronic mismanagement erodes approval into danger zone." }
        return "Plausible: bad governance hurts but hasn't yet crossed failure thresholds."
    case .authoritarian:
        if approval < 45 { return "Realistic: liberty/equality collapse drags approval despite economic maintenance." }
        return "Plausible: authoritarian tradeoff — order maintained but long-run approval cost visible."
    case .economicPopulist:
        if result.crises.contains(where: { $0.name.contains("BUBBLE") }) {
            return "Realistic: populist boom feeds bubble; bubble crisis triggers approval shock."
        }
        return "Plausible: populist economy boost competes with inflation drag; long runs expose fragility."
    case .warmonger:
        if ended { return "Realistic: diplomatic shock and war costs grind approval below survival floor." }
        return "Plausible: warmonger degrades foreign/economy; short game can survive on military rally."
    case .neglectSpiral:
        if ended { return "Realistic: housing neglect seeds cascade — equality/crime/unrest spiral triggers failure." }
        if approval < 50 { return "Realistic: slow neglect spiral visible; cascade accelerates once thresholds breach." }
        return "Marginal: neutral policy isn't enough to trigger full cascade in this run length."
    case .economicBoomCrash:
        if result.crises.contains(where: { $0.name.contains("BUBBLE") }) {
            return "Realistic: boom-phase bubble accumulation crossed crisis threshold — market crash confirmed."
        }
        let bubble = result.finalMetrics["metric_economic_bubble"] ?? 0.0
        if bubble > 50 {
            return "Plausible: significant bubble built during boom; crash narrowly avoided — longer run would trigger it."
        }
        return "Marginal: boom phase did not build enough bubble; check coefficients."
    }
}

func printResult(_ result: SimResult) {
    let endedStr = result.endedEarlyTurn.map { "EARLY END turn \($0)" } ?? "completed"
    print(divider("-", 80))
    print("  \(result.profile.name.uppercased())  |  \(result.gameLengthName.uppercased()) (\(result.maxTurns) turns)  |  \(endedStr)")
    print(divider("-", 80))

    print("  Approval trajectory (every 5 turns):")
    let cols = result.approvalHistory.prefix(24)
    var row = "  "
    for (t, a) in cols {
        row += "T\(pad(String(t), 3, .right)):\(pad(fmt(a), 5, .right))  "
        if row.count > 72 { print(row); row = "  " }
    }
    if row.trimmingCharacters(in: .whitespaces) != "" { print(row) }

    print("  Peak: \(fmt(result.peakApproval))   Trough: \(fmt(result.troughApproval))   Final: \(fmt(result.finalMetrics["metric_approval"] ?? 50))")

    // Bubble snapshots at checkpoints
    if !result.bubbleHistory.isEmpty {
        var brow = "  Bubble snapshots: "
        for snap in result.bubbleHistory {
            brow += "T\(snap.turn)=\(fmt(snap.value))  "
        }
        print(brow)
    }

    print()
    print("  Final Metrics:")
    let keyMetrics: [(String, String)] = [
        ("metric_economy",           "Economy       "),
        ("metric_inflation",         "Inflation     "),
        ("metric_health",            "Health        "),
        ("metric_public_order",      "Public Order  "),
        ("metric_crime",             "Crime         "),
        ("metric_unrest",            "Unrest        "),
        ("metric_equality",          "Equality      "),
        ("metric_foreign_relations", "Foreign Rel   "),
        ("metric_liberty",           "Liberty       "),
        ("metric_military",          "Military      "),
        ("metric_corruption",        "Corruption    "),
        ("metric_innovation",        "Innovation    "),
        ("metric_bureaucracy",       "Bureaucracy   "),
        ("metric_foreign_influence", "Foreign Inf   "),
        ("metric_economic_bubble",   "Econ Bubble   "),
        ("metric_sovereignty",       "Sovereignty   "),
        ("metric_housing",           "Housing       "),
        ("metric_energy",            "Energy        "),
        ("metric_democracy",         "Democracy     "),
    ]

    var col = 0
    var line = "  "
    for (key, label) in keyMetrics {
        let v = result.finalMetrics[key] ?? 0.0
        let star = isInverse(key) ? (v > 60 ? "!" : " ") : (v < 25 ? "!" : " ")
        line += "\(label)\(pad(fmt(v), 6, .right))\(star)  "
        col += 1
        if col % 3 == 0 { print(line); line = "  " }
    }
    if line.trimmingCharacters(in: .whitespaces) != "" { print(line) }

    if result.crises.isEmpty {
        print()
        print("  Crises: none")
    } else {
        print()
        print("  Crises triggered:")
        for c in result.crises {
            print("    Turn \(pad(String(c.turn), 4, .right)): \(c.name)")
        }
    }

    if !result.diplomaticShockHistory.isEmpty {
        print()
        print("  Diplomatic Shock (hiddenMetrics[\"diplomaticShock\"]):")
        var srow = "  "
        for (t, s) in result.diplomaticShockHistory.prefix(24) {
            srow += "T\(pad(String(t), 3, .right)):\(pad(fmt(s), 7, .right))  "
            if srow.count > 72 { print(srow); srow = "  " }
        }
        if srow.trimmingCharacters(in: .whitespaces) != "" { print(srow) }
    }

    print()
    print("  Assessment: \(oneLineAssessment(result))")
    print()
}

// MARK: - Main

print(divider("=", 80))
print("  ADMINISTRATION GAME — SCORING SIMULATION")
print("  Profiles: \(Profile.allCases.count)   Game lengths: short(30) / medium(60) / long(120)")
print("  Formula rev: political saturation, bubble accumulation, housing cascades,")
print("               demand-pull inflation x0.025, energy supply-shock x0.015,")
print("               economy->housing, democracy<->liberty<->corruption loop,")
print("               innovation->economy, health decay in crisis, deflation x0.008")
print("  Jitter: ±0.5 per decision delta per turn")
print(divider("=", 80))
print()

let gameLengths: [(String, Int)] = [("short", 30), ("medium", 60), ("long", 120)]

for profile in Profile.allCases {
    print(divider("#", 80))
    print("##  PROFILE: \(profile.name.uppercased())")
    print(divider("#", 80))
    print()
    for (name, turns) in gameLengths {
        let result = runSimulation(profile: profile, maxTurns: turns, gameLengthName: name)
        printResult(result)
    }
}

print(divider("=", 80))
print("  SIMULATION COMPLETE")
print(divider("=", 80))
