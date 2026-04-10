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

        let globeRect = CGRect(x: cx - R, y: cy - R, width: R * 2, height: R * 2)

        // Ocean sphere fill
        var oceanPath = Path()
        oceanPath.addEllipse(in: globeRect)
        ctx.fill(oceanPath, with: .color(accent.opacity(0.04)))

        // Globe outline
        var outline = Path()
        outline.addEllipse(in: globeRect)
        ctx.stroke(outline, with: .color(accent.opacity(0.22)), lineWidth: 0.75)

        // Continent fills — simplified but recognisable polygons
        // Build a clipped path for each continent using only visible hemisphere points.
        // When a point crosses the horizon we close the current subpath and start fresh
        // for the next visible run, producing correct partial fills without back-hemisphere artifacts.
        func continentPath(for coords: [(Double, Double)]) -> Path {
            var path = Path()
            var runStart: CGPoint? = nil
            for (lat, lon) in coords {
                let (pt, visible) = project(lat: lat, lon: lon)
                if visible {
                    if runStart == nil {
                        path.move(to: pt)
                        runStart = pt
                    } else {
                        path.addLine(to: pt)
                    }
                } else {
                    if runStart != nil {
                        path.closeSubpath()
                        runStart = nil
                    }
                }
            }
            if runStart != nil { path.closeSubpath() }
            return path
        }

        // Continent outlines — simplified Natural Earth 110m coastlines.
        // Each polygon is a single CCW ring of (lat, lon) pairs. Only forward-facing
        // (visible) points are connected; back-hemisphere arcs are skipped automatically
        // by continentPath(for:) which breaks the subpath at the horizon.
        let continents: [[(Double, Double)]] = [
            // Africa — clockwise from Morocco/Gibraltar
            [(35.8,-5.9),(37.3,10.0),(33.1,11.6),(30.8,25.0),(30.9,32.3),
             (29.9,32.5),(22.0,37.0),(12.6,43.5),(11.8,51.3),(10.4,51.1),
             (2.0,45.3),(1.7,41.6),(-1.5,40.4),(-4.7,39.5),(-10.5,40.1),
             (-15.0,40.5),(-22.0,35.4),(-26.9,32.9),(-34.4,26.5),(-34.8,20.0),
             (-34.4,18.5),(-30.0,17.9),(-26.5,15.1),(-22.0,14.3),(-17.3,11.8),
             (-5.9,12.1),(1.5,9.3),(4.1,6.4),(5.3,-4.1),(5.1,-8.5),
             (9.5,-13.8),(14.7,-17.3),(20.8,-17.1),(27.9,-13.0),(35.8,-5.9)],

            // Europe — clockwise: Portugal → N Atlantic coast → Scandinavia → Arctic →
            // Finland/Baltic → Black Sea coast → Turkey → Aegean → Italy → Med → Spain
            [(38.7,-9.3),(43.6,-8.2),(43.4,-1.8),(51.5,2.5),(53.5,8.6),
             (57.8,10.5),(62.5,6.1),(65.7,14.3),(71.0,25.8),(70.1,29.5),
             (65.0,28.0),(60.2,25.0),(57.5,21.5),(54.7,20.5),(50.5,24.0),
             (46.5,30.2),(45.4,29.5),(44.3,33.5),(41.2,29.1),(40.9,25.0),
             (38.0,23.7),(36.5,22.5),(38.0,20.5),(40.5,18.5),(38.1,15.6),
             (37.9,12.5),(43.0,11.0),(43.8,8.4),(43.4,3.2),(42.4,-3.3),
             (40.4,-8.6),(38.7,-9.3)],

            // Asia — clockwise from Bosphorus: Turkey N coast → Caucasus →
            // Central Asia → Siberia → Far East → China/Vietnam coast → Malay
            // Peninsula (E coast down, W coast up) → Myanmar → Bay of Bengal →
            // India (E coast S → tip → W coast N) → Pakistan → Makran →
            // Oman → Yemen → Red Sea → Suez → Levant → Turkey → Bosphorus
            [(41.2,29.1),(42.0,35.0),(43.5,40.0),(43.0,51.0),(38.5,53.0),
             (37.0,57.0),(38.5,63.4),(41.2,72.9),(43.7,87.3),(48.5,87.5),
             (53.5,92.0),(55.8,98.0),(58.0,105.0),(50.0,127.0),(47.8,135.2),
             (42.0,131.0),(35.6,129.4),(32.5,128.0),(26.0,119.9),(22.0,114.0),
             (21.0,109.5),(17.5,107.0),(13.0,100.5),(10.5,104.0),(5.0,103.1),
             (1.3,103.8),(3.5,102.5),(5.6,99.8),(10.0,98.5),(16.0,98.0),
             (18.5,93.8),(20.0,93.0),(22.0,92.2),(23.6,90.5),
             (20.5,87.0),(17.5,83.5),(13.1,80.3),(8.1,77.5),
             (9.9,76.3),(13.5,74.8),(15.5,73.8),(18.9,72.8),(22.7,70.0),
             (23.6,68.4),(24.9,67.0),(25.0,62.0),(26.5,57.1),(23.6,58.6),
             (17.0,54.1),(15.0,51.2),(12.6,45.0),(15.0,43.0),(21.5,39.0),
             (29.5,32.7),(30.9,32.3),(31.7,34.5),(33.5,35.2),(36.5,36.2),
             (41.0,36.5),(41.2,29.1)],

            // North America — clockwise: Pacific NW → Alaska → Arctic coast →
            // E Canada → US E coast → Florida → Gulf → Mexico → Central America →
            // back up Pacific coast
            [(60.0,-141.0),(64.0,-166.0),(66.5,-168.0),(71.5,-161.0),(71.5,-141.0),
             (73.0,-120.0),(72.5,-100.0),(70.5,-85.0),(63.0,-68.0),(60.0,-65.0),
             (47.4,-53.0),(44.7,-63.6),(44.0,-66.1),(38.9,-74.9),(35.3,-75.5),
             (25.1,-80.7),(20.0,-87.5),(15.5,-87.0),(9.0,-83.7),(8.4,-82.8),
             (9.5,-79.5),(9.5,-75.6),(12.5,-71.7),(10.6,-61.5),(9.5,-60.0),
             (10.6,-61.5),(9.5,-75.6),(8.4,-82.8),(9.0,-83.7),(15.5,-87.0),
             (21.0,-90.0),(20.0,-97.0),(19.5,-104.0),(22.0,-106.0),(24.0,-110.5),
             (27.0,-115.0),(32.5,-117.0),(38.0,-122.5),(40.5,-124.0),(48.5,-124.5),
             (54.0,-130.0),(56.0,-133.0),(58.5,-137.0),(60.0,-141.0)],

            // South America — clockwise: Venezuela NE → Guyana coast → Brazil bulge
            // → E coast → Patagonia → Tierra del Fuego → Chile → N Pacific coast
            [(12.5,-71.7),(10.6,-61.6),(8.3,-60.7),(5.8,-57.1),(4.2,-51.6),
             (0.4,-50.0),(-1.4,-48.5),(-5.1,-35.1),(-8.3,-34.9),(-12.9,-38.5),
             (-19.9,-40.1),(-23.0,-43.2),(-28.5,-48.8),(-33.7,-53.4),(-34.9,-57.9),
             (-40.0,-62.0),(-43.3,-65.0),(-51.7,-59.1),(-54.9,-64.5),(-55.9,-67.2),
             (-53.8,-70.9),(-46.4,-75.3),(-33.5,-71.7),(-27.1,-70.9),(-18.4,-70.4),
             (-14.1,-76.2),(-8.1,-79.0),(-2.2,-79.9),(1.4,-79.0),(7.2,-77.1),
             (8.5,-76.6),(10.8,-73.0),(12.5,-71.7)],

            // Australia
            [(-14.1,126.5),(-14.9,124.8),(-16.5,122.1),(-20.5,116.5),(-22.0,114.0),
             (-31.8,115.6),(-34.0,121.0),(-34.5,128.0),(-35.1,135.9),(-38.0,140.0),
             (-38.5,146.0),(-37.5,148.0),(-33.0,151.5),(-26.0,153.0),(-18.0,147.5),
             (-15.0,145.5),(-11.0,142.5),(-12.5,136.0),(-14.1,126.5)],

            // Greenland
            [(83.5,-33.0),(83.0,-20.0),(76.0,-18.5),(72.0,-22.0),(68.0,-30.0),
             (60.5,-44.0),(65.5,-52.0),(72.0,-58.0),(76.0,-58.0),(80.0,-56.0),
             (83.5,-33.0)]
        ]

        var continentUnion = Path()
        for coords in continents {
            continentUnion.addPath(continentPath(for: coords))
        }

        // Clip continent fills to globe disc using a nested layer
        ctx.drawLayer { layerCtx in
            var clipPath = Path()
            clipPath.addEllipse(in: globeRect)
            layerCtx.clip(to: clipPath)
            layerCtx.fill(continentUnion, with: .color(accent.opacity(0.14)))
            layerCtx.stroke(continentUnion, with: .color(accent.opacity(0.32)), lineWidth: 0.6)
        }

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
