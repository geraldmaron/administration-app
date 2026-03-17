/// WelcomeView
/// Brand landing screen for The Administration.
/// Cinematic heavy terminal boot sequence — four-phase staggered reveal.
import SwiftUI

struct WelcomeView: View {
    @ObservedObject var gameStore: GameStore
    @Binding var showWelcome: Bool

    @State private var gridVisible = false
    @State private var titleVisible = false
    @State private var subtitleVisible = false
    @State private var ctasVisible = false
    @State private var showQuickStartSheet = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Film grain texture
            Canvas { context, size in
                var rng = SystemRandomNumberGenerator()
                let count = Int(size.width * size.height / 800)
                for _ in 0..<count {
                    let x = CGFloat.random(in: 0..<size.width, using: &rng)
                    let y = CGFloat.random(in: 0..<size.height, using: &rng)
                    let opacity = Double.random(in: 0.015...0.06, using: &rng)
                    let radius = CGFloat.random(in: 0.3...1.0, using: &rng)
                    context.fill(
                        Path(ellipseIn: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2)),
                        with: .color(.white.opacity(opacity))
                    )
                }
            }
            .ignoresSafeArea()

            // Subtle horizontal scanlines — tech terminal feel
            Canvas { context, size in
                let spacing: CGFloat = 80
                var y: CGFloat = 0
                while y < size.height {
                    var path = Path()
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    context.stroke(path, with: .color(.white.opacity(0.03)), lineWidth: 1)
                    y += spacing
                }
            }
            .ignoresSafeArea()
            .opacity(gridVisible ? 1 : 0)
            .animation(.easeIn(duration: 0.5), value: gridVisible)

            // Radial vignette
            RadialGradient(
                colors: [.clear, .black.opacity(0.55)],
                center: .center,
                startRadius: UIScreen.main.bounds.width * 0.3,
                endRadius: UIScreen.main.bounds.width * 1.1
            )
            .ignoresSafeArea()

            // Clearance level — top right, near-invisible
            VStack {
                HStack {
                    Spacer()
                    Text("CLEARANCE LEVEL ALPHA")
                        .font(.system(size: 9, weight: .medium))
                        .tracking(2)
                        .foregroundColor(AppColors.foregroundSubtle.opacity(0.4))
                        .padding(.trailing, 24)
                        .padding(.top, 16)
                }
                Spacer()
            }

            VStack(spacing: 0) {
                Spacer()

                // Brand mark
                VStack(spacing: 4) {
                    Text("THE")
                        .font(.system(size: 12, weight: .medium))
                        .tracking(8)
                        .foregroundColor(AppColors.foregroundMuted)

                    Text("ADMINISTRATION")
                        .font(.system(size: 52, weight: .black))
                        .tracking(4)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.231, green: 0.510, blue: 0.965),
                                    Color(red: 0.831, green: 0.667, blue: 0.173),
                                    .white
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                }
                .opacity(titleVisible ? 1 : 0)
                .offset(y: titleVisible ? 0 : 12)
                .animation(.easeOut(duration: 0.5), value: titleVisible)

                // Divider draws in + subtitle fades in
                VStack(spacing: 0) {
                    GeometryReader { geometry in
                        Rectangle()
                            .fill(AppColors.border)
                            .frame(width: subtitleVisible ? geometry.size.width : 0, height: 1)
                            .animation(.easeOut(duration: 0.5), value: subtitleVisible)
                    }
                    .frame(height: 1)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)

                    Text("POLITICAL STRATEGY SIMULATION")
                        .font(.system(size: 11, weight: .medium))
                        .tracking(4)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                .opacity(subtitleVisible ? 1 : 0)
                .animation(.easeOut(duration: 0.4), value: subtitleVisible)

                Spacer()

                // CTAs
                VStack(spacing: 12) {
                    Button(action: {
                        HapticEngine.shared.medium()
                        withAnimation(AppMotion.standard) {
                            showWelcome = false
                        }
                    }) {
                        Text("BEGIN")
                    }
                    .buttonStyle(CommandButtonStyle(isEnabled: true))

                    Button(action: {
                        HapticEngine.shared.medium()
                        showQuickStartSheet = true
                    }) {
                        Text("QUICK START")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .sheet(isPresented: $showQuickStartSheet) {
                        QuickStartSheet(gameStore: gameStore, showWelcome: $showWelcome)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 52)
                .opacity(ctasVisible ? 1 : 0)
                .offset(y: ctasVisible ? 0 : 16)
                .animation(.easeOut(duration: 0.4), value: ctasVisible)
            }
        }
        .onAppear {
            gridVisible = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { titleVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { subtitleVisible = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) { ctasVisible = true }
        }
    }
}
