import Foundation

enum MetricFormatting {

    static func letterGrade(for value: Double) -> String {
        switch value {
        case 90...100: return "A+"
        case 82..<90:  return "A"
        case 77..<82:  return "A-"
        case 72..<77:  return "B+"
        case 65..<72:  return "B"
        case 60..<65:  return "B-"
        case 55..<60:  return "C+"
        case 48..<55:  return "C"
        case 42..<48:  return "C-"
        case 37..<42:  return "D+"
        case 28..<37:  return "D"
        case 20..<28:  return "D-"
        default:       return "F"
        }
    }

    static func letterGrade(for value: Double, metricId: String, isInverse: Bool = false) -> String {
        let effective = isInverse ? 100 - value : value
        guard let t = AppColors.metricThresholds[metricId] else {
            return letterGrade(for: effective)
        }
        let critical = Double(t.critical)
        let low = Double(t.low)
        let high = Double(t.high)
        switch effective {
        case high...:
            let pos = (effective - high) / max(100.0 - high, 1)
            if pos >= 2.0/3.0 { return "A+" }
            if pos >= 1.0/3.0 { return "A" }
            return "A-"
        case low..<high:
            let pos = (effective - low) / max(high - low, 1)
            if pos >= 2.0/3.0 { return "B+" }
            if pos >= 1.0/3.0 { return "B" }
            return "B-"
        case critical..<low:
            let pos = (effective - critical) / max(low - critical, 1)
            if pos >= 2.0/3.0 { return "C+" }
            if pos >= 1.0/3.0 { return "C" }
            return "C-"
        default:
            let pos = effective / max(critical, 1)
            if pos >= 0.75 { return "D+" }
            if pos >= 0.50 { return "D" }
            if pos >= 0.25 { return "D-" }
            return "F"
        }
    }

    // Returns the display string for a metric value.
    // In .percentage mode: "54.3"  (caller appends % where needed)
    // In .letter mode: "B+" (inverse correction applied automatically)
    static func metricDisplayValue(value: Double, format: ScoreDisplayFormat, metricId: String = "") -> String {
        switch format {
        case .percentage:
            return String(format: "%.1f", value)
        case .letter:
            let isInverse = ScoringEngine.isInverseMetric(metricId)
            return letterGrade(for: value, metricId: metricId, isInverse: isInverse)
        }
    }

    // Formats a delta for display, e.g. "+1.3%" or "-0.7%".
    // Very small non-zero deltas show as "< 0.1%".
    static func metricDeltaString(_ delta: Double) -> String {
        let abs = Swift.abs(delta)
        if abs < 0.05 { return "< 0.1%" }
        let formatted = String(format: "%.1f", abs)
        return delta >= 0 ? "+\(formatted)%" : "-\(formatted)%"
    }
}
