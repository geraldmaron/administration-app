/// ScreenHeader
/// Unified header component used across all main screens.
/// Clean left-aligned title with optional subtitle and trailing action content.
import SwiftUI

struct ScreenHeader<TrailingContent: View>: View {
    let protocolLabel: String
    let title: String
    let subtitle: String?
    @ViewBuilder let trailing: TrailingContent

    init(
        protocolLabel: String,
        title: String,
        subtitle: String? = nil,
        @ViewBuilder trailing: () -> TrailingContent = { EmptyView() }
    ) {
        self.protocolLabel = protocolLabel
        self.title = title
        self.subtitle = subtitle
        self.trailing = trailing()
    }

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                if !protocolLabel.isEmpty {
                    Text(protocolLabel)
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .tracking(1.5)
                        .foregroundColor(AppColors.foregroundSubtle.opacity(0.5))
                }

                Text(title.uppercased())
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(AppColors.foreground)
                    .tracking(1.5)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.foregroundMuted)
                }
            }

            Spacer()
            trailing
        }
        .padding(.top, AppSpacing.lg)
    }
}
