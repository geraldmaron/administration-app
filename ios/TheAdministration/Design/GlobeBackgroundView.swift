import SwiftUI

struct GlobeTarget: Equatable {
    let latitude: Double
    let longitude: Double

    static let zero = GlobeTarget(latitude: 0, longitude: 0)
}

struct GlobeBackgroundView: View {
    var target: GlobeTarget? = nil
    var showPulse: Bool = false

    var body: some View {
        ZStack {
            WireframeGlobeView(target: target, showPulse: showPulse)

            AppColors.accentPrimary.opacity(0.035)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        }
    }

    // MARK: - Capital Coordinates (50 playable countries)

    static let capitalCoordinates: [String: GlobeTarget] = [
        "ar": GlobeTarget(latitude: -34.6, longitude: -58.4),
        "at": GlobeTarget(latitude: 48.2, longitude: 16.4),
        "au": GlobeTarget(latitude: -35.3, longitude: 149.1),
        "br": GlobeTarget(latitude: -15.8, longitude: -47.9),
        "ca": GlobeTarget(latitude: 45.4, longitude: -75.7),
        "ch": GlobeTarget(latitude: 46.9, longitude: 7.4),
        "cl": GlobeTarget(latitude: -33.4, longitude: -70.7),
        "cn": GlobeTarget(latitude: 39.9, longitude: 116.4),
        "co": GlobeTarget(latitude: 4.6, longitude: -74.1),
        "cu": GlobeTarget(latitude: 23.1, longitude: -82.4),
        "de": GlobeTarget(latitude: 52.5, longitude: 13.4),
        "eg": GlobeTarget(latitude: 30.0, longitude: 31.2),
        "es": GlobeTarget(latitude: 40.4, longitude: -3.7),
        "et": GlobeTarget(latitude: 9.0, longitude: 38.7),
        "fr": GlobeTarget(latitude: 48.9, longitude: 2.3),
        "gb": GlobeTarget(latitude: 51.5, longitude: -0.1),
        "gh": GlobeTarget(latitude: 5.6, longitude: -0.2),
        "gr": GlobeTarget(latitude: 37.9, longitude: 23.7),
        "id": GlobeTarget(latitude: -6.2, longitude: 106.8),
        "ie": GlobeTarget(latitude: 53.3, longitude: -6.3),
        "il": GlobeTarget(latitude: 31.8, longitude: 35.2),
        "in": GlobeTarget(latitude: 28.6, longitude: 77.2),
        "iq": GlobeTarget(latitude: 33.3, longitude: 44.4),
        "ir": GlobeTarget(latitude: 35.7, longitude: 51.4),
        "it": GlobeTarget(latitude: 41.9, longitude: 12.5),
        "jm": GlobeTarget(latitude: 18.0, longitude: -76.8),
        "jp": GlobeTarget(latitude: 35.7, longitude: 139.7),
        "ke": GlobeTarget(latitude: -1.3, longitude: 36.8),
        "kp": GlobeTarget(latitude: 39.0, longitude: 125.8),
        "kr": GlobeTarget(latitude: 37.6, longitude: 127.0),
        "mx": GlobeTarget(latitude: 19.4, longitude: -99.1),
        "my": GlobeTarget(latitude: 3.1, longitude: 101.7),
        "ng": GlobeTarget(latitude: 9.1, longitude: 7.5),
        "nl": GlobeTarget(latitude: 52.4, longitude: 4.9),
        "no": GlobeTarget(latitude: 59.9, longitude: 10.8),
        "nz": GlobeTarget(latitude: -41.3, longitude: 174.8),
        "pe": GlobeTarget(latitude: -12.0, longitude: -77.0),
        "ph": GlobeTarget(latitude: 14.6, longitude: 121.0),
        "pk": GlobeTarget(latitude: 33.7, longitude: 73.0),
        "pl": GlobeTarget(latitude: 52.2, longitude: 21.0),
        "ru": GlobeTarget(latitude: 55.8, longitude: 37.6),
        "sa": GlobeTarget(latitude: 24.7, longitude: 46.7),
        "se": GlobeTarget(latitude: 59.3, longitude: 18.1),
        "sg": GlobeTarget(latitude: 1.3, longitude: 103.8),
        "th": GlobeTarget(latitude: 13.8, longitude: 100.5),
        "tr": GlobeTarget(latitude: 39.9, longitude: 32.9),
        "ua": GlobeTarget(latitude: 50.4, longitude: 30.5),
        "us": GlobeTarget(latitude: 38.9, longitude: -77.0),
        "vn": GlobeTarget(latitude: 21.0, longitude: 105.8),
        "za": GlobeTarget(latitude: -25.7, longitude: 28.2),
    ]
}

