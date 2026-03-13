/// ScreenHeader
/// Unified header component used across all main screens.
/// Renders a protocol status label, screen title, optional subtitle,
/// and optional trailing action content.
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
                HStack(spacing: 6) {
                    Circle()
                        .fill(AppColors.success)
                        .frame(width: 6, height: 6)
                        .accentGlow(color: AppColors.success, radius: 4)

                    Text(protocolLabel)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.success.opacity(0.85))
                        .tracking(3)
                }

                Text(title)
                    .font(AppTypography.title)
                    .foregroundColor(AppColors.foreground)
                    .tracking(-1)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(AppTypography.label)
                        .foregroundColor(AppColors.foregroundMuted)
                        .tracking(1)
                }
            }

            Spacer()
            trailing
        }
        .padding(.top, AppSpacing.lg)
    }
}
