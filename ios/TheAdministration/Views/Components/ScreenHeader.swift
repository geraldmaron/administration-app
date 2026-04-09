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
                    VStack(alignment: .leading, spacing: 4) {
                        Text(protocolLabel)
                            .font(AppTypography.protocolLabel)
                            .tracking(1.5)
                            .foregroundColor(AppColors.accentPrimary.opacity(0.4))

                        Rectangle()
                            .fill(AppColors.accentPrimary.opacity(0.3))
                            .frame(height: 2)
                    }
                }

                Text(title.uppercased())
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(AppColors.foreground)
                    .tracking(0.5)

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
