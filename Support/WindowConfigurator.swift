import AppKit
import SwiftUI

struct WindowConfigurator: NSViewRepresentable {
    let appState: AppState
    let opacity: Double

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            apply(to: view)
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async {
            apply(to: nsView)
        }
    }

    private func apply(to view: NSView) {
        guard let window = view.window else { return }
        appState.previewBridge.bind(window: window)
        window.isOpaque = true
        window.backgroundColor = NSColor.windowBackgroundColor
        window.alphaValue = 1.0
    }
}
