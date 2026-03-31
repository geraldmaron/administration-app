import SwiftUI

struct NewsTickerView: View {
    @ObservedObject var gameStore: GameStore
    @State private var showHistory = false
    @State private var tickerOffset: CGFloat = 0
    @State private var tickerWidth: CGFloat = 0
    @State private var containerWidth: CGFloat = 0

    private static let globalHeadlines: [String] = [
        "Markets react to central bank policy signals · Investors cautious ahead of G20 summit",
        "UN Security Council convenes emergency session on regional tensions",
        "Climate summit delegates reach provisional agreement on emissions targets",
        "Global supply chain disruptions ease as shipping costs stabilize",
        "International aid organizations warn of worsening humanitarian situation in conflict zones",
        "Tech sector faces new regulatory scrutiny across multiple jurisdictions",
        "Energy prices volatile amid geopolitical uncertainty in key export regions",
        "World leaders convene at Davos amid rising economic nationalism",
        "International court delivers landmark ruling on territorial waters dispute",
        "Pandemic preparedness committee issues stark warning on global health readiness",
        "Refugee crisis deepens as border disputes escalate in eastern region",
        "Space agency announces joint mission with international partners",
        "Global food security index falls for third consecutive year",
        "Cybersecurity alliance formed following wave of state-sponsored attacks",
    ]

    private var allHeadlines: [String] {
        let playerHeadlines = Array(gameStore.state.newsHistory.prefix(8))
            .compactMap { $0.headline ?? $0.title }
        let turn = gameStore.state.turn
        let globalIdx = turn % Self.globalHeadlines.count
        let globalSlice = [Self.globalHeadlines[globalIdx],
                           Self.globalHeadlines[(globalIdx + 3) % Self.globalHeadlines.count]]
        return (playerHeadlines + globalSlice).uniqued()
    }

    private var tickerLabel: (text: String, color: Color) {
        let first = gameStore.state.newsHistory.first
        if first?.isAlert == true { return ("BREAKING", AppColors.error) }
        if first?.isBackgroundEvent == true { return ("BACKGROUND", AppColors.warning) }
        return ("LIVE", AppColors.accentPrimary)
    }

    var body: some View {
        Button(action: { showHistory = true }) {
            HStack(spacing: 0) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(tickerLabel.color)
                        .frame(width: 6, height: 6)
                    Text(tickerLabel.text)
                        .font(.system(size: 8, weight: .black, design: .monospaced))
                        .foregroundColor(AppColors.background)
                        .tracking(1.5)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 0)
                .frame(height: 26)
                .background(tickerLabel.color)

                Rectangle()
                    .fill(tickerLabel.color.opacity(0.4))
                    .frame(width: 1, height: 26)

                GeometryReader { geo in
                    let full = allHeadlines.joined(separator: "   ·    ")
                    Text(full)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(AppColors.foreground.opacity(0.92))
                        .fixedSize()
                        .offset(x: tickerOffset)
                        .onAppear {
                            containerWidth = geo.size.width
                            DispatchQueue.main.async {
                                startTicker(text: full, width: geo.size.width)
                            }
                        }
                        .onChange(of: allHeadlines) { _, _ in
                            let updated = allHeadlines.joined(separator: "   ·    ")
                            DispatchQueue.main.async {
                                startTicker(text: updated, width: containerWidth)
                            }
                        }
                }
                .clipped()
            }
            .frame(height: 26)
            .background(AppColors.backgroundElevated)
            .overlay(
                Rectangle()
                    .stroke(AppColors.border, lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showHistory) {
            NewsHistoryView(gameStore: gameStore)
        }
    }

    private func startTicker(text: String, width: CGFloat) {
        let charWidth: CGFloat = 6.2
        let textWidth = CGFloat(text.count) * charWidth
        let totalTravel = width + textWidth
        tickerOffset = width
        withAnimation(Animation.linear(duration: Double(totalTravel / 28.0)).repeatForever(autoreverses: false)) {
            tickerOffset = -textWidth
        }
    }
}

private extension Array where Element: Equatable {
    func uniqued() -> [Element] {
        var seen: [Element] = []
        for item in self { if !seen.contains(item) { seen.append(item) } }
        return seen
    }
}

struct NewsHistoryView: View {
    @ObservedObject var gameStore: GameStore
    @Environment(\.dismiss) private var dismiss
    @State private var selectedArticle: NewsArticle? = nil

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("NEWS ARCHIVE")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.accentPrimary)
                            .tracking(3)
                        Text("INTELLIGENCE FEED")
                            .font(.system(size: 22, weight: .black))
                            .foregroundColor(AppColors.foreground)
                    }
                    Spacer()
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                }
                .padding(20)
                .background(AppColors.backgroundMuted)

                Rectangle().fill(AppColors.border).frame(height: 1)

                if gameStore.state.newsHistory.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "newspaper")
                            .font(.system(size: 40))
                            .foregroundColor(AppColors.foregroundSubtle)
                        Text("No news yet")
                            .font(.system(size: 14, weight: .regular, design: .monospaced))
                            .foregroundColor(AppColors.foregroundMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 8) {
                            ForEach(gameStore.state.newsHistory) { article in
                                NewsArticleRow(article: article, state: gameStore.state)
                                    .onTapGesture { selectedArticle = article }
                            }
                        }
                        .padding(16)
                    }
                }
            }
        }
        .sheet(item: $selectedArticle) { article in
            NewsArticleDetailView(article: article, state: gameStore.state)
        }
    }
}

