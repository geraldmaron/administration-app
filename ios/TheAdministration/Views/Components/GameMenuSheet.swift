import SwiftUI

struct GameMenuSheet: View {
    @ObservedObject var gameStore: GameStore
    let onQuitToMain: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showSaveNameAlert = false
    @State private var saveNameInput = ""
    @State private var showLoadSheet = false
    @State private var showHowToPlay = false
    @State private var showTerms = false
    @State private var showPrivacy = false

    private var canControlGame: Bool {
        gameStore.state.status == .active
    }

    private var defaultSaveName: String {
        let turn = gameStore.state.turn
        if let name = gameStore.state.player?.name {
            return "\(name) — Turn \(turn)"
        }
        return "Turn \(turn)"
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
        case .impeached: return "Removed From Office"
        case .resigned: return "Resigned"
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

                Section("INFORMATION") {
                    Button {
                        HapticEngine.shared.light()
                        showHowToPlay = true
                    } label: {
                        Text("How to Play")
                    }

                    Button {
                        HapticEngine.shared.light()
                        showPrivacy = true
                    } label: {
                        Text("Privacy & Data")
                    }

                    Button {
                        HapticEngine.shared.light()
                        showTerms = true
                    } label: {
                        Text("Terms of Service")
                    }
                }

                Section("ACTIONS") {
                    if gameStore.state.isSetup {
                        Button {
                            HapticEngine.shared.selection()
                            saveNameInput = defaultSaveName
                            showSaveNameAlert = true
                        } label: {
                            Text("Save Game")
                        }

                        Button {
                            HapticEngine.shared.selection()
                            showLoadSheet = true
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
        .alert("Name Your Save", isPresented: $showSaveNameAlert) {
            TextField("Save name", text: $saveNameInput)
            Button("Save") {
                gameStore.saveGame(named: saveNameInput.isEmpty ? nil : saveNameInput)
                dismiss()
            }
            Button("Cancel", role: .cancel) { saveNameInput = "" }
        } message: {
            Text("Enter a name for this save file.")
        }
        .sheet(isPresented: $showLoadSheet) {
            LoadGameSheet(gameStore: gameStore, onLoad: { dismiss() })
        }
        .sheet(isPresented: $showHowToPlay) {
            HowToPlaySheet()
        }
        .sheet(isPresented: $showTerms) {
            TermsOfServiceSheet()
        }
        .sheet(isPresented: $showPrivacy) {
            PrivacySheet()
        }
    }
}