// MARK: - Wireframe Globe View

private struct WireframeGlobeView: View {
    let target: GlobeTarget?
    let showPulse: Bool

    @State private var displayLon: Double = 10.0

    private let idleTimer = Timer.publish(every: 1.0 / 15.0, on: .main, in: .common).autoconnect()

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            let elapsed = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                renderGlobe(ctx: context, size: size, elapsed: elapsed)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .onReceive(idleTimer) { _ in
            guard target == nil else { return }
            displayLon += 0.20
            if displayLon > 180 { displayLon -= 360 }
        }
        .onAppear {
            if let t = target { displayLon = t.longitude }
        }
        .onChange(of: target) { _, newTarget in
            if let t = newTarget {
                withAnimation(.easeInOut(duration: 1.8)) { displayLon = t.longitude }
            }
        }
    }

    // MARK: - Globe Rendering

    private func renderGlobe(ctx: GraphicsContext, size: CGSize, elapsed: Double) {
        let accent = AppColors.accentPrimary
        let cx = size.width * 0.5
        let cy = size.height * 0.44
        let R = min(size.width, size.height) * 0.50

        let elevDeg = 22.0
        let elevRad = elevDeg * .pi / 180.0
        let cosE = cos(elevRad)
        let sinE = sin(elevRad)
        let centerLon = displayLon

        // Orthographic projection with elevation tilt.
        // Viewing from elevation angle above equatorial plane.
        // right axis = (0,1,0), up axis = (-sinE,0,cosE)
        // P = (cos(φ)cos(λ), cos(φ)sin(λ), sin(φ))
        // screen_x = R * cos(φ) * sin(λ)
        // screen_y = R * (sinE*cos(φ)*cos(λ) − cosE*sin(φ))
        // visible  = cosE*cos(φ)*cos(λ) + sinE*sin(φ) > 0
        func project(lat: Double, lon: Double) -> (CGPoint, Bool) {
            let phi = lat * .pi / 180.0
            let lam = (lon - centerLon) * .pi / 180.0
            let cosPhi = cos(phi), sinPhi = sin(phi)
            let cosLam = cos(lam), sinLam = sin(lam)
            let sx = R * cosPhi * sinLam
            let sy = R * (sinE * cosPhi * cosLam - cosE * sinPhi)
            let visible = cosE * cosPhi * cosLam + sinE * sinPhi > 0
            return (CGPoint(x: cx + sx, y: cy + sy), visible)
        }

        // Globe outline
        var outline = Path()
        outline.addEllipse(in: CGRect(x: cx - R, y: cy - R, width: R * 2, height: R * 2))
        ctx.stroke(outline, with: .color(accent.opacity(0.18)), lineWidth: 0.75)

        // Latitude parallels — sample lon from center−90° to center+90° (visible hemisphere)
        let latitudes: [(Double, Double)] = [
            (-60, 0.055), (-30, 0.065), (0, 0.105), (30, 0.065), (60, 0.055)
        ]
        for (lat, opacity) in latitudes {
            var path = Path()
            var started = false
            for step in 0...180 {
                let lon = centerLon - 90.0 + Double(step)
                let (pt, visible) = project(lat: lat, lon: lon)
                if visible {
                    if !started { path.move(to: pt); started = true }
                    else { path.addLine(to: pt) }
                } else {
                    started = false
                }
            }
            ctx.stroke(path, with: .color(accent.opacity(opacity)), lineWidth: 0.5)
        }

        // Longitude meridians
        for lonOffset in stride(from: -150.0, through: 180.0, by: 30.0) {
            let lon = centerLon + lonOffset
            var path = Path()
            var started = false
            let opacity: Double = abs(lonOffset) < 1.0 ? 0.11 : 0.06
            for step in 0...170 {
                let lat = -85.0 + Double(step)
                let (pt, visible) = project(lat: lat, lon: lon)
                if visible {
                    if !started { path.move(to: pt); started = true }
                    else { path.addLine(to: pt) }
                } else {
                    started = false
                }
            }
            ctx.stroke(path, with: .color(accent.opacity(opacity)), lineWidth: 0.5)
        }

        // Capital city pips
        for cap in GlobeBackgroundView.capitalCoordinates.values {
            let (pt, visible) = project(lat: cap.latitude, lon: cap.longitude)
            guard visible else { continue }
            let dotR: CGFloat = 1.4
            ctx.fill(
                Path(ellipseIn: CGRect(x: pt.x - dotR, y: pt.y - dotR, width: dotR * 2, height: dotR * 2)),
                with: .color(accent.opacity(0.22))
            )
        }

        // Target acquisition indicator — replaces the generic radar pulse
        guard showPulse, let t = target else { return }
        let (tPt, tVisible) = project(lat: t.latitude, lon: t.longitude)
        guard tVisible else { return }

        // Single slow expanding ring tied to the actual country position
        let phase = CGFloat(elapsed.truncatingRemainder(dividingBy: 3.2) / 3.2)
        let ringR = phase * 32.0
        let ringAlpha = (1.0 - phase) * 0.5
        if ringR > 1 {
            var ring = Path()
            ring.addEllipse(in: CGRect(x: tPt.x - ringR, y: tPt.y - ringR, width: ringR * 2, height: ringR * 2))
            ctx.stroke(ring, with: .color(accent.opacity(ringAlpha)), lineWidth: 0.9)
        }

        // Crosshair arms with gap
        let reticleR: CGFloat = 7.0
        let gap: CGFloat = 3.5
        let arm: CGFloat = 11.0

        var crosshair = Path()
        crosshair.move(to: CGPoint(x: tPt.x - reticleR - arm, y: tPt.y))
        crosshair.addLine(to: CGPoint(x: tPt.x - reticleR - gap, y: tPt.y))
        crosshair.move(to: CGPoint(x: tPt.x + reticleR + gap, y: tPt.y))
        crosshair.addLine(to: CGPoint(x: tPt.x + reticleR + arm, y: tPt.y))
        crosshair.move(to: CGPoint(x: tPt.x, y: tPt.y - reticleR - arm))
        crosshair.addLine(to: CGPoint(x: tPt.x, y: tPt.y - reticleR - gap))
        crosshair.move(to: CGPoint(x: tPt.x, y: tPt.y + reticleR + gap))
        crosshair.addLine(to: CGPoint(x: tPt.x, y: tPt.y + reticleR + arm))
        ctx.stroke(crosshair, with: .color(accent.opacity(0.72)), lineWidth: 0.8)

        // Reticle circle
        var reticle = Path()
        reticle.addEllipse(in: CGRect(x: tPt.x - reticleR, y: tPt.y - reticleR, width: reticleR * 2, height: reticleR * 2))
        ctx.stroke(reticle, with: .color(accent.opacity(0.5)), lineWidth: 0.8)

        // Center pip
        let pipR: CGFloat = 2.0
        ctx.fill(
            Path(ellipseIn: CGRect(x: tPt.x - pipR, y: tPt.y - pipR, width: pipR * 2, height: pipR * 2)),
            with: .color(accent.opacity(0.9))
        )
    }
}
