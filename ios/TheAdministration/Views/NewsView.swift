import SwiftUI

struct NewsTickerView: View {
    @ObservedObject var gameStore: GameStore
    @State private var showHistory = false
    @State private var tickerOffset: CGFloat = 0

    private var latestArticles: [NewsArticle] {
        Array(gameStore.state.newsHistory.prefix(10))
    }

    private var headlines: [String] {
        latestArticles.compactMap { $0.headline ?? $0.title }
    }

    private var urgencyColor: Color {
        latestArticles.first?.isAlert == true ? AppColors.error : AppColors.accentPrimary
    }

    var body: some View {
        if !headlines.isEmpty {
            Button(action: { showHistory = true }) {
                HStack(spacing: 0) {
                    Text("BREAKING")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.background)
                        .tracking(2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(urgencyColor)

                    GeometryReader { geo in
                        let joined = headlines.joined(separator: "   ·   ")
                        Text(joined)
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundColor(AppColors.foreground.opacity(0.9))
                            .fixedSize()
                            .offset(x: tickerOffset)
                            .onAppear { startAnimation(containerWidth: geo.size.width) }
                    }
                    .clipped()
                }
                .frame(height: 28)
                .background(AppColors.backgroundMuted)
                .overlay(Rectangle().stroke(AppColors.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $showHistory) {
                NewsHistoryView(gameStore: gameStore)
            }
        }
    }

    private func startAnimation(containerWidth: CGFloat) {
        let estimatedTextWidth = CGFloat(headlines.joined(separator: "   ·   ").count) * 6.0
        tickerOffset = containerWidth
        withAnimation(
            .linear(duration: Double(estimatedTextWidth / 60))
            .repeatForever(autoreverses: false)
        ) {
            tickerOffset = -estimatedTextWidth
        }
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
                                NewsArticleRow(article: article)
                                    .onTapGesture { selectedArticle = article }
                            }
                        }
                        .padding(16)
                    }
                }
            }
        }
        .sheet(item: $selectedArticle) { article in
            NewsArticleDetailView(article: article)
        }
    }
}

struct NewsArticleRow: View {
    let article: NewsArticle

    private var urgencyColor: Color {
        article.isAlert == true ? AppColors.error : AppColors.foregroundSubtle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Urgency indicator strip
            Rectangle()
                .fill(urgencyColor)
                .frame(height: 2)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("TURN \(article.turn)")
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.accentPrimary)
                        .tracking(2)
                    Spacer()
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
    @Environment(\.dismiss) private var dismiss

    private var urgencyColor: Color {
        article.isAlert == true ? AppColors.error : AppColors.accentPrimary
    }

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Masthead
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("THE ADMINISTRATION TIMES")
                                    .font(AppTypography.micro)
                                    .foregroundColor(AppColors.foreground)
                                    .tracking(4)
                                Text("OFFICIAL INTELLIGENCE DISPATCH — TURN \(article.turn)")
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

                    // Urgency + category strip
                    HStack(spacing: 0) {
                        Rectangle().fill(urgencyColor).frame(width: 4)
                        HStack {
                            if article.isAlert == true {
                                Text("ALERT")
                                    .font(AppTypography.micro)
                                    .foregroundColor(urgencyColor)
                                    .tracking(2)
                            }
                            if let category = article.category {
                                Text(article.isAlert == true ? "·  \(category.uppercased())" : category.uppercased())
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