struct NewsArticleRow: View {
    let article: NewsArticle
    let state: GameState

    private var urgencyColor: Color {
        article.isAlert == true ? AppColors.error : AppColors.foregroundSubtle
    }

    private var backgroundEventLabel: String? {
        guard article.isBackgroundEvent == true else { return nil }
        if article.id.hasPrefix("world_") { return "WORLD EVENT" }
        if article.id.hasPrefix("cabinet_") { return "CABINET" }
        return "BACKGROUND"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(urgencyColor)
                .frame(height: 2)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(state.formattedDate(forTurn: article.turn))
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.accentPrimary)
                        .tracking(2)
                    Spacer()
                    if let bgLabel = backgroundEventLabel {
                        Text(bgLabel)
                            .font(AppTypography.micro)
                            .foregroundColor(AppColors.warning)
                            .tracking(1)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(AppColors.warning.opacity(0.12))
                    }
                    if let category = article.category {
                        Text(category.uppercased())
                            .font(AppTypography.micro)
                            .foregroundColor(article.isAlert == true ? urgencyColor : AppColors.foregroundSubtle)
                            .tracking(1)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background((article.isAlert == true ? urgencyColor : AppColors.foregroundSubtle).opacity(0.1))
                    }
                }
                Text(article.headline ?? article.title ?? article.summary)
                    .font(AppTypography.caption)
                    .fontWeight(.bold)
                    .foregroundColor(AppColors.foreground)
                    .lineLimit(2)
                Text(article.summary)
                    .font(AppTypography.bodySmall)
                    .foregroundColor(AppColors.foregroundMuted)
                    .lineLimit(2)
            }
            .padding(12)
        }
        .background(AppColors.backgroundMuted)
        .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
    }
}

struct NewsArticleDetailView: View {
    let article: NewsArticle
    let state: GameState
    @Environment(\.dismiss) private var dismiss

    private var urgencyColor: Color {
        article.isAlert == true ? AppColors.error : AppColors.accentPrimary
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("THE ADMINISTRATION TIMES")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foreground)
                                    .tracking(4)
                                Text("OFFICIAL INTELLIGENCE DISPATCH — \(state.formattedDate(forTurn: article.turn))")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                    .tracking(1)
                            }
                            Spacer()
                            Button(action: { dismiss() }) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(AppColors.foregroundMuted)
                                    .padding(8)
                                    .background(AppColors.backgroundElevated)
                                    .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
                            }
                            .accessibilityLabel("Close article")
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 12)

                    HStack(spacing: 0) {
                        Rectangle().fill(urgencyColor).frame(width: 4)
                        HStack {
                            if article.isAlert == true {
                                Text("ALERT")
                                    .font(AppTypography.micro)
                                    .foregroundColor(urgencyColor)
                                    .tracking(2)
                            }
                            if article.isBackgroundEvent == true {
                                let bgLabel: String = article.id.hasPrefix("world_") ? "WORLD EVENT" : article.id.hasPrefix("cabinet_") ? "CABINET" : "BACKGROUND"
                                Text(bgLabel)
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.warning)
                                    .tracking(2)
                            }
                            if let category = article.category {
                                let prefix = (article.isAlert == true || article.isBackgroundEvent == true) ? "·  " : ""
                                Text("\(prefix)\(category.uppercased())")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foregroundSubtle)
                                    .tracking(1)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(urgencyColor.opacity(0.06))
                    }
                    .frame(height: 30)

                    Rectangle().fill(AppColors.accentPrimary).frame(height: 2).padding(.horizontal, 20)

                    VStack(alignment: .leading, spacing: 16) {
                        Text(article.headline ?? article.title ?? "Executive Briefing")
                            .font(AppTypography.displayMedium)
                            .foregroundColor(AppColors.foreground)
                            .tracking(-0.5)
                            .fixedSize(horizontal: false, vertical: true)

                        Rectangle().fill(AppColors.border).frame(height: 1)

                        Text(article.summary)
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.foreground.opacity(0.9))
                            .fixedSize(horizontal: false, vertical: true)
                            .lineSpacing(5)

                        if let content = article.content, !content.isEmpty {
                            Rectangle().fill(AppColors.border).frame(height: 1)

                            Text(content)
                                .font(AppTypography.bodySmall)
                                .foregroundColor(AppColors.foregroundMuted)
                                .fixedSize(horizontal: false, vertical: true)
                                .lineSpacing(4)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 48)
                }
            }
        }
    }
}
