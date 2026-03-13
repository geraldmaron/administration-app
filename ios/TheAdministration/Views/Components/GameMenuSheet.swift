import SwiftUI

/// GameMenuSheet
/// Runtime-generated game menu presenting context and actions including quit and restart.
struct GameMenuSheet: View {
    @ObservedObject var gameStore: GameStore
    let onQuitToMain: () -> Void

    @Environment(\.dismiss) private var dismiss

    private var canControlGame: Bool {
        gameStore.state.status == .active
    }

    private var statusLine: String {
        let turn = gameStore.state.turn
        let maxTurns = gameStore.state.maxTurns
        let phase = gameStore.state.phase
        let status = gameStore.state.status
        return "Turn \(turn) of \(maxTurns) · \(phaseDisplay(phase)) · \(statusDisplay(status))"
    }

    private func phaseDisplay(_ phase: GamePhase) -> String {
        switch phase {
        case .early: return "Early Phase"
        case .mid: return "Mid Phase"
        case .late: return "Late Phase"
        case .endgame: return "Endgame"
        }
    }

    private func statusDisplay(_ status: GameStatus) -> String {
        switch status {
        case .setup: return "Setup"
        case .active: return "Active"
        case .paused: return "Paused"
        case .ended: return "Ended"
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("ADMINISTRATION STATUS") {
                    Text(statusLine)
                        .font(AppTypography.bodySmall)
                        .foregroundColor(AppColors.foregroundMuted)
                }

                Section("ACTIONS") {
                    if gameStore.state.isSetup {
                        Button {
                            HapticEngine.shared.selection()
                            gameStore.saveGame()
                            dismiss()
                        } label: {
                            Text("Save Game")
                        }

                        Button {
                            HapticEngine.shared.selection()
                            dismiss()
                        } label: {
                            Text("Load Save")
                        }
                    }

                    Button {
                        HapticEngine.shared.light()
                        dismiss()
                    } label: {
                        Text("Theme")
                    }

                    if canControlGame {
                        Button(role: .destructive) {
                            HapticEngine.shared.heavy()
                            gameStore.resetGame()
                            dismiss()
                        } label: {
                            Text("Restart Administration")
                        }

                        Button(role: .destructive) {
                            HapticEngine.shared.heavy()
                            gameStore.resetGame()
                            onQuitToMain()
                            dismiss()
                        } label: {
                            Text("Quit to Main Menu")
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle("Command Menu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(AppColors.accentPrimary)
                }
            }
        }
    }
}

