import SwiftUI
import MapKit

struct GlobeTarget: Equatable {
    let latitude: Double
    let longitude: Double

    static let zero = GlobeTarget(latitude: 0, longitude: 0)

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

struct GlobeBackgroundView: View {
    var target: GlobeTarget? = nil
    var showPulse: Bool = false

    static let zoomedDistance: Double = 4_500_000

    var body: some View {
        ZStack {
            if let t = target {
                TargetedGlobeMap(target: t)
            } else {
                IdleGlobeMap()
            }

            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            if showPulse && target != nil {
                RadarPulseOverlay()
                    .allowsHitTesting(false)
            }
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

// MARK: - Targeted Globe (locked on a country)

private struct TargetedGlobeMap: View {
    let target: GlobeTarget

    private static let approachDistance: Double = 12_000_000

    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $position, interactionModes: []) {}
            .mapStyle(.imagery(elevation: .flat))
            .allowsHitTesting(false)
            .saturation(0)
            .onAppear {
                position = .camera(MapCamera(
                    centerCoordinate: target.coordinate,
                    distance: Self.approachDistance
                ))
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(.easeInOut(duration: 2.0)) {
                        position = .camera(MapCamera(
                            centerCoordinate: target.coordinate,
                            distance: GlobeBackgroundView.zoomedDistance
                        ))
                    }
                }
            }
            .onChange(of: target) { _, newTarget in
                withAnimation(.easeOut(duration: 1.0)) {
                    position = .camera(MapCamera(
                        centerCoordinate: newTarget.coordinate,
                        distance: Self.approachDistance
                    ))
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    withAnimation(.easeInOut(duration: 2.0)) {
                        position = .camera(MapCamera(
                            centerCoordinate: newTarget.coordinate,
                            distance: GlobeBackgroundView.zoomedDistance
                        ))
                    }
                }
            }
    }
}

// MARK: - Idle Globe (slow rotation, no target)

private struct IdleGlobeMap: View {
    @State private var position: MapCameraPosition = .camera(
        MapCamera(centerCoordinate: CLLocationCoordinate2D(latitude: 20, longitude: 0), distance: 28_000_000)
    )
    @State private var longitude: Double = 0

    var body: some View {
        Map(position: $position, interactionModes: []) {}
            .mapStyle(.imagery(elevation: .flat))
            .allowsHitTesting(false)
            .saturation(0)
            .onReceive(
                Foundation.Timer.publish(every: 1.0 / 15.0, on: .main, in: .common).autoconnect()
            ) { _ in
                longitude += 0.15
                if longitude > 180 { longitude -= 360 }
                position = .camera(MapCamera(
                    centerCoordinate: CLLocationCoordinate2D(latitude: 20, longitude: longitude),
                    distance: 28_000_000
                ))
            }
    }
}

// MARK: - Radar Pulse Overlay (CoD heartbeat sensor style)

private struct RadarPulseOverlay: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            Canvas { context, size in
                let cx = size.width * 0.5
                let cy = size.height * 0.5
                let elapsed = timeline.date.timeIntervalSinceReferenceDate
                let accent = AppColors.accentPrimary

                let pulseCount = 3
                let cycleDuration = 2.5
                let pulseFraction = elapsed.truncatingRemainder(dividingBy: cycleDuration) / cycleDuration
                let maxPulseRadius = min(size.width, size.height) * 0.3

                for i in 0..<pulseCount {
                    let offset = Double(i) / Double(pulseCount)
                    let t = (pulseFraction + offset).truncatingRemainder(dividingBy: 1.0)
                    let pulseR = CGFloat(t) * maxPulseRadius
                    let alpha = (1.0 - t) * 0.5

                    var ring = Path()
                    ring.addEllipse(in: CGRect(
                        x: cx - pulseR, y: cy - pulseR,
                        width: pulseR * 2, height: pulseR * 2
                    ))
                    context.stroke(ring, with: .color(accent.opacity(alpha)), lineWidth: 1.5)

                    if t < 0.25 {
                        context.fill(ring, with: .color(accent.opacity(alpha * 0.06)))
                    }
                }

                let pipR: CGFloat = 5.0
                context.fill(
                    Path(ellipseIn: CGRect(x: cx - pipR * 2.5, y: cy - pipR * 2.5, width: pipR * 5, height: pipR * 5)),
                    with: .color(accent.opacity(0.15))
                )
                context.fill(
                    Path(ellipseIn: CGRect(x: cx - pipR, y: cy - pipR, width: pipR * 2, height: pipR * 2)),
                    with: .color(accent.opacity(0.85))
                )

                let crossLen: CGFloat = 10
                var cross = Path()
                cross.move(to: CGPoint(x: cx - crossLen, y: cy))
                cross.addLine(to: CGPoint(x: cx - pipR - 2, y: cy))
                cross.move(to: CGPoint(x: cx + pipR + 2, y: cy))
                cross.addLine(to: CGPoint(x: cx + crossLen, y: cy))
                cross.move(to: CGPoint(x: cx, y: cy - crossLen))
                cross.addLine(to: CGPoint(x: cx, y: cy - pipR - 2))
                cross.move(to: CGPoint(x: cx, y: cy + pipR + 2))
                cross.addLine(to: CGPoint(x: cx, y: cy + crossLen))
                context.stroke(cross, with: .color(accent.opacity(0.5)), lineWidth: 0.8)
            }
        }
    }
}
