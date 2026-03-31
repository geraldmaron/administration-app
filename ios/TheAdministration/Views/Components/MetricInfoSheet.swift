import SwiftUI

struct MetricInfoContext: Identifiable {
    let metricId: String
    let value: Double
    let history: [Double]
    var id: String { metricId }
}

struct MetricInfoSheet: View {
    let context: MetricInfoContext
    @Environment(\.dismiss) private var dismiss

    private var info: MetricInfo? { MetricCatalogue.info[context.metricId] }
    private var displayName: String {
        context.metricId
            .replacingOccurrences(of: "metric_", with: "")
            .replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
    }
    private var isInverse: Bool { info?.isInverse ?? ScoringEngine.isInverseMetric(context.metricId) }
    private var adjustedValue: Double { isInverse ? 100 - context.value : context.value }
    private var grade: String { MetricFormatting.letterGrade(for: context.value, metricId: context.metricId, isInverse: isInverse) }
    private var gradeColor: Color { AppColors.gradeColor(for: grade) }
    private var metricColor: Color { AppColors.metricColor(for: CGFloat(context.value), metricId: context.metricId, isInverse: isInverse) }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            if let category = info?.category {
                                Text(category.uppercased())
                                    .font(.system(size: 9, weight: .black, design: .monospaced))
                                    .foregroundColor(AppColors.accentPrimary)
                                    .tracking(2)
                            }
                            Text(displayName)
                                .font(.system(size: 22, weight: .black))
                                .foregroundColor(AppColors.foreground)
                        }
                        Spacer()
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(AppColors.foregroundMuted)
                                .padding(8)
                                .background(AppColors.backgroundElevated)
                                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 16)

                    Rectangle().fill(AppColors.border).frame(height: 1)

                    // Current value + grade
                    HStack(spacing: 0) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CURRENT")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                Text(String(format: "%.1f", context.value) + "%")
                                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                                    .foregroundColor(metricColor)
                                    .monospacedDigit()
                                if isInverse {
                                    Text("(lower is better)")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(AppColors.foregroundSubtle)
                                }
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)

                        Rectangle().fill(AppColors.border).frame(width: 1)

                        VStack(alignment: .center, spacing: 4) {
                            Text("GRADE")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)
                            Text(grade)
                                .font(.system(size: 28, weight: .black, design: .monospaced))
                                .foregroundColor(gradeColor)
                        }
                        .padding(16)
                        .frame(width: 90)
                    }
                    .background(AppColors.backgroundMuted)

                    Rectangle().fill(AppColors.border).frame(height: 1)

                    // Trend sparkline
                    if context.history.count > 1 {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("TREND")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)
                            MetricSparkline(history: context.history, color: metricColor)
                                .frame(height: 36)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)

                        Rectangle().fill(AppColors.border).frame(height: 1)
                    }

                    // Description
                    if let desc = info?.description {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("OVERVIEW")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)
                            Text(desc)
                                .font(.system(size: 14, weight: .regular))
                                .foregroundColor(AppColors.foreground.opacity(0.9))
                                .lineSpacing(4)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)

                        Rectangle().fill(AppColors.border).frame(height: 1)
                    }

                    // Key factors
                    if let factors = info?.factors, !factors.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("KEY FACTORS")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundColor(AppColors.foregroundSubtle)
                                .tracking(2)
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(factors, id: \.self) { factor in
                                    HStack(alignment: .top, spacing: 8) {
                                        Rectangle()
                                            .fill(metricColor)
                                            .frame(width: 2, height: 14)
                                            .padding(.top, 2)
                                        Text(factor)
                                            .font(.system(size: 13, weight: .regular))
                                            .foregroundColor(AppColors.foregroundMuted)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 16)

                        Rectangle().fill(AppColors.border).frame(height: 1)
                    }

                    // Grade scale
                    VStack(alignment: .leading, spacing: 10) {
                        Text("GRADE SCALE")
                            .font(.system(size: 8, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(2)
                        VStack(spacing: 4) {
                            ForEach(gradeScaleBands, id: \.grades) { band in
                                gradeScaleRow(grades: band.grades, range: band.range, label: band.label, color: band.color)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                    .padding(.bottom, 16)
                }
            }
        }
    }

    private struct GradeScaleBand {
        let grades: String
        let range: String
        let label: String
        let color: Color
    }

    private var gradeScaleBands: [GradeScaleBand] {
        if let t = AppColors.metricThresholds[context.metricId] {
            let c = Int(t.critical)
            let l = Int(t.low)
            let h = Int(t.high)
            return [
                GradeScaleBand(grades: "A-  –  A+", range: "\(h)–100",    label: "Exceptional", color: AppColors.metricHigh),
                GradeScaleBand(grades: "B-  –  B+", range: "\(l)–\(h-1)", label: "Strong",      color: AppColors.metricHealthy),
                GradeScaleBand(grades: "C-  –  C+", range: "\(c)–\(l-1)", label: "Adequate",    color: AppColors.warning),
                GradeScaleBand(grades: "D-  –  D+", range: "1–\(c-1)",    label: "Struggling",  color: AppColors.error.opacity(0.75)),
                GradeScaleBand(grades: "F",          range: "0",           label: "Critical",    color: AppColors.error),
            ]
        }
        return [
            GradeScaleBand(grades: "A+  –  A",  range: "82–100", label: "Excellent",  color: AppColors.metricHigh),
            GradeScaleBand(grades: "A-  –  B",  range: "65–81",  label: "Healthy",    color: AppColors.metricHealthy),
            GradeScaleBand(grades: "B-  –  C",  range: "48–64",  label: "Adequate",   color: AppColors.warning),
            GradeScaleBand(grades: "C-  –  D",  range: "28–47",  label: "Struggling", color: AppColors.error.opacity(0.75)),
            GradeScaleBand(grades: "F",          range: "0–27",   label: "Critical",   color: AppColors.error),
        ]
    }

    private func gradeScaleRow(grades: String, range: String, label: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Text(grades)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(color)
                .frame(width: 70, alignment: .leading)
            Text(range)
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundColor(AppColors.foregroundSubtle)
                .frame(width: 50, alignment: .leading)
            Text(label)
                .font(.system(size: 11, weight: .regular))
                .foregroundColor(AppColors.foregroundMuted)
        }
        .padding(.vertical, 3)
    }
}

private struct MetricSparkline: View {
    let history: [Double]
    let color: Color

    var body: some View {
        let recent = Array(history.suffix(12))
        let minV = recent.min() ?? 0
        let maxV = max(recent.max() ?? 100, minV + 1)
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let step = w / CGFloat(max(recent.count - 1, 1))
            ZStack(alignment: .bottomLeading) {
                Path { path in
                    for (i, val) in recent.enumerated() {
                        let x = CGFloat(i) * step
                        let y = h - CGFloat((val - minV) / (maxV - minV)) * h
                        if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                        else { path.addLine(to: CGPoint(x: x, y: y)) }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))

                if let last = recent.last {
                    let x = CGFloat(recent.count - 1) * step
                    let y = h - CGFloat((last - minV) / (maxV - minV)) * h
                    Circle()
                        .fill(color)
                        .frame(width: 5, height: 5)
                        .position(x: x, y: y)
                }
            }
        }
    }
}
