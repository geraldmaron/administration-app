#if DEBUG
import SwiftUI

// Exports app icon and launch mark PNGs to the simulator's Documents directory.
// Run once in the simulator, then retrieve the files and replace the asset catalog entries.
//
// To retrieve exported files from the simulator:
//   1. Run the app in a simulator
//   2. Trigger the export (call IconExporter.export() from any debug menu or onAppear)
//   3. Open Finder → Go → ~/Library/Developer/CoreSimulator/Devices/
//   4. Find the running device, navigate to .../data/Containers/Data/Application/<UUID>/Documents/
//   5. Copy brand-mark-icon-1024.png → AppIcon.appiconset/icon-a-mark-1024.png
//   6. Copy brand-mark-launch.pdf  → BrandMarkLaunch.imageset/brand-mark.pdf
//
// The PDF export preserves vector fidelity for the launch screen storyboard.

enum IconExporter {
    static func export() {
        exportIcon()
        exportLaunchMarkPDF()
    }

    // MARK: - App Icon (1024×1024 PNG)

    private static func exportIcon() {
        let canvas = 1024.0
        let markHeight = canvas * 0.5625  // 576pt
        let markWidth = markHeight / 1.2

        let iconView = ZStack {
            Color(red: 0.016, green: 0.020, blue: 0.027)
            BrandMark(color: AppColors.accentPrimary, size: markWidth)
        }
        .frame(width: canvas, height: canvas)

        let renderer = ImageRenderer(content: iconView)
        renderer.scale = 1.0

        guard let uiImage = renderer.uiImage,
              let png = uiImage.pngData() else {
            print("[IconExporter] Failed to render app icon")
            return
        }

        write(data: png, filename: "brand-mark-icon-1024.png")
    }

    // MARK: - Launch Mark (PDF vector)

    private static func exportLaunchMarkPDF() {
        let markWidth: CGFloat = 120
        let markHeight: CGFloat = 144

        let markView = BrandMark(color: AppColors.accentPrimary, size: markWidth)
            .frame(width: markWidth, height: markHeight)

        let renderer = ImageRenderer(content: markView)
        renderer.scale = 3.0

        guard let uiImage = renderer.uiImage,
              let png = uiImage.pngData() else {
            print("[IconExporter] Failed to render launch mark")
            return
        }

        // Export as @3x PNG — rename to brand-mark.pdf before adding to imageset
        // if you need a true PDF, convert using Finder's Quick Look → Export as PDF
        write(data: png, filename: "brand-mark-launch@3x.png")
    }

    // MARK: - Helpers

    private static func write(data: Data, filename: String) {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        let url = docs.appendingPathComponent(filename)
        do {
            try data.write(to: url)
            print("[IconExporter] Exported: \(url.path)")
        } catch {
            print("[IconExporter] Write failed: \(error)")
        }
    }
}
#endif
