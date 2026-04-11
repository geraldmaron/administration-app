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
    @State private var displayLat: Double = 22.0

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
            // Continuous idle spin — values wrap naturally since projection is periodic.
            displayLon += 0.20
        }
        .onAppear {
            if let t = target {
                displayLon = t.longitude
                displayLat = clampCameraLat(t.latitude)
            }
        }
        .onChange(of: target) { _, newTarget in
            guard let t = newTarget else { return }
            // Take the shortest arc across the antimeridian instead of the long
            // way round: wrap delta into (-180, 180] and animate relative to current.
            var delta = (t.longitude - displayLon).truncatingRemainder(dividingBy: 360)
            if delta > 180 { delta -= 360 }
            if delta <= -180 { delta += 360 }
            let targetLon = displayLon + delta
            let targetLat = clampCameraLat(t.latitude)
            withAnimation(.easeInOut(duration: 1.2)) {
                displayLon = targetLon
                displayLat = targetLat
            }
        }
    }

    // Clamp camera latitude so poles stay visually stable (avoid gimbal flip).
    private func clampCameraLat(_ lat: Double) -> Double {
        max(-65.0, min(65.0, lat))
    }

    // MARK: - Globe Rendering

    private func renderGlobe(ctx: GraphicsContext, size: CGSize, elapsed: Double) {
        let accent = AppColors.accentPrimary
        let cx = size.width * 0.5
        let cy = size.height * 0.44
        let R = min(size.width, size.height) * 0.50

        let elevRad = displayLat * .pi / 180.0
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

        // Continent outlines — densified coastline rings (~2-3x point density
        // of Natural Earth 110m). Each polygon is a single ring of (lat, lon)
        // pairs. Only forward-facing (visible) points are connected; the
        // horizon break in continentPath(for:) handles partial-hemisphere fills.
        let continents: [[(Double, Double)]] = [
            // Africa — clockwise from Tangier
            [(35.8,-5.4),(35.2,-2.0),(35.7,0.1),(36.5,2.9),(36.9,5.3),(37.1,6.9),
             (37.3,9.8),(36.9,10.3),(33.5,11.1),(32.9,13.2),(32.4,15.2),(30.8,19.0),
             (32.1,20.1),(32.5,23.1),(31.5,25.2),(31.2,27.3),(31.1,29.9),(31.3,32.0),
             (30.4,32.3),(29.9,32.6),(28.2,33.1),(26.5,34.2),(22.0,36.9),(19.6,37.2),
             (15.6,39.5),(12.8,43.1),(11.3,43.3),(10.9,45.2),(11.5,49.8),(11.8,51.3),
             (8.4,50.0),(4.5,47.5),(2.0,45.4),(-0.4,42.5),(-3.0,40.9),(-6.8,39.3),
             (-10.3,40.5),(-14.8,40.7),(-18.8,36.9),(-19.8,34.8),(-23.9,35.5),(-25.9,32.6),
             (-28.9,32.0),(-29.8,31.0),(-33.0,27.9),(-33.9,25.6),(-34.4,22.0),(-34.8,20.0),
             (-34.4,18.5),(-32.0,18.3),(-28.6,16.4),(-26.6,15.1),(-22.9,14.5),(-18.0,11.7),
             (-13.4,12.5),(-10.7,13.4),(-8.8,13.2),(-5.9,12.1),(-4.7,11.9),(-1.8,9.4),
             (0.8,9.0),(3.7,9.6),(4.3,7.0),(6.4,3.4),(6.3,2.4),(5.6,0.0),
             (5.1,-1.8),(5.2,-4.0),(4.8,-6.0),(4.3,-9.4),(6.4,-10.5),(8.5,-13.2),
             (10.4,-15.2),(12.6,-16.5),(14.7,-17.5),(17.1,-16.0),(20.8,-17.1),(23.7,-16.0),
             (26.1,-14.5),(28.5,-11.4),(30.9,-9.8),(33.3,-8.6),(35.8,-5.4)],

            // Europe — clockwise from Lisbon: Atlantic → Scandinavia → Arctic → Baltic
            // → inland boundary through Black Sea → Aegean → Italy → Med → Iberia
            [(38.7,-9.3),(41.2,-8.7),(42.9,-9.3),(43.5,-8.4),(43.5,-5.7),(43.4,-4.1),
             (43.3,-1.8),(44.5,-1.2),(46.2,-1.2),(47.3,-2.2),(48.4,-4.8),(48.6,-1.9),
             (49.6,-1.3),(50.1,1.4),(51.0,2.5),(51.3,3.2),(51.8,4.2),(52.4,4.8),
             (53.2,4.9),(53.5,7.2),(53.7,8.1),(54.0,8.7),(54.4,9.6),(55.7,9.6),
             (56.9,8.6),(57.7,10.5),(58.9,10.0),(59.4,5.4),(60.9,4.9),(62.5,6.1),
             (63.4,10.4),(65.8,12.7),(67.3,14.6),(68.8,16.0),(69.7,19.0),(70.9,25.8),
             (70.1,28.3),(69.0,30.0),(68.9,33.1),(67.0,41.0),(64.5,40.5),(65.0,38.0),
             (60.2,25.0),(59.4,24.8),(57.5,21.5),(55.7,21.1),(54.7,20.5),(50.5,24.0),
             (46.5,30.2),(45.4,29.5),(44.3,33.5),(41.2,29.1),(40.9,25.0),(38.0,23.7),
             (36.5,22.5),(38.0,20.5),(40.5,18.5),(38.1,15.6),(37.9,12.5),(40.5,14.3),
             (43.0,11.0),(43.8,8.4),(43.4,3.2),(42.4,-3.3),(40.4,-8.6),(38.7,-9.3)],

            // Asia — clockwise from Bosphorus: Black Sea N → Siberian Arctic → Far
            // East → China/SE Asia → Malay peninsula → Bay of Bengal → India →
            // Arabian Sea → Oman → Gulf of Aden → Red Sea → Levant → back to Bosphorus
            [(41.2,29.1),(41.9,32.0),(42.9,35.0),(43.5,40.0),(45.0,45.0),(43.0,51.0),
             (42.0,47.5),(40.5,50.5),(38.5,53.0),(37.0,57.0),(36.5,61.0),(38.5,63.4),
             (40.0,67.5),(41.2,72.9),(43.7,78.0),(46.0,84.0),(48.5,87.5),(51.0,90.0),
             (53.5,92.0),(56.0,95.0),(58.0,100.0),(59.5,108.0),(62.0,115.0),(64.0,125.0),
             (66.5,130.0),(68.0,140.0),(71.0,150.0),(69.5,161.0),(66.0,172.0),(64.0,178.0),
             (60.0,170.0),(56.0,162.0),(53.0,156.0),(50.5,156.0),(47.8,155.0),(43.5,146.5),
             (40.5,141.0),(35.6,141.0),(34.0,132.0),(30.0,122.0),(26.0,119.9),(22.0,114.0),
             (21.0,109.5),(18.0,108.0),(13.0,109.2),(10.5,106.8),(8.6,104.6),(10.0,103.0),
             (13.0,100.5),(8.3,100.0),(5.6,99.8),(1.3,103.8),(2.5,102.0),(5.6,99.8),
             (8.0,98.5),(12.5,98.0),(16.0,98.0),(18.5,93.8),(20.0,93.0),(22.0,92.2),
             (21.5,89.5),(21.7,88.0),(19.0,85.0),(15.7,81.2),(13.1,80.3),(11.0,79.8),
             (8.1,77.5),(9.9,76.3),(13.0,75.0),(15.5,73.8),(18.9,72.8),(22.0,71.0),
             (22.7,69.0),(24.0,68.2),(25.0,66.5),(25.3,61.5),(25.5,57.8),(23.6,58.6),
             (22.5,59.8),(19.5,57.8),(17.0,54.1),(15.0,51.2),(12.8,45.0),(13.7,43.0),
             (16.5,42.7),(21.5,39.0),(25.5,36.8),(29.5,32.7),(30.9,32.3),(31.7,34.5),
             (33.5,35.2),(35.2,35.9),(36.5,36.2),(37.5,35.2),(39.0,32.5),(41.0,36.5),
             (42.0,34.5),(41.5,32.5),(41.2,29.1)],

            // North America — clockwise from Alaska: Arctic → Hudson Bay → E Canada
            // → US E coast → Florida → Gulf → Mexico → Central America → Baja →
            // US W coast → BC → back to Alaska
            [(60.0,-141.0),(61.0,-149.9),(60.5,-151.0),(58.3,-152.0),(58.8,-157.0),
             (62.0,-163.0),(64.5,-166.0),(66.5,-168.0),(70.3,-161.0),(71.4,-156.7),
             (71.5,-149.0),(70.5,-141.0),(70.8,-130.0),(73.0,-122.0),(73.5,-110.0),
             (72.5,-100.0),(70.0,-90.0),(63.5,-90.0),(58.0,-94.5),(56.5,-88.3),
             (60.5,-78.0),(61.0,-69.5),(58.5,-68.0),(55.5,-60.5),(52.0,-56.0),
             (50.5,-57.0),(47.6,-52.8),(46.8,-53.2),(44.7,-63.6),(45.3,-60.5),
             (43.8,-66.1),(42.5,-71.0),(41.3,-70.0),(40.5,-74.0),(38.9,-74.9),
             (36.9,-76.0),(35.3,-75.5),(33.5,-78.0),(32.0,-80.9),(30.3,-81.4),
             (25.7,-80.1),(25.1,-80.7),(26.0,-82.0),(27.8,-82.8),(29.7,-85.0),
             (29.1,-89.0),(28.9,-95.2),(27.5,-97.2),(25.8,-97.3),(22.5,-97.7),
             (21.5,-97.3),(19.8,-96.5),(18.5,-95.0),(18.6,-91.5),(21.0,-90.0),
             (21.6,-87.2),(18.5,-88.3),(16.0,-88.9),(15.5,-87.8),(13.5,-87.4),
             (12.9,-85.5),(10.7,-85.9),(9.0,-83.7),(8.4,-82.8),(9.0,-79.6),
             (9.0,-78.5),(7.5,-77.5),(8.5,-77.4),(9.4,-79.0),(13.0,-87.6),
             (15.6,-93.7),(17.5,-101.5),(19.5,-104.0),(22.0,-106.0),(23.2,-106.5),
             (24.0,-110.5),(23.0,-109.5),(26.0,-112.0),(27.0,-114.2),(28.5,-114.2),
             (30.5,-115.5),(32.5,-117.0),(34.0,-119.0),(36.0,-121.5),(38.0,-122.5),
             (40.5,-124.0),(43.5,-124.2),(46.2,-124.0),(48.5,-124.5),(50.0,-127.5),
             (52.0,-131.0),(54.5,-130.5),(56.0,-133.0),(57.0,-136.0),(58.5,-137.5),
             (60.0,-141.0)],

            // South America — clockwise from Guajira
            [(12.5,-71.7),(11.4,-69.2),(10.6,-66.9),(10.5,-63.0),(10.6,-61.6),(8.6,-60.0),
             (6.8,-58.2),(5.8,-57.1),(4.0,-52.0),(2.1,-50.8),(0.4,-50.0),(-1.4,-48.5),
             (-2.9,-44.0),(-4.3,-38.5),(-5.1,-35.1),(-8.3,-34.9),(-10.9,-37.0),(-12.9,-38.5),
             (-15.8,-39.0),(-18.5,-39.7),(-19.9,-40.1),(-22.9,-42.0),(-23.0,-43.2),(-25.4,-48.3),
             (-28.5,-48.8),(-30.5,-50.3),(-32.1,-52.1),(-33.7,-53.4),(-34.9,-57.9),(-38.0,-57.5),
             (-40.0,-62.0),(-42.8,-65.0),(-45.9,-67.5),(-50.3,-68.9),(-51.7,-69.1),(-52.4,-68.4),
             (-54.9,-64.5),(-55.9,-67.2),(-53.8,-70.9),(-52.0,-74.5),(-50.0,-74.6),(-47.5,-74.9),
             (-46.4,-75.3),(-43.0,-73.8),(-40.5,-73.5),(-37.0,-73.3),(-33.5,-71.7),(-30.0,-71.5),
             (-27.1,-70.9),(-23.6,-70.4),(-20.0,-70.2),(-18.4,-70.4),(-15.8,-75.2),(-14.1,-76.2),
             (-11.0,-77.7),(-8.1,-79.0),(-5.0,-80.9),(-2.2,-79.9),(1.4,-79.0),(4.0,-77.7),
             (7.2,-77.1),(8.5,-76.6),(9.5,-75.6),(11.0,-74.3),(12.5,-71.7)],

            // Australia
            [(-10.8,142.5),(-12.0,136.8),(-12.4,132.5),(-14.1,126.5),(-14.9,124.8),(-16.5,122.1),
             (-18.5,122.2),(-20.5,116.5),(-22.0,114.0),(-25.0,113.2),(-28.0,114.0),(-31.8,115.6),
             (-33.5,115.0),(-34.4,118.0),(-34.0,121.0),(-33.2,125.0),(-32.2,127.2),(-33.3,134.0),
             (-34.5,135.5),(-35.1,137.0),(-36.0,139.0),(-38.0,140.0),(-38.5,143.0),(-38.5,146.0),
             (-37.8,148.0),(-37.5,149.9),(-35.0,150.8),(-33.0,151.5),(-30.0,153.0),(-27.5,153.3),
             (-24.6,152.9),(-22.5,150.5),(-19.5,147.5),(-17.5,146.0),(-15.5,145.2),(-12.5,143.5),
             (-10.8,142.5)],

            // Greenland
            [(83.5,-33.0),(83.0,-20.0),(78.5,-16.5),(76.0,-18.5),(72.0,-22.0),(68.0,-30.0),
             (63.5,-40.0),(60.5,-44.0),(61.5,-48.0),(64.0,-50.5),(66.5,-52.5),(69.5,-53.5),
             (72.0,-56.0),(74.0,-57.5),(76.0,-58.0),(78.5,-60.5),(80.5,-57.0),(82.0,-50.0),
             (83.5,-33.0)],

            // British Isles
            [(58.6,-3.1),(58.2,-5.5),(56.7,-6.3),(55.2,-5.5),(54.7,-5.0),(53.4,-4.7),
             (52.4,-4.7),(51.7,-5.3),(51.0,-4.2),(50.2,-5.5),(50.4,-3.5),(50.8,-1.1),
             (51.1,1.4),(52.0,1.7),(53.5,0.4),(54.6,-0.8),(55.8,-2.0),(57.5,-2.0),
             (58.6,-3.1)],

            // Ireland
            [(55.2,-6.8),(54.6,-8.6),(53.1,-10.3),(51.4,-9.9),(51.6,-8.5),(52.2,-6.4),
             (53.3,-6.2),(54.1,-6.0),(55.2,-6.2),(55.2,-6.8)],

            // Japan (Honshu/Kyushu/Shikoku simplified ring)
            [(41.5,140.5),(40.5,141.6),(38.3,141.2),(36.8,141.0),(35.0,140.9),(33.9,139.8),
             (33.5,136.0),(33.7,132.5),(31.5,130.2),(31.0,130.6),(32.8,131.9),(34.0,131.0),
             (35.5,132.8),(37.0,136.5),(38.5,138.5),(40.5,140.0),(41.5,140.5)],

            // Madagascar
            [(-12.0,49.3),(-15.0,50.5),(-18.5,49.5),(-22.0,48.0),(-25.0,46.8),(-25.5,45.0),
             (-23.5,43.5),(-20.0,44.3),(-16.0,44.5),(-13.5,47.8),(-12.0,49.3)],

            // Indonesia — Sumatra + Java approximation
            [(5.6,95.3),(4.1,96.1),(2.1,99.0),(-1.0,102.3),(-3.5,104.5),(-5.9,105.8),
             (-6.8,108.5),(-7.8,112.5),(-8.5,115.0),(-8.3,118.0),(-8.5,119.5),(-9.0,120.0),
             (-8.0,115.0),(-6.5,107.5),(-4.0,102.0),(-1.8,100.3),(1.5,98.0),(4.5,96.5),(5.6,95.3)],

            // New Zealand — North + South simplified
            [(-34.4,172.7),(-36.0,174.6),(-37.0,175.8),(-38.0,177.2),(-39.3,177.0),(-40.5,176.3),
             (-41.2,174.8),(-41.2,173.0),(-42.5,172.5),(-44.0,171.0),(-45.9,170.5),(-46.5,168.5),
             (-46.2,166.5),(-44.0,168.0),(-42.0,171.5),(-40.5,172.8),(-38.5,174.5),(-36.5,174.0),
             (-34.8,173.0),(-34.4,172.7)]
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
