import SwiftUI

struct RadarBackgroundView: View {
    private let sweepDuration: Double = 7.0

    var body: some View {
        TimelineView(.animation) { timeline in
            let elapsed = timeline.date.timeIntervalSinceReferenceDate
            let sweep = (elapsed.truncatingRemainder(dividingBy: sweepDuration) / sweepDuration) * 360.0
            RadarCanvas(sweepDegrees: sweep)
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}

// MARK: - Canvas

private struct RadarCanvas: View {
    let sweepDegrees: Double
    private var accent: Color { AppColors.accentPrimary }

    var body: some View {
        Canvas { context, size in
            let cx = size.width * 0.5
            let cy = size.height * 0.38
            let maxR = min(size.width, size.height) * 0.74

            // -- Concentric rings --
            for i in 1...5 {
                let r = maxR * CGFloat(i) / 5.0
                var ring = Path()
                ring.addEllipse(in: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
                let ringOpacity = 0.05 + 0.015 * Double(i) // inner rings slightly dimmer
                context.stroke(ring, with: .color(accent.opacity(ringOpacity)), lineWidth: 0.5)
            }

            // -- Cardinal crosshairs --
            for angle in [0.0, 90.0] {
                let rad = Angle.degrees(angle).radians
                var line = Path()
                line.move(to: CGPoint(x: cx - maxR * cos(rad), y: cy - maxR * sin(rad)))
                line.addLine(to: CGPoint(x: cx + maxR * cos(rad), y: cy + maxR * sin(rad)))
                context.stroke(line, with: .color(accent.opacity(0.05)), lineWidth: 0.5)
            }

            // -- Diagonal hairlines --
            for angle in [45.0, 135.0] {
                let rad = Angle.degrees(angle).radians
                let d = maxR * 0.707
                var line = Path()
                line.move(to: CGPoint(x: cx - d * cos(rad), y: cy - d * sin(rad)))
                line.addLine(to: CGPoint(x: cx + d * cos(rad), y: cy + d * sin(rad)))
                context.stroke(line, with: .color(accent.opacity(0.025)), lineWidth: 0.5)
            }

            // -- Range-ring tick marks (outermost ring only) --
            for deg in stride(from: 0, through: 345, by: 15) {
                let rad = Angle.degrees(Double(deg)).radians
                let outer = maxR
                let inner = maxR * (deg % 90 == 0 ? 0.88 : 0.94)
                var tick = Path()
                tick.move(to: CGPoint(x: cx + inner * cos(rad), y: cy + inner * sin(rad)))
                tick.addLine(to: CGPoint(x: cx + outer * cos(rad), y: cy + outer * sin(rad)))
                context.stroke(tick, with: .color(accent.opacity(deg % 90 == 0 ? 0.10 : 0.06)), lineWidth: 0.5)
            }

            // -- Sweep trail wedge (60° arc behind the beam) --
            let trailSpan: Double = 60
            let beamAngle = Angle.degrees(sweepDegrees - 90)
            for layer in 0...3 {
                let fraction = Double(layer) / 3.0
                let layerStart = Angle.degrees(
                    sweepDegrees - 90 - trailSpan * (1.0 - fraction * 0.25)
                )
                var wedge = Path()
                wedge.move(to: CGPoint(x: cx, y: cy))
                wedge.addArc(center: CGPoint(x: cx, y: cy),
                             radius: maxR,
                             startAngle: layerStart,
                             endAngle: beamAngle,
                             clockwise: false)
                wedge.closeSubpath()
                context.fill(wedge, with: .color(accent.opacity(0.012 + 0.008 * fraction)))
            }

            // -- Leading beam line --
            let beamRad = beamAngle.radians
            var beam = Path()
            beam.move(to: CGPoint(x: cx, y: cy))
            beam.addLine(to: CGPoint(
                x: cx + maxR * cos(beamRad),
                y: cy + maxR * sin(beamRad)
            ))
            context.stroke(beam, with: .color(accent.opacity(0.22)), lineWidth: 1.0)

            context.stroke(beam, with: .color(accent.opacity(0.06)), lineWidth: 3.5)

            // -- Center pip --
            let pip: CGFloat = 3
            var dot = Path()
            dot.addEllipse(in: CGRect(x: cx - pip, y: cy - pip, width: pip * 2, height: pip * 2))
            context.fill(dot, with: .color(accent.opacity(0.18)))

            var cpX = Path()
            cpX.move(to: CGPoint(x: cx - 6, y: cy))
            cpX.addLine(to: CGPoint(x: cx + 6, y: cy))
            cpX.move(to: CGPoint(x: cx, y: cy - 6))
            cpX.addLine(to: CGPoint(x: cx, y: cy + 6))
            context.stroke(cpX, with: .color(accent.opacity(0.12)), lineWidth: 0.5)
        }
    }
}
