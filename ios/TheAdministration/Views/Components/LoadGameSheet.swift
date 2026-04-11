import SwiftUI

struct LoadGameSheet: View {
    @ObservedObject var gameStore: GameStore
    let onLoad: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var slots: [SaveSlotMetadata] = []
    @State private var selection: Set<Int> = []
    @State private var editMode: EditMode = .inactive
    @State private var showDeleteAllConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                if slots.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 40, weight: .thin))
                            .foregroundColor(AppColors.foregroundSubtle)
                        Text("NO SAVED GAMES")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(AppColors.foregroundSubtle)
                            .tracking(3)
                    }
                } else {
                    List(selection: $selection) {
                        ForEach(slots) { slot in
                            saveRow(slot)
                                .tag(slot.id)
                                .listRowBackground(AppColors.background)
                        }
                        .onDelete(perform: deleteAtIndices)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .environment(\.editMode, $editMode)
                }
            }
            .navigationTitle("Load Save")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !slots.isEmpty {
                        Button(editMode.isEditing ? "Done" : "Edit") {
                            withAnimation {
                                editMode = editMode.isEditing ? .inactive : .active
                            }
                            if editMode.isEditing { selection.removeAll() }
                        }
                        .foregroundColor(AppColors.accentPrimary)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundColor(AppColors.accentPrimary)
                }

                ToolbarItemGroup(placement: .bottomBar) {
                    if editMode.isEditing {
                        if !selection.isEmpty {
                            Button("Delete (\(selection.count))", role: .destructive) {
                                deleteSelected()
                            }
                        }
                        Spacer()
                        Button("Delete All", role: .destructive) {
                            showDeleteAllConfirm = true
                        }
                    }
                }
            }
            .alert("Delete All Saves", isPresented: $showDeleteAllConfirm) {
                Button("Delete All", role: .destructive) { deleteAll() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete all \(slots.count) saved game\(slots.count == 1 ? "" : "s").")
            }
        }
        .onAppear { refreshSlots() }
    }

    @ViewBuilder
    private func saveRow(_ slot: SaveSlotMetadata) -> some View {
        Button {
            guard !editMode.isEditing else { return }
            let loaded: Bool
            if slot.id == 0 {
                loaded = gameStore.loadFromAutoSave()
            } else {
                loaded = gameStore.loadFromSlot(slot.id)
            }
            if loaded {
                dismiss()
                onLoad()
            }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(slot.displayName)
                        .font(AppTypography.bodySmall)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.foreground)
                    Text(slot.subtitle)
                        .font(AppTypography.micro)
                        .foregroundColor(AppColors.foregroundSubtle)
                }
                Spacer()
                if slot.id == 0 {
                    Text("AUTO")
                        .font(.system(size: 9, weight: .black, design: .monospaced))
                        .foregroundColor(AppColors.accentPrimary)
                        .tracking(1)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(AppColors.accentPrimary.opacity(0.12), in: RoundedRectangle(cornerRadius: 4, style: .continuous))
                }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func refreshSlots() {
        var all: [SaveSlotMetadata] = []
        if let autoMeta = PersistenceService.shared.autoSaveMeta {
            all.append(autoMeta)
        }
        all += PersistenceService.shared.listSlots().compactMap { $0 }
        slots = all
    }

    private func deleteAtIndices(_ indices: IndexSet) {
        let toDelete = indices.map { slots[$0] }
        for slot in toDelete {
            if slot.id == 0 { PersistenceService.shared.deleteAutoSave() }
            else { PersistenceService.shared.deleteSlot(slot.id) }
        }
        refreshSlots()
        if slots.isEmpty { editMode = .inactive }
    }

    private func deleteSelected() {
        for id in selection {
            if id == 0 { PersistenceService.shared.deleteAutoSave() }
            else { PersistenceService.shared.deleteSlot(id) }
        }
        selection.removeAll()
        refreshSlots()
        if slots.isEmpty { editMode = .inactive }
    }

    private func deleteAll() {
        for slot in slots {
            if slot.id == 0 { PersistenceService.shared.deleteAutoSave() }
            else { PersistenceService.shared.deleteSlot(slot.id) }
        }
        slots = []
        editMode = .inactive
    }
}
