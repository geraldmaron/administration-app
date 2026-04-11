import SwiftUI

// The Administration wordmark — a geometric capital A that reads simultaneously
// as a pen nib (statecraft) and a warhead (force). Stroke-only; no fill.
// See docs/design.md for full geometry specification.
struct BrandMarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        // Canonical viewport: 100 × 120 units
        let vw: CGFloat = 100
        let vh: CGFloat = 120

        let sx = rect.width / vw
        let sy = rect.height / vh

        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }

        // Crossbar intersections at y=64 on the two legs:
        // Left leg: from (50,4) to (8,116), parameterized at y=64 → t=(64-4)/(116-4)=60/112
        // x = 50 + t*(8-50) = 50 - 60/112 * 42 ≈ 27.5
        // Right leg: mirror → ≈ 72.5
        let crossbarY: CGFloat = 64
        let legSlope: CGFloat = (116 - 4) / (50 - 8) // dy/dx of left leg (going outward)
        let tLeft = (crossbarY - 4) / (116 - 4)
        let crossLeftX = 50 - tLeft * (50 - 8)
        let crossRightX = 50 + tLeft * (50 - 8)

        var path = Path()

        // Single connected A-shape: left nib tip → left foot → apex → right foot → right nib tip
        // One continuous stroke means the apex is a clean miter join, not a doubled overlap.
        path.move(to: pt(14, 110))
        path.addLine(to: pt(14, 116))
        path.addLine(to: pt(8, 116))
        path.addLine(to: pt(50, 4))
        path.addLine(to: pt(92, 116))
        path.addLine(to: pt(86, 116))
        path.addLine(to: pt(86, 110))

        // Crossbar
        path.move(to: pt(crossLeftX, crossbarY))
        path.addLine(to: pt(crossRightX, crossbarY))

        return path
    }
}

struct BrandMark: View {
    var color: Color = AppColors.accentPrimary
    var size: CGFloat = 100

    private var strokeWidth: CGFloat { size * 0.048 }

    var body: some View {
        BrandMarkShape()
            .stroke(color, style: StrokeStyle(
                lineWidth: strokeWidth,
                lineCap: .butt,
                lineJoin: .miter,
                miterLimit: 20
            ))
            .frame(width: size, height: size * 1.2)
    }
}

#Preview {
    ZStack {
        Color(red: 0.016, green: 0.020, blue: 0.027).ignoresSafeArea()
        VStack(spacing: 40) {
            BrandMark(size: 120)
            BrandMark(color: AppColors.accentTertiary, size: 60)
            BrandMark(color: AppColors.accentSecondary, size: 32)
        }
    }
}
