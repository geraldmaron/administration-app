/// PersistenceService
/// Manages 3 independent named save slots for The Administration.
/// Each slot stores a full GameState JSON file. Lightweight metadata
/// (country, turn, date) is cached in UserDefaults for fast slot listing.
import Foundation

// MARK: - SaveSlotMetadata

struct SaveSlotMetadata: Codable, Identifiable {
    let id: Int          // slot number 1–3
    let countryId: String?
    let countryName: String?
    let turn: Int
    let dateSaved: Date
    let playerName: String?
    var customName: String?

    var displayName: String {
        customName.map { $0 } ?? (playerName.map { "\($0)'s Game" } ?? "Slot \(id)")
    }

    var subtitle: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        let dateStr = formatter.string(from: dateSaved)
        if let country = countryName {
            return "\(country) · Turn \(turn) · \(dateStr)"
        }
        return "Turn \(turn) · \(dateStr)"
    }
}

// MARK: - PersistenceService

class PersistenceService {

    static let shared = PersistenceService()
    private init() {}

    static let totalSlots = 3
    private static let activeSlotKey = "active_save_slot"

    // MARK: - Active slot

    var activeSlot: Int {
        get {
            let val = UserDefaults.standard.integer(forKey: Self.activeSlotKey)
            return (1...Self.totalSlots).contains(val) ? val : 1
        }
        set {
            let clamped = max(1, min(Self.totalSlots, newValue))
            UserDefaults.standard.set(clamped, forKey: Self.activeSlotKey)
        }
    }

    // MARK: - File URLs

    private func fileURL(for slot: Int) -> URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("saved_game_slot_\(slot).json")
    }

    private func metaKey(for slot: Int) -> String { "save_slot_\(slot)_meta" }

    // MARK: - Save

    func save(state: GameState, to slot: Int? = nil) {
        let targetSlot = slot ?? activeSlot
        guard let data = try? JSONEncoder().encode(state) else { return }
        do {
            try data.write(to: fileURL(for: targetSlot))
        } catch {
            print("⚠️  Failed to save game to slot \(targetSlot): \(error)")
        }
        updateMetadata(for: targetSlot, from: state)
    }

    // MARK: - Load

    func load(from slot: Int? = nil) -> GameState? {
        let targetSlot = slot ?? activeSlot
        guard let data = try? Data(contentsOf: fileURL(for: targetSlot)) else { return nil }
        return try? JSONDecoder().decode(GameState.self, from: data)
    }

    // MARK: - List slots

    func listSlots() -> [SaveSlotMetadata?] {
        return (1...Self.totalSlots).map { slot -> SaveSlotMetadata? in
            guard let data = UserDefaults.standard.data(forKey: metaKey(for: slot)),
                  let meta = try? JSONDecoder().decode(SaveSlotMetadata.self, from: data) else {
                return nil
            }
            return meta
        }
    }

    // MARK: - Delete

    func deleteSlot(_ slot: Int) {
        try? FileManager.default.removeItem(at: fileURL(for: slot))
        UserDefaults.standard.removeObject(forKey: metaKey(for: slot))
        if activeSlot == slot { activeSlot = 1 }
    }

    // MARK: - Exists

    func slotHasSave(_ slot: Int) -> Bool {
        FileManager.default.fileExists(atPath: fileURL(for: slot).path)
    }

    // MARK: - Activate

    func switchToSlot(_ slot: Int) {
        activeSlot = slot
    }

    // MARK: - Metadata update

    private func updateMetadata(for slot: Int, from state: GameState) {
        var customName: String?
        if let existing = UserDefaults.standard.data(forKey: metaKey(for: slot)),
           let existingMeta = try? JSONDecoder().decode(SaveSlotMetadata.self, from: existing) {
            customName = existingMeta.customName
        }
        let meta = SaveSlotMetadata(
            id: slot,
            countryId: state.countryId,
            countryName: nil,
            turn: state.turn,
            dateSaved: Date(),
            playerName: state.player?.name,
            customName: customName
        )
        if let data = try? JSONEncoder().encode(meta) {
            UserDefaults.standard.set(data, forKey: metaKey(for: slot))
        }
    }
}
